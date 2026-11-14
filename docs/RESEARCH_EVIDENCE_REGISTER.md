# QELNAR One — Research Evidence Register

Research snapshot: 2026-11-14. Search excerpts are discovery evidence; verify live docs before implementation.

## Cloudflare
1. Workers pricing and limits — https://developers.cloudflare.com/workers/platform/pricing  
Retrieved evidence: Workers Free lists 100,000 requests/day and 10 ms CPU per invocation; paid Standard lists monthly included request and CPU allowances. D1 and Workflows have separate quotas. Implication: low-cost prototype is possible, but usage is bounded and must be monitored.

2. Workflows overview — https://developers.cloudflare.com/workflows  
Retrieved evidence: durable multi-step execution, automatic retries, persistent state, pauses/sleep and waiting for external events or approvals; available on Free and Paid. Implication: use for durable command runs and approval checkpoints.

3. Workflows getting started — https://developers.cloudflare.com/workflows/get-started/guide  
Retrieved evidence: step.do persists step results and resumes from successful steps after interruption; retry configuration supported. Implication: isolate provider/model calls into retryable steps and still design idempotency for side effects.

## Authentication
4. Better Auth 1.5 release — https://better-auth.com/blog/1-5  
Retrieved evidence: release announcement documents native Cloudflare D1 support and Hono integrations. Implication: candidate for self-managed auth; validate current version and deployment constraints in a spike.

## Social platform APIs
5. TikTok Display API — https://developers.tiktok.com/doc/display-api-overview  
Retrieved evidence: profile and video metadata through user-info, video-list and video-query endpoints; scopes include user.info.basic and video.list. Retrieved page date: 2026-08-04. Implication: connected-account read capability exists, not unrestricted competitor analytics.

6. Instagram API with Facebook Login — https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login  
Retrieved evidence: Instagram Professional Business and Creator accounts are supported; consumer/personal accounts are not. Media, comments, mentions, hashtagged media, publishing and insights are subject to permissions.

7. YouTube Data API overview — https://developers.google.com/youtube/data/getting-started  
Retrieved evidence: default allocation includes 10,000 units/day for most endpoints and separate 100/day buckets for search.list and videos.insert. Each request consumes quota.

8. YouTube quota calculator — https://developers.google.com/youtube/v3/determine_quota_cost  
Retrieved evidence: method-specific quota costs; extra pages consume additional quota; daily quotas reset at midnight Pacific Time.

## Scraping catalog discovery (not executed)
9. Apify Instagram Scraper — https://apify.com/apify/instagram-scraper  
Catalog snapshot: pay-per-event, approximately USD 0.0027 per result on displayed Free tier.

10. Apify TikTok Scraper — https://apify.com/clockworks/tiktok-scraper  
Catalog snapshot: approximately USD 0.0037 per result, with paid add-ons.

11. Scrape.ly Instagram Post Scraper — https://scrape.ly/store/echofield/instagram-post-scraper  
Catalog snapshot: approximately USD 1 per 1,000 posts in displayed configuration; detailed-data add-on extra.

12. Scrape.ly Instagram Scraper — https://scrape.ly/store/echofield/instagram-scraper  
Catalog snapshot: approximately USD 2.29 per 1,000 results.

13. Scrape.ly multi-platform video research Actor — catalog discovery showed estimated total around USD 1.70 per 1,000 results in displayed configuration. Exact Actor and pricing must be rechecked before use.

## Research constraints
- Firecrawl connected-app request failed because credits were exhausted; no Firecrawl research completed.
- Tavily comprehensive research endpoint failed due to plan usage limit; focused Tavily searches succeeded.
- Apify and Scrape.ly were used for catalog discovery only. No Actor run or paid data collection started.
- Third-party blog snippets were not treated as authoritative where official documentation was available.
- Recheck quotas, scopes, prices, review requirements and commercial terms before implementation and before customer-facing promises.