# QELNAR One — Product, SaaS & Service Model

Version 1.1 · Strategy decision · 2026-11-14

## Decision

QELNAR One is a **SaaS product with optional service-assisted onboarding and research**, not a traditional agency, freelancer marketplace, or managed-service business.

The product is the repeatable software: One Command Center, source connectors, evidence pipeline, agent orchestration, plans, approvals, audit and outcome measurement. Human services may help customers configure a workspace, interpret a complex research brief or set up a first experiment, but those services must not become the only way the product works.

## Why this model

| Model | Strength | Limitation | QELNAR decision |
|---|---|---|---|
| Pure agency/service | Fast to validate willingness to pay; human quality control | Labor-heavy, difficult to scale, not a true OS | Not the core |
| Freelancer marketplace | Broad supply | Quality variance, coordination overhead, marketplace cold start | Reject for MVP |
| Self-serve SaaS | Repeatability, recurring revenue, product-led onboarding | Requires reliable product and support | Core model |
| SaaS + assisted service | Lets early customers succeed while product matures | Must avoid hidden manual work and unprofitable delivery | Use selectively |
| Internal tool only | Simplest early build | Does not validate commercial demand | Use for private alpha only |

## Product promise

“Turn creator questions into evidence-backed decisions and approved work from one command center.”

QELNAR does not promise guaranteed growth, viral reach, guaranteed revenue, secret competitor analytics or fully autonomous control of social platforms. It reports what sources actually expose and marks estimates, gaps and uncertainty.

## Customer and jobs

Initial customer hypotheses:
- Independent creators and creator-led small businesses.
- Small creator teams and content studios.
- Agencies or consultants managing several creator accounts.
- Brands that need structured creator/competitor research.

These are hypotheses, not validated segments. First interviews must identify one narrow beachhead. The first product workflow should serve one repeatable job: understand recent content performance and decide the next experiment.

## Packaging hypothesis

Do not finalize prices before interviews and cost tests. Test value-based packages rather than selling raw agent calls.

- **Free / Explore:** demo workspace, limited sample data, limited commands and low-cost model routing.
- **Creator:** one workspace, connected channels, bounded scans, evidence-backed insights and experiment plans.
- **Studio:** multiple workspaces, collaboration, shared research library, approvals and higher usage limits.
- **Business:** role controls, audit/export, retention controls, provider policies and support; only after real demand.
- **Assisted onboarding:** fixed-scope optional setup/research engagement, quoted separately and recorded as a service rather than disguised SaaS usage.

Never promise unlimited AI, unlimited scraping or unlimited sources. Publish quotas and fair-use limits.

## Revenue and unit economics

Track per workspace and per run:
- Model input/output tokens and provider charges.
- Search/extract credits.
- Scraping Actor start/result/add-on charges.
- Platform compute, storage and egress.
- Human support and assisted-service time.
- Payment fees, refunds and taxes when billing is introduced.

Gross margin must be computed after direct provider usage, not inferred from subscription revenue alone. A workflow that cannot estimate costs must be labelled “cost unknown” and either use a strict cap or require manual approval.

## Service boundary

Allowed optional service:
- Guided onboarding and connector configuration.
- Research brief design and interpretation.
- First experiment workshop.
- Data quality review and migration assistance.

Not allowed as hidden operating model:
- Manually doing every analysis while presenting it as autonomous.
- Using private credentials or account cookies supplied outside OAuth.
- Promising outcomes QELNAR cannot control.
- Executing customer social posts or messages without per-action approval.

## Validation gates

Before calling this a validated SaaS:
1. Conduct at least 10 structured interviews across the candidate segments.
2. Observe users completing the same job in a prototype.
3. Obtain at least 3 independent pilot users who complete an evidence-to-action loop.
4. Measure repeat use over 4 weeks.
5. Test willingness to pay with a real offer, not only survey intent.
6. Verify cost per successful workflow and support time.

## Strategic North Star

Weekly Evidence-to-Action Workspaces (WEAW), as defined in `METRICS_NORTH_STAR.md`. A workspace counts only after an evidence-backed insight becomes an accepted plan or explicitly approved action and an outcome is recorded. Logins, generated text and raw agent calls do not count.
