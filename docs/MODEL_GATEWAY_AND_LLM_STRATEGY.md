# QELNAR One — Model Gateway & LLM Strategy

Version 1.1 · Provider strategy · 2026-11-14

## Decision

Build an internal `ModelGateway` abstraction. Agents never call Workers AI, Groq, OpenRouter, Gemini, OpenAI or Anthropic directly. The gateway applies task policy, model allowlists, budgets, schema validation, retries, fallbacks and usage logging.

Cloudflare AI Gateway is optional infrastructure around provider calls. It is not the model itself and does not remove provider inference charges.

## Provider roles

### Cloudflare Workers AI
Use first for bounded low-cost tasks where supported models meet quality requirements: classification, metadata extraction, simple tagging and compact summaries. Current official pricing: 10,000 Neurons/day free; on Workers Paid, usage above the daily free allocation is $0.011 per 1,000 Neurons. Exceeding free limits on Workers Free can cause requests to fail rather than silently becoming paid. Check per-model pricing and context/output limits.

### GroqCloud
Use as a fast alternative for tasks where latency matters and a compatible model passes evaluation. The free tier is rate-limited by organization and model, not a promise of unlimited production capacity. Paid Developer usage is metered. Read live limits from the QELNAR provider account and enforce local caps.

### OpenRouter
Use only when model choice breadth or fallback diversity is valuable. Query the current model catalog and prices; do not hard-code assumptions about free models. Filter models by allowed data handling, context, structured-output support, price and latency.

### Direct model APIs
Gemini, OpenAI and Anthropic may be added as premium-quality options. Each adapter must expose pricing, retention/training policy, region, limits, structured-output support and cancellation semantics.

## Cloudflare AI Gateway

Use it when request logging, provider key management, caching, retries or spend-limit observability materially help. BYOK means QELNAR still owns provider keys and provider billing. Unified Billing requires prepaid Cloudflare credits; Cloudflare currently documents a 5% fee on purchased credits. Spend limits can be scoped by provider/model and metadata dimensions for providers with known pricing. Confirm current supported providers and billing behavior.

For a low-budget MVP, start with direct Workers AI and/or Groq adapters behind the same internal interface; introduce AI Gateway only if it adds value without creating an unwanted prepaid commitment.

## Routing policy by task

| Task | First candidate | Fallback | Quality gate |
|---|---|---|---|
| Intent classification | Small Workers AI model | Groq small model | Correct route/schema |
| Metadata extraction | Workers AI | Groq / Gemini | Field accuracy |
| Evidence synthesis | Groq or Gemini | OpenAI / Anthropic by approved budget | Citation coverage and factuality |
| Strategy recommendation | Strong model selected by eval | Alternate strong model | Evidence-linked rationale |
| Code/security review | Strong coding model | Second provider | Tests and human review |
| Embeddings | Delay until retrieval needs justify it | Cloudflare Vectorize or external | Retrieval benchmark |

The table is a starting hypothesis, not a benchmark result. Run a fixed QELNAR evaluation set before selecting defaults.

## Required gateway contract

Input: task type, workspace, user, data classification, prompt version, schema, context references, max input/output tokens, max cost, deadline, permitted providers and fallback policy.

Output: validated result, provider/model, token counts, estimated/actual cost, latency, finish reason, retries, cache status, safety flags and trace ID.

Reject calls if the workspace budget is exhausted, provider is not allowlisted, input exceeds policy, data classification is incompatible or cost is unknown without an explicit override.

## Agentic safeguards

- No open-ended recursive agent loops.
- Max steps, wall-clock duration, tool calls and token budgets per run.
- Planner creates a typed plan; policy engine authorizes it before execution.
- Tools return structured evidence, not untrusted instructions.
- Retrieved pages and social posts are untrusted data; prompt injection must never grant tool permissions.
- Validate structured output with Zod and reject malformed or unsupported claims.
- Keep reasoning traces private; store concise decision summaries and evidence references.
- Model fallback must preserve policy and data classification.
- Human approval remains mandatory for external side effects.

## Cost governance

Before each call, estimate worst-case token cost using the provider's current price table. Set per-call, per-run, per-user and global caps. Record estimate and actual separately. If price is unavailable, display “unknown” and block or ask for explicit approval. No automatic credit top-up or paid-plan upgrade.

## Evaluation

Measure task success, evidence coverage, schema validity, unsupported claims, tool selection, latency, token cost, fallback rate, refusal correctness and human acceptance. A cheaper model is not selected if it materially degrades evidence accuracy or safety.
