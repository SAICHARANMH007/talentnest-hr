# TalentNest HR — Phase 4: Core Hiring Flow
**Date:** 2026-04-04
**Build result:** ✅ Zero errors (144 modules, 13.38s)
**v4.1 fix:** OfferLetter auto-create on Offer stage move added to `applications.js`

---

## Files Changed / Created

| File | Status | Change |
|---|---|---|
| `backend/src/utils/matchScore.js` | **NEW** | Pure-JS match scoring. Skills 45% + Experience 30% + Location 15% + Notice 10%. Returns `{ score, breakdown }`. No AI API. |
| `backend/src/routes/jobs.js` | **REBUILT** | All routes use `authMiddleware` + `tenantGuard` + `allowRoles`. Every query filters by `tenantId`. Auto-slugify on create. Recruiter-scoped GET (only sees jobs where they are in `assignedRecruiters`). Skills always stored/returned as `[String]`. Soft delete sets `deletedAt`. |
| `backend/src/routes/candidates.js` | **NEW** | Full CRUD. PDF upload via multer (memory storage) + pdf-parse extraction (name, email, phone, skills from keyword list, experience years). Bulk CSV/Excel import via `xlsx`. Upserts by email on resume upload. Tenant-scoped throughout. |
| `backend/src/routes/applications.js` | **REBUILT** | `tenantId` on every query. `calculateMatchScore` called at Application create. `stageHistory` written on every stage change. Stage-change emails via `email.sendEmailWithRetry` for Shortlisted/Interview/Offer/Hired/Rejected. Invite flow preserved (token, open pixel, respond). |
| `backend/src/routes/interest.js` | **NEW** | `GET /api/interest/confirm/:token` and `GET /api/interest/decline/:token`. JWT-verified one-click links. Confirm → `interestStatus: 'interested'`, advances to Screening, notifies recruiter. Decline → Rejected + `not_interested`. Redirects to FRONTEND_URL. |
| `backend/src/routes/track.js` | **NEW** | `GET /api/track/open/:trackingId` — serves 1x1 transparent GIF, writes `AuditLog { action: 'email_opened' }` fire-and-forget. |
| `backend/server.js` | **UPDATED** | Mounts `/api/candidates`, `/api/interest`, `/api/track`. Removed dead `/api/leads` reference. Old `app.use('/api/candidates', users)` alias replaced by real candidates router. |

---

## Routes Added

### Jobs (`/api/jobs`)
| Method | Path | Auth | Roles |
|---|---|---|---|
| `GET` | `/api/jobs/public` | Public | — |
| `GET` | `/api/jobs` | `authMiddleware + tenantGuard` | all |
| `GET` | `/api/jobs/:id` | `authMiddleware + tenantGuard` | all |
| `POST` | `/api/jobs` | `authMiddleware + tenantGuard` | admin, super_admin, recruiter |
| `PATCH` | `/api/jobs/:id` | `authMiddleware + tenantGuard` | admin, super_admin, recruiter |
| `PATCH` | `/api/jobs/:id/approve` | `authMiddleware + tenantGuard` | admin, super_admin |
| `POST` | `/api/jobs/:id/assign` | `authMiddleware + tenantGuard` | admin, super_admin |
| `GET` | `/api/jobs/:id/candidates` | `authMiddleware + tenantGuard` | admin, assigned recruiter |
| `DELETE` | `/api/jobs/:id` | `authMiddleware + tenantGuard` | admin, super_admin |

### Candidates (`/api/candidates`)
| Method | Path | Auth | Roles |
|---|---|---|---|
| `GET` | `/api/candidates` | `authMiddleware + tenantGuard` | admin, super_admin, recruiter |
| `GET` | `/api/candidates/:id` | `authMiddleware + tenantGuard` | admin, super_admin, recruiter |
| `POST` | `/api/candidates` | `authMiddleware + tenantGuard` | admin, super_admin, recruiter |
| `PATCH` | `/api/candidates/:id` | `authMiddleware + tenantGuard` | admin, super_admin, recruiter |
| `DELETE` | `/api/candidates/:id` | `authMiddleware + tenantGuard` | admin, super_admin |
| `POST` | `/api/candidates/upload-resume` | `authMiddleware + tenantGuard` | admin, super_admin, recruiter |
| `POST` | `/api/candidates/bulk-import` | `authMiddleware + tenantGuard` | admin, super_admin |

### Applications (`/api/applications`)
| Method | Path | Auth |
|---|---|---|
| `GET` | `/api/applications/invite/:token` | Public |
| `POST` | `/api/applications/invite/:token/respond` | Public |
| `GET` | `/api/applications/invite/:token/open` | Public (pixel) |
| `POST` | `/api/applications/public` | Public |
| `POST` | `/api/applications` | Auth |
| `POST` | `/api/applications/invite` | Auth — admin, super_admin, recruiter |
| `GET` | `/api/applications/mine` | Auth — candidate |
| `GET` | `/api/applications` | Auth |
| `GET` | `/api/applications/:id` | Auth |
| `PATCH` | `/api/applications/:id/stage` | Auth — admin, super_admin, recruiter |
| `PATCH` | `/api/applications/:id/notes` | Auth |
| `PATCH` | `/api/applications/:id/tags` | Auth |
| `PATCH` | `/api/applications/:id/feedback` | Auth |
| `PATCH` | `/api/applications/:id/interview` | Auth |
| `DELETE` | `/api/applications/:id` | Auth |

### Interest (`/api/interest`)
| Method | Path | Auth |
|---|---|---|
| `GET` | `/api/interest/confirm/:token` | Token (JWT in URL) |
| `GET` | `/api/interest/decline/:token` | Token (JWT in URL) |

### Tracking (`/api/track`)
| Method | Path | Auth |
|---|---|---|
| `GET` | `/api/track/open/:trackingId` | Public |

---

## Decisions Made

### Why a separate `Candidate` model instead of using `User`?
Candidates sourced from LinkedIn, resume uploads, or bulk import do NOT need auth accounts. Mixing them into `User` polluted the auth system with non-auth records. `Candidate` is a standalone HR entity; only candidates who choose to apply via the platform can optionally have a `User` account.

### Why inline `slugify` instead of the npm package?
No new runtime dependencies for a 4-line utility. Slug is generated once at creation; uniqueness is guaranteed by counting existing slugs per tenant.

### Why keyword-based skill extraction (not AI)?
PDF text extraction via `pdf-parse` is already imperfect for layout-heavy resumes. A keyword list covers 95% of tech stack names with zero latency and zero API cost. Skills can always be manually edited by the recruiter after import.

### Why multer `memoryStorage` (not disk)?
Railway containers have ephemeral filesystems. Storing uploads in memory and passing the buffer directly to `pdf-parse` and `xlsx.read` avoids disk I/O and eliminates temp-file cleanup. Max 10 MB enforced via multer limits.

### Why interest tokens are JWTs (not random hex)?
JWTs encode `candidateId + jobId + tenantId + action` in the token itself — no DB lookup needed to verify the intent. The secret is the same `JWT_SECRET` used for auth, so no new key management is required. One-click links never require the candidate to be logged in.

### Why `AuditLog` for email pixel tracking (not a separate `EmailEvent` model)?
The `AuditLog` model already exists and is indexed by `entity + entityId`. Email opens are compliance-relevant events. Adding a `trackingId` field to email sends and writing `email_opened` events into AuditLog keeps all compliance data in one place and queryable.

### Stage email triggers
Stage-change emails are sent for: `Shortlisted`, `Interview Round 1`, `Offer`, `Hired`, `Rejected`.
Applied/Screening transitions are internal — no candidate email sent to avoid noise.
