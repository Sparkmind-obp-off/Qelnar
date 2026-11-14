# QELNAR One — Data Model & Storage Architecture

Version 1.0 · Proposed logical schema · 2026-11-14

## Storage strategy
- D1: workspace, connections, commands, runs, tasks, approvals, normalized records, evidence references and audit metadata.
- R2: large exports, reports, permitted media artifacts and raw response snapshots only where retention is allowed.
- Workflow state: Cloudflare Workflows durable checkpoints; reference run IDs in D1.
- Search: start with indexed relational queries and keyword search. Add a search/vector service only after retrieval needs are measured.
- Do not mirror raw media by default. Store source URLs and metadata unless the user requests an artifact and rights/terms allow storage.

## Entity groups

### Identity and tenancy
users, workspaces, workspace_members, invitations (later), workspace_roles, user_preferences.

### Provider and credentials
providers, provider_capabilities, connected_accounts, credential_refs, oauth_states, sync_cursors, provider_quota_snapshots.

### Creator intelligence
creator_profiles, channels, content_items, content_metrics, audience_snapshots (only where permitted), topic_entities, competitor_entities, source_evidence, insight_records, recommendation_records, experiments, experiment_observations.

### Agentic operations
agent_definitions, agent_versions, tool_definitions, commands, runs, tasks, task_dependencies, approval_requests, approval_decisions, action_records, workflow_events, usage_records, audit_events.

## Critical field conventions
Every tenant-owned row includes workspace_id. Use composite foreign keys or repository-level tenant scoping so changing an ID cannot expose another workspace's record.

Every source-backed record should include provider_id, connected_account_id or public-source reference, external_id, source_url when available, source timestamps, collected_at, data-window bounds, schema_version, raw_payload_ref or payload_hash where permitted, provenance and completeness status.

Metrics include metric_name, value, unit, denominator/context, observed_at and source. Never compare views, reach, impressions or engagement rates across providers without documented definitions.

## Suggested uniqueness and indexes
- Unique connected account per workspace/provider/external account ID.
- Unique content item per provider/external content ID within source identity.
- Unique metric observation by content_id + metric_name + observed_at + source snapshot.
- Index workspace_id + created_at on commands, runs, insights and audit events.
- Index run_id + task state on tasks.
- Index workspace_id + provider_id + sync status on connected accounts.
- Index evidence IDs referenced by insights and recommendations.

## Data lifecycle
Collect minimum fields for a declared purpose; normalize and preserve provenance; retain source payloads only when terms and consent allow; define retention by data class; support export, disconnect/revocation and deletion; document any legally required audit retention.

## Data quality rules
- Missing is not zero.
- Stale is not current.
- Estimates are labelled.
- Deduplicate by stable provider IDs, not captions alone.
- Aggregations store formula/version and source record set.
- Derived insights link to the exact evidence snapshot.
- Preserve conflicting observations with timestamps.

## Analytics evolution
D1 is acceptable for the first bounded operational dataset. Do not turn it into a warehouse by default. If time-series volume, concurrency or complex joins become a bottleneck, add an analytical store or managed PostgreSQL/warehouse behind an interface based on benchmark results.