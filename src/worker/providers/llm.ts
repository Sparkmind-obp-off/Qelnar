import { ProviderAdapter, ProviderCost, ProviderError } from './types'

// Workers AI llama-3.3-70b-instruct-fp8-fast ≈ USD 0.29 / M input, 2.25 / M output tokens.
export const LLM_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'

export class WorkersAIAdapter implements ProviderAdapter {
  id = 'workers_ai'; label = 'Cloudflare Workers AI'; kind = 'llm' as const; paid = true
  constructor(private ai?: Ai) {}
  configured() { return !!this.ai }
  estimate(op = 'chat', units = 1): ProviderCost {
    // assume ~6k input + 1.5k output tokens
    const micros = Math.round(6000 * 0.29 + 1500 * 2.25)
    return { provider: this.id, operation: op, units, credits: 4 * units, costUsdMicros: micros * units }
  }
  async chat(system: string, user: string, maxTokens = 1800): Promise<{ text: string; inTokens: number; outTokens: number }> {
    if (!this.ai) throw new ProviderError(this.id, 0, 'Workers AI binding not configured', false)
    try {
      const r = (await this.ai.run(LLM_MODEL as any, {
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        max_tokens: maxTokens,
        temperature: 0.3,
      } as any)) as any
      const text = typeof r?.response === 'string' ? r.response : JSON.stringify(r?.response ?? '')
      return { text, inTokens: r?.usage?.prompt_tokens ?? 0, outTokens: r?.usage?.completion_tokens ?? 0 }
    } catch (e: any) {
      throw new ProviderError(this.id, 502, `Workers AI error: ${String(e?.message ?? e).slice(0, 200)}`, true)
    }
  }
}

/** Disabled-by-default adapters: present in registry for governance, never called without owner approval. */
export class DisabledAdapter implements ProviderAdapter {
  paid = true
  constructor(public id: string, public label: string, public kind: 'social' | 'extract', private hasKey: boolean) {}
  configured() { return this.hasKey }
  estimate(op = 'run', units = 1): ProviderCost { return { provider: this.id, operation: op, units, credits: 10 * units, costUsdMicros: 50000 * units } }
}
