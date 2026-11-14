import { describe, it, expect } from 'vitest'
import { routeIntent, extractParams, buildQueries } from '../src/worker/runtime/router'
import { makePlan } from '../src/worker/runtime/planner'
import { evaluatePlan, evaluateStep, type PolicyCtx } from '../src/worker/runtime/policy'
import { parseSynthesis, extractiveSynthesis, toMarkdown } from '../src/worker/runtime/synthesis'
import { redact, bearerSafe } from './helpers'

const ent = { runs_per_month: 5, credits_per_month: 50, max_workspaces: 1, max_members: 1, max_projects: 2, tools: ['web_search', 'llm_synthesis', 'workspace_context'], export: false, team: false }
const prov = (on = true) => ({ configured: on, enabled: on, capUsdMicros: 5_000_000, spentUsdMicros: 0 })
const ctx = (o: Partial<PolicyCtx> = {}): PolicyCtx => ({ memberRole: 'owner', ent, researchAuthorized: true, connectedAccounts: [], providers: { tavily: prov(), firecrawl: prov(), workers_ai: prov() }, ...o })

describe('intent router', () => {
  it('classifies competitor, plan, opportunity, external', () => {
    expect(routeIntent('Analisis kompetitor kreator kuliner').intent).toBe('competitor_analysis')
    expect(routeIntent('Buat rencana konten 30 hari').intent).toBe('content_plan')
    expect(routeIntent('Cari peluang konten parenting').intent).toBe('opportunity_analysis')
    expect(routeIntent('Tolong posting video ini ke TikTok saya').intent).toBe('external_action')
    expect(routeIntent('riset tren audiens gaming').intent).toBe('creator_research')
  })
  it('extracts urls and handles', () => {
    const p = extractParams('analisis @rina.masak dan https://example.com/a', 'kuliner')
    expect(p.urls).toEqual(['https://example.com/a'])
    expect(p.handles).toEqual(['rina.masak'])
    expect(p.topic).not.toContain('https://')
  })
  it('builds max 3 deduped queries', () => {
    expect(buildQueries('competitor_analysis', 'x kreator', 'kuliner', ['a', 'b', 'c']).length).toBeLessThanOrEqual(3)
  })
})

describe('planner', () => {
  it('creates budgeted plan with H0/H1/H2 steps', () => {
    const plan = makePlan('competitor_analysis', { topic: 'kompetitor kuliner', urls: [], handles: [], niche: 'kuliner' })
    expect(plan.steps[0].tool).toBe('workspace_context')
    expect(plan.steps.some((s) => s.tool === 'web_search' && s.level === 'H1')).toBe(true)
    expect(plan.steps.find((s) => s.tool === 'save_plan_tasks')?.level).toBe('H2')
    expect(plan.budgetCredits).toBe(plan.steps.reduce((a, s) => a + s.estCredits, 0))
  })
  it('external action plan contains H3 step', () => {
    expect(makePlan('external_action', { topic: 'post video', urls: [], handles: [], niche: null }).steps.some((s) => s.level === 'H3')).toBe(true)
  })
})

describe('policy engine', () => {
  const plan = makePlan('creator_research', { topic: 'riset tren kreator', urls: [], handles: [], niche: null })
  it('allows H0/H1 with authorization, requires approval for H2', () => {
    const r = evaluatePlan(plan, ctx())
    expect(r.blocked).toBe(false)
    const d = (tool: string) => r.decisions[plan.steps.findIndex((s) => s.tool === tool)].action
    expect(d('web_search')).toBe('allow')
    expect(d('save_plan_tasks')).toBe('require_approval')
  })
  it('H1 requires approval when research not authorized', () => {
    const r = evaluatePlan(plan, ctx({ researchAuthorized: false }))
    expect(r.decisions[plan.steps.findIndex((s) => s.tool === 'web_search')].action).toBe('require_approval')
  })
  it('skips web_extract when not in plan entitlements (trial)', () => {
    const r = evaluatePlan(plan, ctx())
    expect(r.decisions[plan.steps.findIndex((s) => s.tool === 'web_extract')].action).toBe('skip')
  })
  it('denies H3 without connected official account (blocks run)', () => {
    const p = makePlan('external_action', { topic: 'post', urls: [], handles: [], niche: null })
    const r = evaluatePlan(p, ctx())
    expect(r.blocked).toBe(true)
    expect(r.blockReason).toMatch(/H3/)
  })
  it('denies everything for viewers', () => {
    expect(evaluatePlan(plan, ctx({ memberRole: 'viewer' })).blocked).toBe(true)
  })
  it('blocks search when provider cap reached; LLM falls back', () => {
    const capped = { configured: true, enabled: true, capUsdMicros: 100, spentUsdMicros: 100 }
    const r = evaluatePlan(plan, ctx({ providers: { tavily: capped, firecrawl: prov(), workers_ai: capped } }))
    expect(r.blocked).toBe(true)
    const llm = plan.steps.find((s) => s.tool === 'llm_synthesis')!
    expect(evaluateStep(llm, ctx({ providers: { tavily: prov(), firecrawl: prov(), workers_ai: capped } })).action).toBe('allow')
  })
})

describe('synthesis', () => {
  const ev = [{ n: 1, id: 'e1', url: 'https://a.com', title: 'A', text: 'Kreator kuliner rumahan semakin populer di TikTok Indonesia karena format resep singkat yang mudah diikuti penonton.', provider: 'tavily' }]
  it('parses model JSON and drops invalid citations', () => {
    const s = parseSynthesis('noise {"summary":"ok","insights":[{"title":"t","detail":"d","sources":[1,9],"confidence":"high"}],"opportunities":[],"recommendations":[],"unknowns":[]} tail', 1)
    expect(s?.insights[0].sources).toEqual([1])
  })
  it('returns null on garbage', () => { expect(parseSynthesis('no json', 3)).toBeNull() })
  it('extractive fallback is labelled and cites sources', () => {
    const s = extractiveSynthesis('obj', ev)
    expect(s.summary).toMatch(/ekstraktif/)
    expect(s.insights[0].sources).toEqual([1])
    expect(toMarkdown('obj', s, ev, 'extractive')).toContain('## Sumber')
  })
})

describe('security helpers', () => {
  it('redacts secrets', () => {
    expect(redact('key sk_live_abcdefghijkl and tvly-ABCDEFGHIJ')).not.toMatch(/abcdefghijkl|ABCDEFGHIJ/)
  })
  it('bearer parsing', () => { expect(bearerSafe('Bearer abc')).toBe('abc'); expect(bearerSafe('Basic x')).toBeNull() })
})
