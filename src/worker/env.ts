export interface Env {
  DB: D1Database
  AI?: Ai
  ASSETS?: Fetcher
  CLERK_SECRET_KEY?: string
  CLERK_PUBLISHABLE_KEY?: string
  CLERK_JWT_ISSUER_DOMAIN?: string
  AUTHORIZED_PARTIES?: string
  ADMIN_EMAILS?: string
  TAVILY_API_KEY?: string
  FIRECRAWL_API_KEY?: string
  APIFY_API_TOKEN?: string
  SCRAPELY_API_KEY?: string
  APP_ENV?: string
  INTERNAL_SELFTEST_TOKEN?: string
}

export interface AuthUser {
  id: string
  clerkUserId: string
  email: string | null
  name: string | null
  role: 'user' | 'admin'
  onboarded: boolean
}

export interface WsCtx {
  id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
}

export type AppVars = { user: AuthUser; ws: WsCtx; sessionId?: string }
export type AppEnv = { Bindings: Env; Variables: AppVars }
