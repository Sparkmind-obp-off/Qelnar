import { useEffect, useState, type ReactNode, type ButtonHTMLAttributes } from 'react'

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2 font-extrabold tracking-tight', className)}>
      <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden>
        <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9d86ff" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
        <rect width="64" height="64" rx="14" fill="#11111d" />
        <circle cx="30" cy="30" r="15" fill="none" stroke="url(#lg)" strokeWidth="6" />
        <path d="M38 38l11 11" stroke="url(#lg)" strokeWidth="6" strokeLinecap="round" />
      </svg>
      <span className="text-white">QELNAR</span>
    </span>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'subtle'; size?: 'sm' | 'md' | 'lg'; loading?: boolean }
export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20',
    ghost: 'hover:bg-white/5 text-slate-300',
    outline: 'border border-ink-600 hover:border-brand-500/60 hover:bg-white/5 text-slate-200',
    danger: 'bg-rose-600/90 hover:bg-rose-600 text-white',
    subtle: 'bg-ink-800 hover:bg-ink-700 text-slate-200 border border-ink-700',
  }[variant]
  const s = { sm: 'h-8 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' }[size]
  return (
    <button {...rest} disabled={disabled || loading} className={cx('inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400', v, s, className)}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <svg className={cx('animate-spin text-current', className)} viewBox="0 0 24 24" fill="none" aria-label="loading"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="4" /><path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" /></svg>
}

export function Card({ children, className = '', ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={cx('rounded-2xl border border-ink-700 bg-ink-850/80 backdrop-blur', className)}>{children}</div>
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  )
}

const STATUS: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  running: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  planned: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  pending: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  awaiting_approval: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  failed: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  blocked: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  cancelled: 'bg-slate-600/20 text-slate-400 border-slate-500/30',
  skipped: 'bg-slate-600/20 text-slate-400 border-slate-500/30',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  trialing: 'bg-brand-500/15 text-brand-400 border-brand-500/30',
  expired: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  past_due: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  requested: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  in_progress: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  delivered: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  activated: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
}
export function Badge({ children, tone }: { children: ReactNode; tone?: string }) {
  const k = tone ?? String(children)
  return <span className={cx('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', STATUS[k] ?? 'bg-ink-700 text-slate-300 border-ink-600')}>{String(children).replace(/_/g, ' ')}</span>
}

export function LevelBadge({ level }: { level: string }) {
  const t: Record<string, string> = { H0: 'text-slate-300 border-slate-500/40', H1: 'text-sky-300 border-sky-500/40', H2: 'text-amber-300 border-amber-500/40', H3: 'text-rose-300 border-rose-500/40' }
  return <span className={cx('rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold', t[level])}>{level}</span>
}

export function Empty({ icon = '◎', title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-600 px-6 py-14 text-center">
      <div className="mb-3 text-3xl text-brand-400">{icon}</div>
      <p className="font-semibold text-white">{title}</p>
      {children && <div className="mt-2 max-w-md text-sm text-slate-400">{children}</div>}
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  const msg = error instanceof Error ? error.message : String(error)
  return <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{msg}</div>
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}
export const inputCls = 'w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Card>
  )
}

export function Meter({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total ? Math.min(100, Math.round((used / total) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className="font-mono text-slate-300">{used} / {total}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-700"><div className={cx('h-full rounded-full', pct > 85 ? 'bg-rose-500' : pct > 60 ? 'bg-amber-400' : 'bg-gradient-to-r from-brand-500 to-cyan-glow')} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-ink-600 bg-ink-850 p-6 shadow-2xl', wide ? 'max-w-3xl' : 'max-w-lg')} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-white">{title}</h2><button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-white">✕</button></div>
        {children}
      </div>
    </div>
  )
}

/** Tiny toast system */
let pushToast: ((t: { msg: string; tone?: 'ok' | 'err' }) => void) | null = null
export const toast = (msg: string, tone: 'ok' | 'err' = 'ok') => pushToast?.({ msg, tone })
export function Toaster() {
  const [items, setItems] = useState<{ id: number; msg: string; tone?: 'ok' | 'err' }[]>([])
  useEffect(() => {
    pushToast = (t) => {
      const id = Date.now() + Math.random()
      setItems((x) => [...x, { id, ...t }])
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4500)
    }
    return () => { pushToast = null }
  }, [])
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={cx('pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-xl', t.tone === 'err' ? 'border-rose-500/40 bg-rose-950 text-rose-100' : 'border-emerald-500/40 bg-emerald-950 text-emerald-100')}>{t.msg}</div>
      ))}
    </div>
  )
}

/** Safe minimal markdown renderer: escapes HTML first, then applies a small subset. */
export function Markdown({ text }: { text: string }) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const inline = (s: string) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])_(.+?)_(?=[^_]|$)/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(\d{1,2})\]/g, '<span class="cite">[$1]</span>')
    .replace(/(https?:\/\/[^\s<)]+)/g, (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer nofollow">${u}</a>`)
  const out: string[] = []
  let list: 'ul' | 'ol' | null = null
  const close = () => { if (list) { out.push(`</${list}>`); list = null } }
  for (const raw of text.split('\n')) {
    const l = raw.trimEnd()
    let m
    if ((m = /^(#{1,3})\s+(.*)$/.exec(l))) { close(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`) }
    else if ((m = /^[-*]\s+(.*)$/.exec(l))) { if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul' } out.push(`<li>${inline(m[1])}</li>`) }
    else if ((m = /^\d+\.\s+(.*)$/.exec(l))) { if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol' } out.push(`<li>${inline(m[1])}</li>`) }
    else if ((m = /^>\s?(.*)$/.exec(l))) { close(); out.push(`<blockquote>${inline(m[1])}</blockquote>`) }
    else if (!l.trim()) { close() }
    else { close(); out.push(`<p>${inline(l)}</p>`) }
  }
  close()
  return <div className="prose-q" dangerouslySetInnerHTML={{ __html: out.join('') }} />
}

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
