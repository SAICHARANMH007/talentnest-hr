# TalentNest HR — PLAYBOOK v12
## PWA, Service Worker, Web Push Notifications & Mobile Layouts
**Date:** 2026-04-04 | **Branch:** main | **Commit:** 81b57f1

---

## Files Created

| File | Purpose |
|------|---------|
| `public/manifest.json` | PWA Web App Manifest |
| `public/sw.js` | Service Worker (caching + push handler) |
| `public/offline.html` | Offline fallback page |
| `public/icons/README-icons.txt` | Instructions for adding PNG icons |
| `backend/src/models/PushSubscription.js` | Mongoose model for push subscriptions |
| `backend/src/utils/sendPush.js` | Utility to send push to a user |
| `backend/src/routes/push.js` | REST API for push subscription management |
| `src/hooks/usePushNotifications.js` | React hook for auto-subscribing |

## Files Modified

| File | Change |
|------|--------|
| `index.html` | Added `<link rel="manifest">`, theme-color meta, Apple PWA meta tags |
| `src/main.jsx` | Service worker registration (production only) |
| `src/App.jsx` | Import + call `usePushNotifications` hook |
| `src/index.css` | Touch targets (44px min), table-scroll, full-screen modals, mobile pipeline CSS |
| `src/pages/recruiter/RecruiterPipeline.jsx` | Mobile collapsible stage sections |
| `backend/server.js` | Registered `/api/push` route |
| `backend/src/routes/applications.js` | Push on stage change |
| `backend/src/routes/offers.js` | Push on offer signing |
| `backend/src/routes/assessments.js` | Push on assessment submission |
| `backend/package.json` | Added `web-push` dependency |

---

## How PWA Works

### Manifest
`/public/manifest.json` tells browsers the app is installable:
- `display: "standalone"` — opens without browser UI
- `start_url: "/"` — always opens the marketing homepage
- Icons: uses `/logo.svg` (any size) + PNG stubs in `/public/icons/`
- Brand colors: `background_color: #032D60`, `theme_color: #0176D3`

### Service Worker (`/public/sw.js`)
Registered in `src/main.jsx` only in production (`import.meta.env.PROD`):
```js
navigator.serviceWorker.register('/sw.js', { scope: '/' })
```

Caching strategy:
- **Install**: Caches `/`, `/offline.html`, `/logo.svg`, `/manifest.json`
- **Activate**: Deletes old cache versions (`talentnest-v1` is current)
- **Fetch**: Navigation → network-first, fallback to `/offline.html`; Static assets → cache-first
- **API calls** (`/api/*`) are never intercepted by the SW

### Push Notification Handler in SW
The SW listens for `push` events and shows native OS notifications.
On notification click, it focuses/opens the tab with the linked URL.

---

## How Push Notifications Work End-to-End

### VAPID Keys
VAPID (Voluntary Application Server Identification) is the standard for web push.

**Generate keys once:**
```bash
npx web-push generate-vapid-keys
```

This outputs:
```
Public Key:  Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
Private Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Add to Railway environment variables:**
```
VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_EMAIL=hello@talentnesthr.com
```

If these env vars are not set, push is silently disabled — nothing breaks.

### Subscribe Flow (Frontend → Backend)
1. User logs in → `usePushNotifications` hook fires after 30-second delay
2. Hook calls `GET /api/push/vapid-public-key` → gets public key
3. Calls `Notification.requestPermission()` → browser prompts user
4. If granted: subscribes via `pushManager.subscribe()` → browser returns a push subscription object
5. Sends subscription object to `POST /api/push/subscribe` (authenticated)
6. Backend saves to `PushSubscription` MongoDB collection
7. Stores `tn_push_subscribed=true` in localStorage to avoid re-prompting

### Send Flow (Backend Event → User Device)
1. An event happens (stage change, offer signed, assessment submitted)
2. Route calls `sendPush(userId, { title, body, url })` from `backend/src/utils/sendPush.js`
3. `sendPush` finds all active `PushSubscription` docs for that user
4. Calls `webpush.sendNotification(subscription, payload)` for each
5. If subscription is expired (404/410), it is marked `isActive: false`
6. SW receives the push event → calls `showNotification()`

### Events That Trigger Push Notifications

| Event | File | Recipient |
|-------|------|-----------|
| Application stage changed | `applications.js` PATCH `/:id/stage` | Job creator (`job.createdBy`) |
| Offer letter signed | `offers.js` POST `/:id/sign` | Offer creator (`offer.createdBy` or `recruiterId`) |
| Assessment submitted | `assessments.js` POST `/:id/submit` | Assessment creator (`assessment.createdBy`) |

### Unsubscribe
`DELETE /api/push/unsubscribe` marks all subscriptions for the current user as inactive.

---

## New Environment Variables Required

| Variable | Required | Description |
|----------|----------|-------------|
| `VAPID_PUBLIC_KEY` | Yes (for push) | VAPID public key from `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Yes (for push) | VAPID private key |
| `VAPID_EMAIL` | No (has default) | Mailto for VAPID contact, default: `hello@talentnesthr.com` |

All three can be absent — push is simply skipped, no errors thrown.

---

## Mobile Layout Changes

### Global CSS (`src/index.css`)
- `button, a, input, select, textarea { min-height: 44px }` — WCAG touch target minimum
- `.table-scroll` wrapper makes any table horizontally scrollable with sticky first column on mobile
- `[role="dialog"]` and `.modal-overlay > div` become full-screen (100vw/100vh) on mobile ≤768px
- `.pipeline-mobile-section` styles for collapsible stage `<details>` elements on ≤500px

### RecruiterPipeline.jsx
On screens ≤500px: the flat applicant list is replaced by collapsible `<details>` sections grouped by pipeline stage.
- Each `<details>` = one stage; `<summary>` shows stage name + candidate count
- First stage (`Applied`) is open by default; rest are collapsed
- Desktop: unchanged flat list

### Layout.jsx
The existing mobile sidebar (slide-in from left with hamburger) was already implemented in a previous sprint. No changes needed.

---

## PWA Icons
Actual PNG files must be added manually to `public/icons/`:
- `icon-192.png` — 192×192 pixels
- `icon-512.png` — 512×512 pixels

See `public/icons/README-icons.txt` for instructions. The manifest falls back to `/logo.svg` (any size) if PNGs are missing.

---

## Build Result
```
✓ 161 modules transformed
✓ built in 15.54s
Zero errors, zero warnings
```

## Git Commit
`81b57f1` — feat: PWA manifest, service worker, web push notifications, and mobile-responsive layouts
