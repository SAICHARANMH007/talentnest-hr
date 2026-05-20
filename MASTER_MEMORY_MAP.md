# 🧠 TALENTNEST HR — MASTER MEMORY MAP
### Every File. Every Line. Every Purpose.
> Written so a 5th grader can understand it — and a senior engineer can debug it.

---

## 🏗️ WHAT IS THIS APP?

**TalentNest HR** is a full-stack hiring platform (like Naukri + LinkedIn Recruiter + ATS + HRMS combined). It has:
- A **React frontend** (Vite, no TypeScript)
- A **Node/Express backend** (MongoDB with Mongoose)
- **Real-time features** (Socket.io for chat, video, presence)
- **Multiple user roles**: super_admin → admin → recruiter → hiring_manager → client → candidate

Think of it like: **Company uses TalentNest → posts jobs → candidates apply → recruiters screen → hire them → onboard them.** All in one place.

---

## 📁 FOLDER STRUCTURE — THE BIG PICTURE

```
talentnest-hr/
├── backend/          ← Node.js API server (Express + MongoDB)
│   └── src/
│       ├── config/   ← Plans, pricing, Swagger docs
│       ├── db/       ← MongoDB connection + seed scripts
│       ├── jobs/     ← Cron jobs (scheduled background tasks)
│       ├── middleware/  ← Auth, permissions, rate limiting, etc.
│       ├── models/   ← MongoDB schemas (what data looks like)
│       ├── routes/   ← API endpoints (what URLs do what)
│       ├── services/ ← Business logic helpers
│       ├── socket/   ← Real-time chat/video/calls
│       └── utils/    ← Email, SMS, PDF, resume parsing, etc.
├── src/              ← React frontend
│   ├── api/          ← All API calls to backend
│   ├── components/   ← Reusable UI pieces
│   ├── constants/    ← Fixed lists (stages, styles, picklists)
│   ├── context/      ← Shared app state (logo, theme)
│   ├── hooks/        ← Reusable React logic (debounce, presence)
│   ├── layout/       ← The main sidebar + header shell
│   ├── pages/        ← Every screen in the app
│   │   ├── admin/         ← Admin-only screens
│   │   ├── auth/          ← Login / set password
│   │   ├── billing/       ← Subscription page
│   │   ├── candidate/     ← Candidate portal screens
│   │   ├── careers/       ← Public job board
│   │   ├── client/        ← Client portal screens
│   │   ├── hiring_manager/ ← HM dashboard
│   │   ├── marketing/     ← Public website (landing, about, blog)
│   │   ├── meeting/       ← Video interview room
│   │   ├── public/        ← Invite response / interest pages
│   │   ├── recruiter/     ← Recruiter portal screens
│   │   ├── shared/        ← Screens used by multiple roles
│   │   └── superadmin/    ← God-mode screens
│   ├── utils/        ← Frontend helpers
│   └── workers/      ← Web Workers (Excel parsing off main thread)
└── public/           ← Static files (PWA, SEO, widget)
```

---

# 🗄️ BACKEND — MODELS (What data looks like in MongoDB)

## `Application.js` — A candidate's application to a job
Think: "Sarah applied to job X on company Y's pipeline"
- **Who/What**: `tenantId`, `jobId`, `candidateId` (the 3 key links)
- **Stage**: `currentStage` (string like "screening"), `stageHistory` array (full audit trail of every move, who moved it, when, notes)
- **AI matching**: `talentMatchScore` (0-100), `matchBreakdown` (skill/exp/location/notice scores)
- **Assessment**: `assessmentScore`, `assessmentViolations` (anti-cheat flags)
- **Interviews**: `interviewRounds[]` with scheduledAt, format, interviewer, feedback (communication/technical/cultureFit scores, recommendation)
- **Offer**: `offerLetterId` link
- **Status**: `active|rejected|hired|withdrawn|parked`
- **Source info**: where did this candidate come from
- **Geolocation**: `appliedFrom` (lat/lng, city, country, IP — where they were when they clicked Apply)
- **VMS support**: `submittedByTenantId` (for staffing agency submitting to a client)
- **Invite flow**: `inviteToken`, `inviteStatus` (pending→sent→opened→interested/accepted/declined)

---

## `Assessment.js` — A test/quiz for a job
Think: "Before interviewing, take this 30-minute coding test"
- Links to: `tenantId`, `jobId`, `recruiterId`
- `questions[]`: each question has type (mcq_single, mcq_multi, text, code, truefalse), marks, options, correctAnswer
- Settings: `timeLimitMins`, `passingScore`, `autoAdvance` (auto-move stage on pass), `antiCheatEnabled`

---

## `AssessmentSubmission.js` — A candidate's answers to a test
Think: "Sarah's answers and score for that coding test"
- Links to: `assessmentId`, `candidateId`, `applicationId`
- `status`: in_progress → submitted → expired
- `answers[]`, `score`, `percentage`, `result` (pass/fail/pending)
- `violations[]` — tab switches, fullscreen exits captured here
- `recruiterReview` — HR can override/review

---

## `AuditLog.js` — Immutable action log (like a black box)
Think: "Who did what, when, from where — can NEVER be changed"
- Records every important action: `action`, `entity`, `entityId`
- Captures: `userId`, `userName`, `userRole`, `ip`, `userAgent`
- Has a pre-save hook that BLOCKS edits after creation
- Used for compliance, security investigation

---

## `BgvDocument.js` — Background verification documents
Think: "Upload your Aadhaar, PAN card, degree certificate here"
- Belongs to: `userId`, `tenantId`
- `docType`: aadhaar | pan | passport | degree | salary_slip | exp_letter | relieving_letter | address_proof | bank_details | reference | other
- `status`: uploaded → under_review → verified | rejected
- HR sets `verifiedBy`, `verifiedAt`, `rejectNote`

---

## `Blog.js` — Company blog articles
Think: "Blog posts on the public TalentNest website"
- `slug` (unique URL), `title`, `category`, `excerpt`
- `sections[]`: each section has heading + body text
- `published` and `featured` booleans
- Pre-save hook auto-calculates `readTime` from word count
- `views` counter (incremented on public read)

---

## `CallRecord.js` — VoIP call logs
Think: "Recruiter called candidate — log who called who, when, how long"
- `callId` (unique), `fromUserId`, `toUserId`, names
- `callType`: audio | video
- `outcome`: answered | declined | missed | failed | cancelled
- Duration in seconds

---

## `Candidate.js` — A candidate's profile (the most important model)
Think: "This is the candidate's resume + HR placement file combined"
- Basic: `name`, `email`, `phone`, `industry`, `department`, `title`, `summary`
- Skills: `skills[]`, `experience` (years), `location`, `linkedinUrl`, `resumeUrl`, `videoResumeUrl`
- HR placement fields: `currentCompany`, `currentCTC`, `expectedCTC`, `noticePeriodDays`, `availability`, `preferredLocation`, `relevantExperience`, `certifications`
- Client info: `client`, `ta` (talent advisor), `clientSpoc`
- `parsedProfile`: AI-parsed JSON from resume (skills, education, experience arrays)
- History: `workHistory`, `educationList` (JSON strings)
- Tags & source: `tags[]`, `source` enum (manual/resume_upload/bulk_import/invite_link/career_page/referral/platform/talent_match)
- Outreach: `lastReachedOutAt`, `reachOutNote`, `contactLog[]` (full call log)
- Platform account link: `userId` (if they registered), `accountInviteSentAt`
- Multi-tenant: `submittedByTenantId` (when staffing agency shares candidate)
- Merge: `mergedInto` (if this candidate was merged into another)
- Soft delete: `deletedAt`

---

## `CandidateDocument.js` — Documents uploaded for verification
Think: "The HR checklist documents — salary slips, experience letters, etc."
- Different from BgvDocument (more structured, per-candidate per-tenant)
- `documentType`: aadhaar | pan | salary_slip_1/2/3 | experience_letter | relieving_letter | marksheet_10/12 | degree_certificate | passport_photo | bank_details | cancelled_cheque | other
- `verificationStatus`: pending → verified | needs_resubmission

---

## `CandidateNPS.js` — Candidate satisfaction surveys
Think: "After your hiring process (win or lose), how was your experience? Rate 1-10"
- Links to: `applicationId`, `candidateId`, `jobId`
- `score` (1-10), `wouldRecommend` (boolean), `feedbackText`
- `applicationOutcome`: hired | rejected
- `surveyToken` (unique, used in email link to fill form without login)
- `respondedAt` (when they filled it)

---

## `CandidateRequest.js` — Staffing demand from hiring managers
Think: "We need 3 React developers — can you find some?"
- `requestedBy` (user), `roleTitle`, `requirements`, `urgency` (low/medium/high/critical)
- `status`: pending → in_progress → fulfilled | cancelled
- `submittedCandidates[]` — candidates submitted against this request
- `chargeAmount` — billing amount
- `fulfilledAt` date

---

## `Client.js` — Client company profile
Think: "Infosys is a client that asks the agency to fill jobs for them"
- `tenantId`, `companyName`, `contactPerson`, `email`, `phone`, `industry`
- `isActive` toggle

---

## `CustomFieldDefinition.js` — Admin-created extra fields
Think: "I want to add a 'GitHub URL' field to all candidate profiles — I can create it here"
- `entity`: candidate | job | application | interview (which form this field appears on)
- `label`, `fieldKey` (auto-generated from label)
- `fieldType`: text | textarea | number | date | select | multiselect | checkbox | url | email | phone | rating | file | rich-text | tags
- `options[]` (for dropdowns)
- `isRequired`, `isActive`, `order` (display order)
- Uniqueness: one key per tenant+entity combo

---

## `CustomFieldValue.js` — The actual values stored in custom fields
Think: "Sarah's GitHub URL is github.com/sarahcodes (stored separately from her main profile)"
- Links: `fieldId` → `CustomFieldDefinition`, `recordId` → actual record (candidate/job/etc)
- `value` is always a string (arrays stored as JSON for multiselect)
- Upsert on save

---

## `DirectMessage.js` — Messages between users
Think: "Recruiter messages candidate directly in the platform"
- `fromUserId`, `toUserId`, `message` (max 5000 chars)
- Optional: `jobId` context, `attachment` (name/type/size/data)
- `readAt` timestamp
- `replyTo` nested object (for threaded replies)

---

## `EmailLog.js` — Every email sent, logged
Think: "A receipt book of all emails sent"
- `to`, `subject`, `body`, `status` (sent/failed), `error`
- `provider`: resend | smtp | dev
- `retryCount`

---

## `ImportedCandidate.js` — Candidates from Excel bulk import
Think: "We imported 500 candidates from a spreadsheet"
- `data` (MongoDB Map — flexible, stores any column from Excel)
- `email`, `name`
- `status`: pending → invited → joined
- `invitedAt`, `userId` (set when they register on platform)

---

## `Invite.js` — Job invites and share links
Think: "We invited Sarah to apply for this specific job"
- `candidateId`, `jobId`, `tenantId`
- `token` (unique URL token)
- `status`: sent → opened → interested | declined | failed
- `type`: invite | job_share
- Tracks: `sentAt`, `openedAt`, `respondedAt`, `sentByName`

---

## `Job.js` — A job posting
Think: "The job listing itself — title, description, requirements, salary"
- Core: `tenantId`, `createdBy`, `clientId`, `title`, `description`, `company`, `department`, `industry`
- Skills: `skills[]` (required), `niceToHaveSkills[]`
- Salary: `salaryMin`, `salaryMax`, `salaryCurrency`, `salaryType` (monthly/annual/CTC)
- Meta: `location`, `jobType`, `experience`, `numberOfOpenings`, `urgency`
- Status: `draft → active → closed`
- Approval: `approvalStatus` (pending_approval → approved | rejected), `approvalNote`, `approvedBy`
- Screening: `screeningQuestions[]` (question, type, options, required)
- Public: `careerPageSlug`, `isPublic`
- Recruiters: `assignedRecruiters[]`, `recruiterHistory[]` (full audit trail of who was assigned/removed and when)

---

## `JobAlert.js` — Email subscription for new matching jobs
Think: "Alert me every day when there's a React job in Hyderabad"
- `userId`, `email`
- Filters: `keywords[]`, `location`, `jobType`, `industry`, `department`, `experienceMin/Max`
- `frequency`: daily | weekly | instant
- `lastSentAt` (prevents duplicate alerts)

---

## `JobDistribution.js` — Distribute jobs to external boards
Think: "Post this job automatically to Indeed, Google Jobs, Jooble"
- `jobId`, `platform` (google, indeed, jooble, etc.)
- `status`: pending → success | failed | retry | permanently_failed
- `attemptCount`, `distributedAt`

---

## `Lead.js` — Sales lead from contact form
Think: "A company filled our 'Contact Us' form asking about pricing"
- `name`, `email`, `phone`, `company`, `service`, `message`
- `status`: new → contacted → converted | closed

---

## `Notification.js` — In-app notifications
Think: "The bell icon alerts — 'Your application moved to interview round'"
- `userId`, `type` (application/stage_change/interview/offer/assessment/invite/system)
- `title`, `message`, `link` (click-through URL)
- `read` boolean
- `metadata` (extra data for rich notifications)

---

## `OfferLetter.js` — Official job offer document
Think: "The PDF offer letter with salary, joining date, terms"
- Links: `tenantId`, `applicationId`, `candidateId`
- `templateData`: candidateName, designation, ctc, joiningDate, companyName, signatoryName/Designation, customClauses
- `status`: draft → sent → signed | declined
- `signedDocUrl` (PDF after e-signature)
- `signatureData`: typedName, ip, userAgent (legal e-signature record)
- `shareToken` (for public link without login)

---

## `OrgCustomizations.js` — Per-org branding and config (THE CUSTOMIZATION MODEL)
Think: "Each company can customize their TalentNest experience"
- `orgId` (unique per organization)
- **Collections** (arrays of items):
  - `pipelineStatuses[]` — custom stage names + colors
  - `tags[]` — candidate/job/application labels
  - `rejectionReasons[]` — why candidates get declined
  - `scoreCards[]` — interview evaluation templates (criteria + maxScore)
  - `documentTypes[]` — what documents to collect
  - `questionBank[]` — interview question library
  - `offerVariables[]` — merge fields for offer letters `{{VARIABLE_NAME}}`
  - `notificationMessages[]` — custom messages at each stage
  - `departments[]` — org departments
  - `locations[]` — office locations
  - `sources[]` — candidate source labels
- **Singletons** (single objects):
  - `emailSignature` — company name, tagline, website, support email, phone, LinkedIn, footer note
  - `fieldVisibility` — Map of field keys → true/false (show/hide fields per form)
  - `brandColors` — primary, secondary, accent, danger, warning, bg colors
  - `offerLetterTemplate` — full offer letter text sections (intro, compensation, joining, terms, closing, footer)
- Static method `getOrCreate(orgId)` — creates document with defaults if none exists

---

## `Organization.js` — Legacy org model (older, still used)
Think: "The company account that owns the subscription"
- `name`, `slug` (unique URL), `logoUrl`, `domain`, `industry`, `size`
- `status`: active | suspended | trial | pending
- `plan`: free | starter | pro | growth | enterprise | trial
- `settings`: maxJobs/Recruiters/Candidates/Admins, features[], pipelineStages[], emailSettings, brandColor
- `stats`: totalHires, avgTimeToHire, storageUsed
- `isStaffingAgency` (staffing agencies have different features)
- Has softDeletePlugin

---

## `Otp.js` — One-time passwords
Think: "The 6-digit code sent to your email for passwordless login"
- `email` (unique), `otp` (string), `purpose` (login_2fa | password_reset)
- `expiresAt` — auto-deleted after 10 minutes via TTL index

---

## `PaymentRecord.js` — Payment transactions
Think: "Receipt of subscription payment via Razorpay"
- `tenantId`, `planName`, `amountInPaise/INR`
- `razorpayOrderId/PaymentId/Signature`
- `status`: created → captured | failed | refunded
- GST breakdown: `gstAmount`, `cgst`, `sgst`, `igst`, `customerGSTIN`
- `invoiceNumber`, `invoicePdfUrl`

---

## `PreBoarding.js` — New hire onboarding checklist
Think: "Welcome to the company! Complete these tasks before your first day"
- Links: `tenantId`, `candidateId`, `applicationId`, `offerId` (one per offer)
- New hire details: name, email, designation, joiningDate, department, reportingTo, ctcOffered
- `tasks[]` with title, category, dueDate, `completedAt/By`
- Document tasks: `fileUrl`, `verifyStatus` (not_uploaded → pending_review → verified | rejected | resubmission_required)
- `status`: pending → in_progress → completed | cancelled
- Virtual: `completionPct` (% of tasks done)
- `joiningConfirmed`, `welcomeKitSentAt`

---

## `PushSubscription.js` — Browser push notification subscriptions
Think: "When you allow notifications in Chrome, this saves your browser's subscription key"
- `userId`, `tenantId`, `subscription` (full browser push subscription object), `isActive`

---

## `Referral.js` — Employee referrals
Think: "John referred his friend Jane for the React job"
- `referredByName/Email/EmployeeId`, `candidateId`, `jobId`
- `referralLinkToken` (unique shareable link)
- `status`: pending → applied → hired
- `rewardPaid`, `rewardAmount` (when hired)

---

## `RefreshToken.js` — JWT refresh tokens for sessions
Think: "The long-lived token that gives you a new login token when yours expires"
- `userId`, `token` (unique), `userAgent`, `ip`, `expiresAt` (TTL auto-delete)
- `originalUserId` (for admin impersonation — admin logs in as another user)
- `revokedAt`, `replacedBy`

---

## `Tenant.js` — Multi-tenant organization model (newer, replaces Organization)
Think: "Each company that uses TalentNest has a Tenant record"
- `name`, `slug` (unique), `domain`, `logoUrl`, `website`, `industry`, `size`
- `parentId` (optional — for multi-org hierarchies)
- `type`: org | tenant | vendor | client
- `isRecruitmentAgency`, `isStaffingAgency` flags
- `plan`: free | trial | starter | basic | growth | pro | agency | enterprise
- `status`: active | suspended | trial | pending
- `subscriptionStatus`, `subscriptionExpiry`, `currentPeriodStart/End`
- Razorpay: `razorpayOrderId`, `razorpayPaymentId`
- GST: `gstinNumber`, `billingAddress`, `billingState`
- `invoiceSequence` (auto-increment for invoice numbers)
- `settings`: maxJobs, maxRecruiters, maxCandidates, pipelineStages[], emailTemplate, brandColors
- Has softDeletePlugin

---

## `User.js` — Every user account (recruiters, admins, candidates, etc.)
Think: "Login credentials + profile for everyone who uses the app"
- Core: `tenantId`, `name`, `email` (unique), `passwordHash`, `role` (super_admin/admin/recruiter/hiring_manager/client/candidate)
- Security: `isActive`, `mustChangePassword`, `failedLoginAttempts`, `lockUntil`, `twoFactorEnabled`
- Social login: `googleId`
- Session: `lastLogin`, `lastLoginLocation` (lat/lng/city/country/IP)
- Profile (for candidates): `photoUrl`, `phone`, `title`, `location`, `summary`, `experience`, `skills[]`, `resumeUrl`, `linkedinUrl`, `github`, `portfolio`, `languages[]`, `industry`, `department`
- Work history: `workHistory`, `educationList`, `certifications` (JSON strings), `videoResumeUrl`
- HR placement: `currentCompany`, `currentCTC`, `expectedCTC`, `preferredLocation`, `noticePeriodDays`, `source`, `candidateStatus`, `client`, `ta`, `clientSpoc`
- Method: `comparePassword(plain)` — bcrypt verify
- Invite: `inviteToken`, `inviteTokenExpiry`, `inviteStatus`, `invitedBy`, `invitedAt`
- `lastSeen` date (for online presence)

---

## `UserSession.js` — Active login sessions
Think: "Track every device/browser that's currently logged in"
- `userId`, `tenantId`, `refreshToken`, `ip`, `userAgent`, `deviceName`, `browser`, `os`
- `lastActive`, `isActive`, `expiresAt` (TTL)
- Static `parseUA(userAgent)` — extracts browser/OS/device from User-Agent string

---

## `VideoRoom.js` — Video interview rooms
Think: "The Zoom-like meeting room for video interviews"
- `interviewId` (Application link), `tenantId`, `jobTitle`, `candidateName`
- `roomToken` (unique URL token), `hostToken`
- `scheduledAt`, `validFrom`, `validUntil`
- `status`: scheduled → live → ended
- `participants[]` with role (interviewer/candidate/observer/guest), joinedAt, leftAt
- `chatMessages[]` (in-room chat)
- `isRecording`, `recordingStartedAt`

---

## `WhatsAppLog.js` — WhatsApp message logs
Think: "Record of every WhatsApp message sent to/from candidates"
- `direction`: outbound | inbound
- `from`, `to`, `message`, `messageSid` (Twilio dedup)
- `status`: sent | delivered | failed | received

---

## `WhatsAppSession.js` — WhatsApp conversation state
Think: "Track where a candidate is in a multi-step WhatsApp conversation"
- `candidatePhone` (E.164 format), `type` (interview-confirm | offer-response)
- `applicationId`, `interviewRoundIndex`
- `expiresAt`, `isResolved`, `resolvedWith` (which option they chose: "1", "2", or "3")

---

## `WorkflowRule.js` — Automation rules
Think: "When candidate reaches Interview stage, auto-send them a WhatsApp message"
- `trigger`: event enum (stage_changed/candidate_applied/assessment_completed/interview_scheduled/offer_not_signed/candidate_stuck), `conditions[]`
- `conditions[]`: field, operator (equals/not_equals/above/below/contains), value
- `actions[]`: type (send_email/send_whatsapp/move_stage/notify_recruiter/notify_admin), config
- `isActive`, `triggerCount`, `lastTriggeredAt`

---

## `plugins/softDeletePlugin.js` — Reusable soft-delete behavior
Think: "Instead of deleting data forever, just mark it as deleted"
- Adds `deletedAt` field to any model it's applied to
- Automatically filters out deleted records from all queries (unless `includeDeleted: true`)
- Methods: `softDelete()`, `restore()`

---

# 🛣️ BACKEND — ROUTES (API Endpoints)

## `auth.js` — Login, signup, token refresh
- `POST /api/auth/login` — email+password login → returns JWT access token + refresh token cookie
- `POST /api/auth/register` — create new account (with invite token flow)
- `POST /api/auth/refresh` — exchange refresh token for new access token
- `POST /api/auth/logout` — revoke refresh token
- `POST /api/auth/forgot-password` — send reset email
- `POST /api/auth/reset-password` — use token to set new password
- `POST /api/auth/google` — Google OAuth login
- `POST /api/auth/otp/send` — send OTP to email (passwordless login)
- `POST /api/auth/otp/verify` — verify OTP → login
- `POST /api/auth/2fa/enable` — enable 2FA
- `POST /api/auth/2fa/verify` — verify 2FA code

---

## `applications.js` — Job application management (1392 lines — biggest route)
- `GET /api/applications` — list all applications (with filters: tenantId, jobId, stage, candidate, date range)
- `POST /api/applications` — create new application
- `GET /api/applications/:id` — get single application with full details
- `PATCH /api/applications/:id` — update application (stage, notes, tags)
- `DELETE /api/applications/:id` — soft delete application
- `PATCH /api/applications/:id/stage` — move to a new pipeline stage
- `POST /api/applications/:id/interview` — schedule interview round
- `PATCH /api/applications/:id/interview/:roundIndex` — update interview details / add feedback
- `GET /api/applications/funnel` — conversion funnel stats (Applied → Hired)
- `GET /api/applications/source-breakdown` — where candidates came from
- `GET /api/applications/time-to-hire` — average days per stage
- `GET /api/applications/dropout-analysis` — where candidates drop off
- `POST /api/applications/:id/nps/send` — send NPS survey to candidate

---

## `jobs.js` — Job posting management (778 lines)
- `GET /api/jobs` — list all jobs (filters: status, tenant, recruiter, industry, urgency, search)
- `POST /api/jobs` — create new job
- `GET /api/jobs/:id` — get single job
- `PATCH /api/jobs/:id` — update job
- `DELETE /api/jobs/:id` — delete job
- `POST /api/jobs/:id/assign-recruiter` — assign recruiter to job
- `GET /api/jobs/public/:slug` — public career page job listing (no auth)
- `GET /api/jobs/public/org/:orgSlug` — get all public jobs for an org (used by embeddable widget)
- `POST /api/jobs/:id/approve` — approve job (admin/super_admin only)
- `POST /api/jobs/:id/reject` — reject with notes
- `GET /api/jobs/deduplicate` — detect near-duplicate job postings

---

## `candidates.js` — Candidate management (588 lines)
- `GET /api/candidates` — list candidates (with filters: skills, location, availability, industry, experience range, search)
- `POST /api/candidates` — manually add candidate
- `GET /api/candidates/:id` — get candidate profile
- `PATCH /api/candidates/:id` — update candidate
- `DELETE /api/candidates/:id` — soft delete
- `POST /api/candidates/bulk-import` — import from Excel
- `POST /api/candidates/merge` — merge two duplicate candidates
- `GET /api/candidates/:id/applications` — all applications by this candidate
- `POST /api/candidates/:id/apply` — apply candidate to a job

---

## `users.js` — User management (900 lines)
- `GET /api/users` — list users (filters by role, tenant, active, skills, location, etc.)
- `POST /api/users` — create user
- `GET /api/users/:id` — get user profile
- `PATCH /api/users/:id` — update user
- `DELETE /api/users/:id` — deactivate user
- `POST /api/users/invite-admin` — send admin invite email
- `POST /api/users/invite-recruiter` — send recruiter invite email
- `POST /api/users/resend-invite` — resend invite
- `GET /api/users/pending-invites` — list pending invites
- `PATCH /api/users/:id/profile-strength` — recalculate profile strength score

---

## `dashboard.js` — Analytics and KPI data (2431 lines — largest file)
- `GET /api/dashboard/stats` — main KPI cards (total jobs, candidates, applications, hires)
- `GET /api/dashboard/recruiter-leaderboard` — recruiter performance ranking
- `GET /api/dashboard/trends` — time-series data for charts
- `GET /api/dashboard/analytics` — detailed analytics breakdown
- `GET /api/dashboard/smart-alerts` — AI-generated insights (stale jobs, stuck candidates)
- `GET /api/dashboard/stage-time` — average time spent in each stage
- `GET /api/dashboard/offer-analytics` — offer acceptance/decline rates
- `GET /api/dashboard/source-effectiveness` — which source gives best hires
- `GET /api/dashboard/platform-stats` — super_admin platform-wide stats
- `GET /api/dashboard/platform-pulse` — activity feed for super_admin
- `GET /api/dashboard/revenue-health` — revenue metrics for super_admin

---

## `customizations.js` — Org customization CRUD
- `GET /api/customizations` — get full customizations doc for org
- `PATCH /api/customizations` — update singleton sections (emailSignature, fieldVisibility, brandColors, offerLetterTemplate)
- `POST /api/customizations/:section` — add item to a collection (pipelineStatuses, tags, etc.)
- `PATCH /api/customizations/:section/:id` — update one item
- `DELETE /api/customizations/:section/:id` — remove one item
- `PUT /api/customizations/:section` — replace entire section (for drag-drop reorder)
- **resolveOrgId**: super_admin can pass `?orgId=` to manage another org's customizations

---

## `customFields.js` — Custom field definitions and values
- `GET /api/custom-fields` — list all custom fields (filter by `?entity=candidate`)
- `POST /api/custom-fields` — create custom field
- `PATCH /api/custom-fields/:id` — update field (label, options, visibility)
- `DELETE /api/custom-fields/:id` — soft-deactivate field
- `PATCH /api/custom-fields/reorder/batch` — bulk reorder fields
- `GET /api/custom-fields/values/:entity/:recordId` — get all field values for a record
- `PUT /api/custom-fields/values/:entity/:recordId` — save all field values for a record (bulk upsert)

---

## Other Key Routes (Brief)

| Route File | What It Manages |
|------------|-----------------|
| `admin.js` | Admin-only actions, recruiter admin ops |
| `assessments.js` | Create/manage/submit assessments |
| `audit.js` | Read audit log (super_admin only) |
| `bgv.js` | Background verification document management |
| `billing.js` | Razorpay orders, webhook, plan upgrades |
| `blogs.js` | Blog CRUD (super_admin only for create/edit) |
| `calls.js` | Call history lookup |
| `candidateDocs.js` | Document upload (Cloudinary 10MB) + verification |
| `candidateRequests.js` | Staffing requests + 3-tier candidate suggestions |
| `candidateVideo.js` | Video resume upload (Cloudinary 100MB) |
| `clients.js` | Client company CRUD |
| `distribution.js` | Job distribution to external boards |
| `email.js` | Send emails, test SMTP |
| `feed.js` | Platform activity feed |
| `importedCandidates.js` | Bulk import management |
| `interest.js` | Candidate interest/decline tracking |
| `invites.js` | Job invite management |
| `jobAlerts.js` | Email alert subscriptions |
| `leads.js` | Sales leads from contact form |
| `messages.js` | Direct messages between users |
| `notifications.js` | In-app notification CRUD |
| `nps.js` | NPS survey submission |
| `offers.js` | Offer letter creation/sending/signing |
| `orgs.js` | Organization CRUD |
| `parseResume.js` | Resume parsing (PDF/DOCX → structured JSON via Gemini AI) |
| `pipelineTemplates.js` | Save/apply pipeline stage templates |
| `platform.js` | Platform-level stats for super_admin |
| `preboarding.js` | Pre-boarding checklist management |
| `presence.js` | Online/offline status |
| `push.js` | Browser push notification subscriptions |
| `recruiterAdmin.js` | Recruiter self-management |
| `social.js` | Social job sharing |
| `track.js` | Event tracking (job views, clicks) |
| `videoRooms.js` | Video room creation/management |
| `whatsapp.js` | WhatsApp send + inbound webhook |

---

# 🔧 BACKEND — MIDDLEWARE

## `auth.js` — JWT authentication
Think: "Is this request from a logged-in user?"
- Reads JWT from `Authorization: Bearer` header or `accessToken` cookie
- Verifies token, loads user from DB, attaches `req.user`
- `authenticate` — requires valid token
- `optionalAuth` — attaches user if token present, doesn't fail if not

## `rbac.js` — Role-Based Access Control
Think: "Is this user allowed to do this action?"
- `allowRoles(...roles)` — middleware factory, blocks non-matching roles
- Roles: super_admin > admin > recruiter > hiring_manager > client > candidate

## `tenantGuard.js`
Think: "Make sure this user belongs to a valid tenant"
- Checks `req.user.tenantId` or `req.user.orgId`
- Prevents cross-tenant data access

## `checkPlanLimits.js`
Think: "Has this org hit their job/recruiter/candidate limit?"
- Checks plan limits before creating resources
- Returns 403 with upgrade prompt if at limit

## `auditLogger.js`
Think: "Automatically log every sensitive action"
- Wraps routes to create AuditLog entries after successful requests

## `cache.js` — In-memory response cache
Think: "Cache frequent read queries for speed"
- Node.js Map-based cache with TTL
- Used for dashboard stats, public job listings

## `paginate.js` — Pagination helper
Think: "Don't return 10,000 records — return page 1 of 50"
- Reads `?page=&limit=` from query
- Adds `pagination` to response

## `sanitize.js` — Input sanitization
Think: "Remove dangerous HTML/JS from user input"
- Strips XSS vectors from request body

## `validate.js` — Request body validation
Think: "Check required fields are present before running route logic"

## `errorMiddleware.js` — Global error handler
Think: "Catch any unhandled errors, return clean JSON error response"

## `safeError.js` — Safe error messages
Think: "Never leak internal stack traces to API responses in production"

## `logger.js` — HTTP request logging
Think: "Log every API request with method, path, status, response time"

## `agencyOnly.js` — Staffing agency guard
Think: "Only staffing/recruitment agencies can access these routes"

## `ownershipGuard.js` — Record ownership check
Think: "You can only edit YOUR own records, not someone else's"

---

# ⚙️ BACKEND — SERVICES

## `auth.service.js`
- `registerUser()` — full user creation flow
- `loginUser()` — validate + token generation
- `refreshAccessToken()` — refresh token flow

## `job.service.js`
- `createJob()` — job creation with plan limit checks
- `distributeJob()` — sends job to external platforms

## `social.service.js`
- `shareJobToLinkedIn()`, `shareJobToTwitter()` etc.

## `user.service.js`
- `inviteUser()` — sends invite email with token
- `activateAccount()` — sets password from invite

## `workflowEngine.js` — Automation runner
Think: "When an event happens, check all workflow rules and fire matching actions"
- `triggerWorkflow(event, data, tenantId)` — main entry
- Finds all active WorkflowRules for tenant matching the event
- Evaluates conditions
- Runs actions: send_email, send_whatsapp, move_stage, notify_recruiter, notify_admin

---

# 🔌 BACKEND — SOCKET (Real-time)

## `index.js` — Socket.io setup
- Authenticates socket connections with JWT
- Routes events to chat/call/video handlers

## `chatSocket.js` — Real-time messaging
- Join/leave conversation rooms
- Send/receive messages with read receipts
- Typing indicators

## `callSocket.js` — VoIP call signaling
- Ring/answer/decline/hang up events
- WebRTC offer/answer/ICE exchange for peer-to-peer audio/video

## `videoSocket.js` — Video interview room
- Join/leave room events
- Participant sync
- Recording start/stop
- Screen share signals

---

# ⏱️ BACKEND — CRON JOBS (Scheduled Tasks)

| File | What It Does | When |
|------|-------------|------|
| `jobAlertCron.js` | Sends daily/weekly job alert emails to subscribers | Every day at 8am + every Monday |
| `npsScheduler.js` | Sends NPS survey emails 7 days after hire/rejection | Every hour |
| `preboardingCron.js` | Sends reminder emails for pending preboarding tasks | Every day at 9am |
| `slaMonitor.js` | Detects candidates stuck in stages too long → triggers alerts | Every hour |
| `weeklyReport.js` | Sends weekly hiring summary email to admins | Every Monday 7am |
| `distributionRetry.js` | Retries failed job distributions to external boards | Every 30 minutes |

---

# 🛠️ BACKEND — UTILS

| File | Purpose |
|------|---------|
| `email.js` | Send emails via Resend API or SMTP (nodemailer) |
| `emailTemplates.js` | All HTML email templates (invite, offer, interview, rejection, NPS, etc.) |
| `resumeParser.js` | Parse PDF/DOCX resumes → structured JSON (using pdf-parse, mammoth, Gemini AI) |
| `candidateMatchingEngine.js` | Score candidate vs job (skills overlap, experience, location, notice period) |
| `matchScore.js` | Calculate numeric match percentage (0-100) |
| `techOntology.js` | Map of tech synonyms (React=ReactJS, Node=NodeJS, etc.) for smarter matching |
| `classifyJob.js` | Auto-classify job industry/department from title/description |
| `exportToExcel.js` | Generate Excel file from data (for download reports) |
| `generateInvoice.js` | Create PDF invoice for payments (pdfkit) |
| `inviteToken.js` | Generate/validate secure invite tokens |
| `normalize.js` | Normalize strings for search (lowercase, trim, remove special chars) |
| `notifySuperAdmins.js` | Send in-app notification to all super_admins |
| `search.js` | Full-text search helpers (MongoDB text index + regex) |
| `sendPush.js` | Send browser push notification (web-push) |
| `sendSms.js` | Send SMS via Twilio |
| `sendWhatsApp.js` | Send WhatsApp via Twilio API |
| `syncProfile.js` | Sync User model fields to Candidate model (keep both in sync) |
| `AppError.js` | Custom error class with status code |
| `asyncHandler.js` | Wrap async route handlers to auto-catch errors |

---

# 📦 BACKEND — CONFIG

## `plans.js` — Subscription plan definitions
Think: "What does each plan include?"
- Plans: free, trial, starter, basic, growth, pro, agency, enterprise
- Each plan has: maxJobs, maxRecruiters, maxCandidates, features[], price

## `financials.js` — Pricing and revenue config
Think: "Platform revenue calculations, commission rates"
- Platform fee percentages, referral rates

## `swagger.js` — API documentation setup
Think: "Auto-generate API docs at /api-docs"
- Swagger UI config with JWT bearer auth

---

# ⚛️ FRONTEND — MAIN ENTRY FILES

## `src/main.jsx` — App bootstrap
Think: "The first file that runs when the app loads"
- Creates React root, renders `<App />`
- Registers service worker for PWA

## `src/App.jsx` — Router setup (653 lines)
Think: "The map of every URL → which screen to show"
- React Router v6 with `createBrowserRouter`
- Protected routes check auth (redirect to `/login` if not logged in)
- Role-based route rendering (super_admin sees different routes than candidate)
- Code-split lazy imports for each page (fast loading)
- Routes organized by role group

## `src/layout/Layout.jsx` — Main app shell (914 lines)
Think: "The sidebar, top bar, and content area wrapper that every logged-in page sits inside"
- Sidebar with role-based navigation links
- Mobile hamburger menu
- Notification bell (fetches unread count)
- User avatar + logout
- Real-time Socket.io connection (for presence, chat, calls)
- `CallManager` integration (handles incoming calls)
- Online presence heartbeat
- Push notification subscription on login

---

# 🌐 FRONTEND — API LAYER

## `src/api/client.js` — Axios instance
Think: "All API calls go through this — it adds the auth header automatically"
- Base URL from `VITE_API_URL` env variable
- Adds `Authorization: Bearer <token>` to every request
- Auto-refreshes token on 401 responses
- Stores token in localStorage

## `src/api/config.js` — API base URL
Think: "Which backend URL to point to"
- Reads `VITE_API_URL` from environment

## `src/api/api.js` — All API functions
Think: "The complete library of every API call the frontend makes"
- One function per API endpoint
- Used everywhere in the app as `api.functionName(params)`
- Examples: `api.getJobs()`, `api.createApplication()`, `api.updateStage()`

## `src/api/matching.js` — AI matching helpers
Think: "Calls the matching endpoints for job-candidate scoring"

## `src/api/services/` — Feature-specific service wrappers
- `auth.service.js` — login, register, OTP
- `application.service.js` — application CRUD
- `job.service.js` — job CRUD
- `user.service.js` — user CRUD
- `dashboard.service.js` — analytics API calls
- `blog.service.js` — blog CRUD
- `call.service.js` — call history
- `videoRoom.service.js` — video room management
- `importedCandidate.service.js` — bulk import
- `platform.service.js` — platform-level stats

---

# 📐 FRONTEND — CONSTANTS

## `src/constants/stages.js` — Pipeline stage definitions
Think: "The fixed list of hiring stages used everywhere"
- Default stages: applied → screening → shortlisted → interview_scheduled → interview_completed → offer_extended → selected
- Terminal stages: rejected, withdrawn
- Colors and labels for each stage

## `src/constants/picklists.js` — Dropdown option lists
Think: "All the dropdown options used across forms"
- Industries, departments, job types, experience levels, availability statuses, notice periods, CTC ranges, certifications, etc.
- India-specific: states, cities

## `src/constants/styles.js` — Shared CSS values
Think: "Tokens for colors, spacing, fonts used in inline styles"

---

# 📄 FRONTEND — PAGES

## AUTH PAGES

### `src/pages/auth/AuthScreen.jsx` (1557 lines)
Think: "The login/signup screen"
- **Modes**: login, register (candidate), forgot-password, reset-password, OTP login
- **Login flow**: email+password → JWT → redirect by role
- **OTP flow**: enter email → OTP sent → verify → login (passwordless)
- **Google OAuth**: one-click login
- **Register flow**: candidate self-registration with full form
  - Name, email, phone, password (with confirm + eye toggle)
  - Industry, department dropdowns (auto-populated from picklists)
  - Skills, location
  - Applied to a job? Can pick from open jobs and add cover letter
- **Invite flow**: arriving from invite link pre-fills candidate name + email

### `src/pages/auth/SetPasswordPage.jsx`
Think: "First login — set your password from invite"
- Token from URL, shows password + confirm fields

---

## ADMIN PAGES

### `src/pages/admin/AdminUsers.jsx` (1377 lines)
Think: "Manage every person in the system"
- Tabs: Candidates | Admins/Recruiters | Pending Invites
- **Candidate tab**: full filter panel (skills, location, industry, experience, CTC, availability, client, TA, job role, certifications), bulk select, assign to job, invite, merge duplicates
- **Staff tab**: create/edit admins and recruiters, invite by email
- **CandidatePipelinePanel**: right-side drawer showing candidate's all applications
- **RecruiterActivityPanel**: recruiter's assigned jobs and candidate pipeline

### `src/pages/admin/AdminJobs.jsx` (899 lines)
Think: "Manage all job postings"
- Create/edit/delete jobs, Kanban board view
- Filters: status, urgency, location, recruiter
- Bulk recruiter/candidate assignment
- Job deduplication/merging
- Career page listing preview

### `src/pages/admin/AdminPipeline.jsx` (299 lines)
Think: "Drag-and-drop Kanban for the hiring pipeline"
- All applications in columns by stage
- Drag card to move stage
- Interview scheduling inline
- Offer confirmation flow

### `src/pages/admin/AdminAnalytics.jsx` (1585 lines)
Think: "Analytics command center with charts and KPIs"
- KPI cards: total jobs, candidates, applications, hires, conversion rate
- Charts: area chart (trends), donut (source breakdown), funnel (pipeline), bar (recruiter performance)
- Recruiter leaderboard
- World map (candidate geography)
- Platform Pulse (activity feed)
- Job deduplication report

### `src/pages/admin/AdminInsights.jsx` (332 lines)
Think: "Smart alerts and recommendations"
- Smart alerts: stale jobs, stuck candidates, unsigned offers
- Stage bottleneck analysis
- Offer analytics
- Source effectiveness

### `src/pages/admin/AdminOnboarding.jsx` (700 lines)
Think: "Manage pre-boarding for new hires"
- List of hired candidates pending onboarding
- Create preboarding checklists
- Task management (document collection, training, IT setup)
- Document verification workflow
- Welcome kit sending

### `src/pages/admin/AdminAutomation.jsx` (411 lines)
Think: "Drag-and-drop workflow automation rules"
- Create rules: trigger + conditions + actions
- Toggle rules on/off
- View execution count and last triggered time

### `src/pages/admin/AdminCustomFields.jsx` (262 lines)
Think: "Add extra fields to forms"
- Create/edit/delete custom fields per entity
- Enable/disable fields

### `src/pages/admin/OrgSettings.jsx` (604 lines)
Think: "Company profile + pipeline config + email settings"
- **Org Profile**: name, domain, industry, size + logo upload
- **Org Chart**: visual team hierarchy (admins → recruiters → hiring managers)
- **Pipeline Stages**: add/remove/reorder stages, save as template, apply preset
- **Email Settings**: from name/email, SMTP/Resend config, brand colors, preview emails live
- **SAVES TO**: `Organization.settings` via `api.updateOrg()`

### Other Admin Pages

| Page | Purpose |
|------|---------|
| `AdminJobApproval.jsx` | Review pending jobs, approve/reject with notes |
| `AdminClients.jsx` | Manage client companies |
| `AdminCandidateRequest.jsx` | View/manage staffing requests |
| `ContactLeads.jsx` | View contact form leads |
| `JobDistribution.jsx` | Monitor external board distribution |
| `OrgChart.jsx` | Visual org hierarchy chart |
| `OutreachTracker.jsx` | Track candidate outreach history |

---

## SUPERADMIN PAGES

### `src/pages/superadmin/SuperAdminCustomizations.jsx` (1410 lines)
Think: "THE platform customization hub — full control over every org's settings"
Tabs:
- **Custom Fields**: Create fields for candidate/job/application/interview forms + toggle system field visibility
- **Automations**: Create/manage workflow rules
- **Pipeline Statuses**: Add stages with names + colors, reset to defaults
- **Custom Tags**: Org-wide labels by category
- **Rejection Reasons**: Standard decline options
- **Score Cards**: Interview evaluation templates
- **Document Types**: What documents to collect
- **Question Bank**: Interview question library
- **Email Signature**: Footer on all emails
- **Notification Messages**: Customize messages per stage
- **Field Visibility**: 10 visibility toggles (salary, recruiter name, company name, etc.)
- **Offer Variables**: `{{VARIABLE_NAME}}` merge fields for offer letters
- **Offer Letter Template**: Full offer letter text editing (8 sections)
- **Departments / Locations / Sources**: Dropdown options used across forms
- **SAVES TO**: `OrgCustomizations` collection via `/api/customizations`

### Other SuperAdmin Pages

| Page | Purpose |
|------|---------|
| `SuperAdminOrgs.jsx` | List/manage all organizations |
| `CreateOrganisationPage.jsx` | Create new org/tenant |
| `SuperAdminCandidates.jsx` | Platform-wide candidate database |
| `SuperAdminPlatform.jsx` | Platform health, revenue, KPIs |
| `SuperAdminAuditLogs.jsx` | System-wide audit trail |
| `SuperAdminBgvTracker.jsx` | Background verification monitoring |
| `SuperAdminBlogs.jsx` | Blog post management |
| `SuperAdminCandidateImport.jsx` | Bulk candidate import tool |
| `SuperAdminCandidateRequests.jsx` | Staffing requests management |
| `SuperAdminPermissions.jsx` | Role permission management |
| `SuperAdminSecurity.jsx` | Platform security settings |
| `SuperAdminPlaybooks.jsx` | View/manage playbook documents |
| `SuperAdminUnregisteredCandidates.jsx` | Track unregistered/imported candidates |

---

## RECRUITER PAGES

### `src/pages/recruiter/RecruiterDashboard.jsx` (490 lines)
Think: "Recruiter's home screen — their pipeline at a glance"
- KPIs: active jobs, candidates, interviews today, hires this month
- Assigned jobs list
- Recent applications feed
- Upcoming interviews

### `src/pages/recruiter/RecruiterCandidates.jsx` (751 lines)
Think: "Recruiter's candidate database"
- Filter: skills, location, availability, experience
- Add candidate form
- Assign to job
- Invite to platform
- View resume, contact log

### `src/pages/recruiter/RecruiterPipeline.jsx` (904 lines)
Think: "The main Kanban board for recruiter"
- Cards grouped by job → stage columns
- Move candidates between stages
- Schedule interviews
- View/add notes

### Other Recruiter Pages

| Page | Purpose |
|------|---------|
| `RecruiterJobs.jsx` | Recruiter's assigned jobs list |
| `RecruiterInterviews.jsx` | Upcoming/past interviews |
| `RecruiterAssessments.jsx` | Manage assessments for jobs |
| `RecruiterOffers.jsx` | Track offer letters |
| `RecruiterAIMatch.jsx` | AI-powered job-candidate matching |
| `RecruiterTalentMatch.jsx` | Manual talent matching tools |
| `TalentPool.jsx` | Recruiter's saved/starred candidates |
| `AssessmentReviewPage.jsx` | Review submitted assessments |
| `CandidateRejectionPage.jsx` | Process rejection with reason |
| `GenerateOfferPage.jsx` | Create offer letter |
| `ScheduleInterviewPage.jsx` | Schedule interview round |

---

## CANDIDATE PAGES

### `src/pages/candidate/CandidateDashboard.jsx`
Think: "Candidate's home — see your applications and what's next"
- Profile completion banner (show missing fields)
- Location permission request (for job matching)
- Application status cards
- Next interview countdown
- Matched job suggestions

### `src/pages/candidate/CandidateProfile.jsx`
Think: "Edit your full profile"
- 8 tabs: Personal | Summary | Work History | Education | Skills | Extras | Video Resume | Resume
- Work History editor (company, role, duration, description)
- Education editor
- Skills chips
- Video resume recording (60 second, camera + mic)
- Resume PDF upload

### `src/pages/candidate/CandidateApplications.jsx`
Think: "See all your job applications and where they are"
- 8-stage stepper (Applied → Selected)
- Date tracking per stage
- Interview details
- Assessment status
- Rejection reason/feedback
- Offer information

### `src/pages/candidate/CandidateAssessment.jsx`
Think: "Take a timed test for a job application"
- Fullscreen required (anti-cheat)
- Tab-switch detection (max 3 violations → auto-submit)
- Question types: MCQ single, MCQ multi, text, code
- Timer countdown
- Question navigator
- Auto-submit on time up

### `src/pages/candidate/CandidateOffer.jsx`
Think: "View and sign your offer letter"
- Shows offer details (designation, CTC, joining date)
- E-signature via typed name
- Document locker (13-doc checklist)
- Download signed PDF

### `src/pages/candidate/CandidateBackgroundVerification.jsx`
Think: "Upload documents for background check"
- 11 document types with upload UI
- Verification status per document
- Preview uploaded documents
- Progress bar toward "TalentNest Verified" badge

### Other Candidate Pages

| Page | Purpose |
|------|---------|
| `CandidateExploreJobs.jsx` | Browse and apply to jobs |
| `CandidateJobAlerts.jsx` | Manage email job alert subscriptions |
| `CandidateJobMatch.jsx` | View jobs matched to your profile |
| `CandidateAIMatch.jsx` | AI-powered job matching |
| `CandidateOnboarding.jsx` | Pre-boarding checklist |
| `ResumeBuilder.jsx` | Build a resume with 3 templates |

---

## CAREERS (PUBLIC) PAGES

### `src/pages/careers/CareersPage.jsx`
Think: "Public job board — anyone can browse jobs without logging in"
- Search jobs (text, location, type)
- Job cards with apply buttons
- `PublicApplyModal` for quick apply

### `src/pages/careers/JobDetailPage.jsx`
Think: "Full job details page at /jobs/:slug"
- Full job description, requirements, skills
- Apply button → modal or redirect

### `src/pages/careers/OrgCareersPage.jsx`
Think: "Company-specific careers page at /careers/:orgSlug"
- Branded with company logo/color
- Only shows that company's jobs

---

## SHARED PAGES (Multiple roles)

| Page | Purpose |
|------|---------|
| `ProfilePage.jsx` | Edit own profile |
| `CreateJobPage.jsx` | Create/edit job posting form |
| `ApplicantsRecordsPage.jsx` | All applicants for a specific job |
| `AssignedCandidates.jsx` | Candidates assigned to this recruiter |
| `InviteCandidatePage.jsx` | Send job invite to candidate |
| `ResumeViewPage.jsx` | Full-page resume viewer |
| `FormsHub.jsx` | All forms in one place |
| `ProvisionUserPage.jsx` | Create/provision a user account |
| `ChangePasswordPage.jsx` | Change own password |
| `EmailSettingsPage.jsx` | Email preferences |
| `SecuritySettingsPage.jsx` | 2FA, active sessions |

---

## CLIENT PAGES

| Page | Purpose |
|------|---------|
| `ClientDashboard.jsx` | Client's overview: placements, shortlists |
| `ClientShortlists.jsx` | Review candidates shortlisted for them |
| `ClientInterviews.jsx` | Upcoming interviews with agency candidates |
| `ClientPlacements.jsx` | Placed candidates history |

---

## MEETING PAGES

### `src/pages/meeting/MeetingRoom.jsx`
Think: "The actual video interview room (like a lightweight Zoom)"
- WebRTC peer-to-peer video/audio
- In-room chat
- Screen sharing
- Participant list
- Timer

### `src/pages/meeting/GuestJoin.jsx`
Think: "Join as guest without login (client, external interviewer)"
- Token-based access from invite link

---

## PUBLIC RESPONSE PAGES

| Page | Purpose |
|------|---------|
| `InviteResponsePage.jsx` | Candidate responds to job invite (interested/not interested) |
| `InterestConfirmedPage.jsx` | Thank you page after confirming interest |
| `InterestDeclinedPage.jsx` | Thank you page after declining |

---

## MARKETING PAGES (Public website)

| Page | Purpose |
|------|---------|
| `LandingPage.jsx` | Homepage with hero, features, testimonials |
| `AboutPage.jsx` | Company story, team, mission |
| `ProductsPage.jsx` | All product overview |
| `ProductHireBoard.jsx` | HireBoard product detail |
| `ProductJobTrack.jsx` | JobTrack product detail |
| `ProductPeopleDesk.jsx` | PeopleDesk HRMS product detail |
| `HRMSPage.jsx` | HRMS module overview |
| `ServicesPage.jsx` | Staffing services |
| `ServiceDetailPage.jsx` | Individual service detail |
| `CompaniesPage.jsx` | Clients/companies page |
| `BlogPage.jsx` | Blog index listing |
| `BlogPostPage.jsx` | Single blog post |
| `ContactPage.jsx` | Contact form + office info |
| `PrivacyPage.jsx` | Privacy policy |
| `TermsPage.jsx` | Terms of service |
| `MarketingNav.jsx` | Top navigation for marketing site |
| `MarketingFooter.jsx` | Footer for marketing site |

---

# 🧩 FRONTEND — COMPONENTS

## Charts
| Component | What It Renders |
|-----------|----------------|
| `AreaChart.jsx` | Line/area chart (trend over time) |
| `DonutChart.jsx` | Donut/pie chart (source breakdown, etc.) |
| `FunnelChart.jsx` | Hiring funnel visualization (applied→hired) |
| `HorizBar.jsx` | Horizontal bar chart (comparisons) |
| `KpiCard.jsx` | Single metric card with trend arrow |
| `MiniSparkline.jsx` | Tiny inline trend line |
| `RingProgress.jsx` | SVG circular progress ring |
| `VertBarChart.jsx` | Vertical bar chart |
| `WorldMap.jsx` | Leaflet world map with candidate pins |

## Modals
| Component | Purpose |
|-----------|---------|
| `InterviewModal.jsx` | Schedule/reschedule interview |
| `OfferLetterModal.jsx` | Create/preview offer letter |
| `RejectModal.jsx` | Reject with reason + custom message |
| `HiredDetailsModal.jsx` | Confirm hire: joining date, salary |
| `PublicApplyModal.jsx` | Quick apply from public job board |
| `CandidateMergeWizard.jsx` | Step-by-step merge of two duplicate candidates |
| `CareerListingModal.jsx` | Preview how job appears on career page |
| `PlatformPresentationModal.jsx` | Demo presentation of platform features |

## Pipeline
| Component | Purpose |
|-----------|---------|
| `StageTracker.jsx` | Visual pipeline stage progress bar |
| `StageHistory.jsx` | Audit trail of all stage moves |

## Shared
| Component | Purpose |
|-----------|---------|
| `AddCandidateForm.jsx` | Form to manually add a candidate |
| `ChatPanel.jsx` | Real-time direct message panel |
| `MessageInbox.jsx` | Full message inbox |
| `MessageModal.jsx` | Quick message composer |
| `InviteModal.jsx` | Send job invite to candidate |
| `BulkWhatsAppModal.jsx` | Send WhatsApp to multiple candidates |
| `PostJobForm.jsx` | Full job posting form |
| `JobDetailDrawer.jsx` | Right-side job detail panel |
| `UserDetailDrawer.jsx` | Right-side candidate/user profile panel |
| `ResumeCard.jsx` | Resume preview card |
| `ShareJobModal.jsx` | Share job to social/copy link |
| `OnlinePanel.jsx` | Online users list |
| `PresenceBadge.jsx` | Green/yellow dot showing user online status |
| `SecuritySettings.jsx` | 2FA, session management UI |
| `EmailSettingsModal.jsx` | Quick email config modal |
| `ChangePasswordModal.jsx` | Password change dialog |
| `ErrorReportBoundary.jsx` | React Error Boundary with report UI |
| `TrendCard.jsx` | Metric card with up/down trend |
| `JobRecruiterHistory.jsx` | Audit trail of recruiter assignments |

## Assessments
| Component | Purpose |
|-----------|---------|
| `AssessmentBuilder.jsx` | Create/edit assessment questions |
| `AssessmentReviewModal.jsx` | Review a submission, add score/notes |

## Calling
- `CallManager.jsx` — Manages incoming/outgoing VoIP calls, handles WebRTC setup, shows call UI overlay

## Candidate
- `JobAlertsManager.jsx` — Manage job alert subscriptions

## Misc
| Component | Purpose |
|-----------|---------|
| `ActivityDot.jsx` | Animated dot for live activity feed |
| `InterviewCountdown.jsx` | "Interview in X hours" countdown |
| `TimeAgo.jsx` | "3 days ago" relative time display |

## UI Primitives
| Component | Purpose |
|-----------|---------|
| `Badge.jsx` | Status/label badge chip |
| `CapLimitBanner.jsx` | "You've hit your plan limit" banner |
| `Dropdown.jsx` | Custom dropdown menu |
| `Field.jsx` | Form field wrapper (label + input + validation) |
| `FormRow.jsx` | 2/3 column form grid row |
| `Modal.jsx` | Base modal dialog wrapper |
| `OnlineDot.jsx` | Green presence indicator dot |
| `PageHeader.jsx` | Page title + action buttons row |
| `QuickActionMenu.jsx` | Floating quick action menu |
| `Skeleton.jsx` | Loading skeleton placeholder |
| `Spinner.jsx` | Loading spinner |
| `Toast.jsx` | Auto-dismiss notification (success/error) |
| `Toggle.jsx` | iOS-style on/off toggle |
| `UploadZone.jsx` | Drag-and-drop file upload area |

---

# 🪝 FRONTEND — HOOKS

| Hook | Purpose |
|------|---------|
| `useDebounce.js` | Delay search input queries (300ms wait) |
| `useHeartbeat.js` | Ping server every 30s to maintain presence |
| `usePresence.js` | Track online/offline status of users |
| `usePushNotifications.js` | Subscribe to browser push notifications |
| `useWebRTC.js` | WebRTC setup for video calls |

---

# 🖼️ FRONTEND — CONTEXT

| Context | Purpose |
|---------|---------|
| `LogoContext.jsx` | Stores org logo URL, shared across app so header/emails use it |
| `MarketingThemeContext.jsx` | Dark/light/mixed theme for marketing pages |

---

# ⚙️ FRONTEND — UTILS

| File | Purpose |
|------|---------|
| `apiUtils.js` | Axios error formatting, response unwrapping |
| `audit.js` | Frontend audit event logging helpers |
| `fileParser.js` | Parse files for preview (read PDF, DOCX, images) |
| `geolocation.js` | Get user's lat/lng from browser API |
| `india.js` | India-specific data (states, cities, pincodes) |
| `url.js` | URL manipulation helpers (slugify, parse) |

## `src/workers/xlsxWorker.js`
Think: "Parse Excel files in the background so it doesn't freeze the browser"
- Web Worker that processes XLSX/CSV files off the main thread
- Returns parsed rows as array of objects

---

# 🌍 PUBLIC FILES

| File | Purpose |
|------|---------|
| `sw.js` | Service Worker — caches app for offline use, handles push notifications |
| `manifest.json` | PWA manifest — app name, icons, theme, standalone mode |
| `robots.txt` | Allow SEO bots, allow AI crawlers, block /app/ and /api/ |
| `sitemap.xml` | Index sitemap pointing to pages + jobs sitemaps |
| `sitemap-pages.xml` | Static pages sitemap |
| `sitemap-jobs.xml` | Jobs sitemap (dynamic) |
| `widget.js` | Embeddable job board widget for partner sites |
| `marketing-main.js` | Marketing page interactivity (animations, carousel, hamburger menu) |
| `offline.html` | Offline fallback page |

---

# 📦 CONFIG FILES

| File | Purpose |
|------|---------|
| `vite.config.js` | Vite build config — code splitting by role, vendor chunks, no source maps in prod |
| `package.json` | Frontend deps: React 18, React Router 6, Socket.io, xlsx, pdfjs, Leaflet |
| `backend/package.json` | Backend deps: Express, Mongoose, JWT, bcrypt, Socket.io, Razorpay, Resend, Cloudinary, Winston |
| `render.yaml` | Render.com deployment config |
| `backend/railway.toml` | Railway deployment (marked redundant — use root railway.toml) |
| `.env.example` | Frontend env vars: VITE_API_URL, VITE_GOOGLE_CLIENT_ID |
| `backend/.env.example` | Backend env vars: PORT, MONGODB_URI, JWT_SECRET, RESEND_API_KEY, GEMINI_API_KEY, CLOUDINARY, RAZORPAY, VAPID |

---

---
---

# 🚨 BUG REPORT + CUSTOMIZATION AUDIT

## ⚠️ CRITICAL BUG #1 — Two Separate Pipeline Stage Systems (Not Synced)

**Problem**: Pipeline stages are stored in TWO places and NEVER read from each other:

| Where Saved | How It's Saved | Model/Field |
|------------|----------------|-------------|
| `OrgSettings.jsx` (Admin) | `api.updateOrg(id, { settings: { pipelineStages: stages } })` | `Organization.settings.pipelineStages` (simple string array like `['applied','screening']`) |
| `SuperAdminCustomizations.jsx` (SuperAdmin) | `api.addCustomizationItem('pipelineStatuses', {name, color, order})` | `OrgCustomizations.pipelineStatuses` (array of objects with name, color, order) |

**Impact**: Admin creates a custom stage "Technical Round" in OrgSettings → it saves to `Organization.settings.pipelineStages`. SuperAdmin creates the same in Customizations → it goes to `OrgCustomizations.pipelineStatuses`. The actual pipeline (RecruiterPipeline, AdminPipeline) reads from `src/constants/stages.js` which has HARDCODED stages. **None of these are connected.**

**Fix needed**: Unify to one source. The Application model's `currentStage` needs to validate against org's custom stages. The pipeline Kanban needs to read from the same place.

---

## ⚠️ CRITICAL BUG #2 — Field Visibility Not Applied To Forms

**Problem**: The `fieldVisibility` map is stored in `OrgCustomizations` (via SuperAdminCustomizations), but the actual forms that render candidate/job/application fields **do not fetch or check this map**.

- `AddCandidateForm.jsx` — hardcodes its fields
- `PostJobForm.jsx` — hardcodes its fields
- Interview scheduling forms — hardcoded
- Candidate profile `CandidateProfile.jsx` — hardcodes tabs/fields

The toggle in SuperAdminCustomizations that shows "Visible/Hidden" for each field does nothing on the forms — the setting is saved to DB but never READ by the components that render those forms.

**Fix needed**: Each form needs to call `GET /api/customizations` on load and filter/show/hide fields based on `fieldVisibility` map. System fields need their `key` matched against the visibility map.

---

## ⚠️ CRITICAL BUG #3 — Custom Field Values Not Shown on Candidate/Job Profiles

**Problem**: Custom fields created in `AdminCustomFields.jsx` (or SuperAdminCustomizations CustomFieldsTab) are saved to `CustomFieldDefinition`. Values can be saved via `PUT /api/custom-fields/values/:entity/:recordId`. BUT:

- The `UserDetailDrawer.jsx` (main candidate profile panel) does NOT fetch or show custom field values
- The `AddCandidateForm.jsx` does NOT include custom fields in its form
- The job detail views do NOT show job custom fields

**Impact**: You can create custom fields but they're invisible on the actual profile pages.

**Fix needed**: Load `GET /api/custom-fields/values/candidate/:id` in UserDetailDrawer and AddCandidateForm, render custom field inputs dynamically.

---

## ⚠️ BUG #4 — Email Settings Saved to Wrong Model

**Problem**: `OrgSettings.jsx` saves email settings to `Organization.settings.emailSettings` via `api.updateOrg()`. The `Organization` model has a `settings.emailSettings` object. BUT the backend email sender (`src/utils/email.js`) reads email config from **environment variables** (`RESEND_API_KEY`, `SMTP_HOST`, etc.) NOT from the database.

**Impact**: Admin configures their custom email provider/branding in OrgSettings → it's saved to MongoDB → but emails still go out via the system Resend account, ignoring their settings.

**Fix needed**: The email utility needs to look up the org's saved `emailSettings` from the Organization/Tenant document when sending tenant-specific emails, falling back to system config.

---

## ⚠️ BUG #5 — Departments/Locations/Sources Created in Customizations Don't Populate Form Dropdowns

**Problem**: SuperAdminCustomizations has tabs for Departments, Locations, Sources. These are saved to `OrgCustomizations.departments[]`, `OrgCustomizations.locations[]`, `OrgCustomizations.sources[]`. But the Job form (`PostJobForm.jsx`), Candidate form, and other forms use the **hardcoded** `src/constants/picklists.js` for dropdown options.

**Impact**: Admin adds "Engineering" to their departments list → it never appears in the Department dropdown on the job posting form.

**Fix needed**: The PostJobForm, AddCandidateForm, and CreateJobPage should call `GET /api/customizations` on load and merge org-specific departments/locations/sources into their dropdown options.

---

## ⚠️ BUG #6 — OrgCustomizations `orgId` vs `tenantId` Mismatch

**Problem**: `OrgCustomizations.js` has `orgId` pointing to `Organization` (the OLD model). But most new users are on the `Tenant` model. The `resolveOrgId` function in `customizations.js` does:
```js
return req.query.orgId || req.user.tenantId || req.user.orgId;
```
This WILL work — it falls back to `tenantId`. But `OrgCustomizations.orgId` is defined as `{ type: Schema.Types.ObjectId, ref: 'Organization' }` which means the ref validation expects an `Organization` document, but the actual value stored is a `Tenant` ID.

**Impact**: Mongoose population of `orgId` would fail, but since we never populate it, it works. Low risk but technically incorrect.

---

## ⚠️ BUG #7 — Offer Letter Template Not Connected to Offer Letter Generator

**Problem**: SuperAdminCustomizations allows editing the full offer letter template (intro, compensation, joining, terms, closing, footer). This is saved to `OrgCustomizations.offerLetterTemplate`. But `backend/src/utils/generateInvoice.js` and the offers route likely use hardcoded templates or `OrgCustomizations.offerLetterTemplate` defaults — need to verify the offers route reads from the DB template.

**Recommendation**: Verify `backend/src/routes/offers.js` fetches `OrgCustomizations.getOrCreate(tenantId)` and uses `.offerLetterTemplate` when generating PDFs.

---

## ⚠️ BUG #8 — Brand Colors in Customizations Not Applied to UI

**Problem**: `OrgCustomizations.brandColors` stores primary/secondary/accent/bg colors. These are saved but no frontend CSS variable injection happens to apply them. The app uses hardcoded `#0176D3` and `#032D60` everywhere.

**Fix needed**: On app load (after auth), fetch org customizations and inject brand colors as CSS variables:
```js
document.documentElement.style.setProperty('--tn-primary', brandColors.primary);
```

---

## ✅ WHAT'S WORKING CORRECTLY

- Pipeline stage movement (using hardcoded constants) ✅
- Custom field definitions CRUD (create/edit/delete/toggle) ✅
- Custom field VALUES API (GET/PUT values per record) ✅
- Automation/workflow rules (create/toggle/delete, workflowEngine triggers) ✅
- Score cards saved/displayed ✅
- Rejection reasons saved/displayed in RejectModal ✅
- Tags saved ✅
- Email signature saved ✅
- NPS surveys ✅
- Pre-boarding checklists ✅
- Document verification ✅
- Job invites ✅
- Assessment anti-cheat ✅

---

## 🎯 CUSTOMIZATION COMPLETENESS AUDIT

| Customization | Where Saved | Where Used in UI | Gap? |
|--------------|-------------|-----------------|------|
| Pipeline stages (OrgSettings) | Organization.settings.pipelineStages | Nowhere | ❌ Not used |
| Pipeline statuses (SuperAdmin) | OrgCustomizations.pipelineStatuses | Nowhere in pipeline | ❌ Not used |
| Custom fields | CustomFieldDefinition | NOT in AddCandidateForm, PostJobForm | ❌ Not shown |
| Field visibility | OrgCustomizations.fieldVisibility | NOT applied to forms | ❌ Not enforced |
| Departments | OrgCustomizations.departments | NOT in job/candidate dropdowns | ❌ Not shown |
| Locations | OrgCustomizations.locations | NOT in dropdowns | ❌ Not shown |
| Sources | OrgCustomizations.sources | NOT in dropdowns | ❌ Not shown |
| Tags | OrgCustomizations.tags | RecruiterCandidates (partial) | ⚠️ Partial |
| Rejection reasons | OrgCustomizations.rejectionReasons | RejectModal (but uses hardcoded list) | ⚠️ Unclear |
| Score cards | OrgCustomizations.scoreCards | Interview modal (needs check) | ⚠️ Unclear |
| Email signature | OrgCustomizations.emailSignature | Email templates (needs check) | ⚠️ Unclear |
| Brand colors | OrgCustomizations.brandColors | NOT injected to CSS | ❌ Not applied |
| Offer letter template | OrgCustomizations.offerLetterTemplate | GenerateOfferPage (needs check) | ⚠️ Unclear |
| Email settings | Organization.settings.emailSettings | NOT read by email.js | ❌ Not applied |
| Notification messages | OrgCustomizations.notificationMessages | Workflow engine (needs check) | ⚠️ Unclear |

---

## 🏆 TO BEAT NAUKRI — GAPS TO FIX FIRST

### Must-Fix (Blocking Core Value Prop):
1. **Connect customizations to actual forms** — departments/locations/sources must appear in dropdowns
2. **Apply custom fields to candidate profiles and job forms** — recruiters expect to see them
3. **Brand colors → CSS variables** — each org must feel like THEIR platform, not TalentNest
4. **Email settings → email sender** — orgs must be able to send from their own domain

### High Value Additions (To Differentiate from Naukri):
5. **Candidate auto-ranking on application** — score every applicant instantly, show ranked list
6. **Real-time job alerts** (instant frequency in JobAlert) — when a matching job posts, alert candidates IMMEDIATELY
7. **Candidate public profile page** (like LinkedIn) — let candidates share their profile link
8. **Client portal self-serve** — let clients post their own requirements, track their placements
9. **Analytics export to PDF/Excel** — one-click report downloads
10. **Interview feedback visible to candidate** (controlled by fieldVisibility) — massive trust builder

---

*Generated: 2026-05-20 | Source: Complete codebase analysis of talentnest-hr repository*
*Files covered: ~200+ files across backend and frontend*
