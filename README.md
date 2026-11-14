# QELNAR One

**One Command. Total Intelligence.** — Full-Agentic Creator Intelligence OS (SaaS + Creator Intelligence as a Service), Indonesia-first.

## URLs
- **Production (Cloudflare Pages, BYOK):** https://qelnar-one.pages.dev
- **Custom domain:** https://qelnar.biz.id — attached to the Pages project, **waiting for DNS CNAME** (see Deployment)
- **Health:** `/api/health` → `{"db":true,"auth":"clerk_production"}`
- **GitHub:** https://github.com/Sparkmind-obp-off/Qelnar

## Implemented
| Area | Status |
|---|---|
| Clerk Production auth, **Google OAuth only** (custom `authenticateWithRedirect` flow, `/sso-callback`) | ✅ code + backend JWT verification (JWKS, issuer, authorized parties) |
| Protected frontend routes (`/app/*`) and backend (`/api/v1/*`) | ✅ 401 on missing/invalid token (verified in production) |
| User sync (Clerk → D1), AuthProvider abstraction (frontend + backend) | ✅ |
| Workspaces, onboarding, RBAC (owner/admin/member/viewer), invites, isolation (cross-tenant = 404) | ✅ tested |
| Command Center: Intent Router → Planner → Policy Engine → Agent/Tool Registry → Run Coordinator | ✅ |
| Durable runs (D1 state, lease lock, retry, resume on poll), approvals H0–H3 (no blanket approval) | ✅ |
| Evidence service (URL, provider, timestamp, sha256), cited reports, measurement, learning memory, feedback | ✅ |
| Providers: Tavily (search), Firecrawl (extract), Workers AI Llama 3.3 70B (synthesis) + extractive fallback | ✅ live in production |
| Apify / Scrape.ly | 🔒 keys stored as secrets, **disabled** — require owner approval of cost |
| Usage ledger, per-run budget, monthly credit/run caps, provider monthly USD caps | ✅ |
| Plans & entitlements (Trial/Solo/Pro/Studio/Business) enforced server-side, locked prices | ✅ |
| Billing: upgrade requests + manual admin activation | ✅ (**no live payment provider**) |
| Service catalog (5 packages), requests, scoping, delivery report, hours/paid tracking | ✅ |
| Admin Console (server-side `requireAdmin`): unit economics, billing, services, pricing, providers, users, audit | ✅ |
| Tests: 16 unit + 19 integration (Vitest) | ✅ 35/35 |

## Production verification done
- Real orchestrator run in production D1 with real Tavily + Firecrawl + Workers AI: 11 steps completed, 15 evidence items, cited report generated, H2 approval gate respected, 16/16 credits, ≈ USD 0.038.
- `/api/v1/*` and `/api/v1/admin/*` return 401 without a valid Clerk token; internal self-test endpoint returns 404 without its secret.
- No secrets in the client bundle or in git.

## NOT yet verified (blockers)
1. **DNS:** add `CNAME qelnar.biz.id → qelnar-one.pages.dev` (proxied) and `CNAME www → qelnar-one.pages.dev`. The Cloudflare API token lacks `Zone:DNS:Edit`.
2. **Real Google sign-in E2E** (needs a human Google account on `https://qelnar.biz.id` after DNS). Clerk Production session cookies are bound to `qelnar.biz.id`, so login will not work on `*.pages.dev`.
3. **Clerk Dashboard:** confirm Google uses **custom OAuth credentials** (required in production) and email/password/OTP/other socials are disabled.
4. Payment provider (Midtrans/Xendit) not integrated — billing is manual.

## API (summary)
Public: `GET /api/health`, `GET /api/config`, `GET /api/public/plans`, `GET /api/public/services`  
Auth (`Authorization: Bearer <Clerk JWT>`, `X-Workspace-Id`): `/api/v1/me`, `/onboarding`, `/workspaces`, `/workspace[/members|/invites|/projects|/tasks|/usage|/audit|/learnings]`, `/command` (`dryRun` preview), `/runs[/:id|/resume|/cancel]`, `/approvals[/:id/decide]`, `/reports[/:id|/export|/feedback]`, `/evidence`, `/billing[/change]`, `/service-requests`  
Admin: `/api/v1/admin/{overview,users,workspaces,plans,billing-requests,services,service-requests,providers,settings,audit}`

## Data (Cloudflare D1 `qelnar-production`)
users, workspaces, workspace_members, workspace_invites, projects, tasks, runs, run_steps, approvals, evidence, reports, memories, usage_ledger, audit_log, plans, subscriptions, billing_requests, service_packages, service_requests, provider_settings, app_settings.

## Stack
React 19 + Vite + Tailwind 4 (SPA) · Hono on Cloudflare Pages Functions (`_worker.js`) · D1 · Workers AI · Zod · Clerk · Vitest.
Deviation from brief: SQL via a thin typed helper instead of Drizzle; durable execution via D1 lease state machine instead of Cloudflare Workflows (not available to Pages projects).

## Deployment (BYOK)
```bash
npm run build
npx wrangler d1 migrations apply qelnar-production --remote
npx wrangler pages deploy dist --project-name qelnar-one --branch main
```
Secrets (set via `wrangler pages secret`, never committed): `CLERK_SECRET_KEY, TAVILY_API_KEY, FIRECRAWL_API_KEY, APIFY_API_TOKEN, SCRAPELY_API_KEY, ADMIN_EMAILS, INTERNAL_SELFTEST_TOKEN`. Public vars in `wrangler.jsonc`.
Local: copy secrets into `.dev.vars`, `npm run db:migrate:local`, `pm2 start ecosystem.config.cjs`.

## Pricing (hypotheses to validate)
Trial Rp0 · Solo Rp149.000 · Creator Pro Rp299.000 · Studio Rp799.000 · Business custom. Services Rp499.000 – Rp4.500.000. Validate with interviews, pilot conversion, actual cost per run, retention, margin.

_Last updated: 2026-11-14_
