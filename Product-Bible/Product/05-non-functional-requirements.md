# Non-Functional Requirements

## Performance
- **NFR-P1**: API responses for list endpoints (jobs, candidates, applications, college students/placements) shall be paginated (`{success, data, pagination}` shape) — confirmed across all major list endpoints per the Developer Playbook changelog (a prior bug where pages treated paginated objects as raw arrays was fixed platform-wide).
- **NFR-P2**: Communities list shall load in under 1 second. (Previously 15-20s due to per-request maintenance sync; fixed by throttling sync jobs to run at most once per `MAINTENANCE_SYNC_INTERVAL_MS` = 10 minutes, with new-community creation moved to async background processing.)
- **NFR-P3**: HTTP caching headers (5s–5m) shall be applied to public endpoints (career pages, job sitemaps/feeds) to reduce backend load.
- **NFR-P4**: An in-memory cache with prefix-based invalidation shall be used for frequently-accessed data (e.g. org settings) to avoid redundant DB reads on every request.

## Scalability
- **NFR-S1**: The system shall be multi-tenant at the data layer — every collection (except Communities) carries `tenantId`, allowing horizontal tenant growth without schema changes.
- **NFR-S2**: Plan-based limits (`maxJobs`, `maxRecruiters`, `maxCandidates`) shall bound per-tenant resource consumption, supporting predictable infrastructure scaling.
- **NFR-S3**: The frontend shall be code-split into per-role bundles (e.g. `adm-*`, `rec-*`, `cand-*`, `sa-*`, `mkt-*`, `data-blogs`, `vendor-*`) — observed in the Vite build output — so users only download code relevant to their role.

## Availability & Reliability
- **NFR-A1**: The backend shall expose a health-check endpoint (`/api/health`, referenced in `render.yaml`) for the hosting platform's automated health monitoring.
- **NFR-A2**: Email delivery shall have a fallback path: Resend (primary, cloud) → Zoho SMTP (local/dev fallback), with `EmailLog.js` tracking delivery status (`sent/failed/bounced`) and retry counts.
- **NFR-A3**: Idempotent maintenance jobs (e.g. community sync) shall be throttled, not run on every request, to avoid cascading load during traffic spikes.

## Security
See [Security Documentation](../Security/01-security-documentation.md) for the full breakdown. Headline NFRs:
- **NFR-SEC1**: All protected routes shall require JWT authentication (`authenticate` middleware) plus role checks (`allowRoles`) and tenant scoping (`tenantGuard`).
- **NFR-SEC2**: Passwords shall be hashed with bcrypt; password changes shall require current-password verification.
- **NFR-SEC3**: Invite emails shall not contain plain-text passwords — secure tokens (`crypto.randomBytes(32)`) shall be used instead.
- **NFR-SEC4**: Rate limiting shall apply globally (20,000 req/15min/IP), to auth endpoints (500 req/15min/IP), and to email/invite endpoints (200 req/hour/IP).

## Usability
- **NFR-U1**: All modals across the platform shall use a consistent z-index (`10001`) above notification panels and profile menus (`9999`) to avoid UI overlap bugs.
- **NFR-U2**: Mobile layouts shall stack grid-based sections (`.grid-2/3/4/5`, `.container`, `.mkt-split`, `.mkt-hero-grid`, `.mkt-form-row` CSS classes) rather than overflow horizontally.
- **NFR-U3**: Checkbox/radio inputs shall be excluded from the global mobile `width:100% !important` rule to avoid layout breakage (fixed for "I'm a fresher" and Terms checkboxes).
- **NFR-U4**: Drill-down navigation (e.g. College Hiring Portal stat cards) shall reflect filters in the URL so views are shareable and support browser back/forward.

## Maintainability
- **NFR-M1**: The system shall provide self-documenting "Playbooks" (Developer, Architecture, Product Intelligence, etc.) generated on-demand from the live codebase state, dated to the current day — reducing documentation drift.
- **NFR-M2**: Reusable templates (pipeline templates, rejection templates, onboarding templates, interview kits) shall reduce duplication of configuration across jobs/tenants.
- **NFR-M3**: Shared SVG chart components (used by Admin Analytics and Recruiter Dashboard) shall avoid introducing new charting dependencies.

## Observability
- **NFR-O1**: All admin/recruiter actions shall be recorded in a per-tenant `AuditLog` with `oldValue`/`newValue`/`timestamp`/`ipAddress`.
- **NFR-O2**: Webhook deliveries shall record `timestamp`, `status`, and `payload` per delivery attempt (`Webhook.deliveries[]`).

## Data Integrity
- **NFR-D1**: Soft deletes (`deletedAt` field) shall be used for destructive operations, with default queries filtering `deletedAt: null`.
- **NFR-D2**: Near-duplicate college names shall be normalized (`normalizeCollegeKey` in `collegeNames.js`) to prevent fragmented community/placement data across spelling variants.

## Gaps (not currently measured/enforced — flagged honestly)
- No documented SLA/uptime target.
- No documented load-testing results or capacity benchmarks.
- No documented data backup/restore RPO/RTO (MongoDB Atlas presumably provides automated backups, but this is not configured/documented in-repo).
- No automated accessibility (a11y) testing found in the codebase.

These are tracked in [Technical Debt Analysis](../Technical/03-technical-debt-analysis.md) and [Operations Documentation](../Operations/01-operations-documentation.md).
