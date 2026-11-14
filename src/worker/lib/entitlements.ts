import type { Env } from '../env'
import { all, first, run } from './db'
import { HttpError, addDays, id, monthStart, nowIso, parseJson } from './util'

export interface Entitlements {
  runs_per_month: number
  credits_per_month: number
  max_workspaces: number
  max_members: number
  max_projects: number
  tools: string[]
  export: boolean
  team: boolean
  trial_days?: number
}

export interface PlanRow { id: string; name: string; price_idr: number | null; tagline: string | null; entitlements: string; features: string; sort: number; active: number }
export interface SubRow { id: string; workspace_id: string; plan_id: string; status: string; price_idr_locked: number | null; period_start: string; period_end: string; provider: string }

export async function getPlan(env: Env, planId: string): Promise<PlanRow> {
  const p = await first<PlanRow>(env.DB, 'SELECT * FROM plans WHERE id = ?', planId)
  if (!p) throw new HttpError(500, 'plan_missing', `Plan ${planId} not configured`)
  return p
}

export async function listPlans(env: Env, includeInactive = false) {
  const rows = await all<PlanRow>(env.DB, `SELECT * FROM plans ${includeInactive ? '' : 'WHERE active = 1'} ORDER BY sort`)
  return rows.map((p) => ({ ...p, entitlements: parseJson<Entitlements>(p.entitlements, {} as Entitlements), features: parseJson<string[]>(p.features, []) }))
}

export async function createTrialSubscription(env: Env, workspaceId: string) {
  const plan = await getPlan(env, 'trial')
  const ent = parseJson<Entitlements>(plan.entitlements, {} as Entitlements)
  const start = nowIso()
  await run(env.DB,
    'INSERT OR IGNORE INTO subscriptions (id, workspace_id, plan_id, status, price_idr_locked, period_start, period_end, provider) VALUES (?,?,?,?,?,?,?,?)',
    id('sub'), workspaceId, 'trial', 'trialing', 0, start, addDays(start, ent.trial_days ?? 14), 'manual')
}

/** Effective subscription + entitlements, with lazy expiry handling. */
export async function getWorkspacePlan(env: Env, workspaceId: string) {
  let sub = await first<SubRow>(env.DB, 'SELECT * FROM subscriptions WHERE workspace_id = ?', workspaceId)
  if (!sub) {
    await createTrialSubscription(env, workspaceId)
    sub = await first<SubRow>(env.DB, 'SELECT * FROM subscriptions WHERE workspace_id = ?', workspaceId)
  }
  const now = nowIso()
  if (sub && sub.period_end < now && (sub.status === 'trialing' || sub.status === 'active')) {
    const next = sub.status === 'trialing' ? 'expired' : 'past_due'
    await run(env.DB, "UPDATE subscriptions SET status=?, updated_at=datetime('now') WHERE id=?", next, sub.id)
    sub.status = next
  }
  const plan = await getPlan(env, sub!.plan_id)
  const ent = parseJson<Entitlements>(plan.entitlements, {} as Entitlements)
  const active = sub!.status === 'trialing' || sub!.status === 'active'
  return { sub: sub!, plan, ent, active }
}

export async function getUsage(env: Env, workspaceId: string) {
  const since = monthStart()
  const runs = await first<{ n: number }>(env.DB,
    "SELECT COUNT(*) n FROM runs WHERE workspace_id=? AND created_at >= ? AND status NOT IN ('cancelled','blocked')", workspaceId, since)
  const credits = await first<{ c: number; usd: number }>(env.DB,
    "SELECT COALESCE(SUM(credits),0) c, COALESCE(SUM(cost_usd_micros),0) usd FROM usage_ledger WHERE workspace_id=? AND created_at >= ? AND kind='actual'", workspaceId, since)
  const reserved = await first<{ c: number }>(env.DB,
    `SELECT COALESCE(SUM(r.budget_credits - r.used_credits),0) c FROM runs r WHERE r.workspace_id=? AND r.status IN ('running','awaiting_approval','planned')`, workspaceId)
  return { since, runs: runs?.n ?? 0, credits: credits?.c ?? 0, costUsdMicros: credits?.usd ?? 0, reservedCredits: Math.max(0, reserved?.c ?? 0) }
}

/** Hard cap check before a run is created. Enforced server-side. */
export async function assertCanRun(env: Env, workspaceId: string, budgetCredits: number) {
  const { ent, active, plan, sub } = await getWorkspacePlan(env, workspaceId)
  if (!active) throw new HttpError(402, 'subscription_inactive', `Subscription ${sub.status}. Please upgrade to continue.`, { plan: plan.id })
  const u = await getUsage(env, workspaceId)
  if (u.runs >= ent.runs_per_month) throw new HttpError(402, 'run_limit_reached', `Monthly run limit reached (${ent.runs_per_month}).`, { plan: plan.id })
  if (u.credits + u.reservedCredits + budgetCredits > ent.credits_per_month)
    throw new HttpError(402, 'credit_limit_reached', `Not enough credits this month (${ent.credits_per_month - u.credits - u.reservedCredits} left, need ${budgetCredits}).`, { plan: plan.id })
  return { ent, plan }
}
