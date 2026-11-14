# QELNAR One — Customer Journey & Onboarding

Version 1.0 · Proposed UX flow · 2026-11-14

## Journey
Discover → understand value → enter workspace → connect or explore → first scan → first insight → first approved plan → outcome review → habitual intelligence loop.

## 1. Discovery and evaluation
The landing page explains who QELNAR is for, the problem it solves, one real example of evidence → recommendation → approved work, current integration status, data permissions and pricing transparency.
- Primary CTA: Create your workspace.
- Secondary CTA: Explore a sample workspace.
Never claim integrations that have not passed provider verification.

## 2. Account and workspace
1. Sign up with Google or email.
2. Verify the account and session.
3. Create a personal workspace by default.
4. Name the workspace and select creator/business profile.
5. Show a concise privacy and connected-data explanation.
Do not require team invitations or billing setup.

## 3. Goal setup
Ask only for choices that change the first experience: main objective, primary channel, niche/topic and optional channel URL or handle. Allow skip and edit later. Do not require a long brand questionnaire.

## 4. Connect or explore
Offer two paths:
- Connect a source: official OAuth with exact scopes and plain-language explanation.
- Explore sample data: clearly labelled demo workspace using synthetic/sample data.
Show what fields will be read and how to disconnect. Never ask for platform passwords or session cookies.

## 5. First scan
Explain collection scope, date range, record limit and estimated quota/cost. Show progress, source status and partial failures. Allow cancellation. Never silently expand a scan.

## 6. First insight
Present one useful finding with conclusion, supporting records and metrics, source and collection timestamp, comparison window, confidence and caveats, and one suggested experiment. Never show a model-generated metric without a source record or an explicit estimate label.

## 7. First plan and approval
Create an internal plan first. The user can edit, assign, defer or reject it. If a later plan invokes an external action, show exact target, payload, timing, permission and consequence before approval.

## 8. Outcome review
Capture result and measurement window, compare with baseline, separate correlation from causation, ask whether the result was useful and save a contextual learning with source references.

## Activation definition
A workspace is activated when it has a configured goal, at least one authorized source or demo dataset, one completed bounded scan and one evidence-backed insight opened by the user. First approved plan is a deeper value milestone, not a forced onboarding step.

## UX requirements
- Progressive disclosure: ask for permissions only when needed.
- Empty states teach the next action.
- Distinguish not connected, permission missing, sync delayed and provider unavailable.
- Missing data is never represented as zero.
- Provide disconnect, export and deletion paths.
- Keyboard-first command entry and responsive mobile layouts.