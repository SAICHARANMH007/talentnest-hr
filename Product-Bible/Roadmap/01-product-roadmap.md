# Product Roadmap

> This roadmap synthesizes [Future Vision](../Vision/05-future-vision-5-10-20-years.md), [Missing Features Analysis](02-missing-features-analysis.md), and [Technical Debt Analysis](../Technical/03-technical-debt-analysis.md) into a phased plan. All items not already in the codebase are marked `PLANNED FUTURE CAPABILITY`. Timeframes are directional, not committed dates — see `[FOUNDER INPUT NEEDED]` in [Investor docs](../Investor/01-investor-pitch-narrative.md) for actual planning cadence.

## Near-term (0–3 months) — Stabilize & de-risk what's built
1. **Phase 1 QA smoke tests** (playbook builder regression test + pagination-shape contract test) — [QA Strategy](../QA/01-qa-strategy.md). Lowest effort, directly prevents the bug class fixed in `d5fd074`.
2. **Shared API response normalization wrapper** — [Technical Debt #2](../Technical/03-technical-debt-analysis.md#2-recurring-paginated-response-treated-as-array-bug-class), the single highest-leverage refactor per the Developer Playbook changelog.
3. **ID/ObjectId normalization at the API boundary** — [Technical Debt #3](../Technical/03-technical-debt-analysis.md#3-objectid--populated-reference-inconsistencies), removes 5+ duplicated helper functions.
4. **`COOKIE_SECRET` fail-fast check** — [Security Documentation §9](../Security/01-security-documentation.md#9-known-gaps--recommendations).
5. **Audit `Organization.js` references** — [Technical Debt #1](../Technical/03-technical-debt-analysis.md#1-duplicate-organization-models--tenantjs-vs-organizationjs), document deprecation plan even if full migration is later.
6. **Align marketing language** with [Sales Playbook §4](../Sales/01-sales-playbook.md#4-honest-positioning--what-not-to-claim) re: "AI"/"smart match" terminology — quick win, avoids reputational/credibility risk.
7. **QA Phase 3 coverage for College Hiring Portal pages** (recently built — [Roadmap — Missing Features §1](02-missing-features-analysis.md)).

## Mid-term (3–9 months) — Close functional gaps
1. **Plan-tier feature gating** — wire `OrgCustomizations.featureFlags` to `Tenant.plan` for upsell ([Revenue Model](../Business/04-revenue-model.md)).
2. **Shared enum source** for frontend dropdowns ([Technical Debt #5](../Technical/03-technical-debt-analysis.md#5-enum-mismatches-between-frontend-and-backend)).
3. **CI/CD pipeline with test gate** — depends on QA Phase 1-2 being in place ([Operations Documentation §2](../Operations/01-operations-documentation.md#2-deploy-process-current-as-inferred-from-config)).
4. **Error tracking/APM integration** (Sentry or equivalent) — [Operations Documentation §3](../Operations/01-operations-documentation.md#3-monitoring--observability-current-state).
5. **Data retention/purge policy** for soft-deleted PII, especially BGV documents — [Compliance Documentation §3](../Compliance/01-compliance-documentation.md#3-soft-delete--retention).
6. **OpenAPI contract checked in CI** — [Technical Debt #6](../Technical/03-technical-debt-analysis.md#6-missing-routes-discovered-late), foundation for the public API.

## Long-term (9–18 months) — `PLANNED FUTURE CAPABILITY`
1. **ML-based match scoring** — evolve `matchBreakdown` from rule-based to a trained model, while preserving the explainability that's currently a selling point ([SWOT — Opportunities](../Investor/02-swot-analysis.md#opportunities)).
2. **Aadhaar-Linked Candidate Verification** — zero-PII-storage design already specced ([Compliance Documentation §5](../Compliance/01-compliance-documentation.md#5-aadhaar-linked-candidate-verification--planned-future-capability)).
3. **Public API** — built on the OpenAPI contract from the mid-term phase; enables integration partnerships.
4. **Horizontal scaling for Socket.io** (Redis adapter or equivalent) — [Operations Documentation §7](../Operations/01-operations-documentation.md#7-capacity--scaling-notes), pursued ahead of need based on growth signals.

## 5–20 year horizons
See [Future Vision](../Vision/05-future-vision-5-10-20-years.md) for the full 4-horizon breakdown (1-2yr through 10-20yr), each item mapped to existing code/models as feasibility evidence.

## Dependencies graph (selected)
```
Phase 1 QA tests ──► CI/CD test gate ──► (safer to ship) ML matching, Public API
API normalization (Tech Debt #2/#3) ──► reduces regression risk for all future feature work
OpenAPI contract ──► Public API
Aadhaar verification ──► (independent — zero-PII design already complete, needs provider integration)
Plan-tier feature gating ──► supports Pricing Strategy tiers (Business/05)
```
