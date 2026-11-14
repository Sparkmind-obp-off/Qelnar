import type { MiddlewareHandler } from 'hono'
import type { AppEnv, WsCtx } from '../env'
import { bearer, getAuthProvider, syncUser } from './auth'
import { HttpError } from './util'
import { first } from './db'

/** Requires a valid Clerk session JWT. Rejects missing/invalid tokens with 401. */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = bearer(c.req.header('Authorization'))
  if (!token) throw new HttpError(401, 'unauthenticated', 'Missing bearer token')
  const provider = getAuthProvider(c.env)
  const ident = await provider.verify(token)
  const user = await syncUser(c.env, provider, ident)
  c.set('user', user)
  c.set('sessionId', ident.sessionId)
  await next()
}

/** Platform admin — server-side role check (never frontend-only). */
export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.get('user')?.role !== 'admin') throw new HttpError(403, 'forbidden', 'Admin role required')
  await next()
}

export const ROLE_RANK: Record<WsCtx['role'], number> = { viewer: 0, member: 1, admin: 2, owner: 3 }

/** Resolves X-Workspace-Id and enforces membership (workspace isolation). */
export function requireWorkspace(min: WsCtx['role'] = 'viewer'): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const wsId = c.req.header('X-Workspace-Id') || c.req.query('ws')
    if (!wsId) throw new HttpError(400, 'workspace_required', 'X-Workspace-Id header required')
    const m = await first<{ role: WsCtx['role'] }>(c.env.DB, 'SELECT role FROM workspace_members WHERE workspace_id=? AND user_id=?', wsId, c.get('user').id)
    // Deliberately 404 (not 403) to avoid leaking workspace existence across tenants.
    if (!m) throw new HttpError(404, 'workspace_not_found', 'Workspace not found')
    if (ROLE_RANK[m.role] < ROLE_RANK[min]) throw new HttpError(403, 'insufficient_role', `Requires ${min} role`)
    c.set('ws', { id: wsId, role: m.role })
    await next()
  }
}

/** Role check for routes already inside requireWorkspace(). */
export function minRole(min: WsCtx['role']): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (ROLE_RANK[c.get('ws').role] < ROLE_RANK[min]) throw new HttpError(403, 'insufficient_role', `Requires ${min} role`)
    await next()
  }
}
