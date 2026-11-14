-- QELNAR One — initial schema (Cloudflare D1 / SQLite)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                 -- internal id (usr_...)
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  image_url TEXT,
  role TEXT NOT NULL DEFAULT 'user',   -- user | admin (platform role, server-enforced)
  onboarded INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  niche TEXT,
  goals TEXT,
  platforms TEXT,                      -- JSON array
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member', -- owner | admin | member | viewer
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_members_user ON workspace_members(user_id);

CREATE TABLE IF NOT EXISTS workspace_invites (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | revoked
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_invites_email ON workspace_invites(email, status);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_ws ON projects(workspace_id);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  project_id TEXT,
  user_id TEXT NOT NULL,
  command TEXT NOT NULL,
  intent TEXT NOT NULL,
  objective TEXT NOT NULL,
  params TEXT,                         -- JSON
  plan TEXT NOT NULL,                  -- JSON
  status TEXT NOT NULL,                -- planned | awaiting_approval | running | completed | failed | blocked | cancelled
  current_step INTEGER NOT NULL DEFAULT 0,
  budget_credits INTEGER NOT NULL DEFAULT 0,
  used_credits INTEGER NOT NULL DEFAULT 0,
  cost_usd_micros INTEGER NOT NULL DEFAULT 0,
  lock_until TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_runs_ws ON runs(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS run_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(id),
  idx INTEGER NOT NULL,
  agent TEXT NOT NULL,
  tool TEXT NOT NULL,
  title TEXT NOT NULL,
  approval_level TEXT NOT NULL,        -- H0..H3
  status TEXT NOT NULL DEFAULT 'pending', -- pending | awaiting_approval | running | completed | failed | skipped | blocked
  attempts INTEGER NOT NULL DEFAULT 0,
  input TEXT,
  output TEXT,
  error TEXT,
  est_credits INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_steps_run ON run_steps(run_id, idx);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  level TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  requested_by TEXT NOT NULL,
  decided_by TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_approvals_ws ON approvals(workspace_id, status);

CREATE TABLE IF NOT EXISTS evidence (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  step_id TEXT,
  provider TEXT NOT NULL,
  source_url TEXT,
  title TEXT,
  snippet TEXT,
  content TEXT,
  score REAL,
  content_hash TEXT,
  retrieved_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_evidence_run ON evidence(run_id);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  run_id TEXT,
  project_id TEXT,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,                  -- intelligence | service_delivery
  body_md TEXT NOT NULL,
  data TEXT,                           -- JSON structured insights
  generator TEXT,                      -- llm model or 'extractive'
  feedback INTEGER,                    -- 1 useful, -1 not useful
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reports_ws ON reports(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS usage_ledger (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  run_id TEXT,
  user_id TEXT,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  credits INTEGER NOT NULL DEFAULT 0,
  cost_usd_micros INTEGER NOT NULL DEFAULT 0,
  kind TEXT NOT NULL DEFAULT 'actual', -- reservation | actual | release
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ledger_ws ON usage_ledger(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  workspace_id TEXT,
  user_id TEXT,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_ws ON audit_log(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,                 -- trial | solo | pro | studio | business
  name TEXT NOT NULL,
  price_idr INTEGER,                   -- NULL = custom
  interval TEXT NOT NULL DEFAULT 'month',
  tagline TEXT,
  entitlements TEXT NOT NULL,          -- JSON
  features TEXT NOT NULL,              -- JSON array (marketing bullets)
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL UNIQUE,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL,                -- trialing | active | past_due | cancelled | expired
  price_idr_locked INTEGER,            -- price captured at activation; never silently changed
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'manual',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS billing_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  from_plan TEXT,
  to_plan TEXT NOT NULL,
  amount_idr INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | activated | rejected | cancelled
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT
);

CREATE TABLE IF NOT EXISTS service_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_idr_min INTEGER NOT NULL,
  price_idr_max INTEGER,
  timeline_days INTEGER NOT NULL,
  revisions INTEGER NOT NULL DEFAULT 1,
  summary TEXT NOT NULL,
  scope TEXT NOT NULL,                 -- JSON array
  deliverables TEXT NOT NULL,          -- JSON array
  exclusions TEXT NOT NULL,            -- JSON array
  est_hours REAL NOT NULL DEFAULT 2,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS service_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  brief TEXT NOT NULL,
  contact TEXT,
  status TEXT NOT NULL DEFAULT 'requested', -- requested | scoped | quoted | in_progress | delivered | closed | cancelled
  quoted_idr INTEGER,
  scope_note TEXT,
  delivery_report_id TEXT,
  hours_spent REAL NOT NULL DEFAULT 0,
  paid INTEGER NOT NULL DEFAULT 0,
  due_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS provider_settings (
  provider TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL DEFAULT 0,
  monthly_cap_usd_micros INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  run_id TEXT,
  kind TEXT NOT NULL,                  -- learning | feedback | preference
  content TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_memories_ws ON memories(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  run_id TEXT,
  title TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'todo', -- todo | doing | done
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
