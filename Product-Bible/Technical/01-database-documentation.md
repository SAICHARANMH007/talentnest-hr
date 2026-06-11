# Database Documentation

**Database**: MongoDB (via Mongoose), hosted on MongoDB Atlas. **56 models** in `backend/src/models/`. All models include `tenantId` for multi-tenant isolation unless noted.

## Core Multi-Tenant Models
| Model | Purpose | Key Fields |
|---|---|---|
| `User.js` | Platform user, role-based access | `tenantId`, `role` (`super_admin/admin/recruiter/hiring_manager/client/candidate/placement_officer`), `email`, `passwordHash`, `googleId`, `isActive`, `bgvVerified`, `platformVerified`, `twoFactorEnabled`, `inviteToken` |
| `Tenant.js` | Self-service organization/tenant container | `name`, `slug`, `domain`, `type` (`org/tenant/vendor/client/college`), `parentId` (Tenant ref), `plan` (`free/trial/starter/basic/growth/pro/agency/enterprise`), `subscriptionStatus`, Razorpay/Stripe IDs, `maxJobs`/`maxRecruiters`/`maxCandidates` |
| `Organization.js` | Legacy org model for platform admins | `name`, `slug`, `domain`, `status` (`active/suspended/trial/pending`), `plan`, `stripeCustomerId`, `isStaffingAgency`, `settings` (limits/branding/featureFlags) — **possible legacy duplicate of `Tenant.js`, see Technical Debt** |

## Hiring Pipeline
| Model | Purpose | Key Fields |
|---|---|---|
| `Job.js` | Job posting | `tenantId`, `createdBy`, `clientId`, `title`, `status` (`draft/active/closed`), `numberOfOpenings`, `applicationDeadline`, `skills[]`, `niceToHaveSkills[]`, `salaryMin/Max`, `salaryCurrency`, `referralReward`, `referralEnabled`, `companyDescription`, `careerPageSlug` |
| `Candidate.js` | Candidate profile (universal pool) | `tenantId`, `name`, `email`, `title`, `skills[]`, `experience`, `isFresher`, `currentCompany`, `currentCTC/expectedCTC`, `resumeUrl`, `videoResumeUrl`, `source` (`manual/resume_upload/bulk_import/invite_link/career_page/referral/platform/talent_match`), `assignedRecruiterId`, `tags` |
| `Application.js` | Job application & pipeline tracking | `tenantId`, `jobId`, `candidateId`, `currentStage`, `stageHistory[]`, `talentMatchScore`, `matchBreakdown` (skill/experience/location/notice scores), `interviewRounds[]`, `assessmentScore` |
| `Client.js` | Client company (for staffing agencies) | `tenantId`, `companyName`, `contactPerson`, `email`, `phone`, `industry`, `isActive` |

## Assessments & Interviews
| Model | Purpose | Key Fields |
|---|---|---|
| `Assessment.js` | Screening test/assessment | `tenantId`, `jobId`, `createdBy`, `title`, `questions[]` (`mcq_single/mcq_multi/text/code/truefalse`), `timeLimitMins`, `passingScore`, `autoAdvance`, `antiCheatEnabled` |
| `AssessmentSubmission.js` | Assessment attempt/response | `tenantId`, `assessmentId`, `candidateId`, `applicationId`, `totalScore`, `answers[]`, `startedAt`, `submittedAt`, `flags` (cheating detection) |
| `InterviewKit.js` | Structured interview template | `tenantId`, `createdBy`, `name`, `questions[]` (competency mapping), `screeningQuestions[]` |

## Onboarding & Pre-Boarding
| Model | Purpose | Key Fields |
|---|---|---|
| `PreBoarding.js` | New hire onboarding checklist | `tenantId`, `candidateId`, `offerId`, `designation`, `joiningDate`, `status` (`pending/in_progress/completed/cancelled`), `tasks[]` (category, dueDate, verifyStatus), `joiningConfirmed`, `welcomeKitSentAt` |
| `OnboardingTemplate.js` | Reusable onboarding task templates | `tenantId`, `createdBy`, `name`, `tasks[]` (category, description) |

## Offers & BGV
| Model | Purpose | Key Fields |
|---|---|---|
| `OfferLetter.js` | Job offer document | `tenantId`, `applicationId`, `candidateId`, `jobId`, `ctcOffered`, `tenure`, `joiningDate`, `status` (`draft/sent/accepted/rejected/expired`), `documentUrl`, `signatureImageUrl` |
| `BgvDocument.js` | Background verification docs | `tenantId`, `candidateId`, `userId`, `documentType` (`aadhar/pan/ssn/passport`), `documentUrl`, `verificationStatus` (`pending/approved/rejected`), `verifiedBy` |

## Email & Communication
| Model | Purpose | Key Fields |
|---|---|---|
| `EmailSequence.js` | Automated email drip campaigns | `tenantId`, `createdBy`, `name`, `steps[]` (delayDays, subject, body), `enrollments[]` (candidateId, currentStep, nextSendAt, completed) |
| `EmailLog.js` | Email delivery tracking | `tenantId`, `to`, `subject`, `status` (`sent/failed/bounced`), `provider` (`resend/smtp`), `sentBy`, `retryCount` |
| `WhatsAppLog.js` | WhatsApp message tracking | `tenantId`, `to`, `message`, `status`, `messageSid` (Twilio SID), `sentAt`, `deliveredAt` |
| `DirectMessage.js` | User-to-user messages | `tenantId`, `senderId`, `recipientId`, `message`, `attachments[]`, `readAt` |

## Candidate Management & Sourcing
| Model | Purpose | Key Fields |
|---|---|---|
| `CandidateRequest.js` | Bulk candidate open requisition | `tenantId`, `createdBy`, `jobId`, `title`, `count`, `priority`, `status` (`open/filled/closed`), `deadline` |
| `ImportedCandidate.js` | Bulk-imported candidates | `tenantId`, `addedBy`, `name`, `email`, `phone`, `source`, `mappedToCandidate`, `importStatus` |
| `TalentPool.js` | Candidate pool/talent segment | `tenantId`, `createdBy`, `name`, `filters` (skills/experience/location), `candidateCount` |
| `SavedSearch.js` | Saved candidate search filter | `tenantId`, `createdBy`, `name`, `filters`, `isPublic` |

## Referral & Rewards
| Model | Purpose | Key Fields |
|---|---|---|
| `Referral.js` | Job referral (Refer & Earn) | `tenantId`, `referredByName/Email`, `jobId`, `candidateId`, `status` (`pending/applied/hired`), `rewardAmount`, `rewardPaid`, `rewardPaidAt` |
| `PlatformReferral.js` | Platform invitation referral (coins/badges) | `tenantId`, `referrerId`, `referreeEmail`, `status` (`invited/active`), `coinsPaid`, `badgeName` |

## NPS, Feedback & Social
| Model | Purpose | Key Fields |
|---|---|---|
| `CandidateNPS.js` | Net Promoter Score survey | `tenantId`, `candidateId`, `score` (0-10), `feedback`, `sentiment` (`positive/neutral/negative`) |
| `CompanyReview.js` | Company reviews (Glassdoor-like) | `tenantId` (optional — see AC-8), `authorId`, `rating`, `reviewText`, `rating_breakdown` (salary/culture/growth), `isPublic` |
| `FeedPost.js` | Internal social feed posts | `tenantId`, `authorId`, `content`, `images[]`, `postType` (`update/achievement/announcement/milestone/hiring`), `reactions[]`, `comments[]`, `savedBy[]` |
| `PostReport.js` | Abuse reports on feed posts | `tenantId`, `postId`, `reportedBy`, `reason`, `status` (`pending/reviewed/resolved`) |

## Planning & Analytics
| Model | Purpose | Key Fields |
|---|---|---|
| `HeadcountPlan.js` | Headcount planning/forecasting | `tenantId`, `createdBy`, `title`, `entries[]` (designation, count, budget, timeline), `status` |
| `JobDistribution.js` | Job distribution to recruiters | `tenantId`, `jobId`, `recruiterId`, `allocationPercentage`, `status` |
| `PlacementDrive.js` | Campus placement drive (college tenant) | `tenantId`, `jobId`, `collegeName`, `driveDate`, `mode` (`On-Campus/Virtual/Off-Campus`), `eligibility` (`minCGPA`/`branches`/`skills`), `registrations[]` (candidateId, status) |

## System & Infrastructure
| Model | Purpose | Key Fields |
|---|---|---|
| `AuditLog.js` | Change audit trail | `tenantId`, `userId`, `action`, `entityType`, `entityId`, `oldValue`, `newValue`, `timestamp`, `ipAddress` |
| `Webhook.js` | Outbound webhook subscriptions | `tenantId`, `url`, `events[]` (`application.created/offer.accepted`), `isActive`, `deliveries[]` (timestamp, status, payload) |
| `Notification.js` | User notifications (in-app) | `tenantId`, `userId`, `type` (`offer/application_stage_change`), `data`, `readAt` |
| `PushSubscription.js` | Web push subscription (VAPID) | `userId`, `tenantId`, `subscription` (endpoint, keys), `isActive` |
| `Otp.js` | One-time password for 2FA/login | `email`, `otp`, `purpose` (`login/2fa`), `expiresAt`, `attempts` |
| `RefreshToken.js` | JWT refresh token | `userId`, `token`, `expiresAt`, `isBlacklisted` |
| `UserSession.js` | User login session tracking | `userId`, `tenantId`, `ipAddress`, `userAgent`, `expiresAt`, `lastActivity` |

## Content & Configuration
| Model | Purpose | Key Fields |
|---|---|---|
| `Blog.js` | Blog/article content | `tenantId`, `title`, `slug`, `sections[]` (heading, body, image), `publishedAt`, `author` |
| `Community.js` | Org community/channel (cross-tenant) | `tenantId`, `name`, `slug`, `description`, `memberCount`, `isPaid` |
| `OrgCustomizations.js` | Org branding & feature config | `tenantId`, `employerBrand` (tagline/about/culture/mission/testimonials), `featureFlags`, `emailSettings`, `customPipelineStages` |
| `CustomFieldDefinition.js` | Custom field metadata | `tenantId`, `entityType` (`candidate/application/job`), `fieldName`, `fieldType` (`text/dropdown/date/multiselect`), `options[]`, `isRequired`, `isActive` |
| `CustomFieldValue.js` | Custom field data values | `tenantId`, `entityType`, `entityId`, `fieldId`, `value` |

## Misc
| Model | Purpose | Key Fields |
|---|---|---|
| `Lead.js` | Marketing/signup leads (not in org) | `name`, `email`, `company`, `service`, `message`, `source`, `status` (`new/contacted/converted/closed`) |
| `JobAlert.js` | Job alert subscription | `tenantId`, `userId`, `keywords`, `filters`, `frequency` |
| `RejectionTemplate.js` | Rejection email templates | `tenantId`, `createdBy`, `title`, `subject`, `body` |
| `SchedulingLink.js` | Self-scheduling interview link | `tenantId`, `createdBy`, `slug`, `token`, `interviewFormat` |
| `VideoRoom.js` | Video call room metadata | `tenantId`, `createdBy`, `roomId`, `participants[]` (userId, joinedAt), `messages[]`, `recordingUrl` |
| `Connection.js` | User connection/follow | `tenantId`, `followerId`, `followeeId`, `status` (`pending/accepted`) |
| `CallRecord.js` | Call tracking (duration, outcome) | `tenantId`, `initiatedBy`, `participantId`, `duration`, `callType` (`phone/video`), `startedAt` |
| `InfoRequest.js` | HR info request from candidates | `tenantId`, `requestedBy`, `title`, `description`, `deadline`, `responses[]` |
| `PaymentRecord.js` | Payment transaction log | `tenantId`, `amountINR`, `planName`, `razorpayOrderId`, `razorpayPaymentId`, `razorpaySignature`, `status` |
| `Invite.js` | Invite/token management | `email`, `token`, `type` (`signup/join`), `expiresAt`, `usedAt`, plus `sentByName`/`type` for outreach tracking |

## Multi-tenancy convention
- Every model except `Community.js` (cross-tenant by design), `Lead.js`, `Invite.js`, and `Otp.js`/`RefreshToken.js` (pre-tenant-context) carries `tenantId`.
- `CompanyReview.tenantId` is **optional** (see AC-8) to support `super_admin` reviews of non-tenant companies sourced purely from Communities.
- Soft deletes via `deletedAt`, filtered out by default in queries.

## Relationships summary
```
Tenant (1) ──< User (N)
Tenant (1) ──< Job (N) ──< Application (N) >── Candidate (1)
Application (1) ──< OfferLetter, AssessmentSubmission, InterviewRounds
Candidate (1) ──< BgvDocument, CandidateNPS, Referral
Tenant (1) ──< PlacementDrive (N) ──< registrations[] >── Candidate
Tenant.parentId ──> Tenant  (vendor → client sub-tenants)
Community (cross-tenant) ──< members (Users/Candidates by college/company)
```
