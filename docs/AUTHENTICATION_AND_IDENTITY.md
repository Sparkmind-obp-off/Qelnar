# QELNAR One — Authentication & Identity Architecture

Version 1.1 · Proposed implementation contract · 2026-11-14

## Separate three identity domains

1. **QELNAR user identity:** who can sign in to QELNAR.
2. **Workspace authorization:** what that user can see or do inside a QELNAR workspace.
3. **Connected platform identity:** which YouTube, TikTok, Instagram or other account the user has authorized.

These are distinct credentials, scopes and revocation lifecycles. A Google sign-in session does not authorize YouTube Analytics. A Clerk session does not authorize Meta or TikTok. Never reuse one token for another domain.

## Recommended MVP choice: Clerk, with a portable boundary

Use Clerk as the managed authentication candidate for the first external pilot if the account owner accepts the vendor relationship and pricing terms. Clerk has a React quickstart and managed identity components. The Worker must verify signed session tokens server-side using the supported Clerk backend/JWKS verification path; never trust client-provided user IDs.

The public Clerk pricing page currently lists a Free tier up to 50,000 Monthly Retained Users (MRUs), then Pro at $20/month annual billing or $25/month monthly billing with published overages. MRU is not identical to MAU. Verify current terms and plan limits before launch.

Use Better Auth instead if a managed vendor is undesirable or if the Clerk integration creates unacceptable lock-in, cost, data handling or Worker deployment friction. Better Auth must pass a D1 + Hono + Cloudflare Worker spike, including session storage, OAuth callback, CSRF, cookie behavior, key rotation, migrations and recovery. Do not choose based on a quick local demo alone.

## AuthProvider contract

Implement an interface around:
- verifyRequest(request) → trusted subject and session metadata.
- getCurrentUser(subject) → internal user mapping.
- revokeSession / signOut.
- startOAuth / handleOAuthCallback where supported.
- listSessions / revokeAllSessions.
- provider health and configuration validation.

The business layer consumes an internal `userId`, never vendor-specific claims outside the adapter. Store `authProvider` and `authSubject` with a unique constraint. Do not copy raw access tokens into logs.

## Authorization

Every API query and mutation must enforce:
- authenticated subject → internal user mapping;
- workspace membership and role;
- resource ownership / workspace scope;
- action capability and approval level;
- budget and quota policy.

Default roles: Owner, Admin, Editor, Analyst, Viewer. Personal workspace initially maps to Owner. Do not rely on hidden UI controls for authorization.

## OAuth token custody for social providers

- Request the narrowest scopes needed for the declared feature.
- Show provider, account, requested scopes, purpose, sync frequency and revocation path before consent.
- Exchange authorization code on the server only.
- Encrypt refresh/access tokens at rest with a managed secret/encryption key; never store plaintext tokens in D1.
- Keep token material out of browser bundles, logs, analytics, exports and LLM prompts.
- Store only token metadata and encrypted ciphertext in the database.
- Refresh with bounded retries; revoke and purge on disconnect or deletion as required.
- Preview and production use separate OAuth apps, callback URLs and secrets.

## Session and account security

Require secure, HttpOnly, SameSite cookies where cookie sessions are used; validate origin/CSRF for state-changing routes. Enforce session expiry, rotation, revocation, rate limits and login abuse protection. Support account export and deletion. Audit authentication, role changes, connector grants, revocation and recovery events without recording secrets.

## Acceptance tests

- Forged, expired, revoked and wrong-audience tokens are rejected.
- A valid user cannot read another workspace by changing IDs.
- Membership removal takes effect server-side.
- OAuth state/PKCE and redirect URI validation work.
- Preview credentials cannot access production data.
- Social token revocation disconnects only the relevant provider account.
- Logs and audit exports contain no bearer tokens, cookies or secrets.
