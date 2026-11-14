/** Agent & Tool registries — explicit contracts, no hidden capabilities. */
export type ApprovalLevel = 'H0' | 'H1' | 'H2' | 'H3'

export interface ToolDef {
  id: string
  label: string
  level: ApprovalLevel
  provider: string | null          // provider adapter id (null = internal)
  readOnly: boolean
  external: boolean                // true = side effect outside QELNAR
  description: string
}

export const TOOLS: Record<string, ToolDef> = {
  workspace_context: { id: 'workspace_context', label: 'Workspace context', level: 'H0', provider: null, readOnly: true, external: false, description: 'Load workspace niche, goals, platforms and prior learnings.' },
  web_search: { id: 'web_search', label: 'Public web search', level: 'H1', provider: 'tavily', readOnly: true, external: false, description: 'Search public web sources. Authorized by the user submitting the command.' },
  web_extract: { id: 'web_extract', label: 'Public page extraction', level: 'H1', provider: 'firecrawl', readOnly: true, external: false, description: 'Extract main content of public pages found in research.' },
  llm_synthesis: { id: 'llm_synthesis', label: 'Evidence synthesis', level: 'H0', provider: 'workers_ai', readOnly: true, external: false, description: 'Analyze collected evidence into cited insights.' },
  report_compose: { id: 'report_compose', label: 'Report composer', level: 'H0', provider: null, readOnly: false, external: false, description: 'Compose and save the intelligence report.' },
  save_plan_tasks: { id: 'save_plan_tasks', label: 'Create project tasks', level: 'H2', provider: null, readOnly: false, external: false, description: 'Create an internal project with tasks from recommended actions. Requires user approval.' },
  measure_run: { id: 'measure_run', label: 'Run measurement', level: 'H0', provider: null, readOnly: true, external: false, description: 'Measure evidence coverage, source diversity and cost.' },
  learn: { id: 'learn', label: 'Workspace learning', level: 'H0', provider: null, readOnly: false, external: false, description: 'Store verified learnings to workspace memory.' },
  external_publish: { id: 'external_publish', label: 'External publish / message', level: 'H3', provider: null, readOnly: false, external: true, description: 'Publish or send to an external account. Requires connected official account + specific approval.' },
}

export interface AgentDef { id: string; label: string; role: string; tools: string[] }

export const AGENTS: Record<string, AgentDef> = {
  supervisor: { id: 'supervisor', label: 'Supervisor Agent', role: 'Validates objective, owns plan & execution authority.', tools: ['workspace_context'] },
  research: { id: 'research', label: 'Research Agent', role: 'Collects public evidence with provenance.', tools: ['web_search', 'web_extract'] },
  creator_intel: { id: 'creator_intel', label: 'Creator Intelligence Agent', role: 'Maps niche, audience and creator ecosystem.', tools: ['llm_synthesis'] },
  competitor: { id: 'competitor', label: 'Competitor Analysis Agent', role: 'Analyzes competitor positioning and content patterns.', tools: ['llm_synthesis'] },
  strategy: { id: 'strategy', label: 'Content Strategy Agent', role: 'Turns insights into content pillars and strategy.', tools: ['llm_synthesis'] },
  opportunity: { id: 'opportunity', label: 'Opportunity Analysis Agent', role: 'Finds gaps and prioritized opportunities.', tools: ['llm_synthesis'] },
  planning: { id: 'planning', label: 'Planning Agent', role: 'Builds actionable plans and reports.', tools: ['report_compose'] },
  execution: { id: 'execution', label: 'Execution Agent', role: 'Executes approved internal actions only.', tools: ['save_plan_tasks', 'external_publish'] },
  measurement: { id: 'measurement', label: 'Measurement Agent', role: 'Measures run quality and cost.', tools: ['measure_run'] },
  learning: { id: 'learning', label: 'Learning Agent', role: 'Learns from verified results and feedback.', tools: ['learn'] },
}
