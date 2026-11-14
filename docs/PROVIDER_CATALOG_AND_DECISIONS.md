# QELNAR One — Provider Catalog & Selection Matrix

Version 1.1 · Research snapshot · 2026-11-14

## Selection principles

Provider-agnostic architecture is mandatory. No provider gets privileged access to the product data model or workflow state. Select by capability, quality, legal/commercial permission, total cost, operational reliability, data handling, regional availability and exit path.

A listed provider is a candidate, not an activated integration. Prices and free allowances are point-in-time snapshots; re-check the provider's own pricing and terms before activation.

## Recommended initial provider portfolio

| Capability | Preferred starting choice | Alternative | Role |
|---|---|---|---|
| User authentication | Clerk (managed option) or Better Auth (self-hosted option) | Auth0 / Supabase Auth | End-user identity, not social account authorization |
| App runtime | Cloudflare Workers + Hono | Node.js container / Vercel Functions | API and command gateway |
| Operational DB | Cloudflare D1 + Drizzle | Managed PostgreSQL | Product state and audit metadata |
| Durable workflow | Cloudflare Workflows | Temporal / Trigger.dev after scale test | Durable agent/task execution |
| Object storage | Cloudflare R2 | S3-compatible provider | Reports and permitted artifacts |
| LLM gateway | Internal ModelGateway; Cloudflare AI Gateway optional | OpenRouter | Routing, budgets, provider abstraction |
| First LLM | Workers AI for bounded low-cost tasks; Groq for fast inference if its free limits fit | Gemini / OpenAI / Anthropic via BYOK | Reasoning, extraction, synthesis |
| Web search | Tavily | Brave Search / provider-native search | Search results and source discovery |
| Web crawl/extract | Firecrawl | Apify RAG Web Browser; Scrape.ly RAG Web Browser | Page extraction and crawl |
| Social/creator research | Official platform APIs first | Apify / Scrape.ly Actors | Optional public-data research |
| Monitoring | Structured logs + Cloudflare analytics | Sentry / Better Stack | Run tracing and errors |
| Product analytics | First-party event ledger | PostHog | Activation and product usage |

## Auth: Clerk vs Better Auth

Clerk is the managed-first candidate for the first customer-facing pilot when rapid sign-in, hosted components, account management and managed security updates outweigh vendor dependency. Its public pricing page currently advertises a Free tier up to 50,000 Monthly Retained Users (MRUs); Pro is listed at $20/month billed annually or $25/month monthly, with published overage rates. Pricing definitions and features must be checked at purchase time.

Better Auth is the self-hosted alternative when avoiding a per-user vendor bill and keeping identity data under QELNAR's control are more important. Its D1 integration and Cloudflare Worker compatibility must be validated in a real spike; do not assume a package's generic D1 support guarantees the exact Hono/Worker deployment works.

**Decision rule:** start with Clerk only after creating a QELNAR-specific application and verifying React/Vite frontend, Hono Worker JWT verification, production/preview separation, OAuth callbacks, session revocation and data export/deletion. Keep an AuthProvider boundary so migration to Better Auth is possible. Do not mix Clerk identity tokens with social platform OAuth tokens.

## LLM provider portfolio

- **Cloudflare Workers AI:** convenient near the Worker runtime. Official pricing currently shows 10,000 Neurons/day free; above that requires Workers Paid and is $0.011 per 1,000 Neurons. Model-level token costs vary. Good candidate for low-cost classification, extraction and compact summaries, subject to quality evaluation.
- **Cloudflare AI Gateway:** optional observability/routing layer, not an LLM. BYOK forwards provider credentials; Unified Billing requires prepaid credits and Cloudflare documents a 5% fee on purchased credits. Gateway spend limits support budgets for known-priced models. Gateway does not make underlying inference free.
- **GroqCloud:** candidate for fast inference and development. Free-tier rate limits are model- and organization-dependent and can change; confirm the current console limit table before relying on it. Paid Developer usage is pay-as-you-go. Do not assume free access is suitable for production SLAs.
- **OpenRouter:** broad model catalog and one API surface; model prices and free-model availability vary. Add only with per-model price allowlists, data policy review and hard spend caps.
- **Google Gemini / OpenAI / Anthropic:** quality or multimodal alternatives through direct provider adapters or AI Gateway. Enable only after model-specific cost, retention and evaluation review.

The application calls an internal `ModelGateway`, not a provider SDK directly from agents. It records provider, model ID, policy version, prompt/template version, input/output usage, cost, latency, retry/fallback and outcome.

## Search and research providers

- **Tavily:** preferred search API for agent-oriented discovery and extraction. Its current docs list Search basic at 1 credit/request and advanced at 2; Extract charges per successful URL group; Map/Crawl have separate credit formulas. The Researcher plan is listed at 1,000 credits/month free; paid tiers are listed separately. Use it for focused evidence gathering, not unlimited broad crawling.
- **Firecrawl:** preferred crawl/extraction candidate where page fidelity, crawl and structured extraction matter. Its pricing page currently advertises 1,000 free credits/month without a card; basic scrape/crawl/map, search and advanced extraction have different credit costs. Paid Hobby is listed at $19/month for 5,000 credits, with pay-as-you-go behavior and configurable monthly limits. QELNAR must disable automatic paid top-ups by default.
- **Brave Search:** secondary search adapter when independent result coverage or a second source is useful. Evaluate official API terms and rate limits before choosing a direct API or third-party Actor.
- **Apify RAG Web Browser / Scrape.ly RAG Web Browser:** optional search-plus-fetch alternatives. Compare actual cost and result quality against Tavily + Firecrawl before activation.

## Scraping catalog

See `SCRAPING_AND_SOCIAL_RESEARCH_ADAPTERS.md` for specific Actors, observed catalog pricing, risks and guardrails. Catalog discovery is not permission to run an Actor.

## Integration tiers

- **Tier 0 — Mock/demo:** fixtures only, no external credentials.
- **Tier 1 — Official read-only:** public API data or user-authorized account reads.
- **Tier 2 — External research:** search, crawl and public-page scraping, disabled until budget and policy approval.
- **Tier 3 — External writes:** publish, comment, DM, spend, delete or account change; individually reviewed and exact-payload approved.
- **Tier 4 — Enterprise/custom:** negotiated contracts, data residency, SLAs, audit and procurement.

## Decision record

No provider is active until credentials are supplied by the account owner, terms are reviewed, budgets are configured, test fixtures exist and the integration passes security/contract tests.
