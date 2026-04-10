# PLAYBOOK v13 — Two-Way WhatsApp Bot (Twilio)

**Date:** 2026-04-04
**Commit:** `0fe22ed`

---

## Files Created

| File | Purpose |
|------|---------|
| `backend/src/models/WhatsAppSession.js` | Tracks pending numbered-reply sessions per candidate (48h TTL) |
| `backend/src/models/WhatsAppLog.js` | Immutable log of every inbound/outbound WA message |
| `backend/src/utils/sendWhatsApp.js` | Twilio REST fetch wrapper — NO SDK |
| `backend/src/routes/whatsapp.js` | All WhatsApp endpoints including webhook |
| `src/components/shared/BulkWhatsAppModal.jsx` | Bulk send UI with live preview + progress counter |

## Files Modified

| File | Change |
|------|--------|
| `backend/server.js` | Registered `/api/whatsapp` route; added `/whatsapp/webhook` to CSRF exempt list |
| `src/api/services/platform.service.js` | Added `sendBulkWhatsApp`, `getWhatsAppLogs`, `createWhatsAppSession` |
| `src/components/modals/InterviewModal.jsx` | Creates WhatsApp session after interview is scheduled |
| `src/pages/recruiter/RecruiterCandidates.jsx` | Replaced inline WA modal with `BulkWhatsAppModal` component |

---

## WhatsApp Webhook Flow

```
Twilio → POST /api/whatsapp/webhook (form-encoded)
  │
  ├─ Signature verification (HMAC-SHA1, skipped if TWILIO_AUTH_TOKEN not set)
  ├─ Dedup by MessageSid (WhatsAppLog lookup)
  ├─ Inbound log saved
  ├─ Candidate lookup by phone (User model, last-10-digit matching)
  │    └─ If not found → reply "not registered"
  │
  ├─ Session lookup (WhatsAppSession — candidatePhone, isResolved=false, expiresAt>now)
  │    └─ If active session AND reply is "1", "2", or "3"
  │         ├─ type=interview-confirm → handleInterviewReply
  │         │    ├─ 1 → rounds[idx].status = 'confirmed'
  │         │    ├─ 2 → rounds[idx].status = 'reschedule-requested'
  │         │    └─ 3 → rounds[idx].status = 'declined'
  │         │    └─ Notify recruiter via sendPush + Notification
  │         └─ type=offer-response → handleOfferReply
  │              ├─ 1 → offer.verballyAccepted = true
  │              └─ 2 → offer.status = 'discussion-requested'
  │              └─ Notify recruiter via sendPush + Notification
  │
  └─ No active session → handleStatusEnquiry (bot replies with current stage + next interview)
```

---

## Session Types & Numbered Reply Mapping

### interview-confirm
| Reply | Meaning | Application Update |
|-------|---------|--------------------|
| 1 | Confirm | `interviewRounds[idx].status = 'confirmed'` |
| 2 | Request reschedule | `interviewRounds[idx].status = 'reschedule-requested'` |
| 3 | Decline | `interviewRounds[idx].status = 'declined'` |

### offer-response
| Reply | Meaning | OfferLetter Update |
|-------|---------|--------------------|
| 1 | Verbal acceptance | `verballyAccepted = true`, `verbalAcceptedAt = now` |
| 2 | Want to discuss | `status = 'discussion-requested'` |

Sessions expire after **48 hours**. `isResolved` is set to `true` once handled.

---

## Template Variables for Bulk Send

POST `/api/whatsapp/bulk-send` accepts `messageTemplate` with these placeholders:

| Variable | Replaced with |
|----------|--------------|
| `{{CandidateName}}` | `recipient.name` |
| `{{JobTitle}}` | `recipient.jobTitle` |
| `{{CompanyName}}` | `recipient.companyName` |
| `{{RecruiterName}}` | `recipient.recruiterName` |
| `{{InterviewDate}}` | `recipient.interviewDate` |

Rate limiting: 1 second delay between each message send.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/whatsapp/webhook` | Public | Twilio webhook verification |
| POST | `/api/whatsapp/webhook` | Public (Twilio) | Inbound message handler |
| POST | `/api/whatsapp/send` | recruiter+ | Send single message |
| POST | `/api/whatsapp/bulk-send` | recruiter+ | Bulk send with template vars |
| POST | `/api/whatsapp/create-session` | recruiter+ | Create pending reply session |
| GET | `/api/whatsapp/logs` | recruiter+ | Message history (paginated) |

---

## Configuring Twilio Webhook URL

In Twilio Console → Messaging → WhatsApp Senders → your number → "When a message comes in":

```
https://api.talentnesthr.com/api/whatsapp/webhook
Method: HTTP POST
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (from console) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token (for signature verification) |
| `TWILIO_WHATSAPP_FROM` | Sender number, e.g. `whatsapp:+14155238886` (sandbox default) |
| `BACKEND_URL` | Full URL of backend, e.g. `https://api.talentnesthr.com` (used for signature check) |

If `TWILIO_ACCOUNT_SID` or `TWILIO_AUTH_TOKEN` are not set, `sendWhatsApp` logs a warning and returns `{ ok: false, reason: 'not_configured' }` — no crash.

If `TWILIO_AUTH_TOKEN` is not set, signature verification is skipped (dev-friendly).

---

## Testing Locally with ngrok

1. Start backend: `cd backend && npm run dev`
2. In a new terminal: `ngrok http 5000`
3. Copy the HTTPS forwarding URL, e.g. `https://abc123.ngrok.io`
4. Set `BACKEND_URL=https://abc123.ngrok.io` in `backend/.env`
5. Set Twilio webhook to `https://abc123.ngrok.io/api/whatsapp/webhook`
6. Use Twilio sandbox: send `join <sandbox-keyword>` to `+14155238886` from your WhatsApp
7. Send any message → the bot will look up your phone in the DB and respond

---

## BulkWhatsAppModal Component

Located at `src/components/shared/BulkWhatsAppModal.jsx`.

**Props:**
- `candidates` — array of selected candidate objects
- `jobTitle` — string (pre-fills `{{JobTitle}}`)
- `companyName` — string (pre-fills `{{CompanyName}}`)
- `recruiterName` — string (pre-fills `{{RecruiterName}}`)
- `onClose` — `() => void`
- `onComplete` — `(summary: string) => void` — called after send with "X sent, Y failed" string

**Features:**
- Live preview below textarea using first candidate's actual data
- Progress bar that advances ~1 message/second while sending
- Summary banner on completion: "X sent successfully / Y failed"
- Resets selection via `onComplete` callback

---

## Limitations

1. **Twilio sandbox** requires candidates to opt-in by texting `join <keyword>` first. Production WhatsApp Business API approval needed for unrestricted messaging.
2. **OfferLetter model** does not currently have `verballyAccepted` or `verbalAcceptedAt` fields — they are set dynamically; add them to the schema for persistence.
3. **Phone field** must be populated on User/Candidate records for session matching and status enquiry to work. If no phone number, WhatsApp features are silently skipped.
4. **interviewRoundIndex** in session uses the round count at scheduling time — if rounds are deleted/reordered before candidate replies, the wrong round may be updated.
