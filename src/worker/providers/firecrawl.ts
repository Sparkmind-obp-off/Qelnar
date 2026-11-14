import { z } from 'zod'
import { ProviderAdapter, ProviderCost, classify, fetchWithTimeout, ProviderError } from './types'

// Firecrawl scrape = 1 credit. Hobby ≈ USD 16 / 3,000 credits ≈ USD 0.0053 / credit.
const USD_PER_CREDIT_MICROS = 5300
const Schema = z.object({
  success: z.boolean(),
  data: z.object({ markdown: z.string().optional(), metadata: z.record(z.string(), z.any()).optional() }).optional(),
  error: z.string().optional(),
})

export class FirecrawlAdapter implements ProviderAdapter {
  id = 'firecrawl'; label = 'Firecrawl Extract'; kind = 'extract' as const; paid = true
  constructor(private key?: string) {}
  configured() { return !!this.key }
  estimate(op = 'scrape', units = 1): ProviderCost {
    return { provider: this.id, operation: op, units, credits: 3 * units, costUsdMicros: USD_PER_CREDIT_MICROS * units }
  }
  async scrape(url: string): Promise<{ url: string; title: string; markdown: string }> {
    if (!this.key) throw new ProviderError(this.id, 0, 'Firecrawl not configured', false)
    const u = new URL(url)
    if (!/^https?:$/.test(u.protocol)) throw new ProviderError(this.id, 400, 'Only http(s) URLs allowed', false)
    const res = await fetchWithTimeout('https://api.firecrawl.dev/v2/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.key}` },
      body: JSON.stringify({ url: u.toString(), formats: ['markdown'], onlyMainContent: true, timeout: 25000 }),
    }, 30000)
    const text = await res.text()
    if (!res.ok) throw classify(this.id, res.status, text)
    const p = Schema.safeParse(JSON.parse(text))
    if (!p.success || !p.data.success) throw new ProviderError(this.id, 502, p.success ? (p.data.error ?? 'scrape failed') : 'Unexpected Firecrawl response', false)
    const md = p.data.data?.markdown ?? ''
    const title = String(p.data.data?.metadata?.title ?? u.hostname)
    return { url: u.toString(), title, markdown: md.slice(0, 12000) }
  }
}
