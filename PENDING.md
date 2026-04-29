# TalentNest HR — Pending Items

## P0 — Must fix before next demo

None currently known. Run through all 5 role flows to verify.

## P1 — High Priority Bugs

- [ ] **Assessments end-to-end audit** — Verify: recruiter creates assessment → links to job → candidate receives → takes it → recruiter reviews score. Check all API calls in `RecruiterAssessments.jsx` and `CandidateAssessment.jsx`.
- [ ] **RecruiterPipeline drag-and-drop** — Verify stage changes save to DB and emit notifications. Test with 5+ applications.
- [ ] **Offer letter PDF download** — Verify `downloadOfferPdf` works (Blob → download). May need CORS fix on Render.
- [ ] **`/users?role=candidate`** — Verify this returns candidates for admin roles (it should since the backend GET / handler accepts role filter with limit).

## P2 — UI / Data Issues

- [ ] **RecruiterCandidates bulk WhatsApp** — Twilio credentials not set in local env; test in prod only.
- [ ] **AdminAnalytics period filter** — Verify `startDate`/`endDate` params propagate correctly to backend analytics endpoints.
- [ ] **CandidateOnboarding** — Verify preboarding task toggle saves and updates UI optimistically.
- [ ] **SuperAdminAuditLogs** — Check pagination works correctly; verify user names are populated (not "Unknown").

## P3 — Roadmap Features (Phase 2-5)

### Phase 2 — Intelligence
- [ ] **Bulk actions** — Mass stage move, mass email from pipeline view (partial: bulk WhatsApp exists)
- [ ] **Duplicate detection UI** — `api.checkDuplicate` exists but no UI trigger

### Phase 3 — Billing
- [ ] **Razorpay webhook** — `/api/billing/webhook` needs to be tested end-to-end in production (Razorpay test mode → verify payment → update tenant plan)
- [ ] **GST invoice PDF** — `generateInvoice` utility exists; verify PDF generates correctly and email attaches it

### Phase 4 — Growth
- [ ] **Onboarding wizard** — First-time admin setup flow (org name, invite first recruiter, create first job)
- [ ] **Public API docs** — Document `/api/jobs/public`, `/api/applications/public` endpoints
- [ ] **Candidate self-scheduling** — Calendar link in interview invite email

### Phase 5 — Polish
- [ ] **Mobile audit** — Test all 5 role dashboards at 375px
- [ ] **Lighthouse score** — Run audit, target >85
- [ ] **Zero console errors** — Clean sweep across all pages

## Known Broken Patterns (Do Not Reintroduce)

| Bug | Status |
|---|---|
| `useMemo` after early return (hooks violation) | Fixed in RecruiterDashboard |
| Logout on backend cold-start | Fixed via sessionStorage fallback |
| Pagination limit=20 truncating dashboard data | Fixed in all affected pages |
| Candidate drawer showing empty fields | Fixed via full profile fetch |
| Profile strength showing 0 | Fixed via field alias lookup |
