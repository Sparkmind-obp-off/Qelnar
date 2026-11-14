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

## Authentication and model providers — focused research update

14. Clerk pricing — https://clerk.com/pricing  
Current page snapshot: Free tier advertised up to 50,000 Monthly Retained Users (MRUs); Pro listed at USD 20/month billed annually or USD 25/month billed monthly, with published overage rates. MRU is not the same as MAU. Recheck plan features and terms before activation.

15. Clerk React quickstart — https://clerk.com/docs/react/getting-started/quickstart  
Current docs show React/Vite setup. This does not by itself validate the QELNAR Hono Worker JWT verification and production callback architecture; that remains a required spike.

16. Cloudflare Workers AI pricing — https://developers.cloudflare.com/workers-ai/platform/pricing  
Current official page: 10,000 Neurons/day free allocation; Workers Paid usage above that allocation is USD 0.011 per 1,000 Neurons. Model-specific token prices and limits vary.

17. Cloudflare AI Gateway Unified Billing — https://developers.cloudflare.com/ai-gateway/features/unified-billing  
Page updated Nov 5, 2026 in the retrieved snapshot. Unified Billing requires prepaid credits; a 5% fee applies to purchased credits. Credential precedence distinguishes request-supplied provider keys, stored BYOK and Unified Billing. AI Gateway is not an inference model.

18. Cloudflare AI Gateway spend limits — https://developers.cloudflare.com/ai-gateway/features/spend-limits  
Spend limits are evaluated against known model prices and can be scoped by provider/model/metadata. Enforcement is eventually consistent, so reserve budget locally as well.

19. GroqCloud documentation — https://console.groq.com/docs  
Official entry point for current models, pricing and rate limits. Focused third-party 2026 pricing articles disagree on some free-tier per-model limits; therefore no numeric Groq free quota is committed in this spec. Read live organization limits in the QELNAR account before enabling.

## Search and extraction providers

20. Tavily API credits — https://docs.tavily.com/documentation/api-credits  
Current documentation lists Basic Search at 1 credit/request, Advanced Search at 2; Basic Extract at 1 credit per 5 successful URLs, Advanced Extract at 2 credits per 5 successful URLs; Map and Crawl have separate formulas. Research pricing is dynamic. Researcher plan listed at 1,000 credits/month free in the retrieved snapshot.

21. Firecrawl pricing — https://www.firecrawl.dev/pricing  
Current page snapshot advertises 1,000 free credits/month without a payment card; credit consumption varies by scrape, crawl, map, search and advanced extraction. Hobby listed at USD 19/month for 5,000 credits. Paid plans include pay-as-you-go behavior and configurable spend limits. Disable auto top-ups by default.

22. Scrape.ly account and billing — https://scrape.ly/docs/account  
Docs expose plan, monthly usage, available/reserved credits and credit source/expiry via account APIs. Some results can be held until a paid plan unlocks them; never assume a free catalog search means free result delivery.

23. Scrape.ly LLM gateway — https://scrape.ly/docs/llm-gateway  
Docs describe model-level pricing/markup and a free-plan daily LLM limit. This is separate from the Actor execution pricing.

## Current Actor catalog samples (discovery only)

24. Apify YouTube Channel Scraper — https://apify.com/streamers/youtube-channel-scraper  
Observed catalog price: USD 0.0013 per video on Free tier; actor-specific and plan-dependent.

25. Apify TikTok Scraper — https://apify.com/clockworks/tiktok-scraper  
Observed catalog price: USD 0.0037 per result on Free tier; additional charges for filters, comments, transcripts, downloads and other add-ons.

26. Scrape.ly YouTube Scraper — https://scrape.ly/store/echofield/youtube-scraper  
Observed catalog price: USD 0.0034 per saved video/Short/stream row.

27. Scrape.ly TikTok Scraper — https://scrape.ly/store/echofield/tiktok-scraper  
Observed catalog price: USD 0.000352 per result in the displayed configuration; add-ons are extra.

28. Scrape.ly Instagram Scraper — https://scrape.ly/store/echofield/instagram-scraper  
Observed catalog price: USD 0.00229 per saved result.

29. Scrape.ly Instagram Post Scraper — https://scrape.ly/store/echofield/instagram-post-scraper  
Observed catalog price: USD 0.001 per post; detailed-data add-on USD 0.00085 per post in the displayed configuration.

30. Scrape.ly RAG Web Browser — https://scrape.ly/store/querystone/rag-web-browser  
Observed catalog price: USD 0.00518 per SERP page and USD 0.00205 per directly fetched page in the displayed configuration.

## Method and confidence notes

- Pricing and catalog values above are snapshots from 2026-11-14, not contractual quotes.
- Search results are discovery; official pricing/docs pages are preferred for billing claims.
- Actor store prices are publisher-defined and can change by plan, add-on and version.
- No provider was activated, no credentials were added, no paid Actor was run and no subscription or credit purchase was made during this documentation update.
- Firecrawl's connected integration was unavailable in this session due to exhausted credits. Published pricing was discovered through focused Tavily search; no Firecrawl scrape was executed.
