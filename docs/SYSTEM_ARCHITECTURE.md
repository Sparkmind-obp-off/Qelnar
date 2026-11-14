# QELNAR One — System Architecture

**Status:** Proposed architecture · v0.1 · 2026-11-14  
**Decision state:** Technology choices remain provisional until a small technical spike validates platform limits, cost, and operational fit.

## 1. Architecture goals

- One coherent command center over modular services.
- Agentic orchestration with explicit task state and bounded authority.
- Replaceable provider integrations.
- Durable execution, retries, idempotency, and auditability.
- Evidence provenance for every material intelligence claim.
- Secure multi-workspace boundaries, even if the first deployment has one operator.
- Cost-aware, observable operation suitable for a low-upfront-cost build.

## 2. Logical architecture

```text
User
  |
  v
QELNAR One Command Center
  |
  +--> Identity / Workspace / Policy
  |
  +--> Command Gateway
          |
          v
      Orchestrator
          |
          +--> Planner
          +--> Task State Machine
          +--> Agent Registry
          +--> Tool / Connector Registry
          +--> Approval Gate
          +--> Event & Audit Log
          |
          v
      Specialist Agents
          |
          +--> Creator & Channel Intelligence
          +--> Content Intelligence
          +--> Audience Intelligence
          +--> Trend & Market Intelligence
          +--> Competitor Intelligence
          +--> Performance Intelligence
          +--> Strategy & Opportunity
          +--> Production & Distribution
          |
          v
      Provider Adapters / APIs / Approved Data Sources
          |
          v
      Normalized Data + Evidence + Results
```

The diagram describes logical boundaries, not a requirement to deploy every box as a separate service.

## 3. Core planes

### A. Experience plane
- Command center home.
- Command composer and structured task views.
- Intelligence feed and evidence inspection.
- Approval inbox.
- Agent/task activity and run history.
- Workspace settings and connected-source management.

### B. Control plane
- Identity and session management.
- Workspace and role policy.
- Command validation and authorization.
- Agent registry and capability declarations.
- Tool registry and permission scopes.
- Approval policies and spend limits.
- Audit events and administrative controls.

### C. Orchestration plane
- Intent normalization.
- Planning and task decomposition.
- Dependency graph and task state machine.
- Agent dispatch and result validation.
- Retry, timeout, cancellation, and idempotency.
- Human approval checkpoints.
- Run-level budget and usage enforcement.

### D. Intelligence plane
- Source ingestion.
- Normalization and entity resolution.
- Evidence and provenance storage.
- Time-series and comparative analysis.
- Insight generation with confidence and caveats.
- Recommendation and outcome evaluation.

### E. Integration plane
- Provider-specific adapters.
- OAuth 2.0 authorization where supported.
- Token refresh and revocation.
- Rate-limit handling and provider-specific terms.
- Read/write capability separation.
- Contract tests and adapter health checks.

## 4. Orchestrator contract

The orchestrator is the system's control authority. Specialist agents are workers with declared capabilities, not unrestricted peers.

Every agent declaration should include:
- Stable agent ID and version.
- Purpose and allowed task types.
- Input/output schema.
- Permitted tools and data scopes.
- Read/write classification.
- Maximum runtime, retries, and token/tool budget.
- Required approval level.
- Data retention classification.
- Failure and compensation behavior.

Every run should have:
- Run ID and initiating user/workspace.
- Original command and normalized intent.
- Plan version and task graph.
- Agent/tool invocations.
- Input/output references.
- Evidence references.
- Approval records.
- Usage/cost records where measurable.
- Final status and timestamps.

## 5. Task lifecycle

Suggested states:

```text
draft
  -> validated
  -> planned
  -> awaiting_approval (when required)
  -> queued
  -> running
  -> succeeded | failed | cancelled | needs_attention
```

Rules:
- State transitions must be validated server-side.
- A retry must be distinguishable from a new run.
- External side effects require idempotency keys where supported.
- A cancelled task must not continue dispatching new work.
- Approval must bind to a specific action payload/version, not a vague general permission.
- Partial completion must be visible and recoverable.

## 6. Data model (initial logical entities)

- User
- Workspace
- WorkspaceMember
- ConnectedAccount
- Provider
- CredentialReference
- AgentDefinition
- ToolDefinition
- Command
- Run
- Task
- TaskDependency
- ApprovalRequest
- ApprovalDecision
- EvidenceItem
- Insight
- Recommendation
- ActionRecord
- UsageRecord
- AuditEvent

Use immutable event records for consequential decisions and external actions. Mutable projections may be derived for efficient UI queries.

## 7. Technology direction

The first deployment should favor a low-upfront-cost, managed architecture and avoid unnecessary infrastructure. Cloudflare is a candidate direction based on project constraints, but each service must be validated before commitment.

Potential mapping, subject to technical spike:
- Web application: React + TypeScript.
- Edge/API layer: Cloudflare Workers.
- Relational metadata: Cloudflare D1 or another database selected after concurrency/query needs are tested.
- Object storage: R2 for permitted files and artifacts.
- Async jobs: Queues and/or Workflows after validating delivery, retry, and duration semantics.
- Coordination: Durable Objects only where strongly consistent coordination is needed.
- Secrets: encrypted server-side secret storage; never browser storage or repository files.
- Observability: structured logs, correlation IDs, error tracking, and cost/usage ledger.

Do not select a database or orchestration primitive solely because it is available. Validate limits, backups, migrations, regional behavior, pricing, and recovery.

## 8. Integration contract

Every provider adapter must document:
- Official API and documentation URL.
- Supported read and write capabilities.
- OAuth scopes and consent screens.
- Rate limits and pagination behavior.
- Data freshness and retention limits.
- Terms/commercial-use restrictions.
- Cost or quota model.
- Error mapping and retry policy.
- Test fixtures and contract tests.

Start read-only. Enable writes one action class at a time behind explicit approvals.

## 9. Security boundaries

- Browser clients never receive provider secrets.
- Every request is authenticated and workspace-authorized.
- Credentials are encrypted and scoped to the minimum required permissions.
- Tool execution is allowlisted, schema-validated, and server-side.
- Agents cannot grant themselves new permissions.
- Untrusted provider content is data, never executable instruction.
- Sensitive actions require user confirmation.
- Audit logs record who authorized what, against which payload, and when.
- Data export and deletion paths must be designed before broad data ingestion.

## 10. Deployment shape

Keep the initial deployment as a modular monolith where practical:
- One frontend.
- One API/control service.
- One orchestrator runtime.
- A small number of durable data stores.
- Provider adapters isolated behind interfaces.

Split services only when scale, reliability, security isolation, or team ownership justifies it.

## 11. Architecture decisions still open

- Single-user pilot versus multi-tenant from day one.
- Exact identity provider and OAuth callback strategy.
- D1 versus alternative relational storage.
- Queue/workflow runtime and retry semantics.
- First creator data provider.
- Evidence storage granularity and retention.
- LLM/provider routing and budget enforcement.
- Deployment and preview/prod separation.

Resolve these with short decision records and technical spikes, not assumptions.
