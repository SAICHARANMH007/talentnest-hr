# Architecture Documentation

## 1. High-level architecture
TalentNest HR is a **monolithic Node/Express backend** + **single-page React frontend**, with **MongoDB Atlas** as the system of record and **Socket.io** for real-time features. There is no microservices split, no message queue, and no separate worker tier — all background-style work (email sending, webhook delivery, community sync) runs in-process within the same Express server.

```
┌──────────────────────────┐        HTTPS (Vercel rewrites /api/* )      ┌───────────────────────────────┐
│  React 18 + Vite SPA      │ ─────────────────────────────────────────► │ Express 4 API (Render)         │
│  (src/pages, src/components)                                            │ backend/server.js               │
│  - role-based routing      │ ◄───────────────────────────────────────── │ - 63 route files                │
│  - Socket.io client         │        WebSocket (Socket.io)              │ - Mongoose models (56)          │
└──────────────────────────┘                                            │ - Socket.io server (video/chat/  │
                                                                          │   calls/platform)                │
                                                                          └───────────────┬─────────────────┘
                                                                                            │
                                          ┌─────────────────────────────────────────────────┴──────────────┐
                                          │ MongoDB Atlas (Mongoose ODM)                                    │
                                          │ - tenantId on (almost) every collection                         │
                                          └──────────────────────────────────────────────────────────────┘

External services: Razorpay (billing), Twilio (WhatsApp/SMS), Cloudinary (media),
Resend/SMTP via Zoho (email), Google OAuth, VAPID (web push), Fast2SMS, IndexNow (SEO ping), Gemini API.
```

## 2. Frontend architecture
- **Stack**: React 18, Vite, React Router, plain CSS/inline styles (no Tailwind/CSS framework detected as a hard dependency for layout — confirm against `package.json` if extending).
- **Entry**: `src/main.jsx` → `src/App.jsx` (routing tree).
- **API access**: `src/services/api.js` (or equivalent) — a shared Axios/fetch wrapper used by all pages. Per [Technical Debt #2](../Technical/03-technical-debt-analysis.md), this wrapper does **not** currently normalize paginated `{success, data, pagination}` responses — each page handles unwrapping itself.
- **Routing model**: route guards check `user.role` (one of `super_admin/admin/recruiter/hiring_manager/client/candidate/placement_officer`) to decide which dashboard shell (`/app/*`, `/superadmin/*`) and sidebar links render.
- **Real-time**: Socket.io client connects for: notifications, presence (`presence.js`), direct messages (`messages.js`/`DirectMessage.js`), video rooms (`videoRooms.js`/`VideoRoom.js`), calls (`calls.js`/`CallRecord.js`), and feed updates.
- **Public surface**: career pages (`/careers/*`, org-slug career pages `/:orgSlug/careers`), blog (`blogs.js`), company reviews (`/api/company-reviews/public/:id`), referral tracking, NPS survey links — all server-rendered/served via the same SPA with public API routes (no auth).

## 3. Backend architecture
- **Entry point**: `backend/server.js` — single Express app, single Node process per Render instance.
- **Middleware stack (in order)**: `compression` → `cookieParser` (signed cookies, `COOKIE_SECRET`) → `helmet` (CSP disabled, cross-origin resource policy open) → `cors` (allow-list: localhost, `*.vercel.app`, `*.railway.app`/`*.up.railway.app`, `*.onrender.com`, `talentnesthr.com`/`www.talentnesthr.com`, `FRONTEND_URL`) → `morgan` request logging → tiered `express-rate-limit` → `express.json` (10MB default, 25MB for `/api/users/bulk-import`) → `express.urlencoded`.
- **Route mounting**: 63 route files mounted under `/api/*` (full table in [API Documentation](../Technical/02-api-documentation.md)). Most routes chain `authenticate` (JWT) → `tenantGuard` (injects/validates `req.tenantId`) → `allowRoles(...)` where role-restricted.
- **Real-time layer**: `socket.io` `Server` instance attached to the same HTTP server (`server.js:842`). Four socket setup modules: `setupVideoSocket`, `setupChatSocket`, `setupCallSocket`, `setupPlatformSocket` — each registers its own namespace/event handlers on the shared `io` instance.
- **Models**: 56 Mongoose models in `backend/src/models/` — see [Database Documentation](../Technical/01-database-documentation.md) for the full catalog.
- **No queue/cron infrastructure detected**: scheduled-feeling work (email sequence steps, community maintenance sync) is triggered **lazily on request** (e.g., the Communities workflow runs an idempotent maintenance sync throttled to once per 10 minutes when a user opens the Communities page — see [Workflow Diagrams](../Product/08-workflow-diagrams.md) §4) rather than via `node-cron`/external scheduler. **Recommendation** (not yet implemented): if email sequence steps need to fire without a user request, a scheduled job runner would be required — flag as a gap for [Roadmap](../Roadmap/02-missing-features-analysis.md).

## 4. Multi-tenancy model
- **Isolation strategy**: shared database, shared schema, **row-level isolation via `tenantId`** on every model except `Community.js` (cross-tenant by design), `Lead.js`, `Invite.js`, `Otp.js`, `RefreshToken.js` (pre-tenant-context), and `CompanyReview.js` (`tenantId` optional).
- **`tenantGuard` middleware** (`backend/src/middleware/tenantGuard.js`) resolves the authenticated user's `tenantId` (from JWT claims) and scopes/validates subsequent queries.
- **Tenant types** (`Tenant.type` enum): `org` (standard company), `tenant` (generic), `vendor` (staffing agency parent), `client` (staffing agency's client company, `Tenant.parentId` → vendor `Tenant`), `college` (College Hiring Portal).
- **Vendor/Client hierarchy**: `Tenant.parentId` allows a staffing-agency vendor tenant to have one or more client sub-tenants — `Client.js` additionally models the staffing agency's client *companies* (a separate, finer-grained concept from client *tenants*).

## 5. Authentication & session architecture
- **Primary auth**: JWT (`jsonwebtoken`), signed with `JWT_SECRET`, default expiry `30d` (`JWT_EXPIRES` env override), payload = `{ userId, tenantId, role }`.
- **Password storage**: `bcryptjs`, cost factor 12 for user-set passwords (cost 10 for system-generated/OAuth placeholder passwords).
- **Refresh tokens**: `RefreshToken.js` model — separate from the JWT access token, supports blacklisting (`isBlacklisted`).
- **Session tracking**: `UserSession.js` records `ipAddress`, `userAgent`, `lastActivity` per login.
- **2FA / OTP**: `Otp.js` model (`purpose: login/2fa`, `expiresAt`, `attempts`) backs email-based OTP login and 2FA toggle (`users.js`).
- **Google OAuth**: `google-auth-library`, `User.googleId`.
- Full detail in [Security Documentation](../Security/01-security-documentation.md).

## 6. Data flow example — Application submission (illustrative)
```
Candidate (career page, public)
   → POST /api/applications/public (no auth)
   → applications.js: find-or-create guest Candidate by email; reject duplicate (409)
   → Application.create({ tenantId, jobId, candidateId, currentStage: 'Applied' })
   → Notification.create(...) for org admins/super_admins
   → (optional) Socket.io emits real-time notification to connected admin clients
   → Recruiter views Pipeline → matchBreakdown computed (rule-based, see Application.js)
```

## 7. Tech stack summary
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router |
| Backend | Node.js ≥20, Express 4 |
| Database | MongoDB Atlas, Mongoose 8 |
| Real-time | Socket.io |
| Auth | JWT (jsonwebtoken), bcryptjs, Google OAuth |
| Security middleware | helmet, cors, express-rate-limit, cookie-parser |
| Email | Resend API + SMTP (Zoho) |
| SMS/WhatsApp | Twilio, Fast2SMS |
| Media storage | Cloudinary |
| Payments | Razorpay |
| Push notifications | Web Push (VAPID) |
| AI/text extraction | `mammoth` (docx parsing for resumes), Gemini API (where used — verify scope against [AI/ML claims item](../Technical/03-technical-debt-analysis.md#10-aiml-claims-vs-reality)) |
| Hosting | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

## 8. Known architectural debt
See [Technical Debt Analysis](../Technical/03-technical-debt-analysis.md) for the full list, especially:
- No shared API response normalization layer (#2)
- No shared ID/ObjectId normalization at the API boundary (#3)
- `Organization.js` vs `Tenant.js` duplication (#1)
- No OpenAPI contract / route-existence CI check (#6)
