# Hiring Manager Module — User Experience & Feature Playbook

**Sidebar nav** (`NAVS.hiring_manager` in `Layout.jsx`): Dashboard · My Team · Pipeline · Interviews · Client Requirements (job-requirements) · Clients · Career Community (feed) · My Network (people) · Communities · Company Reviews · My Profile

> Shared sidebar/header elements (notifications, messages, theme, profile menu, etc.) are documented once in [00-overview.md](00-overview.md) and not repeated here.

---

### Page: Dashboard (`/app/dashboard`)
- **Component file**: `src/pages/hiring_manager/HiringManagerDashboard.jsx`
- **Purpose**: View-only hiring overview with KPIs, pipeline distribution, today's priority board, and candidate list.
- **Sections/Cards/Widgets**: Page header ("Welcome, [name]" + total candidate count); Today's Priority Board (conditional, only if items exist) — "Interviews Today" card (count + 3 candidates), "Stuck in Screening" card (count, screening 3+ days), "Pending Feedback" card (count awaiting interview feedback); KPI row (Total Applications, In Interview, Offer/Hired, Hired, Rejected, Average Match Score); Pipeline stage distribution (donut chart); Upcoming Interviews (next 7 days — candidate, date, time, stage); Candidate list (main table with search/filter/sort).
- **Tables/Lists**: Main candidate table — Candidate Name, Job Title, Stage, Match Score, Last Update. Search by name/job title; stage filter dropdown; sort (Recent/Score/Name).
- **Filters & Search**: Search (candidate name/job title); stage filter dropdown (All + individual stages); sort selector (Recent | Score | Name).
- **Buttons & Actions**: Filter/search/sort controls dynamically update list; KPI cards are display-only.
- **Forms/Modals/Popups**: None.
- **Statuses/Badges**: Stage badges (per STAGE_COLOR map); match score color coding (≥75% green, ≥50% amber, <50% red).
- **Empty/Loading/Error states**: Spinner while loading; "No applications" fallback.

---

### Page: My Team (`/app/my-team`)
- **Component file**: `src/pages/hiring_manager/MyTeam.jsx`
- **Purpose**: View jobs assigned to this hiring manager, assigned recruiters, and pipeline progress.
- **Sections/Cards/Widgets**: Job cards (one per assigned job) — job title, company, department, location; status badge (active/draft/closed/paused); approval status badge (pending_approval/approved/rejected); assigned recruiters list (name badges); openings count; total candidates in pipeline; pipeline stage breakdown (stage: count badges).
- **Tables/Lists**: Card-based layout, no tables.
- **Filters & Search**: None.
- **Buttons & Actions**: "View Pipeline →" (→ `/app/pipeline`, shared `AdminPipeline` component).
- **Forms/Modals/Popups**: None.
- **Statuses/Badges**: Job status (active #34d399, draft #9E9D9B, closed #706E6B, paused #F59E0B); approval status (pending_approval #F59E0B, approved #34d399, rejected #BA0517); pipeline stage badges (name: count).
- **Empty/Loading/Error states**: Error message (no retry button); spinner while loading; empty state if no jobs assigned.

---

### Shared Pages
- Pipeline (`/app/pipeline`) — `AdminPipeline.jsx`, same as [02-recruiter.md](02-recruiter.md); hiring manager sees only their team's pipeline, view-only (no edit rights).
- Interviews (`/app/interviews`) — `RecruiterInterviews.jsx`, same as [02-recruiter.md](02-recruiter.md); view-only for hiring manager.
- Client Requirements (`/app/job-requirements`) — `JobRequirements.jsx`, same as [02-recruiter.md](02-recruiter.md) / [03-admin.md](03-admin.md).
- Clients (`/app/clients`) — `AdminClients.jsx`, same as [02-recruiter.md](02-recruiter.md); hiring manager sees client list read-only.
- Career Community (`/app/feed`) — `CommunityFeed.jsx`, same as other roles.
- My Network (`/app/people`) — `PeoplePage.jsx`, same as other roles.
- Communities (`/app/communities`) — `CommunitiesPage.jsx`, same as other roles.
- Company Reviews (`/app/company-reviews`) — `CompanyReviewsPage.jsx`, same as other roles.
- My Profile (`/app/profile`) — `ProfilePage.jsx`, role-aware (see [00-overview.md](00-overview.md)).

---

## Hiring Manager Feature Checklist

- View recruitment dashboard (KPIs: total apps, in-interview, offers, hires, rejected, avg match score)
- View pipeline stage distribution (donut chart)
- See upcoming interviews for next 7 days
- View today's priority board (today's interviews, stuck-in-screening, pending feedback)
- Search/filter/sort candidates (by name/job title, stage, recent/score/name)
- View assigned jobs with recruiter team members
- See openings and total candidates per job
- View pipeline stage breakdown per job
- Navigate to job pipeline details (view-only)
- View scheduled interviews for team's jobs (view-only)
- View client requirements and client list (read-only)
- Participate in Career Community, My Network, Communities, Company Reviews
- Update profile information

---

**End of Hiring Manager Module Documentation**
