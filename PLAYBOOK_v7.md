# PLAYBOOK v7 — Production-Ready: India-First + Robustness
**Date:** 2026-04-04 | **Status:** ✅ Complete — Build passing, 0 errors

---

## What Was Built in Phase 7

### Task 1 — India-First Data Handling (`src/utils/india.js`)
- `fmtCTC(amount)` — formats salary as LPA if ≥ 1 lakh (e.g. `2500000 → "25 LPA"`)
- `fmtCTCRange(min, max)` — `800000,1200000 → "8–12 LPA"`
- `fmtDate(dt)` — DD/MM/YYYY Indian standard
- `fmtDateShort(dt)` — "15 Jun 2024"
- `fmtDateTime(dt)` — "Mon, 15 Jun · 10:30 AM"
- `NOTICE_PERIOD_OPTIONS` — Immediate / 15 / 30 / 45 / 60 / 90 days
- `fmtNoticePeriod(days)` — formats notice period for display
- `INTERVIEW_ROUND_OPTIONS` — HR Screening, Technical Round 1/2, Managerial, Client, etc.
- `INDIA_PIPELINE_STAGES` — Indian HR standard stage names
- AddCandidateForm notice period dropdown updated to Indian standard options

### Task 2 — Bulk WhatsApp Outreach
**Backend:** `POST /api/users/bulk-whatsapp`
- Accepts `{ userIds[], messageTemplate, recruiterName, jobTitle, companyName }`
- Personalises message per candidate using `{candidateName}`, `{jobTitle}`, `{companyName}`, `{recruiterName}` variables
- Sends via Twilio REST API; dev fallback console.log
- Returns per-candidate status: sent / sent_dev / skipped / failed

**Frontend (RecruiterCandidates.jsx):**
- Multi-select checkboxes added to each candidate card in search results
- "Select All / Deselect All" toggle button
- "📲 WhatsApp N Selected" button (green) appears when any selected
- Composer modal with variable hint strip and textarea
- "Send Now" calls API, shows toast with count sent

### Task 3 — Talent Pool (`src/pages/recruiter/TalentPool.jsx`)
**Backend:**
- `PATCH /api/applications/:id/park` — toggle parked status, adds "Talent Pool" entry to stageHistory
- `GET /api/applications/talent-pool` — returns all parked apps (placed **before** `/:id` route to avoid shadowing)

**Frontend:**
- `🅿️ Park` button added to every non-rejected, non-hired pipeline card in RecruiterPipeline
- Talent Pool page: search, table with candidate + last job + parked date
- "➕ Pull into Job" — job picker modal, one-click moves to Applied + unparks
- "Remove" — unparks candidate back to active
- Added to recruiter nav and App.jsx routing

### Task 4 — Duplicate Candidate Detection
**Backend:** `POST /api/users/check-duplicate`
- Checks exact email match → exact phone match → Levenshtein name similarity (threshold: 2 edits)
- Returns `{ duplicates: [{ name, email, matchType, distance? }] }`

**Frontend (AddCandidateForm.jsx):**
- `DupWarning` component (defined outside component, shown before save button)
- On save: checks duplicates first; if found, shows warning with match type and existing details
- "Create Anyway" button bypasses duplicate check and proceeds with save
- Changing any field resets duplicate check state

### Task 5 — Career Page with Company Branding
**Backend:**
- `GET /api/orgs/brand/:slug` — public endpoint returns `{ name, logoUrl, brandColor, industry }`
- `GET /api/jobs/public` — now also filters by `?orgSlug=` (looks up org by slug, filters jobs by tenantId)

**Frontend (CareersPage.jsx):**
- Uses `useParams()` to read `:companySlug`
- Fetches brand from `/api/orgs/brand/:slug` on load
- Shows brand header strip (logo + company name + brand color) above the hero when slug present
- App.jsx routes: `/careers` and `/careers/:companySlug` both render CareersPage

### Task 6 — Emergency Candidate Request
**Backend (candidateRequests.js):**
- On `POST /api/candidate-requests`: looks up all `super_admin` users and emails each one
- Email subject: `🚨 New Candidate Request — [ROLE] [URGENCY]`
- Email body: role, urgency, budget, requirements, submitter name, dashboard link

**Frontend (AdminAnalytics.jsx):**
- Accepts `onNavigate` prop (passed from App.jsx `setPageAndPersist`)
- "🚨 Request Candidates from TalentNest" red gradient button in analytics header (admin-only)
- Clicking navigates to `candidate-request` page

### Task 7 — Platform Audit Fixes
| Fix | File |
|-----|------|
| `talent-pool` GET route placed before `/:id` to avoid Express shadowing | `applications.js` |
| Duplicate route for `talent-pool` removed | `applications.js` |
| `sendEmail` import corrected to `sendEmailWithRetry` | `candidateRequests.js` |
| `sendEmail` call updated to positional signature `(to, subject, html)` | `candidateRequests.js` |
| `api.getPublicJobs()` updated to accept optional `qs` param | `job.service.js` |
| `getPublicJobs` in CareersPage wired to pass `?slug=` for company career pages | `CareersPage.jsx` |
| `onNavigate` prop added to AdminAnalytics signature | `AdminAnalytics.jsx` |
| Admin nav: all 3 `AdminAnalytics` renders pass `onNavigate` | `App.jsx` |
| Recruiter interviews + offers added to recruiter nav (were missing) | `Layout.jsx` |
| Notice period options updated to Indian standard | `AddCandidateForm.jsx` |

### Task 8 — Build Verification
```
npm run build → ✓ built in 10.25s | 0 errors | 0 warnings
node --check backend/server.js → 0 syntax errors
```

**CORS:** Allows localhost:*, *.vercel.app, *.railway.app, talentnesthr.com, FRONTEND_URL env var  
**Env vars used:** `MONGODB_URI`, `JWT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `FRONTEND_URL`, `COOKIE_SECRET`, `PORT`  
**None hardcoded** — all fall back to safe dev defaults  
**Railway:** `startCommand = 'npm start'`, healthcheck at `/api/health`

---

## Complete Platform Summary (All 7 Phases)

### Phase 1 — Marketing Site & Auth
- Landing page, About, Services, Blog, Contact, Companies pages
- Auth: login/register/Google Sign-In, 2FA OTP, forgot/reset password
- JWT with role-based access (candidate, recruiter, admin, super_admin, client)
- Invite flow with SHA-256 token, `/set-password` page

### Phase 2 — Core HR Portal
- Layout with role-specific sidebar navigation
- Recruiter: Jobs, Candidates, Pipeline (kanban), Assessments, AI Match, Outreach
- Admin: Analytics, Job Approvals, Candidates, Users/Team, Org Settings, Billing
- SuperAdmin: Platform, Organisations, Security, Permissions, Import, Playbooks
- Candidate: Dashboard, Explore Jobs, AI Job Search, Applications, Profile, Resume Builder

### Phase 3 — Advanced Features
- AI Match scoring (Google Gemini API)
- Resume builder with PDF export
- Email outreach tracker with pixel tracking
- Notification system (real-time polling)
- Billing page (plan management)
- Logo system with upload/preview/PNG download

### Phase 4 — Core Hiring Flow (Backend)
- Jobs CRUD with slugify, recruiter scoping, tenant isolation
- Candidates CRUD with PDF parsing (pdf-parse), bulk import (xlsx)
- Match score calculation: skills 45% + experience 30% + location 15% + notice 10%
- Applications API with stageHistory, stage emails
- OfferLetter auto-created on "Offer" stage
- Interest tracking (JWT-verified email links), email pixel tracking

### Phase 5 — Assessments, Interviews, Offers
- Assessment anti-cheat: fullscreen exit, tab switch, copy-paste blocking, 3-strike auto-submit
- Interview scheduling with iCal RFC 5545 calendar invites + Twilio WhatsApp
- Scorecard submission per interview round
- Offer letter PDF generation with pdfkit, base64 storage, candidate e-signature

### Phase 6 — Frontend Wire-Up (All Roles)
- All pages show real API data with skeletons, empty states, error states, toasts
- SuperAdmin: Candidate Requests, Audit Logs
- Admin: Pipeline (kanban drag-drop), Candidate Request form, Clients
- Recruiter: Interviews, Offers
- Candidate: Offer letter with e-signature
- Client role (new): Dashboard, Shortlists, Interviews, Placements
- Public: /interest/confirmed, /interest/declined

### Phase 7 — Production-Ready (this phase)
See above.

---

## File Registry (Key Files)

### Frontend — Pages
| File | Role | Purpose |
|------|------|---------|
| `src/pages/auth/AuthScreen.jsx` | Public | Login/Register/Google/2FA |
| `src/pages/auth/SetPasswordPage.jsx` | Public | Set password from invite link |
| `src/pages/careers/CareersPage.jsx` | Public | Job board, `/careers/:slug` |
| `src/pages/public/InterestConfirmedPage.jsx` | Public | Thank you — interested |
| `src/pages/public/InterestDeclinedPage.jsx` | Public | Thank you — declined |
| `src/pages/public/InviteResponsePage.jsx` | Public | Accept/decline job invite |
| `src/pages/candidate/CandidateDashboard.jsx` | Candidate | Overview KPIs |
| `src/pages/candidate/CandidateExploreJobs.jsx` | Candidate | Browse and apply |
| `src/pages/candidate/CandidateAIMatch.jsx` | Candidate | AI job matching |
| `src/pages/candidate/CandidateApplications.jsx` | Candidate | Track applications |
| `src/pages/candidate/CandidateProfile.jsx` | Candidate | Edit profile |
| `src/pages/candidate/CandidateAssessment.jsx` | Candidate | Take assessment (anti-cheat) |
| `src/pages/candidate/CandidateOffer.jsx` | Candidate | View + e-sign offer |
| `src/pages/candidate/ResumeBuilder.jsx` | Candidate | Build/export resume |
| `src/pages/recruiter/RecruiterDashboard.jsx` | Recruiter | KPIs + activity |
| `src/pages/recruiter/RecruiterJobs.jsx` | Recruiter | Manage my jobs |
| `src/pages/recruiter/RecruiterCandidates.jsx` | Recruiter | Search + WhatsApp |
| `src/pages/recruiter/RecruiterPipeline.jsx` | Recruiter | Kanban + Park |
| `src/pages/recruiter/TalentPool.jsx` | Recruiter | Parked candidates |
| `src/pages/recruiter/RecruiterInterviews.jsx` | Recruiter | Schedule + scorecard |
| `src/pages/recruiter/RecruiterOffers.jsx` | Recruiter | Send/track offers |
| `src/pages/recruiter/RecruiterAssessments.jsx` | Recruiter | Create/manage assessments |
| `src/pages/admin/AdminAnalytics.jsx` | Admin | Unified dashboard + Request btn |
| `src/pages/admin/AdminJobApproval.jsx` | Admin | Approve/reject jobs |
| `src/pages/admin/AdminUsers.jsx` | Admin | Manage team |
| `src/pages/admin/AdminPipeline.jsx` | Admin | Cross-job kanban |
| `src/pages/admin/AdminCandidateRequest.jsx` | Admin | Request candidates |
| `src/pages/admin/AdminClients.jsx` | Admin | Manage clients |
| `src/pages/admin/OrgSettings.jsx` | Admin | Org profile + logo |
| `src/pages/superadmin/SuperAdminCandidateRequests.jsx` | SuperAdmin | Manage all requests |
| `src/pages/superadmin/SuperAdminAuditLogs.jsx` | SuperAdmin | Platform audit trail |
| `src/pages/superadmin/SuperAdminOrgs.jsx` | SuperAdmin | All organisations |
| `src/pages/superadmin/SuperAdminPlaybooks.jsx` | SuperAdmin | 7 preset + custom playbooks |
| `src/pages/client/ClientDashboard.jsx` | Client | Hiring overview |
| `src/pages/client/ClientShortlists.jsx` | Client | Rate + approve candidates |
| `src/pages/client/ClientInterviews.jsx` | Client | View + submit feedback |
| `src/pages/client/ClientPlacements.jsx` | Client | Hired history |

### Frontend — Core
| File | Purpose |
|------|---------|
| `src/App.jsx` | Router + auth + page-state routing |
| `src/layout/Layout.jsx` | Sidebar + nav + notifications |
| `src/api/api.js` | Unified API barrel export |
| `src/api/services/*.js` | Modular API services |
| `src/constants/styles.js` | Design tokens (btnP, btnG, btnD, card, inp, glass) |
| `src/constants/stages.js` | Pipeline stage definitions |
| `src/utils/india.js` | India-first formatting (CTC, dates, notice period) |

### Backend — Routes
| Route | Purpose |
|-------|---------|
| `POST /api/auth/login` | Login with 2FA support |
| `POST /api/auth/register` | Register org + admin |
| `POST /api/auth/google` | Google Sign-In |
| `POST /api/auth/verify-otp` | 2FA OTP verification |
| `GET/POST /api/users` | User CRUD (recruiter, candidate, admin) |
| `POST /api/users/bulk-import` | Bulk candidate CSV/XLSX import |
| `POST /api/users/bulk-whatsapp` | Bulk WhatsApp outreach with variable personalisation |
| `POST /api/users/check-duplicate` | Duplicate detection (email/phone/Levenshtein) |
| `GET /api/jobs/public` | Public job board (no auth), filterable by slug/orgSlug |
| `GET/POST/PATCH/DELETE /api/jobs` | Job CRUD (tenant-scoped) |
| `GET/POST/PATCH/DELETE /api/applications` | Application lifecycle |
| `PATCH /api/applications/:id/stage` | Move pipeline stage |
| `PATCH /api/applications/:id/park` | Toggle talent pool parking |
| `GET /api/applications/talent-pool` | All parked applications |
| `PATCH /api/applications/:id/interview` | Schedule interview (iCal + WhatsApp) |
| `POST /api/applications/:id/interview/:idx/scorecard` | Submit scorecard |
| `GET/PATCH/POST /api/offers` | Offer letter CRUD + send + e-sign + PDF |
| `GET/POST/PATCH /api/assessments` | Assessment management |
| `POST /api/assessments/:id/submit` | Submit with violations + anti-cheat |
| `GET/POST /api/candidate-requests` | Admin staffing requests → emails super_admin |
| `GET/POST/PATCH/DELETE /api/clients` | Client company management |
| `GET /api/orgs/brand/:slug` | Public org branding for career pages |
| `GET /api/orgs/logo/public` | Platform logo (no auth) |
| `GET /api/interest/confirm/:token` | Candidate confirms interest via email link |
| `GET /api/interest/decline/:token` | Candidate declines |
| `GET /api/track/open/:trackingId` | Email open pixel |
| `GET /api/platform/audit-logs` | Platform-wide audit trail |
| `GET /api/stats` | Dashboard KPIs |

---

## Testing Checklist

### Auth
- [ ] Login with email/password → JWT stored in sessionStorage
- [ ] Login with 2FA enabled → OTP screen → verify OTP → dashboard
- [ ] Invite flow: admin creates recruiter → email received → set-password link works
- [ ] Google Sign-In (GOOGLE_CLIENT_ID env must be set)
- [ ] Forgot password → reset link email → set new password

### Candidate Flow
- [ ] Browse /careers → filter by urgency/location → Apply → form submitted
- [ ] /careers/:slug loads company brand header + filtered jobs
- [ ] Candidate receives interview invite email with iCal attachment
- [ ] Candidate signs offer letter → PDF generated → status moves to Hired

### Recruiter Flow
- [ ] Add candidate manually → duplicate warning shown if similar exists
- [ ] Upload resume → AI parses and fills form
- [ ] Search candidates → multi-select → WhatsApp composer → Send
- [ ] Pipeline: drag/drop stage, Park candidate, view in Talent Pool
- [ ] Pull from Talent Pool into new job → candidate moved to Applied
- [ ] Schedule interview → iCal email sent → WhatsApp notification sent
- [ ] Submit scorecard → visible in client interviews page
- [ ] Generate offer → send to candidate → candidate signs → PDF downloaded

### Admin Flow
- [ ] Analytics dashboard loads KPIs, charts, leaderboard
- [ ] "🚨 Request Candidates from TalentNest" → form → super_admin email received
- [ ] Approve job → status changes to active → appears on /careers
- [ ] Manage team: invite recruiter → resend invite → reset password

### SuperAdmin Flow
- [ ] Platform dashboard: tenant list, total stats
- [ ] Candidate requests table: see all pending → update status → mark fulfilled
- [ ] Audit logs: filter by action type, date range, search

### Client Flow
- [ ] Dashboard shows correct counts for own org
- [ ] Shortlists: rate candidate ★★★★★ → rating saved
- [ ] Approve shortlisted candidate → moves to Interview Round 1
- [ ] Submit interview feedback → visible to recruiter
- [ ] Placements: hired candidates shown with match score

### India-First
- [ ] Salary display: 2500000 shows as "25 LPA"
- [ ] Notice period dropdown shows Indian standard options (15/30/45/60/90 days)
- [ ] Dates display in DD/MM/YYYY format across all pages

### Build & Deploy
- [ ] `npm run build` → 0 errors, 0 warnings
- [ ] `node --check backend/server.js` → 0 syntax errors
- [ ] Railway: `npm start` → server starts on PORT env var
- [ ] `/api/health` returns `{ status: "ok" }`
- [ ] CORS allows Vercel frontend + custom domain
