# TalentNest HR — Phase 1 Foundation Fixes
**Date:** 2026-04-03
**Build result:** ✅ Zero errors (144 modules, 13s)

---

## Files Changed

| File | Task | Change |
|---|---|---|
| `backend/src/models/Assessment.js` | Task 3 | Removed broken `else` branch requiring missing `../db/database`. Now unconditionally exports Mongoose model. |
| `backend/src/models/AssessmentSubmission.js` | Task 3 | Same — removed dead `database.js` fallback. |
| `backend/src/models/Invite.js` | Task 3 | Same — removed dead `database.js` fallback. |
| `backend/src/models/Application.js` | Task 4+Bug4 | Added `inviteStatus` field (`sent/opened/interested/declined/failed`) that was written by service but never defined in schema. |
| `backend/src/models/Organization.js` | Bug 6 | Renamed schema field `logo` → `logoUrl` + added `logoUpdatedAt`. Now matches every reference in `orgs.js`. |
| `backend/src/middleware/checkPlanLimits.js` | Bug 9 | Added `pro` plan to `PLAN_LIMITS` (was silently falling back to `free` limits for `pro` orgs). |
| `backend/src/routes/billing.js` | Bug 5+9 | Fixed job count query `status: 'Open'` → `status: { $in: ['active','draft'] }`. Added `pro` to `PLANS` map. |
| `backend/src/routes/applications.js` | Bug 7 | Fixed `Notification.create` using invalid `type: 'status_change'` → `'stage_change'`. |
| `backend/src/services/application.service.js` | Bug 8+11+12 | Added `returnDocument: 'after'` + `result.value \|\| result` fallback (upsert null crash). Fixed `type: 'invite_sent'` → `'system'`. Fixed `body:` → `message:` on Notification. |
| `src/api/services/application.service.js` | Bug 2 | Fixed `addApplicationNotes` from `POST` → `PATCH` to match backend route. |
| `src/api/services/job.service.js` | Bug 3+Task 4 | Fixed `assignRecruiterToJob` from `PATCH /assign-recruiter` → `POST /assign`. Removed all `.split(',')` on skills. Added `filter` to drop jobs with no ID. |
| `src/api/services/user.service.js` | Task 2+5 | Removed duplicate `getOrgs`. Fixed `getUsers` to always return an array. |
| `src/api/services/auth.service.js` | Task 2 | Removed duplicate `impersonate` (kept in `platform.service.js`). |
| `src/api/matching.js` | Task 4 | Replaced all `.split(',')` on skills with `toSkillArr` helper using `Array.isArray` guard. |
| `src/pages/recruiter/RecruiterPipeline.jsx` | Task 4+5 | Removed `.split(',')` on skills. Added `.filter(job => job.id)` guard on pipeline jobs. |
| `vite.config.js` | Task 8 | Added `vendor-xlsx` manual chunk (412 kB isolated). |

---

## Task Completion Summary

| Task | Status | Notes |
|---|---|---|
| Task 1 — Delete dead files | ✅ | Dead files from audit do not exist in local repo (already cleaned). `safeError.js` and `validate.js` confirmed LIVE. No deletions needed. |
| Task 2 — Merge duplicates | ✅ | `requireRole.js` does not exist locally (only `roleCheck.js`). Removed `getOrgs` from `userService`, `impersonate` from `authService`, `updateJob` alias from `jobService`. |
| Task 3 — Fix broken imports | ✅ | Removed broken `else require('../db/database')` from all 3 model files. Missing file no longer referenced. |
| Task 4 — Fix skills field | ✅ | All `.split(',')` on skills replaced with `Array.isArray` guards in `matching.js`, `job.service.js`, `RecruiterPipeline.jsx`. |
| Task 5 — Fix ID problem | ✅ | `getUsers` always returns array. Pipeline filters out jobs with no ID. Upsert null crash fixed. |
| Task 6 — Fix hardcoded localhost | ✅ | Already fixed (`'https://talentnesthr.com'` fallback). No localhost in `src/`. |
| Task 7 — Fix authMiddleware imports | ✅ | `email.js` uses correct destructure alias. No broken imports found. |
| Task 8 — Fix Vite build | ✅ | All page imports already use `React.lazy()`. Added `vendor-xlsx` chunk. Build passes zero errors. |

---

## Decisions Made

- **`safeError.js` and `validate.js` kept** — audit incorrectly marked them DEAD; both imported by active route files.
- **`organization.logo` renamed to `logoUrl`** — schema field name conflicted with every route in `orgs.js`. Existing MongoDB records with data in the old `logo` field will not surface until re-saved (safe — routes were always writing to `logoUrl` which Mongoose was silently ignoring in strict mode).
- **`inviteStatus` default is `'sent'`** — matches first enum value and logical state when invite is created.
- **`pro` plan added to both `billing.js` and `checkPlanLimits.js`** — 50 jobs / 10 recruiters / 200 AI credits (between `growth` and `enterprise`).
