/** Admin Console API — every route is behind requireAuth + requireAdmin (server-side role). */
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv } from '../env'
import { all, first, run } from '../lib/db'
import { audit } from '../lib/audit'
import { HttpError, addDays, id, monthStart, nowIso, parseJson } from '../lib/util'
import { listPlans } from '../lib/entitlements'
import { providerStatus } from '../providers'

export const admin = new Hono<AppEnv>()

async function settings(env: AppEnv['Bindings']) {
  const rows = await all<{ key: string; value: string }>(env.DB, 'SELECT key, value FROM app_settings')
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>
}

admin.get('/overview', async (c) => {
  const since = monthStart()
  const s = await settings(c.env)
  const rate = Number(s.usd_idr_rate || 16500)
  const counts = await first<any>(c.env.DB, `SELECT
    (SELECT COUNT(*) FROM users) users, (SELECT COUNT(*) FROM workspaces) workspaces,
    (SELECT COUNT(*) FROM runs WHERE created_at>=?1) runs_month, (SELECT COUNT(*) FROM runs WHERE status='completed' AND created_at>=?1) runs_completed,
    (SELECT COUNT(*) FROM billing_requests WHERE status='pending') pending_billing,
    (SELECT COUNT(*) FROM service_requests WHERE status IN ('requested','scoped','quoted','in_progress')) open_services`, since)
  const subs = await all<any>(c.env.DB, "SELECT plan_id, status, COUNT(*) n, COALESCE(SUM(price_idr_locked),0) mrr FROM subscriptions GROUP BY plan_id, status")
  const mrr = subs.filter((x) => x.status === 'active').reduce((a, x) => a + x.mrr, 0)
  const providerCost = await all<any>(c.env.DB, "SELECT provider, COUNT(*) calls, COALESCE(SUM(cost_usd_micros),0) usd FROM usage_ledger WHERE kind='actual' AND created_at>=? GROUP BY provider", since)
  const providerUsd = providerCost.reduce((a, x) => a + x.usd, 0) / 1e6
  const svc = await first<any>(c.env.DB, "SELECT COALESCE(SUM(CASE WHEN paid=1 THEN quoted_idr ELSE 0 END),0) revenue, COALESCE(SUM(hours_spent),0) hours FROM service_requests WHERE updated_at>=?", since)
  const infraIdr = Number(s.infra_monthly_usd || 0) * rate
  const providerIdr = Math.round(providerUsd * rate)
  const paymentIdr = Math.round((mrr + (svc?.revenue ?? 0)) * Number(s.payment_processing_pct || 0) / 100)
  const humanIdr = Math.round((svc?.hours ?? 0) * Number(s.service_hourly_cost_idr || 0))
  const revenue = mrr + (svc?.revenue ?? 0)
  const cogs = providerIdr + infraIdr + paymentIdr
  return c.json({
    counts, subscriptions: subs, providerCost,
    economics: {
      period_start: since, usd_idr_rate: rate,
      subscription_revenue_idr: mrr, service_revenue_idr: svc?.revenue ?? 0, total_revenue_idr: revenue,
      provider_cost_idr: providerIdr, infra_cost_idr: infraIdr, payment_cost_idr: paymentIdr, human_delivery_cost_idr: humanIdr,
      gross_margin_idr: revenue - cogs, gross_margin_pct: revenue ? Math.round(((revenue - cogs) / revenue) * 1000) / 10 : null,
      contribution_margin_idr: revenue - cogs - humanIdr,
      cac_idr: null, note: 'CAC not measurable yet (no acquisition spend tracked).',
    },
  })
})

admin.get('/users', async (c) => {
  const rows = await all(c.env.DB, `SELECT u.id, u.email, u.name, u.role, u.status, u.created_at, (SELECT COUNT(*) FROM workspace_members m WHERE m.user_id=u.id) workspaces
    FROM users u ORDER BY u.created_at DESC LIMIT 200`)
  return c.json({ users: rows })
})
admin.patch('/users/:id', async (c) => {
  const body = z.object({ role: z.enum(['user', 'admin']).optional(), status: z.enum(['active', 'suspended']).optional() }).parse(await c.req.json())
  if (c.req.param('id') === c.get('user').id) throw new HttpError(400, 'self_change', 'Cannot change your own admin account')
  const u = await first<any>(c.env.DB, 'SELECT * FROM users WHERE id=?', c.req.param('id'))
  if (!u) throw new HttpError(404, 'not_found', 'User not found')
  await run(c.env.DB, "UPDATE users SET role=?, status=?, updated_at=datetime('now') WHERE id=?", body.role ?? u.role, body.status ?? u.status, u.id)
  await audit(c.env.DB, { userId: c.get('user').id, action: 'admin.user_updated', target: u.id, detail: body })
  return c.json({ ok: true })
})

admin.get('/workspaces', async (c) => {
  const rows = await all(c.env.DB, `SELECT w.id, w.name, w.niche, w.created_at, u.email owner_email, s.plan_id, s.status, s.price_idr_locked, s.period_end,
    (SELECT COUNT(*) FROM runs r WHERE r.workspace_id=w.id) runs
    FROM workspaces w JOIN users u ON u.id=w.owner_user_id LEFT JOIN subscriptions s ON s.workspace_id=w.id ORDER BY w.created_at DESC LIMIT 200`)
  return c.json({ workspaces: rows })
})

// Pricing & entitlements management
admin.get('/plans', async (c) => c.json({ plans: await listPlans(c.env, true) }))
const EntSchema = z.object({
  runs_per_month: z.number().int().min(0).max(100000), credits_per_month: z.number().int().min(0).max(1000000),
  max_workspaces: z.number().int().min(1).max(1000), max_members: z.number().int().min(1).max(1000), max_projects: z.number().int().min(1).max(100000),
  tools: z.array(z.enum(['web_search', 'web_extract', 'llm_synthesis', 'workspace_context'])), export: z.boolean(), team: z.boolean(), trial_days: z.number().int().min(1).max(90).optional(),
})
admin.put('/plans/:id', async (c) => {
  const body = z.object({ name: z.string().min(2).max(60), price_idr: z.number().int().min(0).nullable(), tagline: z.string().max(120).optional(), entitlements: EntSchema, features: z.array(z.string().max(120)).max(12), active: z.boolean() }).parse(await c.req.json())
  const cur = await first<any>(c.env.DB, 'SELECT * FROM plans WHERE id=?', c.req.param('id'))
  if (!cur) throw new HttpError(404, 'not_found', 'Plan not found')
  // Existing subscriptions keep price_idr_locked — price changes apply to new activations only.
  await run(c.env.DB, "UPDATE plans SET name=?, price_idr=?, tagline=?, entitlements=?, features=?, active=?, updated_at=datetime('now') WHERE id=?",
    body.name, body.price_idr, body.tagline ?? cur.tagline, JSON.stringify(body.entitlements), JSON.stringify(body.features), body.active ? 1 : 0, cur.id)
  await audit(c.env.DB, { userId: c.get('user').id, action: 'admin.plan_updated', target: cur.id, detail: { old_price: cur.price_idr, new_price: body.price_idr } })
  return c.json({ ok: true, note: 'Active subscriptions keep their locked price.' })
})

// Billing requests → manual activation (no payment provider live)
admin.get('/billing-requests', async (c) => {
  const rows = await all(c.env.DB, `SELECT b.*, w.name workspace_name, u.email FROM billing_requests b JOIN workspaces w ON w.id=b.workspace_id JOIN users u ON u.id=b.user_id ORDER BY b.created_at DESC LIMIT 100`)
  return c.json({ requests: rows })
})
admin.post('/billing-requests/:id/decide', async (c) => {
  const body = z.object({ decision: z.enum(['activated', 'rejected']), months: z.number().int().min(1).max(12).default(1), price_idr: z.number().int().min(0).optional(), note: z.string().max(300).optional() }).parse(await c.req.json())
  const b = await first<any>(c.env.DB, "SELECT * FROM billing_requests WHERE id=? AND status='pending'", c.req.param('id'))
  if (!b) throw new HttpError(404, 'not_found', 'Pending request not found')
  if (body.decision === 'activated') {
    const start = nowIso()
    const price = body.price_idr ?? b.amount_idr
    await run(c.env.DB, `INSERT INTO subscriptions (id, workspace_id, plan_id, status, price_idr_locked, period_start, period_end, provider) VALUES (?,?,?,?,?,?,?,'manual')
      ON CONFLICT(workspace_id) DO UPDATE SET plan_id=excluded.plan_id, status='active', price_idr_locked=excluded.price_idr_locked, period_start=excluded.period_start, period_end=excluded.period_end, updated_at=datetime('now')`,
      id('sub'), b.workspace_id, b.to_plan, 'active', price, start, addDays(start, 30 * body.months))
  }
  await run(c.env.DB, "UPDATE billing_requests SET status=?, note=COALESCE(?, note), decided_at=datetime('now') WHERE id=?", body.decision, body.note ?? null, b.id)
  await audit(c.env.DB, { workspaceId: b.workspace_id, userId: c.get('user').id, action: `admin.billing_${body.decision}`, target: b.id, detail: { plan: b.to_plan, months: body.months } })
  return c.json({ ok: true })
})

// Service business administration
admin.get('/services', async (c) => {
  const pkgs = await all<any>(c.env.DB, 'SELECT * FROM service_packages ORDER BY sort')
  const reqs = await all(c.env.DB, `SELECT sr.*, sp.name package_name, w.name workspace_name, u.email FROM service_requests sr JOIN service_packages sp ON sp.id=sr.package_id
    JOIN workspaces w ON w.id=sr.workspace_id JOIN users u ON u.id=sr.user_id ORDER BY sr.created_at DESC LIMIT 200`)
  return c.json({ packages: pkgs.map((p) => ({ ...p, scope: parseJson(p.scope, []), deliverables: parseJson(p.deliverables, []), exclusions: parseJson(p.exclusions, []) })), requests: reqs })
})
admin.patch('/service-requests/:id', async (c) => {
  const body = z.object({
    status: z.enum(['requested', 'scoped', 'quoted', 'in_progress', 'delivered', 'closed', 'cancelled']).optional(),
    quoted_idr: z.number().int().min(0).optional(), scope_note: z.string().max(3000).optional(), hours_spent: z.number().min(0).max(1000).optional(),
    paid: z.boolean().optional(), due_date: z.string().max(20).optional(),
    delivery_markdown: z.string().max(100000).optional(),
  }).parse(await c.req.json())
  const sr = await first<any>(c.env.DB, 'SELECT * FROM service_requests WHERE id=?', c.req.param('id'))
  if (!sr) throw new HttpError(404, 'not_found', 'Service request not found')
  let reportId = sr.delivery_report_id
  if (body.delivery_markdown) {
    const pkg = await first<any>(c.env.DB, 'SELECT name FROM service_packages WHERE id=?', sr.package_id)
    if (reportId) await run(c.env.DB, 'UPDATE reports SET body_md=? WHERE id=?', body.delivery_markdown, reportId)
    else {
      reportId = id('rep')
      await run(c.env.DB, "INSERT INTO reports (id, workspace_id, title, kind, body_md, generator) VALUES (?,?,?,?,?,'qelnar_service_team')", reportId, sr.workspace_id, `${pkg?.name ?? 'Service'} — Delivery`, 'service_delivery', body.delivery_markdown)
    }
  }
  await run(c.env.DB, `UPDATE service_requests SET status=?, quoted_idr=?, scope_note=?, hours_spent=?, paid=?, due_date=?, delivery_report_id=?, updated_at=datetime('now') WHERE id=?`,
    body.status ?? sr.status, body.quoted_idr ?? sr.quoted_idr, body.scope_note ?? sr.scope_note, body.hours_spent ?? sr.hours_spent,
    body.paid === undefined ? sr.paid : body.paid ? 1 : 0, body.due_date ?? sr.due_date, reportId, sr.id)
  await audit(c.env.DB, { workspaceId: sr.workspace_id, userId: c.get('user').id, action: 'admin.service_updated', target: sr.id, detail: { status: body.status, paid: body.paid } })
  return c.json({ ok: true, reportId })
})

// Providers & cost governance
admin.get('/providers', async (c) => c.json({ providers: await providerStatus(c.env), settings: await settings(c.env) }))
admin.put('/providers/:id', async (c) => {
  const body = z.object({ enabled: z.boolean(), monthly_cap_usd: z.number().min(0).max(10000) }).parse(await c.req.json())
  const pid = c.req.param('id')
  if (['apify', 'scrapely'].includes(pid) && body.enabled) throw new HttpError(403, 'owner_approval_required', 'Paid research providers stay disabled until the owner explicitly approves cost and scope.')
  const r = await run(c.env.DB, "UPDATE provider_settings SET enabled=?, monthly_cap_usd_micros=?, updated_at=datetime('now') WHERE provider=?", body.enabled ? 1 : 0, Math.round(body.monthly_cap_usd * 1e6), pid)
  if (!r.meta.changes) throw new HttpError(404, 'not_found', 'Provider not found')
  await audit(c.env.DB, { userId: c.get('user').id, action: 'admin.provider_updated', target: pid, detail: body })
  return c.json({ ok: true })
})
admin.put('/settings', async (c) => {
  const body = z.object({ usd_idr_rate: z.number().min(1000).max(100000), payment_processing_pct: z.number().min(0).max(20), infra_monthly_usd: z.number().min(0).max(100000), service_hourly_cost_idr: z.number().min(0).max(10000000) }).parse(await c.req.json())
  for (const [k, v] of Object.entries(body)) await run(c.env.DB, 'INSERT INTO app_settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', k, String(v))
  await audit(c.env.DB, { userId: c.get('user').id, action: 'admin.settings_updated', detail: body })
  return c.json({ ok: true })
})
admin.get('/audit', async (c) => {
  const rows = await all(c.env.DB, 'SELECT a.*, u.email FROM audit_log a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 200')
  return c.json({ audit: rows })
})
