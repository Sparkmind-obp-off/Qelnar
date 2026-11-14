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

## ADR-008 — SaaS with optional assisted service

Decision: QELNAR One is a self-serve SaaS product with optional fixed-scope onboarding/research assistance. It is not an agency or freelancer marketplace. Packaging and pricing remain hypotheses until customer interviews and pilot usage validate willingness to pay and gross margin. See `SERVICE_VS_SAAS_PRODUCT_MODEL.md`.

## ADR-009 — Managed-first auth candidate with portable boundary

Decision: Clerk is the managed-first candidate for the first customer-facing pilot if the Worker verification and pricing/security spike passes. Better Auth remains the self-hosted alternative. All business logic depends on an internal AuthProvider interface. This supersedes ADR-004's default-first selection of Better Auth. See `AUTHENTICATION_AND_IDENTITY.md`.

## ADR-010 — ModelGateway, not a fixed LLM vendor

Decision: build a provider-agnostic ModelGateway and evaluate Workers AI, Groq, OpenRouter and direct model APIs. Cloudflare AI Gateway is optional and does not replace the model provider or make inference free. See `MODEL_GATEWAY_AND_LLM_STRATEGY.md`.

## ADR-011 — Search and extraction are separate adapters

Decision: Tavily is the initial bounded search candidate; Firecrawl is the initial crawl/extraction candidate. Apify RAG Web Browser, Scrape.ly RAG Web Browser and Brave are optional alternatives after cost/quality tests. See `SEARCH_AND_WEB_RESEARCH_PROVIDERS.md`.

## ADR-012 — Explicit cost ledger and zero paid-by-default policy

Decision: paid LLM, search, extraction, Actor, proxy, storage and platform usage must have preflight estimates, hard caps and an approval record. Unknown cost blocks autonomous execution. No auto top-up, subscription upgrade or paid Actor run. See `COST_LEDGER_AND_USAGE_GOVERNANCE.md`.

## ADR-013 — Provider catalog is discovery, not activation

Decision: a provider or Actor appearing in the catalog does not mean it is connected, compliant for a specific use, or authorized to run. Every adapter requires due diligence, terms review, credential setup, contract tests and a kill switch.
