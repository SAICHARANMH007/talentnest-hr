# Missing Features Analysis

This document catalogs functionality that is **explicitly planned but not yet implemented**, plus functionality a comparable enterprise "Talent Operating System" would typically have but TalentNest currently lacks. All items here are `PLANNED FUTURE CAPABILITY` or gaps — none of this exists in the codebase today unless noted.

## 1. Explicitly-planned capabilities (referenced in code/comments/workflows)
| Feature | Status | Evidence |
|---|---|---|
| Aadhaar-Linked Candidate Verification | PLANNED — full zero-PII spec exists | [Workflow Diagrams §5](../Product/08-workflow-diagrams.md), [Compliance Documentation §5](../Compliance/01-compliance-documentation.md#5-aadhaar-linked-candidate-verification--planned-future-capability) |
| Public API (OpenAPI-documented) | PLANNED — referenced as prerequisite for "planned public API" | [Technical Debt #6](../Technical/03-technical-debt-analysis.md#6-missing-routes-discovered-late), [Product Roadmap](01-product-roadmap.md) |

## 2. AI/ML capability gap
- Current state: `Application.matchBreakdown` is **rule-based** (skill/experience/location/notice scoring) — confirmed against `Application.js` and the Product Intelligence Playbook's own statement: *"AI in Platform: None — no AI features currently implemented."*
- Gap: No ML/LLM-based candidate matching, resume ranking, interview-question generation, or chatbot assistance exists, despite "Talent Mirror"/"smart match" naming that could imply otherwise.
- This is the **single most consequential "missing feature"** from a market-positioning standpoint — see [SWOT — Opportunities](../Investor/02-swot-analysis.md#opportunities) and [Future Vision](../Vision/05-future-vision-5-10-20-years.md).

## 3. Plan-based feature gating
- `OrgCustomizations.featureFlags` exists as a model field, and `Tenant.plan` defines 8 tiers (`free/trial/starter/basic/growth/pro/agency/enterprise`).
- Gap: no evidence in the route/middleware layer of `Tenant.plan` actually gating feature access (e.g., a `free` tenant being blocked from, say, Communities or Assessments). This is a **revenue-model gap** — see [Revenue Model §5](../Business/04-revenue-model.md) and [Pricing Strategy](../Business/05-pricing-strategy.md).

## 4. Operational/infrastructure gaps (not product features, but enterprise-readiness gaps)
| Gap | Reference |
|---|---|
| Automated test suite | [Technical Debt #8](../Technical/03-technical-debt-analysis.md#8-no-automated-test-suite-identified) |
| CI/CD test gate | [Operations Documentation §2](../Operations/01-operations-documentation.md#2-deploy-process-current-as-inferred-from-config) |
| Error tracking/APM | [Operations Documentation §3](../Operations/01-operations-documentation.md#3-monitoring--observability-current-state) |
| Documented DR/backup runbook | [Operations Documentation §6](../Operations/01-operations-documentation.md#6-backup--disaster-recovery) |
| Data retention/purge policy for soft-deleted PII | [Compliance Documentation §3](../Compliance/01-compliance-documentation.md#3-soft-delete--retention) |
| Horizontal scaling for Socket.io | [Operations Documentation §7](../Operations/01-operations-documentation.md#7-capacity--scaling-notes) |

## 5. Feature-parity gaps vs. comparable platforms
Derived from [Competitive Analysis](../Sales/02-competitive-analysis.md):
| Feature category | Gap |
|---|---|
| HRMS depth (payroll, leave, performance management, post-hire HR) | TalentNest's scope ends at onboarding/Day 1 — by design, but worth stating explicitly as out-of-scope vs. Darwinbox |
| Sourcing reach / candidate database scale | TalentNest relies on employer-driven traffic + referrals/communities, vs. Naukri/LinkedIn's existing candidate pools |
| Integration ecosystem | No public API yet (see §1) — limits Zapier/HRIS/payroll integrations that Zoho Recruit/Darwinbox support |
| Multi-currency / international billing | Razorpay is INR-centric; no evidence of multi-currency support in `PaymentRecord.js`/`Tenant.js` — relevant only if expanding beyond India |

## 6. Nice-to-have features observed as common in enterprise ATS/HRMS but not present
- Calendar integrations (Google Calendar/Outlook sync for interview scheduling) — `SchedulingLink.js` is self-contained, no external calendar sync evident.
- E-signature via third-party providers (DocuSign/Adobe Sign) — `OfferLetter.signatureImageUrl` suggests an in-house signature capture rather than third-party e-sign integration.
- SSO/SAML for enterprise tenants — only Google OAuth is present; enterprise buyers (esp. `enterprise` plan tier) often require SAML/Okta/Azure AD SSO.
- Data export/reporting beyond `dashboard.js` "exports" (e.g., scheduled report emails, BI tool connectors).

## 7. Recently-added (not missing — included for completeness)
The College Hiring Portal (drill-down dashboard, drives, skill-gap analysis, PageHeader fixes) was completed in this development cycle (commit `3380598`) and is **not** a gap — it's documented as LIVE throughout [Product Documentation](../Product/02-feature-inventory.md) (#41) and [Product Intelligence Playbook](../../src/pages/superadmin/SuperAdminPlaybooks.jsx) v2.1.

## 8. Prioritization note
Per [Product Roadmap](01-product-roadmap.md), the near-term priority is **stabilizing what's built** (test coverage, API normalization) before investing in net-new features (§1-§6 above) — adding features on top of the recurring-bug-class architecture (Technical Debt #2/#3) compounds risk.
