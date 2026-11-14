import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useApi, getStoredWs, setStoredWs, ApiError } from './api'

export interface Me {
  user: { id: string; email: string | null; name: string | null; role: 'user' | 'admin'; onboarded: boolean }
  workspaces: { id: string; name: string; niche: string; role: string; plan_id: string; sub_status: string }[]
}
export interface WsDetail {
  workspace: { id: string; name: string; niche: string; goals: string; platforms: string[] }
  role: 'owner' | 'admin' | 'member' | 'viewer'
  subscription: { plan_id: string; status: string; period_end: string; price_idr_locked: number | null }
  plan: { id: string; name: string; price_idr: number | null }
  entitlements: { runs_per_month: number; credits_per_month: number; max_workspaces: number; max_members: number; max_projects: number; export: boolean; team: boolean; tools: string[] }
  active: boolean
  usage: { runs: number; credits: number; reservedCredits: number }
  counts: { runs: number; reports: number; pending_approvals: number; projects: number; evidence: number }
}

interface Ctx {
  me: Me | null
  ws: WsDetail | null
  wsId: string | null
  loading: boolean
  error: unknown
  refresh: () => Promise<void>
  refreshWs: () => Promise<void>
  switchWs: (id: string) => void
}
const C = createContext<Ctx | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const api = useApi()
  const [me, setMe] = useState<Me | null>(null)
  const [ws, setWs] = useState<WsDetail | null>(null)
  const [wsId, setWsId] = useState<string | null>(getStoredWs())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  const loadWs = useCallback(async (id: string | null) => {
    if (!id) { setWs(null); return }
    try {
      setWs(await api<WsDetail>('/workspace', { ws: id }))
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) { setStoredWs(null); setWsId(null); setWs(null) } else throw e
    }
  }, [api])

  const refresh = useCallback(async () => {
    setError(null)
    try {
      const m = await api<Me>('/me', { ws: null })
      setMe(m)
      let id = getStoredWs()
      if (!id || !m.workspaces.some((w) => w.id === id)) id = m.workspaces[0]?.id ?? null
      setStoredWs(id)
      setWsId(id)
      await loadWs(id)
    } catch (e) { setError(e) } finally { setLoading(false) }
  }, [api, loadWs])

  useEffect(() => { refresh() }, [refresh])

  const value: Ctx = {
    me, ws, wsId, loading, error, refresh,
    refreshWs: () => loadWs(wsId),
    switchWs: (id) => { setStoredWs(id); setWsId(id); loadWs(id) },
  }
  return <C.Provider value={value}>{children}</C.Provider>
}

export function useWs() {
  const v = useContext(C)
  if (!v) throw new Error('useWs outside WorkspaceProvider')
  return v
}
