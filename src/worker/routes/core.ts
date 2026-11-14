import { Hono } from 'hono'
import { z } from 'zod'
import type { AppEnv, Env } from '../env'
import { all, first, run } from '../lib/db'
import { audit } from '../lib/audit'
import { HttpError, id, parseJson } from '../lib/util'
import { minRole, requireWorkspace } from '../lib/middleware'
import { createTrialSubscription, getUsage, getWorkspacePlan } from '../lib/entitlements'

export const core = new Hono<AppEnv>()

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'x', 'facebook', 'linkedin', 'blog', 'podcast'] as const
const WorkspaceInput = z.object({
  name: z.string().trim().min(2).max(80),
  niche: z.string().trim().max(160).optional().default(''),
  goals: z.string().trim().max(600).optional().default(''),
  platforms: z.array(z.enum(PLATFORMS)).max(8).default([]),
})

async function acceptInvites(env: Env, userId: string, email: string | null) {
  if (!email) return
  const inv = await all<{ id: string; workspace_id: string; role: string }>(env.DB, "SELECT id, workspace_id, role FROM workspace_invites WHERE lower(email)=? AND status='pending'", email.toLowerCase())
  for (const i of inv) {
    await run(env.DB, 'INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (?,?,?)', i.workspace_id, userId, i.role)
    await run(env.DB, "UPDATE workspace_invites SET status='accepted' WHERE id=?", i.id)
    await run(env.DB, "UPDATE users SET onboarded=1 WHERE id=?", userId)
    await audit(env.DB, { workspaceId: i.workspace_id, userId, action: 'invite.accepted', target: i.id })
  }
}

async function insertWorkspace(env: Env, userId: string, body: z.infer<typeof WorkspaceInput>, markOnboarded: boolean) {
  const wsId = id('ws')
  const stmts = [
    env.DB.prepare('INSERT INTO workspaces (id, name, niche, goals, platforms, owner_user_id) VALUES (?,?,?,?,?,?)').bind(wsId, body.name, body.niche, body.goals, JSON.stringify(body.platforms), userId),
    env.DB.prepare("INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?,?,'owner')").bind(wsId, userId),
  ]
  if (markOnboarded) stmts.push(env.DB.prepare("UPDATE users SET onboarded=1, updated_at=datetime('now') WHERE id=?").bind(userId))
  await env.DB.batch(stmts)
  await createTrialSubscription(env, wsId)
  await audit(env.DB, { workspaceId: wsId, userId, action: 'workspace.created', target: wsId, detail: { onboarding: markOnboarded } })
  return wsId
}

core.get('/me', async (c) => {
  const u = c.get('user')
  await acceptInvites(c.env, u.id, u.email)
  const fresh = await first<{ onboarded: number }>(c.env.DB, 'SELECT onboarded FROM users WHERE id=?', u.id)
  const workspaces = await all(c.env.DB,
    `SELECT w.id, w.name, w.niche, m.role, s.plan_id, s.status sub_status FROM workspace_members m JOIN workspaces w ON w.id=m.workspace_id
     LEFT JOIN subscriptions s ON s.workspace_id=w.id WHERE m.user_id=? ORDER BY w.created_at`, u.id)
  return c.json({ user: { ...u, onboarded: !!fresh?.onboarded }, workspaces })
})

core.post('/onboarding', async (c) => {
  const u = c.get('user')
  const body = WorkspaceInput.parse(await c.req.json())
  const owned = await first<{ n: number }>(c.env.DB, 'SELECT COUNT(*) n FROM workspaces WHERE owner_user_id=?', u.id)
  if ((owned?.n ?? 0) > 0) throw new HttpError(409, 'already_onboarded', 'Already onboarded')
  const wsId = await insertWorkspace(c.env, u.id, body, true)
  return c.json({ workspaceId: wsId }, 201)
})

core.post('/workspaces', async (c) => {
  const u = c.get('user')
  const body = WorkspaceInput.parse(await c.req.json())
  const owned = await all<{ entitlements: string; status: string }>(c.env.DB,
    'SELECT p.entitlements, s.status FROM workspaces w JOIN subscriptions s ON s.workspace_id=w.id JOIN plans p ON p.id=s.plan_id WHERE w.owner_user_id=?', u.id)
  const limit = Math.max(1, ...owned.filter((p) => ['active', 'trialing'].includes(p.status)).map((p) => parseJson<any>(p.entitlements, {}).max_workspaces ?? 1))
  if (owned.length >= limit) throw new HttpError(402, 'workspace_limit', `Your plan allows ${limit} workspace(s). Upgrade to add more.`)
  const wsId = await insertWorkspace(c.env, u.id, body, false)
  return c.json({ workspaceId: wsId }, 201)
})

const ws = new Hono<AppEnv>()
ws.use('*', requireWorkspace('viewer'))

ws.get('/', async (c) => {
  const wsId = c.get('ws').id
  const w = await first<any>(c.env.DB, 'SELECT * FROM workspaces WHERE id=?', wsId)
  const { sub, plan, ent, active } = await getWorkspacePlan(c.env, wsId)
  const usage = await getUsage(c.env, wsId)
  const counts = await first<any>(c.env.DB, `SELECT
    (SELECT COUNT(*) FROM runs WHERE workspace_id=?1) runs,
    (SELECT COUNT(*) FROM reports WHERE workspace_id=?1) reports,
    (SELECT COUNT(*) FROM approvals WHERE workspace_id=?1 AND status='pending') pending_approvals,
    (SELECT COUNT(*) FROM projects WHERE workspace_id=?1) projects,
    (SELECT COUNT(*) FROM evidence WHERE workspace_id=?1) evidence`, wsId)
  return c.json({ workspace: { ...w, platforms: parseJson(w.platforms, []) }, role: c.get('ws').role, subscription: sub, plan: { id: plan.id, name: plan.name, price_idr: plan.price_idr }, entitlements: ent, active, usage, counts })
})

ws.patch('/', minRole('admin'), async (c) => {
  const body = WorkspaceInput.partial().parse(await c.req.json())
  const cur = await first<any>(c.env.DB, 'SELECT * FROM workspaces WHERE id=?', c.get('ws').id)
  await run(c.env.DB, 'UPDATE workspaces SET name=?, niche=?, goals=?, platforms=? WHERE id=?',
    body.name ?? cur.name, body.niche ?? cur.niche, body.goals ?? cur.goals, JSON.stringify(body.platforms ?? parseJson(cur.platforms, [])), c.get('ws').id)
  await audit(c.env.DB, { workspaceId: c.get('ws').id, userId: c.get('user').id, action: 'workspace.updated' })
  return c.json({ ok: true })
})

// Members & invites (team entitlement enforced server-side)
ws.get('/members', async (c) => {
  const members = await all(c.env.DB, 'SELECT u.id, u.name, u.email, u.image_url, m.role, m.created_at FROM workspace_members m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=? ORDER BY m.created_at', c.get('ws').id)
  const invites = await all(c.env.DB, "SELECT id, email, role, status, created_at FROM workspace_invites WHERE workspace_id=? AND status='pending'", c.get('ws').id)
  return c.json({ members, invites })
})
ws.post('/invites', minRole('admin'), async (c) => {
  const body = z.object({ email: z.string().email().max(200), role: z.enum(['admin', 'member', 'viewer']).default('member') }).parse(await c.req.json())
  const { ent } = await getWorkspacePlan(c.env, c.get('ws').id)
  if (!ent.team) throw new HttpError(402, 'team_not_in_plan', 'Team collaboration requires Studio or Business plan')
  const n = await first<{ n: number }>(c.env.DB, "SELECT (SELECT COUNT(*) FROM workspace_members WHERE workspace_id=?1) + (SELECT COUNT(*) FROM workspace_invites WHERE workspace_id=?1 AND status='pending') n", c.get('ws').id)
  if ((n?.n ?? 0) >= ent.max_members) throw new HttpError(402, 'member_limit', `Member limit reached (${ent.max_members})`)
  const iid = id('inv')
  await run(c.env.DB, 'INSERT INTO workspace_invites (id, workspace_id, email, role, invited_by) VALUES (?,?,?,?,?)', iid, c.get('ws').id, body.email.toLowerCase(), body.role, c.get('user').id)
  await audit(c.env.DB, { workspaceId: c.get('ws').id, userId: c.get('user').id, action: 'invite.created', target: iid, detail: { role: body.role } })
  return c.json({ id: iid }, 201)
})
ws.delete('/invites/:id', minRole('admin'), async (c) => {
  await run(c.env.DB, "UPDATE workspace_invites SET status='revoked' WHERE id=? AND workspace_id=?", c.req.param('id'), c.get('ws').id)
  return c.json({ ok: true })
})
ws.patch('/members/:uid', minRole('owner'), async (c) => {
  const body = z.object({ role: z.enum(['admin', 'member', 'viewer']) }).parse(await c.req.json())
  if (c.req.param('uid') === c.get('user').id) throw new HttpError(400, 'self_change', 'Cannot change your own role')
  await run(c.env.DB, "UPDATE workspace_members SET role=? WHERE workspace_id=? AND user_id=? AND role<>'owner'", body.role, c.get('ws').id, c.req.param('uid'))
  await audit(c.env.DB, { workspaceId: c.get('ws').id, userId: c.get('user').id, action: 'member.role_changed', target: c.req.param('uid'), detail: body })
  return c.json({ ok: true })
})
ws.delete('/members/:uid', minRole('admin'), async (c) => {
  await run(c.env.DB, "DELETE FROM workspace_members WHERE workspace_id=? AND user_id=? AND role<>'owner'", c.get('ws').id, c.req.param('uid'))
  await audit(c.env.DB, { workspaceId: c.get('ws').id, userId: c.get('user').id, action: 'member.removed', target: c.req.param('uid') })
  return c.json({ ok: true })
})

// Projects & tasks
ws.get('/projects', async (c) => {
  const rows = await all(c.env.DB, `SELECT p.*, (SELECT COUNT(*) FROM runs r WHERE r.project_id=p.id) runs,
    (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id) tasks, (SELECT COUNT(*) FROM tasks t WHERE t.project_id=p.id AND t.status='done') done
    FROM projects p WHERE p.workspace_id=? ORDER BY p.created_at DESC`, c.get('ws').id)
  return c.json({ projects: rows })
})
ws.post('/projects', minRole('member'), async (c) => {
  const body = z.object({ name: z.string().trim().min(2).max(100), description: z.string().max(1000).optional().default('') }).parse(await c.req.json())
  const { ent } = await getWorkspacePlan(c.env, c.get('ws').id)
  const n = await first<{ n: number }>(c.env.DB, 'SELECT COUNT(*) n FROM projects WHERE workspace_id=?', c.get('ws').id)
  if ((n?.n ?? 0) >= ent.max_projects) throw new HttpError(402, 'project_limit', `Project limit reached (${ent.max_projects})`)
  const pid = id('prj')
  await run(c.env.DB, 'INSERT INTO projects (id, workspace_id, name, description, created_by) VALUES (?,?,?,?,?)', pid, c.get('ws').id, body.name, body.description, c.get('user').id)
  await audit(c.env.DB, { workspaceId: c.get('ws').id, userId: c.get('user').id, action: 'project.created', target: pid })
  return c.json({ id: pid }, 201)
})
ws.get('/projects/:pid', async (c) => {
  const wsId = c.get('ws').id
  const pid = c.req.param('pid')
  const p = await first(c.env.DB, 'SELECT * FROM projects WHERE id=? AND workspace_id=?', pid, wsId)
  if (!p) throw new HttpError(404, 'not_found', 'Project not found')
  const tasks = await all(c.env.DB, 'SELECT * FROM tasks WHERE project_id=? AND workspace_id=? ORDER BY created_at', pid, wsId)
  const runs = await all(c.env.DB, 'SELECT id, objective, status, created_at FROM runs WHERE project_id=? AND workspace_id=? ORDER BY created_at DESC', pid, wsId)
  const reports = await all(c.env.DB, 'SELECT id, title, created_at FROM reports WHERE project_id=? AND workspace_id=? ORDER BY created_at DESC', pid, wsId)
  return c.json({ project: p, tasks, runs, reports })
})
ws.patch('/tasks/:tid', minRole('member'), async (c) => {
  const body = z.object({ status: z.enum(['todo', 'doing', 'done']) }).parse(await c.req.json())
  const r = await run(c.env.DB, 'UPDATE tasks SET status=? WHERE id=? AND workspace_id=?', body.status, c.req.param('tid'), c.get('ws').id)
  if (!r.meta.changes) throw new HttpError(404, 'not_found', 'Task not found')
  return c.json({ ok: true })
})

// Usage & audit transparency
ws.get('/usage', async (c) => {
  const wsId = c.get('ws').id
  const usage = await getUsage(c.env, wsId)
  const { ent, plan, sub } = await getWorkspacePlan(c.env, wsId)
  const byProvider = await all(c.env.DB, "SELECT provider, operation, COUNT(*) calls, SUM(credits) credits FROM usage_ledger WHERE workspace_id=? AND kind='actual' AND created_at>=? GROUP BY provider, operation", wsId, usage.since)
  const recent = await all(c.env.DB, 'SELECT provider, operation, credits, run_id, created_at FROM usage_ledger WHERE workspace_id=? ORDER BY created_at DESC LIMIT 30', wsId)
  return c.json({ usage, entitlements: ent, plan: { id: plan.id, name: plan.name, price_idr: plan.price_idr }, subscription: sub, byProvider, recent })
})
ws.get('/audit', minRole('admin'), async (c) => {
  const rows = await all(c.env.DB, 'SELECT a.action, a.target, a.detail, a.created_at, u.email FROM audit_log a LEFT JOIN users u ON u.id=a.user_id WHERE a.workspace_id=? ORDER BY a.created_at DESC LIMIT 100', c.get('ws').id)
  return c.json({ audit: rows })
})
ws.get('/learnings', async (c) => {
  return c.json({ learnings: await all(c.env.DB, 'SELECT id, kind, content, weight, run_id, created_at FROM memories WHERE workspace_id=? ORDER BY created_at DESC LIMIT 50', c.get('ws').id) })
})
ws.delete('/learnings/:mid', minRole('admin'), async (c) => {
  await run(c.env.DB, 'DELETE FROM memories WHERE id=? AND workspace_id=?', c.req.param('mid'), c.get('ws').id)
  return c.json({ ok: true })
})

core.route('/workspace', ws)
