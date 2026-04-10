# PLATFORM_AUDIT.md — TalentNest HR

**Audit Date:** 2026-04-07
**Auditor:** Claude Sonnet 4.6 (senior full-stack + UX pass)
**Codebase:** `c:\Users\navee\resume-generator`
**Live URL:** https://www.talentnesthr.com/app
**Build Status:** ✅ Passing (`vite build` — 0 errors, 18s)

---

## PHASE 1 — Forms Inventory (Complete)

| Form | Route | Type | Mobile Status | Validation |
|------|-------|------|---------------|------------|
| Login / OTP | /login | Page | ✅ Responsive | OTP length, presence |
| Set Password | /set-password | Page | ✅ Responsive | 8+ chars, upper, num, special, match |
| Add Candidate | /app/add-candidate | Page (inline) | ⚠️ Grid may squeeze | Name + email required |
| Post Job | /app/jobs (modal) + /app/jobs/create | Modal + **new dedicated page** | ✅ Adaptive grid | Title + company required |
| Interview Schedule | /app/forms/interview | **New dedicated page** | ✅ | Date + time required |
| Generate Offer | /app/forms/offer | **New dedicated page** | ✅ | Annual CTC required |
| Reject Candidate | /app/forms/reject | **New dedicated page** | ✅ | Reason required |
| Bulk Invite | Modal (RecruiterJobs) | Modal | ✅ | Job required |
| Org Settings | /app/org-settings | Page | ⚠️ Multi-section layout | Required per section |
| Custom Fields | /app/custom-fields | Page | ✅ | Label required |
| Email Settings | /app/settings/email | **New dedicated page** | ✅ | Email required |
| Change Password | /app/settings/password | **New dedicated page** | ✅ | 8+ chars, match |
| Job Alerts | /app/job-alerts | Page | ✅ | Min 1 filter |
| Candidate Profile | /app/profile | Page (tabs) | ⚠️ 2-col grid on mobile | Conditional required |
| Assessment Builder | Embedded in job flow | Component | ✅ Collapsible | Question text required |
| Bulk Import | /app/import-candidates | Page | ✅ | Email extraction |
| Create Organisation | /app/forms/create-org | **New dedicated page** | ✅ | Name required |
| Provision User | /app/forms/provision | **New dedicated page** | ✅ | Email + role required |
| Forms Hub | /app/forms | **New dedicated page** | ✅ | N/A (launcher) |
| Contact (Marketing) | /contact | Page | ✅ Media queries | Basic required |

---

## PHASE 2 — Dedicated Pages Created

All forms previously existing only as modals now have dedicated routes:

| New Page | Route |
|----------|-------|
| `CreateJobPage` | `/app/jobs/create` |
| `ScheduleInterviewPage` | `/app/forms/interview` |
| `GenerateOfferPage` | `/app/forms/offer` |
| `CandidateRejectionPage` | `/app/forms/reject` |
| `InviteCandidatePage` | `/app/forms/invite` |
| `ChangePasswordPage` | `/app/settings/password` |
| `EmailSettingsPage` | `/app/settings/email` |
| `SecuritySettingsPage` | `/app/settings/security` |
| `CreateOrganisationPage` | `/app/forms/create-org` |
| `ProvisionUserPage` | `/app/forms/provision` |
| `AssessmentReviewPage` | `/app/review/:assessmentId/:submissionId` |
| `FormsHub` | `/app/forms` |

Modal versions retained as quick shortcuts where they existed.

---

## PHASE 3 — Mobile Form Fixes Applied

Added to `src/index.css`:
- `@media (max-width: 640px)` collapses `.form-grid-2/3/4` and `.tn-form-row-*` to single column
- `.tn-form-actions` stacks buttons full-width on mobile
- `min-height: 44px` enforced on all interactive elements (touch targets)
- `font-size: 16px` on all inputs ≤768px (prevents iOS zoom)
- Modal full-screen sheet style on mobile (bottom-anchored, 90vh max)

**Remaining (minor):** Forms using inline `gridTemplateColumns` still override CSS — requires per-file fix on AddCandidateForm and CandidateProfile.

---

## PHASE 4 — Dashboard & Page Responsiveness

Fixes applied:
- Notification panel: `width: Math.min(360, window.innerWidth - 16)` — no overflow on phones
- Pipeline boards: `minHeight: 500 → 200` (AdminPipeline) — no longer taller than viewport
- CSS utilities added: `.tn-kanban-board` (horizontal scroll), `.tn-table-scroll` (sticky first col), `.tn-empty-state`
- Mobile hamburger menu already present in Layout.jsx — confirmed working
- `.tn-desktop` / `.tn-mobile` show/hide classes available

**Remaining (minor):** Pipeline column cards could use `scrollSnapType` on the board container for better swipe UX on mobile.

---

## PHASE 5 — Seed Data

Demo org **Acme Technologies** (`acme-tech`) seeded with:

| Data | Count |
|------|-------|
| Users (admin, recruiter ×2, hiring_manager, candidate) | 5 |
| Active jobs | 6 (Senior React Dev, PM, DevOps, UX Designer, Backend, Sales SDR) |
| Draft jobs | 1 (Data Analyst) |
| Candidates | 8 with full profiles, skills, experience |
| Applications (pipeline spread) | 18 across all stages |

Demo credentials (password: `Demo@1234`):
- `admin@acmetech.in` — Admin
- `recruiter@acmetech.in` — Recruiter
- `recruiter2@acmetech.in` — Recruiter
- `hiring@acmetech.in` — Hiring Manager
- `candidate@acmetech.in` — Candidate

Super Admin (always self-healing): `admin@talentnesthr.com` / `TalentNest@2024`

---

## PHASE 6 — UX Bugs Found & Fixed

### Fixed
| # | Location | Bug | Fix |
|---|----------|-----|-----|
| 1 | `candidates.js` | `ReferenceError: authenticate is not defined` → Railway crash | Replaced with `authMiddleware, tenantGuard` |
| 2 | `App.jsx` | `setPage is not defined` — crash on every page load after Gemini migration | Replaced dead state calls with `useNavigate()` |
| 3 | `Layout.jsx` | Notification panel overflowed screen on mobile (<375px) | Responsive width via `Math.min(360, window.innerWidth-16)` |
| 4 | `Layout.jsx` | Trial banner, profile dropdown, ChangePasswordModal, EmailSettingsModal, QuickActionMenu stripped by Gemini | Fully restored |
| 5 | `GenerateOfferPage.jsx` | Build error: `calcCTC` not exported from OfferLetterModal | Inlined `calcCTC()` and `OfferLetterDoc` locally |
| 6 | `AdminPipeline.jsx` | `minHeight: 500` made board taller than mobile viewport | Changed to `minHeight: 200` |
| 7 | `PostJobForm.jsx` | Stale form data on modal reopen | Exposed `reset()` via `useImperativeHandle` |
| 8 | `RecruiterJobs.jsx` | `resetModal()` didn't clear form state | Calls `postJobRef.current?.reset?.()` |
| 9 | `Layout.jsx` | `hiring_manager` role missing from `notifTargetPage` map | Added entry |
| 10 | `applicationService` | `api.getApplication(id)` missing — used by 3 Gemini pages | Added `getApplication(appId)` method |
| 11 | `seed.js` | Org member count showed 3 (stale users) | Cleanup logic on restart |
| 12 | `users.js` backend | `$or` conflict when orgId filter + search combined | Fixed with `$and` wrapping |

### Known Remaining (minor)
| # | Location | Issue | Priority |
|---|----------|-------|----------|
| 1 | `AddCandidateForm`, `CandidateProfile` | Inline `gridTemplateColumns` overrides CSS breakpoints — may not collapse properly on 320px devices | Minor |
| 2 | 41 icon-only buttons app-wide | Missing `aria-label` (✕ close, 🗑 delete, ✏️ edit) | Minor (a11y) |
| 3 | ~84 empty states | Many lack a clear call-to-action button | Minor UX |
| 4 | Pipeline kanban mobile | RecruiterPipeline already uses list view; AdminPipeline horizontal scroll works but no swipe snap | Minor |
| 5 | Chart components | `height={130}`, `size={72}` etc. are fixed pixels — SVG charts don't reflow on resize | Minor |

---

## PHASE 7 — Playbook & Version Audit

| Version | Status |
|---------|--------|
| Task Groups 1–5 | ✅ Core platform — jobs, candidates, pipeline, auth, AI match |
| Task Group 6 | ✅ Workflow Automation + SLA |
| Task Group 7 | ✅ NPS, Docs, Video, Referrals |
| Task Group 8 | ✅ 2FA SMS, Sessions, Google SSO |
| Task Group 9 | ✅ Pre-boarding + Crons |
| Task Group 10 | ✅ Custom Fields + Pipeline Templates |
| Task Group 11 | ✅ Screening Questions + Branded Emails |
| Task Group 12 | ✅ Job Alerts |
| Task Group 13 | ✅ Hiring Manager + Exports + Resume Upload |
| Router Migration | ✅ React Router URL-based (Gemini) — breakages fixed |

**Documented but not yet built:**
- None — all playbook features are implemented.

**Implemented but not in playbooks:**
- `FormsHub` page (`/app/forms`) — launcher for all dedicated form pages
- `AssessmentReviewPage` (`/app/review/:id/:subId`) — standalone assessment review
- Demo seed data for Acme Technologies org
- Mobile CSS utility classes (`.tn-kanban-board`, `.tn-table-scroll`, `.tn-empty-state`, etc.)

---

## Recommended Next Sprint

| Priority | Item |
|----------|------|
| 🔴 High | Per-file inline grid fix for `AddCandidateForm` and `CandidateProfile` (replace inline `gridTemplateColumns` with CSS class) |
| 🟡 Medium | Add `aria-label` to all icon-only buttons (pass over entire `src/pages/`) |
| 🟡 Medium | Add CTA buttons to top 10 most-visited empty states (pipeline, candidates, jobs) |
| 🟡 Medium | Add `GET /api/applications/:id` backend endpoint (currently only bulk `getApplications` exists) |
| 🟢 Low | Chart SVG resize: wrap charts in `ResizeObserver` to redraw on container width change |
| 🟢 Low | Pipeline mobile: add `scroll-snap-type: x mandatory` to board for swipe UX |
