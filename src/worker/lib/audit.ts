import { id, redact } from './util'
import { run } from './db'

export async function audit(
  db: D1Database,
  e: { workspaceId?: string | null; userId?: string | null; action: string; target?: string; detail?: unknown },
) {
  const detail = e.detail === undefined ? null : redact(typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail)).slice(0, 4000)
  await run(
    db,
    'INSERT INTO audit_log (id, workspace_id, user_id, action, target, detail) VALUES (?,?,?,?,?,?)',
    id('aud'), e.workspaceId ?? null, e.userId ?? null, e.action, e.target ?? null, detail,
  )
}
