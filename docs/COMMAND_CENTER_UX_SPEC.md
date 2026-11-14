# QELNAR One — One Command Center UI/UX Specification

Version 1.0 · Proposed interaction model · 2026-11-14

## Experience goal
The Command Center is an operating surface, not a gallery of dashboards. A user understands current state, expresses intent, inspects evidence, controls agent work and reviews outcomes in one coherent place.

## Information architecture
1. Command Center — priorities, command composer, active runs and source health.
2. Intelligence — insights, content, audience, trends and competitors.
3. Plans & Tasks — plans, task graph, assignments and blockers.
4. Agents — catalog, capabilities, status, permissions and usage.
5. Approvals — exact actions waiting for review and decision history.
6. Sources — connected accounts, providers, scopes, sync health and quota.
7. Library — evidence, reports, briefs, experiments and artifacts.
8. Settings — workspace, members, policies, data controls and audit.

## Desktop layout
- Left rail: workspace switcher and navigation.
- Main column: context, command composer, active run, top insights and next actions.
- Right contextual panel: source health, agent activity, pending approvals and usage.
- Run drawer: detailed steps, evidence, logs and retry/cancel controls.

## Mobile layout
Use bottom navigation for high-frequency destinations. Keep command entry one tap away. Run details and approval payloads use full-screen sheets. Avoid dense multi-column layouts.

## Command composer
Accept natural language and optional structured context: goal, workspace/source scope, date range, budget/run limit and mode (analyze only, prepare plan, request approval).

Before execution, show a Run Preview containing interpreted intent, proposed steps and agents, sources/tools, data range, expected outputs, estimated usage or “cost unknown”, permissions and approval gates, and actions that will not be taken.

## Run experience
Show queued, running, waiting for approval, succeeded, failed, cancelled and needs-attention states. Each step displays agent/tool, purpose, timestamps, retries and output. Expand for evidence and sanitized logs. A partial failure must never be hidden behind a success state.

## Insight card
Every insight has a finding title, plain-language interpretation, metric and comparison window, evidence count and source links, confidence and reason, freshness timestamp, caveat/missing data and suggested action. Avoid pseudo-precise confidence percentages until calibrated.

## Approval interaction
Show exact provider/account and target, exact content/payload, visibility/timing and side effect, cost/quota if known, permissions used and irreversible consequences. Offer approve once, edit, reject or defer. Approval binds to an immutable payload hash; edits invalidate it.

## Visual direction
Premium, calm, modern and technical. Use deep neutral surfaces with restrained accents, clear typography and consistent status colors. Avoid excessive gradients, glow and glassmorphism. Keep source and freshness metadata visible without visual noise. Do not rely on color alone.

## Accessibility
WCAG 2.2 AA target; keyboard navigation, visible focus, screen-reader labels, reduced motion, and explicit loading/empty/error/offline/permission-denied states. Confirm destructive and external actions.

## UI implementation
React + TypeScript, Tailwind design tokens, accessible Radix primitives via shadcn/ui, TanStack Query for server state and Recharts for charts. Keep reusable primitives and tokens centralized.

## MVP screens
Sign in/workspace creation; onboarding; Command Center; run preview; run detail; insight detail; approvals; sources; agent registry; workspace settings and audit.