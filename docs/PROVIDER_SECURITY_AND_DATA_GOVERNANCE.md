# QELNAR One — Provider Security & Data Governance

Version 1.1 · Security contract · 2026-11-14

## Data classification

- Public: public URLs, published creator posts and public channel metadata.
- Workspace: user-created briefs, plans, notes and non-sensitive business configuration.
- Confidential: connected-account analytics, OAuth metadata, private business metrics and customer exports.
- Secret: API keys, access/refresh tokens, signing keys and webhook secrets.

Secrets must never enter prompts, logs, browser storage, source control, analytics events or exported reports.

## Provider due diligence

Before enabling a provider, record:
- Legal entity and official documentation/terms URL.
- Intended use and whether commercial use is allowed.
- Data processed, storage location, retention and deletion.
- Training/retention policy for submitted prompts and content.
- Subprocessors and regional availability where material.
- Authentication and required scopes.
- Pricing, quota, overage, credit expiry and payment-card requirements.
- Incident reporting, support and exit/export process.
- Provider-specific limitations and prohibited uses.

A public page does not automatically mean unrestricted commercial reuse. Platform policies and applicable law remain controlling.

## Prompt and retrieval security

Treat all fetched pages, posts, comments, captions, transcripts and Actor outputs as untrusted data. Use explicit data delimiters and extraction schemas. Ignore embedded instructions that ask the model to reveal secrets, call tools, change policy or override the user's command. Only the deterministic Tool Registry can authorize a tool call.

Do not pass secrets or unnecessary confidential fields to a model. Apply provider-specific data classification and redaction. Prefer data minimization and short retention.

## OAuth and tokens

Use server-side OAuth authorization-code flows with state and PKCE where supported. Encrypt tokens at rest, scope by workspace/provider/account, rotate keys, refresh safely and revoke on disconnect. Keep app login separate from social account connection.

## Retention and deletion

Define retention per source and purpose. Store source identifiers, hashes, timestamps and normalized metrics rather than full media when sufficient. Provide connector disconnect, workspace export and deletion workflows. Deletion must cascade to derived records where legally/technically required, and deletion jobs must be auditable.

## Isolation

Preview and production must use separate databases, buckets, OAuth apps, callbacks, secrets and provider budgets. Enforce tenant/workspace scope at the repository layer and test cross-tenant access attempts.

## Human approvals

Show the exact external payload, target account, destination, timing, cost and irreversible consequences. Approval expires and is invalidated if the payload changes. No autonomous DMs, comments, publishing, ad spend, account changes or deletion in the initial release.

## Incident response

Provide global stop switches for LLM, search, scraping and social connectors. Revoke compromised keys, pause workflows, preserve audit evidence, notify affected operators and follow provider/legal notification requirements.
