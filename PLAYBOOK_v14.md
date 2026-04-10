# PLAYBOOK v14 — Workflow Automation, SLA Monitoring, Candidate Experience (NPS, Docs, Video, Referrals)

**Date:** 2026-04-06
**Commit:** `f4c44d7`
**Task Groups Covered:** 6 (Automation) + 7 (Candidate Experience)

---

## Task Group 6 — Workflow Automation & SLA

### Files Created

| File | Purpose |
|------|---------|
| `backend/src/models/WorkflowRule.js` | Automation rule schema (trigger.event, conditions[], actions[]) |
| `backend/src/services/workflowEngine.js` | Core engine: evaluateWorkflows(), condition matching, action execution, {{variable}} interpolation |
| `backend/src/jobs/slaMonitor.js` | Hourly cron — checks stage duration vs SLA, sends warning/breach alerts, 24h dedup |
| `src/pages/admin/AdminAutomation.jsx` | Full UI: list rules, create/edit with condition & action builders, test (dry-run), toggle active |

### Files Modified

| File | Change |
|------|--------|
| `backend/src/models/Application.js` | Added `lastSlaAlertAt: Date` for SLA alert deduplication |
| `backend/src/routes/applications.js` | Calls `evaluateWorkflows` after stage change and after public apply |
| `backend/src/routes/admin.js` | WorkflowRule CRUD routes + POST /:id/test (dry-run) |
| `backend/server.js` | Imports and starts `slaMonitor` job in connectDB().then chain |
| `src/pages/recruiter/RecruiterPipeline.jsx` | SlaDot component (green/yellow/red) on Kanban cards + 🎥 video icon |
| `src/layout/Layout.jsx` | Added ⚡ Automation nav item for admin + superadmin |
| `src/App.jsx` | Lazy route for AdminAutomation (admin + superadmin) |
| `src/api/services/platform.service.js` | Added workflow API methods |

### Workflow Engine

```
evaluateWorkflows(tenantId, eventData, dryRun)
  │
  ├─ Load active WorkflowRules matching tenantId + trigger.event
  ├─ For each rule: evaluate conditions (equals/not_equals/above/below/contains)
  └─ Execute actions:
       ├─ send_email → Resend API with {{variable}} interpolation
       ├─ send_whatsapp → Twilio REST fetch (no SDK)
       ├─ move_stage → update application.stage + stageHistory
       ├─ notify_recruiter → Notification model
       ├─ notify_admin → Notification model
       └─ create_task → Task model
```

### SLA Defaults (hours)

| Stage | Warning | Breach |
|-------|---------|--------|
| Applied | 19.2h | 24h |
| Screening | 38.4h | 48h |
| Shortlisted | 57.6h | 72h |
| Interview Round 1 | 134.4h | 168h |
| Interview Round 2 | 192h | 240h |
| Offer | 57.6h | 72h |

---

## Task Group 7 — Candidate Experience

### Files Created

| File | Purpose |
|------|---------|
| `backend/src/models/CandidateNPS.js` | NPS survey record — surveyToken (JWT), score 0-10, wouldRecommend, feedbackText |
| `backend/src/models/CandidateDocument.js` | Document locker — 13 Indian joining doc types, verificationStatus workflow |
| `backend/src/models/Referral.js` | Employee referral — referralLinkToken, status, reward fields |
| `backend/src/jobs/npsScheduler.js` | Daily cron 10AM IST — finds hired/rejected apps, creates NPS records, sends survey emails |
| `backend/src/routes/nps.js` | Public GET /respond/:token + authenticated GET /stats |
| `backend/src/routes/candidateDocs.js` | Document upload (Cloudinary), list, verify (with email on resubmission) — mergeParams:true |
| `backend/src/routes/candidateVideo.js` | Video upload to Cloudinary (100MB limit, video/* only) — mergeParams:true |

### Files Modified

| File | Change |
|------|--------|
| `backend/src/models/Candidate.js` | Added `videoResumeUrl: String` field |
| `backend/server.js` | Registered /api/nps, /api/candidates/:id/documents, /api/candidates/:id/video; starts npsScheduler |
| `src/pages/candidate/CandidateOffer.jsx` | DocumentLocker component shown after offer signing (13-item checklist, progress bar, upload/replace) |
| `src/pages/candidate/CandidateProfile.jsx` | VideoResumeSection (MediaRecorder, 60s countdown, preview before save) + 🎥 Video tab |
| `src/pages/admin/AdminAnalytics.jsx` | NPS stats section — avg score, total responses, recent feedback list |
| `src/App.jsx` | Added /nps-thankyou inline route |
| `src/api/services/platform.service.js` | getNpsStats, getCandidateDocuments, uploadCandidateDocument, verifyDocument, uploadVideoResume |

### Document Locker — 13 Types

`aadhaar`, `pan`, `salary_slip_1/2/3`, `experience_letter`, `relieving_letter`, `marksheet_10`, `marksheet_12`, `degree_certificate`, `passport_photo`, `bank_details`, `cancelled_cheque`

### Video Resume Flow

```
Browser → getUserMedia({ video, audio })
  → MediaRecorder (60s countdown)
  → Preview blob URL
  → User confirms → FormData POST /api/candidates/:id/video
  → Cloudinary folder: candidate-videos
  → Saved to Candidate.videoResumeUrl
  → Recruiter sees 🎥 icon on Kanban card
```

### NPS Flow

```
Daily cron (4:30 UTC = 10AM IST)
  → Finds hired/rejected applications from last 24h
  → Creates CandidateNPS with JWT surveyToken (30d)
  → Sends email with 10 score buttons + Yes/No recommendation
  → Candidate clicks link → GET /api/nps/respond/:token
  → Score saved, redirect to /nps-thankyou
  → Admin sees stats on Analytics Overview
```

---

## Next: Task Group 8 — Security Hardening
- 2FA end-to-end (OTP via SMS)
- UserSession model + active session management UI
- Google SSO verification and fix
