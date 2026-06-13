# Admin Module — User Experience & Feature Playbook

**Sidebar nav** (`NAVS.admin` in `Layout.jsx`): Overview (analytics) · Insights · Applicants · Job Approvals · Candidates · College Drives · Outreach · Assessments · Pre-boarding (onboarding) · Candidate Requests · Assignments · Recruiters · Hiring Managers · Org Chart · Client Requirements · All Jobs · Interview Kits · Webhooks · Diversity · Reviews · Referrals · Talent Pool · NPS · Time to Fill · Merge Duplicates · Sourcing Tracker · Rejection Templates · Offer Letter Builder · Dashboard Widgets · Headcount Planner · Hiring Alerts (SLA) · Custom Stages · Automation · Customizations · Career Community (feed) · My Network (people) · Communities · Reported Posts · Org Settings · Platform Guide · Billing · My Profile

> Shared sidebar/header elements (notifications, messages, theme, profile menu, etc.) are documented once in [00-overview.md](00-overview.md) and not repeated here.

---

### Page: Overview (`/app/analytics`)
- **Component file**: `src/pages/admin/AdminAnalytics.jsx`
- **Purpose**: Executive dashboard with org-wide hiring metrics, KPIs, trend cards, and multi-axis charts covering applications, hires, pipeline health, and recruitment sources.
- **Sections/Cards/Widgets**: KPI cards (Total Applications, Hires, Open Positions, Avg Time-to-Hire); trend cards with sparklines (period-over-period); Applications Over Time (area chart); Hiring Funnel (multi-stage bar chart); Recruitment Sources breakdown (donut chart); Top Recruiters leaderboard; Recent Hires activity feed; Geographic heatmap of applicant locations; stage-wise breakdown (horizontal bar chart).
- **Tables/Lists**: Recent Hires table (candidate, job, stage, hire date); Top Recruiters list (name, applications, hires, conversion%).
- **Filters & Search**: Date range picker (Last 7/30/90 days, All time, Custom), Department/Job filter, Recruiter filter, Source filter, Stage filter.
- **Buttons & Actions**: "Export Analytics" (CSV download); "View Pipeline" (→ AdminPipeline); "View Details" on KPI cards (deep-links to filtered pipeline/applicants); date picker controls.
- **Forms/Modals/Popups**: NOT FOUND IN CODE.
- **Statuses/Badges**: Stage badges (Applied, Screening, Shortlisted, Interview, Offer, Hired, Rejected) color-coded; Source badges with custom colors.
- **Empty/Loading/Error states**: Skeleton loaders per section; "No data available" placeholder in charts; auto-retry on network error; error section with manual Retry button.

---

### Page: Insights (`/app/insights`)
- **Component file**: `src/pages/admin/AdminInsights.jsx`
- **Purpose**: Deep-dive analytics — smart alerts, offer analytics, recruiter leaderboards, SLA compliance, pipeline velocity, time-to-hire breakdown, dropout analysis.
- **Sections/Cards/Widgets**: Smart Alerts summary (stale jobs, stuck candidates, pending offers); stage-wise metrics (avg days in stage, conversion rate); offer analytics (pending/accepted/declined, avg time-to-sign); source effectiveness (applications/hires/conversion by source); recruiter leaderboard; pipeline funnel; overall KPI dashboard stats; SLA compliance rate by stage; upcoming interviews list; Stage Velocity (days per stage); Time-to-Hire breakdown by job; dropout analysis (lost candidates per stage).
- **Tables/Lists**: Smart alerts paginated tables (Stale Jobs, Stuck Candidates, Pending Offers — 10/page); recruiter leaderboard (name, apps, hires, conversion%, hire rate); Time-to-Hire by job (job, hires, avg/min/max days); upcoming interviews (date, candidate, job, format); dropout by stage (stage, lost candidates, %).
- **Filters & Search**: Date range for pending offers (startDate/endDate); pagination controls (first/prev/next/last).
- **Buttons & Actions**: "Reload All" (refresh all sections in parallel); per-section "Retry" on error; pagination buttons.
- **Forms/Modals/Popups**: NOT FOUND IN CODE.
- **Statuses/Badges**: Status badges (Pending, Approved, Rejected) on alerts; Source color badges.
- **Empty/Loading/Error states**: Section-level skeleton loaders; "No data available" messages; per-section error states with Retry; pagination hidden if ≤1 page.

---

### Page: Applicants (`/app/applicants`)
- **Component file**: `src/pages/shared/ApplicantsRecordsPage.jsx` (shared with recruiter — see [02-recruiter.md](02-recruiter.md))
- **Purpose**: Admin sees org-wide application records across all recruiters, jobs, clients — searchable/filterable.
- **Sections/Cards/Widgets**: Search bar (name/email/job title); filters panel (Stage, Source, Status, Experience Level, Recruiter, Department); application records table; optional source effectiveness summary.
- **Tables/Lists**: Columns — Candidate Name, Email, Job Title, Stage (badge), Source (badge), Application Date, Status, Actions (View, Move to Stage, Schedule Interview, Send Offer, Reject). Sortable by stage/date/status; pagination 100/page.
- **Filters & Search**: Text search (name/email/job); Stage dropdown; Source multi-select; Status (Active, Hired, Rejected, Withdrawn, Parked); Experience level; Recruiter filter; Department filter.
- **Buttons & Actions**: "View Details" (UserDetailDrawer); "Move to Stage" (commitMove API); "Schedule Interview" (ScheduleInterviewPage modal); "Send Offer" (GenerateOfferPage modal); "Reject" (CandidateRejectionPage modal); "Download Records" (CSV).
- **Forms/Modals/Popups**: Interview scheduling, offer generation, rejection — via navigation-based modals.
- **Statuses/Badges**: Stage badges (STAGES constant colors); Source badges (SOURCE_COLORS); Status badges (Active=green, Rejected=red, etc.).
- **Empty/Loading/Error states**: Loading spinner; "No applications found"; error state with Retry.

---

### Page: Job Approvals (`/app/job-approvals`)
- **Component file**: `src/pages/admin/AdminJobApproval.jsx`
- **Purpose**: Admin reviews jobs submitted by recruiters before publication — approve to publish or return for revision with feedback.
- **Sections/Cards/Widgets**: Header "N jobs awaiting review"; job approval queue.
- **Tables/Lists**: Columns — Job Title, Department, Posted By (recruiter email), Date Submitted, Skills (tags), Actions (Preview, Approve, Reject). Paginated 10/page if >20 jobs.
- **Filters & Search**: NOT FOUND IN CODE (shows all pending jobs).
- **Buttons & Actions**: "Preview" (JobPreviewModal); "Approve & Publish" (`approveJobNew`, removes from queue, job goes live); "Reject" (opens RejectModal, `rejectJob` with note, returns to recruiter); "Return for Revision" (in RejectModal).
- **Forms/Modals/Popups**: JobPreviewModal (title, company, location, dept, job type, exp, openings, urgency, skills list, description); RejectModal (textarea feedback, required).
- **Statuses/Badges**: Pending vs approved via list filtering; Department tag; Skills tags.
- **Empty/Loading/Error states**: "All caught up! No jobs pending approval" (✅); loading spinner; approve/reject errors via toast.

---

### Page: Candidates (`/app/candidates`)
- **Component file**: `src/pages/admin/AdminUsers.jsx` (filterRole='candidate')
- **Purpose**: Admin views org-wide candidate database — search/filter by skills, source, status, location; bulk actions (merge, assign, tag).
- **Sections/Cards/Widgets**: Search bar (name/email/phone/skills); multi-select filters (Source, Status, Experience, Location, Skills, Department); candidate records table; bulk action toolbar (on selection).
- **Tables/Lists**: Columns — Name, Email, Phone, Current Company/Title, Location, Skills, Source, Status (badge), Added Date, Actions (View, Edit, Assign). Sortable; multi-select checkboxes; pagination 100/page.
- **Filters & Search**: Text search; Source multi-select; Status (Active, Inactive, Parked, Blacklisted); Experience level; Location autocomplete; Skills multi-select; Department filter.
- **Buttons & Actions**: "View" (UserDetailDrawer — profile, resume card, application history, recruiting notes); "Edit" (inline/modal — name, email, phone, skills, location); "Assign" (to recruiter); "Merge" (multi-select 2+ → CandidateMergeWizard); "Tag"; "Export" (CSV); bulk "Delete" (soft delete/mark inactive).
- **Forms/Modals/Popups**: UserDetailDrawer (read-only); CandidateMergeWizard (select primary, confirm duplicates, preview merge results).
- **Statuses/Badges**: Status (Active, Inactive, Parked); Source badge; Skills pills; Location tag.
- **Empty/Loading/Error states**: Skeleton table loader; "No candidates found"; error state with retry.

---

### Page: College Drives (`/app/college-drives`)
- **Component file**: `src/pages/recruiter/CompanyCollegeDrives.jsx` (shared — see [02-recruiter.md](02-recruiter.md))
- **Purpose**: Admin sees all company-organized college drives org-wide, can view applications and metrics for each drive.
- **Sections/Cards/Widgets**: Drive list (cards); drive details (applications, offers, hires per drive).
- **Tables/Lists**: College drives list; per-drive application records table.
- **Filters & Search**: Drive name search; status filter (Active, Closed, Upcoming).
- **Buttons & Actions**: View drive; View applications; Download report; Schedule callback.
- **Forms/Modals/Popups**: Callback scheduling modal.
- **Statuses/Badges**: Drive status (Active, Closed, Upcoming); college name badge.
- **Empty/Loading/Error states**: Skeleton card loader; "No drives".

---

### Page: Outreach (`/app/outreach`)
- **Component file**: `src/pages/admin/OutreachTracker.jsx` (also used by recruiter)
- **Purpose**: Tracks bulk email/WhatsApp outreach campaigns and email delivery logs; engagement metrics (opens, clicks, replies) per campaign.
- **Sections/Cards/Widgets**: Campaign list table; email logs/delivery report table; campaign metrics (sent, delivered, bounced, opened, clicked, replied); email template editor (new campaign form).
- **Tables/Lists**: Outreach campaigns (name, date range, type, recipient count, delivery status); email logs (recipient, subject, sent date, delivery status, opens/clicks, last activity) — paginated.
- **Filters & Search**: Campaign name search; date range; status filter (Sent, Pending, Bounced, Opened, Clicked); recipient filter.
- **Buttons & Actions**: "New Campaign"; "View Details"; "Resend" (retry bounced); "View Reply"; "Download Report" (CSV).
- **Forms/Modals/Popups**: Campaign creation form (recipient list, template, subject, scheduling).
- **Statuses/Badges**: Campaign status (Sent, Pending, Bounced, In Progress); delivery badges (Delivered, Bounced, Opened, Clicked).
- **Empty/Loading/Error states**: "No campaigns"; loading spinner; error on send.

---

### Page: Assessments (`/app/assessments`)
- **Component file**: `src/pages/recruiter/RecruiterAssessments.jsx` (shared — see [02-recruiter.md](02-recruiter.md))
- **Purpose**: Admin views all org-wide assessments assigned to candidates; track submission status, scores, feedback.
- **Sections/Cards/Widgets**: Assessment list; submitted responses; scoring/feedback section.
- **Tables/Lists**: Columns — Candidate, Job, Assessment Name, Status, Score, Submitted Date.
- **Filters & Search**: Status filter (Pending, Submitted, Reviewed); assessment name; job filter.
- **Buttons & Actions**: "Review" (review page); "Resend"; "View Feedback".
- **Forms/Modals/Popups**: Assessment review page with scoring interface.
- **Statuses/Badges**: Submission status; score badge (color by performance).
- **Empty/Loading/Error states**: "No assessments"; loading spinner.

---

### Page: Pre-boarding (`/app/onboarding`)
- **Component file**: `src/pages/admin/AdminOnboarding.jsx` (shared with recruiter)
- **Purpose**: Manage onboarding records for hired candidates — document uploads, task completion, BGV verification; approve/reject documents.
- **Sections/Cards/Widgets**: Onboarding records list (card/table); per-record DetailModal (candidate info, task checklist, document upload, verification status).
- **Tables/Lists**: Records (Candidate Name, Job, % Complete, Date Hired, Actions); per-record task list (checkbox, title, category icon, file/verification status).
- **Filters & Search**: Status filter (Pending, In Progress, Completed, Cancelled); candidate name search; date range.
- **Buttons & Actions**: "View Details" (DetailModal); task checkbox (toggle complete); "Download File"; "Approve"/"Reject"/"Request Resubmission" (document verification); "Add Task"; "Send Reminder".
- **Forms/Modals/Popups**: DetailModal (candidate info, task checklist + uploads, verification UI); Add Task form (title, category, required toggle).
- **Statuses/Badges**: Task completion checkbox; document verification status (Not Uploaded, Pending Review, Verified ✅, Rejected ❌, Resubmission Required); % completion bar.
- **Empty/Loading/Error states**: "No onboarding records"; task-toggle loading state; file upload spinner.

---

### Page: Candidate Requests (`/app/candidate-requests`)
- **Component file**: `src/pages/admin/AdminCandidateRequest.jsx` (shared with recruiter/superadmin)
- **Purpose**: Admins submit requests to sourcing teams for specific candidate profiles; track request status and sourced candidates.
- **Sections/Cards/Widgets**: Request creation form (job, profile requirements, deadline); request list table; sourced candidates per request.
- **Tables/Lists**: Columns — Job, Skills Required, Status, Submitted By, Sourced Candidates Count, Actions.
- **Filters & Search**: Status filter (Open, In Progress, Closed); job filter; date filter.
- **Buttons & Actions**: "Create Request"; "View Sourced"; "Close Request"; "Edit"; "Delete" (soft delete).
- **Forms/Modals/Popups**: Request create/edit form (job, skills, experience range, location, deadline, notes).
- **Statuses/Badges**: Request status (Open, In Progress, Closed); sourced count badge.
- **Empty/Loading/Error states**: "No requests"; sourced candidates "No matches".

---

### Page: Assignments (`/app/assigned-candidates`)
- **Component file**: `src/pages/shared/AssignedCandidates.jsx` (shared — see [02-recruiter.md](02-recruiter.md))
- **Purpose**: Admin views candidates assigned (org-wide assignments); can reassign or unassign.
- **Sections/Cards/Widgets**: Assigned candidates list with assignment metadata.
- **Tables/Lists**: Candidates assigned to admin or bulk view of all org assignments.
- **Filters & Search**: Candidate name search; recruiter filter; status filter.
- **Buttons & Actions**: "Reassign"; "Unassign"; "View Profile"; "Open Pipeline".
- **Forms/Modals/Popups**: Reassign recruiter modal.
- **Statuses/Badges**: Assignment status; source badge.
- **Empty/Loading/Error states**: "No candidates assigned".

---

### Page: Recruiters (`/app/recruiters`)
- **Component file**: `src/pages/admin/AdminUsers.jsx` (filterRole='recruiter')
- **Purpose**: Admin manages recruiter team — profiles, activity, performance metrics, invite/remove users.
- **Sections/Cards/Widgets**: Recruiter list (grid/table); per-recruiter stats (jobs posted, applications, hires, conversion %); recruiter detail panel (email, phone, assigned jobs, recent activity).
- **Tables/Lists**: Columns — Name, Email, Phone, Jobs Posted, Applications, Hires, Last Active, Actions.
- **Filters & Search**: Name/email search; active/inactive status; department filter.
- **Buttons & Actions**: "View Profile" (drawer); "Edit" (email, phone, assignment, department); "Deactivate"/"Activate"; "Change Password" (force reset); "Assign Jobs"; "Remove"; "Invite" (send invite link).
- **Forms/Modals/Popups**: Edit recruiter modal; invite modal (email, assign jobs).
- **Statuses/Badges**: Active/Inactive badge; performance indicators.
- **Empty/Loading/Error states**: "No recruiters"; loading skeleton list.

---

### Page: Hiring Managers (`/app/hiring-managers`)
- **Component file**: `src/pages/admin/AdminUsers.jsx` (filterRole='hiring_manager')
- **Purpose**: Admin manages hiring manager accounts — team members, pipeline access, interview schedules.
- **Sections/Cards/Widgets**: Hiring manager list; HM detail panel (team, approvals, interviews).
- **Tables/Lists**: Columns — Name, Email, Department, Team Size, Interviews Scheduled, Actions.
- **Filters & Search**: Name/email search; department filter; status filter.
- **Buttons & Actions**: "View Profile"; "Edit"; "Assign Team"; "View Schedule"; "Deactivate"; "Invite".
- **Forms/Modals/Popups**: Edit modal; team assignment modal.
- **Statuses/Badges**: Active/Inactive badge; department badge.
- **Empty/Loading/Error states**: "No hiring managers".

---

### Page: Org Chart (`/app/org-chart`)
- **Component file**: `src/pages/admin/OrgChart.jsx`
- **Purpose**: Visual org hierarchy (admin top, recruiters below) — view team KPIs, redistribute jobs/candidates, classify teams.
- **Sections/Cards/Widgets**: Tree layout with connected person cards; admin card (top level); recruiter cards (stats: jobs, applicants, hires); "You" indicator; online status dot per person.
- **Tables/Lists**: NOT FOUND (visual tree layout).
- **Filters & Search**: Recruiter name search; job filter; status filter.
- **Buttons & Actions**: "Redistribute Jobs" (modal); "Redistribute Candidates" (modal); "Classify Team" (auto-categorize by activity); "Refresh"; drag-reorder (if supported).
- **Forms/Modals/Popups**: Redistribution modal (source recruiter, target recruiters, rules); classification modal (auto-assign roles).
- **Statuses/Badges**: Role badges (Admin, Recruiter); online status dot; KPI badges (jobs, applicants, hires).
- **Empty/Loading/Error states**: "Building org chart…"; error state; "No team members" if single admin.

---

### Page: Client Requirements (`/app/job-requirements`)
- **Component file**: `src/pages/admin/JobRequirements.jsx` (shared with recruiter/hiring_manager — see [02-recruiter.md](02-recruiter.md))
- **Purpose**: Admin views all org client hiring requirements — create, edit, track fulfillment.
- **Sections/Cards/Widgets**: Requirement list (card/table); detail panel (profile, matched candidates, fulfillment %).
- **Tables/Lists**: Columns — Client, Position, Requirement, Status, Matched Candidates, Actions.
- **Filters & Search**: Client filter; status filter (Open, In Progress, Fulfilled, Closed); requirement search.
- **Buttons & Actions**: "Create"; "View Details"; "Add Candidate"; "Mark Fulfilled"; "Close".
- **Forms/Modals/Popups**: Create/edit requirement form (client, position, profile, timeline, budget).
- **Statuses/Badges**: Status badge (Open, In Progress, Fulfilled); client badge.
- **Empty/Loading/Error states**: "No requirements".

---

### Page: All Jobs (`/app/jobs`)
- **Component file**: `src/pages/admin/AdminJobs.jsx`
- **Purpose**: Admin views all org jobs across all recruiters — manage lifecycle (create, edit, publish, close), view applications per job, hiring metrics.
- **Sections/Cards/Widgets**: Job list (table/card grid); job detail panel (description, applicants, stage-wise breakdown, KPIs).
- **Tables/Lists**: Columns — Job Title, Department, Posted By, Status (Open, Closed, Draft, Pending Approval, On Hold), Applicants, Openings, Posted Date, Actions. Sortable; pagination 20/page.
- **Filters & Search**: Job title search; status filter; department filter; recruiter filter; posted date range.
- **Buttons & Actions**: "Create Job" (CreateJobPage); "View Details"; "Edit"; "Publish" (if draft); "Close"; "View Applications" (→ pipeline filtered by job); "Download Applicants" (CSV); "Archive"; "View Distribution" (job distribution across sources).
- **Forms/Modals/Popups**: CreateJobPage (title, dept, description, skills, openings, urgency, salary range, job type, etc.).
- **Statuses/Badges**: Status badge (color-coded); department badge; applicant count badge; urgency badge (High/Medium/Low).
- **Empty/Loading/Error states**: "No jobs"; skeleton card loader.

---

### Page: Interview Kits (`/app/interview-kits`)
- **Component file**: `src/pages/admin/AdminInterviewKits.jsx`
- **Purpose**: Create/manage reusable interview assessment kits (questions, competencies, scoring guides); link to jobs for standardized evaluation.
- **Sections/Cards/Widgets**: Interview kit list (name, description, linked jobs count, default badge, actions); kit detail modal (questions, screening questions, linked jobs).
- **Tables/Lists**: Columns — Kit Name, Description, Linked Jobs, Competencies, Status (Default or not), Actions.
- **Filters & Search**: Kit name search; competency filter; linked job filter.
- **Buttons & Actions**: "Create Kit" (KitModal); "Edit" (KitModal edit mode); "Delete" (with confirmation); "Set as Default"; "View Linked Jobs".
- **Forms/Modals/Popups**: KitModal — kit details (name, description, default toggle); interview questions section (competency, question text, scoring tip, max score); screening questions section (question, type [text/yes-no/multiple-choice], options, required, knockout); linked jobs picker (searchable, checkboxes); add/remove question buttons.
- **Statuses/Badges**: Default kit badge; competency pills (Technical Skills, Problem Solving, etc.); linked job count badge.
- **Empty/Loading/Error states**: "No interview kits"; loading spinner during create/save.

---

### Page: Webhooks (`/app/webhooks`)
- **Component file**: `src/pages/admin/AdminWebhooks.jsx`
- **Purpose**: Configure outbound webhooks for real-time event notifications to external systems; manage delivery logs and retries.
- **Sections/Cards/Widgets**: Webhook list (name, endpoint URL, status, subscribed events, last triggered, actions); webhook test/delivery log panel.
- **Tables/Lists**: Columns — Name, Endpoint URL, Status (Active/Inactive), Events Subscribed, Last Triggered, Delivery Status, Actions.
- **Filters & Search**: Webhook name search; status filter (Active, Inactive, Error); event type filter.
- **Buttons & Actions**: "Create Webhook" (WebhookModal); "Edit"; "Test" (sends sample payload); "View Logs"; "Retry Failed"; "Activate"/"Deactivate"; "Delete" (with confirmation).
- **Forms/Modals/Popups**: WebhookModal — Name, Endpoint URL (must be https://), Signing Secret (optional, "Generate Secret" button), Events checkboxes grouped by category (Applications, Interviews, Offers, Jobs, Onboarding/BGV), Select All/Clear, status toggle.
- **Statuses/Badges**: Status badge (Active=green, Inactive=gray, Error=red); event type pills; last triggered timestamp.
- **Empty/Loading/Error states**: "No webhooks configured"; test payload loading state; delivery logs "No events".

---

### Page: Diversity (`/app/diversity`)
- **Component file**: `src/pages/admin/DiversityReport.jsx`
- **Purpose**: Track gender representation and equal-opportunity metrics in hiring pipeline; analyze shortlist/hire rates by gender.
- **Sections/Cards/Widgets**: Summary KPI cards (Total Candidates, Total Applications, Total Hired, Hire Rate); gender representation (pie/bar chart); hiring funnel by gender table; diversity disclosure notice (voluntary, self-reported).
- **Tables/Lists**: Hiring funnel table — Gender, Applied #, Shortlisted %, Hired #, Hire %, Representation %.
- **Filters & Search**: Date range filter (start/end); Clear filter button.
- **Buttons & Actions**: "Filter" (apply date range); "Clear" (reset); "Populate Diversity Data" (seed sample data for testing).
- **Forms/Modals/Popups**: NOT FOUND IN CODE (inline date pickers).
- **Statuses/Badges**: Gender category labels (Male, Female, Non-binary, Prefer not to say, Not disclosed), color-coded.
- **Empty/Loading/Error states**: "No gender data available"; loading state; "Failed to load report" error.

---

### Page: Reviews (`/app/reviews`)
- **Component file**: `src/pages/admin/AdminReviews.jsx`
- **Purpose**: Manage candidate feedback/reviews (post-hire/post-rejection); track sentiment and feedback themes.
- **Sections/Cards/Widgets**: Review list/dashboard; sentiment breakdown (positive/neutral/negative); common feedback themes/tags.
- **Tables/Lists**: Columns — Candidate, Job, Status (Hire/Reject), Rating, Feedback, Date, Actions.
- **Filters & Search**: Candidate search; status filter (Hire, Reject); rating filter (5-star); date range.
- **Buttons & Actions**: "View Review"; "Respond"; "Archive"; "Flag as Inappropriate".
- **Forms/Modals/Popups**: Review detail modal; respond-to-review modal.
- **Statuses/Badges**: Sentiment badge (Positive=green, Neutral=gray, Negative=red); status badge; rating stars.
- **Empty/Loading/Error states**: "No reviews yet"; loading spinner.

---

### Page: Referrals (`/app/referrals`)
- **Component file**: `src/pages/admin/AdminReferrals.jsx`
- **Purpose**: Track employee referral program — referred candidates, referrer rewards, conversion funnel.
- **Sections/Cards/Widgets**: Referral summary stats (total referrals, converted, pending, rewards paid); referral list; top referrers leaderboard.
- **Tables/Lists**: Columns — Referrer Name, Candidate Name, Job, Status, Referred Date, Reward Amount, Actions.
- **Filters & Search**: Referrer search; status filter (Pending, Hired, Rejected); candidate search; date range.
- **Buttons & Actions**: "View Details"; "Approve Reward"; "Reject Reward"; "Send Payout"; "View Candidate Profile".
- **Forms/Modals/Popups**: Referral detail modal; reward approval modal.
- **Statuses/Badges**: Referral status (Pending, Hired, Rejected, Reward Approved, Paid); reward amount badge.
- **Empty/Loading/Error states**: "No referrals"; loading state.

---

### Page: Talent Pool (`/app/talent-pool`)
- **Component file**: `src/pages/recruiter/TalentPool.jsx` (shared — see [02-recruiter.md](02-recruiter.md))
- **Purpose**: Org-wide talent pool of interested/passive candidates — search by skills/location, bulk tag/assign.
- **Sections/Cards/Widgets**: Talent pool candidates list; filter section; bulk action toolbar.
- **Tables/Lists**: Columns — Name, Email, Skills, Location, Last Activity, Actions.
- **Filters & Search**: Skills multi-select; location filter; experience level; last activity date range.
- **Buttons & Actions**: "Add to Pipeline"; "Assign"; "Tag"; "Send Email"; "Download List".
- **Forms/Modals/Popups**: Bulk assign modal; email campaign modal.
- **Statuses/Badges**: Tags; activity status; source badge.
- **Empty/Loading/Error states**: "No candidates in pool".

---

### Page: NPS (`/app/nps-dashboard`)
- **Component file**: `src/pages/admin/AdminNPS.jsx`
- **Purpose**: Net Promoter Score dashboard — candidate satisfaction with hiring experience, analyzed by job/recruiter/time period.
- **Sections/Cards/Widgets**: NPS Score card (large number, color-coded by range); response count cards (Promoters, Passives, Detractors, Response Rate %); NPS score trend chart; feedback themes/word cloud (optional); recent feedback list.
- **Tables/Lists**: NPS responses table — Respondent Name, Score, Feedback, Status (Hire/Reject), Response Date, Actions.
- **Filters & Search**: Date range filter; status filter (Hire, Reject); score filter (9-10, 7-8, 0-6).
- **Buttons & Actions**: "Apply" (date range); "Clear" (reset filters); "Generate NPS Data" (seed sample responses); "View Feedback" (detail modal); "Send Thank You" (follow-up email).
- **Forms/Modals/Popups**: Feedback detail modal.
- **Statuses/Badges**: NPS category (Promoter=green, Passive=blue, Detractor=red); score color-coded.
- **Empty/Loading/Error states**: "No NPS responses yet" with seed-data button; loading spinner.

---

### Page: Time to Fill (`/app/time-to-fill`)
- **Component file**: `src/pages/admin/TimeToFillTracker.jsx`
- **Purpose**: Track recruitment speed — days-to-fill per job position, identify bottlenecks.
- **Sections/Cards/Widgets**: Summary stat cards (Total Jobs, Positions Filled, Avg Days to Fill, Open Positions); time-to-fill by job table with visual bar (green ≤14d, orange ≤30d, red >30d); trend chart.
- **Tables/Lists**: Jobs table — Job Title, Company, Status, Openings, Filled, Days to Fill (progress bar), Hired Count, Last Filled, Actions. Sortable; pagination 50/page.
- **Filters & Search**: Job title search; status filter (Active, Closed, Paused, Draft); department filter.
- **Buttons & Actions**: "View Details"; "View Applicants"; "View Hired Candidates"; "Download Report".
- **Forms/Modals/Popups**: NOT FOUND IN CODE.
- **Statuses/Badges**: Status badge; days-to-fill progress bar (green/orange/red); filled indicator.
- **Empty/Loading/Error states**: "No hiring data yet"; loading state.

---

### Page: Merge Duplicates (`/app/duplicate-merge`)
- **Component file**: `src/pages/admin/DuplicateMerge.jsx`
- **Purpose**: Find and merge duplicate candidate records (same name/email/phone) — select primary, confirm duplicates, execute merge.
- **Sections/Cards/Widgets**: Duplicate groups list ("N groups found"); per-group merge UI (candidate cards with primary indicator).
- **Tables/Lists**: NOT FOUND (card-based UI for duplicate groups).
- **Filters & Search**: NOT FOUND IN CODE.
- **Buttons & Actions**: "Refresh" (re-scan for duplicates); per-group "Set as Primary" (on secondary card); "Merge" (executes, removes from queue); "Dismiss" (skip group, reappears next scan).
- **Forms/Modals/Popups**: NOT FOUND (inline card UI).
- **Statuses/Badges**: PRIMARY badge on primary card; "Set as Primary" on secondary cards.
- **Empty/Loading/Error states**: "Scanning for duplicates…"; "No Duplicates Found" (✅); merge success/failure toast.

---

### Page: Sourcing Tracker (`/app/sourcing-tracker`)
- **Component file**: `src/pages/admin/SourcingTracker.jsx`
- **Purpose**: Track recruitment sources (LinkedIn, referral, direct, job board, etc.) — quality/conversion per source, optimize sourcing spend.
- **Sections/Cards/Widgets**: Source effectiveness KPI cards (applications, hires, cost-per-hire by source); source distribution pie/donut chart; conversion funnel by source; cost analysis (CAC per source).
- **Tables/Lists**: Sources table — Source Name, Applications, Hires, Conversion %, Cost/Hire, Last Activity, Actions.
- **Filters & Search**: Source filter; date range filter; job filter.
- **Buttons & Actions**: "View Details"; "Edit Source"; "View Candidates from Source"; "Download Report".
- **Forms/Modals/Popups**: Source edit modal (name, cost per hire, budget, notes).
- **Statuses/Badges**: Source category badge; conversion % badge; cost badge.
- **Empty/Loading/Error states**: "No sourcing data"; loading state.

---

### Page: Rejection Templates (`/app/rejection-templates`)
- **Component file**: `src/pages/admin/RejectionTemplates.jsx`
- **Purpose**: Create/manage reusable rejection email templates with placeholders, tagged by stage.
- **Sections/Cards/Widgets**: Template list (card/table); template editor modal.
- **Tables/Lists**: Columns — Template Name, Stage, Subject, Default Badge, Actions.
- **Filters & Search**: Template name search; stage filter.
- **Buttons & Actions**: "Create Template" (TemplateModal); "Edit"; "Preview" (sample email with placeholders filled); "Duplicate"; "Set as Default" (per stage); "Delete" (confirm); "Use Template" (when sending rejection); "Seed Default Templates".
- **Forms/Modals/Popups**: TemplateModal — Template Name (text), Stage (dropdown, empty = "any" or specific stage), Email Subject (text, supports `{{candidateName}}`, `{{jobTitle}}`, `{{company}}`), Email Body (textarea, placeholders), Set as Default (checkbox).
- **Statuses/Badges**: Default template badge; stage tag.
- **Empty/Loading/Error states**: "No rejection templates" with Seed Templates button; loading spinner.

---

### Page: Offer Letter Builder (`/app/offer-letter-builder`)
- **Component file**: `src/pages/admin/OfferLetterBuilder.jsx`
- **Purpose**: Customize offer letter template sections (introduction, compensation, joining, terms, closing) with placeholders for variable data.
- **Sections/Cards/Widgets**: Section navigator (left sidebar); editor (center textarea); live preview (right panel, toggleable); placeholder chips (copyable).
- **Tables/Lists**: NOT FOUND (text editor interface).
- **Filters & Search**: NOT FOUND.
- **Buttons & Actions**: Section nav buttons; "Live Preview" toggle; "Save Template" (`updateCustomizationsSingleton`); placeholder chips (click to copy).
- **Forms/Modals/Popups**: NOT FOUND (inline editor). Field sections (OLT_FIELDS): Opening Paragraph, Compensation Section, Joining Instructions, Terms & Conditions, Closing/Sign-off, Custom Additional Clauses, Signatory Job Title, Footer Note.
- **Statuses/Badges**: NOT FOUND.
- **Empty/Loading/Error states**: "Loading template…"; save success/failure toast.
- **Available placeholders**: `{{candidateName}}`, `{{designation}}`, `{{companyName}}`, `{{ctc}}`, `{{joiningDate}}`, `{{signatoryName}}`, `{{supportEmail}}`.

---

### Page: Dashboard Widgets (`/app/dashboard-widgets`)
- **Component file**: `src/pages/admin/DashboardWidgets.jsx`
- **Purpose**: Customize admin dashboard — enable/disable widgets (KPIs, charts, tables), set layout and order.
- **Sections/Cards/Widgets**: Widget library (toggle/preview); widget ordering (drag-reorder); per-widget configuration panel.
- **Tables/Lists**: NOT FOUND (widget picker UI).
- **Filters & Search**: Widget name search.
- **Buttons & Actions**: Enable/Disable toggle per widget; "Configure" (config modal); drag-reorder; "Save Layout"; "Reset to Default".
- **Forms/Modals/Popups**: Widget config modal (title, size, sort order, filters, refresh rate).
- **Statuses/Badges**: Widget enabled/disabled badge.
- **Empty/Loading/Error states**: "No widgets selected" if all disabled.

---

### Page: Headcount Planner (`/app/headcount-planner`)
- **Component file**: `src/pages/admin/HeadcountPlanner.jsx`
- **Purpose**: Plan team headcount — forecast hiring needs, track planned vs actual hires per department/role.
- **Sections/Cards/Widgets**: Headcount forecast chart (planned hiring by month); department/role breakdown; planned vs actual comparison; budget impact analysis.
- **Tables/Lists**: Headcount plan table — Role/Department, Planned Hires, Actual Hires, Variance, Budget, Status, Actions.
- **Filters & Search**: Department filter; role filter; date range.
- **Buttons & Actions**: "Create Plan"; "Edit Plan"; "Track Progress"; "Export Plan" (CSV/PDF); "Adjust Forecast".
- **Forms/Modals/Popups**: Plan create/edit form (role, department, planned count, timeline, budget).
- **Statuses/Badges**: Status badge (On Track, At Risk, Exceeded); progress % bar.
- **Empty/Loading/Error states**: "No headcount plans"; loading state.

---

### Page: Hiring Alerts (`/app/sla-alerts`)
- **Component file**: `src/pages/admin/SlaAlerts.jsx`
- **Purpose**: Configure SLAs for hiring stages and alerts for breaches (stale jobs, stuck candidates, overdue offers).
- **Sections/Cards/Widgets**: SLA compliance summary (% on-time per stage); breach alerts table; SLA rule configuration.
- **Tables/Lists**: SLAs by stage — Stage, Target Days, Current Avg Days, Compliance %, Breaches, Actions.
- **Filters & Search**: Stage filter; breach status filter (On Track, At Risk, Breached).
- **Buttons & Actions**: "Create SLA"; "Edit SLA"; "View Breaches"; "Auto-remediate" (auto-move stale jobs, notify stuck candidates); "Acknowledge" (dismiss alert).
- **Forms/Modals/Popups**: SLA rule form (stage, target days, notification threshold, auto-action).
- **Statuses/Badges**: Compliance status (On Track=green, At Risk=orange, Breached=red).
- **Empty/Loading/Error states**: "No SLA breaches"; loading state.

---

### Page: Custom Stages (`/app/custom-stages`)
- **Component file**: `src/pages/admin/CustomHiringStages.jsx`
- **Purpose**: Define custom hiring pipeline stages beyond defaults (Applied, Screening, Shortlisted, Interview, Offer, Hired, Rejected) — reorder, customize labels/colors.
- **Sections/Cards/Widgets**: Stage list (card/table); stage editor form; stage preview (visual pipeline with custom stages).
- **Tables/Lists**: Stages table — Stage Name, Order, Color, Status, Actions.
- **Filters & Search**: NOT FOUND IN CODE.
- **Buttons & Actions**: "Add Stage"; "Edit"; "Delete" (soft delete, confirm, only if not in-use); drag-reorder; "Set Color" (color picker); "Save Changes"; "Reset to Default".
- **Forms/Modals/Popups**: Stage editor form (name, label, color, position in pipeline, type [standard/custom]).
- **Statuses/Badges**: Custom badge (vs default); in-use indicator (jobs using this stage).
- **Empty/Loading/Error states**: "No custom stages"; default stages shown read-only; loading state.

---

### Page: Automation (`/app/automation`)
- **Component file**: `src/pages/admin/AdminAutomation.jsx`
- **Purpose**: Create/manage workflow rules — trigger actions on events (new application, stage change, hire, etc.) with conditions and actions.
- **Sections/Cards/Widgets**: Automation rule list table; rule builder interface; system rules section (pre-built/managed).
- **Tables/Lists**: Columns — Rule Name, Trigger, Action, Status (Active/Inactive), Category (General, Communication, Pipeline, Assessment, Offer, Onboarding), Last Triggered, Actions.
- **Filters & Search**: Rule name search; status filter; category filter.
- **Buttons & Actions**: "Create Rule" (RuleBuilder modal); "Edit"; "Duplicate"; "Activate"/"Deactivate"; "Test" (runs on sample data); "View Logs"; "Delete" (confirm).
- **Forms/Modals/Popups**: RuleBuilder (wide modal) — Rule name; Trigger event dropdown (candidate_applied, stage_changed, candidate_hired, candidate_rejected, interview_scheduled, assessment_completed, offer_not_signed, offer_accepted, job_published, candidate_stuck); Conditions (field/operator [equals, not_equals, above, below, contains]/value, "Add condition"); Actions list (send_email, send_whatsapp, notify_recruiter/notify_admin, move_stage, assign_tag, add_note, create_task, "Add action"); variable picker (`{{candidateName}}`, `{{jobTitle}}`, etc.).
- **Statuses/Badges**: Status badge (Active=green, Inactive=gray); category badge.
- **Empty/Loading/Error states**: "No automation rules"; rule builder loading state; test execution spinner.

---

### Page: Customizations (`/app/customizations`)
- **Component file**: `src/pages/superadmin/SuperAdminCustomizations.jsx` (shared with admin via route)
- **Purpose**: Customize org branding, custom candidate fields, email templates, approval workflows.
- **Sections/Cards/Widgets**: Brand colors section (primary, secondary, accent, background); custom field builder; email template builder; approval workflow editor.
- **Tables/Lists**: Custom fields table — Field Name, Type, Required, Visibility, Actions.
- **Filters & Search**: Field name search.
- **Buttons & Actions**: "Add Custom Field"; "Edit Field"; "Delete Field" (confirm); "Save Brand Colors" (color pickers); "Edit Email Templates"; "Edit Approval Workflow".
- **Forms/Modals/Popups**: Custom field form (name, label, type [text/email/phone/date/dropdown/textarea/checkbox], required toggle, visibility [all/admin-only/etc.]); brand color picker modal; email template editor.
- **Statuses/Badges**: Field required indicator; visibility badge.
- **Empty/Loading/Error states**: "No custom fields"; loading state.

---

### Page: Career Community (`/app/feed`)
- **Component file**: `src/pages/shared/CommunityFeed.jsx` — Same as Candidate ([01-candidate.md](01-candidate.md)) / Recruiter ([02-recruiter.md](02-recruiter.md)). Admin can additionally moderate/delete posts (see Reported Posts below).

### Page: My Network (`/app/people`)
- **Component file**: `src/pages/shared/PeoplePage.jsx` — Same as Candidate / Recruiter.

### Page: Communities (`/app/communities`)
- **Component file**: `src/pages/shared/CommunitiesPage.jsx` — Same as Candidate / Recruiter.

---

### Page: Reported Posts (`/app/reported-posts`)
- **Component file**: `src/pages/superadmin/SuperAdminReportedPosts.jsx` (shared with super admin)
- **Purpose**: Moderate reported community posts — review reports, delete inappropriate content, warn/ban users.
- **Sections/Cards/Widgets**: Reported posts list table; report detail modal (full post, reason, reporter info, moderation actions).
- **Tables/Lists**: Columns — Post Preview, Reporter, Reason, Reported Date, Status (Pending Review, Approved, Deleted, User Banned), Actions.
- **Filters & Search**: Status filter; reason filter (Spam, Inappropriate, Harassment, Other); date range.
- **Buttons & Actions**: "Review" (detail modal); "Approve Post" (keep, mark reviewed); "Delete Post"; "Ban User"; "Warn User" (email).
- **Forms/Modals/Popups**: Report detail modal (post content, reporter info, reason, action dropdown).
- **Statuses/Badges**: Status badge (Pending=orange, Approved=green, Deleted=red, User Banned=red); reason badge.
- **Empty/Loading/Error states**: "No reported posts"; loading state.

---

### Page: Org Settings (`/app/org-settings`)
- **Component file**: `src/pages/admin/OrgSettings.jsx`
- **Purpose**: Org-level configuration — email provider, branding, hiring stages, custom fields, password policy.
- **Sections/Cards/Widgets**: Org details (name, domain, industry, size); email configuration (provider, API key, from address, branding); email template live preview; logo manager; stage management; team settings (members, org chart).
- **Tables/Lists**: Custom stages table (Stage Name, Order, Color, Actions); team members table (Name, Email, Role, Actions).
- **Filters & Search**: NOT FOUND IN CODE.
- **Buttons & Actions**: "Save Settings" (`updateOrg`); "Test Email"; "Change Logo" (upload); "Add/Edit/Delete Stage"; "Add/Remove Team Member"; "Change Password" (ChangePasswordModal).
- **Forms/Modals/Popups**: Org settings form (Org name, Domain, Industry dropdown, Org size dropdown, Logo upload/crop); email settings form (From name, From email, Provider [resend/smtp/custom], API Key [password field], SMTP Host/Port if smtp, sending domain, brand colors [color pickers], support email, website URL, header subtitle, footer text); email template preview (live HTML render with brand colors); ChangePasswordModal; stage form (name, order, color); invite team member modal (email, role [Recruiter/Admin], assign jobs).
- **Statuses/Badges**: Email provider status (Connected, Error); logo uploaded indicator; custom stages count badge.
- **Empty/Loading/Error states**: Loading state for org fetch; email test spinner; save success/failure toast.

---

### Page: Platform Guide (`/app/modal-guide`)
- **Component file**: `src/pages/shared/PlatformModalsGuide.jsx`
- **Purpose**: Visual guide/documentation of all modals/UI components available in the platform — reference for users.
- **Sections/Cards/Widgets**: Component library (grid of modal/component previews).
- **Tables/Lists**: NOT FOUND (component showcase).
- **Filters & Search**: Component search; category filter (Forms, Modals, Cards, etc.).
- **Buttons & Actions**: "View Code" (component snippet); "Copy HTML"; "Customize" (interactive editor).
- **Forms/Modals/Popups**: Interactive component editor (live preview + code).
- **Statuses/Badges**: Component status (Stable, Experimental, Deprecated).
- **Empty/Loading/Error states**: Loading spinner.

---

### Page: Billing (`/app/billing`)
- **Component file**: `src/pages/billing/BillingPage.jsx`
- **Purpose**: Manage org billing — subscription plan, usage, invoices, payment methods; upgrade/downgrade.
- **Sections/Cards/Widgets**: Current plan card (name, price, features, renewal date); usage card (feature quota usage); invoice history table; payment method section.
- **Tables/Lists**: Invoices table — Date, Amount, Status (Paid, Pending, Failed), PDF link.
- **Filters & Search**: Invoice date range filter.
- **Buttons & Actions**: "Upgrade Plan"; "Change Plan"; "Download Invoice" (PDF); "Update Payment Method"; "View Receipts".
- **Forms/Modals/Popups**: Plan upgrade modal (available plans, pricing, features comparison).
- **Statuses/Badges**: Plan status badge (Active, Trial, Expired); payment status badge (Paid=green, Pending=orange, Failed=red).
- **Empty/Loading/Error states**: Loading state; "No invoices yet".

---

### Page: My Profile (`/app/profile`)
- **Component file**: `src/pages/shared/ProfilePage.jsx` — Same as Recruiter ([02-recruiter.md](02-recruiter.md)). Edit own profile (name, email, phone, photo, title); change password.

---

## Admin Feature Checklist

### Dashboard & Analytics
- View org-wide hiring metrics (applications, hires, conversion %, time-to-fill)
- Trending KPIs with sparklines and period-over-period comparison
- Deep-dive insights (smart alerts, recruiter leaderboards, SLA compliance, stage velocity, dropout analysis)
- Export analytics data to CSV
- Customize dashboard widgets (enable/disable, reorder, configure)
- Filter analytics by date range, department, recruiter, source, stage

### Job Management
- View all org jobs created by all recruiters
- Create, edit, publish, close jobs
- Approve/reject jobs submitted by recruiters with feedback (job approval queue)
- Manage job distribution across sources
- Track applications per job; bulk tag/categorize jobs

### Candidate Management
- View org-wide candidate database with search/filter (name, email, skills, location, source, status)
- View full candidate profiles (applications, interviews, offers)
- Assign candidates to recruiters; bulk operations (assign, tag, export)
- Merge duplicate candidate records (CandidateMergeWizard, DuplicateMerge scanner)
- Download candidate records (CSV)

### Application Pipeline
- View all org applications across all jobs
- Move candidates through pipeline stages
- Schedule interviews; send offers; send rejections (template-based)
- Auto-trigger actions on stage change (e.g. collect CTC/package on hire)
- View application timeline and history

### Job Approvals & Workflow
- Review pending jobs from recruiters (preview full job details)
- Approve to publish or return for revision with feedback notes

### Interview Management
- Create/manage reusable interview kits (questions, competencies, screening questions)
- Link kits to jobs; set default kit
- View all candidate interviews (schedule, scores, feedback); scorecards/notes

### Assessments
- View all org assessments assigned to candidates
- Review submissions, scores, provide feedback; resend assessments

### Onboarding & Pre-boarding
- Manage onboarding records for hired candidates
- Track/verify documents (approve, reject, request resubmission)
- Manage task completion; add custom tasks; send reminders

### Recruiter & Team Management
- View all recruiters with stats (jobs, applications, hires, conversion %)
- Edit recruiter details; activate/deactivate; invite; force password reset
- Assign/unassign jobs; redistribute jobs across team; auto-classify team by role

### Hiring Manager & Client Management
- View all hiring managers (teams, interview schedules); create/edit/deactivate accounts
- Manage client records and hiring requirements/fulfillment tracking

### Org Chart & Structure
- View org hierarchy (admins, recruiters, teams); redistribute jobs/candidates; auto-classify members

### Analytics & Reporting
- Diversity report (gender representation, hire rates by gender)
- Time-to-fill tracker per job
- Sourcing tracker (source quality, conversion, cost-per-hire)
- NPS dashboard (candidate satisfaction)
- Referral program tracking (rewards, conversion)
- SLA compliance / hiring alerts dashboard
- Headcount planner (forecast vs actual hires)

### Email & Communication
- Configure email provider (Resend, SMTP, custom); test email delivery
- Manage email templates (invitation, offer, interview, rejection, onboarding, custom) with brand-colored live preview
- Configure email branding (sender name/email, logo, colors, footer, support email, website)
- Bulk outreach campaigns (email/WhatsApp); delivery logs and engagement metrics

### Webhooks & Integrations
- Create/manage webhooks (event subscriptions: applications, stage changes, interviews, offers, jobs, onboarding/BGV)
- Test delivery; view logs; retry failures; generate signing secrets

### Automation & Workflows
- Create automation rules (trigger + conditions + actions)
- Triggers: candidate_applied, stage_changed, candidate_hired, candidate_rejected, interview_scheduled, assessment_completed, offer_not_signed, offer_accepted, job_published, candidate_stuck
- Actions: send_email, send_whatsapp, notify_recruiter/admin, move_stage, assign_tag, add_note, create_task
- Template variables (`{{candidateName}}`, `{{jobTitle}}`, etc.); activate/deactivate; test; view logs

### Customization & Configuration
- Custom hiring stages (add/edit/delete/reorder/color)
- Custom candidate fields (text, email, phone, date, dropdown, textarea, checkbox; visibility control)
- Rejection email templates (stage-specific, with placeholders, seedable defaults)
- Offer letter builder (sections, clauses, placeholders, live preview)

### Org Settings & Admin
- Update org details (name, domain, industry, size); manage logo
- Manage team members (add/edit/remove/invite)
- Change own password
- Configure password policy

### Notifications & Alerts
- Smart alerts (stale jobs, stuck candidates, pending offers)
- SLA/hiring alert configuration with auto-remediation (auto-move stale jobs, notify stuck candidates)

### Community & Social
- Post to and browse career community feed
- Moderate community posts; review reported posts (approve/delete/warn/ban)
- Browse org member profiles via My Network; join/manage communities

### Reporting & Exports
- Export application/candidate/job records (CSV)
- Export recruitment reports (sources, funnel, metrics)
- Download analytics data; download invoices (PDF)

### Billing & Subscription
- View current plan, pricing, usage vs quota
- Upgrade/downgrade plan; update payment method
- Download invoices/receipts; view billing history

### Platform Reference
- "Platform Guide" component/modal showcase for reference

---

**End of Admin Module Documentation**
