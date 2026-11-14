# QELNAR One — Cost Ledger & Usage Governance

Version 1.1 · Operational contract · 2026-11-14

## Objective

Make every material external cost visible before it happens and measurable after it happens. QELNAR must never hide provider costs inside an agent abstraction.

## Cost dimensions

Record provider, product, model/Actor, operation, workspace, user, run, task, request ID, currency, quantity, unit, unit price, estimated cost, actual cost, status, timestamp, pricing snapshot ID and billing source.

Cost categories:
- LLM input/output/cached/reasoning tokens.
- Search requests and returned results.
- Page extraction, crawl and browser minutes.
- Scraping Actor starts, results, add-ons, compute, proxies, downloads and storage.
- Platform compute, database, object storage, egress and observability.
- Human-assisted service time, recorded separately.

## Preflight

Before any paid call:
1. Resolve provider and model/Actor version.
2. Read a current price or account quote.
3. Estimate the maximum operation count and usage.
4. Calculate worst-case cost, including add-ons and retries.
5. Check workspace and global budgets.
6. Display cost and data scope in the run preview.
7. Require approval when paid execution is enabled.
8. Pass a hard cap to the provider where supported.

Unknown price means no autonomous paid execution. “Free tier” must still be checked for quota, card requirements, overage behavior, result unlocking and plan restrictions.

## Budget hierarchy

- Per request cap.
- Per task cap.
- Per run cap.
- Per workspace daily/monthly cap.
- Global system cap.
- Provider-specific kill switch.

Budgets default to zero for optional paid research adapters. Free quotas can be used only within documented limits. Do not automatically upgrade a plan, add payment method, top up credits or unlock held results.

## Ledger integrity

Append immutable usage events; corrections are compensating entries, not destructive edits. Reconcile provider invoice/usage export with local estimates. Record the difference and investigate material drift. Keep currency and exchange-rate source/time when converting USD to IDR.

## User-facing labels

- **Free quota:** provider reports the operation is within a no-charge allowance.
- **Estimated:** calculated from known price and planned quantity.
- **Actual:** provider usage/cost confirmed.
- **Unknown:** provider price or metering cannot be determined.
- **Capped:** the run will stop at a stated maximum.
- **Paid approval required:** user must approve before execution.

Never show “free” if a paid proxy, Actor add-on, credit purchase or subscription is required.

## Customer billing

Customer subscription and upstream provider usage are separate ledgers. Plans include defined usage allowances, not unlimited inference. Overage should be opt-in and bounded. Do not resell raw provider credits without confirming provider terms and tax/accounting implications.

## Acceptance tests

- A $0 workspace cannot trigger a paid provider call.
- A paid call with unknown cost is blocked.
- Retries cannot exceed the run cap.
- Concurrent calls reserve budget before dispatch.
- Provider invoice usage can be reconciled to local events.
- Budget exhaustion moves a run to NEEDS_ATTENTION or BUDGET_EXCEEDED with partial outputs preserved.
