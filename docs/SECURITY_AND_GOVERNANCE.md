# QELNAR One — Security and Governance Baseline

**Status:** Initial baseline · v0.1 · 2026-11-14

## 1. Trust model

QELNAR One may process user data, third-party platform data, model output, and external tool responses. None of these inputs should automatically be trusted.

- User identity must be verified by the authentication layer.
- Workspace ownership and permissions must be checked server-side.
- Provider responses are untrusted data.
- Agent outputs are proposals until validated.
- External actions are prohibited unless the policy and approval gate allow them.

## 2. Permission tiers

### Tier 0 — Public/read-only
Public information and non-sensitive metadata. Must still comply with source terms and applicable law.

### Tier 1 — Connected read-only
User-authorized access to private account data with the narrowest read scopes available.

### Tier 2 — Internal changes
Changes confined to QELNAR's own workspace, such as creating plans, drafts, tasks, or reports.

### Tier 3 — External side effects
Publishing, messaging, changing account settings, spending money, purchasing, deleting external data, or other actions that affect third-party systems.

Tier 3 requires explicit user approval for the exact action and payload. A general instruction to "run autonomously" is not sufficient authorization for every future external side effect.

## 3. Credential handling

- Never commit API keys, OAuth client secrets, refresh tokens, cookies, or session exports.
- Never place secrets in frontend environment variables or client bundles.
- Store credentials server-side using a supported encrypted secret mechanism.
- Restrict each credential to the minimum scopes and workspace.
- Redact credentials and sensitive tokens from logs and error messages.
- Support disconnect/revoke flows and credential rotation.
- Use separate credentials and callback URLs for preview and production.

## 4. Agent/tool isolation

- Agents may invoke only registered tools.
- Every tool has a strict input schema and permission tier.
- Tool inputs are validated before execution.
- Tool outputs are treated as untrusted content.
- Agents cannot change their own role, policy, budget, or tool permissions.
- Network access should be allowlisted where feasible.
- High-risk tool classes must require approval or remain disabled.

## 5. Approval record

An approval record should contain:
- User and workspace identity.
- Action type and target provider/account.
- Exact action payload or immutable payload hash.
- Risk/permission tier.
- Approval timestamp and expiration.
- Execution attempt and result.
- Cancellation or revocation status where applicable.

Changing the action payload after approval invalidates that approval.

## 6. Data governance

Before ingesting a new data class, document:
- Source and authorization basis.
- Purpose and user benefit.
- Data fields collected.
- Sensitivity classification.
- Retention period.
- Deletion/export path.
- Provider terms and restrictions.
- Whether the data may be sent to an AI model and under what controls.

Collect the minimum data required for the selected workflow.

## 7. Cost and quota controls

- Do not invoke paid APIs, paid scraping, or paid model tiers without explicit authorization.
- Prefer free/local development fixtures for early work.
- Set per-run and per-workspace budgets.
- Stop or request approval when limits are reached.
- Record actual usage when providers expose it; clearly mark estimates otherwise.

## 8. Audit and observability

Record:
- Authentication and authorization outcomes.
- Workspace and permission changes.
- Credential connection/disconnection events (never credential values).
- Commands, plans, task transitions, approvals, and cancellations.
- Tool/provider calls, response status, retry count, and correlation IDs.
- External side effects and provider receipt IDs.
- Data exports and deletion requests.

Audit records should be append-only from the application perspective and access-controlled.

## 9. Minimum pre-release checklist

- [ ] Authentication and server-side authorization tested.
- [ ] Workspace isolation tested.
- [ ] No secrets in repository, build artifacts, or client bundle.
- [ ] OAuth scopes and callback URLs reviewed.
- [ ] CSRF, session, rate-limit, and input-validation controls reviewed.
- [ ] Tool allowlist and approval gate tested.
- [ ] Prompt injection and untrusted provider content handled as data.
- [ ] Audit events cover privileged actions.
- [ ] Backup, restore, and deletion paths tested.
- [ ] Cost/quota limits and emergency stop tested.
- [ ] Privacy notice and terms reviewed before public release.

## 10. Incident response

The system should support:
1. Stop new orchestration and external dispatch.
2. Revoke or disable affected credentials.
3. Identify affected workspaces, runs, and external actions.
4. Preserve relevant audit evidence.
5. Notify affected users when required.
6. Restore from a known-good state and rotate secrets.
7. Record corrective actions and add regression tests.


## 11. Provider and AI governance extension

Use the data classification, provider due-diligence, prompt-injection and OAuth token controls in `PROVIDER_SECURITY_AND_DATA_GOVERNANCE.md`. Use the cost reservation and no-auto-top-up requirements in `COST_LEDGER_AND_USAGE_GOVERNANCE.md`.

A search result, scraped page or Actor dataset is untrusted content. It cannot modify a plan, tool permission, budget, provider allowlist or approval state. LLM prompts must exclude secrets and minimize confidential data. Provider/model fallback must not lower data-protection requirements.

## 12. Explicit paid-service controls

- Optional paid providers default to disabled.
- No automatic subscription upgrades, prepaid credit purchases, proxy activation, held-result unlocks or top-ups.
- Unknown or uncapped spend blocks autonomous runs.
- Every external cost is linked to a workspace, run and task.
- Provider kill switches must stop new dispatch while preserving completed evidence and audit records.
