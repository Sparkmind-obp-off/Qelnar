import { useCallback } from 'react'
import { useAppAuth } from './auth'

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public detail?: any) { super(message) }
}

const WS_KEY = 'qelnar.ws'
export const getStoredWs = () => localStorage.getItem(WS_KEY)
export const setStoredWs = (id: string | null) => (id ? localStorage.setItem(WS_KEY, id) : localStorage.removeItem(WS_KEY))

export async function publicGet<T>(path: string): Promise<T> {
  const r = await fetch(path)
  if (!r.ok) throw new ApiError(r.status, 'http_error', `HTTP ${r.status}`)
  return r.json()
}

export function useApi() {
  const { getToken } = useAppAuth()
  return useCallback(async <T = any>(path: string, opts: { method?: string; body?: unknown; ws?: string | null; raw?: boolean } = {}): Promise<T> => {
    const token = await getToken()
    if (!token) throw new ApiError(401, 'unauthenticated', 'Sesi berakhir. Silakan masuk kembali.')
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
    const ws = opts.ws === undefined ? getStoredWs() : opts.ws
    if (ws) headers['X-Workspace-Id'] = ws
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
    const r = await fetch(`/api/v1${path}`, { method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'), headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined })
    if (opts.raw && r.ok) return r as unknown as T
    const data: any = await r.json().catch(() => ({}))
    if (!r.ok) throw new ApiError(r.status, data?.error?.code ?? 'http_error', data?.error?.message ?? `HTTP ${r.status}`, data?.error?.detail)
    return data as T
  }, [getToken])
}
