# Recruiter Module — User Experience & Feature Playbook

**Sidebar nav** (`NAVS.recruiter` in `Layout.jsx`): Dashboard · My Performance · Applicants · My Jobs · College Drives · My Candidates · Assigned to Me · Job Match · Pipeline · Talent Pool · Interviews · Offers · Pre-boarding · Assessments · Outreach · Candidate Requests · Client Requirements · Clients · Career Community · My Network · Communities · Company Reviews · My Profile

> Shared sidebar/header elements documented once in [00-overview.md](00-overview.md).

---

### Page: Dashboard (`/app/dashboard`)
- **Component file**: `src/pages/recruiter/RecruiterDashboard.jsx`
- **Purpose**: Real-time recruiting metrics, pipeline health, upcoming interviews, recent activity, with drill-downs into bottlenecks.
- **Sections/Cards/Widgets**: Daily Action Queue (interviews today, new applications, offers pending, jobs expiring); Today's Interview Schedule (with join links); Pipeline Bottleneck Alert (5+ candidates stuck in a stage); KPI cards (Active Jobs, Total Applicants, In Interview, Offer Extended, Hired + conversion %); Application Velocity (14-day trend chart); Applications by Job (bar chart); Top Jobs by Applicants (leaderboard); Hiring Funnel (vertical funnel with rejection/hired/active splits); Upcoming Interviews (7-day list); Job Performance table (Job, Company, Urgency, Applicants, Shortlisted, Interviewed, Hired, Conversion); Admin-Assigned Candidates (6 recent, expandable); Interested Candidates (from invites, 8 shown); Recent Activity timeline (stage transitions with "Park" action); "What's New" feature guide (collapsible, with nav links).
- **Buttons & Actions**: Retry Connection (on error); drill-down clicks on charts/rows → Pipeline; "View All" (Admin-Assigned → `/app/pipeline`, Interested → `/app/outreach`); Park candidate; open candidate profile (UserDetailDrawer); "What's New" links; "Join →" on today's interviews.
- **Statuses/Badges**: Job status (Active/Open/Closed); Urgency (High/Medium/Low); Interview status (done/now/upcoming); stage badges.
- **Empty/Loading**: Spinner; error card with retry.

---

### Page: My Performance (`/app/my-performance`)
- **Component file**: `src/pages/recruiter/RecruiterMyPerformance.jsx`
- **Purpose**: Personal recruiting KPIs — job count, placements, offer acceptance rate, time-to-hire.
- **Sections/Cards/Widgets**: KPI row (Total Jobs, Total Applications, Candidates Hired, Interviews Done, Offers Sent + acceptance %, Avg Days to Hire); Pipeline Funnel mini-bars (Applied → Screening → Interview → Offered → Hired); Offer Performance (Sent/Accepted/Declined cards + acceptance-rate bar); Top Jobs by Applications (top 6, with candidate count and status).
- **Buttons & Actions**: None — read-only.
- **Statuses/Badges**: Color-coded performance (green = high %, red = low).
- **Empty/Loading**: Spinner if data unavailable.

---

### Page: My Jobs (`/app/jobs`)
- **Component file**: `src/pages/recruiter/RecruiterJobs.jsx`
- **Purpose**: Create, edit, close, and manage job postings; view applicants; attach screening assessments.
- **Sections/Cards/Widgets**: Tabs — Active/Closed/Draft/All (with counts); closed-jobs stats strip (Total Closed, Total Hired, Total Applicants, Avg Days to Close); search + urgency filter; job cards (title, status badge, urgency badge, external-URL badge, company, location, experience, description excerpt, skill badges, applicants/hired counts; closed cards show posted/closed dates, conversion %, days to close); pagination (Prev/Next, >20 jobs).
- **Filters & Search**: Search (debounced 400ms, title/keyword); Urgency filter (High/Medium/Low/All) + Clear.
- **Buttons & Actions**: "+ Post Job" → PostJobForm modal (optional Assessment Builder); "View Details" → JobDetailDrawer; "📣 Share" → ShareJobModal; "👥 Applicants" → ApplicantsPanel modal (search, view resume, edit profile); "✏️ Edit" → PostJobForm (edit); "🚀 Submit for Approval" (draft → `patchJob` approvalStatus=pending_approval); "🔄 Reopen" / "🔒 Close" (toggle status); "Delete" (confirm, `deleteJob`).
- **Forms/Modals**: PostJobForm — title*, company*, department, location, jobType, workMode, experience, openings, applicationDeadline, urgency, skills, description, requirements, benefits, education, externalUrl, salaryMin/Max/Currency, isPublic, screeningQuestions; optional Assessment Builder (title, time limit, passing score, instructions, isActive, autoAdvance, MCQ/text/code questions). ApplicantsPanel — search by name/email, candidate cards (skills, experience, CTC), Edit Profile / View Resume.
- **Statuses/Badges**: Job status (Open/Closed/Draft); Urgency (High/Medium/Low); external-URL indicator.
- **Empty/Loading**: Spinner; per-tab empty messages; pagination info.

---

### Page: Applicants (`/app/applicants`)
- **Component file**: `src/pages/shared/ApplicantsRecordsPage.jsx`
- **Purpose**: Flat table of all applicants across jobs (not grouped by pipeline stage).
- **Tables/Lists**: Columns — Applicant, Email, Mobile, Job, Stage, Status, Source, Talent Match Score, Skills, Experience, Current Company, Location, Notice Period, Applied Date, Latest Interview, Notes. Pagination 100/page; client-side sort on any column; row click → DetailDrawer (read-only).
- **Filters & Search**: Text search (name/email); Stage filter (Applied/Screening/Shortlisted/Interview Round 1/Interview Round 2/Offer/Hired/Rejected); Source filter (Job Board, LinkedIn, Referral, Internal, etc.); Status filter (Active/Hired/Rejected/Withdrawn/Parked); Date range (Applied From/To); Talent Match Score min-threshold slider; Experience level (Fresher/Experienced).
- **Buttons & Actions**: Export to CSV; Reset filters.
- **Empty/Loading**: Skeleton rows; empty-state message.

---

### Page: College Drives (`/app/college-drives`)
- **Component file**: `src/pages/recruiter/CompanyCollegeDrives.jsx`
- **Purpose**: View college placement drives the company is running across colleges (read-only).
- **Sections/Cards/Widgets**: College-name autocomplete filter; grid of drive cards (title, college name, status badge, opportunity type — Placement/Internship/Exam, exam provider, date, mode — Online/Offline, location, description, registration/shortlisted/selected counts).
- **Statuses/Badges**: Status (upcoming/ongoing/completed/cancelled), color-coded.
- **Empty/Loading**: Spinner; error message; empty state.

---

### Page: My Candidates (`/app/candidates`)
- **Component file**: `src/pages/recruiter/RecruiterCandidates.jsx`
- **Purpose**: Browse/manage the candidate database — profiles, pipeline assignment, outreach logging, parking.
- **Sections/Cards/Widgets**: Candidate cards grid (avatar, name, online-status badge, title, location, experience, phone, email, expected CTC, availability, top-5 skills + "+N more", summary excerpt, outreach tracker with "Log Outreach", multi-select job dropdown + bulk "Add to Pipeline", "Send Invitation").
- **Filters & Search**: Debounced search (name/email/title); Skills filter; Experience range slider; Location filter; Availability filter; Salary range (current/expected CTC).
- **Buttons & Actions**: "✏️ Edit" → UserDetailDrawer; "🅿️ Park"; "📋 Resume" → `/app/resume/{candidateId}`; "Log Outreach" (note + debounced save, `updateOutreach`); job multi-select + "➕ Add to Pipeline" (bulk `applyToJob`); "📧 Send Invitation" → InviteModal.
- **Statuses/Badges**: Online status; Availability status.
- **Empty/Loading**: Spinner; empty state.

---

### Page: Assigned to Me (`/app/assigned-candidates`)
- **Component file**: `src/pages/shared/AssignedCandidates.jsx`
- **Purpose**: Candidates specifically assigned to this recruiter, grouped by job (handoff tracking).
- **Sections/Cards/Widgets**: Job cards (accordion); "First Recruiter" banner (with history button) or "Handoff" banner (previous recruiter name/email/phone/reassignment date); candidate list per job (paginated 10/page) — name, title, company, experience, stage badge, applied date, SLA dot (green/orange/red), action buttons (move stage, view details, manage feedback).
- **Filters & Search**: Search by candidate name/email within each job.
- **Buttons & Actions**: "View History" → JobRecruiterHistory modal; move-to-stage buttons; open UserDetailDrawer; manage feedback (past interviews).
- **Empty/Loading**: Empty state if no jobs assigned; loading skeleton.

---

### Page: Job Match (`/app/talent-match`)
- **Component file**: `src/pages/recruiter/RecruiterTalentMatch.jsx`
- **Purpose**: AI/UTO-scored candidate-to-job matching for a selected job.
- **Sections/Cards/Widgets**: Job selector (searchable, required); candidate search; match-results grid (avatar, name, title, experience, location, match-score ring color-coded green ≥80% / yellow ≥50% / red <50%, match category badge — Exceptional/Strong/Good/Possible, skills, summary, UTO breakdown tooltip, action buttons).
- **Filters & Search**: Job picker (title/company/location autocomplete); candidate search (name/email/title); match category via badges.
- **Buttons & Actions**: Select job → runs matching; "⭐ Shortlist" / "📌 Park" / "📧 Reach Out" (`talentMatchAction`); card click → UserDetailDrawer; "📋 View Resume" → `/app/resume/{candidateId}`.
- **Empty/Loading**: Spinner; empty results if no job selected or no matches.

---

### Page: Pipeline (`/app/pipeline`)
- **Component file**: `src/pages/recruiter/RecruiterPipeline.jsx`
- **Purpose**: Kanban drag-and-drop pipeline management.
- **Sections/Cards/Widgets**: Filters bar (job, stage, source, date range, candidate search); Kanban board columns — Applied, Screening, Shortlisted, Interview Scheduled, Interview Completed, Offer Extended, Selected, Rejected, Parked. Candidate cards: avatar, name, title, experience, email, phone, UTO match-score ring, stage badge, applied date, "email invite sent" indicator, video-resume link, tagging (Top Talent/On Hold/Budget Fit/Overqualified/Culture Fit — toggle), screening-question answers, notes (debounced auto-save), assessment result badge (Pass/Fail/Pending).
- **Filters & Search**: Job/Stage/Source dropdowns; Applied-date range; candidate name search; bulk select checkboxes + bulk actions (move to stage, mark interested, reject selected).
- **Buttons & Actions**: Drag card between stage columns; stage-selector dropdown; tag toggle; "Edit Notes" (textarea, auto-save on blur); "📅 Schedule Interview" → ScheduleInterviewPage modal; "📄 Generate Offer" → GenerateOfferPage modal; "📝 Feedback" → FeedbackModal; "❌ Reject" → CandidateRejectionPage modal; "🅿️ Park"; card click → details.
- **Forms/Modals**: FeedbackModal — rating 1-5, strengths/weaknesses text, recommendation (Move Forward/Do Not Proceed), optional Interview Kit scoring. ScheduleInterviewPage — Date, Time, Format (video/phone/in_person), Interviewer Name/Email, Video Link, Notes. GenerateOfferPage — CTC, Designation, Start Date, etc. CandidateRejectionPage — reason + template selection.
- **Statuses/Badges**: Stage badge; UTO match %; assessment status; interview status; SLA indicator.
- **Empty/Loading**: Empty stage columns; loading skeleton.

---

### Page: Talent Pool (`/app/talent-pool`)
- **Component file**: `src/pages/recruiter/TalentPool.jsx`
- **Purpose**: Org-wide curated talent pools + personal parked candidates.
- **Sections/Cards/Widgets**: Tabs — "🏢 Org Pools" (count) / "🅿️ My Parked" (count). Org Pools: grid of pool cards (name, description, tags, member count) → expand to members table (Candidate, Title, Notes, "Pull to Job"). My Parked: search bar + table (Candidate, Title, Parked Date, Current Status, "Pull to Job"/"Unpark").
- **Filters & Search**: Search parked candidates (name/email/title/job title).
- **Buttons & Actions**: Click pool card to expand; click member → profile drawer; "Pull to Job" modal (select target job, `applyToJob`); "Unpark"; "Add to Org Pool" modal; "🔄 Sync" (refresh).
- **Empty/Loading**: Spinner; per-tab empty states.

---

### Page: Interviews (`/app/interviews`)
- **Component file**: `src/pages/recruiter/RecruiterInterviews.jsx`
- **Purpose**: Schedule/manage interview rounds, submit scorecards.
- **Sections/Cards/Widgets**: "Pending Schedule" alert (apps awaiting scheduling, with "Schedule Interview" button); tabs — "📅 Upcoming" (count) / "📁 Past" (count); table (Candidate, Job, Round, Date, Format, Actions) — Upcoming: "Schedule Interview" if unscheduled, "Create Room" (video), "Scorecard" (past w/o feedback); Past: "Scorecard" or "Scored" badge.
- **Buttons & Actions**: "Schedule Interview" → ScheduleInterviewPage (Date*, Time*, Format dropdown, Interviewer Name/Email, auto-created Video Link); "Create Room" (random room ID + meeting link); "Scorecard" → ScorecardModal (rating 1-5, technical/communication/problem-solving/culture-fit scores, recommendation, notes).
- **Statuses/Badges**: Format badge (Video/Phone/In-Person); "Scored" badge.
- **Empty/Loading**: Empty state per tab; loading skeleton.

---

### Page: Offers (`/app/offers`)
- **Component file**: `src/pages/recruiter/RecruiterOffers.jsx`
- **Purpose**: Generate, send, and track offer letters.
- **Tables/Lists**: Columns — Candidate, Job, CTC, Offer Status, Actions. Status values: Not Created, Draft, Sent, Signed, Declined.
- **Buttons & Actions**: "📄 Generate" / "✏️ Edit" → OfferLetterModal (HTML/WYSIWYG editor with template variables: candidate name, CTC, designation, start date, etc.); "👁 View Letter" (opens HTML in new window); "📧 Send" (draft→sent); "⬇ PDF" (download signed PDF, signed status only).
- **Statuses/Badges**: Offer Status badge, color-coded.
- **Empty/Loading**: Empty state if no applications in Offer stage; loading skeleton.

---

### Page: Pre-boarding (`/app/onboarding`)
- **Component file**: `src/pages/admin/AdminOnboarding.jsx` (shared with Admin)
- **Purpose**: Manage onboarding checklists/documents for newly hired candidates.
- **Sections/Cards/Widgets**: Hired-candidates list; onboarding checklist (tasks, status, assigned-to, due date); document upload/submission tracking.
- **Buttons & Actions**: Manage tasks (mark complete, upload docs, assign).
- **Empty/Loading**: Empty state if no hired candidates.

---

### Page: Assessments (`/app/assessments`)
- **Component file**: `src/pages/recruiter/RecruiterAssessments.jsx`
- **Purpose**: Create/manage/track candidate screening assessments.
- **Sections/Cards/Widgets**: List view — grid of assessment cards (Title, Job, Questions, Status, Actions). Detail view — title, instructions, time limit, passing score, questions; submissions table (Candidate, Status — Pass/Fail/Pending, Score, Submitted At, Actions — Review/Retake).
- **Filters & Search**: Search by title; Job filter.
- **Buttons & Actions**: "+ Create Assessment" → Assessment Builder modal; "Edit"; "View Submissions"; "Review Submission" → AssessmentReviewPage (answers, scores, feedback); "Import from Excel" (file upload, parses questions).
- **Forms/Modals**: Assessment Builder — Title, Instructions, Time Limit, Passing Score, Auto-Advance toggle, Randomize toggle, MCQ/Text/Code question editor. Assessment Creator — Select Job (required) + builder.
- **Statuses/Badges**: Active/Inactive; submission status (Pass/Fail/Pending).
- **Empty/Loading**: Empty state; spinner.

---

### Page: Outreach (`/app/outreach`)
- **Component file**: `src/pages/admin/OutreachTracker.jsx` (shared)
- **Purpose**: Track bulk candidate invitations and email logs.
- **Sections/Cards/Widgets**: Tabs — Invite Outreach / Email Logs. Invite Outreach: KPI cards (Sent, Opened, Interested, Declined, Failed, Interest Rate %, each clickable to filter); filters (Status, Job, candidate search); table (Candidate, Email, Job, Status, Sent Date, Opened Date, Actions — Resend/Mark as/Delete); pagination 15/page.
- **Buttons & Actions**: KPI-card click filters by status; "Resend"; "Mark as" (status dropdown); "Delete".
- **Statuses/Badges**: Invite status (Sent/Opened/Interested/Declined/Failed) with icons/colors.
- **Empty/Loading**: Empty state; loading skeleton.

---

### Page: Candidate Requests (`/app/candidate-requests`)
- **Component file**: `src/pages/admin/AdminCandidateRequest.jsx` (shared)
- **Purpose**: Submit requests for TalentNest to source candidate profiles; view submitted candidates.
- **Sections/Cards/Widgets**: List view — requests (status, role, submitted date, candidates-submitted count). Detail view — role title, requirements, urgency, budget, job link; submitted candidates (TalentNest-verified) cards — name, title, experience, location, skills, "View Profile", "Add to Pipeline".
- **Filters & Search**: Search by role title; Status filter.
- **Buttons & Actions**: "+ Submit Request" → modal (Role Title*, Requirements, Urgency, Budget, optional Job Link); "Cancel Request"; "View Candidate Profile" → UserDetailDrawer; "Add to Pipeline".
- **Statuses/Badges**: Request status (Pending/In Progress/Fulfilled/Cancelled); candidate verification badge.
- **Empty/Loading**: Empty state; spinner.

---

### Page: Client Requirements (`/app/job-requirements`)
- **Component file**: `src/pages/admin/JobRequirements.jsx` (shared)
- **Purpose**: Manage hiring requirements from client companies, requirement → job-posting tracking.
- **Sections/Cards/Widgets**: Status filter tabs (All/New/In Progress/Job Posted/Closed); requirements table (Client Company, Role Title, Skill Requirements, Priority, Status, Assigned Recruiter, Created Date, Actions).
- **Filters & Search**: Status tabs; search by role/company; recruiter filter.
- **Buttons & Actions**: Row click → Requirement Detail Modal (role title, client, skills, priority, requirements, internal notes, submitted candidates, status dropdown, assign recruiter); "Post Job" → PostJobForm pre-filled from requirement; status progression (New → In Progress → Converted); save internal notes.
- **Statuses/Badges**: Status (New/In Progress/Job Posted/Closed); Priority (Low/Medium/High/Urgent).
- **Empty/Loading**: Empty state; loading skeleton.

---

### Page: Clients (`/app/clients`)
- **Component file**: `src/pages/admin/AdminClients.jsx` (shared)
- **Purpose**: Manage client company accounts and billing terms.
- **Sections/Cards/Widgets**: Search bar; grid of client cards (Company name, Contact person, Industry, Email, Phone, Billing details — % of CTC / Flat fee per hire / Retainer / Custom).
- **Filters & Search**: Search by company name.
- **Buttons & Actions**: "+ Add Client" → Client Form modal (Company Name*, Contact Person, Email, Phone, Industry, Billing Type dropdown, Billing Value, Billing Currency, Billing Notes); card click → edit modal; "Deactivate" (soft delete).
- **Statuses/Badges**: Active/Inactive (reduced opacity if inactive).
- **Empty/Loading**: Empty state; loading skeleton.

---

### Shared pages (identical to Candidate module)
- **Career Community** (`/app/feed`), **My Network** (`/app/people`), **Communities** (`/app/communities`), **Company Reviews** (`/app/company-reviews`) — same as Candidate module, see [01-candidate.md](01-candidate.md).
- **My Profile** (`/app/profile`) — uses `src/pages/shared/ProfilePage.jsx` (not `CandidateProfile.jsx`), with recruiter-specific fields.

---

## Recruiter Feature Checklist

- Dashboard: KPIs, pipeline funnel, job performance table, upcoming interviews, daily action queue, bottleneck alerts, drill-downs
- My Performance: personal KPIs, pipeline funnel, offer performance, top jobs by applications
- My Jobs: create/edit/post/close/reopen/delete jobs, status tabs (Active/Closed/Draft/All), urgency filter + search, view applicants, attach screening assessments, submit draft for approval
- Applicants: flat applicant table with stage/source/status/score/date filters, export to CSV, detail drawer
- College Drives: read-only view of company's placement drives across colleges, college filter
- My Candidates: candidate database, bulk add-to-pipeline across jobs, log outreach, park, send invitation, multi-filter search
- Assigned to Me: job-grouped assigned candidates, first-recruiter/handoff banners, view recruiter-handoff history, stage management, SLA indicators
- Job Match: UTO-scored candidate-to-job matching, shortlist/park/reach-out actions, match category badges
- Pipeline: Kanban drag-drop across 9 stages, tagging, notes, screening-answer display, assessment results, schedule interview, generate offer, feedback (with interview kit scoring), reject, bulk actions
- Talent Pool: org-wide pools (browse/expand/pull-to-job), personal parked candidates (search/unpark/pull-to-job/add-to-org-pool)
- Interviews: schedule (date/time/format/interviewer/video link), create video rooms, submit scorecards, upcoming/past tabs
- Offers: generate/edit offer letters (WYSIWYG + template variables), send, view, download signed PDF, status tracking
- Pre-boarding: onboarding checklist + document tracking for hired candidates
- Assessments: create (MCQ/Text/Code), attach to jobs, Excel import, review submissions, scoring
- Outreach: invite tracking (sent/opened/interested/declined/failed), KPI filters, resend/mark/delete
- Candidate Requests: submit sourcing requests, view TalentNest-verified candidates, add to pipeline
- Client Requirements: requirement → job-posting pipeline, status/priority tracking, assign recruiter, internal notes
- Clients: manage client accounts + billing terms (% CTC / flat fee / retainer / custom)
- Forms reachable from Pipeline/Jobs: Schedule Interview, Generate Offer, Candidate Rejection (reason + template), Interview Feedback (rating/strengths/weaknesses/recommendation/interview kit)
- Invite candidates (job-targeted bulk email with scheduling link)
- Career Community, My Network, Communities, Company Reviews — same as Candidate
- My Profile — shared ProfilePage with recruiter-specific fields
