export interface ProviderCost {
  provider: string
  operation: string
  units: number
  credits: number        // internal QELNAR credits charged to the workspace
  costUsdMicros: number  // estimated upstream cost (1 USD = 1_000_000 micros)
}

export interface ProviderAdapter {
  id: string
  label: string
  kind: 'search' | 'extract' | 'llm' | 'social'
  paid: boolean
  configured(): boolean
  /** Estimated cost for one operation (before execution). */
  estimate(op: string, units?: number): ProviderCost
}

export class ProviderError extends Error {
  constructor(public provider: string, public status: number, message: string, public retryable: boolean) {
    super(message)
  }
}

export async function fetchWithTimeout(url: string, init: RequestInit, ms = 20000): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort('timeout'), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

export function classify(provider: string, status: number, body: string): ProviderError {
  const retryable = status === 429 || status >= 500 || status === 0
  return new ProviderError(provider, status, `${provider} HTTP ${status}: ${body.slice(0, 200)}`, retryable)
}
