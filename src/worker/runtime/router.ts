/** Intent Router — deterministic, explainable classification (ID + EN). */
export type Intent = 'creator_research' | 'competitor_analysis' | 'content_strategy' | 'opportunity_analysis' | 'content_plan' | 'external_action'

export const INTENT_META: Record<Intent, { label: string; agent: string }> = {
  creator_research: { label: 'Creator & market research', agent: 'creator_intel' },
  competitor_analysis: { label: 'Competitor analysis', agent: 'competitor' },
  content_strategy: { label: 'Content strategy', agent: 'strategy' },
  opportunity_analysis: { label: 'Opportunity analysis', agent: 'opportunity' },
  content_plan: { label: 'Content plan', agent: 'strategy' },
  external_action: { label: 'External action', agent: 'execution' },
}

const RULES: [Intent, RegExp][] = [
  ['external_action', /\b(publish|posting|post(kan)?|upload|unggah|kirim|send|dm|balas komentar|reply|schedule post|jadwalkan posting|beli|purchase|hapus|delete)\b/i],
  ['competitor_analysis', /\b(kompetitor|competitor|pesaing|saingan|rival|benchmark|bandingkan|compare|vs\.?)\b/i],
  ['content_plan', /\b(kalender|calendar|rencana|plan|jadwal|schedule|roadmap|30 hari|7 hari|mingguan|weekly|bulanan|monthly)\b/i],
  ['opportunity_analysis', /\b(peluang|opportunit|gap|celah|untapped|belum digarap|ide|ideas?|niche baru)\b/i],
  ['content_strategy', /\b(strategi|strategy|pilar|pillar|positioning|hook|format|growth|tumbuh|branding)\b/i],
  ['creator_research', /\b(riset|research|tren|trend|audiens|audience|pasar|market|analisis|analyze|creator|kreator|insight)\b/i],
]

export function routeIntent(command: string): { intent: Intent; confidence: number; matched: string | null } {
  for (const [intent, re] of RULES) {
    const m = re.exec(command)
    if (m) return { intent, confidence: intent === 'creator_research' ? 0.7 : 0.85, matched: m[0] }
  }
  return { intent: 'creator_research', confidence: 0.5, matched: null }
}

/** Extract research topic & URLs from command. */
export function extractParams(command: string, niche?: string | null) {
  const urls = Array.from(command.matchAll(/https?:\/\/[^\s)]+/g)).map((m) => m[0]).slice(0, 3)
  const handles = Array.from(command.matchAll(/@([A-Za-z0-9_.]{2,30})/g)).map((m) => m[1]).slice(0, 5)
  const topic = command.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim()
  return { topic: topic.slice(0, 300), urls, handles, niche: niche ?? null }
}

export function buildQueries(intent: Intent, topic: string, niche: string | null, handles: string[]): string[] {
  const n = niche ? ` ${niche}` : ''
  const base = topic.length > 160 ? topic.slice(0, 160) : topic
  const q: string[] = [base]
  switch (intent) {
    case 'competitor_analysis':
      q.push(`top kreator konten${n} Indonesia strategi konten`, ...handles.slice(0, 2).map((h) => `${h} creator content strategy`))
      break
    case 'opportunity_analysis':
      q.push(`tren konten${n} Indonesia 2026 peluang`, `${base} audience pain points`)
      break
    case 'content_strategy':
    case 'content_plan':
      q.push(`strategi konten${n} yang efektif TikTok Instagram YouTube`, `tren format konten${n} 2026`)
      break
    default:
      q.push(`tren kreator${n} Indonesia 2026`, `audiens${n} perilaku konsumsi konten`)
  }
  return Array.from(new Set(q.map((s) => s.trim()).filter(Boolean))).slice(0, 3)
}
