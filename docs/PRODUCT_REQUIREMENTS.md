# QELNAR One — Product Requirements

Version 1.0 · Proposed MVP specification · 2026-11-14

## Product outcome
A creator can submit a question in one command surface, receive bounded evidence-backed analysis, understand the next action and control what happens next.

## Functional requirements

### Identity and workspace
- Sign-up, sign-in, session lifecycle and sign-out.
- Personal workspace by default.
- Server-side membership and authorization.
- Account and data deletion workflow.

### Command intake
- Accept natural-language command.
- Normalize intent into a validated command object.
- Require scope, date range and limits when relevant.
- Show a run preview before provider calls with material cost or permission implications.

### Orchestration
- Create run and task records.
- Build dependency graph.
- Enforce valid task transitions.
- Support retries, timeout, cancellation and idempotency.
- Store outputs as references, not unbounded blobs.
- Surface partial completion and failure.

### Intelligence
- Ingest a bounded source dataset.
- Normalize channel, content and metric records.
- Preserve source URL/ID, timestamps, provider, schema version and provenance.
- Generate insights only from accessible evidence.
- Distinguish fact, calculation, inference and recommendation.

### Approval and action
- Internal QELNAR actions may create plans and drafts.
- External side effects remain disabled until provider-specific tests pass.
- Approval is explicit, scoped and payload-bound.
- Record provider response/receipt and final outcome.

### Audit and cost
- Append audit events for privileged operations.
- Record API quota, model usage and provider charges where exposed.
- Label estimates and unknown costs distinctly.
- Enforce per-run and workspace limits.

## MVP vertical slice
Command: “Analyze my recent YouTube videos and recommend one experiment.”
1. User provides channel ID/URL or connects an authorized account.
2. System resolves channel and retrieves bounded recent public video metadata.
3. System normalizes records and stores evidence provenance.
4. Analytics computes transparent descriptive metrics.
5. Insight agent summarizes patterns with evidence references.
6. Strategy agent proposes one experiment.
7. User approves saving it as an internal plan.
8. System records the plan and follow-up measurement window.

First slice is read-only against YouTube. Publishing is excluded.

## Non-functional requirements
Security: no secrets in browser bundles or repository. Isolation: workspace checks on every query. Reliability: idempotent run creation and ingestion. Observability: correlation ID per command/run/task. Performance: shell loads independently of background analysis. Cost: bounded requests, tokens, retries and dataset size. Portability: provider adapters and model interface are replaceable. Accessibility: WCAG 2.2 AA target. Privacy: purpose limitation, minimization, export and deletion.

## MVP acceptance criteria
- User can sign in and create a personal workspace.
- User submits a command and sees interpreted intent.
- User previews source scope and limits.
- One read-only provider workflow completes.
- Every insight links to evidence and timestamps.
- Run/task state survives worker restart.
- Retry does not duplicate completed ingestion.
- External writes are denied without exact approval.
- Audit records command, run, provider call and approval.
- Demo mode is clearly labelled and uses sample data.

## Exclusions
No autonomous public publishing, DMs, ad spend, paid scraping, bulk creator harvesting, private data access without OAuth consent, vector database, billing or enterprise multi-tenant controls in the first release.