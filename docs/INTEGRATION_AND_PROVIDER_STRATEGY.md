# QELNAR One — Integration & Provider Strategy

Version 1.0 · Provider plan; access not yet activated · 2026-11-14

## Integration principles
1. Official APIs first for connected-account data and external actions.
2. OAuth consent for private account data.
3. Public web data only where terms, law and provider policy allow it.
4. Scraping Actors are optional research adapters, never a foundational dependency.
5. Represent read and write capabilities separately.
6. Do not assume a platform API exposes competitor analytics or every public metric.
7. Do not run paid Actors, API plans or model tiers without explicit approval.

## First integration: YouTube Data API (read-only)
Recommended first provider because public channel/video metadata supports a useful bounded workflow and Google publishes a clear quota model. Retrieved official docs describe a default 10,000 units/day for most endpoints and separate 100/day buckets for search.list and videos.insert. Every request consumes quota; method costs and allocations can change.

MVP scope:
- Resolve channel ID from a user-provided URL or ID.
- Fetch channel and recent video metadata using official endpoints.
- Store bounded metadata and metrics with collection timestamps.
- Avoid publishing, comments and private channel analytics in the first slice.
- Prefer known channel/video IDs and avoid unnecessary search calls.

Later: YouTube Analytics API with owner OAuth scopes, subject to current Google policy and quota.

## TikTok
Display API documents user profile and recent/self-selected video metadata through user-info and video-list/query endpoints, using scopes such as user.info.basic and video.list. Treat it as a connected-account capability, not unrestricted public search. Content Posting API is separate and requires product/audit review before public posting. Verify current Research API eligibility and commercial-use rules; do not build the commercial product around research-only access. Do not promise broad competitor analytics from Display API.

## Instagram / Meta
Instagram API with Facebook Login is for Instagram Professional accounts (Business and Creator), not consumer/personal accounts. Official documentation lists media management, basic metadata, comments, mentions, hashtagged media, publishing and insights subject to permissions. Build only the capabilities actually granted to the connected account and app. Store account type, granted scopes, token status and last successful sync.

## X, Reddit and other sources
Add only after current pricing, commercial terms, rate limits and access requirements are verified. Assume X API access and prices can change; do not promise a free tier from old articles. Review current Reddit API terms and commercial-use rules before ingestion. RSS, user-provided URLs and public official pages may support discovery when permitted, but do not substitute for authenticated analytics.

## Provider adapter contract
Each adapter exposes provider metadata, capability list, OAuth lifecycle where relevant, bounded read methods, write methods disabled by default, quota/rate-limit metadata, normalized errors, idempotency support, freshness/provenance and contract tests.

Capability examples: profile.read, content.list, content.metrics.read, audience.insights.read, comments.read, content.publish, comment.create, account.settings.write.

## Scraping catalog snapshot (2026-11-14; discovery only)
No Actor was executed.
- Apify Instagram scraper listings showed pay-per-event pricing around USD 0.0017–0.0027 per result on the displayed Free tier, depending on Actor/output.
- Apify TikTok listing showed about USD 0.0037 per result plus optional add-ons.
- Scrape.ly Instagram Post Scraper showed about USD 1 per 1,000 posts, with additional detailed-data pricing.
- Scrape.ly general Instagram scraper showed about USD 2.29 per 1,000 results.
- Scrape.ly video research Actor discovery showed estimated total around USD 1.70 per 1,000 results in its displayed configuration.
These are catalog snapshots, plan-dependent and subject to change; they are not authorization to run.

**Decision:** Apify and Scrape.ly remain optional, disabled-by-default research adapters. No bulk scraping, login-cookie reuse, access-control bypass or unapproved collection. Do not make them the MVP's core connected-account analytics.

## Provider activation checklist
Capture official docs/terms, app owner and environment, scopes and review status, data fields and retention, quota and price, commercial-use restrictions, deletion/disconnect, test fixtures, contract tests and outage fallback.

## Initial order
1. YouTube Data API public read-only.
2. YouTube Analytics API for authorized owner analytics.
3. TikTok Display API after app registration and scope review.
4. Instagram Professional API after Meta app setup/review.
5. Other sources only when customer evidence shows demand.

## Expanded provider portfolio — 2026-11-14

The former narrow integration list is extended by the provider matrix in `PROVIDER_CATALOG_AND_DECISIONS.md`. Search, extraction, LLM inference, app authentication and social account OAuth are separate capabilities and must have separate adapters and credential lifecycles.

- Clerk is the managed-first sign-in candidate; Better Auth remains a self-hosted alternative. Neither authenticates social account access.
- Workers AI and Groq are early LLM candidates behind ModelGateway; AI Gateway is optional middleware.
- Tavily is the primary bounded web-search candidate; Firecrawl is the crawl/extraction candidate.
- Apify and Scrape.ly are optional public research adapters, not substitutes for official connected-account APIs.

See `SEARCH_AND_WEB_RESEARCH_PROVIDERS.md` and `SCRAPING_AND_SOCIAL_RESEARCH_ADAPTERS.md` for catalog-level cost observations and run guardrails. All prices are snapshots; no paid Actor or provider has been activated.
