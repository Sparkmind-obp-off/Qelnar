# QELNAR One — Full-Agentic Product Blueprint

Version 1.1 · End-to-end system design · 2026-11-14

## Definition

A Full-Agentic Creator Intelligence OS coordinates a governed loop from natural-language intent to evidence, decision, work and measured outcome. It is not a single autonomous model. It is a system of deterministic services, bounded agents, approved tools, provider adapters, persistent state and human decision gates.

## One Command operating loop

1. **Command:** user states an outcome in natural language.
2. **Understand:** classify intent, resolve workspace, detect missing inputs and clarify only essential ambiguity.
3. **Plan:** create a typed plan with dependencies, source requirements, tools, estimated cost, permissions and deliverables.
4. **Preview:** show what will be read, what will be created, what may cost money and what requires approval.
5. **Authorize:** policy engine validates role, scopes, budgets, risk and exact approvals.
6. **Research:** approved adapters collect evidence and preserve provenance.
7. **Analyze:** deterministic calculations plus bounded model interpretation.
8. **Decide:** rank opportunities and expose uncertainty, alternatives and assumptions.
9. **Execute:** create internal plans/drafts automatically within policy; external side effects require exact-payload approval.
10. **Measure:** compare results to baseline and record outcomes.
11. **Learn:** update workspace knowledge and recommend next experiments, without silently changing policy.

## Agent system

Agents are versioned task workers:
- Command Router
- Research Planner
- Source Researcher
- Evidence Analyst
- Creator Strategist
- Experiment Planner
- Content Brief / Production Planner
- Quality & Citation Reviewer
- Operations / Cost Monitor

Agents do not own credentials, billing, workspace authorization or final approval. Those remain deterministic services.

## Core control plane

Command Gateway → Identity & Workspace → Intent Router → Planner → Policy Engine → Run Coordinator → Workflow Runtime → Tool Registry → Provider Adapters.

Cross-cutting services: Evidence Registry, Usage Ledger, Approval Service, Audit Log, Evaluation Harness, Notification/Delivery.

## State and persistence

D1 stores users/workspaces/memberships, connector metadata, commands, runs, tasks, approvals, evidence metadata, normalized metrics, usage and audit events. R2 stores permitted exports and large artifacts. Workflows stores durable execution checkpoints. Provider raw data is minimized and retained only as needed. Do not store scraped media by default.

## Full agentic does not mean unrestricted autonomy

Permission levels:
- H0 internal reasoning and drafts.
- H1 user approves connector access and collection.
- H2 user approves an internal plan or delegation.
- H3 user approves an exact external mutation (publish, comment, DM, spend, delete or account change).

Each action tool has a side-effect classification, allowed scopes, idempotency semantics, budget and rollback/compensation notes. Agents cannot grant themselves access or raise their permission tier.

## First useful product workflow

“Research my recent YouTube content, identify a pattern, and propose one experiment.”

This proves command intake, plan preview, official read-only ingestion, evidence provenance, deterministic metrics, model synthesis, plan approval and outcome tracking. Add TikTok/Instagram and public competitor research only after this loop is reliable.

## Product surfaces

- Command Center: compose, preview and observe runs.
- Intelligence: evidence-backed insights and comparisons.
- Plans & Experiments: owners, hypotheses, success metrics and due dates.
- Agents: available roles, versions, permissions, health and evaluations.
- Sources: connected accounts, public sources, scopes, freshness and disconnect.
- Approvals: exact payload, consequences, cost and audit history.
- Research Library: source records, reports and reusable findings.
- Governance: budget, retention, export, deletion and activity.

## Product quality bar

Every insight includes evidence, source, timestamp, comparison period, calculation method, confidence/caveat and suggested action. Every run shows plan, progress, outputs, cost, failure and approval state. Every recommendation is distinguishable from measured fact. Every external action is attributable to a human approval and provider receipt.
