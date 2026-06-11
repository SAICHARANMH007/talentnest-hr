# Technical Debt Analysis

This document catalogs known issues, inconsistencies, and risk areas identified directly from the codebase and the Developer Playbook's own changelog (which is itself a strong technical-debt signal — every "Bug Fix" entry represents debt that *was* paid down, and the patterns recurring across many entries suggest systemic issues worth addressing at the root).

## 1. Duplicate "organization" models — `Tenant.js` vs `Organization.js`
- `Tenant.js` is the actively-used multi-tenant model (`type: org/tenant/vendor/client/college`, Razorpay billing fields).
- `Organization.js` is a separate model with overlapping purpose (`status`, `plan`, `stripeCustomerId`, `settings.featureFlags`, `isStaffingAgency`) and references **Stripe** instead of Razorpay.
- **Risk**: if any route still reads/writes `Organization.js`, billing/plan data could be split across two models, causing inconsistent plan-limit enforcement.
- **Recommendation**: audit all references to `Organization.js`; either migrate remaining usages to `Tenant.js` or formally document `Organization.js` as deprecated/legacy with a removal plan.

## 2. Recurring "paginated response treated as array" bug class
The Developer Playbook changelog documents a **platform-wide sweep** where pages calling `.filter()/.map()/.sort()` directly on a `{success, data, pagination}` response crashed with `"h.filter is not a function"`. Fixed across: AdminUsers, AdminAnalytics, RecruiterPipeline, CandidateDashboard, SuperAdminOrgs, SuperAdminCandidateImport, AssignedCandidates, RecruiterAssessments, and more.
- **Root cause**: no shared API client wrapper that automatically unwraps `.data` — every page independently decides how to handle the response shape.
- **Recommendation**: introduce a thin wrapper in `api.js` (or a shared hook) that normalizes list responses to always return an array (with pagination metadata attached separately), eliminating this entire bug class going forward. This is the single highest-leverage refactor suggested by the changelog history.

## 3. ObjectId / populated-reference inconsistencies
Multiple historical bugs stem from `jobId`/`recruiterId`/`id` fields sometimes being raw ObjectId strings and sometimes populated Mongoose objects:
- `AdminAnalytics` "Top Jobs by Applications" showed 0 because `String(a.jobId) === "[object Object]"` — fixed with an `appJobId()` helper.
- `JobDetailDrawer` had a `Cast to ObjectId failed for value "undefined"` crash because `initialJob` from `.lean()` had only `_id`, not virtual `id` — fixed with a `normJob()` helper.
- `RecruiterDashboard`/`CandidateApplications` had similar `toStr()`/`getJobId()` fallback-chain fixes.
- **Recommendation**: standardize on **always populating and always normalizing** `id = obj.id || obj._id?.toString()` at the API boundary (e.g. in `api.js` response interceptors), rather than per-component ad hoc helpers (`normalizeJob`, `normJob`, `toStr`, `getJobId`, `appJobId` — at least 5 different names for similar logic found across the codebase).

## 4. Modal z-index inconsistency (fixed, but indicates lack of shared standard)
14+ files plus `Modal.jsx` needed a z-index sweep (`2000` → `10001`) because notification panel/profile menu were both at `9999` and overlapping modals. This indicates **no enforced design-system constant** for z-index layering existed before the fix.
- **Recommendation**: define z-index constants centrally (e.g. `constants/zIndex.js`) and lint/review against ad hoc magic numbers.

## 5. Enum mismatches between frontend and backend
- `availability: 'Immediate'` (capital I) failed the Mongoose enum (lowercase values) — fixed to `'immediate'`.
- Job `urgency` enum was removed from backend but frontend still tried to save `'High'/'Medium'` values — caused silent save failures until removed/synced.
- **Recommendation**: generate frontend dropdown options from a single shared enum source (e.g. export enums from a shared module imported by both, or generate TS/JS constants from the Mongoose schema) to prevent drift.

## 6. Missing routes discovered late
Several routes were entirely missing and only discovered when frontend pages got 404s: `GET/PATCH/DELETE /api/jobs`, `GET /api/jobs/:id`, `PATCH /api/jobs/:id/assign-recruiter`, `GET /api/jobs/:id/candidates`, `GET /api/users/:id`, `POST /api/applications/public`.
- **Recommendation**: an API contract/schema (OpenAPI) checked in CI against actual route registrations would catch "frontend calls a route that doesn't exist" before it ships. This is also a prerequisite for the planned public API (see [Product Roadmap](../Roadmap/01-product-roadmap.md)).

## 7. Template-literal fragility in `SuperAdminPlaybooks.jsx`
The Playbooks page (4600+ lines) generates large HTML documents via JS template literals. A single unescaped backtick character in a sentence (`` punctuation/casing/`&amp;` differences ``) was syntactically valid (esbuild parsed it as `` `...` & amp; `...` ``) but threw `ReferenceError: amp is not defined` at runtime, silently breaking the Preview/Download buttons for 2 of 11 playbooks (fixed in commit `d5fd074`).
- **Risk**: this class of bug is **invisible to `vite build`** (syntactically valid) and only surfaces at runtime when the specific function executes — which may not happen during routine smoke testing.
- **Recommendation**: add a unit test that calls every `build*Playbook()` function and asserts it returns a string without throwing (a 5-line test would have caught this immediately — see [Test Cases](../QA/02-test-cases.md) AC-12).

## 8. No automated test suite identified
No test runner configuration (Jest/Vitest/Mocha) was found wired into `package.json` scripts during this audit. All verification observed in the changelog is manual (`vite build` for syntax, manual QA for runtime behavior).
- **Recommendation**: see [QA Strategy](../QA/01-qa-strategy.md) for a phased plan — start with the playbook-function smoke test (item 7) and pagination-shape contract tests (item 2), which directly target the two highest-frequency historical bug classes.

## 9. PageHeader prop naming inconsistency
`PageHeader.jsx` accepts a single `action` prop (singular). `CollegeDrives.jsx` was written using `actions={...}` (plural) — a silent no-op (button didn't render), caught only by manual code review since `vite build` doesn't flag unused props on a destructured object.
- **Recommendation**: PropTypes or TypeScript would catch this class of error at build time. Given "no new libraries" constraints have applied historically, even a lightweight runtime `console.warn` for unrecognized props passed to shared UI components would help.

## 10. AI/ML claims vs. reality
The platform markets "smart match" / "Talent Mirror" scoring, but `Application.matchBreakdown` is **rule-based** (skill/experience/location/notice scoring), not ML/LLM-based. The Product Intelligence Playbook itself states: *"AI in Platform: None — no AI features currently implemented."*
- **Risk**: marketing/sales materials should not imply AI/ML capability that doesn't exist — see [Sales Playbook](../Sales/01-sales-playbook.md) positioning notes.

---

## Priority ranking for remediation
| Priority | Item | Effort | Impact |
|---|---|---|---|
| 1 | #2 Shared API response normalization | Medium | Eliminates the most-recurring bug class |
| 2 | #3 ID/ObjectId normalization at API boundary | Medium | Removes 5+ duplicated helper functions |
| 3 | #7 Playbook smoke test | Low | Prevents silent runtime breakage |
| 4 | #1 Tenant/Organization model consolidation | High (data migration) | Prevents billing data fragmentation |
| 5 | #5 Shared enum source | Medium | Prevents save failures from enum drift |
| 6 | #6 OpenAPI contract | High | Foundation for public API roadmap item |
