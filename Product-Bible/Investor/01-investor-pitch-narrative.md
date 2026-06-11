# Investor Pitch Narrative

> **Note**: This narrative is grounded strictly in what exists in the codebase today (56 models, 63 routes, 7 roles, 5 tenant types, 42 live features) plus explicitly-marked planned capabilities. Financial projections, fundraise terms, and market-size figures are **not derivable from source code** and must be supplied by the founding team — placeholders are flagged as `[FOUNDER INPUT NEEDED]`.

## 1. The problem (one line)
Hiring teams in India — especially SMBs, staffing agencies, and college placement cells — run their hiring process across spreadsheets, WhatsApp, email, and a job board, with no single system of record from "candidate applies" to "candidate's first day." See [Problem Statement](../Vision/04-problem-statement.md) for the per-stakeholder breakdown.

## 2. The product (what's built, today)
TalentNest HR is a **multi-tenant Talent Operating System** covering:
- Branded career pages + public job board
- Candidate pipeline with rule-based "Talent Mirror" match scoring
- Assessments, structured interviews, in-platform video interviews (WebRTC via Socket.io)
- Offer generation + e-signature, BGV document workflow, onboarding checklists
- Candidate communities/social feed (retention flywheel between hiring cycles)
- A dedicated **College Hiring Portal** for campus placement cells (drill-down dashboard, drives, skill-gap analysis)
- Multi-tenant support for staffing agencies (vendor/client hierarchy via `Tenant.parentId`)
- Razorpay-based subscription billing already wired (`Tenant.plan`, `PaymentRecord.js`)

This is **not a prototype** — 56 data models and 63 API routes represent substantial built functionality across the full hiring lifecycle (see [Feature Inventory](../Product/02-feature-inventory.md), 42 LIVE features).

## 3. Why now
- India's hiring market is large and underserved by point solutions (per [Market Opportunity](../Business/01-market-opportunity.md)) — most SMBs and colleges still use spreadsheets/WhatsApp.
- Multi-tenancy + India-first integrations (Razorpay, WhatsApp/Twilio, Fast2SMS) are built in from the start, not retrofitted.
- The College Hiring Portal opens a distribution channel (colleges → their students → future job-seekers/candidates on the platform) that compounds with the candidate-community retention model.

## 4. Traction
`[FOUNDER INPUT NEEDED]` — number of live tenants, active users by role, applications processed, revenue (Razorpay `PaymentRecord` data exists in the schema to support these metrics, but actual figures are operational data not visible in source code).

## 5. Business model
Subscription billing via Razorpay, plan tiers `free/trial/starter/basic/growth/pro/agency/enterprise` (`Tenant.plan`). See [Revenue Model](../Business/04-revenue-model.md) and [Pricing Strategy](../Business/05-pricing-strategy.md) for the current implementation and identified gaps (e.g., `OrgCustomizations.featureFlags` exists but plan-to-feature gating is not fully wired — opportunity for tiered upsell).

## 6. Moat / defensibility
1. **Breadth of the built platform** — replicating 56 models / 63 routes / end-to-end pipeline coverage is a meaningful engineering lift for a competitor starting from zero.
2. **College Hiring Portal as a wedge** — placement cells are a recurring, seasonal, high-volume use case with strong word-of-mouth potential among students who become future job-seekers/candidates.
3. **Candidate community/retention flywheel** — turns a transactional ATS into a platform with standing engagement (per [Product Vision](../Vision/02-product-vision.md)), increasing switching costs over time.
4. **India-first infrastructure** (Razorpay, WhatsApp, Fast2SMS) — non-trivial integration work that global competitors (Greenhouse, Lever, etc.) typically don't prioritize for the Indian SMB market.

## 7. Honest risk disclosures (for diligence)
- Match scoring is **rule-based, not ML** — should not be pitched as an AI moat (see [Technical Debt #10](../Technical/03-technical-debt-analysis.md#10-aiml-claims-vs-reality)). The roadmap can credibly include ML-based matching as a future investment area.
- **No automated test suite** currently — a known engineering-quality gap (see [QA Strategy](../QA/01-qa-strategy.md)) that should be addressed pre-scale.
- Legacy `Organization.js` model alongside `Tenant.js` represents technical debt requiring cleanup (see [Technical Debt #1](../Technical/03-technical-debt-analysis.md#1-duplicate-organization-models--tenantjs-vs-organizationjs)).
- See [SWOT Analysis](02-swot-analysis.md) and [Risk Analysis](03-risk-analysis.md) for the full picture.

## 8. The ask
`[FOUNDER INPUT NEEDED]` — round size, use of funds, valuation/terms.

## 9. Use-of-funds suggestions (engineering-grounded, not financial advice)
Based on identified gaps, a portion of any raise could credibly fund:
1. Automated testing + CI (de-risks future development velocity).
2. ML-based match scoring (turns an honest "rule-based today" into a real AI roadmap item — see [Future Vision](../Vision/05-future-vision-5-10-20-years.md)).
3. Public API / OpenAPI contract (unlocks integration partnerships — Technical Debt #6).
4. Aadhaar-linked verification (compliance/trust differentiator for the Indian market).
5. Sales/GTM hires to capitalize on the College Hiring Portal wedge.
