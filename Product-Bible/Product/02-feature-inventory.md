# Feature Inventory

This inventory mirrors the audited Feature Inventory in the in-app **Product Intelligence Playbook** (`/app/playbooks` → Product Intelligence → §5), cross-checked against backend route files. Status is `LIVE` only if a corresponding route file/model exists and is wired into the frontend.

| # | Feature | Route File(s) / Model(s) | Status |
|---|---|---|---|
| 1 | **Authentication** — JWT access/refresh tokens, Google OAuth, OTP, device sessions | `auth.js`, `Otp.js`, `RefreshToken.js`, `UserSession.js` | LIVE |
| 2 | **Job Management** — create, edit, publish, archive; career page slugs; salary, skills, location | `jobs.js`, `Job.js` | LIVE |
| 3 | **Application Pipeline** — kanban stages, bulk move, smart match score, status history | `applications.js`, `Application.js` | LIVE |
| 4 | **Candidate Management** — profile, resume parse, skill extraction, BGV, documents | `candidates.js`, `candidateDocs.js`, `Candidate.js` | LIVE |
| 5 | **Resume Parsing** — PDF/DOCX → structured data (name, skills, experience) server-side | `parseResume.js` | LIVE |
| 6 | **Interview Scheduling** — calendar links, invite emails, candidate confirmations | `schedule.js`, `SchedulingLink.js` | LIVE |
| 7 | **Video Interviews** — WebRTC peer-to-peer rooms via Socket.io signaling | `videoRooms.js`, `VideoRoom.js` | LIVE |
| 8 | **Assessments** — create question banks, assign to candidates, auto-score | `assessments.js`, `Assessment.js`, `AssessmentSubmission.js` | LIVE |
| 9 | **Offer Letters** — PDF generation (PDFKit), digital signing, expiry tracking | `offers.js`, `OfferLetter.js` | LIVE |
| 10 | **Background Verification (BGV)** — Aadhaar, PAN, education, employment doc upload | `bgv.js`, `BgvDocument.js` | LIVE |
| 11 | **Pre-Boarding** — document checklist, task assignments before Day 1 | `preboarding.js`, `PreBoarding.js`, `OnboardingTemplate.js` | LIVE |
| 12 | **Email Sequences** — drip campaigns, automated candidate nurture | `emailSequences.js`, `EmailSequence.js` | LIVE |
| 13 | **Social Feed** — posts, reactions, comments, hashtags, image upload (Cloudinary) | `feed.js`, `FeedPost.js` | LIVE |
| 14 | **Communities** — global cross-tenant groups, join/leave, feed per community | `communities.js`, `Community.js` | LIVE |
| 15 | **Connections / Networking** — send/accept requests, mutual connections | `connections.js`, `Connection.js` | LIVE |
| 16 | **Direct Messaging** — 1:1 chat via Socket.io real-time | `messages.js`, `DirectMessage.js` | LIVE |
| 17 | **WhatsApp Messaging** — send messages to candidates via WhatsApp API | `whatsapp.js`, `WhatsAppLog.js` | LIVE |
| 18 | **Notifications** — in-app + browser push (VAPID) + real-time via Socket.io | `notifications.js`, `push.js`, `Notification.js`, `PushSubscription.js` | LIVE |
| 19 | **Company Reviews** — public rating/review system, admin moderation, reporting | `companyReviews.js`, `CompanyReview.js` | LIVE |
| 20 | **NPS (Net Promoter Score)** — candidate surveys, scoring, org-level dashboard | `nps.js`, `CandidateNPS.js` | LIVE |
| 21 | **Talent Pool** — save candidates for future roles, tag, search | `talentPool.js`, `TalentPool.js` | LIVE |
| 22 | **Saved Searches** — save candidate filter queries with alert triggers | `savedSearches.js`, `SavedSearch.js` | LIVE |
| 23 | **Job Alerts** — candidate-subscribed email alerts for new matching jobs | `jobAlerts.js`, `JobAlert.js` | LIVE |
| 24 | **Billing (Razorpay)** — plans, orders, payment records, subscription management | `billing.js`, `PaymentRecord.js` | LIVE |
| 25 | **Audit Logs** — immutable record of all admin/recruiter actions per tenant | `audit.js`, `AuditLog.js` | LIVE |
| 26 | **Custom Fields** — admin-defined extra fields on jobs/candidates | `customFields.js`, `CustomFieldDefinition.js`, `CustomFieldValue.js` | LIVE |
| 27 | **Pipeline Templates** — reusable hiring stage configurations | `pipelineTemplates.js` | LIVE |
| 28 | **Interview Kits** — structured interview scorecards, question banks | `interviewKits.js`, `InterviewKit.js` | LIVE |
| 29 | **Rejection Templates** — reusable rejection email templates | `rejectionTemplates.js`, `RejectionTemplate.js` | LIVE |
| 30 | **Onboarding Templates** — pre-boarding task/document checklist templates | `onboardingTemplates.js`, `OnboardingTemplate.js` | LIVE |
| 31 | **Headcount Planning** — org-level hiring forecasts, department budgets | `headcountPlans.js`, `HeadcountPlan.js` | LIVE |
| 32 | **Job Distribution** — post jobs to multiple boards from one place | `JobDistribution.js` | LIVE |
| 33 | **Referrals** — employee referral program (internal + platform-wide) | `referrals.js`, `platformReferrals.js`, `Referral.js`, `PlatformReferral.js` | LIVE |
| 34 | **Social Posts (Employer Brand)** — org-branded social media posts | `social.js` (Facebook/Instagram Graph API) | LIVE |
| 35 | **Calls** — call records, call logging for candidate interactions | `calls.js`, `CallRecord.js` | LIVE |
| 36 | **Blogs / Content** — employer brand blog posts | `blogs.js`, `Blog.js` | LIVE |
| 37 | **Webhooks** — outbound HTTP webhooks on application events | `webhooks.js`, `Webhook.js` | LIVE |
| 38 | **Org Customizations** — logo, brand colors, email branding, career page | `customizations.js`, `OrgCustomizations.js` | LIVE |
| 39 | **Interest Tracking** — candidate swipes/interests on job cards | `interest.js`, `InfoRequest.js` | LIVE |
| 40 | **Invites** — magic-link org invitations for team members | `invites.js`, `Invite.js` | LIVE |
| 41 | **College Hiring Portal** — placement officer dashboard (drill-down stats, dept/batch breakdowns, top hiring companies), student roster with profile & course recommendations, placement drive scheduling, placement record tracking with private notes, skill-gap analysis | `dashboard.js` (`/college/*` routes), `PlacementDrive.js`, `skillCourses.js` | LIVE |
| 42 | **Aadhaar-Linked Candidate Verification** — name + phone match against Aadhaar-linked record, zero data storage, locks verified name | *not yet built* | **PLANNED FUTURE CAPABILITY** — full spec in [Compliance Documentation](../Compliance/01-compliance-documentation.md) |

## Notes
- "LIVE" means the route/model exists and is reachable from at least one frontend page in this audit.
- Feature #42 is the **only** feature in this inventory that is fully specified but not implemented — it should not be referenced as an active selling point until built.
- No AI/ML features appear in this inventory — smart-match scoring (feature #3's `matchBreakdown`) is rule-based (skill/experience/location/notice scoring), not model-based.
