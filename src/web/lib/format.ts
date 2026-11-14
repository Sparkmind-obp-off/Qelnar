export const idr = (n: number | null | undefined) => (n == null ? 'Custom' : n === 0 ? 'Rp0' : 'Rp' + n.toLocaleString('id-ID'))
export const dt = (s: string | null | undefined) => {
  if (!s) return '—'
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z')
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}
export const ago = (s: string | null | undefined) => {
  if (!s) return '—'
  const d = new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z')
  const m = Math.round((Date.now() - d.getTime()) / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m} mnt lalu`
  if (m < 1440) return `${Math.round(m / 60)} jam lalu`
  return `${Math.round(m / 1440)} hari lalu`
}
export const host = (u?: string | null) => { try { return u ? new URL(u).hostname.replace(/^www\./, '') : '' } catch { return '' } }
