import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAppAuth } from '../lib/auth'
import { publicGet } from '../lib/api'
import { idr } from '../lib/format'
import { Button, Card, ErrorBox, GoogleIcon, Logo, Spinner, cx } from '../components/ui'

export interface PublicPlan { id: string; name: string; price_idr: number | null; tagline: string; features: string[]; limits: { runs_per_month: number; credits_per_month: number; max_workspaces: number; max_members: number; export: boolean; team: boolean } }
export interface PublicService { id: string; name: string; price_idr_min: number; price_idr_max: number | null; timeline_days: number; revisions: number; summary: string; scope: string[]; deliverables: string[]; exclusions: string[] }

function Nav() {
  const { isSignedIn } = useAppAuth()
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-ink-950/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4" aria-label="Main">
        <Link to="/" aria-label="QELNAR home"><Logo /></Link>
        <div className="hidden items-center gap-1 md:flex">
          <a href="/#how" className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white">Cara Kerja</a>
          <a href="/#agents" className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white">Agen</a>
          <Link to="/pricing" className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white">Harga</Link>
          <Link to="/services" className="rounded-lg px-3 py-2 text-sm text-slate-300 hover:text-white">Layanan</Link>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {isSignedIn ? <Link to="/app"><Button size="sm">Buka Command Center →</Button></Link> : <><Link to="/sign-in"><Button size="sm" variant="ghost">Masuk</Button></Link><Link to="/sign-in"><Button size="sm">Mulai Gratis</Button></Link></>}
        </div>
        <button className="rounded p-2 text-slate-300 md:hidden" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>☰</button>
      </nav>
      {open && (
        <div className="flex flex-col gap-1 border-t border-white/5 px-4 py-3 md:hidden">
          <a href="/#how" className="py-2 text-slate-300">Cara Kerja</a>
          <Link to="/pricing" className="py-2 text-slate-300">Harga</Link>
          <Link to="/services" className="py-2 text-slate-300">Layanan</Link>
          <Link to={isSignedIn ? '/app' : '/sign-in'}><Button className="mt-2 w-full">{isSignedIn ? 'Command Center' : 'Mulai Gratis'}</Button></Link>
        </div>
      )}
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 md:flex-row md:items-center md:justify-between">
        <div><Logo /><p className="mt-2 text-sm text-slate-500">One Command. Total Intelligence.</p></div>
        <div className="flex flex-wrap gap-5 text-sm text-slate-400">
          <Link to="/pricing" className="hover:text-white">Harga</Link>
          <Link to="/services" className="hover:text-white">Layanan</Link>
          <Link to="/terms" className="hover:text-white">Ketentuan</Link>
          <Link to="/privacy" className="hover:text-white">Privasi</Link>
        </div>
        <p className="text-xs text-slate-600">© {new Date().getFullYear()} QELNAR · qelnar.biz.id</p>
      </div>
    </footer>
  )
}

function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col"><Nav /><main className="flex-1">{children}</main><Footer /></div>
}

const CYCLE = ['Observe', 'Understand', 'Decide', 'Plan', 'Execute', 'Measure', 'Learn']

export function Landing() {
  const [plans, setPlans] = useState<PublicPlan[]>([])
  useEffect(() => { publicGet<{ plans: PublicPlan[] }>('/api/public/plans').then((r) => setPlans(r.plans)).catch(() => undefined) }, [])
  return (
    <PublicLayout>
      <section id="hero" className="relative overflow-hidden">
        <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div className="absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />
        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 text-center md:pt-28">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-400">● Full-Agentic Creator Intelligence OS</p>
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">One Command.<br /><span className="grad-text">Total Intelligence.</span></h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">Tulis tujuan Anda dalam bahasa sehari-hari. QELNAR merencanakan, meriset sumber publik, menganalisis kompetitor, dan menyusun strategi konten berbasis bukti — dengan persetujuan Anda di setiap langkah penting.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/sign-in"><Button size="lg" className="glow"><GoogleIcon /> Mulai gratis dengan Google</Button></Link>
            <Link to="/pricing"><Button size="lg" variant="outline">Lihat harga</Button></Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">Free Trial 14 hari · Tanpa kartu kredit</p>

          <Card className="grad-border glow mx-auto mt-14 max-w-3xl p-4 text-left">
            <div className="flex items-center gap-2 border-b border-ink-700 pb-3 text-xs text-slate-500"><span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" /><span className="ml-2 font-mono">command-center</span></div>
            <div className="pt-4 font-mono text-sm">
              <p className="text-slate-300"><span className="text-brand-400">›</span> Analisis kompetitor kreator kuliner TikTok Indonesia dan cari celah konten untuk saya</p>
              <div className="mt-4 space-y-1.5 text-xs">
                {[['Supervisor', 'Validasi objektif & konteks workspace', 'H0'], ['Research', 'Cari 3 kueri sumber publik', 'H1'], ['Research', 'Ekstrak 2 halaman teratas', 'H1'], ['Competitor Analysis', 'Analisis bukti → insight bersitasi', 'H0'], ['Planning', 'Susun & simpan laporan', 'H0'], ['Execution', 'Buat task proyek (butuh persetujuan)', 'H2']].map(([a, t, l], i) => (
                  <div key={i} className="flex items-center gap-3"><span className="text-emerald-400">✓</span><span className="w-40 shrink-0 text-slate-400">{a} Agent</span><span className="flex-1 truncate text-slate-300">{t}</span><span className="rounded border border-ink-600 px-1.5 text-[10px] text-slate-400">{l}</span></div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="text-center text-3xl font-bold text-white">Siklus intelijen yang benar-benar agentik</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">Bukan chatbot berlabel agen. Setiap command menjadi rencana eksplisit, dievaluasi policy engine, dieksekusi secara durable, dan tercatat lengkap dengan bukti dan biaya.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {CYCLE.map((s, i) => <div key={s} className="flex items-center gap-2"><span className="rounded-full border border-ink-600 bg-ink-850 px-4 py-2 text-sm font-semibold text-white">{s}</span>{i < CYCLE.length - 1 && <span className="text-brand-400">→</span>}</div>)}
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            ['Evidence before conclusions', 'Setiap insight mengutip sumber bernomor dengan URL, waktu pengambilan, dan hash konten. Yang tidak diketahui ditulis sebagai "unknowns".'],
            ['Human control (H0–H3)', 'Analisis internal berjalan otomatis. Pengumpulan data, delegasi rencana, dan aksi eksternal selalu butuh otorisasi spesifik — tanpa blanket approval.'],
            ['Cost-aware by design', 'Setiap operasi provider punya estimasi biaya, anggaran per run, dan hard cap bulanan. Transparan di halaman Usage.'],
          ].map(([t, d]) => <Card key={t} className="p-6"><h3 className="font-semibold text-white">{t}</h3><p className="mt-2 text-sm leading-relaxed text-slate-400">{d}</p></Card>)}
        </div>
      </section>

      <section id="agents" className="border-y border-white/5 bg-ink-900/50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-bold text-white">10 agen spesialis, satu orkestrator</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">Orkestrator memegang otoritas eksekusi. Agen hanya bekerja lewat tool yang terdaftar dengan kontrak input/output.</p>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-5">
            {['Supervisor', 'Research', 'Creator Intelligence', 'Competitor Analysis', 'Content Strategy', 'Opportunity Analysis', 'Planning', 'Execution', 'Measurement', 'Learning'].map((a) => (
              <div key={a} className="rounded-xl border border-ink-700 bg-ink-850 p-4 text-center"><div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-brand-400">◆</div><p className="text-sm font-semibold text-white">{a}</p><p className="text-xs text-slate-500">Agent</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-col items-end justify-between gap-4 md:flex-row"><div><h2 className="text-3xl font-bold text-white">Harga yang jujur</h2><p className="mt-2 text-slate-400">Mulai gratis. Tanpa janji "unlimited AI" yang tidak masuk akal.</p></div><Link to="/pricing" className="text-sm font-semibold text-brand-400 hover:underline">Bandingkan semua paket →</Link></div>
        <div className="mt-8 grid gap-4 md:grid-cols-5">{plans.map((p) => <PlanCard key={p.id} plan={p} compact />)}</div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <Card className="grad-border relative overflow-hidden p-10 text-center">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-glow/10 blur-3xl" />
          <h2 className="text-3xl font-bold text-white">Butuh tim ahli? Ada Creator Intelligence as a Service.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-400">Audit cepat, laporan kompetitor, strategi pertumbuhan 90 hari — dikerjakan tim QELNAR dengan scope, timeline, dan deliverable yang jelas.</p>
          <Link to="/services"><Button size="lg" variant="outline" className="mt-6">Lihat katalog layanan</Button></Link>
        </Card>
      </section>
    </PublicLayout>
  )
}

export function PlanCard({ plan, compact, current, action }: { plan: PublicPlan; compact?: boolean; current?: boolean; action?: ReactNode }) {
  const featured = plan.id === 'pro'
  return (
    <Card className={cx('flex flex-col p-5', featured && 'grad-border glow')}>
      <div className="flex items-center justify-between"><h3 className="font-bold text-white">{plan.name}</h3>{featured && <span className="rounded-full bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-400">Populer</span>}{current && <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">Paket aktif</span>}</div>
      <p className="mt-1 text-xs text-slate-500">{plan.tagline}</p>
      <p className="mt-4 text-2xl font-extrabold text-white">{idr(plan.price_idr)}{plan.price_idr ? <span className="text-sm font-medium text-slate-500">/bln</span> : null}</p>
      <ul className={cx('mt-4 flex-1 space-y-2 text-sm text-slate-300', compact && 'text-xs')}>
        {plan.features.map((f) => <li key={f} className="flex gap-2"><span className="text-brand-400">✓</span>{f}</li>)}
      </ul>
      {!compact && <p className="mt-4 text-xs text-slate-500">{plan.limits.credits_per_month} kredit riset / bulan</p>}
      {action ?? <Link to="/sign-in" className="mt-5"><Button variant={featured ? 'primary' : 'outline'} className="w-full" size="sm">{plan.price_idr === null ? 'Hubungi kami' : plan.price_idr === 0 ? 'Mulai gratis' : 'Pilih paket'}</Button></Link>}
    </Card>
  )
}

export function PricingPage() {
  const [plans, setPlans] = useState<PublicPlan[] | null>(null)
  const [err, setErr] = useState<unknown>(null)
  useEffect(() => { publicGet<{ plans: PublicPlan[] }>('/api/public/plans').then((r) => setPlans(r.plans)).catch(setErr) }, [])
  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-center text-4xl font-extrabold text-white">Harga QELNAR One</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">Harga dalam Rupiah. Batas penggunaan ditegakkan di server sehingga biaya tetap dapat diprediksi — untuk Anda dan untuk kami.</p>
        <ErrorBox error={err} />
        {!plans ? <div className="mt-12 flex justify-center"><Spinner /></div> : (
          <>
            <div className="mt-10 grid gap-4 md:grid-cols-3 lg:grid-cols-5">{plans.map((p) => <PlanCard key={p.id} plan={p} />)}</div>
            <div className="mt-12 overflow-x-auto rounded-2xl border border-ink-700">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-ink-850 text-left text-slate-400"><tr><th className="p-3">Batas</th>{plans.map((p) => <th key={p.id} className="p-3 text-white">{p.name}</th>)}</tr></thead>
                <tbody className="divide-y divide-ink-700">
                  {([['Intelligence run / bulan', 'runs_per_month'], ['Kredit riset / bulan', 'credits_per_month'], ['Workspace', 'max_workspaces'], ['Anggota tim', 'max_members']] as const).map(([l, k]) => (
                    <tr key={k}><td className="p-3 text-slate-400">{l}</td>{plans.map((p) => <td key={p.id} className="p-3 font-mono text-slate-200">{p.limits[k]}</td>)}</tr>
                  ))}
                  <tr><td className="p-3 text-slate-400">Ekspor laporan</td>{plans.map((p) => <td key={p.id} className="p-3">{p.limits.export ? '✓' : '—'}</td>)}</tr>
                  <tr><td className="p-3 text-slate-400">Kolaborasi tim & RBAC</td>{plans.map((p) => <td key={p.id} className="p-3">{p.limits.team ? '✓' : '—'}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[['Apa itu kredit riset?', 'Setiap operasi menghabiskan kredit: pencarian web 2, ekstraksi halaman 3, analisis AI 4. Satu run lengkap biasanya 18–24 kredit.'],
            ['Bagaimana pembayaran?', 'Pembayaran online belum aktif. Upgrade diajukan dari aplikasi dan diaktifkan tim QELNAR setelah konfirmasi pembayaran manual.'],
            ['Apakah harga bisa berubah?', 'Harga saat ini adalah hipotesis awal. Harga langganan aktif Anda dikunci dan tidak pernah diubah diam-diam.']].map(([q, a]) => (
            <Card key={q} className="p-5"><h3 className="font-semibold text-white">{q}</h3><p className="mt-2 text-sm text-slate-400">{a}</p></Card>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
}

export function ServiceCard({ s, action }: { s: PublicService; action?: ReactNode }) {
  return (
    <Card className="flex flex-col p-6">
      <h3 className="text-lg font-bold text-white">{s.name}</h3>
      <p className="mt-1 text-sm text-slate-400">{s.summary}</p>
      <p className="mt-4 text-xl font-extrabold text-white">{idr(s.price_idr_min)}{s.price_idr_max ? ` – ${idr(s.price_idr_max)}` : ''}{s.id === 'monthly_retainer' && <span className="text-sm font-medium text-slate-500">/bln</span>}</p>
      <p className="text-xs text-slate-500">Timeline {s.timeline_days} hari · {s.revisions} revisi</p>
      <div className="mt-4 grid flex-1 gap-4 text-sm sm:grid-cols-2">
        <div><p className="mb-1 text-xs font-semibold uppercase text-slate-500">Scope</p><ul className="space-y-1 text-slate-300">{s.scope.map((x) => <li key={x}>• {x}</li>)}</ul></div>
        <div><p className="mb-1 text-xs font-semibold uppercase text-slate-500">Deliverables</p><ul className="space-y-1 text-slate-300">{s.deliverables.map((x) => <li key={x}>✓ {x}</li>)}</ul></div>
      </div>
      <p className="mt-4 text-xs text-slate-500"><span className="font-semibold">Tidak termasuk:</span> {s.exclusions.join(' · ')}</p>
      {action ?? <Link to="/sign-in" className="mt-5"><Button variant="outline" className="w-full">Ajukan permintaan</Button></Link>}
    </Card>
  )
}

export function ServicesPage() {
  const [services, setServices] = useState<PublicService[] | null>(null)
  useEffect(() => { publicGet<{ services: PublicService[] }>('/api/public/services').then((r) => setServices(r.services)).catch(() => setServices([])) }, [])
  return (
    <PublicLayout>
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-center text-4xl font-extrabold text-white">Creator Intelligence as a Service</h1>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">Pekerjaan intelijen yang dibantu tim QELNAR, menggunakan sistem bukti dan workflow yang sama dengan platform. Scope tertulis, deliverable jelas, tanpa janji views atau followers.</p>
        {!services ? <div className="mt-12 flex justify-center"><Spinner /></div> : <div className="mt-10 grid gap-5 md:grid-cols-2">{services.map((s) => <ServiceCard key={s.id} s={s} />)}</div>}
      </section>
    </PublicLayout>
  )
}

export function SignInPage() {
  const { isLoaded, isSignedIn, signInWithGoogle } = useAppAuth()
  const [params] = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<unknown>(null)
  const redirect = params.get('redirect') && params.get('redirect')!.startsWith('/app') ? params.get('redirect')! : '/app'
  if (isLoaded && isSignedIn) return <Navigate to={redirect} replace />
  const go = async () => {
    setBusy(true); setErr(null)
    try { await signInWithGoogle(redirect) } catch (e) { setErr(e); setBusy(false) }
  }
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <Card className="grad-border glow relative w-full max-w-md p-8 text-center">
        <Link to="/" className="inline-block"><Logo className="text-xl" /></Link>
        <h1 className="mt-6 text-2xl font-bold text-white">Masuk ke QELNAR One</h1>
        <p className="mt-2 text-sm text-slate-400">Gunakan akun Google Anda. Akun baru otomatis dibuat dan mendapat Free Trial 14 hari.</p>
        <Button size="lg" className="mt-8 w-full !bg-white !text-slate-900 hover:!bg-slate-100" onClick={go} loading={busy || !isLoaded} aria-label="Continue with Google">
          {!busy && <GoogleIcon />} Continue with Google
        </Button>
        <div className="mt-4"><ErrorBox error={err} /></div>
        <p className="mt-6 text-xs text-slate-500">Dengan melanjutkan, Anda menyetujui <Link to="/terms" className="underline">Ketentuan</Link> dan <Link to="/privacy" className="underline">Kebijakan Privasi</Link>. QELNAR hanya menerima nama, email, dan foto profil dari Google.</p>
      </Card>
    </div>
  )
}

export function LegalPage({ kind }: { kind: 'terms' | 'privacy' }) {
  const terms = [
    ['Layanan', 'QELNAR One menyediakan alat riset dan analisis intelijen kreator berbasis sumber publik. Hasil adalah analisis, bukan jaminan views, followers, penjualan, atau pertumbuhan bisnis.'],
    ['Akun', 'Masuk hanya menggunakan Google. Anda bertanggung jawab atas aktivitas di workspace Anda dan anggota yang Anda undang.'],
    ['Penggunaan wajar', 'Batas penggunaan per paket ditegakkan di server. Dilarang menggunakan QELNAR untuk mengumpulkan data pribadi, melanggar ketentuan platform pihak ketiga, atau aktivitas ilegal.'],
    ['Aksi eksternal', 'QELNAR tidak pernah memposting, mengirim pesan, membeli, atau menghapus apa pun di akun eksternal tanpa koneksi API resmi dan persetujuan spesifik (H3) dari Anda.'],
    ['Pembayaran', 'Pembayaran online belum aktif. Perubahan paket diproses manual. Harga langganan aktif dikunci selama periode berjalan.'],
    ['Layanan profesional', 'Setiap layanan memiliki scope, timeline, revisi, dan pengecualian tertulis yang berlaku sebagai bagian dari perjanjian.'],
  ]
  const privacy = [
    ['Data yang kami terima', 'Dari Google (via Clerk): nama, email, foto profil. Dari Anda: informasi workspace, command, dan feedback.'],
    ['Data riset', 'Bukti dikumpulkan dari sumber web publik melalui provider pencarian/ekstraksi. Setiap bukti mencatat URL sumber dan waktu pengambilan.'],
    ['Isolasi', 'Data setiap workspace terisolasi dan hanya dapat diakses anggotanya. Otorisasi ditegakkan di server.'],
    ['Pemroses pihak ketiga', 'Clerk (autentikasi), Cloudflare (hosting, database, AI), Tavily (pencarian), Firecrawl (ekstraksi). Kami tidak menjual data Anda.'],
    ['Keamanan', 'Kunci API disimpan sebagai secret server-side dan tidak pernah dikirim ke browser. Aktivitas penting dicatat dalam audit log.'],
    ['Hak Anda', 'Anda dapat meminta ekspor atau penghapusan data dengan menghubungi tim QELNAR melalui halaman layanan.'],
  ]
  const items = kind === 'terms' ? terms : privacy
  return (
    <PublicLayout>
      <article className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold text-white">{kind === 'terms' ? 'Ketentuan Layanan' : 'Kebijakan Privasi'}</h1>
        <p className="mt-2 text-sm text-slate-500">Versi awal — berlaku sejak peluncuran QELNAR One.</p>
        <div className="mt-8 space-y-6">{items.map(([h, p]) => <section key={h}><h2 className="font-semibold text-white">{h}</h2><p className="mt-1 text-slate-400">{p}</p></section>)}</div>
      </article>
    </PublicLayout>
  )
}

export function NotFound() {
  return <PublicLayout><div className="mx-auto max-w-xl px-4 py-32 text-center"><p className="text-6xl font-extrabold grad-text">404</p><p className="mt-4 text-slate-400">Halaman tidak ditemukan.</p><Link to="/"><Button className="mt-6">Kembali ke beranda</Button></Link></div></PublicLayout>
}
