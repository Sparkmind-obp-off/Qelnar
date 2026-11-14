# QELNAR One — Decision Log

Date: 2026-11-14

## ADR-001 — One Command Center is the primary experience
Decision: one command center with run/task visibility, evidence inspection and approvals. A dashboard-only product does not coordinate decisions and work. Revisit if observed user workflows prove another primary surface.

## ADR-002 — Orchestrator owns execution authority
Decision: specialist agents are bounded workers; only orchestrator and policy engine dispatch registered tools. This protects permission boundaries and auditability.

## ADR-003 — Cloudflare-first modular monolith
Decision: start with React/Vite, Hono Workers, D1/Drizzle, R2 and Workflows. Revisit if technical spikes show limits or measured costs favor another stack.

## ADR-004 — Better Auth is the initial auth candidate
Decision: test Better Auth with D1 before selecting a managed vendor. Better Auth 1.5 documents native D1 support. If Worker compatibility, session security or OAuth callback reliability is unacceptable, evaluate Clerk as managed fallback.

## ADR-005 — YouTube Data API is the first provider
Decision: start with read-only YouTube public channel/video metadata. Official quota model and bounded data scope make it tractable. Revisit if interviews show a stronger initial need elsewhere or access is blocked.

## ADR-006 — No paid scraping in MVP
Decision: Apify and Scrape.ly remain optional, catalogued adapters disabled by default. No paid Actor run without explicit approval. Core product must not depend on uncertain cost or unverified access/commercial permissions.

## ADR-007 — Read-only before external writes
Decision: external writes remain disabled until provider-specific action is tested and protected by exact-payload approval. Each write capability requires separate review; no blanket permission.