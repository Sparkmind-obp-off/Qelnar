# QELNAR One — Implementation Plan

Version 1.0 · Proposed execution plan · 2026-11-14

## Execution strategy
Design the whole system, then ship one vertical slice at a time. A phase is complete only when tests and a demonstrated workflow pass; creating files is not proof of a working system.

## Phase A — Repository and technical proof
Deliver app structure, React/Vite/TypeScript, Hono Worker API, D1 binding and Drizzle migrations, Better Auth D1 spike, preview/production separation and build/typecheck baseline.
Acceptance: local app and Worker run; health endpoint responds; migration applies; preview resources are separate; no secrets in Git or client build.

## Phase B — Command Center shell
Deliver design tokens, responsive shell, sign-in and personal workspace, navigation, empty states, command composer/run preview, activity feed, run detail, source status and settings.
Acceptance: user creates workspace and submits a validated internal command; tenant isolation tests pass; keyboard and mobile flows work.

## Phase C — Orchestrator core
Deliver command/run/task/event schemas, agent/tool registries, policy engine, Cloudflare Workflow integration, durable state transitions, retry/cancel/timeout/idempotency, usage ledger and audit.
Acceptance: multi-step workflow completes; simulated interruption resumes; retry does not duplicate completed steps; cancellation blocks subsequent dispatch; external write denied without exact approval.

## Phase D — First creator intelligence vertical slice
Deliver YouTube Data API read-only adapter, bounded channel/video ingestion, normalized records and evidence, transparent descriptive analytics, evidence-backed insight and one internal experiment plan.
Acceptance: quota bounded; every insight links to source records; missing values are not zero; provider failure visible/recoverable; no publishing/comments enabled.

## Phase E — Onboarding and validation
Deliver goal setup, source connection, demo workspace, first-scan progress, first-insight walkthrough, user feedback and instrumentation.
Acceptance: at least five target users complete onboarding without facilitation; interviews validate a repeated job; first-week return is measured.

## Phase F — Approved actions
Deliver approval inbox, exact-payload hash/expiry, internal plan execution, one external write only after provider review and outcome capture.
Acceptance: user sees target/payload/scope/consequences; payload edit invalidates approval; provider receipt recorded; duplicate action tests pass.

## Phase G — Specialist expansion
Add one capability at a time based on validated demand: content patterns, topic/trend discovery, competitor comparison, audience/community, strategy/experiments, production coordination, distribution and monetization intelligence. Each requires provider map, user outcome, evaluation set, budget, permission tier and support plan.

## Phase H — Multi-user readiness
Only after recurring value: workspace invitations/roles, client isolation, billing/usage plans, export/deletion UX, backup/restore drills, operational SLOs and incident response.

## First 30-day sequence (estimate, not a promise)
Week 1: stack spikes, schema and app shell. Week 2: command/run/task lifecycle and workflow runtime. Week 3: YouTube read-only adapter and evidence pipeline. Week 4: insight UX, onboarding, tests and first user validation. OAuth review and actual implementation time may change this schedule.

## Release gates
- Internal prototype: fixtures only.
- Private pilot: limited users, read-only provider, explicit consent, monitoring and manual support.
- Public release: security review, terms/privacy policy, support process, export/deletion, provider approvals, cost controls and operational readiness.