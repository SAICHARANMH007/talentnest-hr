# Deployment Documentation

## 1. Topology
TalentNest HR deploys as **two independently-hosted services** plus a managed database — no containers, no Kubernetes, no IaC beyond the two config files below.

```
┌────────────────────┐       ┌──────────────────────────┐       ┌───────────────────────┐
│  Vercel (frontend)  │──────►│  Render (backend API)     │──────►│ MongoDB Atlas          │
│  vercel.json        │ /api/*│  render.yaml               │       │ (connection via        │
│  Vite SPA build     │ proxy │  talentnest-hr-backend     │       │  MONGODB_URI)          │
└────────────────────┘       └──────────────────────────┘       └───────────────────────┘
```

## 2. Frontend deployment (Vercel) — `vercel.json`
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Framework preset**: `vite`
- **API proxying**: `/api/:path*` and SEO/static endpoints (`/sitemap.xml`, `/sitemap-jobs.xml`, `/sitemap-pages.xml`, `/careers/jobs.xml`, `/careers/jobs.json`, `/jobs.xml`, `/robots.txt`, `/careers/job/:slug`, `/careers/crawl`) are rewritten to `https://talentnest-hr.onrender.com/...` — i.e., the backend serves these directly even though the request originates on the frontend domain.
- **Org-slug career pages** (`/:orgSlug/careers`, `/:orgSlug/careers/`) rewrite to `/index.html` (SPA handles routing client-side), with a dedicated header override (`X-Frame-Options: ALLOWALL`, `Content-Security-Policy: frame-ancestors *`) so these pages can be embedded in `<iframe>`s on customer websites.
- **Catch-all**: `/(.*)` → `/index.html` (standard SPA fallback for client-side routing).
- **Security headers** (applied to all routes): `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(self), geolocation=(self)`.
- **Caching**: `/assets/*` and static asset extensions (`js/css/woff*/png/svg/webp/avif`) get `Cache-Control: public, max-age=31536000, immutable`. `sw.js` (service worker) is explicitly `no-cache, no-store, must-revalidate`. Sitemaps cached 1 hour (`s-maxage=3600`).

## 3. Backend deployment (Render) — `render.yaml`
- **Service type**: `web`, `runtime: node`
- **Service name**: `talentnest-hr-backend`
- **Root directory**: `backend`
- **Build command**: `npm install`
- **Start command**: `node server.js`
- **Health check**: `GET /api/health` (also exposed publicly as `/api/platform/health` per [API Documentation](../Technical/02-api-documentation.md))
- **Environment variables** (all `sync: false` — set manually in Render dashboard, not committed):
  | Variable | Purpose |
  |---|---|
  | `NODE_ENV` | `production` (only non-secret value, set directly) |
  | `PORT` | `10000` (set directly) |
  | `MONGODB_URI` | MongoDB Atlas connection string |
  | `JWT_SECRET` | JWT signing secret |
  | `COOKIE_SECRET` | Signed-cookie secret (falls back to a hardcoded dev default if unset — **see Security Documentation**) |
  | `RESEND_API_KEY` | Transactional email provider |
  | `GEMINI_API_KEY` | Google Gemini API (AI/text features) |
  | `FRONTEND_URL` | Allowed CORS origin override |
  | `GOOGLE_CLIENT_ID` | Google OAuth client |
  | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Billing/payments |
  | `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | Media uploads |
  | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web push notifications |
  | `BACKEND_URL` | Self-referential URL (used in generated links, e.g., career page slugs, sitemaps) |

## 4. Database (MongoDB Atlas)
- Single Atlas cluster, accessed via `MONGODB_URI`.
- Multi-tenant data lives in shared collections, isolated by `tenantId` (see [Architecture §4](01-architecture-documentation.md#4-multi-tenancy-model)).
- No migration framework identified in `package.json` — schema changes are applied via Mongoose schema edits + manual/seed scripts (`seed`, `seed:fresh`, `seed:automations` in `backend/package.json`).

## 5. CORS allow-list (defines which frontends can call the API)
From `server.js`:
- Any `http://localhost:*` (local dev)
- Any `*.vercel.app` (preview/staging deployments)
- Any `*.railway.app` / `*.up.railway.app` (legacy/alternate hosting — present even though current primary host is Render)
- Any `*.onrender.com`
- `https://talentnesthr.com` and `https://www.talentnesthr.com` (production custom domain)
- `process.env.FRONTEND_URL` (configurable override)

## 6. Branching & release process (observed)
- Active development branch referenced throughout the Developer Playbook changelog: `claude/review-june-5-6-changes-KrN9J`, fast-forward-merged into `main`.
- No CI/CD pipeline config (e.g., GitHub Actions workflow files) was found wired to run tests or builds before deploy — Vercel/Render likely auto-deploy on push to `main` via their native git integrations. **Gap**: see [Operations Documentation](../Operations/01-operations-documentation.md) and [Technical Debt #8](../Technical/03-technical-debt-analysis.md#8-no-automated-test-suite-identified).

## 7. Local development
- Backend: `cd backend && npm run dev` (nodemon, `node server.js` under the hood per `start` script).
- Frontend: `npm run dev` (Vite dev server) at repo root.
- Seeding: `npm run seed` / `npm run seed:fresh` / `npm run seed:automations` (backend) for local data.

## 8. PLANNED FUTURE CAPABILITY
- Containerized deployment (Docker) — not present.
- Infrastructure-as-Code beyond `render.yaml`/`vercel.json` (e.g., Terraform) — not present.
- Automated CI build/test gate before deploy — not present.
- Background job runner / scheduler (for email sequences, webhook retries) — not present, currently lazy/on-request.
