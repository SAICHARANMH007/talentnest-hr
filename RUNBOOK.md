# TalentNest HR — Operations Runbook

Plain English. No jargon. Enough detail that someone on-call for the first time can resolve most incidents.

---

## 1. Is the app up right now?

```bash
curl https://your-backend-url.railway.app/api/health
```

**Healthy response (HTTP 200):**
```json
{ "status": "ok", "db": "connected", "frontend": "bundled", "sentry": "enabled", "uptime": 3600, "timestamp": "..." }
```

**Degraded response (HTTP 503):**
```json
{ "status": "degraded", "db": "disconnected", ... }
```

If `db` is anything other than `"connected"`, the app cannot read or write data — see **Section 5**.

---

## 2. Required environment variables

Set all of these in Railway/Render → Environment Variables before first deploy.

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | Atlas connection string. `mongodb+srv://user:pass@cluster.mongodb.net/talentnest` |
| `JWT_SECRET` | Yes | 32+ character random string. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `COOKIE_SECRET` | Yes | 32+ character random string (same command) |
| `FRONTEND_URL` | Yes | Your Vercel frontend URL. Used for CORS. Example: `https://app.talentnesthr.com` |
| `BACKEND_URL` | Yes | The Railway/Render backend URL. Used in email links. Example: `https://api.talentnesthr.com` |
| `SENTRY_DSN` | Recommended | Paste the DSN from sentry.io. Errors appear in Sentry dashboard automatically. |
| `PORT` | No | Default 5000. Railway sets this automatically. |
| `NODE_ENV` | No | Set to `production` on Railway. |
| `RESEND_API_KEY` | No | Email delivery via Resend. Get free key at resend.com. Without it, emails are logged only. |
| `TWILIO_ACCOUNT_SID` | No | WhatsApp notifications. Without it, WhatsApp messages are logged only. |
| `TWILIO_AUTH_TOKEN` | No | WhatsApp notifications. |
| `TWILIO_WHATSAPP_FROM` | No | Default `whatsapp:+14155238886` (Twilio sandbox). |
| `SKIP_DEMO_SEED` | No | Set to `true` to skip seeding demo data on first boot. |

---

## 3. Deploying a new version

**Railway (recommended):**
1. Push to `main` branch — Railway auto-deploys.
2. Watch the build logs in Railway dashboard.
3. After deploy completes, call `/api/health` to confirm `"status": "ok"`.
4. If health check fails, click **Rollback** in Railway → Deployments → previous deploy.

**Manual deploy (emergency):**
```bash
git push origin main
# Railway picks it up automatically within 30 seconds
```

**Rolling back without Railway UI:**
```bash
git revert HEAD --no-edit
git push origin main
# This creates a new commit that undoes the last one
```

---

## 4. Monitoring errors

Sentry is integrated. Once `SENTRY_DSN` is set:
- All unhandled exceptions and AppErrors appear in your Sentry project.
- Errors are tagged with `environment: production`.
- No performance tracing is enabled (to keep costs at zero).

**Test that Sentry is working:**
```bash
curl -H "Authorization: Bearer <admin-jwt>" https://your-backend.railway.app/api/sentry-test
```
Check your Sentry dashboard for a new event within 30 seconds.

**Alert thresholds to set in Sentry:**
- Error rate > 10/min → Slack/email alert
- Any new `TypeError` or `MongoServerError` → immediate alert

---

## 5. Database is down (db = "disconnected")

**Step 1 — Check Atlas:**
1. Go to cloud.mongodb.com → your cluster.
2. Look at the "Metrics" tab for connection count and ops/sec.
3. If the cluster shows "Paused" (free tier auto-pauses after 60 days idle) → click **Resume**.

**Step 2 — Check the connection string:**
```bash
# On Railway, go to Environment Variables and verify MONGODB_URI starts with:
mongodb+srv://
# and contains your actual username/password, not placeholder text
```

**Step 3 — Restart the service:**
In Railway → your service → **Restart**. Mongoose auto-reconnects on boot.

**Step 4 — If Atlas is down:**
- Check status.mongodb.com for outages.
- The app will keep returning HTTP 503 on all authenticated routes until Atlas recovers.
- No data loss occurs — Atlas handles its own replication.

---

## 6. Database backups

**Atlas free tier (M0) — what's included:**
- No automated backups on M0. MongoDB Atlas M0 does not support Cloud Backup.
- Your data lives in a 3-node replica set — node failure does NOT cause data loss.
- A complete Atlas cluster failure (extremely rare) would lose all data.

**How to add backups (do this before going to production):**
1. Upgrade to Atlas M10 ($57/month) — this unlocks Cloud Backup.
2. In Atlas → your cluster → **Backup** → enable Continuous Cloud Backup.
3. Set a daily snapshot and 7-day retention.

**Manual backup (free tier workaround):**
```bash
# Run this daily via cron on any machine with mongodump installed:
mongodump --uri="$MONGODB_URI" --out="./backup-$(date +%Y%m%d)"
# Then compress and upload to S3 or Google Drive
tar -czf backup-$(date +%Y%m%d).tar.gz ./backup-$(date +%Y%m%d)
```

**Restore from backup:**
```bash
mongorestore --uri="$MONGODB_URI" --dir="./backup-20260101"
```

---

## 7. High memory / CPU on Railway

**Symptoms:** Requests time out, Railway shows memory > 500 MB.

**Immediate fix:**
- Railway → your service → **Restart** (clears memory leaks).

**Root causes to check:**
1. Very large file uploads (default multer limit is 50 MB — check `backend/server.js`).
2. A runaway aggregation query (check `GET /api/dashboard/stats` — it does 12+ DB calls).
3. A background job stuck in a retry loop.

**Longer term:**
- Use `GET /api/health` uptime field to detect unexpected restarts.
- Add Railway memory alert at 400 MB.

---

## 8. Email is not sending

**Symptom:** Candidates don't receive invite emails, job alerts, or offer letters.

**Check 1 — No RESEND_API_KEY:**
If `RESEND_API_KEY` is missing, emails are logged to console instead of sent. Set the key in Railway environment variables.

**Check 2 — Resend account:**
Log in to resend.com → Logs. Any failed sends appear here with the error message.

**Check 3 — Domain not verified:**
Resend requires your domain's SPF and DKIM records. See `SPF_SETUP.md` in this repo.

---

## 9. WhatsApp notifications are not sending

If `TWILIO_ACCOUNT_SID` or `TWILIO_AUTH_TOKEN` are missing, WhatsApp messages are logged to the server console but not sent. Check Railway logs.

If credentials are set but messages fail, check the Twilio console (console.twilio.com) for error codes. Common issue: the recipient's number is not opted in to the Twilio sandbox.

---

## 10. A candidate can't log in / register

1. Check `/api/health` — if DB is disconnected, auth fails for everyone.
2. If only one user: ask them to clear cookies and try again. JWT cookies are httpOnly.
3. If they clicked an email invite link and see a blank screen instead of a pre-filled form:
   - The invite URL must include `?ref=guest_invite&email=<email>&name=<name>`.
   - Check the email template in `backend/src/routes/invites.js` to confirm these params are present.

---

## 11. Useful one-liners

```bash
# Check current DB connection state
curl https://your-backend.railway.app/api/health | jq .

# Count total jobs in DB (requires mongosh)
mongosh "$MONGODB_URI" --eval "db.jobs.countDocuments()"

# Count active jobs
mongosh "$MONGODB_URI" --eval "db.jobs.countDocuments({ status: 'active', deletedAt: null })"

# Find the last 5 errors in Railway logs
# → go to Railway dashboard → your service → Logs → filter by "Error"
```

---

## 12. Contacts

| Role | Responsibility |
|------|---------------|
| Backend on-call | Railway deploys, DB, API errors |
| Frontend on-call | Vercel deploys, UI bugs |
| Atlas admin | MongoDB access, backup restore |

Update this table with real names and Slack handles before launch.
