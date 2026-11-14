# QELNAR One — North Star & Product Metrics

Version 1.0 · Proposed metric system · 2026-11-14

## North Star Metric: Weekly Evidence-to-Action Workspaces (WEAW)
Count distinct workspaces per week that complete at least one valid loop:
1. A user opens or reviews an evidence-backed insight.
2. The user accepts or meaningfully edits a recommended internal plan.
3. The plan is completed as internal work or an explicitly approved external action.
4. An outcome or completion result is recorded.

This measures realized operating value rather than logins, generated text or agent calls. In the earliest MVP, report each funnel step separately; exclude demo data and auto-generated plans users never review.

## Activation
Workspace created; creator goal configured; source connected or demo selected; bounded scan completed; first evidence-backed insight opened; time to first useful insight (TTFI).

Activation target hypothesis: first useful insight within 15 minutes for a ready source. Validate with usability tests; do not promise publicly.

## Engagement and retention
- Weekly active workspaces inspecting evidence.
- Weekly Evidence-to-Action Workspaces.
- Repeat scans per workspace.
- Repeat use of recommendations/experiments.
- Week-1 and week-4 retention.
- Recommendation open, edit and action rates.

## Intelligence quality
Evidence coverage; citation correctness; unsupported-claim rate; metric calculation reproducibility; provider freshness; insight usefulness rating; recommendation acceptance/edit rate.

## Agent reliability
Run completion; task success by agent/tool/provider; retries/timeouts; cancellation latency; duplicate side-effect incidents (target zero); schema-valid output; human override/rejection; prompt-injection and permission-boundary test pass rate.

## Cost and efficiency
Cost per completed run; cost per accepted recommendation; model tokens per task; provider quota per workspace; runs within budget; estimated-vs-actual variance; self-reported time saved (clearly labelled).

## Trust guardrails
Unauthorized external side effects: zero. Secret leakage: zero. Cross-workspace data exposure: zero. Unapproved paid provider runs: zero. Track deletion completion, credential revocation and approval payload mismatch (target zero).

## Metric governance
Every metric defines event schema, numerator/denominator, time window/timezone, exclusions, source of truth, owner and version. Do not optimize for agent-call volume, dashboard visits or generated-content count; those are activity metrics, not proof of value.

## Provider and commercial guardrails

Segment WEAW and cost metrics by provider and model policy version. Track:
- Search credits per evidence-backed insight.
- Pages fetched per completed research run.
- Actor spend per usable normalized record.
- Model cost per accepted recommendation.
- Provider failure/fallback rate and price-estimate variance.
- Percentage of workflows completed on free quota vs paid usage.

A low-cost workflow is not successful if evidence quality, source diversity or user trust declines. Do not reward raw scraped-result volume.
