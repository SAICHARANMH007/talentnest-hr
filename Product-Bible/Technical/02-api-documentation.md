# API Documentation

**Base URL**: `/api/<resource>` (mounted in `backend/src/server.js`). Most routes require `authenticate` (JWT) + `tenantGuard` (tenant scoping) middleware; role-restricted routes additionally use `allowRoles(...)`. **63 route files** total.

## Authentication & Users
| File | Endpoint | Methods | Purpose | Guards |
|---|---|---|---|---|
| `auth.js` | `/api/auth` | GET/POST | Login, register, Google OAuth, OTP, password reset, verify invite, refresh token | Public for login/register/google/otp/reset; `authenticate` for logout/refresh |
| `users.js` | `/api/users` | GET/POST/PATCH | User management — invite recruiter/hiring_manager, list, update profile, profile sync, 2FA toggle, bulk import | `authenticate` + `allowRoles(admin/super_admin)` for invites; `tenantGuard` |

## Core Hiring Flow
| File | Endpoint | Methods | Purpose | Guards |
|---|---|---|---|---|
| `jobs.js` | `/api/jobs` | GET/POST/PUT/PATCH/DELETE | Job CRUD, public fetch, smart matching, AI match, application count | Public for `/public/*`; `authenticate`+`tenantGuard` for private; `allowRoles(admin/recruiter)` for create/edit |
| `candidates.js` | `/api/candidates` | GET/POST/PUT/PATCH/DELETE | Candidate pool CRUD, resume parsing, bulk import, skill matching, merge duplicates, suggested jobs, full timeline | `authenticate`+`tenantGuard`+`allowRoles(admin/recruiter)` |
| `applications.js` | `/api/applications` | GET/POST/PUT/PATCH | Application CRUD, stage movement, interview scheduling, WhatsApp/SMS invite, scorecard feedback | `authenticate`+`tenantGuard`; public for `/invite/:token`, `/prefill`, `/quick`, `/public` |
| `dashboard.js` | `/api/dashboard`, `/api/stats` | GET/POST | Overview KPIs; College Portal (`/college/students`, `/college/drives`, `/college/placements`, `/college/skill-gaps`, `/college-groups`); analytics; exports | `authenticate`+`allowRoles(admin/recruiter/placement_officer)` |

## Hiring Periphery
| File | Endpoint | Methods | Purpose | Guards |
|---|---|---|---|---|
| `assessments.js` | `/api/assessments` | GET/POST/PUT/PATCH/DELETE | Assessment CRUD, submissions, evaluation, anti-cheat flags (`/:id/submissions/:subId/violation`) | `authenticate`+`tenantGuard`+`allowRoles(admin/recruiter)` |
| `offers.js` | `/api/offers` | GET/POST/PUT/PATCH | Offer CRUD, acceptance tracking, PDF generation | `authenticate`+`tenantGuard` |
| `preboarding.js` | `/api/preboarding` | GET/POST/PUT/PATCH | Pre-boarding checklists, task verification, onboarding email triggers | `authenticate`+`tenantGuard` |
| `interviewKits.js` | `/api/interview-kits` | GET/POST/PUT/PATCH/DELETE | Interview question library, scorecard templates | `authenticate`+`tenantGuard`+`allowRoles(admin/recruiter)` |
| `infoRequests.js` | `/api/info-requests` | GET/POST/PUT/PATCH | HR info requests to candidates, response tracking | `authenticate`+`tenantGuard` |

## Admin & Configuration
| File | Endpoint | Methods | Purpose | Guards |
|---|---|---|---|---|
| `admin.js` | `/api/admin` | POST/PATCH | Invite admin/recruiter, resend/revoke invite, delete user, org settings, workflow rules, feature toggles | `authenticate`+`allowRoles(super_admin)`; rate-limited 200/hr for invites |
| `recruiterAdmin.js` | `/api/recruiter` | GET/PATCH | Recruiter self-profile, department stats | `authenticate`+`allowRoles(recruiter/admin)` |
| `orgs.js` | `/api/orgs` | GET/POST/PUT/PATCH | Org profile, settings, feature config, admin invite, logo (`/orgs/logo`) | `authenticate`+`allowRoles(admin/super_admin)`; public for create-org (signup) |
| `customizations.js` | `/api/customizations` | GET/PUT | Career page branding, employer brand, email settings | `authenticate`+`tenantGuard` |
| `customFields.js` | `/api/custom-fields` | GET/POST/PUT/PATCH/DELETE | Custom field CRUD for candidates/applications | `authenticate`+`tenantGuard`+`allowRoles(admin)` |
| `pipelineTemplates.js` | `/api/pipeline-templates` | GET/POST/PUT/PATCH/DELETE | Pipeline stage templates | `authenticate`+`tenantGuard`+`allowRoles(admin)` |

## Secondary Features
| File | Endpoint | Methods | Purpose | Guards |
|---|---|---|---|---|
| `email.js` | `/api/email` | POST | Send email (Resend/SMTP), test provider config | `authenticate`+`tenantGuard` |
| `emailSequences.js` | `/api/email-sequences` | GET/POST/PUT/PATCH/DELETE | Email drip campaign CRUD, enrollment tracking | `authenticate`+`tenantGuard`+`allowRoles(admin/recruiter)` |
| `billing.js` | `/api/billing` | GET/POST | Plan listing (public), Razorpay order creation, webhook | Public `/plans`; `authenticate`+`tenantGuard` for payment; webhook signature verification |
| `notifications.js` | `/api/notifications` | GET/POST/PATCH/DELETE | In-app notification CRUD, read tracking | `authenticate`+`tenantGuard` |
| `push.js` | `/api/push` | GET/POST/DELETE | VAPID public key, web push subscription CRUD | `authenticate`+`tenantGuard` |

## Candidate Channels
| File | Endpoint | Methods | Purpose | Guards |
|---|---|---|---|---|
| Career pages | `/careers/jobs`, `/careers/job/:slug`, `/careers/jobs.json`, `/careers/jobs.xml` | GET | Public job board, sitemap/JSON feed for SEO | Public, HTTP cache headers |
| `schedule.js` | `/api/schedule` | GET/POST/PUT | Interview self-scheduling links, candidate confirmation | Public for token verification; `authenticate`+`tenantGuard` for creation |
| `referrals.js` | `/api/referrals` | GET/POST | Referrals (Refer & Earn), reward tracking | Public `/track`; `authenticate`+`tenantGuard` for list/create |
| `platformReferrals.js` | `/api/platform-referrals` | GET/POST/PUT | Platform invitation referral (coins/badges), redemption | Public `/track`; `authenticate`+`tenantGuard` for list/create |
| `interest.js` | `/api/interest` | GET/POST/PUT | Candidate interest form, notification tracking | Public form submit; `authenticate` for list |

## Communication
| File | Endpoint | Methods | Purpose | Guards |
|---|---|---|---|---|
| `whatsapp.js` | `/api/whatsapp` | GET/POST | Twilio webhook (inbound), send WhatsApp templates | Public webhook (signature verified); `authenticate`+`tenantGuard` for send |
| `messages.js` | `/api/messages` | GET/POST | Direct messages, user chat | `authenticate`+`tenantGuard` |
| `calls.js` | `/api/calls` | POST | Call tracking (phone/video) | `authenticate`+`tenantGuard` |
| `videoRooms.js` | `/api/video-rooms` | GET/POST | Video room CRUD, TURN server config | `authenticate`+`tenantGuard` |

## Social & Community
| File | Endpoint | Methods | Purpose | Guards |
|---|---|---|---|---|
| `feed.js` | `/api/feed`, `/api/social-posts` | GET/POST/PUT/PATCH/DELETE | Feed posts, reactions, comments, @mentions | Public `/public/:id`; `authenticate`+`tenantGuard` for user feed |
| `communities.js` | `/api/communities` | GET/POST/PUT/PATCH/DELETE | Community channels CRUD (cross-tenant) | `authenticate`+`tenantGuard` |
| `social.js` | `/api/social` | GET/POST | Facebook/Instagram posting, analytics | `authenticate`+`allowRoles(admin)`+`tenantGuard` |
| `companyReviews.js` | `/api/company-reviews` | GET/POST | Company reviews, rating aggregation | Public `/public/:id`; `authenticate`+`tenantGuard` for creation |

## Talent & Planning
| File | Endpoint | Methods | Purpose | Guards |
|---|---|---|---|---|
| `talentPool.js` | `/api/talent-pool` | GET/POST/PUT/PATCH/DELETE | Talent pool CRUD, segmentation | `authenticate`+`tenantGuard`+`allowRoles(admin/recruiter)` |
| `candidateRequests.js` | `/api/candidate-requests` | GET/POST/PUT/PATCH/DELETE | Requisition CRUD, fulfillment tracking | `authenticate`+`tenantGuard`+`allowRoles(admin)` |
| `headcountPlans.js` | `/api/headcount-plans` | GET/POST/PUT/PATCH/DELETE | Headcount planning, forecasting | `authenticate`+`tenantGuard`+`allowRoles(admin)` |
| `importedCandidates.js` | `/api/imported-candidates` | GET/POST | Bulk import candidates, onboarding flow | `authenticate`+`tenantGuard`+`allowRoles(admin/recruiter)` |
| `leads.js` | `/api/leads` | GET/POST/PUT/PATCH/DELETE | Marketing leads, status tracking | Public `/create`; `authenticate`+`allowRoles(super_admin)` for list/update |

## Analytics & Insights
| File | Endpoint | Methods | Purpose | Guards |
|---|---|---|---|---|
| `nps.js` | `/api/nps` | GET/POST/PUT | NPS surveys, sentiment analysis | Public `/survey/:id`; `authenticate`+`tenantGuard` for admin |
| `audit.js` | `/api/audit` | GET | Audit logs, change history | `authenticate`+`allowRoles(admin/super_admin)`+`tenantGuard` |
| `track.js` | `/api/track` | POST | Event tracking (form submissions, email opens, page views) | Public with pixel/webhook tokens |

## Specialized Features
| File | Endpoint | Methods | Purpose | Guards |
|---|---|---|---|---|
| `candidateDocs.js` | `/api/candidates/:id/documents` | GET/POST/PUT/PATCH/DELETE | Candidate document upload/management | `authenticate`+`tenantGuard` |
| `candidateVideo.js` | `/api/candidates/:id/video` | GET/POST | Video resume upload, playback | `authenticate`+`tenantGuard` |
| `bgv.js` | `/api/bgv` | GET/POST/PUT/PATCH | BGV document upload, verification status | `authenticate`+`tenantGuard` |
| `clients.js` | `/api/clients` | GET/POST/PUT/PATCH/DELETE | Client company CRUD (staffing agencies) | `authenticate`+`tenantGuard`+`allowRoles(admin)` |
| `jobAlerts.js` | `/api/job-alerts` | GET/POST/PUT/PATCH/DELETE | Job alert subscriptions | `authenticate`+`tenantGuard` |
| `onboardingTemplates.js` | `/api/onboarding-templates` | GET/POST/PUT/PATCH/DELETE | Onboarding task templates | `authenticate`+`tenantGuard`+`allowRoles(admin)` |
| `rejectionTemplates.js` | `/api/rejection-templates` | GET/POST/PUT/PATCH/DELETE | Rejection email templates | `authenticate`+`tenantGuard`+`allowRoles(admin)` |
| `savedSearches.js` | `/api/saved-searches` | GET/POST/PUT/PATCH/DELETE | Candidate search filters | `authenticate`+`tenantGuard` |
| `parseResume.js` | `/api/parse-resume` | POST | Resume parsing (extract structured data) | Public or `authenticate` |
| `blogs.js` | `/api/blogs` | GET/POST/PUT/PATCH/DELETE | Blog/article CRUD | Public read; `authenticate`+`allowRoles(admin)` for write |
| `platform.js` | `/api/platform` | GET/POST | Platform feature config, env status, system health | Public `/health`; `authenticate`+`allowRoles(super_admin)` for config |
| `webhooks.js` | `/api/webhooks` | GET/POST/PUT/PATCH/DELETE | Outbound webhook subscriptions, manual trigger | `authenticate`+`tenantGuard` |
| `presence.js` | `/api/presence` | POST | Online status heartbeat | `authenticate`+`tenantGuard`; public for token-based heartbeat |
| `connections.js` | `/api/connections` | GET/POST/PUT/PATCH/DELETE | User connections/follows | `authenticate`+`tenantGuard` |
| `invites.js` | `/api/invites` | GET/POST | Outreach invites, log-share, interested-click tracking | `authenticate`+`tenantGuard`; public token-based interest endpoints |

## College Hiring Portal Routes (within `dashboard.js`)
| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/dashboard/college/overview` | GET | KPIs + breakdowns + skill-gap summary for the College Overview page |
| `/api/dashboard/college/students` | GET | Student roster — filters: `q`, `type`, `dept`, `year`; paginated |
| `/api/dashboard/college/students/:id/recommendations` | GET | Per-student skill/course recommendations |
| `/api/dashboard/college/drives` | GET/POST/PUT/PATCH | Placement drive CRUD + registrations |
| `/api/dashboard/college/placements` | GET/PATCH | Placement records — filters: `q`, `stage`, `company`; `PATCH` for `collegeNotes` |
| `/api/dashboard/college/skill-gaps` | GET | Skill gap analysis with course recommendations |
| `/api/dashboard/college-groups` | GET | Cross-tenant college community list (Super Admin) |

All College routes require `authenticate` + `allowRoles(admin/recruiter/placement_officer)` and are scoped to the `college`-type tenant.

## Public/no-auth surface summary
The following are reachable without authentication: `/api/auth/*` (login/register/etc.), `/api/jobs/public/*`, `/api/applications/public`, `/careers/*`, `/api/billing/plans`, `/api/companyReviews/public/:id`, `/api/feed/public/:id`, `/api/nps/survey/:id`, `/api/leads/create`, `/api/referrals/track`, `/api/platform-referrals/track`, `/api/track`, `/api/whatsapp` webhook, `/api/platform/health`.
