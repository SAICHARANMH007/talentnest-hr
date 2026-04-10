# TalentNest HR — Developer Playbook v8.0
*Generated: 2026-04-04 | Commit: 72a6747*

---

## What Changed in v8 (Full Audit Patch)

### Critical Bug Fixes
| Fix | File | Issue | Status |
|-----|------|-------|--------|
| 1 | `routes/recruiterAdmin.js` | Invite-candidate crash — wrong field names (orgId→tenantId, password→passwordHash, stage→currentStage) | ✅ FIXED |
| 2 | `routes/invites.js` | `sendEmail` was undefined (imported Express router, not util) → `sendEmailWithRetry` | ✅ FIXED |
| 3 | `models/Application.js` | Missing `deletedAt` (soft-delete broken), missing feedback fields (silently dropped by Mongoose) | ✅ FIXED |
| 4 | `routes/jobs.js` | `GET /jobs/pending` missing → CastError when `/:id` matched "pending" | ✅ FIXED |
| 5 | `middleware/checkPlanLimits.js` | Used `Organization`+`orgId` instead of `Tenant`+`tenantId` → plan limits never enforced | ✅ FIXED |
| 7 | `models/AssessmentSubmission.js` | No `tenantId` field → no tenant isolation on submissions | ✅ FIXED |
| 8 | `models/EmailLog.js` | No `tenantId` field | ✅ FIXED |
| 9 | `models/Notification.js` | No `tenantId` field | ✅ FIXED |
| 10 | `models/Assessment.js` | `tenantId` not required; `questions` was `Mixed` (no validation) | ✅ FIXED |
| 11 | `routes/orgs.js` | `GET /brand/:slug` after `GET /:id` → shadowed, career page branding broken | ✅ FIXED |
| 12 | `routes/invites.js` | `BACKEND_URL` fallback was localhost → email tracking pixels broken in prod | ✅ FIXED |

### Dead Code Removed
- `backend/src/middleware/roleCheck.js` — deleted; all routes now use `allowRoles` from `rbac.js`
- `backend/src/services/application.service.js` — deleted (no imports anywhere)
- `vite.config.js` — removed dead `vendor-mammoth` chunk and `resumeParser` reference

### Environment Variables Hardened
- `backend/.env.example` — added `BACKEND_URL`, `COOKIE_SECRET`, `SUPER_ADMIN_PASSWORD`, Twilio vars
- `.env.example` — removed `VITE_GEMINI_API_KEY` (not used in frontend source)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18.2 + Vite 4.4.5 + React Router DOM v6 |
| Backend | Node.js + Express 4.21 (CommonJS) |
| Database | MongoDB Atlas via Mongoose 8.6 |
| Auth | JWT (HS256) — `userId` payload key, stored in `sessionStorage` |
| Email | Resend API via `backend/src/utils/email.js` → `sendEmailWithRetry` |
| AI | Google Gemini API — backend only (Gemini 2.0 Flash) |
| Deployment | Frontend → Vercel, Backend → Railway (port 8080) |

---

## Architecture Rules (MUST follow)

### Field Names — Use These, Not the Old Ones
```
User.tenantId      ✅  (NOT orgId)
Job.tenantId       ✅  (NOT orgId)
Application.tenantId ✅ (NOT orgId)
Notification.tenantId ✅ (kept orgId as legacy — do NOT remove)
EmailLog.tenantId  ✅  (kept orgId as legacy — do NOT remove)
```

### Auth Middleware Guarantees
`req.user` is populated from JWT with: `id`, `role`, `tenantId`, `orgId`, `orgName`

### Role Middleware — ONE pattern only
```js
// ✅ CORRECT — use this everywhere
const { allowRoles } = require('../middleware/rbac');
router.get('/', auth, allowRoles('admin', 'recruiter'), handler);

// ❌ WRONG — roleCheck.js was deleted in v8
const { requireRole } = require('../middleware/roleCheck'); // DOES NOT EXIST
```

### API Response Unwrapping (frontend)
```js
// ✅ ALWAYS unwrap paginated responses
const items = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);

// ❌ NEVER
setJobs(await api.getJobs()); // may crash on .filter() if paginated
```

### Soft-Delete Pattern
`deletedAt` is in the Application schema. Filter: `{ deletedAt: null }`. Delete: `$set: { deletedAt: new Date() }`.

### Route Ordering (Express)
Static segments MUST be registered before dynamic segments:
```js
router.get('/pending', handler);   // ← BEFORE
router.get('/brand/:slug', handler); // ← BEFORE
router.get('/:id', handler);       // ← AFTER
```

---

## E2E Flow Status (as of v8)

| Flow | Status |
|------|--------|
| Recruiter invites candidate to job | ✅ PASS |
| Bulk invite email sending (invites.js) | ✅ PASS |
| Application soft-delete | ✅ PASS |
| Admin views pending jobs for approval | ✅ PASS |
| Plan limits enforced on job/recruiter creation | ✅ PASS |
| Career page loads org brand by slug | ✅ PASS |

---

## Local Dev Setup

```bash
# Terminal 1 — Backend
cd backend && npm run dev   # http://localhost:5000/api

# Terminal 2 — Frontend
npm run dev                 # http://localhost:5173
```

### Required env vars (backend)
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
RESEND_API_KEY=re_...
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
COOKIE_SECRET=...
```

### Seed account (auto-created on every backend start)
- Email: `admin@talentnesthr.com`
- Password: `TalentNest@2024` (or `SUPER_ADMIN_PASSWORD` env var)
- Role: `super_admin`

---

## Key File Index

| File | Purpose |
|------|---------|
| `backend/server.js` | Express app entry, CORS, health check |
| `backend/src/db/seed.js` | Seeds super_admin on every start |
| `backend/src/middleware/auth.js` | `authenticate` + `signToken` + `JWT_SECRET` |
| `backend/src/middleware/rbac.js` | `allowRoles(...roles)` — THE role guard |
| `backend/src/middleware/tenantGuard.js` | Validates tenant exists + subscription active |
| `backend/src/middleware/checkPlanLimits.js` | Enforces job/recruiter quotas per plan |
| `backend/src/utils/email.js` | `sendEmailWithRetry(to, subject, html)` |
| `src/api/api.js` | All frontend API calls + 401 interceptor |
| `src/api/config.js` | `API_BASE_URL` from `VITE_API_URL` env var |
| `src/layout/Layout.jsx` | Sidebar — SidebarContent is TOP-LEVEL component |

---

## Models Summary

| Model | Key Fields | Tenant Field |
|-------|-----------|--------------|
| User | role, tenantId, isActive, mustChangePassword | tenantId |
| Job | tenantId, status, deletedAt | tenantId |
| Application | tenantId, currentStage, stageHistory, deletedAt, feedback | tenantId |
| Assessment | tenantId (required), jobId, questions (sub-doc array) | tenantId |
| AssessmentSubmission | tenantId (required), assessmentId, candidateId, answers | tenantId |
| Notification | userId, tenantId, type, read | tenantId |
| EmailLog | tenantId, to, subject, status, provider | tenantId |
| Tenant | name, plan, status, subscriptionEndsAt | (IS the tenant) |
| Organization | name, slug, logoUrl, plan (legacy Org model) | orgId (legacy) |

---

## Build

```bash
npm run build   # Vite build — zero errors confirmed on 2026-04-04
```

Chunks: react, router, xlsx, pdf, zip, util-parser, pages-{admin,recruiter,candidate,superadmin,marketing,auth}, data-blogs
