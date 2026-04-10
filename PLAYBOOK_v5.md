# TalentNest HR — Phase 5: Assessments, Interviews & Offer Letters
**Date:** 2026-04-04
**Build result:** ✅ Zero errors, zero warnings (144 modules, 13.55s)

---

## Files Changed / Created

| File | Status | Change |
|---|---|---|
| `backend/src/models/Assessment.js` | **FIXED** | Schema rewritten to match route expectations: `orgId`/`recruiterId` fields added, `questions` typed as `Mixed` (JSON string storage), `timeLimitMins`/`passingScore`/`isActive`/`autoAdvance` added, strict required constraints removed |
| `backend/src/routes/assessments.js` | **FIXED** | Middleware unified to `authMiddleware` + `allowRoles`; submit now accepts `autoSubmitted` boolean + `violations` array; merges violations from anti-cheat frontend into submission record |
| `src/pages/candidate/CandidateAssessment.jsx` | **FIXED** | MAX_VIOLATIONS 2→3; keyboard shortcuts blocked (`ctrl+c/v/a/u/p/s...`, `F12/F11/F10/F5`); ctrl+c/v counted as violations; violations snapshot + autoSubmitted flag sent with submission; consent screen text updated |
| `src/api/services/platform.service.js` | **UPDATED** | `submitAssessment(id, answers, autoSubmitted, violations)` signature updated; Offers API methods added; `submitScorecard` added; dynamic imports fixed to static |
| `backend/src/routes/applications.js` | **UPDATED** | Interview route completely rebuilt: iCal calendar invite generated + emailed to candidate + interviewer; WhatsApp message via Twilio; scorecard route `POST /:id/interview/:roundIndex/scorecard` added |
| `backend/src/routes/offers.js` | **NEW** | Full offer letter CRUD + sign + PDF download |
| `backend/server.js` | **UPDATED** | `app.use('/api/offers', ...)` mounted |

---

## TASK 1 — Assessment Module

### Schema fix (`Assessment.js`)
- Added: `orgId`, `recruiterId`, `timeLimitMins`, `passingScore`, `isActive`, `autoAdvance`  
- Changed: `questions` from embedded typed array → `Mixed` (routes store as JSON string with `options[].isCorrect`)
- Made: `tenantId`, `createdBy` optional (routes write `orgId`/`recruiterId` instead)
- Kept: `antiCheatEnabled` flag

### Route fix (`assessments.js`)
- `const { authenticate: auth }` → `const { authMiddleware }` (alias maintained so all `auth` references work)
- Submit endpoint now accepts: `{ answers, autoSubmitted, violations }`
- Violations from anti-cheat frontend override/update the DB record on submit
- `autoSubmitted: true` written when triggered by timer expiry or violation limit

### Start flow
1. `POST /api/assessments/:id/start` — records `startedAt`, returns questions **without** `isCorrect` fields (stripped by `sanitizeQuestions`)
2. `POST /api/assessments/:id/submit` — auto-grades MCQ, calculates percentage, updates Application with `assessmentScore` + `assessmentResult`, notifies recruiter

---

## TASK 2 — Anti-cheat Frontend (`CandidateAssessment.jsx`)

| Rule | Implementation |
|---|---|
| Consent screen with fullscreen notice | `pre-start` phase with PROCTORED ASSESSMENT notice box |
| Fullscreen required before start | `requestFullscreen()` called on phase transition to `active` |
| Fullscreen exit → violation | `fullscreenchange` listener → `triggerViolation('fullscreen_exit')` |
| Tab switch → violation | `visibilitychange` listener → `triggerViolation('tab_switch')` |
| Right-click blocked | `contextmenu` listener → `preventDefault()` |
| Keyboard shortcuts blocked | `keydown` → blocks `F12/F11/F10/F5` + `ctrl+c/v/a/u/p/s/i/j/f/g/r/w/n/t`; ctrl+c/v count as violations |
| Violation count in state | `violationsRef.current` (ref not state — avoids stale closure) |
| **3 violations → auto-submit** | `if (violationsRef.current >= MAX_VIOLATIONS) handleSubmitRef.current(true)` |
| Timer countdown | `setInterval` ticking from `assessment.timeLimitMins` |
| Timer zero → auto-submit | `handleSubmitRef.current(true)` when remaining === 0 |
| Violations sent with submission | `violationsSnapshot` array passed as `violations` param to `api.submitAssessment` |
| `autoSubmitted` flag | Boolean passed as 3rd arg to `api.submitAssessment` |

**Grace period:** 3 seconds after phase becomes `active` — prevents false violations from fullscreen transition blur events.
**Debounce:** 1.5s between violations — prevents double-fire from rapid browser events.

---

## TASK 3 — Interview Scheduling (`applications.js`)

### `PATCH /api/applications/:id/interview`

**Inputs:** `date`, `time`, `format`, `interviewerName`, `interviewerEmail`, `videoLink`, `notes`

**Actions:**
1. Appends round to `interviewRounds[]` with `scheduledAt`, format, interviewer details
2. Advances stage to `Interview Round 1` / `Interview Round 2` if not already there
3. Generates iCal event (RFC 5545 VCALENDAR/VEVENT)
4. Emails candidate + interviewer: HTML invite + calendar attachment
5. Sends WhatsApp to candidate phone via Twilio API (dev fallback: console.log)

**iCal format:**
```
BEGIN:VCALENDAR → VERSION:2.0 → METHOD:REQUEST → BEGIN:VEVENT
  SUMMARY: "Interview Round 1 — {jobTitle} @ {orgName}"
  DTSTART/DTEND: UTC (1-hour slot)
  ORGANIZER + ATTENDEE entries
END:VEVENT → END:VCALENDAR
```

**WhatsApp (Twilio):**
- Env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`
- Dev mode (no vars): console.log instead of API call
- Message includes: round label, date, time, role, join link

### `POST /api/applications/:id/interview/:roundIndex/scorecard`

Saves structured scorecard to `application.interviewRounds[roundIndex].feedback`:

```json
{
  "rating": 0-5,
  "technicalScore": 0-100,
  "communicationScore": 0-100,
  "problemSolvingScore": 0-100,
  "cultureFitScore": 0-100,
  "strengths": "...",
  "weaknesses": "...",
  "recommendation": "proceed|hold|reject",
  "notes": "...",
  "submittedBy": "userId",
  "submittedAt": "ISO date"
}
```

---

## TASK 4 — Offer Letter API (`/api/offers`)

### Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/offers/application/:appId` | Auth | Get or auto-create offer for application |
| `GET` | `/api/offers/:id` | Auth | Single offer |
| `PATCH` | `/api/offers/:id` | Auth + recruiter/admin | Update templateData |
| `POST` | `/api/offers/:id/send` | Auth + recruiter/admin | Email offer to candidate |
| `POST` | `/api/offers/:id/sign` | Auth (candidate) | Sign offer — captures name, IP, user agent |
| `GET` | `/api/offers/:id/pdf` | Auth | Download signed PDF |

### Template variables
`candidateName` `designation` `ctc` `joiningDate` `companyName` `signatoryName` `signatoryDesignation` `customClauses`

### Sign flow
1. Candidate calls `POST /offers/:id/sign` with `{ typedName }`
2. Backend stores `signatureData: { typedName, ip, userAgent }` + `signedAt`
3. `generateOfferPDF()` builds full PDF with pdfkit — letterhead, employment details, CTC, custom clauses, acceptance block with typed name + date + IP
4. PDF stored as base64 data URL in `offer.signedDocUrl`
5. Application stage auto-advanced to `Hired`
6. Confirmation email sent to candidate

### PDF generation (`pdfkit`)
- Already installed as dependency
- Uses `PDFDocument` from pdfkit to generate A4 letter
- Sections: Header, Reference/Date, Addressee, Subject, Body, Employment Details, Custom Clauses, Signatory block, Acceptance block (if signed)
- Streams to buffer → stored as `data:application/pdf;base64,...`

### Download
`GET /api/offers/:id/pdf` extracts base64 from `signedDocUrl` → streams as `Content-Type: application/pdf` with `Content-Disposition: attachment`

---

## Env Vars Required for Full Functionality

| Var | Purpose | Fallback |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | WhatsApp via Twilio | console.log in dev |
| `TWILIO_AUTH_TOKEN` | WhatsApp via Twilio | console.log in dev |
| `TWILIO_WHATSAPP_FROM` | WhatsApp sender number | `whatsapp:+14155238886` |
| `RESEND_API_KEY` | Email (already in use) | console.log in dev |
| `FRONTEND_URL` | Links in emails | `https://talentnesthr.com` |

---

## Architecture Notes

- iCal events are generated inline — no external calendar library needed
- WhatsApp messages use Twilio's REST API directly (no SDK) — smaller bundle, no extra dep
- PDF is generated server-side with pdfkit (already installed)
- Signed PDF stored as base64 in MongoDB — suitable for small PDFs; can be migrated to S3 by changing `signedDocUrl` format
- All offer routes use `Application` as the tenant authority (join via `applicationId`)
- Anti-cheat violations are tracked in `violationsRef` (not React state) to avoid stale closure issues in event listeners
