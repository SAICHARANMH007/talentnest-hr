# Risk Analysis

## Risk register

| # | Risk | Category | Likelihood | Impact | Evidence | Mitigation |
|---|---|---|---|---|---|---|
| R1 | Silent runtime bugs ship past `vite build` (e.g., template-literal `ReferenceError`) | Technical | High (already occurred — `d5fd074`) | Medium (broke 2/11 playbooks until caught) | Technical Debt #7 | Phase 1 smoke tests (QA Strategy) |
| R2 | Recurring "paginated response treated as array" crashes | Technical | High (occurred 9+ times across pages historically) | Medium (page-level crashes, fixed reactively) | Technical Debt #2 | Shared API response normalization wrapper |
| R3 | ObjectId/populated-reference inconsistencies cause incorrect data display (e.g., $0 analytics) | Technical | High (multiple historical instances) | Medium (incorrect analytics, crashes) | Technical Debt #3 | Standardize `id` normalization at API boundary |
| R4 | `Tenant.js`/`Organization.js` duplication causes billing/plan-data fragmentation | Technical / Financial | Medium (depends on whether `Organization.js` is still referenced anywhere) | High (billing correctness) | Technical Debt #1 | Audit + consolidate or formally deprecate |
| R5 | Marketing "AI"/"smart match" claims don't match rule-based reality | Reputational / Legal | Medium | Medium-High (credibility with technical buyers/investors; potential regulatory framing issue) | Technical Debt #10 | Align messaging with [Sales Playbook §4](../Sales/01-sales-playbook.md#4-honest-positioning--what-not-to-claim) |
| R6 | No automated test suite — regressions ship undetected | Technical / Operational | High | Medium-High (compounds as codebase grows) | Technical Debt #8 | [QA Strategy](../QA/01-qa-strategy.md) phased plan |
| R7 | No CI/CD test gate before deploy | Operational | High | Medium | [Operations Documentation §2](../Operations/01-operations-documentation.md#2-deploy-process-current-as-inferred-from-config) | Wire QA Phase 1-2 into CI |
| R8 | No error tracking/APM — incidents detected late, via user reports | Operational | Medium | Medium-High (slower MTTR) | [Operations Documentation §3](../Operations/01-operations-documentation.md#3-monitoring--observability-current-state) | Add Sentry or equivalent |
| R9 | Single Render instance, Socket.io not horizontally-scalable | Scalability | Low (at current scale) → rises with growth | High (if it materializes — outage at scale) | [Architecture §3](../Architecture/01-architecture-documentation.md#3-backend-architecture), [Operations §7](../Operations/01-operations-documentation.md#7-capacity--scaling-notes) | Plan Redis adapter / multi-instance before scale-up |
| R10 | `COOKIE_SECRET` hardcoded fallback if env var unset | Security | Low (operational discipline) | High (if it occurs — predictable signing secret) | [Security Documentation §1](../Security/01-security-documentation.md#1-authentication) | Fail-fast startup check for required secrets |
| R11 | No data-retention/purge policy for soft-deleted PII (incl. BGV documents) | Compliance (DPDP Act 2023) | Medium | High (regulatory exposure as platform scales in India) | [Compliance Documentation §3](../Compliance/01-compliance-documentation.md#3-soft-delete--retention) | Define + automate retention policy |
| R12 | No documented DR/backup runbook beyond Atlas/Cloudinary defaults | Operational | Low | High (if a major incident occurs) | [Operations Documentation §6](../Operations/01-operations-documentation.md#6-backup--disaster-recovery) | Document RTO/RPO, test restore process |
| R13 | No public API/OpenAPI contract — "frontend calls a route that doesn't exist" class of bug | Technical | Medium (occurred historically — Technical Debt #6) | Low-Medium | Technical Debt #6 | OpenAPI contract checked in CI |
| R14 | Competitive — incumbents (Naukri/LinkedIn) or HRMS platforms (Darwinbox) expand into TalentNest's niche | Market | Medium | High | [SWOT — Threats](02-swot-analysis.md#threats) | Lean into College Hiring Portal + retention flywheel differentiation |
| R15 | College Hiring Portal recently built — less battle-tested than core hiring flow | Product | Medium | Low-Medium | [Roadmap](../Roadmap/01-product-roadmap.md) (recent addition) | Prioritize QA Phase 3 coverage for College pages |

## Risk severity matrix (Likelihood × Impact)

```
              LOW IMPACT      MEDIUM IMPACT          HIGH IMPACT
HIGH LIKELIHOOD    —          R1, R2, R3, R6, R7      —
MEDIUM LIKELIHOOD  R13         R5, R15, R4             R11, R14
LOW LIKELIHOOD     —           R9 (rising)             R10, R12
```

## Top 3 risks to address first (by leverage, per Technical Debt priority ranking)
1. **R2/R3 (shared API normalization + ID normalization)** — directly named in [Technical Debt](../Technical/03-technical-debt-analysis.md) as the highest-leverage refactor; eliminates the most-recurring bug class.
2. **R6/R1 (test suite, starting with the playbook smoke test)** — low effort, prevents the exact class of bug that just shipped (`d5fd074`).
3. **R11 (data retention/PII purge policy)** — compliance exposure grows with scale and is cheaper to address now than after a regulatory inquiry.

## Note on financial/market risks
This document covers **product, technical, and operational** risks derivable from the codebase. Financial risks (runway, customer concentration, churn) and market risks beyond competitive positioning require operational/business data not present in source code — see `[FOUNDER INPUT NEEDED]` markers in [Investor Pitch Narrative](01-investor-pitch-narrative.md).
