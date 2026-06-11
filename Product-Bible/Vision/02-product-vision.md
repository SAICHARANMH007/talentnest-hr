# Product Vision

## The vision in one sentence
TalentNest HR aims to become a **Talent Operating System (TOS)** for India — a single platform that connects companies, recruiters, candidates, colleges, and the broader professional community across the entire talent lifecycle: discovery, hiring, verification, onboarding, growth, and reputation.

## Why "Operating System" and not "ATS"
An ATS is a tool a recruiter uses. An **operating system** is the substrate that every participant in the ecosystem runs on. The codebase already reflects this ambition through its **multi-tenant, multi-role architecture**:

| Layer | What exists today | Code evidence |
|---|---|---|
| **Hiring engine** | Jobs, applications, pipeline stages, smart match scoring, interviews, assessments, offers | `jobs.js`, `applications.js`, `assessments.js`, `offers.js` |
| **Candidate platform** | Profiles, resume parsing, application tracking, job alerts, referrals | `candidates.js`, `parseResume.js`, `jobAlerts.js`, `referrals.js` |
| **Social / community layer** | Feed posts, communities (cross-tenant), connections, direct messaging | `feed.js`, `communities.js`, `connections.js`, `messages.js` |
| **Reputation layer** | Company reviews, NPS, candidate verification (planned) | `companyReviews.js`, `nps.js`, [Aadhaar spec](../Compliance/01-compliance-documentation.md) |
| **Campus pipeline** | College tenant type, placement officer role, placement drives, skill-gap analysis | `Tenant.js` (`type: college`), `User.js` (`role: placement_officer`), `PlacementDrive.js`, `dashboard.js` (`/college/*`) |
| **Platform operations** | Multi-tenant billing, plan limits, audit logs, super-admin command center | `Tenant.js`, `billing.js`, `audit.js`, `SuperAdminCommandCenter` pages |

## The strategic bet
Most competitors in India optimize for **one side of the marketplace** — Naukri/LinkedIn optimize for the candidate-facing job board; Darwinbox/Zoho Recruit optimize for the enterprise HR back office. TalentNest's bet is that **owning both sides on one data model** creates compounding value:

1. **Candidates** build a profile once (resume, skills, reviews, NPS, community presence) and carry it across every employer on the platform.
2. **Employers** get a pipeline of candidates who already trust the platform (via company reviews, NPS, community), reducing cost-per-hire.
3. **Colleges** feed a continuous stream of fresh, verified graduate talent into the same pool — the College Hiring Portal (built this cycle) is the first concrete instantiation of this loop: students get visibility into real jobs/companies hiring on TalentNest, and placement officers get analytics on where their students are succeeding and what skills they're missing.
4. **Verification** (Aadhaar-linked, planned) becomes the trust layer that differentiates TalentNest profiles from anonymous resumes elsewhere.

## What "done" looks like
A recruiter posts one job. That job is automatically:
- Visible on the company's branded career page
- Surfaced to matching candidates via smart-match and job alerts
- Distributed to relevant college placement portals (where eligible)
- Trackable end-to-end — application → interview → offer → BGV → pre-boarding → Day 1
- Feeding analytics back to the employer (time-to-fill, source quality) and to colleges (placement rate, in-demand skills)

This loop already exists in skeletal form across the modules listed above. The roadmap (see [Product Roadmap](../Roadmap/01-product-roadmap.md)) is about deepening each node and closing the remaining gaps — particularly AI-assisted matching, verification, and a true public API.
