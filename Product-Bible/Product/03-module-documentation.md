# Module Documentation

This document breaks the platform down by **functional module**, mapping frontend page groups (as seen in `src/pages/*` and the Vite build output chunk names) to backend routes/models. Modules are grouped by the primary role that uses them, though several are shared across roles.

---

## 1. Authentication & Onboarding
- **Pages**: Auth screens (login, register, OTP, Google OAuth, password reset, invite acceptance) — bundle `pages-auth`.
- **Backend**: `auth.js`, `Otp.js`, `RefreshToken.js`, `Invite.js`, `UserSession.js`.
- **Roles**: All.
- **Key flows**: Email/password login, Google OAuth login, OTP verification, invite-token-based account activation, password reset, 2FA toggle.

---

## 2. Admin Module (`admin` role)
- **Pages**: Admin Dashboard/Overview, Admin Analytics, Admin Jobs, Admin Job Approval, Admin Users (incl. Pending Invites), Org Settings, Admin Automation.
- **Backend**: `admin.js`, `orgs.js`, `jobs.js`, `users.js`, `customizations.js`, `customFields.js`, `pipelineTemplates.js`, `headcountPlans.js`, `dashboard.js` (org-level analytics).
- **Key flows**:
  - Org setup: branding, email settings, custom pipeline stages (`OrgCustomizations.js`)
  - Invite recruiters/hiring managers/clients via secure token or temp password (`admin.js` invite endpoints)
  - Job approval workflow (Admin Job Approval page)
  - Org-wide analytics: KPI cards, 14-day application trend, pipeline stage donut chart, top jobs by applicants (`AdminAnalytics`)
  - Custom field definitions for candidates/applications/jobs
  - Headcount planning (department-level forecasts/budgets)

---

## 3. Recruiter Module (`recruiter` role)
- **Pages**: Recruiter Dashboard, Recruiter Candidates, Recruiter Jobs, Recruiter Pipeline, Recruiter Assessments, Recruiter Talent Match (Talent Mirror).
- **Backend**: `jobs.js`, `candidates.js`, `applications.js`, `assessments.js`, `interviewKits.js`, `offers.js`, `bgv.js`, `schedule.js`, `videoRooms.js`, `whatsapp.js`, `talentPool.js`, `savedSearches.js`.
- **Key flows**:
  - Source/add candidates (manual, resume upload, bulk import)
  - Pipeline kanban — move applications through stages, bulk-stage actions, inline stage change
  - Smart match scoring (Talent Mirror) — `Application.matchBreakdown` (skill/experience/location/notice)
  - Schedule interviews (self-scheduling links + video rooms)
  - Create/assign assessments, review submissions, anti-cheat flags
  - Generate and send offer letters (PDF, digital signature)
  - Request and track BGV documents
  - WhatsApp messaging to candidates
  - Share jobs via `ShareJobModal` (email + copy link, outreach tracking via `Invite.js`)

---

## 4. Hiring Manager Module (`hiring_manager` role)
- **Pages**: Subset of Recruiter Pipeline (read + feedback), interview scorecards, departmental headcount plans.
- **Backend**: `applications.js` (feedback/scorecard endpoints), `interviewKits.js`, `headcountPlans.js`.
- **Key flows**: Review shortlists, submit structured interview feedback against `InterviewKit` scorecards, approve/reject candidates in pipeline (limited actions vs. recruiter/admin).

---

## 5. Client Module (`client` role)
- **Pages**: Read-only shortlist/placement dashboard.
- **Backend**: Scoped reads via `applications.js`/`jobs.js` filtered by the agency (`vendor`) tenant relationship (`Tenant.parentId`).
- **Key flows**: View shortlisted candidates, track placement progress for requisitions assigned by the agency — no access to internal recruiting operations.

---

## 6. Candidate Module (`candidate` role)
- **Pages**: Candidate Dashboard, Candidate Explore Jobs, Candidate Applications, Candidate Profile, Candidate Talent Match, Candidate Assessment — bundles `cand-dashboard`, `cand-misc`.
- **Backend**: `candidates.js`, `applications.js` (incl. `/public` no-auth apply route), `candidateDocs.js`, `candidateVideo.js`, `bgv.js`, `jobAlerts.js`, `referrals.js`, `nps.js`, `companyReviews.js`, `parseResume.js`.
- **Key flows**:
  - Profile setup with resume upload + auto-parsing
  - Browse/apply to jobs via career pages or in-app explore
  - Track application status in real time (stage history)
  - Take assessments
  - Receive, review, and digitally sign offer letters
  - Submit BGV documents
  - Subscribe to job alerts
  - Generate referral links, track referral status/rewards
  - Submit company reviews and NPS feedback

---

## 7. Social / Community Module (cross-role, primarily candidate + recruiter)
- **Pages**: Community Feed, Community Detail Page — bundles `CommunityFeed`, `CommunityDetailPage`.
- **Backend**: `feed.js` / `social-posts`, `communities.js`, `connections.js`, `messages.js`, `presence.js`.
- **Key flows**: Post to feed (text/images), react/comment, join/leave communities (cross-tenant — Colleges & Companies groups), send/accept connection requests, 1:1 direct messaging (Socket.io real-time), online presence indicators.
- **Recent enhancements** (per Product Intelligence Playbook §36): community list load time reduced from 15-20s to <1s via throttled maintenance sync; communities sorted by user's own college/company first then by member count; near-duplicate college names merged via `collegeNames.js` (`normalizeCollegeKey`).

---

## 8. College Hiring Portal (`placement_officer` role, `college` tenant)
- **Pages**: College Overview (drill-down dashboard), College Students, College Drives, College Placements — `src/pages/college/*`.
- **Backend**: `dashboard.js` `/college/*` routes (`/college/overview`, `/college/students`, `/college/drives`, `/college/placements`, `/college/skill-gaps`), `PlacementDrive.js`, `skillCourses.js`.
- **Key flows**:
  - **College Overview**: KPI cards (Total/Current Students, Alumni, Total Applications, Placements, Placement Rate, Upcoming Interviews) — all clickable, drilling into filtered Students/Applicants views. Department and batch (year) breakdowns, placement rate by batch, recent placements, top hiring companies, recently joined students — all clickable for drill-down. Skill Gap Analysis section with course recommendations.
  - **College Students**: searchable/filterable roster (by department, batch/year, student type — current/alumni), per-student profile modal showing skills, education, and personalized course recommendations (`api.getStudentSkillRecommendations`).
  - **College Drives**: schedule and manage on-campus/virtual/off-campus placement drives with eligibility criteria (min CGPA, branches, skills) and student registrations (`PlacementDrive.js`).
  - **College Placements**: track placement records (stage, company, applied date) with stage-summary chips and **private follow-up notes** (`collegeNotes`, college-only visibility), filterable by stage/company.
  - All drill-down navigation uses URL search params (`?dept=`, `?year=`, `?stage=`, `?company=`, `?q=`) so filtered views are shareable/bookmarkable and show a "Filtered by: ... ✕ Clear" chip.

---

## 9. Marketing / Public Site
- **Pages**: Landing Page, Services, Industries, About, Contact, HRMS info page, Blog — bundles `mkt-landing`, `mkt-misc`, `data-blogs`.
- **Backend**: `blogs.js` (public read), `leads.js` (public lead capture), career page routes (`/careers/*`).
- **Key flows**: Marketing funnel (services/industries/about/contact), public career pages (job board, sitemap/JSON feed for SEO via IndexNow), lead capture forms, blog content.

---

## 10. Super Admin Module (`super_admin` role)
- **Pages**: Super Admin Command Center, Orgs, Billing, Audit, Permissions, Security, Platform config, Customizations (Logo Manager), Candidate Import, Playbooks — bundles `SuperAdminCommandCenter`, `sa-platform`, `SuperAdminCustomizations`, `sa-playbooks`, `adm-misc`.
- **Backend**: `admin.js`, `orgs.js`, `audit.js`, `platform.js`, `leads.js`, `webhooks.js`, billing oversight via `billing.js`.
- **Key flows**:
  - Org management: create/suspend/view tenants, plan management
  - Platform-wide audit log viewer
  - Permissions/role configuration
  - Security settings (2FA policy, session management)
  - Platform config: feature flags, environment status, system health (`/api/platform/health`)
  - Logo/branding manager (drag-drop uploader, canvas PNG export)
  - Candidate bulk import tooling
  - **Playbooks**: generate/preview/download the in-app documentation playbooks (Developer, Product Intelligence, Sales, Tester, Architecture, Platform, User, Audit Report, Full Bible, Custom) — see [QA Strategy](../QA/01-qa-strategy.md) for how these relate to testing/documentation.
  - College Groups page: cross-tenant view of college communities, search, pagination, "Top college" badge, near-duplicate name merging.

---

## Cross-cutting components
- **QuickActionMenu**: floating "+" FAB for recruiters/admins/super_admins → "Post Job" / "Add Candidate" quick actions.
- **Notification system**: bell icon, real-time via Socket.io, triggers on new applications (notify org admins/super_admins) and stage changes (notify assigned recruiters + admins on key milestones).
- **Logo/branding system**: `LogoContext` propagates org branding across the app in real time.
