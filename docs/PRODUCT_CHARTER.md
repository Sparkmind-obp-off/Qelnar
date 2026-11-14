# QELNAR One — Product Charter

**Status:** Working charter · v0.1 · 2026-11-14

## 1. Vision

Create one trusted operating environment where a creator or creator-led business can understand its audience, content, market, opportunities, and performance, then coordinate the next best actions through governed AI agents.

## 2. Mission

Turn fragmented creator data and repetitive creator-business workflows into an evidence-led, coordinated operating loop.

## 3. The problem

Creators and small creator-led teams often work across disconnected social platforms, analytics views, research tools, spreadsheets, production tools, and publishing workflows. This fragmentation makes it difficult to answer:

- What is happening across my creator ecosystem?
- Why is it happening?
- Which audience, content, market, or competitor signals matter?
- What should I do next, and why?
- Which tasks can be safely delegated to agents?
- What changed after an action, and did it work?

QELNAR One aims to connect these questions without pretending that every platform exposes the same data or permits the same actions.

## 4. Target users

Initial target:
- Independent creators.
- Faceless and niche content operators.
- Creator-led small businesses.
- Small creator teams managing multiple channels or content brands.

The first release should optimize for one operator managing a small number of creator identities and connected accounts. Enterprise complexity is out of scope for the first vertical slice.

## 5. Product promise

**One command center to turn creator signals into informed, controlled action.**

The product should help a user:
- Gather authorized creator, content, audience, market, and performance signals.
- Organize signals into a coherent intelligence picture.
- Explain findings with evidence and confidence.
- Prioritize opportunities and risks.
- Generate plans and assign work to specialist agents.
- Review and approve consequential actions.
- Measure results and feed outcomes back into future decisions.

## 6. Product boundaries

QELNAR One is:
- An intelligence and orchestration operating system.
- A unified command and approval surface.
- A coordinator of specialist agents and external tools.
- A system of record for tasks, decisions, evidence, approvals, and outcomes.

QELNAR One is not initially:
- A replacement for every social platform's native analytics.
- A promise of unrestricted scraping or platform access.
- An autonomous publisher that can post, message, spend, or modify accounts without user authorization.
- A foundation-model training company.
- A guarantee of growth, virality, revenue, or platform outcomes.

## 7. Core operating loop

1. **Observe:** collect permitted signals from connected sources.
2. **Understand:** normalize, contextualize, and compare signals.
3. **Decide:** rank opportunities and risks with reasons and confidence.
4. **Plan:** translate a selected objective into tasks, dependencies, and checkpoints.
5. **Execute:** route approved tasks to agents, tools, or the user.
6. **Measure:** compare expected and actual outcomes.
7. **Learn:** retain appropriate, permissioned operational knowledge and update recommendations.

Every stage must preserve provenance: where the information came from, when it was collected, and what transformations or inferences were applied.

## 8. Capability domains

These are capability domains, not a commitment to build every module in the first release.

- Creator identity and workspace management.
- Social account and channel inventory.
- Content library and content intelligence.
- Audience and community intelligence.
- Trend and topic intelligence.
- Competitor and market intelligence.
- Performance and growth analytics.
- Strategy and opportunity planning.
- Content brief and production coordination.
- Publishing and distribution orchestration.
- Creator business operations and monetization intelligence.
- Agent and workflow operations.

## 9. First release: thin vertical slice

The first meaningful release must prove one complete, safe workflow:

**Connect one authorized read-only source → collect a bounded dataset → normalize and store provenance → produce an evidence-backed insight → propose a next action → obtain approval → record the decision and outcome.**

Do not start by implementing every capability domain. The first source and workflow must be selected after API access, cost, terms, and data quality are verified.

## 10. Product success criteria

The first release is successful when:
- A user can understand the system's current state from one command center.
- A read-only intelligence workflow runs end-to-end and can be repeated.
- Every insight links to its underlying evidence.
- The orchestrator can create, track, retry, and stop tasks safely.
- External write actions are blocked unless an explicit approval is recorded.
- The user can inspect task history, costs/usage where available, and failures.
- The system can recover from partial failure without duplicating external actions.

## 11. Non-goals for the first release

- Do not build dozens of agents before the orchestrator is reliable.
- Do not promise universal platform integrations.
- Do not implement autonomous posting, DMs, ad spend, purchases, or account changes.
- Do not store third-party credentials in source code or client-side bundles.
- Do not run paid data collection or provider calls without explicit user authorization.
- Do not use unapproved scraping methods or bypass platform controls.

## 12. Product language

Use:
- One Command Center
- Full-Agentic Creator Intelligence OS
- Specialist agents
- Evidence-backed intelligence
- Human-approved execution

Avoid describing the product as fully autonomous until each action class has explicit policy, authorization, observability, and recovery controls.
