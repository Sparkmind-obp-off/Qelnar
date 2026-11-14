/** Evidence synthesis — LLM with strict JSON contract + deterministic extractive fallback. */
import { z } from 'zod'
import type { Intent } from './router'

export interface EvidenceItem { n: number; id: string; url: string | null; title: string; text: string; provider: string }

export const InsightSchema = z.object({
  summary: z.string().min(1),
  insights: z.array(z.object({ title: z.string(), detail: z.string(), sources: z.array(z.number()).default([]), confidence: z.enum(['high', 'medium', 'low']).catch('medium') })).default([]),
  opportunities: z.array(z.object({ title: z.string(), detail: z.string(), sources: z.array(z.number()).default([]) })).default([]),
  recommendations: z.array(z.object({ action: z.string(), why: z.string(), priority: z.enum(['high', 'medium', 'low']).catch('medium') })).default([]),
  unknowns: z.array(z.string()).default([]),
})
export type Synthesis = z.infer<typeof InsightSchema>

const FOCUS: Record<Intent, string> = {
  creator_research: 'creator ecosystem, audience behaviour, market signals and trends',
  competitor_analysis: 'competitor positioning, content formats, hooks, posting patterns, and differentiation gaps',
  content_strategy: 'content pillars, formats, positioning and a coherent strategy',
  opportunity_analysis: 'underserved topics, audience pain points, and prioritized opportunities',
  content_plan: 'an actionable content plan (themes, formats, cadence) grounded in evidence',
  external_action: 'n/a',
}

export function buildPrompt(intent: Intent, objective: string, ctx: { niche?: string | null; goals?: string | null; platforms?: string[]; learnings?: string[] }, ev: EvidenceItem[]) {
  const system = [
    'You are QELNAR, a creator intelligence analyst. Use ONLY the numbered evidence provided.',
    'Every insight and opportunity MUST cite evidence numbers in "sources". Never invent statistics, follower counts, or facts not in evidence.',
    'Distinguish verified facts from inference. Put gaps in "unknowns". Never promise views, followers, sales or virality.',
    'Answer in the same language as the objective (Bahasa Indonesia if the objective is Indonesian).',
    'Return ONLY valid minified JSON matching: {"summary":string,"insights":[{"title":string,"detail":string,"sources":number[],"confidence":"high"|"medium"|"low"}],"opportunities":[{"title":string,"detail":string,"sources":number[]}],"recommendations":[{"action":string,"why":string,"priority":"high"|"medium"|"low"}],"unknowns":string[]}',
    'Give 3-6 insights, 2-5 opportunities, 3-6 recommendations.',
  ].join('\n')
  const evText = ev.map((e) => `[${e.n}] ${e.title}${e.url ? ` (${e.url})` : ''}\n${e.text.slice(0, 1500)}`).join('\n\n')
  const user = [
    `OBJECTIVE: ${objective}`,
    `FOCUS: ${FOCUS[intent]}`,
    ctx.niche ? `WORKSPACE NICHE: ${ctx.niche}` : '',
    ctx.goals ? `GOALS: ${ctx.goals}` : '',
    ctx.platforms?.length ? `PLATFORMS: ${ctx.platforms.join(', ')}` : '',
    ctx.learnings?.length ? `PRIOR VERIFIED LEARNINGS:\n- ${ctx.learnings.join('\n- ')}` : '',
    `EVIDENCE:\n${evText}`,
  ].filter(Boolean).join('\n\n')
  return { system, user }
}

export function parseSynthesis(text: string, maxSource: number): Synthesis | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const p = InsightSchema.safeParse(JSON.parse(text.slice(start, end + 1)))
    if (!p.success) return null
    const clean = (s: number[]) => s.filter((n) => Number.isInteger(n) && n >= 1 && n <= maxSource)
    return {
      ...p.data,
      insights: p.data.insights.map((i) => ({ ...i, sources: clean(i.sources) })),
      opportunities: p.data.opportunities.map((o) => ({ ...o, sources: clean(o.sources) })),
    }
  } catch {
    return null
  }
}

/** Deterministic fallback: no LLM. Clearly labelled extractive output built from evidence text. */
export function extractiveSynthesis(objective: string, ev: EvidenceItem[]): Synthesis {
  const sentences = ev.flatMap((e) =>
    e.text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter((s) => s.length > 60 && s.length < 320).slice(0, 2).map((s) => ({ s, n: e.n, title: e.title })),
  )
  return {
    summary: `Ringkasan ekstraktif (tanpa model AI) untuk: ${objective}. ${ev.length} sumber publik dikumpulkan; poin di bawah dikutip langsung dari sumber.`,
    insights: sentences.slice(0, 5).map((x) => ({ title: x.title.slice(0, 90), detail: x.s, sources: [x.n], confidence: 'low' as const })),
    opportunities: [],
    recommendations: [{ action: 'Tinjau sumber yang dikutip dan jalankan ulang analisis saat model AI tersedia', why: 'Hasil ini ekstraktif dan belum dianalisis model', priority: 'medium' as const }],
    unknowns: ['Analisis model AI tidak tersedia untuk run ini; tidak ada inferensi yang dibuat.'],
  }
}

export function toMarkdown(objective: string, s: Synthesis, ev: EvidenceItem[], generator: string, metrics?: Record<string, unknown>): string {
  const cite = (src: number[]) => (src.length ? ' ' + src.map((n) => `[${n}]`).join('') : '')
  const lines: string[] = [`# ${objective}`, '', `> Generator: ${generator} · Sumber: ${ev.length}`, '', '## Ringkasan', s.summary, '']
  if (s.insights.length) {
    lines.push('## Insight')
    s.insights.forEach((i) => lines.push(`- **${i.title}** (${i.confidence}) — ${i.detail}${cite(i.sources)}`))
    lines.push('')
  }
  if (s.opportunities.length) {
    lines.push('## Peluang')
    s.opportunities.forEach((o) => lines.push(`- **${o.title}** — ${o.detail}${cite(o.sources)}`))
    lines.push('')
  }
  if (s.recommendations.length) {
    lines.push('## Rekomendasi Aksi')
    s.recommendations.forEach((r, i) => lines.push(`${i + 1}. **${r.action}** _(prioritas ${r.priority})_ — ${r.why}`))
    lines.push('')
  }
  if (s.unknowns.length) {
    lines.push('## Yang Belum Diketahui / Batasan')
    s.unknowns.forEach((u) => lines.push(`- ${u}`))
    lines.push('')
  }
  lines.push('## Sumber')
  ev.forEach((e) => lines.push(`${e.n}. ${e.title}${e.url ? ` — ${e.url}` : ''} _(via ${e.provider})_`))
  if (metrics) {
    lines.push('', '## Metrik Run')
    Object.entries(metrics).forEach(([k, v]) => lines.push(`- ${k}: ${v}`))
  }
  lines.push('', '_Laporan ini berbasis sumber publik pada saat pengambilan. Bukan jaminan hasil views, followers, atau penjualan._')
  return lines.join('\n')
}
