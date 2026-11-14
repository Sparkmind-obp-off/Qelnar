# QELNAR One — Technology Stack Decision

Version 1.0 · Recommended baseline, pending technical spike · 2026-11-14

## Decision summary
Adopt a Cloudflare-first modular monolith. Use React/Vite for the application, Hono on Workers for the API, D1 with Drizzle for transactional metadata, R2 for larger artifacts and Cloudflare Workflows for durable multi-step orchestration. Keep provider and model integrations behind interfaces.

This is a recommendation, not a claim that the app is implemented or that every service is free at every usage level.

## Recommended stack

| Layer | Recommendation | Reason |
|---|---|---|
| Frontend | React + TypeScript + Vite | Fast iteration and static deployment |
| UI | Tailwind CSS + Radix UI / shadcn/ui | Accessible primitives and design tokens |
| Routing | React Router or TanStack Router | Choose one; avoid overlapping routers |
| Server state | TanStack Query | Cache, retries and invalidation |
| Forms/schema | React Hook Form + Zod | Consistent runtime validation |
| Charts | Recharts | Early time-series and comparisons |
| API | Hono on Cloudflare Workers | Small typed HTTP layer |
| Database | Cloudflare D1 + Drizzle ORM | Managed SQLite with low ops overhead |
| Durable orchestration | Cloudflare Workflows | Persisted steps, retries, pauses and external events |
| Async fan-out | Cloudflare Queues, only when needed | Decouple independent ingestion events |
| Object storage | Cloudflare R2 | Reports, exports and permitted artifacts |
| Auth candidate | Better Auth with D1 | Better Auth 1.5 documents native D1 support |
| Tests | Vitest + Workers test tooling | Unit, contract and integration tests |
| Browser tests | Playwright | Onboarding and approval E2E |
| Monitoring | Structured logs; add Sentry/equivalent after cost review | Trace runs and provider failures |

## Why this stack
It aligns with the Cloudflare-first direction, avoids a separate app server and queue cluster, uses durable Workflows for user-visible multi-step jobs and keeps business logic portable through Hono, Drizzle and adapters.

## Important decision gates

### D1
Use D1 for bounded operational metadata in the first release. Test transactions, query plans, database size, migrations, backups/restores and tenant isolation. Do not store large raw media or unbounded provider payloads in D1. Use R2 for permitted artifacts and keep references/hashes in D1.

If concurrency, analytics volume or query needs exceed measured D1 capability, move the transactional core to managed PostgreSQL behind a repository interface.

### Workflows vs Queues
Use Workflows for a user-visible multi-step run with retries, checkpoints and approval waits. Add Queues only for independent fan-out ingestion or event processing. Do not build a custom job engine over both at the start.

### Durable Objects
Do not introduce Durable Objects in v0.1. Add them only if live collaboration, per-workspace coordination, WebSocket state or strongly consistent rate limiting proves necessary.

### Authentication
Better Auth is the initial candidate because its 1.5 release documents native D1 support and Hono integrations. Validate current Worker/D1 compatibility, session storage, OAuth callback, CSRF, key rotation and migrations in a spike. If brittle, use Clerk as managed alternative and record its cost/lock-in trade-off.

Social account OAuth is separate from user sign-in. Google login does not grant YouTube or TikTok analytics permission.

### LLM provider
Define a ModelGateway with replaceable provider adapters, task-level model policy, timeouts, token budgets, structured output validation and fallback. Choose vendors only after comparing current prices, data policy, latency, regional availability and quality on a fixed evaluation set.

## Proposed repository structure

- apps/web — React + Vite application.
- apps/worker — Hono API and Cloudflare entrypoint.
- packages/contracts — Zod schemas and shared types.
- packages/database — Drizzle schema, migrations and repositories.
- packages/orchestrator — planner, task lifecycle and policy.
- packages/agents — versioned specialist agent definitions.
- packages/providers — social and data adapters.
- packages/model-gateway — LLM routing and usage tracking.
- packages/ui — shared design system.
- docs — product, architecture and governance documentation.

Start as a simpler single app with clear module boundaries if a pnpm workspace adds more overhead than value.

## Environment strategy
- Local: fixtures and mock providers; no production credentials.
- Preview: separate D1 database, R2 bucket, OAuth app/callback and secrets.
- Production: separate resources, least-privilege credentials and explicit deploy gate.
- Never share preview and production OAuth refresh tokens.
- Seed only synthetic demo data in preview.

## Cost posture
Workers Free has published daily request and CPU limits; D1, Workflows and other services have separate quotas and plan rules. Re-check official pricing before production. Do not enable paid plans or third-party APIs without approval.

## Required technical spikes
1. Hono + Better Auth + D1 auth round-trip.
2. Drizzle migrations and D1 transaction behavior.
3. Workflows create/run/pause/resume/cancel and approval wait.
4. OAuth callback and encrypted refresh-token storage.
5. YouTube API quota tracking and bounded ingestion.
6. Preview/production isolation and secret handling.