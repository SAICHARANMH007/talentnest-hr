# QA Strategy

## 1. Current state — honest assessment
**No automated test runner (Jest/Vitest/Mocha/Playwright/Cypress) is wired into `package.json` scripts**, in either the frontend or `backend/package.json` (per [Technical Debt #8](../Technical/03-technical-debt-analysis.md#8-no-automated-test-suite-identified)). All historical verification documented in the Developer Playbook changelog is:
1. `npx vite build` — catches syntax errors only (does NOT catch runtime errors, as proven by the `ReferenceError: amp is not defined` bug in `SuperAdminPlaybooks.jsx`, which passed `vite build` for an unknown period before being caught — see [Technical Debt #7](../Technical/03-technical-debt-analysis.md#7-template-literal-fragility-in-superadminplaybooksjsx)).
2. Manual QA — a human clicks through the affected page/flow after a fix.

This is a **real, material gap** for an enterprise platform with 7 user roles, 5 tenant types, and 63 API route files. The recommendations below are phased to be achievable without violating the platform's historical "no new libraries unless necessary" discipline — though a test runner is an exception worth making.

## 2. Phased recommendation

### Phase 1 — Smoke tests for known-fragile code (lowest effort, highest immediate value)
- **Playbook builder smoke test** (directly addresses Technical Debt #7 / [Acceptance Criteria AC-12](../Product/07-acceptance-criteria.md)): a test that imports/executes all 11 `build*Playbook()` functions in `SuperAdminPlaybooks.jsx` and asserts each returns a non-empty string without throwing. This was manually verified via a Node `vm`-based script during the `d5fd074` fix — formalizing it as a committed test (using Vitest, since the project already uses Vite) would take roughly 5 lines per the Technical Debt note, and would have caught the `ReferenceError: amp is not defined` bug immediately.
- **Pagination-shape contract test** (addresses Technical Debt #2): a test that hits each list endpoint (or mocks the response shape) and asserts the frontend's consuming code handles `{success, data, pagination}` without calling `.filter`/`.map`/`.sort` on the wrapper object directly.

### Phase 2 — Backend route/integration tests
- For each of the 63 route files, at minimum: a test that the route is registered (addresses Technical Debt #6 — "missing routes discovered late") and returns the expected guard behavior (401 unauthenticated, 403 wrong role, 200/2xx for authorized requests) using an in-memory MongoDB (e.g., `mongodb-memory-server`) to avoid touching Atlas.
- Priority order: Core Hiring Flow (`jobs`, `candidates`, `applications`, `dashboard`) → Admin & Configuration → everything else.

### Phase 3 — Frontend component/page tests
- Critical-path pages first: Recruiter Pipeline, Candidate Dashboard, Admin Analytics, College Overview/Drives/Placements (recently built — see [Roadmap](../Roadmap/01-product-roadmap.md)).
- Focus on the **bug classes already known to recur** (Technical Debt #2, #3, #5, #9) — write tests that would fail if those patterns reappear.

### Phase 4 — End-to-end (E2E)
- A small number of E2E tests (Playwright/Cypress) covering the golden paths from [User Journey Maps](../Product/09-user-journey-maps.md): Candidate apply→track, Recruiter post job→hire, Placement Officer drive creation→registration.

### Phase 5 — CI integration
- Wire Phase 1–2 tests into a CI pipeline (e.g., GitHub Actions) that runs on every PR/push to `main`, gating Vercel/Render auto-deploy. This directly addresses [Operations Documentation §2](../Operations/01-operations-documentation.md#2-deploy-process-current-as-inferred-from-config) ("No automated test gate runs between push and deploy").

## 3. What "done" looks like for QA maturity
| Maturity level | Description |
|---|---|
| 0 (current) | Manual QA + `vite build` only |
| 1 | Phase 1 smoke tests committed and run locally before merge |
| 2 | Phase 1–2 in CI, gating deploy |
| 3 | Phase 1–4 in CI, with coverage tracked |
| 4 | E2E tests run against staging before prod promotion |

## 4. Cross-reference
- Test cases for the current feature set (manual or to-be-automated) are cataloged in [Test Cases](02-test-cases.md), built on the [Acceptance Criteria](../Product/07-acceptance-criteria.md).
