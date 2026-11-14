# QELNAR One — Agentic Runtime & Orchestration

Version 1.0 · Proposed runtime contract · 2026-11-14

## Design rule
The orchestrator owns execution authority. Agents reason within declared scopes; tools perform bounded operations. No agent may bypass policy, invent tool access or approve its own external action.

## Core components
1. Command Gateway — authenticates, validates and normalizes intent.
2. Intent Router — classifies the job and selects an approved workflow template.
3. Planner — creates a typed plan and dependency graph.
4. Policy Engine — checks role, scope, permission tier, budget and risk.
5. Agent Registry — stores versioned agent definitions and allowed task types.
6. Tool Registry — stores schemas, adapter, scopes, side-effect class and cost model.
7. Run Coordinator — creates durable workflow and task records.
8. Approval Service — binds user decisions to exact action payloads.
9. Evidence Service — validates provenance and source references.
10. Usage & Audit Ledger — records provider/model usage, state changes and actions.

## Agent classes
- Router: classify intent; no external write tools.
- Research: gather authorized evidence from registered sources.
- Analyst: calculate and interpret metrics; cite evidence IDs.
- Strategy: prioritize opportunities and propose experiments.
- Planner: decompose approved goals into tasks.
- Production coordinator: create briefs, scripts and asset checklists.
- Quality/evaluation: validate schema, citations, safety and completeness.
- Operations: inspect runs, quotas and provider health.

## Agent definition contract
Each version declares id/version/owner, purpose, task types, input/output schema, allowed tools and data scopes, permission tier, model policy and token/tool budget, timeout/retry/concurrency limits, approval requirement, retention/logging rules, evaluation suite and minimum acceptance threshold.

## Workflow lifecycle
RECEIVED → AUTHENTICATED → VALIDATED → PLANNED → POLICY_CHECKED → AWAITING_APPROVAL (if required) → QUEUED → RUNNING → SUCCEEDED / FAILED / CANCELLED / NEEDS_ATTENTION.

Store transitions in D1 as append-only run events. Cloudflare Workflows provides durable checkpoints; D1 remains the product system of record for commands, runs, tasks, approvals and evidence.

## Planner output contract
- Normalized goal and assumptions.
- Missing inputs.
- Selected workflow template.
- Tasks and dependencies.
- Required sources and tool scopes.
- Estimated usage or unknown.
- Approval gates.
- Expected deliverables.
- Failure and rollback notes.

The planner does not execute tools. Policy validates the plan before dispatch.

## Tool execution contract
Every call passes user/workspace authorization, allowlist check, schema validation, scope check, budget/quota check, idempotency key creation, timeout/retry policy, output sanitization, evidence registration and audit event creation.

External writes require an approval record bound to the exact payload hash. Any changed payload requires new approval.

## Human-in-the-loop levels
- H0: internal analysis and draft creation.
- H1: user confirms source connection and data collection.
- H2: user approves internal plan or task delegation.
- H3: user approves a specific external side effect such as publish, comment, DM, account change, spend or delete.

No blanket approval for future H3 actions.

## Reliability
- Idempotency key per command and provider mutation.
- Handle at-least-once delivery safely.
- Bounded retries with backoff and provider Retry-After support.
- Check cancellation between steps.
- Dead-letter or needs-attention state after exhausted failures.
- Never retry a non-idempotent write without provider confirmation.
- Preserve partial outputs with completeness markers.
- Workspace and global emergency stop.

## Agent evaluation
Before enabling an agent, test golden tasks, schema validity, evidence coverage, unsupported claims, tool selection, permission boundaries, prompt injection, cost/latency and human acceptance. Agent output is a proposal until validated; it is never the source of truth for a platform metric.