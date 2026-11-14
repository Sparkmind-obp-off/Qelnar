import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../env'
import { all, first, run } from '../lib/db'
import { audit } from '../lib/audit'
import { HttpError, id, parseJson } from '../lib/util'
import { minRole, requireWorkspace } from '../lib/middleware'
import { getPlan, getWorkspacePlan, listPlans } from '../lib/entitlements'

/** Public commercial catalog (no auth). */
export const publicCatalog = new Hono<AppEnv>()
publicCatalog.get('/plans', async (c) => c.json({ plans: (await listPlans(c.env)).map(({ entitlements, ...p }) => ({ ...p, limits: { runs_per_month: entitlements.runs_per_month, credits_per_month: entitlements.credits_per_month, max_workspaces: entitlements.max_workspaces, max_members: entitlements.max_members, export: entitlements.export, team: entitlements.team } })) }))
publicCatalog.get('/services', async (c) => {
  const rows = await all<any>(c.env.DB, 'SELECT id, name, price_idr_min, price_idr_max, timeline_days, revisions, summary, scope, deliverables, exclusions FROM service_packages WHERE active=1 ORDER BY sort')
  return c.json({ services: rows.map((s) => ({ ...s, scope: parseJson(s.scope, []), deliverables: parseJson(s.deliverables, []), exclusions: parseJson(s.exclusions, []) })) })
})

/** Workspace billing & service requests (auth + workspace). */
export const commerce = new Hono<AppEnv>()
commerce.use('*', requireWorkspace('viewer'))

commerce.get('/billing', async (c) => {
  const wsId = c.get('ws').id
  const { sub, plan, ent, active } = await getWorkspacePlan(c.env, wsId)
  const requests = await all(c.env.DB, 'SELECT * FROM billing_requests WHERE workspace_id=? ORDER BY created_at DESC LIMIT 20', wsId)
  return c.json({
    subscription: sub, plan: { id: plan.id, name: plan.name, price_idr: plan.price_idr }, entitlements: ent, active, requests,
    paymentProvider: { live: false, note: 'Online payment is not live yet. Plan changes are processed manually after confirmation by QELNAR.' },
  })
})

/** Upgrade / downgrade request. Never changes price silently; activation is an explicit admin action. */
commerce.post('/billing/change', minRole('owner'), async (c) => {
  const body = z.object({ toPlan: z.enum(['solo', 'pro', 'studio', 'business']), note: z.string().max(500).optional() }).parse(await c.req.json())
  const wsId = c.get('ws').id
  const { sub } = await getWorkspacePlan(c.env, wsId)
  if (sub.plan_id === body.toPlan && sub.status === 'active') throw new HttpError(409, 'same_plan', 'Already on this plan')
  const pending = await first(c.env.DB, "SELECT id FROM billing_requests WHERE workspace_id=? AND status='pending'", wsId)
  if (pending) throw new HttpError(409, 'pending_request', 'There is already a pending plan change request')
  const plan = await getPlan(c.env, body.toPlan)
  const rid = id('bil')
  await run(c.env.DB, 'INSERT INTO billing_requests (id, workspace_id, user_id, from_plan, to_plan, amount_idr, note) VALUES (?,?,?,?,?,?,?)',
    rid, wsId, c.get('user').id, sub.plan_id, body.toPlan, plan.price_idr, body.note ?? null)
  await audit(c.env.DB, { workspaceId: wsId, userId: c.get('user').id, action: 'billing.change_requested', target: rid, detail: { from: sub.plan_id, to: body.toPlan, amount_idr: plan.price_idr } })
  return c.json({ id: rid, amount_idr: plan.price_idr, status: 'pending' }, 201)
})
commerce.post('/billing/requests/:id/cancel', minRole('owner'), async (c) => {
  const r = await run(c.env.DB, "UPDATE billing_requests SET status='cancelled', decided_at=datetime('now') WHERE id=? AND workspace_id=? AND status='pending'", c.req.param('id'), c.get('ws').id)
  if (!r.meta.changes) throw new HttpError(404, 'not_found', 'Pending request not found')
  return c.json({ ok: true })
})

commerce.get('/service-requests', async (c) => {
  const rows = await all(c.env.DB, `SELECT sr.id, sr.package_id, sp.name package_name, sr.brief, sr.status, sr.quoted_idr, sr.scope_note, sr.delivery_report_id, sr.due_date, sr.created_at, sr.updated_at
    FROM service_requests sr JOIN service_packages sp ON sp.id=sr.package_id WHERE sr.workspace_id=? ORDER BY sr.created_at DESC`, c.get('ws').id)
  return c.json({ requests: rows })
})
commerce.post('/service-requests', minRole('member'), async (c) => {
  const body = z.object({ packageId: z.string().max(40), brief: z.string().trim().min(20, 'Please describe your needs (min 20 chars)').max(3000), contact: z.string().max(200).optional() }).parse(await c.req.json())
  const pkg = await first<any>(c.env.DB, 'SELECT * FROM service_packages WHERE id=? AND active=1', body.packageId)
  if (!pkg) throw new HttpError(404, 'not_found', 'Service package not found')
  const sid = id('svc')
  await run(c.env.DB, 'INSERT INTO service_requests (id, workspace_id, user_id, package_id, brief, contact, quoted_idr) VALUES (?,?,?,?,?,?,?)',
    sid, c.get('ws').id, c.get('user').id, pkg.id, body.brief, body.contact ?? c.get('user').email, pkg.price_idr_min)
  await audit(c.env.DB, { workspaceId: c.get('ws').id, userId: c.get('user').id, action: 'service.requested', target: sid, detail: { package: pkg.id } })
  return c.json({ id: sid }, 201)
})
commerce.post('/service-requests/:id/cancel', minRole('member'), async (c) => {
  const r = await run(c.env.DB, "UPDATE service_requests SET status='cancelled', updated_at=datetime('now') WHERE id=? AND workspace_id=? AND status IN ('requested','scoped','quoted')", c.req.param('id'), c.get('ws').id)
  if (!r.meta.changes) throw new HttpError(409, 'cannot_cancel', 'Request cannot be cancelled at this stage')
  return c.json({ ok: true })
})
