# QELNAR One

**One Command. Total Intelligence.**

QELNAR One is the working product name for a **Full-Agentic Creator Intelligence Operating System**: a unified command center that helps creators and creator-led businesses observe their environment, understand what matters, decide what to do, coordinate execution, measure outcomes, and continuously learn.

> **Product principle:** one command center, many specialist agents, one governed operating system.

## Product identity

- **Brand:** QELNAR
- **Product:** QELNAR One
- **Category:** Full-Agentic Creator Intelligence OS
- **Core interface:** One Command Center
- **Positioning line:** One Command. Total Intelligence.
- **Independence:** QELNAR is an independent brand and project, separate from HOLBERY and AVORLUNE.

## What QELNAR One is

QELNAR One is not intended to be a collection of disconnected AI chatbots or a dashboard that only displays metrics. It is designed as an agentic operating layer that connects creator intelligence, strategy, workflows, production coordination, analytics, and business operations through a governed orchestration system.

The system is intended to support a continuous loop:

**Observe → Understand → Decide → Plan → Execute → Measure → Learn**

## Foundational principles

1. **One command surface:** users should have one coherent place to express goals, inspect work, approve actions, and understand outcomes.
2. **Orchestrated specialists:** specialist agents work under a central orchestrator; they do not become independent, uncontrolled authorities.
3. **Evidence before conclusions:** insights must identify their sources, timestamps, confidence, and limitations.
4. **Human control:** consequential external actions require explicit authorization and must be auditable.
5. **Provider-agnostic integrations:** use supported APIs and providers through replaceable adapters; never assume a connector is available until verified.
6. **Least privilege:** every integration receives only the permissions it needs.
7. **Cost-aware execution:** show estimated or known usage/cost before expensive work; do not trigger paid services without authorization.
8. **Modular evolution:** build a dependable core before adding specialist capabilities.
9. **Privacy and ownership:** connected accounts and data remain under the user's control; never use accounts or data without authorization.
10. **No fabricated intelligence:** the system must distinguish verified data, inference, recommendation, and unknowns.

## Initial build sequence

The project begins with product and architecture foundations, then a thin vertical slice:

1. Product charter, architecture, threat model, and delivery roadmap.
2. Repository conventions, environment strategy, and deployment decision.
3. Secure identity, workspace, permissions, audit trail, and command center shell.
4. Orchestrator runtime, task state machine, tool registry, approvals, and event history.
5. First read-only creator intelligence workflow using one authorized data source.
6. Evidence-backed insight and recommendation workflow.
7. Human-approved execution workflow.
8. Specialist agents and additional integrations, added incrementally.

## Current status

**Foundation / planning stage.** This repository is being established. No production system, integrations, credentials, or live automation should be assumed to exist until implemented and tested.

See the [documentation index](docs/README.md) for the complete product, customer, UX, architecture, stack, data, integration, metrics, implementation and governance specifications.

## Development rule

Do not build a broad feature surface before validating the core loop. Every implementation phase must have acceptance criteria, tests, operational limits, and a rollback path.
