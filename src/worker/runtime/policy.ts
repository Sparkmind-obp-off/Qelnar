/** Policy Engine — decides allow / approval / skip / deny for every step before execution. */
import { TOOLS } from './registry'
import type { Plan, PlanStep } from './planner'
import type { Entitlements } from '../lib/entitlements'

export type Decision =
  | { step: number; action: 'allow'; reason: string }
  | { step: number; action: 'require_approval'; reason: string }
  | { step: number; action: 'skip'; reason: string }
  | { step: number; action: 'deny'; reason: string }

export interface PolicyCtx {
  memberRole: 'owner' | 'admin' | 'member' | 'viewer'
  ent: Entitlements
  providers: Record<string, { configured: boolean; enabled: boolean; capUsdMicros: number; spentUsdMicros: number }>
  researchAuthorized: boolean           // H1 granted by user with the command
  connectedAccounts: string[]           // official social accounts connected (none yet)
}

export function evaluateStep(step: PlanStep, ctx: PolicyCtx): Decision {
  const tool = TOOLS[step.tool]
  if (!tool) return { step: step.idx, action: 'deny', reason: `Unknown tool ${step.tool}` }
  if (ctx.memberRole === 'viewer') return { step: step.idx, action: 'deny', reason: 'Viewers cannot execute runs' }

  // Entitlement gate (internal-only tools always allowed)
  const gated = ['web_search', 'web_extract', 'llm_synthesis']
  if (gated.includes(tool.id) && !ctx.ent.tools?.includes(tool.id)) {
    return step.optional ? { step: step.idx, action: 'skip', reason: `${tool.label} not included in current plan` } : { step: step.idx, action: 'deny', reason: `${tool.label} not included in current plan` }
  }

  // Provider gate
  if (tool.provider) {
    const p = ctx.providers[tool.provider]
    const unavailable = !p || !p.configured || !p.enabled
    const capped = p && p.capUsdMicros > 0 && p.spentUsdMicros >= p.capUsdMicros
    if (unavailable || capped) {
      const reason = unavailable ? `Provider ${tool.provider} unavailable` : `Provider ${tool.provider} monthly budget cap reached`
      if (tool.id === 'llm_synthesis') return { step: step.idx, action: 'allow', reason: `${reason}; extractive fallback` }
      if (step.optional) return { step: step.idx, action: 'skip', reason }
      return { step: step.idx, action: 'deny', reason }
    }
  }

  switch (tool.level) {
    case 'H0':
      return { step: step.idx, action: 'allow', reason: 'H0 internal analysis' }
    case 'H1':
      return ctx.researchAuthorized
        ? { step: step.idx, action: 'allow', reason: 'H1 public read-only research authorized with command' }
        : { step: step.idx, action: 'require_approval', reason: 'H1 data collection needs user authorization' }
    case 'H2':
      return { step: step.idx, action: 'require_approval', reason: 'H2 internal plan/delegation requires explicit approval' }
    case 'H3':
      if (!ctx.connectedAccounts.length)
        return { step: step.idx, action: 'deny', reason: 'H3 external side effect: no connected official account. QELNAR never publishes/sends/purchases without a connected official API and a specific approval.' }
      return { step: step.idx, action: 'require_approval', reason: 'H3 specific external side effect requires approval' }
  }
}

export function evaluatePlan(plan: Plan, ctx: PolicyCtx) {
  const decisions = plan.steps.map((s) => evaluateStep(s, ctx))
  const denied = decisions.find((d, i) => d.action === 'deny' && !plan.steps[i].optional)
  return { decisions, blocked: !!denied, blockReason: denied?.reason ?? null }
}
