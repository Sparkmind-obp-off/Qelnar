/**
 * Internal production self-test. Disabled (404) unless INTERNAL_SELFTEST_TOKEN secret is set.
 * Requires header X-Selftest-Token (constant-time compare). Runs the REAL orchestrator with REAL
 * providers inside an isolated system workspace that no customer can access.
 */
import { Hono } from 'hono'
import type { AppEnv } from '../env'
import { first, run } from '../lib/db'
import { id } from '../lib/util'
import { routeIntent, extractParams } from '../runtime/router'
import { makePlan } from '../runtime/planner'
import { evaluatePlan } from '../runtime/policy'
import { buildPolicyCtx, drive } from '../runtime/coordinator'
import { createTrialSubscription } from '../lib/entitlements'

export const selftest = new Hono<AppEnv>()

function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

selftest.use('*', async (c, next) => {
  const t = c.env.INTERNAL_SELFTEST_TOKEN
  if (!t || t.length < 32) return c.json({ error: { code: 'not_found', message: 'Not found' } }, 404)
  if (!safeEq(c.req.header('X-Selftest-Token') ?? '', t)) return c.json({ error: { code: 'not_found', message: 'Not found' } }, 404)
  await next()
})

const SYS_USER = 'usr_system_selftest'
const SYS_WS = 'ws_system_selftest'

selftest.post('/pipeline', async (c) => {
  const { command } = await c.req.json<{ command: string }>()
  await run(c.env.DB, "INSERT OR IGNORE INTO users (id, clerk_user_id, email, name, role, onboarded, status) VALUES (?, 'system:selftest', NULL, 'QELNAR Selftest', 'user', 1, 'active')", SYS_USER)
  await run(c.env.DB, "INSERT OR IGNORE INTO workspaces (id, name, niche, goals, platforms, owner_user_id) VALUES (?, 'System Selftest', 'kreator konten Indonesia', 'verifikasi pipeline', '[\"tiktok\"]', ?)", SYS_WS, SYS_USER)
  await run(c.env.DB, "INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, 'owner')", SYS_WS, SYS_USER)
  await createTrialSubscription(c.env, SYS_WS)
  await run(c.env.DB, "UPDATE subscriptions SET plan_id='business', status='active', period_end=datetime('now','+3650 days') WHERE workspace_id=?", SYS_WS)

  const routed = routeIntent(command)
  const params = extractParams(command, 'kreator konten Indonesia')
  const plan = makePlan(routed.intent, params)
  const policy = evaluatePlan(plan, await buildPolicyCtx(c.env, SYS_WS, 'owner', true))
  if (policy.blocked) return c.json({ blocked: policy.blockReason })
  const runId = id('run')
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO runs (id, workspace_id, user_id, command, intent, objective, params, plan, status, budget_credits) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(runId, SYS_WS, SYS_USER, command, routed.intent, plan.objective, JSON.stringify(params), JSON.stringify(plan), 'planned', plan.budgetCredits),
    ...plan.steps.map((s) => c.env.DB.prepare('INSERT INTO run_steps (id, run_id, idx, agent, tool, title, approval_level, status, input, est_credits) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .bind(id('stp'), runId, s.idx, s.agent, s.tool, s.title, s.level, 'pending', JSON.stringify(s.input), s.estCredits)),
  ])
  const status = await drive(c.env, runId, 'owner', 28000)
  return c.json({ runId, status })
})

selftest.get('/runs/:id', async (c) => {
  const r = await first<any>(c.env.DB, 'SELECT id, status, intent, objective, used_credits, budget_credits, cost_usd_micros, error FROM runs WHERE id=? AND workspace_id=?', c.req.param('id'), SYS_WS)
  if (!r) return c.json({ error: 'not found' }, 404)
  const steps = (await c.env.DB.prepare('SELECT idx, agent, tool, status, attempts, error FROM run_steps WHERE run_id=? ORDER BY idx').bind(r.id).all()).results
  const ev = await first<any>(c.env.DB, "SELECT COUNT(*) n, SUM(provider='tavily') tavily, SUM(provider='firecrawl') firecrawl FROM evidence WHERE run_id=?", r.id)
  const rep = await first<any>(c.env.DB, 'SELECT id, generator, length(body_md) len, substr(body_md,1,1200) preview FROM reports WHERE run_id=?', r.id)
  const appr = (await c.env.DB.prepare('SELECT level, status, summary FROM approvals WHERE run_id=?').bind(r.id).all()).results
  return c.json({ run: r, steps, evidence: ev, report: rep, approvals: appr })
})

selftest.post('/runs/:id/approve-all', async (c) => {
  const runId = c.req.param('id')
  const pend = (await c.env.DB.prepare("SELECT id, step_id FROM approvals WHERE run_id=? AND workspace_id=? AND status='pending'").bind(runId, SYS_WS).all<any>()).results
  for (const a of pend) {
    await run(c.env.DB, "UPDATE approvals SET status='approved', decided_by=?, decided_at=datetime('now') WHERE id=?", SYS_USER, a.id)
    await run(c.env.DB, "UPDATE run_steps SET status='pending' WHERE id=?", a.step_id)
  }
  await run(c.env.DB, "UPDATE runs SET status='running', lock_until=NULL WHERE id=? AND status='awaiting_approval'", runId)
  return c.json({ approved: pend.length, status: await drive(c.env, runId, 'owner', 20000) })
})
