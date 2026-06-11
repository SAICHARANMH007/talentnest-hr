# Problem Statement

## The core problem
Hiring in India is fragmented across **disconnected tools that don't trust each other's data**:

- Companies post jobs on Naukri/LinkedIn, track candidates in spreadsheets or a separate ATS, communicate via email and WhatsApp manually, generate offer letters in Word, and chase BGV documents over email threads.
- Candidates apply into a black hole — no visibility into pipeline stage, no way to verify if a company is reputable before investing time, and no portable profile that follows them between employers.
- Colleges run placement cells using spreadsheets and WhatsApp groups — no systematic visibility into which companies are actually hiring their students, what skills employers want, or how their placement rates compare across departments/batches.

## Problem breakdown by stakeholder (and the module that addresses it)

### Companies / Recruiters / Admins
| Pain point | TalentNest module |
|---|---|
| "We use 4 different tools for sourcing, pipeline, interviews, and offers" | Unified ATS: `jobs.js`, `applications.js`, `interviewKits.js`, `offers.js` |
| "We can't tell which candidates are a good fit without manually screening" | Smart-match scoring (`Application.matchBreakdown`), Assessments |
| "BGV is a manual email/PDF nightmare" | `bgv.js` + `BgvDocument.js` digital collection & tracking |
| "Onboarding before Day 1 is ad hoc" | `preboarding.js` + `OnboardingTemplate.js` checklists |
| "We don't know our hiring funnel performance" | `dashboard.js` analytics, audit logs |
| "Our employer brand isn't visible to candidates" | Career pages, `OrgCustomizations.js`, blogs, social posting |

### Candidates
| Pain point | TalentNest module |
|---|---|
| "I apply and never hear back" | `Application.stageHistory` + real-time notifications |
| "I don't know if this company is legit" | `CompanyReview.js` public reviews |
| "My resume/profile isn't portable across applications" | Single `Candidate` profile reused across all jobs/tenants |
| "I miss out on referral rewards / new postings" | `Referral.js`, `PlatformReferral.js`, `JobAlert.js` |
| "I have no professional network on the platform" | `Connection.js`, `FeedPost.js`, `DirectMessage.js`, Communities |

### Placement Officers / Colleges
| Pain point | TalentNest module |
|---|---|
| "We don't know which of our students applied where, or got placed" | College Hiring Portal — `/college/students`, `/college/placements` |
| "We can't track on-campus drives systematically" | `PlacementDrive.js` + `/college/drives` |
| "We don't know what skills employers want vs. what our students have" | Skill Gap Analysis (`/college/skill-gaps`, `skillCourses.js`) |
| "We have no department/batch-level placement insights" | CollegeOverview drill-down dashboard with dept/year breakdowns |

### Platform Operator (TalentNest itself)
| Pain point | TalentNest module |
|---|---|
| "We need to manage many tenants with different plans/limits" | `Tenant.js` (plan, maxJobs, maxRecruiters, maxCandidates) |
| "We need visibility across all tenants for support" | Super Admin Command Center, audit logs, NPS dashboard |
| "We need to bill tenants in INR with local payment rails" | `billing.js` + Razorpay integration |

## The unifying insight
Every one of these pain points stems from the same root cause: **data and trust don't travel with the people who need them**. A candidate's profile, a company's reputation, a placement officer's view of outcomes — all of it is normally siloed per tool. TalentNest's single multi-tenant data model is the structural fix; the remaining product work (see [Product Roadmap](../Roadmap/01-product-roadmap.md)) is about deepening the connective tissue (AI matching, verification, public APIs) on top of that foundation.
