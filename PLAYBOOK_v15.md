# PLAYBOOK v15 — Security Hardening (2FA SMS, Session Management, Google SSO Fix)

**Date:** 2026-04-06
**Commit:** `a3f7bb5`
**Task Group:** 8

---

## Files Created

| File | Purpose |
|------|---------|
| `backend/src/utils/sendSms.js` | Fast2SMS REST API wrapper (no SDK) — console fallback in dev when no API key |
| `backend/src/models/UserSession.js` | Active session tracking — device info, browser, OS, IP, TTL index; `parseUA()` static helper |
| `src/components/shared/SecuritySettings.jsx` | 2FA toggle + active sessions list UI (device names, bulk/per-session sign-out) |

## Files Modified

| File | Change |
|------|--------|
| `backend/src/services/auth.service.js` | Creates UserSession on every login; SMS OTP with email fallback; session list/terminate/terminateOthers methods; verifyGoogleToken via google-auth-library; marks UserSession inactive on token rotation |
| `backend/src/routes/auth.js` | POST /2fa/toggle, GET /sessions, DELETE /sessions/others, DELETE /sessions/:id; logout marks session inactive; Google SSO creates solo Tenant for candidates with no matching org |
| `src/pages/shared/ProfilePage.jsx` | SecuritySettings section added below Change Password block |
| `src/pages/auth/AuthScreen.jsx` | `OtpScreen` component (6-digit input, verify, resend); `requires2FA` handling in CandidateForm and EmployerForm — redirects to OtpScreen on 2FA-enabled login |
| `src/api/services/auth.service.js` | Added `verifyOtp(email, otp)` — stores token in memory + sessionStorage |
| `src/api/services/platform.service.js` | `toggle2FA`, `getSessions`, `terminateSession`, `terminateOtherSessions` |

---

## 2FA Flow

```
Login POST /api/auth/login
  └─ user.twoFactorEnabled === true
       ├─ generateAndSendOtp():
       │    ├─ SMS via Fast2SMS if user.phone exists
       │    └─ Email via Resend as fallback
       └─ returns { requires2FA: true, email }
            │
            ▼
       Frontend shows OtpScreen
            │
       User types 6-digit OTP → POST /api/auth/verify-otp
            │
       Token + UserSession issued → logged in
```

## Session Management

```
Every successful login:
  → RefreshToken created (existing)
  → UserSession created (new) — links refreshToken, IP, UA, device info

GET /api/auth/sessions → list active sessions for current user
DELETE /api/auth/sessions/:id → terminates specific session
DELETE /api/auth/sessions/others → sign out all except current

Frontend: SecuritySettings component on Profile page
  → 2FA toggle (with SMS/email channel hint based on user.phone)
  → Sessions list with device names, last active, IP
  → "Sign out X others" bulk action
  → Per-session "Sign out" button
```

## Google SSO Fix

**Problem:** Google sign-up created users with `tenantId: null` which violated the required field constraint.

**Fix:** For candidates with no matching org domain, create a solo personal Tenant automatically:
```js
tenant = await Tenant.create({
  name: payload.name + ' (Personal)',
  slug: `personal-${crypto.randomBytes(4).toString('hex')}`,
  domain, plan: 'free',
});
```
For employers: return 403 if no org found — they must be invited by an admin.

## Environment Variables Required

| Var | Purpose |
|-----|---------|
| `FAST2SMS_API_KEY` | SMS delivery (Fast2SMS). Omit for dev — console.log fallback |
| `GOOGLE_CLIENT_ID` | Google OAuth (already required for frontend sign-in button) |

---

## Next: Task Group 9 — Onboarding & Pre-boarding
- PreBoarding model (auto-created on offer signing)
- Pre-boarding dashboard with task checklist + completion tracking
- Joining confirmation tracker cron
- Welcome kit automation cron
