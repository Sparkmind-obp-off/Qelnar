import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { ZodError } from 'zod'
import type { AppEnv } from './env'
import { HttpError, redact } from './lib/util'
import { requireAdmin, requireAuth } from './lib/middleware'
import { core } from './routes/core'
import { runs } from './routes/runs'
import { commerce, publicCatalog } from './routes/commerce'
import { admin } from './routes/admin'
import { selftest } from './routes/selftest'

const app = new Hono<AppEnv>()

app.use('*', secureHeaders({ crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: false }))

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: { code: err.code, message: err.message, detail: err.detail } }, err.status as any)
  if (err instanceof ZodError) return c.json({ error: { code: 'validation_error', message: err.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ') } }, 400)
  if (err instanceof SyntaxError) return c.json({ error: { code: 'bad_json', message: 'Invalid JSON body' } }, 400)
  console.error('unhandled', redact(String((err as Error)?.stack ?? err)))
  return c.json({ error: { code: 'internal_error', message: 'Internal error' } }, 500)
})

const api = new Hono<AppEnv>()

// Public endpoints
api.get('/health', async (c) => {
  let db = false
  try { db = !!(await c.env.DB.prepare('SELECT 1 ok').first()) } catch { db = false }
  return c.json({ ok: true, service: 'qelnar-one', env: c.env.APP_ENV ?? 'unknown', db, auth: c.env.CLERK_SECRET_KEY ? (c.env.CLERK_SECRET_KEY.startsWith('sk_live_') ? 'clerk_production' : 'clerk_development') : 'not_configured' })
})
api.get('/config', (c) => c.json({ clerkPublishableKey: c.env.CLERK_PUBLISHABLE_KEY ?? null, authProvider: 'clerk', signInMethods: ['oauth_google'] }))
api.route('/public', publicCatalog)
api.route('/internal/selftest', selftest)

// Authenticated endpoints
api.use('/v1/*', requireAuth)
// Admin first: later sub-apps register workspace middleware on '*' which must not apply to admin routes.
api.use('/v1/admin/*', requireAdmin)
api.route('/v1/admin', admin)
api.route('/v1', core)
api.route('/v1', runs)
api.route('/v1', commerce)

app.route('/api', api)
app.all('/api/*', (c) => c.json({ error: { code: 'not_found', message: 'Not found' } }, 404))

// SPA fallback: serve index.html for client routes (assets are served by Pages before the worker).
app.get('*', async (c) => {
  if (!c.env.ASSETS) return c.text('Assets binding missing', 500)
  const url = new URL(c.req.url)
  url.pathname = '/index.html'
  const res = await c.env.ASSETS.fetch(new Request(url.toString(), { headers: c.req.raw.headers }))
  return new Response(res.body, { status: 200, headers: res.headers })
})

export default app
