# QELNAR One — Backend & API Contracts

Version 1.0 · Proposed contract · 2026-11-14

## API conventions
- Base path: /api/v1.
- JSON request/response bodies with Zod validation.
- Authenticated routes derive user and workspace identity from the verified session; never trust workspace_id supplied by the browser without membership validation.
- Every response includes request_id. Long-running commands return run_id and status.
- Use cursor pagination for potentially large lists.
- Use idempotency keys for command creation and provider mutations.
- Return stable error codes; never expose secrets or raw provider credentials.

## Core endpoints

### Identity and workspace
- GET /api/v1/me — current user and session summary.
- GET /api/v1/workspaces — workspaces accessible to current user.
- POST /api/v1/workspaces — create personal workspace.
- GET /api/v1/workspaces/:workspaceId — workspace metadata.
- PATCH /api/v1/workspaces/:workspaceId — update allowed metadata.

### Command and run
- POST /api/v1/workspaces/:workspaceId/commands — submit a command and create a draft/validated run.
- POST /api/v1/runs/:runId/preview — produce a plan preview without executing provider side effects.
- POST /api/v1/runs/:runId/execute — start an approved run.
- GET /api/v1/runs — list runs in current workspace.
- GET /api/v1/runs/:runId — run detail and current state.
- POST /api/v1/runs/:runId/cancel — request cancellation.
- POST /api/v1/runs/:runId/retry — retry eligible failed tasks only.

### Tasks and agents
- GET /api/v1/runs/:runId/tasks — ordered task graph.
- GET /api/v1/tasks/:taskId — task detail.
- GET /api/v1/agents — available agent definitions and capability metadata.
- GET /api/v1/agents/:agentId — agent detail and version.

### Approvals
- GET /api/v1/approvals — pending approvals for current workspace.
- GET /api/v1/approvals/:approvalId — exact action and payload preview.
- POST /api/v1/approvals/:approvalId/decision — approve, reject or defer.
- Approval decision must include the expected payload hash and cannot approve a changed payload.

### Sources
- GET /api/v1/providers — provider catalog and capability status.
- GET /api/v1/connections — connected accounts and health.
- POST /api/v1/connections/:providerId/oauth/start — initiate OAuth.
- GET /api/v1/connections/:providerId/oauth/callback — validated callback.
- POST /api/v1/connections/:connectionId/sync — start bounded read-only sync.
- DELETE /api/v1/connections/:connectionId — revoke/disconnect and schedule permitted data cleanup.

### Intelligence
- GET /api/v1/insights — evidence-backed insights.
- GET /api/v1/insights/:insightId — insight with evidence references.
- GET /api/v1/evidence/:evidenceId — source/provenance metadata.
- POST /api/v1/experiments — create an internal experiment from an approved recommendation.
- POST /api/v1/experiments/:experimentId/observations — record an outcome observation.

### Governance
- GET /api/v1/audit-events — authorized audit history.
- GET /api/v1/usage — usage and quota summary.
- POST /api/v1/workspaces/:workspaceId/emergency-stop — stop new orchestration and dispatch.
- POST /api/v1/data-export — request workspace export.
- POST /api/v1/data-deletion — request deletion workflow.

## Command request shape

Required fields:
- command_text: user request.
- intent_mode: analyze | plan | request_action.
- source_scope: selected connection/source IDs or empty for no external data.
- constraints: date range, record limit, max steps and budget ceiling where applicable.
- idempotency_key: unique per user submission.

Server derives:
- actor/user ID;
- workspace membership;
- policy tier;
- available provider scopes;
- effective budget and limits.

## Run response shape

Return:
- run_id;
- normalized_intent;
- plan_summary;
- status;
- tasks_preview;
- required_approvals;
- usage_estimate with estimate/unknown marker;
- created_at.

## Event model

Events are append-only and include:
- event_id, workspace_id, run_id, task_id (nullable);
- event_type and schema_version;
- actor_type (user, system, agent, provider);
- actor_id;
- occurred_at;
- correlation_id;
- sanitized payload reference.

Examples: command.received, run.validated, plan.created, approval.requested, approval.granted, task.queued, task.started, provider.requested, provider.succeeded, task.failed, run.completed, action.executed, outcome.recorded.

## Error taxonomy
- AUTH_REQUIRED
- WORKSPACE_FORBIDDEN
- VALIDATION_FAILED
- PROVIDER_NOT_CONNECTED
- PROVIDER_SCOPE_MISSING
- PROVIDER_RATE_LIMITED
- PROVIDER_QUOTA_EXCEEDED
- PROVIDER_UNAVAILABLE
- APPROVAL_REQUIRED
- APPROVAL_EXPIRED
- APPROVAL_PAYLOAD_MISMATCH
- BUDGET_EXCEEDED
- RUN_NOT_CANCELLABLE
- IDEMPOTENCY_CONFLICT
- INTERNAL_ERROR

## Security and operational requirements
- CSRF protection for cookie-authenticated state-changing requests.
- Strict CORS allowlist.
- Per-user/workspace rate limits.
- Request body size and schema limits.
- Redact tokens, secrets and sensitive provider fields from logs.
- Use request and correlation IDs across API, Workflow, database and provider adapter.
- Validate OAuth state, PKCE where supported, redirect URI and token audience/issuer.
- Return no provider secrets to the browser.
- Use server-side authorization on every route and background task.

## API versioning
Keep the first release at v1. Add fields compatibly where possible. Breaking changes require a new version or explicit migration. Persist schema_version for durable workflow payloads and provider snapshots so old runs remain interpretable.

## Provider, model and cost endpoints — extension

Add the following endpoints to the v1 contract as the provider catalog is implemented:

### Model policy
- GET /api/v1/models — allowed provider/model catalog, capabilities and pricing snapshot timestamp.
- GET /api/v1/model-policies — workspace-visible task routing policy.
- PATCH /api/v1/model-policies/:policyId — authorized model policy update; audit required.

### Research
- POST /api/v1/workspaces/:workspaceId/research/preview — build a bounded query/fetch plan without executing it.
- POST /api/v1/workspaces/:workspaceId/research/runs — start an approved research run.
- GET /api/v1/research/runs/:researchRunId — status, sources, usage and evidence.
- GET /api/v1/research/evidence — list evidence by source, run, date or topic.

### Usage and budgets
- GET /api/v1/workspaces/:workspaceId/budgets — current caps and reservations.
- PATCH /api/v1/workspaces/:workspaceId/budgets/:budgetId — update limits; owner/admin only.
- GET /api/v1/workspaces/:workspaceId/usage/ledger — paginated immutable usage entries.
- POST /api/v1/workspaces/:workspaceId/providers/:providerId/disable — emergency provider kill switch.

All preview and execution endpoints must return a maximum cost or an explicit unknown marker. The server must reserve budget before dispatch and reconcile actual usage after completion. Unknown-price paid operations are rejected unless a separately authorized operator override exists.
