# QELNAR One — Scraping & Social Research Adapters

Version 1.1 · Catalog discovery snapshot · 2026-11-14

## Policy

Official APIs and user-authorized account connections remain the preferred path. Scraping Actors are optional research adapters for public pages only, where law, platform terms, publisher conditions and the Actor's terms permit the intended use.

Catalog search is not a legal determination, not an endorsement and not authorization to execute. No Actor was run during this research. All prices below are catalog snapshots and can change by plan, actor version, add-on and platform usage.

Never request or store passwords, session cookies or private browser profiles. Do not bypass access controls, CAPTCHAs, paywalls or platform restrictions. Do not scrape private accounts, personal sensitive data or non-public analytics. Do not make bulk harvesting the default.

## Apify catalog findings

| Actor | Use | Observed Free-tier price | Notes |
|---|---|---:|---|
| streamers/youtube-channel-scraper | Channel videos and basic metadata | $0.0013/video | 30k+ total users shown in catalog; independent Actor |
| clockworks/tiktok-scraper | Public TikTok videos, hashtags and profiles | $0.0037/result | Add-ons: date/popularity filters, comments, transcripts, downloads and AI descriptions |
| clockworks/tiktok-profile-scraper | Profile and posted video data | $0.003/result | Add-ons may increase cost |
| apidojo/youtube-channel-information-scraper | Channel profile/search | $0.0005/channel; $0.001 keyword search; $0.005 channel URL query | Separate charges by event |

Apify platform pricing currently lists Free at $0/month with $5 usage credit and no card required; compute units are $0.20/CU on Free/Starter, where 1 CU is 1 GB RAM for one hour. Store Actors may charge separate per-event or per-usage fees. The $5 allowance is not a guarantee that every Actor can run free or that proxies/add-ons are included.

## Scrape.ly catalog findings

| Actor | Use | Observed listed price | Notes |
|---|---|---:|---|
| echofield/youtube-scraper | Public videos, channels, playlists, search | $0.0034/result | Catalog showed 100% recent success at lookup time; 1,085 monthly users |
| echofield/tiktok-scraper | Public TikTok video/profile/hashtag data | $0.000352/result | Add-ons priced separately; 1,350 monthly users shown |
| echofield/instagram-scraper | Public profiles, posts, reels, comments, hashtags | $0.00229/result | 1,611 monthly users shown |
| echofield/instagram-post-scraper | Public posts | $0.001/post; detailed data add-on $0.00085 | 1,115 monthly users shown |
| querystone/rag-web-browser | Google search plus page fetch | $0.00518/SERP page; direct fetched page $0.00205 | Separate search/fetch cost |

Scrape.ly account docs expose plan/credit balances and API endpoints for reading usage. Some results may be held rather than released when an account lacks a paid plan; do not assume the catalog's free access means unlimited free results. Its LLM gateway documentation also describes model-level billing/markup and daily free-plan limits, which must be checked before enabling.

## When to use which

- YouTube: official YouTube Data API first; use an Actor only for a clearly permitted public research gap or quota-limited discovery.
- TikTok: official Display API for connected-account capabilities; use Actors only for bounded public research, with strict compliance and cost caps.
- Instagram: official Instagram API for Professional accounts and granted scopes; Actors are not a substitute for private insights or account authorization.
- Cross-platform trend research: start with search results, then collect a small stratified sample from approved public URLs. Do not collect thousands of records just because an Actor can.

## Mandatory run controls

Every Actor run requires:
- exact Actor ID, version/build and owner;
- input schema reviewed and minimal input;
- purpose and source platform;
- estimated result count and all event/add-on costs;
- maxItems or Actor-native result cap;
- maxTotalChargeUsd or equivalent hard limit where supported;
- explicit workspace/user approval for paid execution;
- result retention and deletion policy;
- deduplication and provenance;
- error, retry and cancellation behavior.

The system must show a pre-run cost estimate and a hard maximum. If the Actor has no enforceable charge cap, paid execution is disabled unless an operator explicitly accepts the risk outside the automated flow.

## No silent execution

Discovery calls may be used to maintain the provider catalog. Starting an Actor, buying credits, subscribing, enabling proxies, unlocking held results or creating scheduled scraping automations are billable or account-changing actions and require explicit user approval.
