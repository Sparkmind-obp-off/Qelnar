/** Minimal D1-compatible adapter on node:sqlite for integration tests (same SQLite engine as D1). */
import { DatabaseSync } from 'node:sqlite'

class Stmt {
  constructor(private db: DatabaseSync, private sql: string, private params: unknown[] = []) {}
  bind(...p: unknown[]) { return new Stmt(this.db, this.sql, p.map((x) => (x === undefined ? null : typeof x === 'boolean' ? (x ? 1 : 0) : x))) }
  async first<T>(col?: string): Promise<T | null> {
    const r = this.db.prepare(this.sql).get(...(this.params as any[])) as any
    if (!r) return null
    return (col ? r[col] : { ...r }) as T
  }
  async all<T>() { return { results: (this.db.prepare(this.sql).all(...(this.params as any[])) as any[]).map((r) => ({ ...r })) as T[], success: true, meta: {} } }
  async run() { const r = this.db.prepare(this.sql).run(...(this.params as any[])); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } } }
}

export function createD1() {
  const db = new DatabaseSync(':memory:')
  return {
    prepare: (sql: string) => new Stmt(db, sql),
    batch: async (stmts: Stmt[]) => { db.exec('BEGIN'); try { const out = []; for (const s of stmts) out.push(await s.run()); db.exec('COMMIT'); return out } catch (e) { db.exec('ROLLBACK'); throw e } },
    exec: async (sql: string) => { db.exec(sql); return { count: 0, duration: 0 } },
  }
}
