# Test Cases

These test cases operationalize the [Acceptance Criteria](../Product/07-acceptance-criteria.md) (AC-1 through AC-12) into concrete test steps. All are currently **manual** (per [QA Strategy](01-qa-strategy.md)); each is written so it can be lifted directly into an automated test (Vitest/Playwright) when Phase 1+ begins.

## TC-1 — Candidate public application (AC-1)
**Pre-condition**: An active `Job` exists with a published career page slug.
1. As an unauthenticated visitor, open the org's career page and select the job.
2. Submit the application form with a new email address.
3. **Expect**: HTTP 201, `Application.currentStage = "Applied"`, a new `Candidate` is created with `source: 'career_page'` (or `public`), and org admins/super_admins receive a `Notification`.
4. Re-submit the same email for the same job.
5. **Expect**: HTTP 409 (duplicate prevented).

## TC-2 — Recruiter pipeline stage move (AC-2)
**Pre-condition**: An `Application` exists in stage "Screening" for a recruiter-accessible job.
1. As `recruiter`, open Recruiter Pipeline, locate the application.
2. Drag/move it to "Interview".
3. **Expect**: `Application.currentStage = "Interview"`, `stageHistory` gets a new entry with timestamp + actor, candidate receives a notification (if configured).
4. **Regression check** (Technical Debt #2): the Pipeline list itself must render correctly from a `{success, data, pagination}` response — verify no `.filter is not a function` console error on initial load.

## TC-3 — Talent Mirror match score display (AC-3 / Technical Debt #3)
1. As `recruiter`, open an application's detail view where `Application.matchBreakdown` is populated.
2. **Expect**: skill/experience/location/notice sub-scores render as numbers (not `NaN` or `[object Object]`).
3. Open `JobDetailDrawer` for a job fetched via `.lean()` (only has `_id`, no virtual `id`).
4. **Expect**: no `Cast to ObjectId failed for value "undefined"` error (regression check for the `normJob()` fix).

## TC-4 — Assessment submission & auto-scoring (AC-4)
1. As `candidate`, open an assigned `Assessment` (mix of `mcq_single`, `mcq_multi`, `text`, `code`, `truefalse`).
2. Answer all questions, submit before `timeLimitMins` expires.
3. **Expect**: `AssessmentSubmission.totalScore` computed automatically; `submittedAt` set; if `autoAdvance` is enabled and score ≥ `passingScore`, `Application.currentStage` advances.
4. Trigger an anti-cheat flag (e.g., tab-switch if `antiCheatEnabled`).
5. **Expect**: `AssessmentSubmission.flags` records the violation via `/:id/submissions/:subId/violation`.

## TC-5 — Self-scheduling + video interview (AC-5)
1. As `recruiter`, generate a `SchedulingLink` for an application.
2. As `candidate` (no auth, token-based), open the link, pick a slot.
3. **Expect**: confirmation recorded; both parties notified.
4. At interview time, both parties join the `VideoRoom` via Socket.io.
5. **Expect**: WebRTC connection establishes; `VideoRoom.participants` records join times.

## TC-6 — Offer letter generation & signing (AC-6)
1. As `recruiter`/`admin`, move application to "Offer", generate offer with `ctcOffered`, `tenure`, `joiningDate`.
2. **Expect**: `OfferLetter.status = 'sent'`, PDF generated at `documentUrl`.
3. As `candidate`, open offer, digitally sign.
4. **Expect**: `OfferLetter.status = 'accepted'`, `signatureImageUrl` populated, recruiters/admins notified (key milestone).

## TC-7 — BGV document upload & verification (AC-7 / Compliance §4)
1. As `candidate`, upload a document with `documentType: 'pan'`.
2. **Expect**: `BgvDocument.verificationStatus = 'pending'`.
3. As `admin`, review and set `verificationStatus = 'approved'`, `verifiedBy = <admin userId>`.
4. **Expect**: candidate sees updated status; audit log entry created.

## TC-8 — Pre-boarding checklist (AC-6 continuation)
1. After `OfferLetter.status = 'accepted'`, verify a `PreBoarding` record is generated from the relevant `OnboardingTemplate`.
2. As `candidate`, complete tasks; as `admin`, mark `verifyStatus` per task.
3. **Expect**: `PreBoarding.status` transitions `pending → in_progress → completed`; `joiningConfirmed` settable; `welcomeKitSentAt` recorded when triggered.

## TC-9 — Company review submission & moderation (AC-8, optional `tenantId`)
1. As `candidate` (post-hire or general user), submit a `CompanyReview` with `rating_breakdown` (salary/culture/growth) for a company that may or may not be a TalentNest tenant.
2. **Expect**: review saves with `tenantId` either set (if company is a tenant) or `null`/absent (super_admin-curated, non-tenant company).
3. As `super_admin`, view moderation queue; flag/remove a review.
4. **Expect**: `isPublic` toggled appropriately; public endpoint `/api/company-reviews/public/:id` reflects the change.

## TC-10 — College Hiring Portal: drill-down navigation (AC-9.1–9.7)
1. As `placement_officer`, open College Overview.
2. Click a KPI card (e.g., "Upcoming Interviews").
3. **Expect**: navigates to `/app/applicants?stage=Interview` with a "Filtered by: ✕ Clear" chip; clearing the chip resets the filter.
4. Click a department breakdown bar.
5. **Expect**: navigates to `/app/candidates?dept=<dept>` filtered correctly.
6. Open College Drives, create a new drive with eligibility (`minCGPA`, `branches`, `skills`).
7. **Expect**: drive saved to `PlacementDrive`, students can register (`registrations[]`).
8. Open College Placements, filter by stage/company, add a private `collegeNotes` entry via PATCH.
9. **Expect**: note saved and visible only to college-tenant users.
10. Open College Students, click a student, verify skill-gap course recommendations render.

## TC-11 — Playbook generation regression (AC-12 / Technical Debt #7)
1. As `super_admin`, open `/app/playbooks`.
2. For **each** of the 11 playbook cards (Developer, AllUsers, Sales, Tester, Architecture, Platform, User, AuditReport, DeveloperV4, ProductIntelligence, FullBible):
   - Click **Preview** → **Expect**: iframe renders HTML, no blank screen, no console `ReferenceError`.
   - Click **Download** → **Expect**: file downloads, contains expected HTML content.
3. Click **Download All** → **Expect**: `TalentNest-Bible.zip` contains all 11 HTML files.
4. **Specific regression check**: Product Intelligence and Full Bible playbooks (the two affected by commit `d5fd074`) must both Preview/Download successfully and contain the `placement_officer` role section (7 roles, "College Hiring Portal" feature row #41).

## TC-12 — Multi-tenant isolation (AC-10/11, cross-cutting)
1. As `admin` of Tenant A, attempt to fetch a `Job`/`Candidate`/`Application` belonging to Tenant B by ID (e.g., via direct API call with a known Tenant-B ObjectId).
2. **Expect**: `tenantGuard` rejects the request (403/404) — no cross-tenant data leakage.
3. As `super_admin`, verify cross-tenant access (Orgs, Audit, College Groups) **is** permitted by design.

## TC-13 — Rate limiting (Security §4)
1. Send >500 requests to `/api/auth/login` from one IP within 15 minutes.
2. **Expect**: subsequent requests return HTTP 429 with `{success: false, error: 'Too many login attempts.'}`.
3. Repeat for `/api/admin/invite-recruiter` (>200/hr) and global `/api/*` (>20,000/15min).

## 14. Coverage gaps (currently untested even manually)
- Webhook delivery retries (`Webhook.js` `deliveries[]`) — no documented manual test.
- Email sequence step timing (`EmailSequence.enrollments[].nextSendAt`) — relies on lazy/on-request triggering (see [Architecture Documentation §3](../Architecture/01-architecture-documentation.md)); no test confirms steps fire correctly without a triggering request.
- Load/performance testing — none identified (see [Non-Functional Requirements](../Product/05-non-functional-requirements.md)).
