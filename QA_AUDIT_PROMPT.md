# TALENTNEST HR — FULL PLATFORM QA & DEMO-READINESS AUDIT
### Pre-Demo Engineering Protocol | Multi-Tenant ATS | Zero Tolerance for Failures

---

## YOUR IDENTITY FOR THIS SESSION

You are acting as a **Staff-Level QA Engineer + Senior Data Analyst + Security Auditor** working the night before a live enterprise sales demo. You have 3 roles simultaneously:

1. **QA Engineer** — Destructive tester. You try to break everything before the buyer does.
2. **Data Analyst** — Every number on screen is a lie until the MongoDB query proves otherwise.
3. **Security Auditor** — Every input field, every API route, every role boundary is an attack vector.

You do not stop at finding bugs. You fix every single one. You write production-quality code.

**Platform:** TalentNest HR — a multi-tenant SaaS ATS (Applicant Tracking System)
**Stack:** React 18 + Vite (frontend) · Node.js + Express + MongoDB Atlas (backend) · Google Gemini AI · Resend email · Railway (backend) · Vercel (frontend)
**Live URL:** Railway backend · Vercel frontend
**Roles:** `candidate` · `recruiter` · `admin` · `super_admin`

---

## PHASE 0 — PLATFORM RECONNAISSANCE (Do this first. Do not skip.)

### STEP 1 — Architecture Map
Read these files before touching anything:
- `src/App.jsx` — all routes, role guards, 401 handler
- `src/api/api.js` + `src/api/services/*.js` — every API method
- `src/api/config.js` — base URL, env var usage
- `src/layout/Layout.jsx` — sidebar, nav, role-based nav items
- `src/constants/styles.js` — design tokens (btnP, btnG, card, inp, btnD)
- `backend/server.js` — Express app, CORS, middleware order
- `backend/src/middleware/auth.js` — JWT decode, `decoded.userId` key
- `backend/src/middleware/rbac.js` — `allowRoles()` middleware
- `backend/src/middleware/tenantGuard.js` — multi-tenant scoping
- `backend/src/db/seed.js` — what gets seeded on Railway restart

### STEP 2 — Role & Permission Map

| Role | Landing Page | Key Capabilities |
|------|-------------|-----------------|
| `candidate` | `CandidateDashboard` | Browse jobs, apply, track applications, build resume, view offers |
| `recruiter` | `RecruiterDashboard` | Manage pipeline, schedule interviews, send offers, AI match |
| `admin` | `AdminAnalytics` (Overview 📈) | Full org management, users, jobs, analytics, onboarding |
| `super_admin` | `AdminAnalytics` (Overview 📈) | All admin powers + cross-tenant org management, platform settings, audit logs |

Read every route in `src/App.jsx`. For each route, note:
- Which roles can access it
- Is the route guard enforced in the frontend?
- Is the same guard enforced on the backend API it calls?
- Is tenant isolation enforced (tenant A cannot see tenant B's data)?

### STEP 3 — Page & Feature Inventory

**Candidate pages (10):**
`CandidateDashboard` · `CandidateApplications` · `CandidateExploreJobs` · `CandidateProfile` · `ResumeBuilder` · `CandidateAIMatch` · `CandidateAssessment` · `CandidateOffer` · `CandidateJobAlerts` · `CandidateOnboarding`

**Recruiter pages (11):**
`RecruiterDashboard` · `RecruiterCandidates` · `RecruiterJobs` · `RecruiterPipeline` · `RecruiterInterviews` · `RecruiterOffers` · `RecruiterAssessments` · `RecruiterAIMatch` · `TalentPool` · `GenerateOfferPage` · `ScheduleInterviewPage`

**Admin pages (14):**
`AdminAnalytics` · `AdminUsers` · `AdminJobs` · `AdminPipeline` · `AdminAutomation` · `AdminOnboarding` · `AdminClients` · `AdminCustomFields` · `AdminJobApproval` · `OrgSettings` · `OutreachTracker` · `ContactLeads` · `AdminCandidateRequest` · `BillingPage`

**Super Admin pages (10):**
`SuperAdminPlatform` · `SuperAdminOrgs` · `SuperAdminAuditLogs` · `SuperAdminSecurity` · `SuperAdminCustomizations` · `SuperAdminPermissions` · `SuperAdminBlogs` · `SuperAdminCandidateImport` · `SuperAdminCandidateRequests` · `SuperAdminPlaybooks`

**Shared pages:** `ProfilePage` · `ChangePasswordPage` · `CreateJobPage` · `InviteCandidatePage` · `SecuritySettingsPage` · `FormsHub` · `AssignedCandidates`

**Public/marketing pages:** `LandingPage` · `CareersPage` · `AboutPage` · `ServicesPage` · `ContactPage` · `TermsPage` · `PrivacyPage` · `BlogPage`

### STEP 4 — Database Collections Map
Read every model in `backend/src/models/`:
- `User` — roles, orgId/tenantId, isActive, twoFactorEnabled, inviteToken (hashed)
- `Organization` / `Tenant` — plan, status, domain, logoUrl
- `Job` — orgId, assignedRecruiters, status, pipeline stages
- `Application` — jobId, candidateId, stage (Applied→Screening→Shortlisted→Interview Round 1→Interview Round 2→Offer→Hired→Rejected), currentStage
- `Candidate` — linked to User via email
- `AuditLog` — userId, action, entity, entityId, details, createdAt
- `OfferLetter` · `Assessment` · `AssessmentSubmission` · `Lead` · `Client`

### STEP 5 — Super Admin Platform Dashboard Widgets
Read `src/pages/superadmin/SuperAdminPlatform.jsx` fully. Map every widget:
- KPI cards: Organisations · Total Users · Total Jobs · Applications
- Plan Breakdown horizontal bars (Starter/Pro/Enterprise/Trial/Free)
- Role Distribution breakdown (recruiter/admin/candidate counts)
- Recent Organisations table
- Trace each widget to its exact API call and verify the data is real

---

## PHASE 1 — SUPER ADMIN PLATFORM DASHBOARD: DATA INTEGRITY AUDIT

The super admin platform dashboard is the first thing an enterprise buyer sees. Every number must be real.

### 1.1 — KPI Cards (4 tiles: Orgs · Users · Jobs · Applications)

For each KPI tile, verify:
```
□ Number comes from a real MongoDB query, not a hardcoded value
□ Orgs count: COUNT all Organization/Tenant documents
□ Users count: COUNT all User documents across all tenants
□ Jobs count: COUNT all Job documents (not just active ones — clarify the definition)
□ Applications count: COUNT all Application documents
□ No NaN, undefined, null, or Infinity shown on screen
□ Loading: skeleton shown while fetching
□ Error: "Unable to load" message on API failure, not blank card
□ Numbers formatted correctly: 1,234 not 1234; 10K for 10,000+
```

### 1.2 — Plan Breakdown Bar Chart

```
□ Each plan (Starter/Pro/Enterprise/Trial/Free) shows the correct org count
□ Bar widths are proportional: widest bar = highest count
□ If all counts are 0, bars show 0-width gracefully (no division by zero)
□ Plan labels readable on mobile
```

### 1.3 — Role Distribution

```
□ Recruiter / Admin / Candidate counts are correct
□ Percentages sum to 100% (or close, accounting for super_admin role)
□ Definition of "admin" in this count: includes both admin + super_admin, or just admin?
    → Must be consistent with the Users KPI card total
□ No user counted in two categories
```

### 1.4 — Recent Organisations Table

```
□ Shows the N most recently created orgs
□ Status badge: active=green, trial=amber, inactive/suspended=red
□ Plan badge shows the correct plan name
□ Clicking a row navigates to the org detail (or correct action)
□ Table is horizontally scrollable on mobile
```

### 1.5 — Cross-Widget Consistency

```
□ Total Users KPI = sum of (Recruiter count + Admin count + Candidate count + Super Admin count)
□ If an org is deleted: all counts reflect the deletion
□ super_admin role users: are they excluded from "Total Users" or included?
    → Whatever the answer, it must be consistent everywhere
```

---

## PHASE 2 — FULL FEATURE TESTING

### 2.1 — Authentication & Invite Flow

```
TEST EVERY SCENARIO:
□ Login with correct credentials → redirected to correct role dashboard
□ Login with wrong password → generic error (never distinguish "email not found" vs "wrong password")
□ Login with unregistered email → same generic error
□ Inactive user (isActive: false, invite not accepted) → cannot log in
□ super_admin login → lands on AdminAnalytics (Overview), not a candidate/recruiter page
□ Session expiry → graceful redirect to login (not a broken page)
□ Logout → token cleared from sessionStorage (tn_token, tn_user)
□ Password reset: email sends, token expires after use
□ 2FA OTP flow: if twoFactorEnabled=true on user, OTP screen appears after password check
□ Google Sign-In: OAuth flow completes, token stored, correct role dashboard loaded
□ Invite flow: invite email → SetPasswordPage → password set → isActive=true → login works
□ Resend invite (amber button for inactive users in AdminUsers) → new token generated
□ After password set via invite: original invite token rejected (one-time use)
```

### 2.2 — Role-Based Access Control (RBAC)

```
TEST THESE CROSS-ROLE ATTACKS:
□ Logged in as candidate → GET /api/admin/users → must return 403
□ Logged in as candidate → GET /api/jobs/admin → must return 403
□ Logged in as recruiter → GET /api/super-admin/orgs → must return 403
□ Logged in as admin → GET /api/platform/all-orgs → must return 403
□ Tenant isolation: logged in as admin of Org A → GET /api/users (their list) → must NOT include users from Org B
□ Super admin: no tenant restriction, sees all orgs, all users, all jobs
□ RBAC enforced at API level (backend middleware), not just hidden in UI
□ JWT must be validated on every protected route, not only at login
```

### 2.3 — Candidate Flow (End-to-End)

```
□ Register as new candidate → verify isActive set correctly, redirect to dashboard
□ CandidateExploreJobs: jobs load, search works, filter by location/type works
□ Apply to job: application created, stage = 'Applied', appears in CandidateApplications
□ CandidateApplications: shows all applications with correct stage labels
□ Application stage label mapping: 'Applied'→Applied, 'Interview Round 1'→Interview Scheduled, etc.
□ CandidateProfile: all fields save correctly, reload without data loss
□ ResumeBuilder: sections add/edit/delete, download PDF works
□ CandidateAIMatch: Gemini API called, results shown, graceful error if API fails
□ CandidateOffer: offer letter loads, accept/decline actions work
□ CandidateAssessment: questions load, submission works, score shown
□ Withdraw application: application marked withdrawn, disappears from active list
```

### 2.4 — Recruiter Flow (End-to-End)

```
□ RecruiterDashboard: pipeline counts, today's interviews, recent activity all show real data
□ RecruiterJobs: lists only jobs assigned to this recruiter (assignedRecruiters contains recruiter's userId)
□ RecruiterCandidates: candidate list loads, search works, profile drilldown works
□ RecruiterPipeline: Kanban board shows candidates in correct stage columns
□ Move candidate between stages: stage updates in DB, shows in correct column immediately
□ RecruiterInterviews: interviews list loads, schedule button works, calendar view if present
□ ScheduleInterviewPage: form saves interview details, application record updated
□ RecruiterOffers: offer list loads, GenerateOfferPage creates offer letter in DB
□ GenerateOfferPage: Gemini AI generates offer text, offer saved to OfferLetter collection
□ RecruiterAssessments: assessment list loads, send to candidate works
□ RecruiterAIMatch: AI match runs, score displayed, no crash on empty candidate pool
□ TalentPool: shows available candidates, filters work
```

### 2.5 — Admin Flow (End-to-End)

```
□ AdminAnalytics (Overview): all KPI cards, charts, and tables show real org-scoped data
□ AdminUsers: user list loads with correct roles and status badges
    - Invite user (admin/recruiter): invite email sends, user appears as inactive
    - Edit user: changes save and reflect immediately
    - Suspend user: user cannot log in after suspension
    - Delete user: user removed, their data handled per spec
    - Resend invite: new token sent for inactive users
    - Reset password: password reset email sent for active users
    - RecruiterActivityPanel: shows correct jobs, candidates, pipeline counts per recruiter
□ AdminJobs: job list loads, create/edit/archive all work
    - Create job: all required fields validated, job appears in list and candidate explore
    - Edit job: form pre-populates, partial update does not null other fields
    - Archive job: job hidden from candidate view
□ AdminPipeline: pipeline view loads with correct candidate counts per stage
□ AdminClients: client CRUD works
□ OrgSettings: org name/domain/logo save correctly; LogoManager upload/download works
□ OutreachTracker: outreach records load, sentBy field shows recruiter name (not ObjectId)
□ AdminOnboarding: onboarding steps displayed and manageable
□ ContactLeads: lead list loads, status update works
□ AdminJobApproval: pending jobs shown, approve/reject works
□ AdminCustomFields: custom field definitions create/edit/delete
□ AdminCandidateRequest: candidate requests visible and actionable
□ BillingPage: billing information displayed correctly
```

### 2.6 — Super Admin Flow (End-to-End)

```
□ SuperAdminPlatform: all 4 KPI cards show correct cross-tenant totals
□ SuperAdminOrgs: org list loads, search works
    - Create org: CreateOrganisationPage form completes, org appears in list
    - Edit org: form pre-populates with current values, save reflects immediately (no stale display)
    - Invite admin to org: invite sent with correct tenantId + orgId
    - Org detail view: stats, users, jobs all scoped to that org
□ SuperAdminAuditLogs: logs load, filters (search/action/date range) work
□ SuperAdminSecurity: security settings display and save
□ SuperAdminCustomizations: customization options save correctly
□ SuperAdminPermissions: permission overrides work
□ SuperAdminBlogs: blog CRUD works
□ SuperAdminCandidateImport: import flow works (CSV or form)
□ SuperAdminCandidateRequests: requests list and actions work
□ SuperAdminPlaybooks: 7 preset playbooks download correctly; custom playbook saves to localStorage
    - Developer playbook: live changelog + today's date baked in on download
    - Tester playbook: daily test loop dates generated correctly
```

### 2.7 — Public / Marketing Pages

```
□ LandingPage: loads without login, all CTAs route correctly
□ CareersPage: public job board loads, apply without login works (applyPublic endpoint)
□ ContactPage: contact form submits, lead created in ContactLeads
□ TermsPage: all 20 sections load, TOC links scroll to correct sections
□ PrivacyPage: loads correctly
□ BlogPage + BlogPostPage: blogs load from DB (not hardcoded)
□ SetPasswordPage: invite token accepted, password set, redirect to login
□ InviteResponsePage / InterestConfirmed / InterestDeclined: all render without crash
```

---

## PHASE 3 — UI/UX POLISH AUDIT

### 3.1 — Visual Consistency (Check across every page)

```
□ Font: consistent across all pages (no random font switches)
□ Buttons: btnP (primary blue), btnG (green), btnD (danger red) used consistently
□ Cards: `card` style token used consistently, not custom background per page
□ Spacing: consistent padding/gap within same page type
□ Status badges: Active=green, Inactive/Pending=amber, Suspended/Rejected=red — everywhere
□ Stage badges in pipeline match across: AdminPipeline, RecruiterPipeline, CandidateApplications
□ Icons: consistent usage (emoji-based system — do not introduce external icon libraries)
□ No text overflows its container on any standard screen
□ Heading hierarchy correct on every page (PageHeader component used correctly)
```

### 3.2 — Loading / Empty / Error States (Every async component)

```
LOADING:
□ Skeleton loaders shown while fetching (SkeletonRow, Spinner, or shimmer divs)
□ Page layout does not jump when data loads
□ Buttons that trigger async actions show loading spinner + disable themselves

EMPTY:
□ Empty job list → "No jobs found" message + CTA
□ Empty candidate list → helpful message, not a broken table
□ Empty pipeline → "No candidates in this stage" (not broken Kanban columns)
□ Empty charts → "No data for this period" text inside chart bounds
□ Empty audit log → "No audit logs found" with filter hint

ERROR:
□ API failure → human-readable message, not raw error object or blank screen
□ 404 page → professional design, navigation back to home
□ Network timeout → "Something went wrong. Try again." with retry button
□ Never expose stack traces to the user
```

### 3.3 — Responsive Design (Test at exact breakpoints)

```
375px (iPhone SE) — CRITICAL:
□ Sidebar: hidden (display:none), hamburger menu or bottom nav visible
□ Tables: horizontal scroll wrapper present, columns do not overflow
□ Modals: full-width, do not overflow screen
□ Forms: inputs full-width, labels not clipped
□ Cards: single column stack
□ Buttons: not clipped, full width where appropriate
□ iOS input zoom: font-size ≥ 16px on all inputs (prevents auto-zoom on iOS Safari)

768px (iPad portrait):
□ Sidebar: 196px width, margin-left matches
□ Tables: scroll if needed, key columns visible
□ KPI cards: 2-column grid
□ Charts: resize correctly, axis labels still readable

1024px (iPad landscape / small laptop):
□ Full layout works, sidebar visible
□ 2-column page layouts do not break

1280px (demo laptop — PRIMARY):
□ Everything must be perfect here
□ Super admin platform dashboard: all 4 KPI cards in a row
□ Charts fully visible, not clipped

Key rules already in place (verify they work):
□ .tn-sidebar { position: fixed; width: 220px } — sidebar does not disappear
□ .tn-main-content { margin-left: 220px } — content not hidden behind sidebar
□ @media (max-width: 767px): sidebar display:none, margin-left: 0
□ All page grids use minmax(min(100%, Xpx), 1fr) — no overflow on small screens
```

---

## PHASE 4 — PERFORMANCE & STABILITY

### 4.1 — MongoDB Query Performance

```
□ N+1 queries: fetching a list should NOT trigger one DB query per row
    - Recruiter activity: jobs fetched once, then applications fetched once — not per-job
    - Application list: candidateId and jobId populated in single .populate() call
    - Audit logs: userId populated in query, not in a loop
□ Missing indexes to check:
    - Application.jobId — indexed? (used in WHERE constantly)
    - Application.candidateId — indexed?
    - Application.stage — indexed? (used in pipeline counts)
    - Job.orgId — indexed?
    - User.orgId / User.tenantId — indexed?
    - AuditLog.createdAt — indexed? (used in date range filters)
□ No unbounded queries: all list endpoints have LIMIT and pagination
    - Verified: applications route has getPagination middleware
    - Verify super admin org list has a reasonable limit
□ Analytics aggregation queries: must complete in < 2 seconds
    - AdminAnalytics pipeline breakdown: uses MongoDB $group aggregation
    - Verify it does not fetch all applications to JS and aggregate in memory
```

### 4.2 — Frontend Performance

```
□ Search inputs debounced 300ms — no API call on every keystroke
    - Check: RecruiterCandidates search, AdminUsers search, SuperAdminOrgs search
□ API calls not duplicated: useEffect dependency arrays are correct
    - Wrong: useEffect(() => { load(); }) with no deps → runs on every render
    - Correct: useEffect(() => { load(); }, []) or specific deps
□ 100-app cache problem: ANALYZE button in recruiter leaderboard now fetches server-side
    (fixed in commit 4f4f36f) — verify the fix is working
□ No memory leaks: async calls in useEffect cleaned up with isMounted flag or AbortController
□ Charts: SVG-based (no external chart library) — verify they render on first load
```

### 4.3 — Stability Under Demo Conditions

```
□ Double-click every submit button: no duplicate records created
    (form button must disable after first click)
□ Navigate back/forward with browser buttons: no crash or stale state
□ Refresh any page while logged in: stays on correct page (sessionStorage token persists)
□ Refresh on a super_admin page while logged in as super_admin: stays on super_admin page
□ Open app in two browser tabs: no conflict
□ Switch between roles in same browser (logout/login): old role's data does not leak into new session
□ Stage transition in pipeline: clicking "Move to Screening" twice does not create two stage changes
```

---

## PHASE 5 — SECURITY AUDIT

```
□ No secrets in frontend bundle:
    - VITE_API_URL in .env → check it is NOT the MongoDB URI or any secret key
    - Google client ID: acceptable to be in frontend (it is public by design)
    - Gemini API key: must be backend-only, never in src/
    - Resend API key: backend-only
    - JWT_SECRET: backend-only

□ .env in .gitignore: verify backend/.env and root .env are not committed

□ All API endpoints require authentication (call without token → 401):
    - /api/users → 401
    - /api/jobs → 200 (public job list for careers page is intentionally public — verify scope)
    - /api/applications → 401
    - /api/admin/* → 401 without token, 403 with candidate token

□ Tenant isolation: User in Org A cannot GET Org B's applications/users/jobs
    - tenantGuard middleware in applications.js, jobs.js, users.js — verify it runs

□ Invite token: raw token never stored in DB (SHA-256 hash stored, raw token only in email link)

□ XSS: candidate name entered with <script>alert(1)</script> → must render as text, not execute
    - React escapes JSX by default, but check dangerouslySetInnerHTML usage
    - Search: grep for dangerouslySetInnerHTML in codebase

□ Rate limiting: login endpoint should limit repeated attempts
    - Check: is express-rate-limit applied to POST /api/auth/login?

□ CORS: in production (Railway), origin must be the Vercel domain, NOT '*'
    - Check backend/server.js CORS config for production vs development

□ User A accessing User B's data by ID manipulation:
    - GET /api/applications/[other_user_app_id] while logged in as different user → 403
    - Candidate can only see their own applications (/api/applications/mine uses auth token, not URL param)

□ Sensitive admin actions logged in AuditLog:
    - User deletion
    - Org suspension
    - Role change
    - Invite sent
```

---

## PHASE 6 — DEMO DATA SEEDING

The demo must look like a real, active HR platform. The buyer should see a live, busy system.

### What to seed (run a seed script or MongoDB direct insert):

```
ORGANIZATIONS (5 orgs):
□ TalentNest HR (the platform company itself — already seeded)
□ TechSpark Solutions — plan: Enterprise, status: active, 40+ employees
□ GrowFast Retail — plan: Pro, status: active, 20+ employees
□ BluePeak Consulting — plan: Starter, status: trial
□ NextGen Finance — plan: Pro, status: active

USERS (per org, mix of roles):
□ TechSpark: 1 admin, 3 recruiters, 30 candidates/applicants
□ GrowFast: 1 admin, 2 recruiters, 20 candidates
□ BluePeak: 1 admin, 1 recruiter, 10 candidates
□ Mix of statuses: 70% active, 20% inactive/pending, 10% recently joined

Use realistic Indian names:
Recruiters: Priya Sharma, Arun Nair, Meena Iyer, Rohit Gupta, Kavitha Reddy
Candidates: Arjun Patel, Sneha Kulkarni, Vivek Menon, Divya Krishnan, etc.
Emails: firstname.lastname@techspark.in format

JOBS (15-20 across orgs):
□ Senior React Developer — TechSpark — Open — 5 applicants
□ Product Manager — TechSpark — Open — 8 applicants
□ Sales Executive — GrowFast — Open — 12 applicants
□ UI/UX Designer — BluePeak — Open — 3 applicants
□ Data Analyst — NextGen Finance — Open — 6 applicants
□ Mix: some Archived, some requiring approval
□ Post dates spread across last 3 months

APPLICATIONS (50+ across all jobs):
□ Mix of all 8 stages: Applied, Screening, Shortlisted, Interview Round 1, Interview Round 2, Offer, Hired, Rejected
□ Funnel shape: most in Applied → fewer in Hired (realistic 10-15% hire rate)
□ Created dates spread over last 2 months
□ Some applications with notes, tags, feedback populated

AUDIT LOGS (30+ entries):
□ login actions from various users (last 7 days)
□ job_created, application_submitted, stage_changed events
□ invite_sent events
□ Spread across last 14 days so the log table looks active

PIPELINE appearance on demo:
□ SuperAdminPlatform KPIs should show:
    Total Orgs: 5 | Total Users: 80+ | Total Jobs: 18 | Applications: 55+
□ AdminAnalytics for TechSpark should show pipeline with candidates in multiple stages
□ RecruiterDashboard for a recruiter at TechSpark should show active pipeline activity
```

---

## PHASE 7 — FINAL PRODUCTION CHECKLIST

### Code Cleanliness
```
□ Search entire codebase for console.log() — remove all in production components
    (exception: keep backend logger.js usage — that is intentional)
□ Search for TODO / FIXME / HACK comments — remove or resolve
□ Search for hardcoded localhost:3000 or localhost:5000 in src/ — use API_BASE_URL from config
□ Search for placeholder text: "Lorem ipsum", "Test User", "test@test.com", "Coming soon"
□ Search for dangerouslySetInnerHTML — audit every usage
□ Zero unused imports in any file you touch
```

### Browser Console (Open DevTools before demo)
```
□ Zero JavaScript errors
□ Zero failed network requests (no red 404/500 in Network tab)
□ Zero CORS errors
□ Zero "Cannot read properties of undefined" errors
□ Zero React key warnings (every list item must have a unique key prop)
□ Zero "Each child in a list should have a unique key" warnings
```

### Cross-Browser (Priority order for demo)
```
□ Chrome (latest) — primary demo browser
□ Edge — enterprise buyers commonly use this
□ Safari — if demo is on a Mac
□ Mobile Chrome (Android) — for any mobile demo moment
```

### Final Demo Smoke Test (Do this manually in order)
```
1. Open app fresh in incognito window
2. Go to landing page → verify it loads in < 3 seconds
3. Login as super admin (admin@talentnesthr.com / TalentNest@2024)
4. Verify SuperAdminPlatform dashboard loads with real data
5. Click all 10 super admin sidebar items → nothing should 404
6. Open SuperAdminOrgs → click an org → edit a field → save → verify change reflects (no stale data)
7. Open SuperAdminAuditLogs → apply a date filter → verify results update
8. Logout
9. Login as an admin from a seeded org
10. Verify AdminAnalytics loads with org-scoped data
11. Open AdminUsers → create a test user → verify appears in list
12. Open AdminJobs → create a test job → verify appears in list
13. Logout
14. Login as a recruiter
15. Open RecruiterPipeline → verify candidates visible in correct stages
16. Open RecruiterDashboard → verify stats reflect real data
17. Logout
18. Login as a candidate
19. Open CandidateExploreJobs → verify jobs load
20. Apply to a job → verify appears in CandidateApplications
21. Logout
22. Try navigating to /app/admin/users while logged out → must redirect to login
23. Zero errors in browser console throughout all of the above
```

---

## DELIVERABLE FORMAT

After completing all phases, report in exactly this format:

```
## TALENTNEST HR — AUDIT REPORT

### CRITICAL ISSUES FIXED (would have crashed demo)
- [Issue] → [Fix] → [File: path/to/file.jsx, Line: N]

### MAJOR ISSUES FIXED (would have looked broken or unprofessional)
- [Issue] → [Fix] → [File: path/to/file.jsx, Line: N]

### MINOR ISSUES FIXED (polish)
- [Issue] → [Fix] → [File: path/to/file.jsx, Line: N]

### DATA INTEGRITY VERIFIED
- SuperAdminPlatform KPI — Orgs: [N] confirmed from DB
- SuperAdminPlatform KPI — Users: [N] confirmed from DB
- SuperAdminPlatform KPI — Jobs: [N] confirmed from DB
- SuperAdminPlatform KPI — Applications: [N] confirmed from DB
- [Additional widget confirmations]

### DEMO DATA SEEDED
- Organisations: [N] seeded
- Users: [N] seeded across [N] orgs
- Jobs: [N] seeded with realistic titles and post dates
- Applications: [N] seeded across all pipeline stages
- Audit logs: [N] entries covering last [N] days

### DASHBOARD HEADLINE NUMBERS (what the buyer will see)
- Total Orgs: [N]
- Total Users: [N]
- Total Jobs: [N]
- Total Applications: [N]
- Pipeline fill: Applied [N] · Screening [N] · Shortlisted [N] · Interview [N] · Hired [N]

### SECURITY CHECKS PASSED
- [List each check from Phase 5 with PASS/FAIL]

### DEMO READINESS SCORE: [X/10]
### ESTIMATED REMAINING RISK: [None / Low / Medium]
### RECOMMENDATION: [Ready to demo / Needs one more pass on X]
```

---

**You have one night. Start with Phase 0. Do not stop until the platform is demo-ready.**
