/** Planner — converts a validated intent into an explicit, budgeted execution plan. */
import { AGENTS, TOOLS, type ApprovalLevel } from './registry'
import { INTENT_META, type Intent, buildQueries } from './router'

export interface PlanStep {
  idx: number
  agent: string
  tool: string
  title: string
  level: ApprovalLevel
  input: Record<string, unknown>
  estCredits: number
  optional?: boolean
}

export interface Plan {
  intent: Intent
  objective: string
  steps: PlanStep[]
  budgetCredits: number
  retry: { maxAttempts: number; backoff: 'linear' }
  outputs: string[]
}

export const STEP_CREDITS: Record<string, number> = {
  workspace_context: 0, web_search: 2, web_extract: 3, llm_synthesis: 4, report_compose: 0,
  save_plan_tasks: 0, measure_run: 0, learn: 0, external_publish: 0,
}

export function makePlan(intent: Intent, params: { topic: string; urls: string[]; handles: string[]; niche: string | null }): Plan {
  const meta = INTENT_META[intent]
  const objective = `${meta.label}: ${params.topic}`.slice(0, 300)
  const steps: Omit<PlanStep, 'idx' | 'estCredits' | 'level'>[] = []
  steps.push({ agent: 'supervisor', tool: 'workspace_context', title: 'Validate objective & load workspace context', input: {} })

  if (intent === 'external_action') {
    steps.push({ agent: 'execution', tool: 'external_publish', title: 'Perform requested external action', input: { request: params.topic } })
  } else {
    const queries = buildQueries(intent, params.topic, params.niche, params.handles)
    queries.forEach((q, i) => steps.push({ agent: 'research', tool: 'web_search', title: `Search public sources (${i + 1}/${queries.length})`, input: { query: q } }))
    const extractCount = params.urls.length ? params.urls.length : 2
    for (let i = 0; i < Math.min(extractCount, 3); i++)
      steps.push({ agent: 'research', tool: 'web_extract', title: params.urls[i] ? `Extract ${new URL(params.urls[i]).hostname}` : `Extract top source #${i + 1}`, input: params.urls[i] ? { url: params.urls[i] } : { fromSearchRank: i }, optional: true })
    steps.push({ agent: meta.agent, tool: 'llm_synthesis', title: `${AGENTS[meta.agent].label}: analyze evidence`, input: { intent } })
    steps.push({ agent: 'planning', tool: 'report_compose', title: 'Compose & save intelligence report', input: {} })
    steps.push({ agent: 'measurement', tool: 'measure_run', title: 'Measure evidence coverage & cost', input: {} })
    steps.push({ agent: 'learning', tool: 'learn', title: 'Store verified learnings', input: {} })
    steps.push({ agent: 'execution', tool: 'save_plan_tasks', title: 'Create project tasks from recommended actions', input: {}, optional: true })
  }

  const full: PlanStep[] = steps.map((s, idx) => ({ ...s, idx, level: TOOLS[s.tool].level, estCredits: STEP_CREDITS[s.tool] ?? 0 }))
  return {
    intent, objective, steps: full,
    budgetCredits: full.reduce((a, s) => a + s.estCredits, 0),
    retry: { maxAttempts: 2, backoff: 'linear' },
    outputs: intent === 'external_action' ? ['action_result'] : ['evidence', 'insights', 'report', 'tasks?'],
  }
}
