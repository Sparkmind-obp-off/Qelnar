import { z } from 'zod'
import { ProviderAdapter, ProviderCost, classify, fetchWithTimeout, ProviderError } from './types'

// Tavily: basic search = 1 API credit, advanced = 2. Pay-as-you-go ≈ USD 0.008 / credit.
const USD_PER_CREDIT_MICROS = 8000

const ResultSchema = z.object({
  url: z.string(),
  title: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  score: z.number().nullable().optional(),
  published_date: z.string().nullable().optional(),
})
const ResponseSchema = z.object({ results: z.array(ResultSchema).default([]), answer: z.string().nullable().optional() })
export type SearchResult = { url: string; title: string; snippet: string; score: number; publishedDate?: string | null }

export class TavilyAdapter implements ProviderAdapter {
  id = 'tavily'; label = 'Tavily Search'; kind = 'search' as const; paid = true
  constructor(private key?: string) {}
  configured() { return !!this.key }
  estimate(op = 'search_basic', units = 1): ProviderCost {
    const apiCredits = op === 'search_advanced' ? 2 : 1
    return { provider: this.id, operation: op, units, credits: 2 * units, costUsdMicros: apiCredits * USD_PER_CREDIT_MICROS * units }
  }
  async search(query: string, opts: { maxResults?: number; days?: number; topic?: 'general' | 'news' } = {}): Promise<SearchResult[]> {
    if (!this.key) throw new ProviderError(this.id, 0, 'Tavily not configured', false)
    const q = query.trim().slice(0, 380)
    const res = await fetchWithTimeout('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.key}` },
      body: JSON.stringify({ query: q, search_depth: 'basic', max_results: Math.min(opts.maxResults ?? 6, 10), topic: opts.topic ?? 'general', include_answer: false, ...(opts.days ? { days: opts.days } : {}) }),
    })
    const text = await res.text()
    if (!res.ok) throw classify(this.id, res.status, text)
    const parsed = ResponseSchema.safeParse(JSON.parse(text))
    if (!parsed.success) throw new ProviderError(this.id, 502, 'Unexpected Tavily response shape', false)
    return parsed.data.results.map((r) => ({ url: r.url, title: r.title ?? r.url, snippet: (r.content ?? '').slice(0, 1200), score: r.score ?? 0, publishedDate: r.published_date }))
  }
}
