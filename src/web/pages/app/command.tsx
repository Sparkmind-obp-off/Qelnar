import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApi } from '../../lib/api'
import { useWs } from '../../lib/workspace'
import { ago, dt, host } from '../../lib/format'
import { Badge, Button, Card, Empty, ErrorBox, LevelBadge, Meter, PageHeader, Spinner, Stat, cx, inputCls, toast } from '../../components/ui'

const EXAMPLES = [
  'Riset tren dan perilaku audiens kreator kuliner rumahan di TikTok Indonesia',
  'Analisis kompetitor kreator edukasi finansial di YouTube Indonesia dan cari celah diferensiasi',
  'Cari peluang konten yang belum banyak digarap untuk niche parenting di Instagram',
  'Susun strategi pilar konten untuk kreator fitness pemula',
  'Buat rencana konten 30 hari untuk kreator review gadget',
]

interface PreviewStep { idx: number; agentLabel: string; toolLabel: string; title: string; level: string; estCredits: number; optional?: boolean; decision: { action: string; reason: string } }
interface Preview { intent: string; intentLabel: string; confidence: number; objective: string; budgetCredits: number; steps: PreviewStep[]; blocked: boolean; blockReason: string | null }

const ACTION_STYLE: Record<string, string> = { allow: 'text-emerald-300', require_approval: 'text-amber-300', skip: 'text-slate-500', deny: 'text-rose-300' }
const ACTION_LABEL: Record<string, string> = { allow: 'auto', require_approval: 'butuh persetujuan', skip: 'dilewati', deny: 'ditolak' }

export function CommandCenter() {
  const api = useApi()
  const nav = useNavigate()
  const { ws, refreshWs } = useWs()
  const [command, setCommand] = useState('')
  const [authorize, setAuthorize] = useState(true)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState<'preview' | 'run' | null>(null)
  const [err, setErr] = useState<unknown>(null)
  const [recent, setRecent] = useState<any[]>([])
  const canRun = ws && ws.role !== 'viewer' && ws.active

  useEffect(() => { api<{ runs: any[] }>('/runs').then((r) => setRecent(r.runs.slice(0, 6))).catch(() => undefined) }, [api, ws?.workspace.id])
  useEffect(() => { setPreview(null) }, [command, authorize])

  const doPreview = async () => {
    setBusy('preview'); setErr(null)
    try { setPreview((await api<{ preview: Preview }>('/command', { body: { command, authorizeResearch: authorize, dryRun: true } })).preview) } catch (e) { setErr(e) } finally { setBusy(null) }
  }
  const doRun = async () => {
    setBusy('run'); setErr(null)
    try {
      const r = await api<{ runId: string; status: string }>('/command', { body: { command, authorizeResearch: authorize } })
      toast(r.status === 'blocked' ? 'Run diblokir oleh policy engine' : 'Run dimulai', r.status === 'blocked' ? 'err' : 'ok')
      refreshWs()
      nav(`/app/runs/${r.runId}`)
    } catch (e) { setErr(e) } finally { setBusy(null) }
  }

  if (!ws) return null
  const left = ws.entitlements.credits_per_month - ws.usage.credits - ws.usage.reservedCredits
  return (
    <>
      <PageHeader title="Command Center" subtitle={<>Workspace <b className="text-slate-200">{ws.workspace.name}</b>{ws.workspace.niche ? <> · niche {ws.workspace.niche}</> : null}</>} />
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Run bulan ini" value={`${ws.usage.runs}/${ws.entitlements.runs_per_month}`} />
        <Stat label="Kredit tersisa" value={Math.max(0, left)} hint={`dari ${ws.entitlements.credits_per_month}`} />
        <Stat label="Laporan" value={ws.counts.reports} />
        <Stat label="Menunggu persetujuan" value={ws.counts.pending_approvals} hint={ws.counts.pending_approvals ? <Link to="/app/approvals" className="text-amber-300 underline">Tinjau →</Link> : undefined} />
      </div>

      <Card className="grad-border glow mt-6 p-5">
        <label htmlFor="command-input" className="mb-2 block text-sm font-semibold text-white">Apa tujuan Anda?</label>
        <textarea id="command-input" rows={3} maxLength={1200} value={command} onChange={(e) => setCommand(e.target.value)} disabled={!canRun}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && command.trim().length >= 8) (preview ? doRun() : doPreview()) }}
          className={cx(inputCls, 'resize-none text-base')} placeholder="mis. Analisis kompetitor kreator kuliner TikTok Indonesia dan cari celah konten untuk saya" />
        <div className="mt-3 flex flex-wrap gap-2">
          {EXAMPLES.map((x) => <button key={x} type="button" onClick={() => setCommand(x)} className="rounded-full border border-ink-600 px-3 py-1 text-xs text-slate-400 hover:border-brand-500/60 hover:text-white">{x.length > 60 ? x.slice(0, 58) + '…' : x}</button>)}
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-ink-700 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-start gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={authorize} onChange={(e) => setAuthorize(e.target.checked)} className="mt-0.5 accent-brand-500" />
            <span><b className="text-slate-200">Otorisasi H1:</b> izinkan agen mengumpulkan data dari sumber web publik (read-only) untuk command ini saja.</span>
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={doPreview} loading={busy === 'preview'} disabled={!canRun || command.trim().length < 8}>Lihat rencana</Button>
            <Button onClick={doRun} loading={busy === 'run'} disabled={!canRun || command.trim().length < 8}>Jalankan ⌘↵</Button>
          </div>
        </div>
        {!canRun && <p className="mt-3 text-xs text-amber-300">{ws.role === 'viewer' ? 'Peran viewer tidak dapat menjalankan command.' : 'Langganan tidak aktif — upgrade untuk menjalankan command.'}</p>}
        <div className="mt-3"><ErrorBox error={err} /></div>
      </Card>

      {preview && (
        <Card className="mt-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="text-xs uppercase tracking-wider text-slate-500">Rencana eksekusi</p><p className="font-semibold text-white">{preview.objective}</p></div>
            <div className="flex items-center gap-2 text-xs"><Badge tone="planned">{preview.intentLabel}</Badge><span className="text-slate-400">conf {Math.round(preview.confidence * 100)}%</span><span className="rounded bg-ink-800 px-2 py-1 font-mono text-slate-300">budget {preview.budgetCredits} kredit</span></div>
          </div>
          {preview.blocked && <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">⛔ Diblokir policy engine: {preview.blockReason}</div>}
          <ol className="mt-4 space-y-2">
            {preview.steps.map((s) => (
              <li key={s.idx} className="flex items-start gap-3 rounded-lg bg-ink-900/60 px-3 py-2 text-sm">
                <span className="mt-0.5 w-5 font-mono text-xs text-slate-500">{s.idx + 1}</span>
                <div className="min-w-0 flex-1"><p className="text-slate-200">{s.title}{s.optional && <span className="ml-1 text-xs text-slate-500">(opsional)</span>}</p><p className="text-xs text-slate-500">{s.agentLabel} · {s.toolLabel}</p></div>
                <LevelBadge level={s.level} />
                <span className={cx('w-32 text-right text-xs', ACTION_STYLE[s.decision.action])} title={s.decision.reason}>{ACTION_LABEL[s.decision.action]}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-white">Run terbaru</h2><Link to="/app/runs" className="text-sm text-brand-400 hover:underline">Semua run →</Link></div>
        {recent.length === 0 ? <Empty title="Belum ada run" icon="⌘">Tulis command pertama Anda di atas. Agen akan merencanakan, meriset, dan menyusun laporan berbasis bukti.</Empty> : (
          <div className="grid gap-3 md:grid-cols-2">{recent.map((r) => <RunCard key={r.id} r={r} />)}</div>
        )}
      </section>
    </>
  )
}

function RunCard({ r }: { r: any }) {
  return (
    <Link to={`/app/runs/${r.id}`}>
      <Card className="h-full p-4 transition hover:border-brand-500/50">
        <div className="flex items-center justify-between gap-2"><Badge>{r.status}</Badge><span className="text-xs text-slate-500">{ago(r.created_at)}</span></div>
        <p className="mt-2 line-clamp-2 text-sm font-medium text-white">{r.objective}</p>
        <p className="mt-2 text-xs text-slate-500">{r.evidence_count} bukti · {r.used_credits}/{r.budget_credits} kredit{r.report_id ? ' · laporan ✓' : ''}</p>
      </Card>
    </Link>
  )
}

export function RunsPage() {
  const api = useApi()
  const { ws } = useWs()
  const [runs, setRuns] = useState<any[] | null>(null)
  const [filter, setFilter] = useState('')
  const [err, setErr] = useState<unknown>(null)
  useEffect(() => { setRuns(null); api<{ runs: any[] }>(`/runs${filter ? `?status=${filter}` : ''}`).then((r) => setRuns(r.runs)).catch(setErr) }, [api, filter, ws?.workspace.id])
  return (
    <>
      <PageHeader title="Run History" subtitle="Setiap command, rencana, langkah, bukti, dan biaya tercatat secara durable." actions={
        <select aria-label="Filter status" className={cx(inputCls, 'w-44')} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Semua status</option>{['completed', 'running', 'awaiting_approval', 'failed', 'blocked', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>} />
      <ErrorBox error={err} />
      {!runs ? <Spinner /> : runs.length === 0 ? <Empty title="Tidak ada run" /> : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="p-3">Objektif</th><th className="p-3">Status</th><th className="p-3">Bukti</th><th className="p-3">Kredit</th><th className="p-3">Oleh</th><th className="p-3">Waktu</th></tr></thead>
            <tbody className="divide-y divide-ink-700">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-white/[.02]">
                  <td className="max-w-md p-3"><Link to={`/app/runs/${r.id}`} className="line-clamp-1 font-medium text-white hover:text-brand-400">{r.objective}</Link><span className="font-mono text-[10px] text-slate-600">{r.id}</span></td>
                  <td className="p-3"><Badge>{r.status}</Badge></td><td className="p-3 font-mono">{r.evidence_count}</td><td className="p-3 font-mono">{r.used_credits}/{r.budget_credits}</td>
                  <td className="p-3 text-slate-400">{r.user_name ?? '—'}</td><td className="p-3 text-slate-400">{dt(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  )
}

const STEP_ICON: Record<string, string> = { completed: '✓', running: '◌', pending: '○', awaiting_approval: '⏸', failed: '✕', skipped: '–', blocked: '⛔' }

export function RunDetail() {
  const { id } = useParams()
  const api = useApi()
  const { ws, refreshWs } = useWs()
  const [data, setData] = useState<any>(null)
  const [err, setErr] = useState<unknown>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const timer = useRef<number | null>(null)

  const load = useCallback(async () => {
    try { setData(await api(`/runs/${id}`)) } catch (e) { setErr(e) }
  }, [api, id])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const active = data && ['planned', 'running'].includes(data.run.status)
    if (active) timer.current = window.setTimeout(load, 2500)
    else if (data && ['completed', 'failed', 'blocked'].includes(data.run.status)) refreshWs()
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [data, load]) // eslint-disable-line

  const decide = async (approvalId: string, decision: 'approved' | 'rejected') => {
    setBusy(approvalId)
    try { await api(`/approvals/${approvalId}/decide`, { body: { decision } }); toast(decision === 'approved' ? 'Disetujui — run dilanjutkan' : 'Ditolak — langkah dilewati'); await load(); refreshWs() } catch (e) { toast((e as Error).message, 'err') } finally { setBusy(null) }
  }
  const cancel = async () => { setBusy('cancel'); try { await api(`/runs/${id}/cancel`, { body: {} }); await load() } catch (e) { toast((e as Error).message, 'err') } finally { setBusy(null) } }
  const resume = async () => { setBusy('resume'); try { await api(`/runs/${id}/resume`, { body: {} }); await load() } catch (e) { toast((e as Error).message, 'err') } finally { setBusy(null) } }

  if (err) return <ErrorBox error={err} />
  if (!data) return <Spinner />
  const { run, steps, evidence, report, approvals, ledger } = data
  const pending = approvals.filter((a: any) => a.status === 'pending')
  const done = steps.filter((s: any) => ['completed', 'skipped', 'failed'].includes(s.status)).length
  const live = ['planned', 'running'].includes(run.status)

  return (
    <>
      <div className="mb-2 text-sm"><Link to="/app/runs" className="text-slate-400 hover:text-white">← Run History</Link></div>
      <PageHeader title={run.objective} subtitle={<span className="font-mono text-xs">{run.id} · {dt(run.created_at)} · intent {run.intent}</span>}
        actions={<>
          {live && <Button size="sm" variant="subtle" onClick={resume} loading={busy === 'resume'}>Lanjutkan sekarang</Button>}
          {['planned', 'running', 'awaiting_approval'].includes(run.status) && ws?.role !== 'viewer' && <Button size="sm" variant="outline" onClick={cancel} loading={busy === 'cancel'}>Batalkan</Button>}
          {report && <Link to={`/app/reports/${report.id}`}><Button size="sm">Buka laporan →</Button></Link>}
        </>} />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase text-slate-500">Status</p><div className="mt-2 flex items-center gap-2"><Badge>{run.status}</Badge>{live && <Spinner className="h-4 w-4 text-sky-300" />}</div></Card>
        <Card className="p-4"><Meter label="Langkah" used={done} total={steps.length} /></Card>
        <Card className="p-4"><Meter label="Kredit (budget)" used={run.used_credits} total={run.budget_credits} /></Card>
        <Card className="p-4"><p className="text-xs uppercase text-slate-500">Bukti</p><p className="mt-1 text-2xl font-bold text-white">{evidence.length}</p></Card>
      </div>

      {run.error && <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{run.status === 'blocked' ? '⛔ ' : '✕ '}{run.error}</div>}

      {pending.map((a: any) => (
        <Card key={a.id} className="mt-4 border-amber-500/40 bg-amber-500/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="flex items-center gap-2 text-sm font-semibold text-amber-200"><LevelBadge level={a.level} /> Persetujuan diperlukan</p><p className="mt-1 text-sm text-slate-300">{a.summary}</p><p className="mt-1 text-xs text-slate-500">Persetujuan ini hanya berlaku untuk langkah spesifik ini.</p></div>
            {ws?.role !== 'viewer' && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => decide(a.id, 'rejected')} loading={busy === a.id}>Tolak</Button><Button size="sm" onClick={() => decide(a.id, 'approved')} loading={busy === a.id}>Setujui</Button></div>}
          </div>
        </Card>
      ))}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <h2 className="mb-3 font-semibold text-white">Eksekusi agen</h2>
          <ol className="space-y-2">
            {steps.map((s: any) => (
              <li key={s.id}>
                <Card className="p-3">
                  <button className="flex w-full items-start gap-3 text-left" onClick={() => setOpen(open === s.idx ? null : s.idx)} aria-expanded={open === s.idx}>
                    <span className={cx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs', s.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : s.status === 'running' ? 'animate-pulse bg-sky-500/20 text-sky-300' : s.status === 'failed' || s.status === 'blocked' ? 'bg-rose-500/20 text-rose-300' : s.status === 'awaiting_approval' ? 'bg-amber-500/20 text-amber-300' : 'bg-ink-700 text-slate-400')}>{STEP_ICON[s.status] ?? '○'}</span>
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">{s.title}</p><p className="text-xs text-slate-500">{s.agentLabel} · {s.toolLabel}{s.attempts > 1 ? ` · ${s.attempts} percobaan` : ''}</p>{s.error && <p className="mt-1 text-xs text-rose-300/80">{s.error}</p>}</div>
                    <LevelBadge level={s.approval_level} />
                  </button>
                  {open === s.idx && s.output && <pre className="mt-3 max-h-72 overflow-auto rounded-lg bg-ink-950 p-3 font-mono text-[11px] text-slate-400">{JSON.stringify(s.output, null, 2)}</pre>}
                </Card>
              </li>
            ))}
          </ol>
        </section>
        <aside className="space-y-6 lg:col-span-2">
          <section>
            <h2 className="mb-3 font-semibold text-white">Bukti ({evidence.length})</h2>
            {evidence.length === 0 ? <p className="text-sm text-slate-500">{live ? 'Mengumpulkan bukti…' : 'Tidak ada bukti.'}</p> : (
              <ol className="space-y-2">
                {evidence.map((e: any, i: number) => (
                  <li key={e.id} className="rounded-lg border border-ink-700 bg-ink-900/60 p-3">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500"><span className="font-mono text-brand-400">[{i + 1}]</span><span>{host(e.source_url)}</span><span className="ml-auto rounded bg-ink-800 px-1.5">{e.provider}{e.has_content ? ' · full' : ''}</span></div>
                    <a href={e.source_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 line-clamp-2 block text-sm font-medium text-slate-200 hover:text-brand-400">{e.title}</a>
                  </li>
                ))}
              </ol>
            )}
          </section>
          {ledger.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold text-white">Usage ledger</h2>
              <Card className="divide-y divide-ink-700 text-xs">{ledger.map((l: any, i: number) => <div key={i} className="flex justify-between p-2.5"><span className="text-slate-400">{l.provider} · {l.operation}</span><span className="font-mono text-slate-200">{l.credits} kr</span></div>)}</Card>
            </section>
          )}
          <section>
            <h2 className="mb-2 font-semibold text-white">Command</h2>
            <p className="rounded-lg bg-ink-900 p-3 text-sm text-slate-300">{run.command}</p>
          </section>
        </aside>
      </div>
    </>
  )
}
