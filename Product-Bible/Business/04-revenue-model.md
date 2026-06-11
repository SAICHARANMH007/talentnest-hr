# Revenue Model

## What's implemented in code today

### Subscription billing (LIVE)
- `backend/src/routes/billing.js` + `Tenant.js` implement a **subscription model** with:
  - `Tenant.plan` enum: `free / trial / starter / basic / growth / pro / agency / enterprise`
  - `Tenant.subscriptionStatus` enum: `active / expired / suspended / cancelled`
  - Plan-based usage limits: `maxJobs`, `maxRecruiters`, `maxCandidates`
  - **Razorpay** integration: order creation, payment verification (signature check), webhook handling (`PaymentRecord.js` logs `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`, `status`)
  - Public `/api/billing/plans` endpoint (plan catalog visible pre-login, useful for self-serve signup funnels)

### Implied revenue lines from the data model (LIVE infrastructure, monetization not yet activated)
| Feature | Model/Route | Monetization angle |
|---|---|---|
| Referral rewards | `Referral.js` (`rewardAmount`, `rewardPaid`) | Currently a cost center (employer pays referral bonus) — could become a TalentNest-fee-on-reward model |
| Platform referrals (coins/badges) | `PlatformReferral.js` | Gamified referral system — currently non-monetary (coins/badges), could convert to paid tiers/marketplace credits |
| Employer branding / career pages | `OrgCustomizations.js`, `Blog.js` | Premium branding could be plan-gated (already plan-tiered infrastructure exists) |
| Social posting (Facebook/Instagram) | `social.js` | Could be a premium "employer brand" add-on |

## Revenue model documented in the Product Intelligence Playbook (current draft state)
The in-app playbook (`SuperAdminPlaybooks.jsx` → Product Intelligence → §17 Monetization Strategy / §21 Revenue Model) documents:
- **Employer Branding**: "Premium career page placement, boosted job posts" — status: `PLANNED`, estimated ₹10K–₹1L/month per org.
- **College Placement Cell Program**: free accounts for placement cells as a candidate-acquisition strategy (not a direct revenue line, but a strategic distribution lever).

## Revenue model gaps (PLANNED FUTURE CAPABILITY)
None of the following are implemented in code — they represent natural extensions of the existing subscription + plan-limit infrastructure:

1. **Usage-based add-ons**: e.g. pay-per-assessment, pay-per-WhatsApp-message beyond a plan quota (Twilio costs are real and currently absorbed into the subscription price implicitly).
2. **Marketplace take-rate**: if the Talent Marketplace / freelancer discovery (see [Future Vision](../Vision/05-future-vision-5-10-20-years.md)) is built, a transaction-fee model becomes viable.
3. **Verification-as-a-service fee**: the planned Aadhaar-linked verification could be a per-verification fee charged to employers or candidates.
4. **Data/insights products**: aggregated, anonymized salary/skill-demand benchmarks (enabled by the multi-tenant `Job.skills`, `Application.matchBreakdown`, and college skill-gap data already being computed) could be sold to colleges, employers, or media as a separate insights product.
5. **API access tiers**: once a public API exists (see [Product Roadmap](../Roadmap/01-product-roadmap.md)), API-call-based pricing is a standard SaaS lever.

## Recommendation for next pricing iteration
Given the existing `Tenant.plan` enum already distinguishes `agency` from `growth`/`pro`/`enterprise`, the cleanest near-term revenue expansion is to **activate plan-gated feature flags** (`OrgCustomizations.featureFlags` already exists in the model) for: employer branding extras, WhatsApp message quotas, and assessment volume — turning existing infrastructure into billable line items without new engineering for the core mechanism.
