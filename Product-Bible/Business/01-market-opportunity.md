# Market Opportunity

> Market-sizing figures below are **directional estimates for narrative framing**, not verified third-party research. They should be replaced with sourced industry figures (e.g. NASSCOM, Naukri JobSpeak, IBEF) before external use. What IS verified is the **product surface area** built to address each segment — that part is code-grounded.

## Segments TalentNest's architecture already addresses

### 1. SMB & Mid-Market Companies (Tenant types: `org`, `tenant`)
- Single-org tenants get the full ATS + career page + employer branding stack.
- Plan-based limits (`Tenant.maxJobs`, `maxRecruiters`, `maxCandidates`) and plan tiers (`free/trial/starter/basic/growth/pro/agency/enterprise`) show the product is already designed to upsell from free → enterprise within this segment.

### 2. Staffing Agencies / RPOs (Tenant types: `vendor`, `client`)
- `Tenant.parentId` allows a vendor tenant to have client sub-tenants — i.e. a staffing agency can manage multiple end-client placements within one TalentNest account.
- The `client` user role exists specifically to give staffing-agency clients **read-only visibility into shortlists and placement progress** without exposing internal recruiting data — a feature most SMB-focused ATS products don't build.

### 3. Colleges & Universities (Tenant type: `college`)
- The newly-built College Hiring Portal (`placement_officer` role) directly targets India's ~40,000+ engineering/diploma/MBA colleges and their placement cells — a segment historically served by spreadsheets, WhatsApp, and generic email.
- This is also a **candidate acquisition channel**: every student who builds a profile through their college's TalentNest portal becomes a TalentNest candidate for life.

### 4. Individual Candidates (role: `candidate`)
- Career pages, job alerts, referrals, communities, and company reviews make TalentNest a destination in its own right, not just a backend tool recruiters use — this is the flywheel that makes employer tenants more valuable over time (more candidates = better matches = more employer value = more willingness to pay).

## Why now (product-side argument)
1. **India-first integrations are already production-ready** (Razorpay, WhatsApp via Twilio, Cloudinary, Resend/Zoho SMTP) — there is no "localize for India" project left to do; it's already the default.
2. **The College Hiring Portal is brand new** (this development cycle) and represents a largely untapped distribution channel: placement officers as a B2B2C acquisition motion for candidate supply.
3. **Multi-tenancy with parent/child tenants** means the staffing-agency segment (a large, underserved part of the Indian recruiting market) is structurally supported without additional engineering.

## Where the opportunity is NOT yet de-risked
- **No public benchmarking data exists yet** inside the product (e.g. industry salary benchmarks, time-to-fill benchmarks across tenants) — this would be a high-value, low-marginal-cost feature given the multi-tenant data already being collected (anonymized/aggregated).
- **No marketplace/discovery layer** connecting candidates across tenants to jobs outside their immediate application history (beyond job alerts and smart-match within a tenant's job postings + cross-tenant career pages).

See [Missing Features Analysis](../Roadmap/02-missing-features-analysis.md) for the full gap list.
