/**
 * Run Coordinator — durable, resumable step execution.
 * State lives in D1 (runs/run_steps). Each tick acquires a lease (runs.lock_until),
 * executes exactly one step, persists the result, then releases the lease.
 * Ticks are driven by waitUntil() after creation and by client polling (resume).
 */
import type { Env } from '../env'
import { all, first, run } from '../lib/db'
import { audit } from '../lib/audit'
import { HttpError, id, nowIso, parseJson, sha256, truncate, redact } from '../lib/util'
import { providers, providerStatus } from '../providers'
import { ProviderError } from '../providers/types'
import { LLM_MODEL } from '../providers/llm'
import { TOOLS } from './registry'
import type { Plan } from './planner'
import { evaluateStep, type PolicyCtx } from './policy'
import { buildPrompt, parseSynthesis, extractiveSynthesis, toMarkdown, type EvidenceItem, type Synthesis } from './synthesis'
import type { Intent } from './router'
import { getWorkspacePlan } from '../lib/entitlements'

type RunRow = { id: string; workspace_id: string; project_id: string | null; user_id: string; command: string; intent: Intent; objective: string; params: string; plan: string; status: string; current_step: number; budget_credits: number; used_credits: number; cost_usd_micros: number; lock_until: string | null }
type StepRow = { id: string; run_id: string; idx: number; agent: string; tool: string; title: string; approval_level: string; status: string; attempts: number; input: string; output: string | null; error: string | null; est_credits: number }

const LEASE_SECONDS = 60
const TERMINAL = ['completed', 'failed', 'blocked', 'cancelled']

export async function buildPolicyCtx(env: Env, workspaceId: string, memberRole: PolicyCtx['memberRole'], researchAuthorized: boolean): Promise<PolicyCtx> {
  const { ent } = await getWorkspacePlan(env, workspaceId)
  const ps = await providerStatus(env)
  return {
    memberRole, ent, researchAuthorized, connectedAccounts: [],
    providers: Object.fromEntries(ps.map((p) => [p.id, { configured: p.configured, enabled: p.enabled, capUsdMicros: p.capUsdMicros, spentUsdMicros: p.spentUsdMicros }])),
  }
}

async function acquire(env: Env, runId: string): Promise<boolean> {
  const until = new Date(Date.now() + LEASE_SECONDS * 1000).toISOString().replace('T', ' ').slice(0, 19)
  const r = await run(env.DB,
    "UPDATE runs SET lock_until=?, updated_at=datetime('now') WHERE id=? AND status IN ('planned','running') AND (lock_until IS NULL OR lock_until < ?)",
    until, runId, nowIso())
  return (r.meta?.changes ?? 0) > 0
}
async function release(env: Env, runId: string) {
  await run(env.DB, 'UPDATE runs SET lock_until=NULL WHERE id=?', runId)
}

async function ledger(env: Env, r: RunRow, provider: string, operation: string, credits: number, usdMicros: number, units = 1) {
  await run(env.DB,
    "INSERT INTO usage_ledger (id, workspace_id, run_id, user_id, provider, operation, units, credits, cost_usd_micros, kind) VALUES (?,?,?,?,?,?,?,?,?,'actual')",
    id('led'), r.workspace_id, r.id, r.user_id, provider, operation, units, credits, usdMicros)
  await run(env.DB, 'UPDATE runs SET used_credits = used_credits + ?, cost_usd_micros = cost_usd_micros + ? WHERE id=?', credits, usdMicros, r.id)
  r.used_credits += credits
}

async function loadEvidence(env: Env, runId: string): Promise<EvidenceItem[]> {
  const rows = await all<{ id: string; source_url: string | null; title: string | null; snippet: string | null; content: string | null; provider: string }>(env.DB,
    'SELECT id, source_url, title, snippet, content, provider FROM evidence WHERE run_id=? ORDER BY retrieved_at, rowid', runId)
  return rows.map((e, i) => ({ n: i + 1, id: e.id, url: e.source_url, title: e.title || e.source_url || 'Source', text: e.content || e.snippet || '', provider: e.provider }))
}

async function addEvidence(env: Env, r: RunRow, stepId: string, provider: string, e: { url: string | null; title: string; snippet?: string; content?: string; score?: number }) {
  if (e.url) {
    const dup = await first(env.DB, 'SELECT id FROM evidence WHERE run_id=? AND source_url=? AND provider=?', r.id, e.url, provider)
    if (dup) return false
  }
  const hash = await sha256((e.content || e.snippet || '') + (e.url || ''))
  await run(env.DB,
    'INSERT INTO evidence (id, workspace_id, run_id, step_id, provider, source_url, title, snippet, content, score, content_hash) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    id('evd'), r.workspace_id, r.id, stepId, provider, e.url, truncate(e.title, 300), truncate(e.snippet, 1500), e.content ? e.content.slice(0, 12000) : null, e.score ?? null, hash)
  return true
}

/** Execute a single tool. Returns output object; throws on failure. */
async function execTool(env: Env, r: RunRow, s: StepRow, policyNote: string): Promise<Record<string, unknown>> {
  const P = providers(env)
  const input = parseJson<Record<string, any>>(s.input, {})
  const plan = parseJson<Plan>(r.plan, {} as Plan)

  switch (s.tool) {
    case 'workspace_context': {
      const ws = await first<{ name: string; niche: string; goals: string; platforms: string }>(env.DB, 'SELECT name, niche, goals, platforms FROM workspaces WHERE id=?', r.workspace_id)
      const mem = await all<{ content: string }>(env.DB, "SELECT content FROM memories WHERE workspace_id=? ORDER BY weight DESC, created_at DESC LIMIT 5", r.workspace_id)
      if (!r.objective || r.objective.length < 8) throw new ProviderError('supervisor', 400, 'Objective too short', false)
      return { workspace: ws?.name, niche: ws?.niche, goals: ws?.goals, platforms: parseJson(ws?.platforms, []), learnings: mem.map((m) => m.content), validated: true }
    }
    case 'web_search': {
      const est = P.tavily.estimate('search_basic')
      const results = await P.tavily.search(String(input.query), { maxResults: 5 })
      let added = 0
      for (const x of results) if (await addEvidence(env, r, s.id, 'tavily', { url: x.url, title: x.title, snippet: x.snippet, score: x.score })) added++
      await ledger(env, r, 'tavily', 'search_basic', est.credits, est.costUsdMicros)
      return { query: input.query, results: results.length, added, top: results.slice(0, 3).map((x) => x.url) }
    }
    case 'web_extract': {
      let url: string | undefined = input.url
      if (!url) {
        const rank = Number(input.fromSearchRank ?? 0)
        const cands = await all<{ source_url: string }>(env.DB,
          "SELECT source_url FROM evidence WHERE run_id=? AND provider='tavily' AND source_url IS NOT NULL AND source_url NOT LIKE '%youtube.com%' AND source_url NOT LIKE '%tiktok.com%' AND source_url NOT LIKE '%instagram.com%' AND source_url NOT LIKE '%facebook.com%' ORDER BY score DESC", r.id)
        const done = await all<{ source_url: string }>(env.DB, "SELECT source_url FROM evidence WHERE run_id=? AND provider='firecrawl'", r.id)
        const remaining = cands.filter((c) => !done.some((d) => d.source_url === c.source_url))
        url = remaining[0]?.source_url ?? cands[rank]?.source_url
      }
      if (!url) return { skipped: true, reason: 'No candidate URL to extract' }
      const est = P.firecrawl.estimate('scrape')
      const page = await P.firecrawl.scrape(url)
      await ledger(env, r, 'firecrawl', 'scrape', est.credits, est.costUsdMicros)
      if (page.markdown.trim().length < 200) return { url, skipped: true, reason: 'Page had too little extractable content' }
      await addEvidence(env, r, s.id, 'firecrawl', { url: page.url, title: page.title, content: page.markdown, snippet: page.markdown.slice(0, 600) })
      return { url, chars: page.markdown.length, title: page.title }
    }
    case 'llm_synthesis': {
      const ev = await loadEvidence(env, r.id)
      if (!ev.length) throw new ProviderError('research', 422, 'No evidence collected; cannot generate grounded insights', false)
      const ctxStep = await first<{ output: string }>(env.DB, "SELECT output FROM run_steps WHERE run_id=? AND tool='workspace_context'", r.id)
      const ctx = parseJson<any>(ctxStep?.output, {})
      let synthesis: Synthesis | null = null
      let generator = 'extractive'
      if (P.workers_ai.configured() && !policyNote.includes('fallback')) {
        const { system, user } = buildPrompt(r.intent, plan.objective || r.objective, ctx, ev.slice(0, 12))
        try {
          const out = await P.workers_ai.chat(system, user)
          const usd = Math.round(out.inTokens * 0.29 + out.outTokens * 2.25) || P.workers_ai.estimate().costUsdMicros
          await ledger(env, r, 'workers_ai', 'chat', P.workers_ai.estimate().credits, usd, out.inTokens + out.outTokens)
          synthesis = parseSynthesis(out.text, Math.min(ev.length, 12))
          if (synthesis) generator = LLM_MODEL
        } catch (e) {
          if (!(e instanceof ProviderError)) throw e
        }
      }
      if (!synthesis) synthesis = extractiveSynthesis(r.objective, ev)
      return { generator, synthesis, evidenceCount: ev.length }
    }
    case 'report_compose': {
      const syn = await first<{ output: string }>(env.DB, "SELECT output FROM run_steps WHERE run_id=? AND tool='llm_synthesis' AND status='completed'", r.id)
      const o = parseJson<{ generator: string; synthesis: Synthesis }>(syn?.output, null as any)
      if (!o?.synthesis) throw new ProviderError('planning', 422, 'No synthesis to compose', false)
      const ev = await loadEvidence(env, r.id)
      const md = toMarkdown(r.objective, o.synthesis, ev.slice(0, 12), o.generator)
      const rid = id('rep')
      await run(env.DB, 'INSERT INTO reports (id, workspace_id, run_id, project_id, title, kind, body_md, data, generator) VALUES (?,?,?,?,?,?,?,?,?)',
        rid, r.workspace_id, r.id, r.project_id, truncate(r.objective, 140), 'intelligence', md, JSON.stringify(o.synthesis), o.generator)
      return { reportId: rid, sections: { insights: o.synthesis.insights.length, opportunities: o.synthesis.opportunities.length, recommendations: o.synthesis.recommendations.length } }
    }
    case 'measure_run': {
      const ev = await loadEvidence(env, r.id)
      const domains = new Set(ev.map((e) => { try { return new URL(e.url || '').hostname } catch { return '' } }).filter(Boolean))
      const rep = await first<{ data: string }>(env.DB, 'SELECT data FROM reports WHERE run_id=?', r.id)
      const syn = parseJson<Synthesis>(rep?.data, null as any)
      const cited = syn ? [...syn.insights, ...syn.opportunities].filter((x) => x.sources.length > 0).length : 0
      const total = syn ? syn.insights.length + syn.opportunities.length : 0
      const fresh = await first<{ c: number }>(env.DB, 'SELECT COUNT(*) c FROM runs WHERE id=?', r.id)
      const metrics = {
        evidence_count: ev.length,
        source_domains: domains.size,
        extracted_pages: ev.filter((e) => e.provider === 'firecrawl').length,
        citation_coverage_pct: total ? Math.round((cited / total) * 100) : 0,
        credits_used: r.used_credits,
        budget_credits: r.budget_credits,
        within_budget: r.used_credits <= r.budget_credits,
        _ok: !!fresh,
      }
      return metrics
    }
    case 'learn': {
      const rep = await first<{ data: string }>(env.DB, 'SELECT data FROM reports WHERE run_id=?', r.id)
      const syn = parseJson<Synthesis>(rep?.data, null as any)
      if (!syn) return { stored: 0 }
      // Only store insights that are cited by evidence and not low confidence ("verified results").
      const verified = syn.insights.filter((i) => i.sources.length > 0 && i.confidence !== 'low').slice(0, 3)
      for (const v of verified)
        await run(env.DB, 'INSERT INTO memories (id, workspace_id, run_id, kind, content, weight) VALUES (?,?,?,?,?,?)',
          id('mem'), r.workspace_id, r.id, 'learning', truncate(`${v.title}: ${v.detail}`, 400), v.confidence === 'high' ? 1.5 : 1)
      return { stored: verified.length }
    }
    case 'save_plan_tasks': {
      const rep = await first<{ id: string; data: string }>(env.DB, 'SELECT id, data FROM reports WHERE run_id=?', r.id)
      const syn = parseJson<Synthesis>(rep?.data, null as any)
      if (!syn?.recommendations?.length) return { created: 0 }
      let projectId = r.project_id
      if (!projectId) {
        projectId = id('prj')
        await run(env.DB, 'INSERT INTO projects (id, workspace_id, name, description, created_by) VALUES (?,?,?,?,?)',
          projectId, r.workspace_id, truncate(r.objective, 80), `Created from run ${r.id}`, r.user_id)
        await run(env.DB, 'UPDATE runs SET project_id=? WHERE id=?', projectId, r.id)
        await run(env.DB, 'UPDATE reports SET project_id=? WHERE run_id=?', projectId, r.id)
      }
      for (const rec of syn.recommendations)
        await run(env.DB, 'INSERT INTO tasks (id, workspace_id, project_id, run_id, title, detail) VALUES (?,?,?,?,?,?)',
          id('tsk'), r.workspace_id, projectId, r.id, truncate(rec.action, 200), `${rec.why} (prioritas ${rec.priority})`)
      return { created: syn.recommendations.length, projectId }
    }
    case 'external_publish':
      throw new ProviderError('execution', 403, 'External side effects are not available: no connected official account.', false)
    default:
      throw new ProviderError('runtime', 400, `Tool ${s.tool} not implemented`, false)
  }
}

async function finalize(env: Env, runId: string, status: 'completed' | 'failed' | 'blocked', error?: string) {
  await run(env.DB, "UPDATE runs SET status=?, error=?, completed_at=datetime('now'), updated_at=datetime('now'), lock_until=NULL WHERE id=?", status, error ?? null, runId)
}

/**
 * Advance a run by exactly one step. Returns the new run status.
 * Safe to call concurrently: the lease guarantees single execution.
 */
export async function tick(env: Env, runId: string, memberRole: PolicyCtx['memberRole'] = 'owner'): Promise<string> {
  const r0 = await first<RunRow>(env.DB, 'SELECT * FROM runs WHERE id=?', runId)
  if (!r0) throw new HttpError(404, 'not_found', 'Run not found')
  if (TERMINAL.includes(r0.status) || r0.status === 'awaiting_approval') return r0.status
  if (!(await acquire(env, runId))) return r0.status // another worker holds the lease
  const r = (await first<RunRow>(env.DB, 'SELECT * FROM runs WHERE id=?', runId))!
  try {
    const s = await first<StepRow>(env.DB, "SELECT * FROM run_steps WHERE run_id=? AND status IN ('pending','running') ORDER BY idx LIMIT 1", runId)
    if (!s) {
      await finalize(env, runId, 'completed')
      await audit(env.DB, { workspaceId: r.workspace_id, userId: r.user_id, action: 'run.completed', target: runId, detail: { credits: r.used_credits } })
      return 'completed'
    }
    if (r.status === 'planned') await run(env.DB, "UPDATE runs SET status='running' WHERE id=?", runId)

    // Policy re-evaluation at execution time (budgets/providers may have changed).
    const ctx = await buildPolicyCtx(env, r.workspace_id, memberRole, true)
    const planStep = { idx: s.idx, agent: s.agent, tool: s.tool, title: s.title, level: s.approval_level as any, input: parseJson(s.input, {}), estCredits: s.est_credits, optional: parseJson<any>(s.input, {})._optional === true || ['web_extract', 'save_plan_tasks'].includes(s.tool) }
    const decision = evaluateStep(planStep, ctx)
    const approved = await first<{ status: string }>(env.DB, 'SELECT status FROM approvals WHERE step_id=? ORDER BY created_at DESC LIMIT 1', s.id)

    if (decision.action === 'skip') {
      await run(env.DB, "UPDATE run_steps SET status='skipped', error=?, finished_at=datetime('now') WHERE id=?", decision.reason, s.id)
      return 'running'
    }
    if (decision.action === 'deny') {
      if (planStep.optional) {
        await run(env.DB, "UPDATE run_steps SET status='skipped', error=?, finished_at=datetime('now') WHERE id=?", decision.reason, s.id)
        return 'running'
      }
      await run(env.DB, "UPDATE run_steps SET status='blocked', error=?, finished_at=datetime('now') WHERE id=?", decision.reason, s.id)
      await finalize(env, runId, 'blocked', decision.reason)
      await audit(env.DB, { workspaceId: r.workspace_id, userId: r.user_id, action: 'policy.denied', target: s.id, detail: { tool: s.tool, reason: decision.reason } })
      return 'blocked'
    }
    if (decision.action === 'require_approval') {
      if (approved?.status === 'rejected') {
        await run(env.DB, "UPDATE run_steps SET status='skipped', error='Rejected by user', finished_at=datetime('now') WHERE id=?", s.id)
        return 'running'
      }
      if (approved?.status !== 'approved') {
        if (!approved) {
          await run(env.DB, 'INSERT INTO approvals (id, workspace_id, run_id, step_id, level, summary, requested_by) VALUES (?,?,?,?,?,?,?)',
            id('apr'), r.workspace_id, runId, s.id, s.approval_level, `${TOOLS[s.tool].label}: ${s.title} — ${decision.reason}`, r.user_id)
          await audit(env.DB, { workspaceId: r.workspace_id, userId: r.user_id, action: 'approval.requested', target: s.id, detail: { level: s.approval_level } })
        }
        await run(env.DB, "UPDATE run_steps SET status='awaiting_approval' WHERE id=?", s.id)
        await run(env.DB, "UPDATE runs SET status='awaiting_approval', current_step=? WHERE id=?", s.idx, runId)
        return 'awaiting_approval'
      }
    }

    // Budget hard cap per run
    if (r.used_credits + s.est_credits > r.budget_credits) {
      const reason = `Run budget exceeded (${r.used_credits}+${s.est_credits} > ${r.budget_credits})`
      await run(env.DB, "UPDATE run_steps SET status='blocked', error=? WHERE id=?", reason, s.id)
      await finalize(env, runId, 'blocked', reason)
      return 'blocked'
    }

    await run(env.DB, "UPDATE run_steps SET status='running', attempts=attempts+1, started_at=COALESCE(started_at, datetime('now')) WHERE id=?", s.id)
    await run(env.DB, 'UPDATE runs SET current_step=? WHERE id=?', s.idx, runId)
    try {
      const out = await execTool(env, r, s, decision.reason)
      await run(env.DB, "UPDATE run_steps SET status='completed', output=?, error=NULL, finished_at=datetime('now') WHERE id=?", JSON.stringify(out).slice(0, 60000), s.id)
      return 'running'
    } catch (e: any) {
      const msg = redact(String(e?.message ?? e)).slice(0, 500)
      const retryable = e instanceof ProviderError ? e.retryable : false
      const attempts = s.attempts + 1
      const plan = parseJson<Plan>(r.plan, {} as Plan)
      if (retryable && attempts < (plan.retry?.maxAttempts ?? 2)) {
        await run(env.DB, "UPDATE run_steps SET status='pending', error=? WHERE id=?", `retrying: ${msg}`, s.id)
        return 'running'
      }
      if (planStep.optional) {
        await run(env.DB, "UPDATE run_steps SET status='skipped', error=?, finished_at=datetime('now') WHERE id=?", msg, s.id)
        return 'running'
      }
      // Search failures are tolerated if at least some evidence exists.
      if (s.tool === 'web_search') {
        const has = await first<{ c: number }>(env.DB, 'SELECT COUNT(*) c FROM evidence WHERE run_id=?', runId)
        const remainingSearch = await first<{ c: number }>(env.DB, "SELECT COUNT(*) c FROM run_steps WHERE run_id=? AND tool='web_search' AND status='pending' AND id<>?", runId, s.id)
        if ((has?.c ?? 0) > 0 || (remainingSearch?.c ?? 0) > 0) {
          await run(env.DB, "UPDATE run_steps SET status='failed', error=?, finished_at=datetime('now') WHERE id=?", msg, s.id)
          return 'running'
        }
      }
      await run(env.DB, "UPDATE run_steps SET status='failed', error=?, finished_at=datetime('now') WHERE id=?", msg, s.id)
      await finalize(env, runId, 'failed', msg)
      await audit(env.DB, { workspaceId: r.workspace_id, userId: r.user_id, action: 'run.failed', target: runId, detail: { step: s.tool, error: msg } })
      return 'failed'
    }
  } finally {
    await release(env, runId)
  }
}

/** Drive a run until it stops (terminal / approval) or the time slice ends. */
export async function drive(env: Env, runId: string, memberRole: PolicyCtx['memberRole'] = 'owner', budgetMs = 25000) {
  const start = Date.now()
  let status = 'running'
  for (let i = 0; i < 20 && Date.now() - start < budgetMs; i++) {
    status = await tick(env, runId, memberRole)
    if (TERMINAL.includes(status) || status === 'awaiting_approval') break
  }
  return status
}
