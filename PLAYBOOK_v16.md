# PLAYBOOK v16 — Onboarding & Pre-boarding

**Date:** 2026-04-06
**Commit:** `d7b5704`
**Task Group:** 9

---

## Files Created

| File | Purpose |
|------|---------|
| `backend/src/models/PreBoarding.js` | Pre-boarding schema — 12-task checklist, 5 categories, joining confirmation, welcome kit tracking, `completionPct` virtual |
| `backend/src/routes/preboarding.js` | CRUD + task management + welcome kit email send |
| `backend/src/jobs/preboardingCron.js` | 3 daily cron jobs (see below) |
| `src/pages/admin/AdminOnboarding.jsx` | HR dashboard — KPI cards, list, detail modal with task toggle/add/send-kit |
| `src/pages/candidate/CandidateOnboarding.jsx` | Candidate self-service — ring progress, grouped task checklist, joining confirmation |

## Files Modified

| File | Change |
|------|--------|
| `backend/src/routes/offers.js` | Auto-creates PreBoarding with 12 default tasks when offer is signed (idempotent) |
| `backend/server.js` | Registered `/api/preboarding` + `startPreBoardingJobs()` |
| `src/layout/Layout.jsx` | `🎯 Pre-boarding` nav item added to candidate, recruiter, admin, superadmin |
| `src/App.jsx` | Lazy imports + `onboarding` page routes for all 4 roles |
| `src/api/services/platform.service.js` | 6 new pre-boarding API methods |

---

## Pre-boarding Flow

```
Candidate signs offer letter
  └─ POST /api/offers/:id/sign
       └─ Auto-creates PreBoarding with 12 default tasks
            │
            ▼
       Daily cron (3:30 UTC = 9AM IST)
            ├─ New records → send Welcome Kit email to candidate
            └─ Joining in 3 days + not confirmed → Confirmation reminder email

       Daily cron (4:30 UTC = 10AM IST)
            └─ Joining in ≤5 days, completion <100%, 24h dedup → Incomplete checklist nudge

       Candidate completes tasks via CandidateOnboarding page
       HR tracks + manages via AdminOnboarding page
```

## Default Checklist (12 tasks)

| # | Task | Category | Required |
|---|------|----------|---------|
| 1 | Submit Aadhaar Card | document | ✅ |
| 2 | Submit PAN Card | document | ✅ |
| 3 | Submit Salary Slips (3) | document | ✅ |
| 4 | Submit Experience Letter | document | ❌ |
| 5 | Submit Relieving Letter | document | ❌ |
| 6 | Submit Educational Documents | document | ✅ |
| 7 | Bank Account Details | document | ✅ |
| 8 | IT Asset Request Submitted | it_setup | ✅ |
| 9 | Work Email Created | it_setup | ✅ |
| 10 | Review Employee Handbook | policy | ✅ |
| 11 | Complete Compliance Training | training | ✅ |
| 12 | Orientation Scheduled | orientation | ✅ |

HR can add custom tasks via the detail modal. Candidates can mark tasks complete from their portal.

---

## Next: Task Group 10 — Custom Fields & Pipeline Templates
- CustomFieldDefinition + CustomFieldValue models
- Custom fields API + UI for candidate/job/application forms
- Pipeline templates in tenant settings
