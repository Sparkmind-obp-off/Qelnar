/**
 * AuthProvider abstraction. Business logic depends on `AuthProvider`, not Clerk.
 * ClerkAuthProvider verifies Clerk session JWTs (RS256 via JWKS) server-side.
 */
import { verifyToken, createClerkClient } from '@clerk/backend'
import type { Env, AuthUser } from '../env'
import { HttpError, id, nowIso } from './util'
import { first, run } from './db'
import { audit } from './audit'

export interface VerifiedIdentity {
  externalId: string
  sessionId?: string
  issuer?: string
}

export interface ExternalProfile {
  email: string | null
  name: string | null
  imageUrl: string | null
  emailVerified: boolean
  providers: string[]
}

export interface AuthProvider {
  name: string
  verify(token: string): Promise<VerifiedIdentity>
  fetchProfile(externalId: string): Promise<ExternalProfile>
}

export class ClerkAuthProvider implements AuthProvider {
  name = 'clerk'
  constructor(private env: Env) {}

  private parties(): string[] | undefined {
    const p = (this.env.AUTHORIZED_PARTIES || '').split(',').map((s) => s.trim()).filter(Boolean)
    return p.length ? p : undefined
  }

  async verify(token: string): Promise<VerifiedIdentity> {
    if (!this.env.CLERK_SECRET_KEY) throw new HttpError(503, 'auth_not_configured', 'Authentication is not configured')
    try {
      const payload = await verifyToken(token, {
        secretKey: this.env.CLERK_SECRET_KEY,
        authorizedParties: this.parties(),
        issuer: this.env.CLERK_JWT_ISSUER_DOMAIN || undefined,
        clockSkewInMs: 10_000,
      })
      if (!payload?.sub) throw new Error('missing sub')
      return { externalId: String(payload.sub), sessionId: payload.sid as string | undefined, issuer: payload.iss as string }
    } catch (e) {
      throw new HttpError(401, 'invalid_token', 'Session token is invalid or expired')
    }
  }

  async fetchProfile(externalId: string): Promise<ExternalProfile> {
    const clerk = createClerkClient({ secretKey: this.env.CLERK_SECRET_KEY! })
    const u = await clerk.users.getUser(externalId)
    const primary = u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId) ?? u.emailAddresses[0]
    return {
      email: primary?.emailAddress?.toLowerCase() ?? null,
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
      imageUrl: u.imageUrl ?? null,
      emailVerified: primary?.verification?.status === 'verified',
      providers: u.externalAccounts.map((a) => a.provider),
    }
  }
}

let testOverride: ((env: Env) => AuthProvider) | null = null
/** Test-only seam (never reachable from HTTP). Used by vitest integration tests. */
export function __setAuthProviderForTests(f: ((env: Env) => AuthProvider) | null) { testOverride = f }

export function getAuthProvider(env: Env): AuthProvider {
  return testOverride ? testOverride(env) : new ClerkAuthProvider(env)
}

export function bearer(h: string | undefined | null): string | null {
  if (!h) return null
  const m = /^Bearer\s+(.+)$/i.exec(h.trim())
  return m ? m[1].trim() : null
}

type UserRow = { id: string; clerk_user_id: string; email: string | null; name: string | null; role: string; onboarded: number; status: string; last_synced_at: string | null }

const RESYNC_MS = 6 * 60 * 60 * 1000

/** Upsert the internal user record for a verified identity. Profile is re-synced periodically. */
export async function syncUser(env: Env, provider: AuthProvider, ident: VerifiedIdentity): Promise<AuthUser> {
  let row = await first<UserRow>(env.DB, 'SELECT * FROM users WHERE clerk_user_id = ?', ident.externalId)
  const admins = (env.ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean)
  const stale = !row || !row.last_synced_at || Date.now() - Date.parse(row.last_synced_at.replace(' ', 'T') + 'Z') > RESYNC_MS

  if (stale) {
    const p = await provider.fetchProfile(ident.externalId)
    const role = p.email && p.emailVerified && admins.includes(p.email) ? 'admin' : (row?.role === 'admin' && !admins.length ? 'admin' : 'user')
    if (!row) {
      const uid = id('usr')
      await run(env.DB,
        'INSERT INTO users (id, clerk_user_id, email, name, image_url, role, last_synced_at) VALUES (?,?,?,?,?,?,?)',
        uid, ident.externalId, p.email, p.name, p.imageUrl, role, nowIso())
      await audit(env.DB, { userId: uid, action: 'user.created', target: uid, detail: { providers: p.providers } })
    } else {
      await run(env.DB,
        "UPDATE users SET email=?, name=?, image_url=?, role=?, last_synced_at=?, updated_at=datetime('now') WHERE id=?",
        p.email, p.name, p.imageUrl, role, nowIso(), row.id)
    }
    row = await first<UserRow>(env.DB, 'SELECT * FROM users WHERE clerk_user_id = ?', ident.externalId)
  }
  if (!row) throw new HttpError(500, 'user_sync_failed', 'User sync failed')
  if (row.status !== 'active') throw new HttpError(403, 'user_suspended', 'Account is suspended')
  return {
    id: row.id, clerkUserId: row.clerk_user_id, email: row.email, name: row.name,
    role: row.role === 'admin' ? 'admin' : 'user', onboarded: !!row.onboarded,
  }
}
