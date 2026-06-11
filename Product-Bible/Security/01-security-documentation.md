# Security Documentation

## 1. Authentication
- **Mechanism**: JSON Web Tokens (`jsonwebtoken`), signed with `JWT_SECRET` (env-configured), payload `{ userId, tenantId, role }`, default expiry `30d` (`JWT_EXPIRES` env override).
- **Password hashing**: `bcryptjs`, cost factor **12** for all user-initiated password sets/resets/changes (`backend/src/routes/auth.js`); cost factor 10 used only for system-generated placeholder passwords (e.g., OAuth-only accounts that never log in with a password).
- **Google OAuth**: `google-auth-library` verifies Google ID tokens server-side; links to `User.googleId`.
- **OTP / 2FA**: `Otp.js` model — `email`, `otp`, `purpose` (`login`/`2fa`), `expiresAt`, `attempts` (bounds brute-force attempts on the OTP itself). `User.twoFactorEnabled` toggle in `users.js`.
- **Refresh tokens**: `RefreshToken.js` — `userId`, `token`, `expiresAt`, `isBlacklisted`, allowing token revocation on logout without waiting for JWT expiry.
- **Session/device tracking**: `UserSession.js` — `userId`, `tenantId`, `ipAddress`, `userAgent`, `expiresAt`, `lastActivity`.
- **Cookies**: signed via `cookie-parser` using `COOKIE_SECRET`. **Note**: the codebase has a hardcoded fallback (`'talent_nest_secure_cookie_secret_2024'`) if `COOKIE_SECRET` is unset — operationally, `COOKIE_SECRET` **must** be set in Render to avoid using this default in production.

## 2. Authorization
- **`authenticate` middleware** (`backend/src/middleware/auth.js`): verifies the JWT, attaches `req.user = { userId, tenantId, role }`.
- **`tenantGuard` middleware** (`backend/src/middleware/tenantGuard.js`): enforces that all data access is scoped to `req.user.tenantId`, preventing cross-tenant data leakage on shared collections.
- **`allowRoles(...role)` middleware**: route-level RBAC — e.g., `allowRoles(admin/super_admin)` for invite endpoints, `allowRoles(super_admin)` for platform-wide admin actions.
- **Role hierarchy** (7 roles): `super_admin` (platform operator, cross-tenant) > `admin` (tenant admin) > `recruiter`/`hiring_manager`/`placement_officer` (tenant operational roles) > `client` (staffing-agency client, scoped) > `candidate` (own-data only).

## 3. Network & transport security
- **Helmet**: applied globally (`crossOriginResourcePolicy: cross-origin`, `contentSecurityPolicy: false` — CSP is **not** enforced server-side; CSP-equivalent headers are instead set per-route at the Vercel edge via `vercel.json`, e.g., `frame-ancestors *` for embeddable career pages).
- **CORS**: explicit allow-list (see [Deployment Documentation §5](../Architecture/02-deployment-documentation.md#5-cors-allow-list-defines-which-frontends-can-call-the-api)) — rejects unrecognized origins with an error rather than a wildcard `*`.
- **HTTPS**: enforced at the platform level by Vercel (frontend) and Render (backend) — no custom TLS termination in the codebase.
- **Vercel security headers** (`vercel.json`): `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` (default; relaxed to `ALLOWALL` only for embeddable `/:orgSlug/careers` pages), `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(self), geolocation=(self)`.

## 4. Rate limiting (`express-rate-limit`, applied in `server.js`)
| Scope | Window | Max requests | Notes |
|---|---|---|---|
| Global `/api/*` | 15 min | 20,000 / IP | Sized for "high-traffic office proxies and 100+ active users" per inline comment |
| `/api/auth/login` | 15 min | 500 / IP | |
| `/api/auth/register` | 15 min | 500 / IP | |
| `/api/admin/invite-admin` | 1 hr | 200 / IP | |
| `/api/admin/invite-recruiter` | 1 hr | 200 / IP | |
| `/api/admin/resend-invite` | 1 hr | 200 / IP | |
| `/api/email` | 1 hr | 200 / IP | |

All rate-limit responses return `{ success: false, error: '<message>' }` with HTTP 429 (default `express-rate-limit` status).

## 5. Audit logging
- `AuditLog.js` model: `tenantId`, `userId`, `action`, `entityType`, `entityId`, `oldValue`, `newValue`, `timestamp`, `ipAddress`.
- Exposed via `audit.js` (`/api/audit`, `authenticate` + `allowRoles(admin/super_admin)` + `tenantGuard`) — tenant admins see their own tenant's audit trail; super admins can investigate cross-tenant (per [User Journey Maps §5](../Product/09-user-journey-maps.md)).

## 6. Invite & token security
- **Secure invite tokens**: `Invite.js` (`email`, `token`, `type: signup/join`, `expiresAt`, `usedAt`) — admin invites (recruiters, hiring managers, etc.) use single-use, expiring tokens delivered via email.
- **Alternative delivery**: admins can also choose "temp password" delivery for invitees (per [Workflow Diagrams §2](../Product/08-workflow-diagrams.md)) — operational tradeoff between convenience and the stronger guarantees of token-based activation.
- **Application invite tokens**: `applications.js` exposes a public `/invite/:token` endpoint for candidate-facing application invites (WhatsApp/SMS), separate from the user-account `Invite.js` flow.
- **Scheduling tokens**: `SchedulingLink.js` (`token`, `slug`) — public token-based interview self-scheduling, verified without full authentication.
- **Webhook signature verification**: `whatsapp.js` (Twilio webhook) and `billing.js` (Razorpay webhook) verify provider signatures before processing inbound payloads.

## 7. Input validation & file uploads
- JSON body size limits: `10MB` default, `25MB` for `/api/users/bulk-import` (CSV/Excel imports).
- Resume parsing (`parseResume.js`, `mammoth` for `.docx`) — accepts public or authenticated uploads; structured-data extraction only, not arbitrary file execution.
- Media uploads (resumes, video resumes, BGV docs, profile images) are proxied to **Cloudinary** rather than stored on the application server filesystem — reduces server-side file-handling attack surface.

## 8. Data isolation & privacy posture
- **Tenant isolation**: enforced via `tenantGuard` + `tenantId` on (almost) every model — see [Database Documentation §"Multi-tenancy convention"](../Technical/01-database-documentation.md#multi-tenancy-convention).
- **Soft deletes**: `deletedAt` field, filtered from default queries — supports recoverability and avoids hard-delete data loss, but means deleted PII persists in the database until a retention/purge process runs (no such purge process currently identified — see [Compliance Documentation](../Compliance/01-compliance-documentation.md)).
- **BGV documents**: `BgvDocument.js` (`documentType: aadhar/pan/ssn/passport`, `documentUrl`, `verificationStatus`, `verifiedBy`) — stores **document files** (via Cloudinary) and verification metadata, but is distinct from the zero-PII-storage **Aadhaar-Linked Verification** `PLANNED FUTURE CAPABILITY` (which explicitly stores no document/biometric/Aadhaar number — see [Compliance Documentation](../Compliance/01-compliance-documentation.md)).

## 9. Known gaps / recommendations
| Gap | Risk | Recommendation |
|---|---|---|
| `COOKIE_SECRET` has a hardcoded fallback value in code | If unset in prod, signed cookies use a publicly-known secret | Enforce `COOKIE_SECRET` as a required env var (fail-fast on startup if unset in `NODE_ENV=production`) |
| `contentSecurityPolicy: false` in Helmet | No server-enforced CSP for the API responses themselves (HTML pages are SPA-served via Vercel, where headers are set separately) | Low risk for a JSON API, but document the reliance on Vercel-layer headers explicitly |
| No automated security test suite / dependency-scanning step identified in CI | Vulnerable dependencies could ship undetected | See [QA Strategy](../QA/01-qa-strategy.md) — add `npm audit` / Dependabot as a low-effort first step |
| No formal data-retention/purge policy for soft-deleted records | PII may be retained indefinitely after "deletion" | See [Compliance Documentation](../Compliance/01-compliance-documentation.md) |

## 10. PLANNED FUTURE CAPABILITY
- Aadhaar-Linked Candidate Verification (zero-PII-storage design — full spec in [Compliance Documentation](../Compliance/01-compliance-documentation.md)).
- Formal penetration-testing program / bug bounty.
- SOC 2 / ISO 27001 certification path.
