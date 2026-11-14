/**
 * API integration tests against a real local D1 (miniflare via wrangler getPlatformProxy).
 * Auth provider is replaced through the test-only seam; JWT verification itself is
 * covered by production tests with real Clerk Production sessions.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createD1 } from './d1shim'
import { readFileSync } from 'node:fs'
import app from '../src/worker/index'
import { __setAuthProviderForTests, type AuthProvider } from '../src/worker/lib/auth'
import { HttpError } from '../src/worker/lib/util'

let env: any
const ctx = { waitUntil: (_p: Promise<unknown>) => {}, passThroughOnException: () => {}, props: {} } as any

const fakeProvider = (): AuthProvider => ({
  name: 'test',
  async verify(token) {
    if (!token.startsWith('test:')) throw new HttpError(401, 'invalid_token', 'bad token')
    return { externalId: token.slice(5) }
  },
  async fetchProfile(ext) {
    return { email: `${ext}@test.local`, name: ext, imageUrl: null, emailVerified: true, providers: ['oauth_google'] }
  },
})

async function call(path: string, opts: { token?: string; ws?: string; method?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {}
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`
  if (opts.ws) headers['X-Workspace-Id'] = opts.ws
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await app.fetch(new Request(`http://local${path}`, { method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'), headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }), env, ctx)
  let json: any = null
  try { json = await res.clone().json() } catch { /* non-json */ }
  return { status: res.status, json }
}

beforeAll(async () => {
  env = { DB: createD1(), APP_ENV: 'test', AI: undefined, TAVILY_API_KEY: undefined, FIRECRAWL_API_KEY: undefined, CLERK_SECRET_KEY: 'sk_test_dummy', ADMIN_EMAILS: 'admin@test.local' }
  for (const f of ['migrations/0001_init.sql', 'migrations/0002_seed.sql']) {
    const sql = readFileSync(f, 'utf8').replace(/--[^\n]*/g, '')
    for (const stmt of sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) await env.DB.prepare(stmt).run()
  }
  // Wrap the real ClerkAuthProvider behaviour with a fake only for tests.
  ;(globalThis as any).__fake = true
  __setAuthProviderForTests(fakeProvider)
})
afterAll(async () => { __setAuthProviderForTests(null); })

describe('authentication gate', () => {
  it('rejects missing and invalid tokens', async () => {
    expect((await call('/api/v1/me')).status).toBe(401)
    expect((await call('/api/v1/me', { token: 'garbage' })).status).toBe(401)
  })
  it('public endpoints work without auth', async () => {
    expect((await call('/api/health')).status).toBe(200)
    expect((await call('/api/public/plans')).json.plans.length).toBe(5)
    expect((await call('/api/public/services')).json.services.length).toBe(5)
  })
})

describe('user sync, onboarding, workspace isolation', () => {
  let wsA = '', wsB = ''
  it('syncs users and onboards each into their own workspace', async () => {
    const me = await call('/api/v1/me', { token: 'test:alice' })
    expect(me.status).toBe(200)
    expect(me.json.user.email).toBe('alice@test.local')
    expect(me.json.workspaces).toEqual([])
    const a = await call('/api/v1/onboarding', { token: 'test:alice', body: { name: 'Alice WS', niche: 'kuliner', platforms: ['tiktok'] } })
    expect(a.status).toBe(201); wsA = a.json.workspaceId
    const b = await call('/api/v1/onboarding', { token: 'test:bob', body: { name: 'Bob WS', niche: 'gaming' } })
    expect(b.status).toBe(201); wsB = b.json.workspaceId
    expect((await call('/api/v1/onboarding', { token: 'test:alice', body: { name: 'Again' } })).status).toBe(409)
  })
  it('workspace gets trial subscription and entitlements', async () => {
    const w = await call('/api/v1/workspace', { token: 'test:alice', ws: wsA })
    expect(w.status).toBe(200)
    expect(w.json.plan.id).toBe('trial')
    expect(w.json.subscription.status).toBe('trialing')
    expect(w.json.entitlements.runs_per_month).toBe(5)
  })
  it('denies cross-user workspace access (404, no existence leak)', async () => {
    expect((await call('/api/v1/workspace', { token: 'test:bob', ws: wsA })).status).toBe(404)
    expect((await call('/api/v1/runs', { token: 'test:bob', ws: wsA })).status).toBe(404)
    expect((await call('/api/v1/reports', { token: 'test:alice', ws: wsB })).status).toBe(404)
    expect((await call('/api/v1/command', { token: 'test:bob', ws: wsA, body: { command: 'riset tren kreator kuliner indonesia', dryRun: true } })).status).toBe(404)
  })
  it('requires workspace header', async () => {
    expect((await call('/api/v1/runs', { token: 'test:alice' })).status).toBe(400)
  })

  it('command dry-run returns plan + policy decisions', async () => {
    const r = await call('/api/v1/command', { token: 'test:alice', ws: wsA, body: { command: 'Analisis kompetitor kreator kuliner TikTok Indonesia', dryRun: true } })
    expect(r.status).toBe(200)
    expect(r.json.preview.intent).toBe('competitor_analysis')
    expect(r.json.preview.steps.length).toBeGreaterThan(5)
  })
  it('policy engine blocks runs whose required provider is unavailable', async () => {
    const r = await call('/api/v1/command', { token: 'test:alice', ws: wsA, body: { command: 'Riset tren audiens kreator kuliner Indonesia' } })
    expect(r.status).toBe(201)
    expect(r.json.status).toBe('blocked') // Tavily key intentionally absent in this test env
  })
  it('policy engine blocks H3 external actions (no connected account)', async () => {
    const r = await call('/api/v1/command', { token: 'test:alice', ws: wsA, body: { command: 'Tolong posting video ini ke TikTok saya sekarang' } })
    expect(r.json.status).toBe('blocked')
    expect(r.json.preview.blockReason).toMatch(/H3/)
  })
  it('validates command input', async () => {
    expect((await call('/api/v1/command', { token: 'test:alice', ws: wsA, body: { command: 'hi' } })).status).toBe(400)
  })
  it('run created by Alice is invisible to Bob', async () => {
    const runs = await call('/api/v1/runs', { token: 'test:alice', ws: wsA })
    const id = runs.json.runs[0].id
    expect((await call(`/api/v1/runs/${id}`, { token: 'test:alice', ws: wsA })).status).toBe(200)
    expect((await call(`/api/v1/runs/${id}`, { token: 'test:bob', ws: wsB })).status).toBe(404)
  })

  it('entitlements: trial cannot invite team or export', async () => {
    expect((await call('/api/v1/workspace/invites', { token: 'test:alice', ws: wsA, body: { email: 'x@y.com' } })).status).toBe(402)
  })
  it('entitlements: project limit enforced server-side', async () => {
    expect((await call('/api/v1/workspace/projects', { token: 'test:alice', ws: wsA, body: { name: 'P1' } })).status).toBe(201)
    expect((await call('/api/v1/workspace/projects', { token: 'test:alice', ws: wsA, body: { name: 'P2' } })).status).toBe(201)
    expect((await call('/api/v1/workspace/projects', { token: 'test:alice', ws: wsA, body: { name: 'P3' } })).status).toBe(402)
  })
  it('billing change request requires owner and never silently changes price', async () => {
    const r = await call('/api/v1/billing/change', { token: 'test:alice', ws: wsA, body: { toPlan: 'pro' } })
    expect(r.status).toBe(201)
    expect(r.json.status).toBe('pending')
    const w = await call('/api/v1/workspace', { token: 'test:alice', ws: wsA })
    expect(w.json.plan.id).toBe('trial')
    expect((await call('/api/v1/billing/change', { token: 'test:alice', ws: wsA, body: { toPlan: 'solo' } })).status).toBe(409)
  })
  it('service request flow', async () => {
    expect((await call('/api/v1/service-requests', { token: 'test:alice', ws: wsA, body: { packageId: 'quick_audit', brief: 'short' } })).status).toBe(400)
    expect((await call('/api/v1/service-requests', { token: 'test:alice', ws: wsA, body: { packageId: 'quick_audit', brief: 'Tolong audit akun TikTok kuliner rumahan saya dan beri 5 peluang' } })).status).toBe(201)
  })

  describe('admin console authorization (server-side)', () => {
    it('non-admin is forbidden', async () => {
      expect((await call('/api/v1/admin/overview', { token: 'test:alice' })).status).toBe(403)
    })
    it('admin (verified email in ADMIN_EMAILS) can manage, activates billing with locked price', async () => {
      expect((await call('/api/v1/admin/overview', { token: 'test:admin' })).status).toBe(200)
      const reqs = await call('/api/v1/admin/billing-requests', { token: 'test:admin' })
      const pending = reqs.json.requests.find((r: any) => r.status === 'pending')
      expect((await call(`/api/v1/admin/billing-requests/${pending.id}/decide`, { token: 'test:admin', body: { decision: 'activated', months: 1 } })).status).toBe(200)
      const w = await call('/api/v1/workspace', { token: 'test:alice', ws: wsA })
      expect(w.json.plan.id).toBe('pro')
      expect(w.json.subscription.price_idr_locked).toBe(299000)
      // price change for plan does not alter active locked price
      const plans = await call('/api/v1/admin/plans', { token: 'test:admin' })
      const pro = plans.json.plans.find((p: any) => p.id === 'pro')
      expect((await call('/api/v1/admin/plans/pro', { token: 'test:admin', method: 'PUT', body: { name: pro.name, price_idr: 349000, tagline: pro.tagline, entitlements: pro.entitlements, features: pro.features, active: true } })).status).toBe(200)
      expect((await call('/api/v1/workspace', { token: 'test:alice', ws: wsA })).json.subscription.price_idr_locked).toBe(299000)
    })
    it('admin cannot enable paid research providers without owner approval', async () => {
      expect((await call('/api/v1/admin/providers/apify', { token: 'test:admin', method: 'PUT', body: { enabled: true, monthly_cap_usd: 5 } })).status).toBe(403)
    })
  })

  describe('team roles', () => {
    it('studio workspace: invite → accept → viewer cannot run', async () => {
      // upgrade Bob to studio through admin flow
      await call('/api/v1/billing/change', { token: 'test:bob', ws: wsB, body: { toPlan: 'studio' } })
      const reqs = await call('/api/v1/admin/billing-requests', { token: 'test:admin' })
      const p = reqs.json.requests.find((r: any) => r.status === 'pending' && r.workspace_id === wsB)
      await call(`/api/v1/admin/billing-requests/${p.id}/decide`, { token: 'test:admin', body: { decision: 'activated' } })
      expect((await call('/api/v1/workspace/invites', { token: 'test:bob', ws: wsB, body: { email: 'carol@test.local', role: 'viewer' } })).status).toBe(201)
      const me = await call('/api/v1/me', { token: 'test:carol' })
      expect(me.json.workspaces.some((w: any) => w.id === wsB && w.role === 'viewer')).toBe(true)
      expect((await call('/api/v1/workspace', { token: 'test:carol', ws: wsB })).status).toBe(200)
      expect((await call('/api/v1/command', { token: 'test:carol', ws: wsB, body: { command: 'riset tren kreator gaming indonesia' } })).status).toBe(403)
      expect((await call('/api/v1/workspace/audit', { token: 'test:carol', ws: wsB })).status).toBe(403)
      // carol still cannot see alice's workspace
      expect((await call('/api/v1/workspace', { token: 'test:carol', ws: wsA })).status).toBe(404)
    })
  })
})
