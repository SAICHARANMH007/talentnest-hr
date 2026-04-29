# TalentNest HR — Task Log

## 2026-04-29 — Session: Bug sweep + pagination fix

### Fixed
- [x] **React error #310** — `RecruiterDashboard.jsx`: `React.useMemo` was declared after an early `if (loading) return` — Rules of Hooks violation. Moved `appsByJob = useMemo()` before the early return.
- [x] **Logout on page refresh** — `client.js` now returns `{ networkError: true }` on network failure (vs `null` for expired session). `App.jsx` restores from `sessionStorage` on network error, so Render cold-starts no longer log users out.
- [x] **Recent Activity / Platform Pulse — only showing candidate name** — All `setDrawerUser()` calls now spread `{ role: 'candidate', ...candObj }`. The drawer's pipeline/placement/resume tabs were hidden because `u.role` was undefined on populated Candidate objects.
- [x] **UserDetailDrawer — edit shows only name (partial data)** — Added `useEffect` to detect partial Candidate objects (populated from application) and auto-fetch full profile via `GET /candidates/:id`. Added `api.getCandidate` / `api.updateCandidate` to user service.
- [x] **Candidate profile strength showing 0** — Fixed field aliases: `linkedinUrl` vs `linkedin`, `workHistory` vs `education`, etc. Now uses alias array to find any matching field.
- [x] **Bell icon mark-read failing** — `openDetail` now uses `n._id || n.id`; null-guard added to `markOne`.
- [x] **Dashboard data showing only first 20 records** — Critical pagination bug: default limit was 20, causing all KPIs/charts to be wrong for tenants with >20 applications. Fixed:
  - `getJobs` service: always appends `limit=200`
  - `getUsers` service: `'candidate'` → `limit=500`, other roles → `limit=200`
  - `RecruiterDashboard`: `getApplications({ limit: 500 })`
  - `RecruiterInterviews`: `getApplications({ limit: 500 })`
  - `RecruiterPipeline`: `getApplications({ jobId, limit: 500 })`
  - `RecruiterJobs`: `getJobs({ recruiterId, limit: 200 })`
  - `AdminJobs`: `getJobs({ limit: 200 })`, all job-specific app fetches `limit: 500`
  - `AdminUsers`: job picker `getJobs({ limit: 200 })`
  - `ClientDashboard`, `ClientInterviews`, `ClientShortlists`: `getApplications({ limit: 500 })`
- [x] **AdminAnalytics + RecruiterDashboard drill-down edit buttons** — Ensured all `setDrawerUser` calls from Platform Pulse pass enriched candidate objects with `role: 'candidate'`

### Commits
- `5f3fa0f` — Fix: recruiter crash (#310), logout on refresh, drawer full data, profile strength, bell icon
- Next commit — Fix: pagination limit + data completeness across all dashboards

### Next Session Should Start With
1. Check if any more flows are broken by reading error logs
2. Implement the Onboarding Wizard (Phase 4) — the admin flow for first-time setup
3. Wire up Razorpay webhook handler if RAZORPAY_KEY_ID is set in env
4. Audit the Assessments module end-to-end (create → candidate takes → recruiter reviews)
