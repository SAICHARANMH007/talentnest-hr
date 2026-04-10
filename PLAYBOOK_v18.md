# PLAYBOOK v18 — Final Feature Completion

**Date:** 2026-04-06
**Commits:** `b08efe4` → `9873f0b`
**Task Groups:** 11, 12, 13

---

## Task Group 11 — Screening Questions + Job Approval Fields + Branded Emails

| File | Change |
|------|--------|
| `backend/src/models/Job.js` | Added `approvalStatus`, `rejectionReason`, `screeningQuestions` fields |
| `backend/src/models/Application.js` | Added `screeningAnswers` field |
| `backend/src/routes/applications.js` | Accept `screeningAnswers` on public + internal apply; Branded HTML stage-change emails |
| `src/components/shared/PostJobForm.jsx` | Screening Questions section (text/yesno/multiple, required toggle) |
| `src/pages/careers/CareersPage.jsx` | ApplyModal shows screening questions with validation |
| `src/pages/candidate/CandidateExploreJobs.jsx` | Screening modal before apply; 409 duplicate → friendly toast |

---

## Task Group 12 — Job Alerts

| File | Change |
|------|--------|
| `backend/src/models/JobAlert.js` | JobAlert model (keywords, location, jobType, frequency, lastJobIds dedup) |
| `backend/src/routes/jobAlerts.js` | CRUD routes (max 10/user, pause/resume) |
| `backend/src/jobs/jobAlertCron.js` | Daily (0:30 UTC) + weekly (Mon 1:00 UTC) email digests |
| `backend/server.js` | Registered `/api/job-alerts` + `startJobAlertJobs()` |
| `src/components/candidate/JobAlertsManager.jsx` | Modal version of alert manager |
| `src/pages/candidate/CandidateJobAlerts.jsx` | Full dedicated page |
| `src/api/services/platform.service.js` | 4 job alert API methods |

---

## Task Group 13 — Hiring Manager + Exports + Screening UI + Cloudinary Resume

| File | Change |
|------|--------|
| `backend/src/models/User.js` | Added `hiring_manager` to role enum |
| `backend/src/routes/users.js` | `GET /api/users/export` → Excel |
| `backend/src/routes/applications.js` | `GET /api/applications/export` → Excel |
| `backend/src/routes/candidates.js` | `POST /api/candidates/upload-my-resume` (Cloudinary); upload-resume now stores PDF |
| `src/pages/hiring_manager/HiringManagerDashboard.jsx` | View-only pipeline dashboard by stage |
| `src/pages/candidate/CandidateJobAlerts.jsx` | Dedicated job alerts page |
| `src/layout/Layout.jsx` | `hiring_manager` nav + 🔔 Job Alerts in candidate nav |
| `src/App.jsx` | `hiring_manager` routing + `job-alerts` route |
| `src/pages/admin/AdminUsers.jsx` | ⬇ Export button |
| `src/pages/admin/AdminPipeline.jsx` | ⬇ Export Pipeline button |
| `src/pages/recruiter/RecruiterPipeline.jsx` | 📋 Screening Answers display on application card |
| `src/pages/candidate/CandidateProfile.jsx` | Resume File upload section in Extras tab |
| `src/api/client.js` | `downloadBlob()` helper for authenticated binary downloads |
| `src/api/api.js` | Exports `downloadBlob` |
| `src/api/services/platform.service.js` | `uploadCandidateResume()` method |

---

## Feature Completion Status

| Feature | Status |
|---------|--------|
| Hiring Manager role | ✅ Done |
| Audit Logs | ✅ Already existed |
| White-label careers page | ✅ Already existed (brand strip + org-scoped jobs) |
| Google Calendar integration | ✅ iCalendar invites (no Google API needed) |
| Time-to-hire metric | ✅ Already existed |
| Recruiter performance table | ✅ Already existed |
| CSV/Excel export (pipeline + users) | ✅ Done |
| Plan limit enforcement | ✅ Already existed |
| Cloudinary resume upload | ✅ Done |
| Candidate status stepper | ✅ Already existed |
| Job Alerts | ✅ Done |
| Screening questions in pipeline | ✅ Done |
| Screening questions on apply | ✅ Done |
| Duplicate detection on apply | ✅ Done |

---

## Task Groups Complete

| Group | Feature |
|-------|---------|
| 6  | Workflow Automation + SLA |
| 7  | NPS, Docs, Video, Referrals |
| 8  | 2FA SMS, Sessions, Google SSO |
| 9  | Pre-boarding + Crons |
| 10 | Custom Fields + Pipeline Templates |
| 11 | Screening Questions + Branded Emails |
| 12 | Job Alerts |
| 13 | Hiring Manager + Exports + Resume Upload |
