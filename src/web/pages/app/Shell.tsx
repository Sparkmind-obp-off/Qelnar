import { useState } from 'react'
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAppAuth } from '../../lib/auth'
import { useWs } from '../../lib/workspace'
import { useApi } from '../../lib/api'
import { Badge, Button, Card, ErrorBox, Field, Logo, Modal, Spinner, cx, inputCls, toast } from '../../components/ui'
import { CommandCenter, RunsPage, RunDetail } from './command'
import { ApprovalsPage, ReportsPage, ReportDetail, EvidencePage, ProjectsPage, ProjectDetail } from './intel'
import { BillingPage, ServicesAppPage, TeamPage, SettingsPage } from './account'
import { AdminPage } from './admin'

const PLATFORMS = ['tiktok', 'instagram', 'youtube', 'x', 'facebook', 'linkedin', 'blog', 'podcast'] as const

export function WorkspaceForm({ onDone, mode }: { onDone: (id: string) => void; mode: 'onboarding' | 'create' }) {
  const api = useApi()
  const [name, setName] = useState('')
  const [niche, setNiche] = useState('')
  const [goals, setGoals] = useState('')
  const [platforms, setPlatforms] = useState<string[]>(['tiktok', 'instagram'])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr(null)
    try {
      const r = await api<{ workspaceId: string }>(mode === 'onboarding' ? '/onboarding' : '/workspaces', { body: { name, niche, goals, platforms }, ws: null })
      onDone(r.workspaceId)
    } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nama workspace"><input required minLength={2} maxLength={80} className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Dapur Rina Studio" /></Field>
      <Field label="Niche / kategori konten" hint="Dipakai agen sebagai konteks riset."><input maxLength={160} className={inputCls} value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="mis. kuliner rumahan, edukasi finansial" /></Field>
      <Field label="Tujuan utama"><textarea maxLength={600} rows={3} className={inputCls} value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="mis. memperjelas positioning dan menemukan format konten yang belum digarap kompetitor" /></Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-300">Platform</legend>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button type="button" key={p} aria-pressed={platforms.includes(p)} onClick={() => setPlatforms((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]))}
              className={cx('rounded-full border px-3 py-1 text-xs font-semibold capitalize', platforms.includes(p) ? 'border-brand-500 bg-brand-500/20 text-white' : 'border-ink-600 text-slate-400 hover:text-white')}>{p}</button>
          ))}
        </div>
      </fieldset>
      <ErrorBox error={err} />
      <Button type="submit" loading={busy} className="w-full">{mode === 'onboarding' ? 'Buat workspace & mulai Free Trial' : 'Buat workspace'}</Button>
    </form>
  )
}

function Onboarding() {
  const { refresh } = useWs()
  const { user, signOut } = useAppAuth()
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="grad-border w-full max-w-lg p-8">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold text-white">Selamat datang{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋</h1>
        <p className="mt-1 mb-6 text-sm text-slate-400">Siapkan workspace pertama Anda. Free Trial 14 hari langsung aktif — 5 run dan 50 kredit riset.</p>
        <WorkspaceForm mode="onboarding" onDone={async () => { await refresh(); toast('Workspace dibuat. Free Trial aktif.') }} />
        <button onClick={signOut} className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-300">Keluar</button>
      </Card>
    </div>
  )
}

const NAV = [
  { to: '/app', label: 'Command Center', icon: '⌘', end: true },
  { to: '/app/runs', label: 'Run History', icon: '↻' },
  { to: '/app/approvals', label: 'Approvals', icon: '✓', badge: 'approvals' },
  { to: '/app/reports', label: 'Reports', icon: '▤' },
  { to: '/app/evidence', label: 'Evidence', icon: '❖' },
  { to: '/app/projects', label: 'Projects', icon: '◫' },
  { to: '/app/services', label: 'Services', icon: '✦' },
  { to: '/app/billing', label: 'Usage & Billing', icon: '◔' },
  { to: '/app/team', label: 'Team', icon: '☺' },
  { to: '/app/settings', label: 'Settings', icon: '⚙' },
]

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { me, ws, switchWs } = useWs()
  const { user, signOut, openAccount } = useAppAuth()
  const nav = useNavigate()
  const [creating, setCreating] = useState(false)
  const { refresh } = useWs()
  return (
    <aside className="flex h-full w-64 flex-col border-r border-ink-700 bg-ink-900">
      <div className="flex h-16 items-center px-5"><NavLink to="/app"><Logo /></NavLink></div>
      <div className="px-3">
        <label className="sr-only" htmlFor="ws-switch">Workspace</label>
        <select id="ws-switch" className={cx(inputCls, 'text-xs')} value={ws?.workspace.id ?? ''} onChange={(e) => { if (e.target.value === '__new') setCreating(true); else { switchWs(e.target.value); nav('/app') } }}>
          {me?.workspaces.map((w) => <option key={w.id} value={w.id}>{w.name} · {w.role}</option>)}
          <option value="__new">+ Workspace baru…</option>
        </select>
        {ws && <div className="mt-2 flex items-center gap-2 px-1 text-xs"><Badge tone={ws.subscription.status}>{ws.plan.name}</Badge><span className="text-slate-500">{ws.subscription.status}</span></div>}
      </div>
      <nav className="mt-4 flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="App">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={onNavigate}
            className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition', isActive ? 'bg-brand-500/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white')}>
            <span className="w-4 text-center text-brand-400">{n.icon}</span>{n.label}
            {n.badge === 'approvals' && !!ws?.counts.pending_approvals && <span className="ml-auto rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-black">{ws.counts.pending_approvals}</span>}
          </NavLink>
        ))}
        {me?.user.role === 'admin' && (
          <NavLink to="/app/admin" onClick={onNavigate} className={({ isActive }) => cx('mt-4 flex items-center gap-3 rounded-lg border border-rose-500/20 px-3 py-2 text-sm font-medium', isActive ? 'bg-rose-500/15 text-white' : 'text-rose-300 hover:bg-rose-500/10')}>
            <span className="w-4 text-center">⛨</span>Admin Console
          </NavLink>
        )}
      </nav>
      <div className="border-t border-ink-700 p-3">
        <div className="flex items-center gap-3 rounded-lg p-2">
          {user?.imageUrl ? <img src={user.imageUrl} alt="" className="h-8 w-8 rounded-full" /> : <div className="h-8 w-8 rounded-full bg-ink-700" />}
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{user?.name ?? 'User'}</p><p className="truncate text-xs text-slate-500">{user?.email}</p></div>
        </div>
        <div className="mt-1 flex gap-1">
          <Button size="sm" variant="ghost" className="flex-1" onClick={openAccount}>Akun</Button>
          <Button size="sm" variant="ghost" className="flex-1" onClick={signOut}>Keluar</Button>
        </div>
      </div>
      <Modal open={creating} onClose={() => setCreating(false)} title="Workspace baru">
        <WorkspaceForm mode="create" onDone={async (id) => { setCreating(false); await refresh(); switchWs(id); nav('/app'); toast('Workspace dibuat') }} />
      </Modal>
    </aside>
  )
}

export default function Shell() {
  const { me, ws, loading, error, refresh } = useWs()
  const [mobile, setMobile] = useState(false)
  if (loading) return <div className="flex min-h-screen items-center justify-center gap-3 text-slate-400"><Spinner /> Menyiapkan workspace…</div>
  if (error) return <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6"><ErrorBox error={error} /><Button onClick={refresh}>Coba lagi</Button></div>
  if (me && me.workspaces.length === 0) return <Onboarding />
  if (!ws) return <div className="flex min-h-screen items-center justify-center gap-3 text-slate-400"><Spinner /></div>
  return (
    <div className="flex min-h-screen">
      <div className="sticky top-0 hidden h-screen lg:block"><Sidebar /></div>
      {mobile && <div className="fixed inset-0 z-40 flex lg:hidden"><div className="h-full"><Sidebar onNavigate={() => setMobile(false)} /></div><div className="flex-1 bg-black/60" onClick={() => setMobile(false)} /></div>}
      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-700 bg-ink-950/90 px-4 backdrop-blur lg:hidden">
          <button aria-label="Open menu" onClick={() => setMobile(true)} className="rounded p-1 text-slate-300">☰</button><Logo />
        </div>
        {!ws.active && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-sm text-amber-200">Langganan workspace ini <b>{ws.subscription.status}</b>. Run baru dinonaktifkan. <NavLink to="/app/billing" className="underline">Upgrade paket →</NavLink></div>
        )}
        <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
          <Routes>
            <Route index element={<CommandCenter />} />
            <Route path="runs" element={<RunsPage />} />
            <Route path="runs/:id" element={<RunDetail />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/:id" element={<ReportDetail />} />
            <Route path="evidence" element={<EvidencePage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="services" element={<ServicesAppPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin/*" element={me?.user.role === 'admin' ? <AdminPage /> : <Navigate to="/app" replace />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
