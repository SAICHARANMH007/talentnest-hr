# Future Vision (5 / 10 / 20 Years)

> **Everything in this document is `PLANNED FUTURE CAPABILITY` unless explicitly marked as already built.** None of the timeframes below are commitments — they are directional framing for investor and roadmap conversations, derived from extrapolating the existing architecture (multi-tenant, multi-role, India-first) outward.

## Horizon 1 — Year 1-2: Complete the Talent OS core
Building directly on what exists today:
- **Aadhaar-Linked Candidate Verification** (`PLANNED FUTURE CAPABILITY` — full spec already written, see [Compliance Documentation](../Compliance/01-compliance-documentation.md)). This converts every TalentNest candidate profile into a verified identity, which is the trust foundation for everything that follows.
- **AI-assisted matching**: today's `Application.matchBreakdown` (skillScore/experienceScore/locationScore/noticeScore) is rule-based. `PLANNED`: layer an LLM-based semantic match on top, using existing resume-parsed data — no new data collection required.
- **Public API / developer platform**: expose a versioned, documented API (the 63 internal route files are the natural starting surface) so ATS integrations, job boards, and HR tools can plug into TalentNest as a system of record.
- **College Hiring Portal expansion**: today's `placement_officer` role covers students, drives, placements, and skill gaps for one college tenant. `PLANNED`: multi-college consortiums, inter-college leaderboards, employer-sponsored skill bootcamps tied directly to skill-gap data already computed in `skillCourses.js`.

## Horizon 2 — Year 3-5: Become the trust & reputation layer for Indian hiring
- **Candidate Reputation Score**: combine verified identity (Aadhaar), NPS history (`CandidateNPS.js`), assessment performance (`AssessmentSubmission.js`), and employer feedback into a portable reputation signal — candidate-owned, shown only with consent.
- **Employer Trust Score**: aggregate `CompanyReview.js` data, response-time metrics (from `Application.stageHistory` timestamps), and offer-honor rates (`OfferLetter.js` status) into a public employer trust signal — making the existing review system a competitive moat against employer-controlled platforms.
- **Talent Marketplace**: open the existing `TalentPool.js` / `Candidate.js` model to **freelancer/contract discovery** — a natural extension since the candidate schema already supports `source: 'talent_match'` and skills-based search.
- **Assessment platform as a standalone product**: `Assessment.js` / `AssessmentSubmission.js` already support MCQ/code/text question types with anti-cheat flags — this could be licensed to colleges and bootcamps independent of the hiring flow.

## Horizon 3 — Year 5-10: Pan-India campus-to-career pipeline
- Every engineering/MBA/diploma college runs its placement cell on the College Hiring Portal (`Tenant.type: 'college'`).
- Students graduate with a **TalentNest profile that already has verified identity, assessment history, and skill-gap-driven course completions** — making them immediately matchable to employer demand.
- Employers get **predictive headcount planning** (`HeadcountPlan.js` already models this at the org level) informed by real-time graduate supply data from college tenants.

## Horizon 4 — Year 10-20: Talent Operating System for the region
- TalentNest becomes the **identity + reputation + hiring substrate** that other HR tools build on top of (via the Horizon-1 public API), similar to how payment rails became infrastructure rather than end-user products.
- Cross-border expansion leveraging the same architecture: the `BgvDocument.documentType` enum already includes `passport` alongside `aadhar/pan/ssn`, hinting at a design that anticipated non-India identity documents.
- The community/social layer (`FeedPost.js`, `Connection.js`, `Community.js`) — currently a recruiting-adjacent feature — could mature into the **professional network of record** for verified Indian professionals, with hiring as one (no longer the only) monetization surface.

## Why this isn't pure speculation
Each horizon explicitly maps onto a model, route, or page that **already exists in the codebase today**. The vision is not "build something new" — it's "deepen and connect what's already structurally present." This is the strongest signal for investors: the hard architectural decisions (multi-tenancy, role model, India-first integrations, candidate-as-identity) are already made and shipped.
