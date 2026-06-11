# Functional Requirements

Requirements below are written in **"the system shall..."** form, derived from the implemented behavior in code (i.e. these describe what the system *currently does*, framed as requirements it satisfies — useful as a baseline for regression testing and for writing new requirements against).

## FR-1: Authentication & Access Control
- FR-1.1 The system shall support email/password registration and login, issuing JWT access + refresh tokens (`auth.js`).
- FR-1.2 The system shall support Google OAuth login via `google-auth-library`.
- FR-1.3 The system shall support OTP-based verification for login/2FA (`Otp.js`).
- FR-1.4 The system shall enforce role-based access control via `allowRoles()` middleware on every protected route, scoped to one of 7 roles.
- FR-1.5 The system shall enforce tenant isolation via `tenantGuard` middleware, scoping all queries by `tenantId` (except cross-tenant Communities).
- FR-1.6 The system shall support invite-token-based onboarding with a 7-day expiry, and a temp-password fallback delivery method.

## FR-2: Job Management
- FR-2.1 The system shall allow `admin`/`recruiter` roles to create, edit, publish, archive, and soft-delete jobs (`jobs.js`).
- FR-2.2 The system shall expose published jobs publicly via career page slugs without authentication.
- FR-2.3 The system shall return `applicantsCount` and `selectedCount` per job via aggregation over `Application`.
- FR-2.4 The system shall support assigning recruiters and candidates to jobs.

## FR-3: Application Pipeline
- FR-3.1 The system shall allow candidates to apply to jobs both authenticated and via a public no-auth endpoint (`POST /api/applications/public`), preventing duplicate applications by email per job.
- FR-3.2 The system shall track an `Application.stageHistory` for every stage transition.
- FR-3.3 The system shall support bulk stage moves across multiple applications.
- FR-3.4 The system shall compute a `matchBreakdown` (skill/experience/location/notice scores) for each application.
- FR-3.5 The system shall notify org admins/super-admins on new applications, and notify assigned recruiters (excluding the actor) plus org admins on key stage-change milestones (selected/offer_extended/rejected).

## FR-4: Candidate Profile & Resume
- FR-4.1 The system shall allow candidates to upload a resume (PDF/DOCX) and automatically extract name, skills, and experience (`parseResume.js`).
- FR-4.2 The system shall allow candidates to maintain a profile reusable across all tenants/applications.
- FR-4.3 The system shall support video resume upload/playback (`candidateVideo.js`).
- FR-4.4 The system shall support BGV document upload for types `aadhar/pan/ssn/passport`, with verification status tracking (`pending/approved/rejected`).

## FR-5: Interviews & Assessments
- FR-5.1 The system shall support self-scheduling links for interviews with candidate confirmation (`schedule.js`/`SchedulingLink.js`).
- FR-5.2 The system shall support WebRTC video interview rooms with Socket.io signaling, optional TURN server (Metered.live or custom).
- FR-5.3 The system shall support assessment creation with question types `mcq_single/mcq_multi/text/code/truefalse`, time limits, passing scores, auto-advance, and anti-cheat flagging.
- FR-5.4 The system shall record assessment submissions with per-question answers and a total score.

## FR-6: Offers & Onboarding
- FR-6.1 The system shall generate offer letter PDFs (PDFKit) with `ctcOffered`, `tenure`, `joiningDate`, and support digital signature images.
- FR-6.2 The system shall track offer status (`draft/sent/accepted/rejected/expired`).
- FR-6.3 The system shall support pre-boarding checklists with categorized tasks, due dates, and verification status, generated from reusable `OnboardingTemplate`s.

## FR-7: Communication
- FR-7.1 The system shall send transactional email via Resend (cloud) with Zoho SMTP fallback (local dev).
- FR-7.2 The system shall send WhatsApp messages via Twilio, logging delivery status (`WhatsAppLog.js`).
- FR-7.3 The system shall support drip email sequences with per-candidate enrollment and step progression (`EmailSequence.js`).
- FR-7.4 The system shall support 1:1 direct messaging in real time via Socket.io.
- FR-7.5 The system shall support in-app and browser push (VAPID) notifications.

## FR-8: Social & Reputation
- FR-8.1 The system shall support a social feed with posts, images, reactions, comments, and post types (`update/achievement/announcement/milestone/hiring`).
- FR-8.2 The system shall support cross-tenant Communities (Colleges and Companies), with join/leave and per-community feeds.
- FR-8.3 The system shall support public Company Reviews with rating breakdowns (salary/culture/growth) and admin moderation/reporting.
- FR-8.4 The system shall support NPS surveys with sentiment classification (`positive/neutral/negative`).

## FR-9: College Hiring Portal (`placement_officer`)
- FR-9.1 The system shall provide a College Overview dashboard with KPIs: Total Students, Current Students, Alumni, Total Applications, Placements, Placement Rate, Upcoming Interviews — each navigable to a filtered detail view.
- FR-9.2 The system shall provide department-level and batch/year-level breakdowns of student counts and placement rates, each clickable to a filtered student list.
- FR-9.3 The system shall provide a searchable/filterable student roster (by department, year, student type) with per-student profile and personalized course recommendations based on skill gaps.
- FR-9.4 The system shall allow placement officers to create and manage placement drives with eligibility criteria (min CGPA, branches, skills) and student registrations.
- FR-9.5 The system shall provide a placement records view (stage, company, applied date) filterable by stage and company, with private (college-only) follow-up notes per record.
- FR-9.6 The system shall compute a Skill Gap Analysis comparing in-demand job skills (from active `Job.skills`) against student skill coverage, with course recommendations per skill.
- FR-9.7 All College Hiring Portal filters shall be reflected in the URL (query params) so views are shareable/bookmarkable.

## FR-10: Billing & Plans
- FR-10.1 The system shall expose a public plan catalog (`GET /api/billing/plans`).
- FR-10.2 The system shall support Razorpay order creation, payment verification, and webhook-based status updates.
- FR-10.3 The system shall enforce per-tenant `maxJobs`, `maxRecruiters`, `maxCandidates` limits based on `Tenant.plan`.

## FR-11: Platform Operations
- FR-11.1 The system shall maintain an immutable per-tenant audit log of admin/recruiter actions.
- FR-11.2 The system shall provide a Super Admin command center with cross-tenant visibility, org management, and platform health checks (`/api/platform/health`).
- FR-11.3 The system shall generate on-demand HTML "Playbook" documents (Developer, Product Intelligence, Sales, Tester, Architecture, Platform, User, Audit Report, Full Bible, Custom) for download/preview, dated to the current day.

---

For requirements that describe **future** behavior (not yet implemented), see [Missing Features Analysis](../Roadmap/02-missing-features-analysis.md) — none of those are included above, per the "trust the code" principle.
