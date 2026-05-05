# TalentNest HR — Phase 3: Authentication & Role Routing
**Date:** 2026-04-03
**Build result:** ✅ Zero errors (144 modules, 12s)

---

## Files Changed / Created

| File | Status | Change |
|---|---|---|
| `backend/src/middleware/auth.js` | **REBUILT** | `authMiddleware` is now the primary named export. `authenticate` kept as alias for backward compat. `signToken` now embeds `tenantId` + `role` in the JWT payload. `req.user` always has `id`, `userId`, `tenantId`, `role`. |
| `backend/src/middleware/rbac.js` | **NEW** | `allowRoles(...roles)` middleware factory. Returns 403 if `req.user.role` not in the allowed list. |
| `backend/src/middleware/tenantGuard.js` | **NEW** | Checks every non-`super_admin` request has a valid, active tenant. Skips super_admin. Returns 403 for missing tenantId, missing tenant, suspended, or expired subscription. Attaches `req.tenant` for downstream use. |
| `backend/src/middleware/agencyOnly.js` | **NEW** | Returns 403 with "This feature is for recruitment agencies only." if `req.tenant.isRecruitmentAgency` is not `true`. Requires `tenantGuard` to run first. |
| `backend/src/middleware/auditLogger.js` | **NEW** | After-the-fact middleware for POST/PUT/PATCH/DELETE. Writes one `AuditLog` record per successful (2xx) mutation. Fire-and-forget — never blocks the response. Strips `password`, `passwordHash`, `token`, `secret`, `otp`, `newPassword`, `currentPassword` from logged body. |
| `backend/src/middleware/logger.js` | **FIXED** | `AuditLog.create` call updated — `orgId` → `tenantId`, removed `status` field (no longer in schema). |
| `backend/src/routes/auth.js` | **REBUILT** | Full rebuild. See routes table below. |
| `backend/src/services/auth.service.js` | **UPDATED** | `issueTokens` now embeds `tenantId` in the JWT. Returns `redirect` field with role-based path (`/superadmin/dashboard`, `/admin/dashboard`, etc.). |
| `src/App.jsx` | **UPDATED** | `auth()` callback now uses `ROLE_DEFAULT` map for all 5 roles: `super_admin`+`admin` → analytics, `recruiter`+`candidate`+`client` → dashboard. |

---

## Auth Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Creates Tenant + admin User in one Mongoose session transaction. Returns JWT + redirect. |
| `POST` | `/api/auth/login` | Public | Checks `passwordHash` (falls back to `password` for legacy records). Brute-force lock after 5 failures. Returns JWT with `tenantId` + `redirect`. |
| `POST` | `/api/auth/logout` | Public | Deletes refresh token from DB, clears cookie. |
| `POST` | `/api/auth/refresh` | Public | Rotates refresh token, issues new access token. |
| `POST` | `/api/auth/forgot-password` | Public | Sends reset link via Resend. Always returns 200 (no enumeration). |
| `POST` | `/api/auth/reset-password/:token` | Public | URL-param token reset (new). |
| `POST` | `/api/auth/reset-password` | Public | Body-token reset (legacy alias). |
| `POST` | `/api/auth/set-password/:inviteToken` | Public | Invite flow — matches `inviteToken` field or legacy `resetPasswordToken`. Sets `passwordHash`, clears tokens, activates user. |
| `POST` | `/api/auth/set-password` | Public | Legacy body-token version (kept for SetPasswordPage.jsx). |
| `POST` | `/api/auth/change-password` | `authMiddleware` | Self-service or forced change when `mustChangePassword` is true. |
| `GET`  | `/api/auth/me` | `authMiddleware` | Returns current user profile (no sensitive fields). |
| `POST` | `/api/auth/verify-otp` | Public | Completes 2FA login. |
| `POST` | `/api/auth/impersonate` | `authMiddleware` | Super admin only. Issues tokens for target user. |
| `POST` | `/api/auth/google` | Public | Google OAuth. Resolves tenant from email domain. |
| `POST` | `/api/auth/verify-domain` | Public | Legacy domain-check (kept for frontend). |
| `GET`  | `/api/auth/verify-invite` | Public | Validates invite token before showing set-password form. |

---

## Role → Redirect Mapping

| Role | Backend `redirect` | Frontend default page |
|---|---|---|
| `super_admin` | `/superadmin/dashboard` | `analytics` |
| `admin` | `/admin/dashboard` | `analytics` |
| `recruiter` | `/recruiter/dashboard` | `dashboard` |
| `candidate` | `/candidate/dashboard` | `dashboard` |
| `client` | `/client/dashboard` | `dashboard` |

---

## Decisions Made

### Why keep `authenticate` as an alias?
All existing routes (`jobs.js`, `applications.js`, `users.js`, etc.) import `{ authenticate }` from `auth.js`. Renaming without updating ~15 route files would break the backend. The alias costs nothing and lets routes migrate to `authMiddleware` incrementally in Phase 4.

### Why keep `password` fallback in login?
Existing records in MongoDB have `password` (hashed). After the Phase 2 model change to `passwordHash`, any user who has not logged in since Phase 2 would be locked out. The `||` fallback (`user.passwordHash || user.password`) ensures zero downtime migration — the old hash still works until the user changes their password (which writes `passwordHash`).

### Why transaction in `/register`?
Tenant + User creation must be atomic. If User creation fails after Tenant is written, a dangling Tenant with no admin would exist. `mongoose.startSession()` + `withTransaction` ensures rollback on failure. Note: requires MongoDB replica set or Atlas — standalone mongod does not support transactions.

### Why `auditLogger` intercepts `res.json` instead of using `res.on('finish')`?
`res.on('finish')` fires after the response is sent but `req.body` may have been consumed by then in some Node.js versions. Intercepting `res.json` gives access to both the outgoing status code and the request body in the same synchronous frame.