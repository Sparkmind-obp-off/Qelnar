import { useCallback, useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { useApi } from '../../lib/api'
import { dt, idr } from '../../lib/format'
import { Badge, Button, Card, ErrorBox, Field, Modal, PageHeader, Spinner, Stat, cx, inputCls, toast } from '../../components/ui'

/** Admin Console UI. NOTE: the real gate is server-side (requireAdmin on /api/v1/admin/*). */
export function AdminPage() {
  const tabs = [['', 'Overview'], ['billing', 'Billing'], ['services', 'Services'], ['plans', 'Pricing'], ['providers', 'Providers & Cost'], ['users', 'Users'], ['audit', 'Audit']]
  return (
    <>
      <PageHeader title="Admin Console" subtitle="Server-side role authorization. Semua aksi dicatat di audit log." />
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-ink-700 pb-2" aria-label="Admin">
        {tabs.map(([p, l]) => <NavLink key={p} end to={`/app/admin${p ? '/' + p : ''}`} className={({ isActive }) => cx('rounded-lg px-3 py-1.5 text-sm', isActive ? 'bg-rose-500/15 text-white' : 'text-slate-400 hover:text-white')}>{l}</NavLink>)}
      </nav>
      <Routes>
        <Route index element={<Overview />} />
        <Route path="billing" element={<BillingAdmin />} />
        <Route path="services" element={<ServicesAdmin />} />
        <Route path="plans" element={<PlansAdmin />} />
        <Route path="providers" element={<ProvidersAdmin />} />
        <Route path="users" element={<UsersAdmin />} />
        <Route path="audit" element={<AuditAdmin />} />
      </Routes>
    </>
  )
}

function useLoad<T>(path: string) {
  const api = useApi()
  const [data, setData] = useState<T | null>(null)
  const [err, setErr] = useState<unknown>(null)
  const load = useCallback(() => { api<T>(path, { ws: null }).then(setData).catch(setErr) }, [api, path])
  useEffect(load, [load])
  return { data, err, load, api }
}

function Overview() {
  const { data, err } = useLoad<any>('/admin/overview')
  if (err) return <ErrorBox error={err} />
  if (!data) return <Spinner />
  const e = data.economics
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Users" value={data.counts.users} /><Stat label="Workspaces" value={data.counts.workspaces} /><Stat label="Runs (bln)" value={data.counts.runs_month} hint={`${data.counts.runs_completed} selesai`} />
        <Stat label="Billing pending" value={data.counts.pending_billing} /><Stat label="Service aktif" value={data.counts.open_services} /><Stat label="Gross margin" value={e.gross_margin_pct == null ? '—' : `${e.gross_margin_pct}%`} />
      </div>
      <h2 className="mb-3 mt-8 font-semibold text-white">Unit economics (bulan berjalan)</h2>
      <Card className="overflow-x-auto"><table className="w-full text-sm"><tbody className="divide-y divide-ink-700">
        {[['Subscription revenue (MRR aktif)', e.subscription_revenue_idr], ['Service revenue (paid)', e.service_revenue_idr], ['Total revenue', e.total_revenue_idr], ['Provider cost (AI, search, extraction)', -e.provider_cost_idr], ['Infrastructure', -e.infra_cost_idr], ['Payment processing (est.)', -e.payment_cost_idr], ['Gross margin', e.gross_margin_idr], ['Human delivery time', -e.human_delivery_cost_idr], ['Contribution margin', e.contribution_margin_idr]].map(([l, v]) => (
          <tr key={l as string}><td className="p-3 text-slate-400">{l}</td><td className={cx('p-3 text-right font-mono', (v as number) < 0 ? 'text-rose-300' : 'text-white')}>{idr(Math.round(v as number))}</td></tr>
        ))}
        <tr><td className="p-3 text-slate-400">CAC</td><td className="p-3 text-right text-xs text-slate-500">{e.note}</td></tr>
      </tbody></table></Card>
      <p className="mt-2 text-xs text-slate-500">Kurs USD/IDR {e.usd_idr_rate}. Biaya provider dari usage ledger (estimasi per operasi).</p>
      <h2 className="mb-3 mt-8 font-semibold text-white">Biaya provider</h2>
      <div className="grid gap-2 md:grid-cols-3">{data.providerCost.map((p: any) => <Card key={p.provider} className="p-3 text-sm"><p className="text-slate-400">{p.provider}</p><p className="font-mono text-white">${(p.usd / 1e6).toFixed(4)} · {p.calls} calls</p></Card>)}</div>
    </>
  )
}

function BillingAdmin() {
  const { data, err, load, api } = useLoad<{ requests: any[] }>('/admin/billing-requests')
  const [sel, setSel] = useState<any>(null)
  const [months, setMonths] = useState(1)
  const [price, setPrice] = useState<string>('')
  const decide = async (decision: 'activated' | 'rejected') => {
    try { await api(`/admin/billing-requests/${sel.id}/decide`, { ws: null, body: { decision, months, price_idr: price ? Number(price) : undefined } }); toast(decision === 'activated' ? 'Paket diaktifkan' : 'Ditolak'); setSel(null); load() } catch (e) { toast((e as Error).message, 'err') }
  }
  if (err) return <ErrorBox error={err} />
  if (!data) return <Spinner />
  return (
    <>
      <p className="mb-3 text-sm text-slate-400">Payment provider belum live — aktivasi manual setelah pembayaran terkonfirmasi. Harga dikunci di subscription.</p>
      <Card className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
        <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Workspace</th><th className="p-3">Perubahan</th><th className="p-3">Nominal</th><th className="p-3">Status</th><th className="p-3">Waktu</th><th /></tr></thead>
        <tbody className="divide-y divide-ink-700">{data.requests.map((r) => (
          <tr key={r.id}><td className="p-3"><p className="text-white">{r.workspace_name}</p><p className="text-xs text-slate-500">{r.email}</p>{r.note && <p className="text-xs text-sky-300">“{r.note}”</p>}</td><td className="p-3">{r.from_plan} → <b className="text-white">{r.to_plan}</b></td><td className="p-3 font-mono">{idr(r.amount_idr)}</td><td className="p-3"><Badge>{r.status}</Badge></td><td className="p-3 text-slate-400">{dt(r.created_at)}</td>
            <td className="p-3">{r.status === 'pending' && <Button size="sm" onClick={() => { setSel(r); setPrice(r.amount_idr ?? ''); setMonths(1) }}>Proses</Button>}</td></tr>
        ))}</tbody></table></Card>
      <Modal open={!!sel} onClose={() => setSel(null)} title="Proses permintaan paket">
        {sel && <div className="space-y-4">
          <p className="text-sm text-slate-300">{sel.workspace_name}: {sel.from_plan} → <b>{sel.to_plan}</b></p>
          <Field label="Durasi (bulan)"><input type="number" min={1} max={12} className={inputCls} value={months} onChange={(e) => setMonths(Number(e.target.value))} /></Field>
          <Field label="Harga terkunci (IDR/bulan)" hint="Wajib untuk Business (custom)."><input type="number" min={0} className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
          <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => decide('rejected')}>Tolak</Button><Button className="flex-1" onClick={() => decide('activated')}>Konfirmasi bayar & aktifkan</Button></div>
        </div>}
      </Modal>
    </>
  )
}

function ServicesAdmin() {
  const { data, err, load, api } = useLoad<{ packages: any[]; requests: any[] }>('/admin/services')
  const [sel, setSel] = useState<any>(null)
  const [f, setF] = useState<any>({})
  const open = (r: any) => { setSel(r); setF({ status: r.status, quoted_idr: r.quoted_idr ?? 0, scope_note: r.scope_note ?? '', hours_spent: r.hours_spent ?? 0, paid: !!r.paid, due_date: r.due_date ?? '', delivery_markdown: '' }) }
  const save = async () => {
    try { await api(`/admin/service-requests/${sel.id}`, { ws: null, method: 'PATCH', body: { ...f, quoted_idr: Number(f.quoted_idr), hours_spent: Number(f.hours_spent), delivery_markdown: f.delivery_markdown || undefined, due_date: f.due_date || undefined } }); toast('Tersimpan'); setSel(null); load() } catch (e) { toast((e as Error).message, 'err') }
  }
  if (err) return <ErrorBox error={err} />
  if (!data) return <Spinner />
  return (
    <>
      <Card className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm">
        <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Paket</th><th className="p-3">Klien</th><th className="p-3">Status</th><th className="p-3">Quote</th><th className="p-3">Jam</th><th className="p-3">Paid</th><th /></tr></thead>
        <tbody className="divide-y divide-ink-700">{data.requests.length === 0 && <tr><td className="p-4 text-slate-500" colSpan={7}>Belum ada permintaan.</td></tr>}{data.requests.map((r) => (
          <tr key={r.id}><td className="p-3 text-white">{r.package_name}<p className="line-clamp-1 max-w-xs text-xs text-slate-500">{r.brief}</p></td><td className="p-3"><p>{r.workspace_name}</p><p className="text-xs text-slate-500">{r.contact || r.email}</p></td><td className="p-3"><Badge>{r.status}</Badge></td><td className="p-3 font-mono">{idr(r.quoted_idr)}</td><td className="p-3 font-mono">{r.hours_spent}</td><td className="p-3">{r.paid ? '✓' : '—'}</td><td className="p-3"><Button size="sm" variant="outline" onClick={() => open(r)}>Kelola</Button></td></tr>
        ))}</tbody></table></Card>
      <h2 className="mb-3 mt-8 font-semibold text-white">Paket layanan</h2>
      <div className="grid gap-2 md:grid-cols-2">{data.packages.map((p) => <Card key={p.id} className="p-3 text-sm"><p className="font-semibold text-white">{p.name}</p><p className="text-xs text-slate-400">{idr(p.price_idr_min)}{p.price_idr_max ? `–${idr(p.price_idr_max)}` : ''} · {p.timeline_days} hari · est. {p.est_hours} jam</p></Card>)}</div>
      <Modal open={!!sel} onClose={() => setSel(null)} title="Kelola permintaan layanan" wide>
        {sel && <div className="grid gap-4 md:grid-cols-2">
          <p className="rounded-lg bg-ink-900 p-3 text-sm text-slate-300 md:col-span-2">{sel.brief}</p>
          <Field label="Status"><select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{['requested', 'scoped', 'quoted', 'in_progress', 'delivered', 'closed', 'cancelled'].map((s) => <option key={s}>{s}</option>)}</select></Field>
          <Field label="Quote final (IDR)"><input type="number" className={inputCls} value={f.quoted_idr} onChange={(e) => setF({ ...f, quoted_idr: e.target.value })} /></Field>
          <Field label="Jam kerja aktual"><input type="number" step="0.5" className={inputCls} value={f.hours_spent} onChange={(e) => setF({ ...f, hours_spent: e.target.value })} /></Field>
          <Field label="Target selesai"><input type="date" className={inputCls} value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={f.paid} onChange={(e) => setF({ ...f, paid: e.target.checked })} className="accent-brand-500" /> Pembayaran diterima</label>
          <div className="md:col-span-2"><Field label="Catatan scope (terlihat klien)"><textarea rows={2} className={inputCls} value={f.scope_note} onChange={(e) => setF({ ...f, scope_note: e.target.value })} /></Field></div>
          <div className="md:col-span-2"><Field label="Deliverable (Markdown) — dikirim sebagai laporan ke workspace klien" hint={sel.delivery_report_id ? 'Mengisi akan memperbarui laporan delivery yang sudah ada.' : undefined}><textarea rows={6} className={cx(inputCls, 'font-mono text-xs')} value={f.delivery_markdown} onChange={(e) => setF({ ...f, delivery_markdown: e.target.value })} /></Field></div>
          <Button className="md:col-span-2" onClick={save}>Simpan</Button>
        </div>}
      </Modal>
    </>
  )
}

function PlansAdmin() {
  const { data, err, load, api } = useLoad<{ plans: any[] }>('/admin/plans')
  const [sel, setSel] = useState<any>(null)
  const [json, setJson] = useState('')
  const [e2, setE2] = useState<unknown>(null)
  const save = async () => {
    setE2(null)
    try { const body = JSON.parse(json); const r = await api<{ note: string }>(`/admin/plans/${sel.id}`, { ws: null, method: 'PUT', body }); toast(r.note); setSel(null); load() } catch (e) { setE2(e) }
  }
  if (err) return <ErrorBox error={err} />
  if (!data) return <Spinner />
  return (
    <>
      <p className="mb-3 text-sm text-slate-400">Harga & entitlement dapat dikonfigurasi. Perubahan harga hanya berlaku untuk aktivasi baru — subscription aktif tetap memakai harga terkunci.</p>
      <div className="grid gap-3 md:grid-cols-3">{data.plans.map((p) => (
        <Card key={p.id} className="p-4"><div className="flex items-center justify-between"><p className="font-semibold text-white">{p.name}</p>{!p.active && <Badge tone="cancelled">inactive</Badge>}</div><p className="font-mono text-sm text-slate-300">{idr(p.price_idr)}</p>
          <p className="mt-2 text-xs text-slate-500">{p.entitlements.runs_per_month} run · {p.entitlements.credits_per_month} kredit · {p.entitlements.max_workspaces} ws · {p.entitlements.max_members} anggota</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => { setSel(p); setJson(JSON.stringify({ name: p.name, price_idr: p.price_idr, tagline: p.tagline, entitlements: p.entitlements, features: p.features, active: !!p.active }, null, 2)) }}>Edit</Button></Card>
      ))}</div>
      <Modal open={!!sel} onClose={() => setSel(null)} title={`Edit paket ${sel?.id}`} wide>
        <textarea rows={18} className={cx(inputCls, 'font-mono text-xs')} value={json} onChange={(e) => setJson(e.target.value)} aria-label="Plan JSON" />
        <div className="mt-3"><ErrorBox error={e2} /></div>
        <Button className="mt-3 w-full" onClick={save}>Simpan (validasi server)</Button>
      </Modal>
    </>
  )
}

function ProvidersAdmin() {
  const { data, err, load, api } = useLoad<{ providers: any[]; settings: Record<string, string> }>('/admin/providers')
  const [s, setS] = useState<any>(null)
  useEffect(() => { if (data) setS({ usd_idr_rate: Number(data.settings.usd_idr_rate), payment_processing_pct: Number(data.settings.payment_processing_pct), infra_monthly_usd: Number(data.settings.infra_monthly_usd), service_hourly_cost_idr: Number(data.settings.service_hourly_cost_idr) }) }, [data])
  const update = async (p: any, enabled: boolean, cap: number) => { try { await api(`/admin/providers/${p.id}`, { ws: null, method: 'PUT', body: { enabled, monthly_cap_usd: cap } }); toast('Provider diperbarui'); load() } catch (e) { toast((e as Error).message, 'err') } }
  const saveS = async () => { try { await api('/admin/settings', { ws: null, method: 'PUT', body: s }); toast('Pengaturan biaya tersimpan') } catch (e) { toast((e as Error).message, 'err') } }
  if (err) return <ErrorBox error={err} />
  if (!data || !s) return <Spinner />
  return (
    <>
      <div className="space-y-3">{data.providers.map((p) => (
        <Card key={p.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="font-semibold text-white">{p.label}</p><Badge tone={p.configured ? 'active' : 'cancelled'}>{p.configured ? 'key set' : 'no key'}</Badge><Badge tone={p.enabled ? 'active' : 'cancelled'}>{p.enabled ? 'enabled' : 'disabled'}</Badge></div><p className="mt-1 text-xs text-slate-500">{p.note}</p></div>
          <div className="text-right text-xs text-slate-400"><p className="font-mono text-white">${(p.spentUsdMicros / 1e6).toFixed(4)} / ${(p.capUsdMicros / 1e6).toFixed(2)}</p><p>{p.calls} calls bulan ini</p></div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { const v = prompt('Hard cap bulanan (USD)', String(p.capUsdMicros / 1e6)); if (v !== null) update(p, p.enabled, Number(v)) }}>Cap</Button>
            <Button size="sm" variant={p.enabled ? 'subtle' : 'primary'} onClick={() => update(p, !p.enabled, p.capUsdMicros / 1e6)}>{p.enabled ? 'Nonaktifkan' : 'Aktifkan'}</Button>
          </div>
        </Card>
      ))}</div>
      <h2 className="mb-3 mt-8 font-semibold text-white">Asumsi biaya (unit economics)</h2>
      <Card className="grid gap-4 p-5 md:grid-cols-4">
        <Field label="Kurs USD/IDR"><input type="number" className={inputCls} value={s.usd_idr_rate} onChange={(e) => setS({ ...s, usd_idr_rate: Number(e.target.value) })} /></Field>
        <Field label="Payment fee (%)"><input type="number" step="0.1" className={inputCls} value={s.payment_processing_pct} onChange={(e) => setS({ ...s, payment_processing_pct: Number(e.target.value) })} /></Field>
        <Field label="Infra / bulan (USD)"><input type="number" className={inputCls} value={s.infra_monthly_usd} onChange={(e) => setS({ ...s, infra_monthly_usd: Number(e.target.value) })} /></Field>
        <Field label="Biaya jam layanan (IDR)"><input type="number" className={inputCls} value={s.service_hourly_cost_idr} onChange={(e) => setS({ ...s, service_hourly_cost_idr: Number(e.target.value) })} /></Field>
        <Button className="md:col-span-4" onClick={saveS}>Simpan asumsi</Button>
      </Card>
    </>
  )
}

function UsersAdmin() {
  const { data, err, load, api } = useLoad<{ users: any[] }>('/admin/users')
  const act = async (id: string, body: any) => { try { await api(`/admin/users/${id}`, { ws: null, method: 'PATCH', body }); toast('Diperbarui'); load() } catch (e) { toast((e as Error).message, 'err') } }
  if (err) return <ErrorBox error={err} />
  if (!data) return <Spinner />
  return (
    <Card className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
      <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">WS</th><th className="p-3">Daftar</th><th /></tr></thead>
      <tbody className="divide-y divide-ink-700">{data.users.map((u) => (
        <tr key={u.id}><td className="p-3"><p className="text-white">{u.name ?? '—'}</p><p className="text-xs text-slate-500">{u.email}</p></td><td className="p-3"><Badge tone={u.role === 'admin' ? 'failed' : 'planned'}>{u.role}</Badge></td><td className="p-3"><Badge tone={u.status === 'active' ? 'active' : 'blocked'}>{u.status}</Badge></td><td className="p-3 font-mono">{u.workspaces}</td><td className="p-3 text-slate-400">{dt(u.created_at)}</td>
          <td className="p-3 text-right"><Button size="sm" variant="ghost" onClick={() => act(u.id, { status: u.status === 'active' ? 'suspended' : 'active' })}>{u.status === 'active' ? 'Suspend' : 'Aktifkan'}</Button></td></tr>
      ))}</tbody></table></Card>
  )
}

function AuditAdmin() {
  const { data, err } = useLoad<{ audit: any[] }>('/admin/audit')
  if (err) return <ErrorBox error={err} />
  if (!data) return <Spinner />
  return <Card className="max-h-[70vh] overflow-y-auto p-3 text-xs">{data.audit.map((a) => <div key={a.id} className="flex gap-3 border-b border-ink-700 py-2"><span className="w-36 shrink-0 text-slate-500">{dt(a.created_at)}</span><span className="w-48 shrink-0 font-mono text-brand-400">{a.action}</span><span className="w-48 shrink-0 truncate text-slate-400">{a.email ?? '—'}</span><span className="truncate text-slate-500">{a.target} {a.detail}</span></div>)}</Card>
}
