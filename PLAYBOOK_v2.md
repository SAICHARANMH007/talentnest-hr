# TalentNest HR — Phase 2: Database Layer Rebuild
**Date:** 2026-04-03
**Build result:** ✅ Zero errors (144 modules, 26s)

---

## Models Changed / Created

| File | Status | Description |
|---|---|---|
| `backend/src/models/Tenant.js` | **NEW** | Replaces `Organization` as the multi-tenancy root. Fields: `name`, `slug`, `domain`, `logoUrl`, `isRecruitmentAgency`, `plan` (`trial/basic/pro`), `subscriptionStatus`, `subscriptionExpiry`, `settings.pipelineStages` (8 default stages), `settings.emailTemplate`, `settings.brandColors`. |
| `backend/src/models/User.js` | **REBUILT** | `orgId` → `tenantId` (ref `Tenant`). `password` → `passwordHash`. Role enum adds `client`. Invite flow uses `inviteToken`/`inviteTokenExpiry` instead of `resetPasswordToken` pattern. Removed `softDeletePlugin` (soft-delete will be handled at service layer). `comparePassword()` updated to use `this.passwordHash`. |
| `backend/src/models/Job.js` | **REBUILT** | `orgId` → `tenantId` (ref `Tenant`). Added `clientId` (ref `Client`). Added `salaryMin`, `salaryMax`, `salaryCurrency` (default `INR`), `salaryType` (`monthly/annual/CTC`). Added `niceToHaveSkills`, `numberOfOpenings`, `targetHireDate`, `careerPageSlug`. Status enum simplified to `draft/active/closed`. Removed approval flow fields (to be handled in service layer). |
| `backend/src/models/Candidate.js` | **NEW** | Separate model for candidates (previously merged into `User`). Fields: `tenantId`, `name`, `email`, `phone`, `resumeUrl`, `parsedProfile` (skills array, experience[], education[], totalExperienceYears), `tags`, `source` (6 enum values), `interestStatus`, `noticePeriodDays`, `currentSalary`, `expectedSalary`, `location`, `willingToRelocate`. |
| `backend/src/models/Application.js` | **REBUILT** | `orgId` → `tenantId`. `candidateId` ref changed to `Candidate` (was `User`). Replaced legacy `stage` field with `currentStage` (free string, default `'Applied'`). Stage history uses `movedBy`/`movedAt`/`notes`. Added `aiMatchScore`, `matchBreakdown` (4 score components), `assessmentViolations`, `interviewRounds` with structured `feedback` + `recommendation` enum, `offerLetterId` (ref `OfferLetter`), `status` enum (`active/rejected/hired/withdrawn/parked`). |
| `backend/src/models/OfferLetter.js` | **NEW** | Fields: `tenantId`, `applicationId`, `candidateId`, `templateData` (7 fields including `customClauses`), `generatedAt`, `sentAt`, `signedAt`, `signedDocUrl`, `signatureData` (typedName/ip/userAgent), `status` (`draft/sent/signed/declined`). |
| `backend/src/models/Assessment.js` | **REBUILT** | `AssessmentSubmission` merged in as `submissions[]` array. Added `tenantId`, `createdBy`. Questions have `type` enum (`mcq/truefalse/short/coding`), `options`, `correctAnswer`, `marks`. Each submission has `candidateId`, `applicationId`, `answers[]`, `score`, `percentage`, `violations[]`, timestamps, `autoSubmitted`. `antiCheatEnabled` default `true`. |
| `backend/src/models/CandidateRequest.js` | **NEW** | Fields: `tenantId`, `requestedBy`, `roleTitle`, `requirements`, `urgency` (`low/medium/high/critical`), `budget`, `adminNotes`, `status` (`pending/in_progress/fulfilled/cancelled`), `submittedCandidates[]`, `chargeAmount`, `fulfilledAt`. |
| `backend/src/models/Client.js` | **NEW** | Fields: `tenantId`, `companyName`, `contactPerson`, `email`, `phone`, `industry`, `isActive` (default `true`). |
| `backend/src/models/AuditLog.js` | **REBUILT** | Added `tenantId`, `userName`, `userRole`, `entity`, `entityId`. Removed `orgId` and `status` fields. `createdAt` explicit default. Uses `{ versionKey: false }` (no `__v` field on logs). Immutability hook preserved. |
| `backend/src/models/EmailLog.js` | **FIXED** | Removed broken `else require('../db/database')` fallback (same fix as Phase 1 applied to Assessment/Invite). |

---

## Decisions Made

### Why `Tenant` instead of `Organization`?
The platform supports both direct employers and recruitment agencies (`isRecruitmentAgency` flag). "Tenant" is the correct SaaS term and clearly separates multi-tenancy concerns from HR-specific concepts. `Organization.js` is kept untouched so existing routes don't break — it will be migrated in Phase 3.

### Why separate `Candidate` from `User`?
The existing `User` model mixed authentication concerns (password, sessions, 2FA) with candidate profile data (skills, resume, salary). Candidates added via `bulk_import` or `invite_link` don't need login accounts at all. The separation allows candidates to exist without credentials and be enriched from resume parsing independently.

### Why merge `AssessmentSubmission` into `Assessment`?
Each assessment is scoped to one job. Submissions are typically fetched together with the assessment definition. Embedding reduces joins and makes the anti-cheat violation tracking atomic.

### Field renames that will require route updates in Phase 3
| Old field | New field | Model |
|---|---|---|
| `password` | `passwordHash` | User |
| `orgId` | `tenantId` | User, Job, Application |
| `stage` | `currentStage` | Application |
| `candidateId` (ref User) | `candidateId` (ref Candidate) | Application |
| `changedBy` | `movedBy` | Application.stageHistory |
| `changedAt` | `movedAt` | Application.stageHistory |

### Models NOT changed in Phase 2 (still used by existing routes)
- `Organization.js` — kept as-is; routes still reference it
- `Notification.js` — kept as-is
- `Invite.js` — kept as-is
- `RefreshToken.js` — kept as-is
- `Otp.js` — kept as-is
- `AssessmentSubmission.js` — kept as-is (submissions now in Assessment; old model retained until routes migrated)
