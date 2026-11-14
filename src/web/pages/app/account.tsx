import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi, publicGet } from '../../lib/api'
import { useWs } from '../../lib/workspace'
import { useAppAuth } from '../../lib/auth'
import { dt, idr } from '../../lib/format'
import { Badge, Button, Card, Empty, ErrorBox, Field, Meter, Modal, PageHeader, Spinner, cx, inputCls, toast } from '../../components/ui'
import { PlanCard, ServiceCard, type PublicPlan, type PublicService } from '../public'

export function BillingPage() {
  const api = useApi()
  const { ws, refreshWs } = useWs()
  const [billing, setBilling] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [confirm, setConfirm] = useState<PublicPlan | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => {
    api('/billing').then(setBilling).catch(() => undefined)
    api('/workspace/usage').then(setUsage).catch(() => undefined)
  }, [api])
  useEffect(() => { load(); publicGet<{ plans: PublicPlan[] }>('/api/public/plans').then((r) => setPlans(r.plans)) }, [load, ws?.workspace.id])
  const request = async () => {
    if (!confirm) return
    setBusy(true)
    try { await api('/billing/change', { body: { toPlan: confirm.id, note: note || undefined } }); toast('Permintaan perubahan paket terkirim'); setConfirm(null); setNote(''); load(); refreshWs() } catch (e) { toast((e as Error).message, 'err') } finally { setBusy(false) }
  }
  const cancelReq = async (id: string) => { try { await api(`/billing/requests/${id}/cancel`, { body: {} }); load() } catch (e) { toast((e as Error).message, 'err') } }
  if (!billing || !usage || !ws) return <Spinner />
  const pending = billing.requests.find((r: any) => r.status === 'pending')
  return (
    <>
      <PageHeader title="Usage & Billing" subtitle="Batas penggunaan ditegakkan di server. Semua operasi provider tercatat di ledger." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <p className="text-xs uppercase text-slate-500">Paket saat ini</p>
          <p className="mt-1 text-2xl font-bold text-white">{billing.plan.name}</p>
          <div className="mt-2 flex items-center gap-2"><Badge>{billing.subscription.status}</Badge><span className="text-xs text-slate-400">s/d {dt(billing.subscription.period_end)}</span></div>
          <p className="mt-3 text-sm text-slate-400">Harga terkunci: <b className="text-white">{idr(billing.subscription.price_idr_locked)}</b>/bln</p>
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">{billing.paymentProvider.note}</p>
        </Card>
        <Card className="space-y-4 p-5 lg:col-span-2">
          <p className="text-xs uppercase text-slate-500">Penggunaan bulan ini (sejak {dt(usage.usage.since)})</p>
          <Meter label="Intelligence run" used={usage.usage.runs} total={usage.entitlements.runs_per_month} />
          <Meter label="Kredit riset" used={usage.usage.credits} total={usage.entitlements.credits_per_month} />
          {usage.usage.reservedCredits > 0 && <p className="text-xs text-slate-500">{usage.usage.reservedCredits} kredit direservasi oleh run yang sedang berjalan.</p>}
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            {usage.byProvider.map((p: any) => <div key={p.provider + p.operation} className="flex justify-between rounded-lg bg-ink-900 px-3 py-2"><span className="text-slate-400">{p.provider} · {p.operation} ×{p.calls}</span><span className="font-mono text-white">{p.credits} kr</span></div>)}
          </div>
        </Card>
      </div>

      {pending && (
        <Card className="mt-4 flex flex-col gap-2 border-sky-500/30 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-sky-200">Permintaan upgrade ke <b>{pending.to_plan}</b> ({idr(pending.amount_idr)}/bln) menunggu konfirmasi pembayaran oleh tim QELNAR. Kami akan menghubungi {ws.role === 'owner' ? 'Anda' : 'owner'} via email.</p>
          {ws.role === 'owner' && <Button size="sm" variant="outline" onClick={() => cancelReq(pending.id)}>Batalkan permintaan</Button>}
        </Card>
      )}

      <h2 className="mb-3 mt-8 font-semibold text-white">Ubah paket</h2>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {plans.map((p) => {
          const current = p.id === billing.plan.id
          return (
            <PlanCard key={p.id} plan={p} current={current} action={
              <Button className="mt-5 w-full" size="sm" variant={current ? 'subtle' : 'outline'} disabled={current || p.id === 'trial' || ws.role !== 'owner' || !!pending} onClick={() => setConfirm(p)}>
                {current ? 'Paket aktif' : p.id === 'trial' ? '—' : p.price_idr === null ? 'Ajukan penawaran' : 'Ajukan paket ini'}
              </Button>
            } />
          )
        })}
      </div>
      {ws.role !== 'owner' && <p className="mt-2 text-xs text-slate-500">Hanya owner workspace yang dapat mengubah paket.</p>}

      <h2 className="mb-3 mt-8 font-semibold text-white">Ledger terbaru</h2>
      {usage.recent.length === 0 ? <p className="text-sm text-slate-500">Belum ada penggunaan.</p> : (
        <Card className="overflow-x-auto"><table className="w-full min-w-[520px] text-xs"><thead className="text-left uppercase text-slate-500"><tr><th className="p-2.5">Waktu</th><th className="p-2.5">Provider</th><th className="p-2.5">Operasi</th><th className="p-2.5">Kredit</th><th className="p-2.5">Run</th></tr></thead>
          <tbody className="divide-y divide-ink-700">{usage.recent.map((l: any, i: number) => <tr key={i}><td className="p-2.5 text-slate-400">{dt(l.created_at)}</td><td className="p-2.5">{l.provider}</td><td className="p-2.5">{l.operation}</td><td className="p-2.5 font-mono">{l.credits}</td><td className="p-2.5">{l.run_id && <Link className="font-mono text-brand-400" to={`/app/runs/${l.run_id}`}>{l.run_id.slice(0, 12)}…</Link>}</td></tr>)}</tbody></table></Card>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)} title={`Ajukan paket ${confirm?.name}`}>
        <p className="text-sm text-slate-300">Harga: <b className="text-white">{idr(confirm?.price_idr)}</b>{confirm?.price_idr ? '/bulan' : ''}. Paket akan diaktifkan oleh tim QELNAR setelah pembayaran dikonfirmasi. Harga dikunci saat aktivasi.</p>
        <div className="mt-4"><Field label="Catatan untuk tim (opsional)"><textarea rows={3} maxLength={500} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. nomor WhatsApp atau preferensi metode pembayaran" /></Field></div>
        <Button className="mt-4 w-full" onClick={request} loading={busy}>Kirim permintaan</Button>
      </Modal>
    </>
  )
}

export function ServicesAppPage() {
  const api = useApi()
  const { ws } = useWs()
  const [services, setServices] = useState<PublicService[]>([])
  const [requests, setRequests] = useState<any[] | null>(null)
  const [sel, setSel] = useState<PublicService | null>(null)
  const [brief, setBrief] = useState('')
  const [contact, setContact] = useState('')
  const [err, setErr] = useState<unknown>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(() => { api<{ requests: any[] }>('/service-requests').then((r) => setRequests(r.requests)).catch(() => setRequests([])) }, [api])
  useEffect(() => { load(); publicGet<{ services: PublicService[] }>('/api/public/services').then((r) => setServices(r.services)) }, [load, ws?.workspace.id])
  const submit = async () => {
    if (!sel) return
    setBusy(true); setErr(null)
    try { await api('/service-requests', { body: { packageId: sel.id, brief, contact: contact || undefined } }); toast('Permintaan layanan terkirim'); setSel(null); setBrief(''); load() } catch (e) { setErr(e) } finally { setBusy(false) }
  }
  const cancel = async (id: string) => { try { await api(`/service-requests/${id}/cancel`, { body: {} }); load() } catch (e) { toast((e as Error).message, 'err') } }
  return (
    <>
      <PageHeader title="Professional Services" subtitle="Creator Intelligence as a Service — dikerjakan tim QELNAR dengan scope dan deliverable tertulis." />
      <h2 className="mb-3 font-semibold text-white">Permintaan Anda</h2>
      {!requests ? <Spinner /> : requests.length === 0 ? <p className="mb-6 text-sm text-slate-500">Belum ada permintaan layanan.</p> : (
        <div className="mb-8 space-y-2">
          {requests.map((r) => (
            <Card key={r.id} className="flex flex-col gap-2 p-4 md:flex-row md:items-center">
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Badge>{r.status}</Badge><span className="font-semibold text-white">{r.package_name}</span></div><p className="mt-1 line-clamp-1 text-sm text-slate-400">{r.brief}</p>{r.scope_note && <p className="mt-1 text-xs text-sky-300">Scope: {r.scope_note}</p>}</div>
              <div className="text-right text-xs text-slate-400"><p>{idr(r.quoted_idr)}</p><p>{r.due_date ? `Target ${r.due_date}` : dt(r.created_at)}</p></div>
              <div className="flex gap-2">
                {r.delivery_report_id && <Link to={`/app/reports/${r.delivery_report_id}`}><Button size="sm">Lihat deliverable</Button></Link>}
                {['requested', 'scoped', 'quoted'].includes(r.status) && <Button size="sm" variant="ghost" onClick={() => cancel(r.id)}>Batalkan</Button>}
              </div>
            </Card>
          ))}
        </div>
      )}
      <h2 className="mb-3 font-semibold text-white">Katalog layanan</h2>
      <div className="grid gap-5 md:grid-cols-2">
        {services.map((s) => <ServiceCard key={s.id} s={s} action={<Button className="mt-5 w-full" variant="outline" disabled={ws?.role === 'viewer'} onClick={() => setSel(s)}>Ajukan permintaan</Button>} />)}
      </div>
      <Modal open={!!sel} onClose={() => setSel(null)} title={sel?.name ?? ''}>
        <p className="text-sm text-slate-400">Mulai dari {idr(sel?.price_idr_min)} · {sel?.timeline_days} hari. Tim akan meninjau brief, mengonfirmasi scope dan penawaran final sebelum pekerjaan dimulai.</p>
        <div className="mt-4 space-y-4">
          <Field label="Brief" hint="Akun/kanal, target audiens, kompetitor yang ingin dianalisis, dan hasil yang diharapkan."><textarea rows={5} maxLength={3000} className={inputCls} value={brief} onChange={(e) => setBrief(e.target.value)} /></Field>
          <Field label="Kontak (opsional)" hint="Default: email akun Anda."><input className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} /></Field>
          <ErrorBox error={err} />
          <Button className="w-full" onClick={submit} loading={busy} disabled={brief.trim().length < 20}>Kirim permintaan</Button>
        </div>
      </Modal>
    </>
  )
}

export function TeamPage() {
  const api = useApi()
  const { ws, me } = useWs()
  const [data, setData] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [err, setErr] = useState<unknown>(null)
  const load = useCallback(() => { api('/workspace/members').then(setData).catch(setErr) }, [api])
  useEffect(load, [load, ws?.workspace.id])
  const invite = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(null)
    try { await api('/workspace/invites', { body: { email, role } }); setEmail(''); toast('Undangan dibuat — berlaku saat pengguna masuk dengan Google memakai email ini'); load() } catch (e) { setErr(e) }
  }
  const act = async (fn: () => Promise<unknown>) => { try { await fn(); load() } catch (e) { toast((e as Error).message, 'err') } }
  if (!data || !ws) return <Spinner />
  const isAdmin = ['owner', 'admin'].includes(ws.role)
  return (
    <>
      <PageHeader title="Team" subtitle={`Role-based access: owner · admin · member · viewer. Batas paket: ${ws.entitlements.max_members} anggota.`} />
      {!ws.entitlements.team && <Card className="mb-4 border-brand-500/30 p-4 text-sm text-slate-300">Kolaborasi tim tersedia di paket <b>Studio</b> dan <b>Business</b>. <Link to="/app/billing" className="text-brand-400 underline">Upgrade →</Link></Card>}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Anggota</th><th className="p-3">Role</th><th className="p-3">Bergabung</th><th className="p-3" /></tr></thead>
          <tbody className="divide-y divide-ink-700">
            {data.members.map((m: any) => (
              <tr key={m.id}>
                <td className="p-3"><p className="font-medium text-white">{m.name ?? '—'}{m.id === me?.user.id && <span className="ml-1 text-xs text-slate-500">(Anda)</span>}</p><p className="text-xs text-slate-500">{m.email}</p></td>
                <td className="p-3">
                  {ws.role === 'owner' && m.role !== 'owner' ? (
                    <select aria-label="Role" className={cx(inputCls, 'w-32 py-1 text-xs')} value={m.role} onChange={(e) => act(() => api(`/workspace/members/${m.id}`, { method: 'PATCH', body: { role: e.target.value } }))}>
                      {['admin', 'member', 'viewer'].map((r) => <option key={r}>{r}</option>)}
                    </select>
                  ) : <Badge tone="planned">{m.role}</Badge>}
                </td>
                <td className="p-3 text-slate-400">{dt(m.created_at)}</td>
                <td className="p-3 text-right">{isAdmin && m.role !== 'owner' && m.id !== me?.user.id && <Button size="sm" variant="ghost" onClick={() => act(() => api(`/workspace/members/${m.id}`, { method: 'DELETE' }))}>Hapus</Button>}</td>
              </tr>
            ))}
            {data.invites.map((i: any) => (
              <tr key={i.id} className="opacity-70"><td className="p-3"><p className="text-slate-300">{i.email}</p><p className="text-xs text-slate-500">undangan tertunda</p></td><td className="p-3"><Badge tone="pending">{i.role}</Badge></td><td className="p-3 text-slate-400">{dt(i.created_at)}</td>
                <td className="p-3 text-right">{isAdmin && <Button size="sm" variant="ghost" onClick={() => act(() => api(`/workspace/invites/${i.id}`, { method: 'DELETE' }))}>Batalkan</Button>}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
      {isAdmin && (
        <form onSubmit={invite} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input type="email" required className={inputCls} placeholder="email@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email undangan" />
          <select aria-label="Role undangan" className={cx(inputCls, 'sm:w-36')} value={role} onChange={(e) => setRole(e.target.value)}>{['admin', 'member', 'viewer'].map((r) => <option key={r}>{r}</option>)}</select>
          <Button type="submit" disabled={!ws.entitlements.team}>Undang</Button>
        </form>
      )}
      <div className="mt-3"><ErrorBox error={err} /></div>
    </>
  )
}

export function SettingsPage() {
  const api = useApi()
  const { ws, refreshWs } = useWs()
  const { openAccount, signOut, user } = useAppAuth()
  const [form, setForm] = useState({ name: '', niche: '', goals: '' })
  const [learnings, setLearnings] = useState<any[]>([])
  const [audit, setAudit] = useState<any[] | null>(null)
  const [showAudit, setShowAudit] = useState(false)
  useEffect(() => { if (ws) setForm({ name: ws.workspace.name, niche: ws.workspace.niche ?? '', goals: ws.workspace.goals ?? '' }) }, [ws])
  const loadL = useCallback(() => { api<{ learnings: any[] }>('/workspace/learnings').then((r) => setLearnings(r.learnings)).catch(() => undefined) }, [api])
  useEffect(loadL, [loadL, ws?.workspace.id])
  const save = async () => { try { await api('/workspace', { method: 'PATCH', body: form }); toast('Tersimpan'); refreshWs() } catch (e) { toast((e as Error).message, 'err') } }
  const isAdmin = ws && ['owner', 'admin'].includes(ws.role)
  if (!ws) return <Spinner />
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h2 className="font-semibold text-white">Workspace</h2>
          <Field label="Nama"><input disabled={!isAdmin} className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Niche"><input disabled={!isAdmin} className={inputCls} value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} /></Field>
          <Field label="Tujuan"><textarea disabled={!isAdmin} rows={3} className={inputCls} value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} /></Field>
          {isAdmin && <Button onClick={save}>Simpan</Button>}
        </Card>
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold text-white">Akun</h2>
          <p className="text-sm text-slate-400">Masuk sebagai <b className="text-white">{user?.email}</b> via Google (Clerk Production).</p>
          <div className="flex gap-2"><Button variant="outline" onClick={openAccount}>Kelola akun</Button><Button variant="ghost" onClick={signOut}>Keluar</Button></div>
          <h3 className="pt-4 font-semibold text-white">Memori workspace (Learning Agent)</h3>
          <p className="text-xs text-slate-500">Insight terverifikasi dan feedback Anda dipakai sebagai konteks untuk run berikutnya.</p>
          {learnings.length === 0 ? <p className="text-sm text-slate-500">Belum ada memori.</p> : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {learnings.map((l) => (
                <li key={l.id} className="flex items-start gap-2 rounded-lg bg-ink-900 p-2.5 text-xs">
                  <Badge tone={l.kind === 'feedback' ? 'pending' : 'planned'}>{l.kind}</Badge><span className="flex-1 text-slate-300">{l.content}</span><span className="font-mono text-slate-500">w{Number(l.weight).toFixed(1)}</span>
                  {isAdmin && <button aria-label="Hapus memori" className="text-slate-500 hover:text-rose-300" onClick={async () => { await api(`/workspace/learnings/${l.id}`, { method: 'DELETE' }); loadL() }}>✕</button>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {isAdmin && (
        <Card className="mt-6 p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold text-white">Audit log workspace</h2><Button size="sm" variant="outline" onClick={() => { setShowAudit(true); api<{ audit: any[] }>('/workspace/audit').then((r) => setAudit(r.audit)) }}>Tampilkan</Button></div>
          {showAudit && (!audit ? <Spinner /> : audit.length === 0 ? <Empty title="Kosong" /> : (
            <div className="mt-3 max-h-96 overflow-y-auto text-xs">{audit.map((a, i) => <div key={i} className="flex gap-3 border-b border-ink-700 py-2"><span className="w-36 shrink-0 text-slate-500">{dt(a.created_at)}</span><span className="w-44 shrink-0 font-mono text-brand-400">{a.action}</span><span className="truncate text-slate-400">{a.email} {a.target}</span></div>)}</div>
          ))}
        </Card>
      )}
    </>
  )
}
