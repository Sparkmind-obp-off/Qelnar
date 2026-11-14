import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useApi } from '../../lib/api'
import { useWs } from '../../lib/workspace'
import { dt, host } from '../../lib/format'
import { Badge, Button, Card, Empty, ErrorBox, Field, LevelBadge, Markdown, Modal, PageHeader, Spinner, cx, inputCls, toast } from '../../components/ui'

export function ApprovalsPage() {
  const api = useApi()
  const { ws, refreshWs } = useWs()
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [rows, setRows] = useState<any[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const load = useCallback(() => { setRows(null); api<{ approvals: any[] }>(`/approvals?status=${tab}`).then((r) => setRows(r.approvals)).catch(() => setRows([])) }, [api, tab])
  useEffect(load, [load, ws?.workspace.id])
  const decide = async (id: string, decision: 'approved' | 'rejected') => {
    setBusy(id)
    try { await api(`/approvals/${id}/decide`, { body: { decision } }); toast(decision === 'approved' ? 'Disetujui' : 'Ditolak'); load(); refreshWs() } catch (e) { toast((e as Error).message, 'err') } finally { setBusy(null) }
  }
  return (
    <>
      <PageHeader title="Approval Center" subtitle="H1 pengumpulan data · H2 rencana/delegasi internal · H3 aksi eksternal spesifik. Tidak ada blanket approval." />
      <div className="mb-4 flex gap-1">{(['pending', 'approved', 'rejected'] as const).map((t) => <Button key={t} size="sm" variant={tab === t ? 'primary' : 'ghost'} onClick={() => setTab(t)}>{t}</Button>)}</div>
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty title={tab === 'pending' ? 'Tidak ada yang menunggu persetujuan' : 'Kosong'} icon="✓" /> : (
        <div className="space-y-3">
          {rows.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><LevelBadge level={a.level} /><Badge>{a.status}</Badge><span className="text-xs text-slate-500">{dt(a.created_at)} · {a.requester}</span></div>
                  <p className="mt-2 text-sm text-white">{a.summary}</p>
                  <Link to={`/app/runs/${a.run_id}`} className="mt-1 block truncate text-xs text-brand-400 hover:underline">Run: {a.objective}</Link>
                </div>
                {a.status === 'pending' && ws?.role !== 'viewer' && (
                  <div className="flex shrink-0 gap-2"><Button size="sm" variant="outline" onClick={() => decide(a.id, 'rejected')} loading={busy === a.id}>Tolak</Button><Button size="sm" onClick={() => decide(a.id, 'approved')} loading={busy === a.id}>Setujui</Button></div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}

export function ReportsPage() {
  const api = useApi()
  const { ws } = useWs()
  const [rows, setRows] = useState<any[] | null>(null)
  useEffect(() => { api<{ reports: any[] }>('/reports').then((r) => setRows(r.reports)).catch(() => setRows([])) }, [api, ws?.workspace.id])
  return (
    <>
      <PageHeader title="Reports" subtitle="Laporan intelijen bersitasi dan laporan delivery layanan." />
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty title="Belum ada laporan" icon="▤">Laporan dibuat otomatis setiap run selesai.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <Link key={r.id} to={`/app/reports/${r.id}`}>
              <Card className="h-full p-4 hover:border-brand-500/50">
                <div className="flex items-center gap-2"><Badge tone={r.kind === 'service_delivery' ? 'delivered' : 'planned'}>{r.kind === 'service_delivery' ? 'service' : 'intelligence'}</Badge>{r.feedback === 1 && <span className="text-xs text-emerald-300">👍 berguna</span>}{r.feedback === -1 && <span className="text-xs text-rose-300">👎</span>}<span className="ml-auto text-xs text-slate-500">{dt(r.created_at)}</span></div>
                <p className="mt-2 line-clamp-2 font-medium text-white">{r.title}</p>
                <p className="mt-1 font-mono text-[10px] text-slate-600">{r.generator}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

export function ReportDetail() {
  const { id } = useParams()
  const api = useApi()
  const { ws } = useWs()
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState<unknown>(null)
  const [fb, setFb] = useState<{ open: boolean; useful: boolean; note: string }>({ open: false, useful: true, note: '' })
  const load = useCallback(() => { api(`/reports/${id}`).then(setData).catch(setErr) }, [api, id])
  useEffect(load, [load])
  const exportMd = async () => {
    try {
      const r = await api<Response>(`/reports/${id}/export`, { raw: true })
      const blob = await r.blob()
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `qelnar-report-${id}.md`; a.click(); URL.revokeObjectURL(a.href)
    } catch (e) { toast((e as Error).message, 'err') }
  }
  const sendFeedback = async () => {
    try { await api(`/reports/${id}/feedback`, { body: { useful: fb.useful, note: fb.note || undefined } }); toast('Terima kasih — Learning Agent memperbarui memori workspace'); setFb({ ...fb, open: false }); load() } catch (e) { toast((e as Error).message, 'err') }
  }
  if (err) return <ErrorBox error={err} />
  if (!data) return <Spinner />
  const r = data.report
  return (
    <>
      <div className="mb-2 text-sm"><Link to="/app/reports" className="text-slate-400 hover:text-white">← Reports</Link></div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-500">{dt(r.created_at)} · {r.generator}</span>
        <div className="ml-auto flex gap-2">
          {r.run_id && <Link to={`/app/runs/${r.run_id}`}><Button size="sm" variant="outline">Lihat run & bukti</Button></Link>}
          {ws?.role !== 'viewer' && <Button size="sm" variant="outline" onClick={() => setFb({ open: true, useful: true, note: '' })}>Beri feedback</Button>}
          <Button size="sm" onClick={exportMd} disabled={!data.canExport} title={data.canExport ? '' : 'Tersedia di Creator Pro ke atas'}>Ekspor .md{!data.canExport && ' 🔒'}</Button>
        </div>
      </div>
      <Card className="p-6 md:p-10"><Markdown text={r.body_md} /></Card>
      <Modal open={fb.open} onClose={() => setFb({ ...fb, open: false })} title="Feedback laporan">
        <div className="flex gap-2"><Button variant={fb.useful ? 'primary' : 'outline'} onClick={() => setFb({ ...fb, useful: true })}>👍 Berguna</Button><Button variant={!fb.useful ? 'danger' : 'outline'} onClick={() => setFb({ ...fb, useful: false })}>👎 Kurang berguna</Button></div>
        <div className="mt-4"><Field label="Catatan (opsional)" hint="Disimpan sebagai preferensi workspace untuk run berikutnya."><textarea rows={3} maxLength={500} className={inputCls} value={fb.note} onChange={(e) => setFb({ ...fb, note: e.target.value })} /></Field></div>
        <Button className="mt-4 w-full" onClick={sendFeedback}>Kirim</Button>
      </Modal>
    </>
  )
}

export function EvidencePage() {
  const api = useApi()
  const { ws } = useWs()
  const [rows, setRows] = useState<any[] | null>(null)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<any>(null)
  useEffect(() => { api<{ evidence: any[] }>('/evidence').then((r) => setRows(r.evidence)).catch(() => setRows([])) }, [api, ws?.workspace.id])
  const open = async (id: string) => { try { setSel((await api<{ evidence: any }>(`/evidence/${id}`)).evidence) } catch (e) { toast((e as Error).message, 'err') } }
  const filtered = (rows ?? []).filter((e) => !q || `${e.title} ${e.source_url} ${e.snippet}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title="Research & Evidence" subtitle="Semua bukti dengan provenance: URL sumber, provider, waktu pengambilan, dan hash konten." actions={<input aria-label="Cari bukti" className={cx(inputCls, 'w-64')} placeholder="Cari bukti…" value={q} onChange={(e) => setQ(e.target.value)} />} />
      {!rows ? <Spinner /> : filtered.length === 0 ? <Empty title="Belum ada bukti" icon="❖" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((e) => (
            <Card key={e.id} className="cursor-pointer p-4 hover:border-brand-500/50" onClick={() => open(e.id)}>
              <div className="flex items-center gap-2 text-xs text-slate-500"><span className="rounded bg-ink-800 px-1.5">{e.provider}</span><span>{host(e.source_url)}</span><span className="ml-auto">{dt(e.retrieved_at)}</span></div>
              <p className="mt-2 line-clamp-1 font-medium text-white">{e.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-slate-400">{e.snippet}</p>
              <p className="mt-2 truncate text-xs text-slate-600">Run: {e.objective}</p>
            </Card>
          ))}
        </div>
      )}
      <Modal open={!!sel} onClose={() => setSel(null)} title="Detail bukti" wide>
        {sel && (
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-white">{sel.title}</p>
            <a href={sel.source_url} target="_blank" rel="noopener noreferrer nofollow" className="block break-all text-brand-400 underline">{sel.source_url}</a>
            <dl className="grid grid-cols-2 gap-2 text-xs text-slate-400"><div>Provider: <b className="text-slate-200">{sel.provider}</b></div><div>Diambil: <b className="text-slate-200">{dt(sel.retrieved_at)}</b></div><div className="col-span-2 break-all font-mono">sha256: {sel.content_hash}</div></dl>
            <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-950 p-3 text-xs text-slate-300">{sel.content || sel.snippet}</pre>
          </div>
        )}
      </Modal>
    </>
  )
}

export function ProjectsPage() {
  const api = useApi()
  const { ws } = useWs()
  const [rows, setRows] = useState<any[] | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [err, setErr] = useState<unknown>(null)
  const load = useCallback(() => { api<{ projects: any[] }>('/projects').then((r) => setRows(r.projects)).catch(() => setRows([])) }, [api])
  useEffect(load, [load, ws?.workspace.id])
  const create = async () => {
    setErr(null)
    try { await api('/projects', { body: { name, description: desc } }); setOpen(false); setName(''); setDesc(''); load(); toast('Proyek dibuat') } catch (e) { setErr(e) }
  }
  return (
    <>
      <PageHeader title="Intelligence Projects" subtitle="Kelompokkan run, laporan, dan task. Task dibuat Execution Agent setelah Anda menyetujui (H2)." actions={ws?.role !== 'viewer' && <Button onClick={() => setOpen(true)}>+ Proyek</Button>} />
      {!rows ? <Spinner /> : rows.length === 0 ? <Empty title="Belum ada proyek" icon="◫" /> : (
        <div className="grid gap-3 md:grid-cols-3">
          {rows.map((p) => (
            <Link key={p.id} to={`/app/projects/${p.id}`}>
              <Card className="h-full p-4 hover:border-brand-500/50">
                <p className="font-semibold text-white">{p.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-400">{p.description || '—'}</p>
                <p className="mt-3 text-xs text-slate-500">{p.runs} run · {p.done}/{p.tasks} task selesai</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title="Proyek baru">
        <div className="space-y-4">
          <Field label="Nama"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></Field>
          <Field label="Deskripsi"><textarea className={inputCls} rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={1000} /></Field>
          <ErrorBox error={err} />
          <Button className="w-full" onClick={create} disabled={name.trim().length < 2}>Buat proyek</Button>
        </div>
      </Modal>
    </>
  )
}

export function ProjectDetail() {
  const { id } = useParams()
  const api = useApi()
  const { ws } = useWs()
  const [data, setData] = useState<any>(null)
  const load = useCallback(() => { api(`/projects/${id}`).then(setData).catch(() => setData({ error: true })) }, [api, id])
  useEffect(load, [load])
  const setStatus = async (tid: string, status: string) => { try { await api(`/tasks/${tid}`, { method: 'PATCH', body: { status } }); load() } catch (e) { toast((e as Error).message, 'err') } }
  if (!data) return <Spinner />
  if (data.error) return <ErrorBox error="Proyek tidak ditemukan" />
  const cols = [['todo', 'To do'], ['doing', 'Dikerjakan'], ['done', 'Selesai']] as const
  return (
    <>
      <div className="mb-2 text-sm"><Link to="/app/projects" className="text-slate-400 hover:text-white">← Projects</Link></div>
      <PageHeader title={data.project.name} subtitle={data.project.description} />
      <div className="grid gap-4 md:grid-cols-3">
        {cols.map(([k, label]) => (
          <section key={k}>
            <h2 className="mb-2 text-sm font-semibold text-slate-300">{label} ({data.tasks.filter((t: any) => t.status === k).length})</h2>
            <div className="space-y-2">
              {data.tasks.filter((t: any) => t.status === k).map((t: any) => (
                <Card key={t.id} className="p-3">
                  <p className="text-sm font-medium text-white">{t.title}</p>
                  {t.detail && <p className="mt-1 text-xs text-slate-400">{t.detail}</p>}
                  {ws?.role !== 'viewer' && <div className="mt-2 flex gap-1">{cols.filter(([c]) => c !== k).map(([c, l]) => <button key={c} onClick={() => setStatus(t.id, c)} className="rounded border border-ink-600 px-2 py-0.5 text-[11px] text-slate-400 hover:text-white">→ {l}</button>)}</div>}
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section><h2 className="mb-2 font-semibold text-white">Run</h2>{data.runs.length ? data.runs.map((r: any) => <Link key={r.id} to={`/app/runs/${r.id}`} className="mb-2 flex items-center gap-2 rounded-lg border border-ink-700 p-3 text-sm hover:border-brand-500/50"><Badge>{r.status}</Badge><span className="truncate text-slate-200">{r.objective}</span></Link>) : <p className="text-sm text-slate-500">—</p>}</section>
        <section><h2 className="mb-2 font-semibold text-white">Laporan</h2>{data.reports.length ? data.reports.map((r: any) => <Link key={r.id} to={`/app/reports/${r.id}`} className="mb-2 block truncate rounded-lg border border-ink-700 p-3 text-sm text-slate-200 hover:border-brand-500/50">{r.title}</Link>) : <p className="text-sm text-slate-500">—</p>}</section>
      </div>
    </>
  )
}
