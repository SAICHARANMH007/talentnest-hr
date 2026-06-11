# Operations Documentation

## 1. Environments
| Environment | Frontend | Backend | Database |
|---|---|---|---|
| Production | Vercel (`talentnesthr.com` / `www.talentnesthr.com`) | Render (`talentnest-hr-backend`, `*.onrender.com`) | MongoDB Atlas (production cluster) |
| Preview/Staging | Vercel preview deployments (`*.vercel.app`, auto-created per branch/PR) | Render (shared, or preview env if configured) | Atlas (verify whether preview shares prod cluster — not confirmable from code) |
| Local dev | `npm run dev` (Vite) | `npm run dev` (nodemon) | Local MongoDB or Atlas dev cluster via `MONGODB_URI` |

## 2. Deploy process (current, as inferred from config)
1. Push commits to `main` (or merge a feature branch into `main`).
2. **Vercel**: auto-builds (`npm run build` → `dist`) and deploys the frontend on push (native Git integration — no explicit GitHub Actions workflow found).
3. **Render**: auto-builds (`npm install`) and restarts (`node server.js`) the backend on push to the connected branch (native Git integration).
4. **No automated test gate** runs between push and deploy — see [Technical Debt #8](../Technical/03-technical-debt-analysis.md#8-no-automated-test-suite-identified). The only pre-deploy verification observed historically is `npx vite build` (catches syntax errors, not runtime/logic errors).
5. **Health check**: Render polls `GET /api/health` to determine instance health; `/api/platform/health` is also publicly exposed for external monitoring (per [API Documentation](../Technical/02-api-documentation.md)).

## 3. Monitoring & observability (current state)
- **Request logging**: `morgan` (`combined` format in production, `dev` format otherwise) — logs to stdout, captured by Render's log viewer.
- **No APM/error-tracking service** (e.g., Sentry, Datadog) was identified in dependencies — errors are only visible via Render logs and (for frontend) browser console / Vercel function logs.
- **No uptime monitoring / alerting** configuration was identified in the codebase (may exist as an external service not represented in code — e.g., UptimeRobot pinging `/api/platform/health`).
- **Audit trail**: `AuditLog.js` + `/api/audit` provides an in-app change history for tenant admins and super admins, but this is a business audit log, not infrastructure monitoring.

## 4. Routine operational tasks
| Task | How (current) |
|---|---|
| Database seeding (new env) | `npm run seed`, `npm run seed:fresh`, `npm run seed:automations` (backend scripts) |
| Rotating secrets (`JWT_SECRET`, `COOKIE_SECRET`, API keys) | Manual update in Render env vars (`sync: false` — not version controlled); requires backend restart |
| Checking platform health | `GET /api/platform/health` (public) or `/api/health` |
| Reviewing tenant activity | Super Admin → Audit Logs (`/api/audit`, cross-tenant) |
| Investigating tenant issues | Super Admin → Orgs page + Audit (per [User Journey Maps §5](../Product/09-user-journey-maps.md)) |
| Generating up-to-date documentation/playbooks | Super Admin → Playbooks (`/app/playbooks`) — Preview/Download/Download All (11 playbook types, all verified working as of commit `d5fd074`) |

## 5. Incident response (current state — informal)
- No formal incident-response runbook or escalation policy was found in the codebase.
- Given no error-tracking integration, incident detection currently relies on: (a) Render health-check failures/restarts, (b) user-reported issues, (c) manual log review.
- **Recommendation**: see [Roadmap — Missing Features Analysis](../Roadmap/02-missing-features-analysis.md) for suggested operational tooling additions (error tracking, uptime alerts, structured logging).

## 6. Backup & disaster recovery
- **Database backups**: managed by MongoDB Atlas (automatic backups are an Atlas tier feature — actual backup frequency/retention depends on the Atlas plan selected, not visible in code).
- **Media backups**: Cloudinary-managed (third-party durability).
- **No application-level backup/export tooling** was identified beyond the existing data-export features for end users (e.g., `dashboard.js` "exports" mentioned in [API Documentation](../Technical/02-api-documentation.md)).
- **No documented disaster-recovery runbook** (RTO/RPO targets, failover procedure) was found.

## 7. Capacity & scaling notes
- Global rate limit (20,000 req/15min/IP) is explicitly commented as sized for "high-traffic office proxies and 100+ active users" — suggests current scale target is small-to-mid tenant counts with shared-IP office environments (NAT).
- Single Render web service (no autoscaling config visible in `render.yaml`) — horizontal scaling would require Render plan changes plus addressing any in-process state assumptions (e.g., Socket.io would need sticky sessions or a shared adapter like `socket.io-redis` if scaled beyond one instance — **not currently configured**).

## 8. PLANNED FUTURE CAPABILITY
- CI/CD pipeline with automated test gate (depends on [QA Strategy](../QA/01-qa-strategy.md) test suite being built first).
- Error tracking/APM integration (Sentry or similar).
- Documented incident-response runbook with escalation tiers.
- Horizontal scaling plan for Socket.io (Redis adapter or equivalent) if/when traffic exceeds single-instance capacity.
- Scheduled background-job runner for email sequences / webhook retries (currently lazy/on-request — see [Architecture Documentation §3](../Architecture/01-architecture-documentation.md#3-backend-architecture)).
