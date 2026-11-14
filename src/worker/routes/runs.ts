import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../env'
import { all, first, run } from '../lib/db'
import { audit } from '../lib/audit'
import { HttpError, id, parseJson } from '../lib/util'
import { minRole, requireWorkspace } from '../lib/middleware'
import { assertCanRun, getWorkspacePlan } from '../lib/entitlements'
import { routeIntent, extractParams, INTENT_META } from '../runtime/router'
import { makePlan } from '../runtime/planner'
import { evaluatePlan } from '../runtime/policy'
import { buildPolicyCtx, drive, tick } from '../runtime/coordinator'
import { AGENTS, TOOLS } from '../runtime/registry'

export const runs = new Hono<AppEnv>()
runs.use('*', requireWorkspace('viewer'))

const CommandInput = z.object({
  command: z.string().trim().min(8, 'Command too short (min 8 chars)').max(1200),
  projectId: z.string().max(40).optional().nullable(),
  authorizeResearch: z.boolean().default(true),   // H1: user authorizes public read-only research
  dryRun: z.boolean().default(false),
})

/** Command Gateway → Intent Router → Planner → Policy Engine (preview or create). */
runs.post('/command', minRole('member'), async (c) => {
  const body = CommandInput.parse(await c.req.json())
  const wsId = c.get('ws').id
  const user = c.get('user')
  const ws = await first<{ niche: string }>(c.env.DB, 'SELECT niche FROM workspaces WHERE id=?', wsId)
  if (body.projectId) {
    const p = await first(c.env.DB, 'SELECT id FROM projects WHERE id=? AND workspace_id=?', body.projectId, wsId)
    if (!p) throw new HttpError(404, 'project_not_found', 'Project not found in this workspace')
  }
  const routed = routeIntent(body.command)
  const params = extractParams(body.command, ws?.niche)
  const plan = makePlan(routed.intent, params)
  const ctx = await buildPolicyCtx(c.env, wsId, c.get('ws').role, body.authorizeResearch)
  const policy = evaluatePlan(plan, ctx)

  const preview = {
    intent: routed.intent, intentLabel: INTENT_META[routed.intent].label, confidence: routed.confidence, matched: routed.matched,
    objective: plan.objective, budgetCredits: plan.budgetCredits,
    steps: plan.steps.map((s, i) => ({ ...s, agentLabel: AGENTS[s.agent].label, toolLabel: TOOLS[s.tool].label, decision: policy.decisions[i] })),
    blocked: policy.blocked, blockReason: policy.blockReason,
  }
  if (body.dryRun) return c.json({ preview })

  if (!policy.blocked) await assertCanRun(c.env, wsId, plan.budgetCredits)
  const runId = id('run')
  const status = policy.blocked ? 'blocked' : 'planned'
  const stmts = [
    c.env.DB.prepare(`INSERT INTO runs (id, workspace_id, project_id, user_id, command, intent, objective, params, plan, status, budget_credits, error, completed_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(runId, wsId, body.projectId ?? null, user.id, body.command, routed.intent, plan.objective,
      JSON.stringify({ ...params, authorizeResearch: body.authorizeResearch }), JSON.stringify(plan), status, plan.budgetCredits,
      policy.blockReason, policy.blocked ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null),
    ...plan.steps.map((s, i) => c.env.DB.prepare(`INSERT INTO run_steps (id, run_id, idx, agent, tool, title, approval_level, status, input, est_credits, error)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).bind(id('stp'), runId, s.idx, s.agent, s.tool, s.title, s.level,
      policy.blocked && policy.decisions[i].action === 'deny' ? 'blocked' : 'pending', JSON.stringify(s.input), s.estCredits,
      policy.decisions[i].action === 'deny' ? policy.decisions[i].reason : null)),
  ]
  await c.env.DB.batch(stmts)
  await audit(c.env.DB, { workspaceId: wsId, userId: user.id, action: policy.blocked ? 'run.blocked' : 'run.created', target: runId, detail: { intent: routed.intent, budget: plan.budgetCredits, reason: policy.blockReason } })

  if (!policy.blocked) c.executionCtx.waitUntil(drive(c.env, runId, c.get('ws').role).catch(() => undefined))
  return c.json({ runId, status, preview }, 201)
})

runs.get('/runs', async (c) => {
  const status = c.req.query('status')
  const rows = await all(c.env.DB,
    `SELECT r.id, r.command, r.intent, r.objective, r.status, r.used_credits, r.budget_credits, r.created_at, r.completed_at, r.project_id, u.name user_name,
     (SELECT id FROM reports WHERE run_id=r.id LIMIT 1) report_id, (SELECT COUNT(*) FROM evidence WHERE run_id=r.id) evidence_count
     FROM runs r LEFT JOIN users u ON u.id=r.user_id WHERE r.workspace_id=? ${status ? 'AND r.status=?' : ''} ORDER BY r.created_at DESC LIMIT 100`,
    ...(status ? [c.get('ws').id, status] : [c.get('ws').id]))
  return c.json({ runs: rows })
})

async function loadRun(c: any, runId: string) {
  const r = await first<any>(c.env.DB, 'SELECT * FROM runs WHERE id=? AND workspace_id=?', runId, c.get('ws').id)
  if (!r) throw new HttpError(404, 'not_found', 'Run not found')
  return r
}

runs.get('/runs/:id', async (c) => {
  const r = await loadRun(c, c.req.param('id'))
  // Resume: any viewer poll on a non-terminal run advances it one step (lease-protected).
  if (['planned', 'running'].includes(r.status) && c.get('ws').role !== 'viewer') {
    const stale = !r.lock_until || r.lock_until < new Date().toISOString().replace('T', ' ').slice(0, 19)
    if (stale) c.executionCtx.waitUntil(tick(c.env, r.id, c.get('ws').role).catch(() => undefined))
  }
  const steps = await all<any>(c.env.DB, 'SELECT id, idx, agent, tool, title, approval_level, status, attempts, output, error, est_credits, started_at, finished_at FROM run_steps WHERE run_id=? ORDER BY idx', r.id)
  const evidence = await all(c.env.DB, 'SELECT id, provider, source_url, title, snippet, score, content_hash, retrieved_at, (content IS NOT NULL) has_content FROM evidence WHERE run_id=? ORDER BY retrieved_at, rowid', r.id)
  const report = await first(c.env.DB, 'SELECT id, title, generator, feedback, created_at FROM reports WHERE run_id=?', r.id)
  const approvals = await all(c.env.DB, 'SELECT id, step_id, level, summary, status, decided_at FROM approvals WHERE run_id=?', r.id)
  const ledger = await all(c.env.DB, 'SELECT provider, operation, credits, cost_usd_micros, created_at FROM usage_ledger WHERE run_id=? ORDER BY created_at', r.id)
  const { lock_until, ...rest } = r
  return c.json({
    run: { ...rest, plan: parseJson(r.plan, {}), params: parseJson(r.params, {}) },
    steps: steps.map((s) => ({ ...s, agentLabel: AGENTS[s.agent]?.label, toolLabel: TOOLS[s.tool]?.label, output: parseJson(s.output, null) })),
    evidence, report, approvals,
    ledger: c.get('ws').role === 'viewer' ? [] : ledger.map((l: any) => ({ provider: l.provider, operation: l.operation, credits: l.credits, created_at: l.created_at })),
  })
})

runs.post('/runs/:id/resume', minRole('member'), async (c) => {
  const r = await loadRun(c, c.req.param('id'))
  if (!['planned', 'running'].includes(r.status)) return c.json({ status: r.status })
  const status = await drive(c.env, r.id, c.get('ws').role, 20000)
  return c.json({ status })
})

runs.post('/runs/:id/cancel', minRole('member'), async (c) => {
  const r = await loadRun(c, c.req.param('id'))
  if (['completed', 'failed', 'blocked', 'cancelled'].includes(r.status)) throw new HttpError(409, 'terminal', `Run already ${r.status}`)
  await run(c.env.DB, "UPDATE runs SET status='cancelled', completed_at=datetime('now'), lock_until=NULL WHERE id=?", r.id)
  await run(c.env.DB, "UPDATE run_steps SET status='skipped', error='Run cancelled' WHERE run_id=? AND status IN ('pending','awaiting_approval')", r.id)
  await run(c.env.DB, "UPDATE approvals SET status='rejected', decided_by=?, decided_at=datetime('now') WHERE run_id=? AND status='pending'", c.get('user').id, r.id)
  await audit(c.env.DB, { workspaceId: r.workspace_id, userId: c.get('user').id, action: 'run.cancelled', target: r.id })
  return c.json({ status: 'cancelled' })
})

// Approval Center — one approval per specific step (no blanket approvals).
runs.get('/approvals', async (c) => {
  const status = c.req.query('status') || 'pending'
  const rows = await all(c.env.DB,
    `SELECT a.*, r.objective, r.command, u.name requester FROM approvals a JOIN runs r ON r.id=a.run_id LEFT JOIN users u ON u.id=a.requested_by
     WHERE a.workspace_id=? AND a.status=? ORDER BY a.created_at DESC LIMIT 100`, c.get('ws').id, status)
  return c.json({ approvals: rows })
})

runs.post('/approvals/:id/decide', minRole('member'), async (c) => {
  const body = z.object({ decision: z.enum(['approved', 'rejected']) }).parse(await c.req.json())
  const a = await first<any>(c.env.DB, "SELECT * FROM approvals WHERE id=? AND workspace_id=?", c.req.param('id'), c.get('ws').id)
  if (!a) throw new HttpError(404, 'not_found', 'Approval not found')
  if (a.status !== 'pending') throw new HttpError(409, 'already_decided', `Already ${a.status}`)
  // H3 approvals require workspace admin/owner.
  if (a.level === 'H3' && !['owner', 'admin'].includes(c.get('ws').role)) throw new HttpError(403, 'insufficient_role', 'H3 approvals require admin or owner')
  await run(c.env.DB, "UPDATE approvals SET status=?, decided_by=?, decided_at=datetime('now') WHERE id=?", body.decision, c.get('user').id, a.id)
  await run(c.env.DB, "UPDATE run_steps SET status='pending' WHERE id=? AND status='awaiting_approval'", a.step_id)
  await run(c.env.DB, "UPDATE runs SET status='running', lock_until=NULL WHERE id=? AND status='awaiting_approval'", a.run_id)
  await audit(c.env.DB, { workspaceId: a.workspace_id, userId: c.get('user').id, action: `approval.${body.decision}`, target: a.id, detail: { level: a.level, step: a.step_id } })
  c.executionCtx.waitUntil(drive(c.env, a.run_id, c.get('ws').role).catch(() => undefined))
  return c.json({ ok: true })
})

// Reports & evidence
runs.get('/reports', async (c) => {
  const rows = await all(c.env.DB, 'SELECT id, run_id, project_id, title, kind, generator, feedback, created_at FROM reports WHERE workspace_id=? ORDER BY created_at DESC LIMIT 100', c.get('ws').id)
  return c.json({ reports: rows })
})
runs.get('/reports/:id', async (c) => {
  const r = await first<any>(c.env.DB, 'SELECT * FROM reports WHERE id=? AND workspace_id=?', c.req.param('id'), c.get('ws').id)
  if (!r) throw new HttpError(404, 'not_found', 'Report not found')
  const { ent } = await getWorkspacePlan(c.env, c.get('ws').id)
  return c.json({ report: { ...r, data: parseJson(r.data, null) }, canExport: ent.export })
})
runs.get('/reports/:id/export', async (c) => {
  const r = await first<any>(c.env.DB, 'SELECT * FROM reports WHERE id=? AND workspace_id=?', c.req.param('id'), c.get('ws').id)
  if (!r) throw new HttpError(404, 'not_found', 'Report not found')
  const { ent } = await getWorkspacePlan(c.env, c.get('ws').id)
  if (!ent.export) throw new HttpError(402, 'export_not_in_plan', 'Report export requires Creator Pro or higher')
  await audit(c.env.DB, { workspaceId: c.get('ws').id, userId: c.get('user').id, action: 'report.exported', target: r.id })
  return new Response(r.body_md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', 'Content-Disposition': `attachment; filename="qelnar-report-${r.id}.md"` } })
})
runs.post('/reports/:id/feedback', minRole('member'), async (c) => {
  const body = z.object({ useful: z.boolean(), note: z.string().max(500).optional() }).parse(await c.req.json())
  const r = await first<any>(c.env.DB, 'SELECT id, run_id FROM reports WHERE id=? AND workspace_id=?', c.req.param('id'), c.get('ws').id)
  if (!r) throw new HttpError(404, 'not_found', 'Report not found')
  await run(c.env.DB, 'UPDATE reports SET feedback=? WHERE id=?', body.useful ? 1 : -1, r.id)
  // Learning Agent: feedback adjusts weight of learnings from this run; notes become preferences.
  await run(c.env.DB, 'UPDATE memories SET weight = MAX(0.1, weight + ?) WHERE run_id=? AND workspace_id=?', body.useful ? 0.5 : -0.5, r.run_id, c.get('ws').id)
  if (body.note) await run(c.env.DB, 'INSERT INTO memories (id, workspace_id, run_id, kind, content, weight) VALUES (?,?,?,?,?,?)', id('mem'), c.get('ws').id, r.run_id, 'feedback', body.note.slice(0, 400), body.useful ? 1.2 : 1)
  await audit(c.env.DB, { workspaceId: c.get('ws').id, userId: c.get('user').id, action: 'report.feedback', target: r.id, detail: { useful: body.useful } })
  return c.json({ ok: true })
})
runs.get('/evidence', async (c) => {
  const rows = await all(c.env.DB, `SELECT e.id, e.run_id, e.provider, e.source_url, e.title, e.snippet, e.retrieved_at, r.objective FROM evidence e JOIN runs r ON r.id=e.run_id
    WHERE e.workspace_id=? ORDER BY e.retrieved_at DESC LIMIT 200`, c.get('ws').id)
  return c.json({ evidence: rows })
})
runs.get('/evidence/:id', async (c) => {
  const e = await first(c.env.DB, 'SELECT * FROM evidence WHERE id=? AND workspace_id=?', c.req.param('id'), c.get('ws').id)
  if (!e) throw new HttpError(404, 'not_found', 'Evidence not found')
  return c.json({ evidence: e })
})

runs.get('/registry', (c) => c.json({ agents: Object.values(AGENTS), tools: Object.values(TOOLS) }))
