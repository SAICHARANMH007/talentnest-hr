# User Personas

These personas map 1:1 to the 7 roles defined in `backend/src/models/User.js`:
```
role: ['super_admin', 'admin', 'recruiter', 'hiring_manager', 'client', 'candidate', 'placement_officer']
```

---

## 1. Super Admin — "Priya, Platform Operator"
- **Who**: TalentNest internal staff managing the platform across all tenants.
- **Goals**: Keep all tenant orgs healthy, manage billing/plans, monitor platform-wide audit logs and NPS, moderate community content, generate Product Intelligence Playbooks for stakeholders.
- **Primary surfaces**: `/app/superadmin/*` — Orgs, Billing, Audit, Permissions, Security, Platform config, Playbooks, Command Center.
- **Frustration without TalentNest**: No cross-tenant visibility; would need direct DB access to answer "which tenants are near their plan limits?"

## 2. Admin (HR Manager) — "Rahul, HR Head at a 200-person company"
- **Who**: Org-wide administrator for a single `org`/`tenant`.
- **Goals**: Set up the org (branding, email settings, custom pipeline stages), invite recruiters/hiring managers/clients, manage billing, review org-wide analytics, oversee BGV and offer letter compliance.
- **Primary surfaces**: Org Settings, Admin Users (invites), Admin Analytics, Admin Jobs, Custom Fields, Pipeline Templates, Billing.
- **Frustration without TalentNest**: Hiring data scattered across recruiters' personal spreadsheets; no single view of org-wide funnel performance.

## 3. Recruiter — "Ananya, Talent Acquisition Specialist"
- **Who**: Day-to-day pipeline operator within a tenant.
- **Goals**: Post jobs, source/screen candidates, move applications through pipeline stages, schedule interviews (incl. video), assign assessments, send offers, request BGV documents.
- **Primary surfaces**: Recruiter Dashboard, Recruiter Candidates, Recruiter Pipeline, Recruiter Jobs, Recruiter Assessments, Talent Mirror (smart match).
- **Frustration without TalentNest**: Juggling LinkedIn, email, Excel pipeline trackers, and a separate calendar tool for interviews.

## 4. Hiring Manager — "Vikram, Engineering Manager"
- **Who**: Department head reviewing candidates for roles on their team.
- **Goals**: Review shortlists, give structured interview feedback (scorecards via `InterviewKit.js`), approve/reject candidates, view department headcount plans.
- **Primary surfaces**: Pipeline view (read + feedback), interview scorecards, headcount plans (own department).
- **Frustration without TalentNest**: Feedback given verbally or in scattered emails, lost by the time a hiring decision is made.

## 5. Client — "Suresh, Client Stakeholder at a Vendor's End-Customer"
- **Who**: External stakeholder at a company that has engaged a staffing agency (`vendor` tenant) for recruitment.
- **Goals**: View shortlisted candidates for their requisitions and track placement progress — without seeing the agency's internal recruiting operations.
- **Primary surfaces**: Read-only shortlist/placement dashboard scoped via the vendor relationship (`Tenant.parentId`).
- **Frustration without TalentNest**: Relying on the agency to email periodic Excel updates on candidate status.

## 6. Candidate — "Meera, Job Seeker / Working Professional"
- **Who**: Anyone applying to jobs, regardless of tenant — candidates are a cross-tenant identity.
- **Goals**: Build a profile (resume parsed automatically), browse/apply to jobs via career pages, track application status in real time, join communities, post on the feed, connect with other professionals, receive and sign offer letters, complete BGV, take assessments, write/read company reviews, get job alerts, earn referral rewards.
- **Primary surfaces**: Candidate Dashboard, Explore Jobs, Candidate Applications, Candidate Profile, Communities/Feed, Connections, Messages.
- **Frustration without TalentNest**: Applying into a black hole with zero visibility, and no way to vet employer reputation before investing time.

## 7. Placement Officer — "Dr. Kavita, Training & Placement Officer at an Engineering College"
- **Who**: Staff at a college (`Tenant.type: 'college'`) responsible for campus placements.
- **Goals**: Maintain a roster of current students and alumni, schedule and run on-campus/virtual placement drives, monitor where students have applied and been placed (with private notes), understand which skills employers demand vs. what students have, and share course recommendations to close gaps.
- **Primary surfaces**: College Overview (drill-down dashboard), College Students, College Drives, College Placements — all under `/app/college/*`, backed by `dashboard.js` `/college/*` routes and `PlacementDrive.js`.
- **Frustration without TalentNest**: Tracking hundreds of students' application/placement status via spreadsheets and WhatsApp groups, with no analytics on departmental placement rates or skill trends.

---

## Persona-to-feature traceability
Every persona above maps to a specific set of routes/pages — see [Module Documentation](03-module-documentation.md) for the full page-by-page breakdown and [Functional Requirements](04-functional-requirements.md) for what each persona's surfaces must do.
