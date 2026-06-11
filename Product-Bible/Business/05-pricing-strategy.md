# Pricing Strategy

## Plan tiers as defined in code
`backend/src/models/Tenant.js` defines the canonical plan enum:

```
plan: ['free', 'trial', 'starter', 'basic', 'growth', 'pro', 'agency', 'enterprise']
```

Each tenant additionally carries:
- `maxJobs` — cap on active job postings
- `maxRecruiters` — cap on recruiter/admin seats
- `maxCandidates` — cap on candidate pool size
- `subscriptionStatus`: `active / expired / suspended / cancelled`

This is a **classic seat + usage-cap SaaS pricing model**, with a dedicated `agency` tier (for staffing agencies managing multiple `client` sub-tenants via `Tenant.parentId`) sitting alongside the standard `starter → enterprise` ladder.

## Legacy `Organization` model
A separate, older `Organization.js` model exists with its own `plan`, `status` (`active/suspended/trial/pending`), `stripeCustomerId`, and `settings.featureFlags` — including `isStaffingAgency`. This appears to be a **predecessor model to `Tenant.js`** (note the `stripeCustomerId` field, while `Tenant.js` uses Razorpay fields). This is flagged in [Technical Debt Analysis](../Technical/03-technical-debt-analysis.md) as a likely candidate for consolidation — having two overlapping "organization" models is a data-integrity risk if both are still referenced anywhere.

## What a pricing page would need (based on plan-limit fields already in the model)

| Plan | Suggested target buyer | Gating levers available in code today |
|---|---|---|
| `free` / `trial` | Individual recruiters, small startups, evaluation | `maxJobs`, `maxRecruiters`, `maxCandidates` set low |
| `starter` / `basic` | Small companies (1-10 recruiters) | Core ATS + career page, limited assessments/WhatsApp |
| `growth` / `pro` | Mid-market companies | Higher caps, employer branding, social posting, webhooks |
| `agency` | Staffing agencies / RPOs | `Tenant.parentId` multi-client structure, `client` role access |
| `enterprise` | Large enterprises, colleges (consortium) | Custom limits, audit logs, custom fields, pipeline templates, SSO (planned) |

## Pricing strategy gaps (PLANNED FUTURE CAPABILITY)
1. **No self-serve pricing page is documented as live** — `/api/billing/plans` is public, but the actual pricing page UI/copy was not located in this audit pass; confirm before publishing external pricing.
2. **College tenant pricing** is not differentiated in the `Tenant.plan` enum — the College Hiring Portal currently rides on the same plan ladder as commercial orgs. Given the playbook's stated strategy of "free accounts for placement cells" as a distribution lever, a dedicated `college` pricing track (likely free or heavily discounted, monetized via downstream candidate-to-employer value) should be modeled explicitly.
3. **Usage overage pricing** (e.g. WhatsApp messages beyond quota via Twilio, which has real per-message cost) is not implemented — currently any usage limits beyond `maxJobs/maxRecruiters/maxCandidates` would need to be enforced manually.
4. **Currency**: `Tenant.js` and `PaymentRecord.js` are Razorpay/INR-centric. Multi-currency support for international expansion (see [Future Vision](../Vision/05-future-vision-5-10-20-years.md) Horizon 4) is not implemented.

## Recommendation
Treat `maxJobs/maxRecruiters/maxCandidates` as the **primary pricing dials** (already enforced), and introduce **feature-flag-based add-ons** (via `OrgCustomizations.featureFlags`, already present in the model) for employer branding, WhatsApp quotas, and assessment volume as the next pricing-strategy increment — this requires no new data model changes, only enforcement logic and a pricing page.
