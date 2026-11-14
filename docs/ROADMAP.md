# QELNAR One — Delivery Roadmap

**Status:** Initial roadmap · v0.1 · 2026-11-14

The roadmap is outcome-led. A phase is complete only when its acceptance criteria are demonstrated; a checklist of code files is not proof of a working system.

## Phase 0 — Product and technical foundation
**Goal:** make the product buildable without premature implementation choices.

Deliverables:
- Product charter.
- Logical architecture and agent contract.
- Threat model and authorization policy.
- Repository conventions and decision log.
- Technical spikes for hosting, persistence, async execution, identity, and first data source.

Exit criteria:
- First vertical-slice workflow is specified.
- Chosen stack is supported by documented constraints and cost assumptions.
- Preview and production environments are separated.
- No credentials or paid services are required to run the local baseline.

## Phase 1 — Secure command center shell
**Goal:** provide one reliable place to control the system.

Deliverables:
- Application shell and navigation.
- Authentication and workspace boundary.
- Command/task inbox.
- Run history and status.
- Approval inbox shell.
- Server-side authorization and audit foundation.

Exit criteria:
- Unauthenticated access is blocked where required.
- Workspace access is tested.
- No secrets appear in client bundles or logs.
- User can inspect commands, tasks, and run status.

## Phase 2 — Orchestrator core
**Goal:** execute bounded internal workflows reliably.

Deliverables:
- Command schema and validation.
- Agent/tool registry.
- Planner and task graph.
- Durable task state machine.
- Retry, cancellation, timeout, and idempotency controls.
- Run budget and usage tracking.
- Approval gate and audit events.

Exit criteria:
- A multi-step internal workflow completes end-to-end.
- Failed tasks can be retried without duplicate side effects.
- Cancellation prevents further dispatch.
- Write-capable tools are denied without valid approval.

## Phase 3 — First Creator Intelligence vertical slice
**Goal:** prove evidence-backed intelligence from one authorized source.

Deliverables:
- One verified provider adapter in read-only mode.
- Bounded ingestion and pagination.
- Normalized content/channel records.
- Evidence provenance and freshness.
- One useful insight with transparent reasoning and limitations.

Exit criteria:
- User explicitly authorizes the source connection.
- Data is fetched within documented limits and terms.
- Every insight is traceable to evidence.
- Quotas, errors, and data freshness are visible.

## Phase 4 — Strategy and controlled execution
**Goal:** convert insight into an approved action plan.

Deliverables:
- Opportunity and priority model.
- Strategy/planning agent.
- Task assignment to specialist agents.
- Approval-bound action payload.
- One low-risk write action, only if provider API and terms permit it.
- Outcome capture.

Exit criteria:
- User sees what will happen before approving.
- Approval is bound to the exact action payload.
- Action result and provider response are recorded.
- Duplicate execution is prevented where provider capabilities allow.

## Phase 5 — Specialist capability expansion
**Goal:** add creator intelligence domains incrementally.

Potential sequence:
- Content and format intelligence.
- Audience/community intelligence.
- Trend and topic intelligence.
- Competitor and market intelligence.
- Performance and growth intelligence.
- Production and distribution coordination.
- Monetization and creator business intelligence.

Each module must have a clear user outcome, data source, evidence model, permission model, and cost boundary before implementation.

## Phase 6 — Reliability, scale, and ecosystem
**Goal:** mature the system after the core loop is proven.

Potential work:
- Multi-workspace administration.
- More provider adapters.
- Advanced analytics and comparisons.
- Workflow templates and reusable playbooks.
- Data export and deletion tooling.
- Backups, recovery exercises, and operational SLOs.
- Billing/usage controls if the product becomes multi-user.

## Priority rule

A reliable command → evidence → approval → action → outcome loop is more valuable than a large dashboard full of disconnected modules. Build vertically, test continuously, and expand only when the previous phase is stable.
