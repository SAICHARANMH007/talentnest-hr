# Client Module — User Experience & Feature Playbook

**Sidebar nav** (`NAVS.client` in `Layout.jsx`): Dashboard · Hiring Requirements (requirements) · Shortlists · Interviews · Placements · Career Community (feed) · My Network (people) · Communities · Company Reviews · My Profile

> Shared sidebar/header elements (notifications, messages, theme, profile menu, etc.) are documented once in [00-overview.md](00-overview.md) and not repeated here.

---

### Page: Dashboard (`/app/dashboard`)
- **Component file**: `src/pages/client/ClientDashboard.jsx`
- **Purpose**: Overview of recruitment pipeline with KPIs, stage breakdown, and recent hires/top candidates.
- **Sections/Cards/Widgets**: KPI row (Total Applications, Shortlisted, Offers Extended, Hired, Average Match Score with sparkline); Pipeline Stages horizontal bar chart (Applied, Screening, Shortlisted, Interview Round 1, Interview Round 2, Offer, Hired, Rejected); Top Shortlisted Candidates (6-card list, sorted by match score, clickable); Recent Hires (5-item list with hire date).
- **Tables/Lists**: Top shortlisted — name, job title, match score %, pipeline stage (max 6); recent hires — candidate name, job title, hire date (max 5).
- **Filters & Search**: None (read-only dashboard).
- **Buttons & Actions**: "View All →" (→ `/app/shortlists`); Shortlisted/Hired KPI cards clickable → navigate to respective pages.
- **Forms/Modals/Popups**: None.
- **Statuses/Badges**: Stage badges color-coded.
- **Empty/Loading/Error states**: Spinner while loading; error message with retry; placeholder for no data.

---

### Page: Hiring Requirements (`/app/requirements`)
- **Component file**: `src/pages/client/ClientRequirements.jsx`
- **Purpose**: Submit new hiring needs and track status (new → in_progress → converted → closed).
- **Sections/Cards/Widgets**: Single full-width table.
- **Tables/Lists**: Columns — Role, Openings, Priority, Status, Submitted Date, Actions. Sorted most-recent-first; no pagination.
- **Filters & Search**: None.
- **Buttons & Actions**: "+ New Requirement" (opens modal); "Edit" (if status='new', opens modal with same form); "Withdraw" (if status='new', confirm); status message for in_progress/converted (with job post link if available)/closed.
- **Forms/Modals/Popups**: New/Edit Hiring Requirement modal — Job Title (text, required), Department (text), Location (text), Employment Type (dropdown: full_time/part_time/contract/internship), Openings (number, min 1), Experience Required (text), Skills Required (comma-separated), Budget Range (text), Priority (dropdown: low/medium/high/urgent), Description/Notes (textarea); Submit/Cancel.
- **Statuses/Badges**: new="Submitted" (blue #0176D3); in_progress="In Progress" (amber #F59E0B); converted="Job Posted" (green #34d399); closed="Closed" (gray #9E9D9B); Priority badges (low/medium/high/urgent) color-coded.
- **Empty/Loading/Error states**: Skeleton rows; error with retry; empty state with icon + message.

---

### Page: Shortlists (`/app/shortlists`)
- **Component file**: `src/pages/client/ClientShortlists.jsx`
- **Purpose**: Review shortlisted candidates — rate, comment, approve/reject at shortlisted stage, reject at interview stages.
- **Sections/Cards/Widgets**: Single full-width table.
- **Tables/Lists**: Columns — Candidate, Job, Match %, Stage, Your Rating, Actions. Shows only candidates in Shortlisted, Interview Round 1, Interview Round 2, Offer, or Hired stages. No explicit pagination.
- **Filters & Search**: None.
- **Buttons & Actions**: Star rating (1-5, click to update); "Save" comment (`addFeedback(appId, {rating, comment})`); "Approve" (if Shortlisted → `updateStage(appId, 'Interview Round 1')`); "Reject" (if Shortlisted/Interview Round 1/Interview Round 2 → moves to Rejected). No actions for Offer/Hired.
- **Forms/Modals/Popups**: Inline comment textarea.
- **Statuses/Badges**: Stage badges (Shortlisted #a78bfa, Interview Round 1 #0176D3, Interview Round 2 #7c3aed, Offer #F59E0B, Hired #34d399, Rejected #BA0517).
- **Empty/Loading/Error states**: Skeleton rows; error with retry; empty state message.

---

### Page: Interviews (`/app/interviews`)
- **Component file**: `src/pages/client/ClientInterviews.jsx`
- **Purpose**: Review scheduled interviews, provide interview feedback (rating, strengths, concerns, recommendation), reschedule interviews.
- **Sections/Cards/Widgets**: Single full-width table listing all interviews across all candidates.
- **Tables/Lists**: Columns — Candidate, Job, Round, Date, Format, Feedback.
- **Filters & Search**: None.
- **Buttons & Actions**: "Reschedule" (if interview not past, opens reschedule modal); "Add Feedback" (if past with no feedback, opens feedback modal); "Submitted" badge if feedback exists; "After interview" label if not yet scheduled.
- **Forms/Modals/Popups**: Interview Feedback modal — Rating (1-5 stars), Strengths (textarea), Concerns/Weaknesses (textarea), Recommendation (radio: proceed/hold/reject), Additional Notes (textarea), Submit/Cancel; Reschedule modal — New Date (date picker), New Time (time picker), Reason/Notes (textarea), Submit/Cancel.
- **Statuses/Badges**: "Submitted" badge for complete feedback; "After interview" label for pending.
- **Empty/Loading/Error states**: Skeleton rows; empty state message.

---

### Page: Placements (`/app/placements`)
- **Component file**: `src/pages/client/ClientPlacements.jsx`
- **Purpose**: Track hired candidates, view placement history, add onboarding notes.
- **Sections/Cards/Widgets**: KPI cards (Total Placements, This Month).
- **Tables/Lists**: Columns — Candidate, Role, Match Score, Hired Date, Notes. Shows candidates in Hired stage only; no pagination.
- **Filters & Search**: None.
- **Buttons & Actions**: "Save" notes (`updateAppNotes(appId, notes)`).
- **Forms/Modals/Popups**: Inline notes textarea.
- **Statuses/Badges**: None.
- **Empty/Loading/Error states**: Spinner; error message; empty state with icon + message.

---

### Shared Pages
- Career Community (`/app/feed`) — `CommunityFeed.jsx`, same as [02-recruiter.md](02-recruiter.md) / [01-candidate.md](01-candidate.md).
- My Network (`/app/people`) — `PeoplePage.jsx`, same as other roles.
- Communities (`/app/communities`) — `CommunitiesPage.jsx`, same as other roles.
- Company Reviews (`/app/company-reviews`) — `CompanyReviewsPage.jsx`, same as other roles.
- My Profile (`/app/profile`) — `ProfilePage.jsx`, role-aware (see [00-overview.md](00-overview.md)).

---

## Client Feature Checklist

- Submit hiring requirements (job title, department, location, employment type, openings, experience, skills, budget, priority, description)
- Edit/withdraw pending ("new" status) hiring requirements
- Track requirement status: Submitted → In Progress → Job Posted → Closed
- View recruitment pipeline dashboard (KPIs: total apps, shortlists, offers, hires, avg match score)
- View pipeline stage breakdown (bar chart)
- View top 6 shortlisted candidates sorted by match score
- View recent hires list
- Review all shortlisted candidates across all interview stages
- Rate candidates (1-5 stars) and save comments
- Approve shortlisted candidates (→ Interview Round 1) or reject at any pre-hire stage
- View all scheduled interviews (date/time/format)
- Reschedule upcoming interviews
- Submit interview feedback (rating, strengths, concerns, recommendation, notes)
- View placement history (all hired candidates) and monthly placement count
- Add onboarding notes for hired candidates
- Participate in Career Community, My Network, Communities, Company Reviews
- Update profile information

---

**End of Client Module Documentation**
