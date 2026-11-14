export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public detail?: unknown) {
    super(message)
  }
}

export function id(prefix: string): string {
  const b = new Uint8Array(12)
  crypto.getRandomValues(b)
  return `${prefix}_${Array.from(b, (x) => x.toString(36).padStart(2, '0')).join('').slice(0, 20)}`
}

export const nowIso = () => new Date().toISOString().replace('T', ' ').slice(0, 19)

export function monthStart(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01 00:00:00`
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso.replace(' ', 'T') + 'Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().replace('T', ' ').slice(0, 19)
}

export async function sha256(text: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(h), (x) => x.toString(16).padStart(2, '0')).join('')
}

export function parseJson<T>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback
  try {
    return JSON.parse(s) as T
  } catch {
    return fallback
  }
}

export function truncate(s: string | null | undefined, n: number): string {
  if (!s) return ''
  return s.length > n ? s.slice(0, n) + '…' : s
}

/** Remove anything that looks like a secret from strings before logging/storing. */
export function redact(s: string): string {
  return s.replace(/(sk_(live|test)_|fc-|tvly-|apify_api_|scrapely_(sk_)?)[A-Za-z0-9_-]{6,}/g, '$1***')
}
