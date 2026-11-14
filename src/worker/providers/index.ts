import type { Env } from '../env'
import { TavilyAdapter } from './tavily'
import { FirecrawlAdapter } from './firecrawl'
import { WorkersAIAdapter, DisabledAdapter } from './llm'
import { all } from '../lib/db'

export function providers(env: Env) {
  return {
    tavily: new TavilyAdapter(env.TAVILY_API_KEY),
    firecrawl: new FirecrawlAdapter(env.FIRECRAWL_API_KEY),
    workers_ai: new WorkersAIAdapter(env.AI),
    apify: new DisabledAdapter('apify', 'Apify Actors', 'social', !!env.APIFY_API_TOKEN),
    scrapely: new DisabledAdapter('scrapely', 'Scrape.ly', 'extract', !!env.SCRAPELY_API_KEY),
  }
}
export type Providers = ReturnType<typeof providers>

export async function providerStatus(env: Env) {
  const p = providers(env)
  const settings = await all<{ provider: string; enabled: number; monthly_cap_usd_micros: number; note: string }>(env.DB, 'SELECT * FROM provider_settings')
  const spend = await all<{ provider: string; usd: number; n: number }>(env.DB,
    "SELECT provider, COALESCE(SUM(cost_usd_micros),0) usd, COUNT(*) n FROM usage_ledger WHERE kind='actual' AND created_at >= strftime('%Y-%m-01 00:00:00','now') GROUP BY provider")
  return Object.values(p).map((a) => {
    const s = settings.find((x) => x.provider === a.id)
    const sp = spend.find((x) => x.provider === a.id)
    return { id: a.id, label: a.label, kind: a.kind, paid: a.paid, configured: a.configured(), enabled: !!s?.enabled, capUsdMicros: s?.monthly_cap_usd_micros ?? 0, spentUsdMicros: sp?.usd ?? 0, calls: sp?.n ?? 0, note: s?.note ?? '' }
  })
}
