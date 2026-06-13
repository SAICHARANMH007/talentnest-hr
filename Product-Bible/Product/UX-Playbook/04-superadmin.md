# Super Admin Module — User Experience & Feature Playbook

**Sidebar nav** (`NAVS.superadmin` in `Layout.jsx`): Command Center · Overview (analytics) · Platform · Organisations · Company Reviews (reviews) · NPS Dashboard · Reported Posts · Registered Users (candidates) · Guest Applicants (unregistered-candidates) · Candidate Database (all-candidates) · College Groups · Company Groups · Application Records (applicants) · Job Approvals · Billing · Security · Permissions · Import & Assign (import-candidates) · Recruiters · Hiring Managers · Admins · All Jobs (jobs) · Assessments · Pre-boarding (onboarding) · BGV Tracker · Automation · Customizations · Outreach · Contact Enquiries (contact-leads) · Candidate Requests · Playbooks · Blog Manager (blogs) · Job Referrals (referrals) · Platform Referrals · Career Community (feed) · My Network (people) · Communities · Org Reviews (company-reviews) · Modal Guide · My Profile

> Shared sidebar/header elements (notifications, messages, theme, profile menu, etc.) are documented once in [00-overview.md](00-overview.md) and not repeated here.

---

### Page: Command Center (`/app/command-center`)
- **Component file**: `src/pages/superadmin/SuperAdminCommandCenter.jsx`
- **Purpose**: Central hub for platform management — quick global search, impersonation, system health, and shortcuts to key admin functions.
- **Sections/Cards/Widgets**: KPI dashboard (system health status, org/user/job counts); platform health monitor; recent activity/audit trail panel; quick action shortcuts (Create Org, Job Approvals, Import Candidates, Audit Logs, BGV Tracker, Analytics).
- **Tables/Lists**: Recent orgs list (last 10, by creation date); system health status row.
- **Filters & Search**: Global search (users, jobs, organisations) with live results dropdown.
- **Buttons & Actions**: Search (queries `getUsers`/`getJobs`/`getOrgs` platform-wide); "Check System Health" (`getSystemHealth`); Impersonate user (on search result, `impersonate(userId)`, stores backup token, redirects to `/app/dashboard`); quick-action shortcut buttons.
- **Forms/Modals/Popups**: Inline global search with result cards (dropdown, no modal).
- **Statuses/Badges**: System health indicators (operational, warning, error).
- **Empty/Loading/Error states**: Loading spinner during search; "No results found"; health status badges.

---

### Page: Overview (`/app/analytics`)
- **Component file**: `src/pages/admin/AdminAnalytics.jsx` (shared with Admin — see [03-admin.md](03-admin.md))
- **Purpose**: High-level platform analytics dashboard. For super admin, data aggregates across ALL organisations/tenants (no org filter applied), rest of the page is identical to Admin's Overview page.

---

### Page: Platform (`/app/platform`)
- **Component file**: `src/pages/superadmin/SuperAdminPlatform.jsx`
- **Purpose**: Master control panel — platform-wide settings, organisation health monitoring, revenue tracking, backups, deduplication, broadcast announcements.
- **Sections/Cards/Widgets**: KPI cards (Organisations, Total Users, Total Jobs, Applications); plan breakdown bar chart (free/trial/starter/growth/enterprise org counts); recent organisations list (last 10); revenue dashboard; organisation health status grid; system health monitor with refresh; broadcast announcement panel.
- **Tables/Lists**: Recent orgs table (name, plan, status, created date); audit logs table (action, user, timestamp); system health status rows.
- **Filters & Search**: Action filters (audit logs).
- **Buttons & Actions**: "Download Backup" (`downloadBackup()`, stores timestamp in localStorage); "Deduplicate Jobs" (`POST /admin/deduplicate-jobs`); "Check System Health" (`getSystemHealth()`); "Send Broadcast" (`broadcastAnnouncement({subject, message})` to all admins); per-section refresh buttons.
- **Forms/Modals/Popups**: Broadcast announcement form (Subject text, Message textarea, Send button).
- **Statuses/Badges**: Plan color badges (free=#64748b, trial=#F59E0B, starter=#0176D3, growth=#014486, enterprise=#7c3aed); health status colors (green/yellow/red).
- **Empty/Loading/Error states**: Loading spinner; "No data" per section; backup success toast.

---

### Page: Organisations (`/app/organisations`)
- **Component file**: `src/pages/superadmin/SuperAdminOrgs.jsx`
- **Purpose**: Master directory of all organisations — full CRUD, member management, user deactivation, org deletion.
- **Sections/Cards/Widgets**: Organisation list with filters; organisation detail drawer (full org profile, members, billing); member list with role badges.
- **Tables/Lists**: Main org table — name (avatar+name), domain, plan (badge), status (badge), users count, created date, actions; member list in drawer — name, email, role, status (active/inactive toggle), actions. Sortable by name/status/created date; configurable pagination.
- **Filters & Search**: Status filter (active/suspended/inactive); plan filter; search by name/domain.
- **Buttons & Actions**: "Create Org" (→ `/app/forms/create-org`); "Edit Org" (inline form, `updateOrg(orgId, form)`); "Delete Org" (confirm, `deleteOrg(orgId)`); "Invite User"/"Create User" (`createUser({name, email, phone, role, tenantId, domain})`); Toggle User Status (`updateUser(userId, {isActive})`); "Merge Users" (`mergeUsers(primaryId, duplicateId)`, confirm).
- **Forms/Modals/Popups**: Org edit form (name, domain, industry, size [select], plan [select], logo URL, isStaffingAgency checkbox); Create User form (name, email, phone, role [recruiter/admin/hiring_manager], send invite); Merge Users form (select primary, select duplicate, merge).
- **Statuses/Badges**: Org status badges (active=green, trial=orange, suspended=red, inactive=gray); plan badges (color-coded); user role badges.
- **Empty/Loading/Error states**: Loading spinner (org list, member list); "No organisations"; "No members"; error toast on failed operations.

---

### Page: Company Reviews (`/app/reviews`)
- **Component file**: `src/pages/admin/AdminReviews.jsx` (shared with Admin — see [03-admin.md](03-admin.md)). Super admin scope: platform-wide view of all company reviews across all tenants.

### Page: NPS Dashboard (`/app/nps-dashboard`)
- **Component file**: `src/pages/admin/AdminNPS.jsx` (shared with Admin — see [03-admin.md](03-admin.md)). Super admin sees all organisations' NPS responses.

---

### Page: Reported Posts (`/app/reported-posts`)
- **Component file**: `src/pages/superadmin/SuperAdminReportedPosts.jsx`
- **Purpose**: Moderation dashboard for community posts flagged as spam, harassment, misinformation, or inappropriate content.
- **Sections/Cards/Widgets**: Report count badge ("X posts with pending reports"); post preview card (author name/role, content truncated 300 chars, image thumbnails, community slug); report details panel (reports grouped by post).
- **Tables/Lists**: Posts grouped by post ID, each with its reports; report row — reason badge, reporter name/role, optional reporter details, time ago.
- **Filters & Search**: Report reason filter (spam, harassment, misinformation, inappropriate, hate_speech, other).
- **Buttons & Actions**: "Delete Post" (`deleteReportedPost(reportId)`, removes post + resolves all reports); "Dismiss Report" (per-report, `dismissReport(reportId)`); Refresh.
- **Forms/Modals/Popups**: None — inline action buttons.
- **Statuses/Badges**: Reason badges (spam=red, harassment=purple, misinformation=amber, inappropriate=pink, hate_speech=red, other=gray).
- **Empty/Loading/Error states**: Loading spinner; "No pending reports" (✅); error toast on action failure.

---

### Page: Registered Users (`/app/candidates`)
- **Component file**: `src/pages/admin/AdminUsers.jsx` (filterRole="candidate", isSuperAdmin=true) — shared with Admin (see [03-admin.md](03-admin.md)). Super admin sees all registered candidates platform-wide, no org isolation.

---

### Page: Guest Applicants (`/app/unregistered-candidates`)
- **Component file**: `src/pages/superadmin/SuperAdminUnregisteredCandidates.jsx`
- **Purpose**: Manage guest/unregistered applicants who applied without a platform account; edit their data.
- **Sections/Cards/Widgets**: Guest user search & list; guest user detail modal (on row click).
- **Tables/Lists**: Guest list — name, email, phone, current company, experience, location, application count, status badge. Sortable (name, email, experience, application date); pagination 50/page.
- **Filters & Search**: Search by name/email; application status filter (applied/under_review/rejected).
- **Buttons & Actions**: "Edit Record" (enables form edit, in detail modal); "Save Changes" (`updateCandidate(candidateId, payload)`); Refresh.
- **Forms/Modals/Popups**: Guest profile modal — name, email (disabled), phone, title, company, location, experience (years), availability, skills (comma-separated textarea). Edit mode makes all fields editable except email.
- **Statuses/Badges**: Application status badges (applied, under_review, rejected); stage badges.
- **Empty/Loading/Error states**: Loading spinner; "No guest applicants"; error toast.

---

### Page: Candidate Database (`/app/all-candidates`)
- **Component file**: `src/pages/superadmin/SuperAdminCandidates.jsx`
- **Purpose**: Master candidate records across all organisations — pipeline visibility, stage management, export, bulk operations.
- **Sections/Cards/Widgets**: Candidate statistics KPI cards (total candidates, applied, platform-registered); candidate list with tabs (all/applied/platform registered).
- **Tables/Lists**: Columns — Name/Avatar, Email, Title, Experience, Location, Latest Stage (colored badge), Latest Applied, Status, Actions. Sortable (name, email, experience, application date); pagination 50/page.
- **Filters & Search**: Search by name/email; tab filters (all/applied/platform); experience range; stage filter.
- **Buttons & Actions**: "View Profile" (UserDetailDrawer — full profile, applications, assessments, resume preview); "Change Stage" (`updateApplication(appId, {stage: newStage})`); "Export CSV" (`downloadBlob()`); Refresh.
- **Forms/Modals/Popups**: User detail drawer (side panel); stage dropdown per application row.
- **Statuses/Badges**: Application stage badges (Applied, Screening, Shortlisted, Interview Round 1/2, Offer, Hired, Rejected — standard colors).
- **Empty/Loading/Error states**: Loading skeleton table; "No candidates found"; error toast.

---

### Page: College Groups (`/app/college-groups`)
- **Component file**: `src/pages/superadmin/SuperAdminCollegeGroups.jsx`
- **Purpose**: View/manage college groups platform-wide — student/alumni candidates by college affiliation.
- **Sections/Cards/Widgets**: College groups list/grid; college detail drawer (on row click).
- **Tables/Lists**: Colleges table — college name, student count, alumni count, total candidates. Candidate list in drawer — name, email, phone, degree, year, current company, location, student/alumni badge. "Load More" pagination in drawer.
- **Filters & Search**: Search by college name.
- **Buttons & Actions**: Click college row → opens CandidateDrawer; "Load More" (`getCollegeGroupCandidates(collegeName, {page, limit: 50})`); Close (drawer X).
- **Forms/Modals/Popups**: Candidate drawer (side panel) with candidate list.
- **Statuses/Badges**: Student/Alumni badge (blue=current student, green=alumni).
- **Empty/Loading/Error states**: Loading spinner; "No colleges found"; "No candidates" in drawer; error message in drawer.

---

### Page: Company Groups (`/app/company-groups`)
- **Component file**: `src/pages/superadmin/SuperAdminCompanyGroups.jsx`
- **Purpose**: View/manage company groups platform-wide — candidates by company affiliation.
- **Sections/Cards/Widgets**: Company groups list/grid; company detail drawer (on row click).
- **Tables/Lists**: Companies table — company name, candidate count. Candidate list in drawer — name, email, phone, title, experience, college, location, current/expected CTC (if available). "Load More" pagination in drawer.
- **Filters & Search**: Search by company name.
- **Buttons & Actions**: Click company row → opens CandidateDrawer; "Load More" (`getCompanyGroupCandidates(companyName, {page, limit: 50})`); Close (drawer X).
- **Forms/Modals/Popups**: Candidate drawer (side panel) with candidate list.
- **Statuses/Badges**: None.
- **Empty/Loading/Error states**: Loading spinner; "No companies found"; "No candidates" in drawer; error message in drawer.

---

### Page: Application Records (`/app/applicants`)
- **Component file**: `src/pages/shared/ApplicantsRecordsPage.jsx` (shared — see [03-admin.md](03-admin.md) / [02-recruiter.md](02-recruiter.md)). Super admin sees all applications across all organisations.

### Page: Job Approvals (`/app/job-approvals`)
- **Component file**: `src/pages/admin/AdminJobApproval.jsx` (shared with Admin — see [03-admin.md](03-admin.md)). Super admin reviews job postings awaiting approval across all organisations.

### Page: Billing (`/app/billing`)
- **Component file**: `src/pages/billing/BillingPage.jsx` (shared — see [03-admin.md](03-admin.md)). Super admin views billing/subscription/revenue across all organisations.

---

### Page: Security (`/app/security`)
- **Component file**: `src/pages/superadmin/SuperAdminSecurity.jsx`
- **Purpose**: Platform-wide security configuration, plan-based feature flags, and system audit log.
- **Sections/Cards/Widgets**: Feature Flags panel (plans × features availability matrix); Security Settings panel (session timeout, password requirements, 2FA, IP whitelist, login attempt limits, SSO); Audit Log tab (recent platform events with filtering/export).
- **Tables/Lists**: Feature flags grid — plans (rows) × features (columns), toggle cells. Audit log table — timestamp, user, role, action, resource, detail, level (info/warning/error).
- **Filters & Search**: Audit log level filter (all/info/warning/error).
- **Buttons & Actions**: Feature flag toggles (per plan × feature, saves to backend); security setting inputs (save on submit); "Refresh Audit Log"; "Export CSV" (audit log).
- **Forms/Modals/Popups**: Security settings form — session timeout (select), min password length (number), require 2FA (toggle), strong password requirement (toggle), IP whitelist (textarea), max login attempts (number), lockout duration (number), allowed domains (textarea), SSO enabled (toggle), audit log retention days (number).
- **Statuses/Badges**: Audit log level badges (info=blue, warning=amber, error=red); role color badges.
- **Empty/Loading/Error states**: Loading spinner (feature flags); "No audit events"; error toast.

---

### Page: Permissions (`/app/permissions`)
- **Component file**: `src/pages/superadmin/SuperAdminPermissions.jsx`
- **Purpose**: Define/manage platform-level access control for roles (candidate, recruiter, admin) across resources (profile, jobs, applications, pipeline, analytics).
- **Sections/Cards/Widgets**: Role selector tabs (candidate, recruiter, admin); permission matrix grid for selected role.
- **Tables/Lists**: Permission matrix — resources (rows: User Profile, Job Posting, Application, Pipeline, Analytics) × field/action (columns: view/edit toggles), with resource icon and name.
- **Filters & Search**: Role tabs.
- **Buttons & Actions**: Permission toggles (view/edit per resource × field, updates permission set for role); "Save" (persists permission config).
- **Forms/Modals/Popups**: Inline toggle switches — no modal.
- **Statuses/Badges**: Role color badges (candidate=#0176D3, recruiter=#014486, admin=#F59E0B).
- **Empty/Loading/Error states**: Loading skeleton grid; error toast on save.

---

### Page: Import & Assign (`/app/import-candidates`)
- **Component file**: `src/pages/superadmin/SuperAdminCandidateImport.jsx`
- **Purpose**: Bulk import candidate records from Excel/CSV, manage imported database, send mass invitations.
- **Sections/Cards/Widgets**: 3 tabs — Import, Database (pending), Invited; file upload section (Import tab); imported candidates list (Database tab); invited candidates list (Invited tab).
- **Tables/Lists**: Data preview table (columns from uploaded file: name, email, phone, title, company, location, experience, availability, skills); Database/Invited tables — name, email, phone, skills, location, status, actions. Pagination 50/page.
- **Filters & Search**: Search by name/email/phone.
- **Buttons & Actions**: "Upload File" (file picker, .xlsx/.csv); "Start Import" (`bulkImportRaw(rows)`); "Send Invites" on selected (`sendImportedInvites(selectedIds)`); Select All checkbox; per-row select checkboxes; "Delete" (row, removes from database); "Clear Database" (`clearImportDatabase()`); "View Detail" (opens detail modal/drawer).
- **Forms/Modals/Popups**: File upload input (.xlsx, .csv); candidate detail modal/drawer on row click.
- **Statuses/Badges**: Import status badges (pending, invited, sent).
- **Empty/Loading/Error states**: Loading spinner during import/send; "No data" per empty tab; error toast; success toast ("X records imported").

---

### Page: Recruiters (`/app/recruiters`)
- **Component file**: `src/pages/admin/AdminUsers.jsx` (filterRole="recruiter", isSuperAdmin=true) — shared with Admin (see [03-admin.md](03-admin.md)). Super admin views/manages recruiters across all organisations, no org filter.

### Page: Hiring Managers (`/app/hiring-managers`)
- **Component file**: `src/pages/admin/AdminUsers.jsx` (filterRole="hiring_manager", isSuperAdmin=true) — shared with Admin (see [03-admin.md](03-admin.md)). Platform-wide.

---

### Page: Admins (`/app/admins`)
- **Component file**: `src/pages/admin/AdminUsers.jsx` (filterRole="admin", isSuperAdmin=true)
- **Purpose**: Super-admin-only page to view/manage all organisation admins across the platform.
- **Sections/Cards/Widgets**: Same structure as Recruiters page — filter, search, user list with admin-specific actions.
- **Tables/Lists**: Admin table — name/avatar, email, organisation, role, status (active/inactive), created date.
- **Filters & Search**: Search by name/email; organisation filter; status filter.
- **Buttons & Actions**: Edit, deactivate, delete admin user (with confirmation).
- **Forms/Modals/Popups**: User detail drawer/modal for editing.
- **Statuses/Badges**: Active/inactive status badges; role badge (admin).
- **Empty/Loading/Error states**: Loading spinner; "No admins found".

---

### Page: All Jobs (`/app/jobs`)
- **Component file**: `src/pages/admin/AdminJobs.jsx` (shared with Admin — see [03-admin.md](03-admin.md)). Super admin sees all job postings across all organisations.

### Page: Assessments (`/app/assessments`)
- **Component file**: `src/pages/recruiter/RecruiterAssessments.jsx` (shared — see [02-recruiter.md](02-recruiter.md)). Platform-wide for super admin.

### Page: Pre-boarding (`/app/onboarding`)
- **Component file**: `src/pages/admin/AdminOnboarding.jsx` (shared with Admin — see [03-admin.md](03-admin.md)). Platform-wide onboarding templates/records.

---

### Page: BGV Tracker (`/app/bgv-tracker`)
- **Component file**: `src/pages/superadmin/SuperAdminBgvTracker.jsx`
- **Purpose**: Monitor and verify background-verification (BGV) documents submitted by candidates across the platform.
- **Sections/Cards/Widgets**: Statistics KPI cards (total candidates with BGV, verified docs, pending, rejected); candidate records list with status indicators.
- **Tables/Lists**: Candidate rows (expandable) — name, email, total docs, verified/pending/rejected counts, status badge, progress indicator. Document list within expanded row — document name, status badge, file size, upload date, mime type, preview button, verify/delete actions.
- **Filters & Search**: Status filter (all, verified, under review, rejected); search by candidate name/email.
- **Buttons & Actions**: "Preview Document" (`getBgvDocumentFile(docId)`, base64→Blob URL, displayed in iframe modal); "Verify as" dropdown (verified/rejected, `verifyBgvDocument(docId, {status})`); "Delete Document" (confirm, `deleteBgvDocument(docId)`); expand/collapse candidate row.
- **Forms/Modals/Popups**: Document preview modal (iframe, PDF/image, close); inline verification dropdown per document.
- **Statuses/Badges**: Document status badges (uploaded=blue, under_review=amber, verified=green, rejected=red); candidate status summary badge.
- **Empty/Loading/Error states**: Loading spinner (candidate list, document preview); "No BGV documents"; error toast on verify/delete.

---

### Page: Automation (`/app/automation`)
- **Component file**: `src/pages/admin/AdminAutomation.jsx` (shared with Admin — see [03-admin.md](03-admin.md)). Platform-wide automation rules.

---

### Page: Customizations (`/app/customizations`)
- **Component file**: `src/pages/superadmin/SuperAdminCustomizations.jsx`
- **Purpose**: Platform-wide system field definitions, field visibility toggles, automation trigger/action schema management.
- **Sections/Cards/Widgets**: Field Schema Editor tab (candidate/job/application/interview fields with visibility toggles); Automation Configuration tab (triggers/actions matrix).
- **Tables/Lists**: Field table — field name, type, required toggle, visible toggle, custom settings. Automation matrix — triggers (rows) × actions (columns) with enable/disable toggles.
- **Filters & Search**: Entity type filter (candidate/job/application/interview).
- **Buttons & Actions**: Field visibility toggle (per field, saves immediately); automation trigger/action toggles (save immediately); "Save Field Configuration"; "Add Custom Field" (form modal); "Delete Custom Field" (row, confirm).
- **Forms/Modals/Popups**: Add Custom Field form (field name, type [text/number/select/tags/textarea], required toggle, default value, options for select, save); automation rule edit form (select trigger, select action, configure action parameters, save).
- **Statuses/Badges**: Field type badges (text, number, select, tags, date, file, etc.); requirement indicator (red asterisk for required).
- **Empty/Loading/Error states**: Loading skeleton; "No fields defined"; error toast.

---

### Page: Outreach (`/app/outreach`)
- **Component file**: `src/pages/admin/OutreachTracker.jsx` (shared with Admin — see [03-admin.md](03-admin.md)). Platform-wide outreach campaign tracking.

### Page: Contact Enquiries (`/app/contact-leads`)
- **Component file**: `src/pages/admin/ContactLeads.jsx` (shared with Admin). Platform-wide inbound contact/lead enquiries.

---

### Page: Candidate Requests (`/app/candidate-requests`)
- **Component file**: `src/pages/superadmin/SuperAdminCandidateRequests.jsx`
- **Purpose**: Manage and fulfill candidate requests platform-wide — search candidates matching specific criteria, park candidates for future consideration.
- **Sections/Cards/Widgets**: Request list with status badges; advanced search panel (collapsible); candidate search results panel (after search submit).
- **Tables/Lists**: Request list — request ID, requester, skills needed, experience level, location, job type, urgency badge, status badge, created date, actions. Search results grid — candidate cards (name, title, company, location, experience, skills tags, match score, select checkbox, profile/park buttons).
- **Filters & Search**: Advanced search — skills (text), experience level (select), location (text), job type (select), notice period (select), keyword (text); status filter (pending/in_progress/fulfilled/cancelled).
- **Buttons & Actions**: "Search Candidates"; Select All checkbox; "Profile" (UserDetailDrawer); "Park" (park candidate for future matching); Create Request form; "View Request Details" (detail drawer); "Fulfill Request"; "Cancel Request".
- **Forms/Modals/Popups**: Create Request form (skills, experience level, location, job type, notice period, urgency [critical/high/medium/low], save); Request detail drawer (criteria, matched candidates, parked candidates, actions).
- **Statuses/Badges**: Request status badges (pending=orange, in_progress=blue, fulfilled=green, cancelled=gray); urgency badges (critical=red, high=orange, medium=blue, low=green).
- **Empty/Loading/Error states**: Loading spinner (search); "No requests" initial message; "No candidates found" after search; error toast.

---

### Page: Playbooks (`/app/playbooks`)
- **Component file**: `src/pages/superadmin/SuperAdminPlaybooks.jsx`
- **Purpose**: Generate/manage comprehensive playbooks (handbooks) for developers, admins, recruiters, etc. — auto-generated from live system state.
- **Sections/Cards/Widgets**: Playbook selector grid (cards per playbook type: Developer, Admin, Recruiter, etc.); playbook preview/generation panel.
- **Tables/Lists**: Playbook list — generated playbooks, download links, version, generation date.
- **Filters & Search**: Playbook type filter; version filter.
- **Buttons & Actions**: "Generate Playbook" (auto-generates HTML with current system state — tech stack, features, stage names, workflows; opens new tab or downloads); "Download Playbook" (.html); "Regenerate Playbook" (current date/state); "Preview Playbook" (preview modal).
- **Forms/Modals/Popups**: Playbook preview modal (iframe/HTML preview). No input forms — auto-generated.
- **Statuses/Badges**: Playbook type badges; version badges.
- **Empty/Loading/Error states**: Loading spinner during generation; success toast with download link; error toast.

---

### Page: Blog Manager (`/app/blogs`)
- **Component file**: `src/pages/superadmin/SuperAdminBlogs.jsx`
- **Purpose**: Create, edit, publish, and manage platform blog posts.
- **Sections/Cards/Widgets**: Blog list view (cards/table — title, excerpt, category, status, featured flag, created date); create/edit form panel; section editor for blog content.
- **Tables/Lists**: Blog list — title, category (badge), excerpt, published (toggle), featured (toggle), updated date, actions.
- **Filters & Search**: Search by title/excerpt; category filter; status filter (draft/published).
- **Buttons & Actions**: "Create Blog" (empty form); "Edit Blog" (form with blog data); Publish/Unpublish toggle (`adminTogglePublish(blogId)`); Featured toggle; "Delete Blog" (confirm, `adminDeleteBlog(blogId)`); "Add Section"/"Remove Section" (in form); "Save Blog" (`adminCreateBlog()` / `adminUpdateBlog(id, payload)`); "Cancel".
- **Forms/Modals/Popups**: Blog edit form — title, slug (auto or manual), category (select from CATEGORIES), excerpt (textarea), cover image URL, cover emoji (select), accent color (color picker), tags (text), published toggle, featured toggle; section repeater (heading + body per section, add/remove buttons).
- **Statuses/Badges**: Publication status badge (draft/published); featured badge (star icon); category badge (colored).
- **Empty/Loading/Error states**: Loading spinner; "No blogs"; error toast on save/delete; success toast.

---

### Page: Job Referrals (`/app/referrals`)
- **Component file**: `src/pages/admin/AdminReferrals.jsx` (shared with Admin — see [03-admin.md](03-admin.md)). Platform-wide referral tracking.

---

### Page: Platform Referrals (`/app/platform-referrals`)
- **Component file**: `src/pages/superadmin/SuperAdminPlatformReferrals.jsx`
- **Purpose**: Track platform-wide referral program performance, top referrers, badge tiers for coin rewards.
- **Sections/Cards/Widgets**: KPI cards (Total Referrals, Coins Awarded, Unique Referrers, Per Referral = 25 coins); Top Referrers grid (ranked, badge tier, coins earned, referral count); Badge Tiers reference panel (bronze/silver/gold/diamond thresholds); referral list table.
- **Tables/Lists**: Top Referrers ranked grid (1–N) — rank badge, name, referral count, coin balance, badge tier (icon+name). Referral leaderboard table (paginated) — referrer name, email, total referrals, coins awarded, badge tier, last referral date.
- **Filters & Search**: Search by referrer name; badge tier filter.
- **Buttons & Actions**: None — display-only dashboard.
- **Forms/Modals/Popups**: None.
- **Statuses/Badges**: Badge tier badges (Bronze=🥉 #CD7F32, Silver=🥈 #9E9E9E, Gold=🥇 #F59E0B, Diamond=💎 #7C3AED).
- **Empty/Loading/Error states**: Loading spinner for stats; "No referrals yet"; "No top referrers".

---

### Page: Career Community (`/app/feed`)
- **Component file**: `src/pages/shared/CommunityFeed.jsx` — same as Candidate ([01-candidate.md](01-candidate.md)) / Recruiter ([02-recruiter.md](02-recruiter.md)).

### Page: My Network (`/app/people`)
- **Component file**: `src/pages/shared/PeoplePage.jsx` — same as Candidate / Recruiter.

### Page: Communities (`/app/communities`)
- **Component file**: `src/pages/shared/CommunitiesPage.jsx` — same as Candidate / Recruiter.

### Page: Org Reviews (`/app/company-reviews`)
- **Component file**: `src/pages/shared/CompanyReviewsPage.jsx` — same as Candidate ([01-candidate.md](01-candidate.md)).

### Page: Modal Guide (`/app/modal-guide`)
- **Component file**: `src/pages/shared/PlatformModalsGuide.jsx` (shared with Admin — see [03-admin.md](03-admin.md)).

### Page: My Profile (`/app/profile`)
- **Component file**: `src/pages/shared/ProfilePage.jsx` (shared — see [03-admin.md](03-admin.md)).

---

## Super Admin Feature Checklist

### Platform Administration
- View all organisations, users, and jobs across the entire platform (no tenant isolation)
- Create organisations (domain, plan, industry, size, logo)
- Edit organisation details (name, domain, plan, status, logo, staffing agency flag)
- Delete organisations and all associated data (with confirmation)
- Invite and manage users within any organisation (create, activate, deactivate, merge)
- Set user roles globally (recruiter, admin, hiring_manager, candidate)

### User Management at Scale
- Search/view all registered candidates across all organisations
- Search/view all guest/unregistered applicants
- View complete candidate database with application history and pipeline stages
- Edit guest applicant records (name, contact, title, company, location, experience, skills, availability)
- Bulk import candidate records from Excel/CSV
- Send mass invitations to imported candidates
- Manage recruiter, hiring manager, and admin accounts globally
- Merge duplicate user accounts with data consolidation
- Toggle user active/inactive status globally

### Job & Application Management
- View all jobs across all organisations with status/performance metrics
- View all applications globally with pipeline visibility
- Manage application pipeline stages globally
- Approve jobs awaiting publication across organisations
- Track job distribution and performance metrics; deduplicate job records

### Hiring & Recruitment Oversight
- Global hiring analytics, pipeline health, time-to-fill metrics
- Monitor NPS responses from all organisations
- Review company reviews submitted across the platform
- Track assessments and interview schedules globally
- Manage pre-boarding/onboarding templates platform-wide
- Monitor and verify/reject BGV document submissions
- Generate playbooks (developer/admin/recruiter guides) from live system state

### Candidate Matching & Search
- Create candidate requests with specific skill/experience criteria
- Search and match candidates platform-wide
- Park candidates for future consideration
- Generate candidate-to-job match scores

### Group & Segment Management
- View college groups (students/alumni by college affiliation)
- View company groups (candidates by company affiliation)

### Content & Communication
- Create/edit/publish/manage blog posts; categorize, feature, set emoji/accent color
- Send broadcast announcements to all organisation admins
- Moderate reported community posts (delete posts, dismiss individual reports)

### Referral & Rewards
- Track job referral submissions across all organisations
- Monitor platform-wide referral program with leaderboard
- Award platform referral coins (25 per sign-up); assign badge tiers (Bronze/Silver/Gold/Diamond)

### Configuration & Feature Control
- Define/manage feature flags by plan (free, trial, starter, growth, enterprise)
- Control feature availability per plan (AI Job Match, Bulk Email, Custom Pipeline, API Access, White Label, Analytics Export, Advanced Reports, Job Approval, Screening Questions, Calendar Sync, Candidate Ranking, SSO)
- Configure platform security settings (session timeout, password requirements, 2FA, IP whitelist, login limits, lockout duration, SSO)
- Define platform-wide permission schema for roles across resources (view/edit per field)
- Configure system field definitions for candidate/job/application/interview entities
- Define automation triggers and actions (stage changed, new application, interview scheduled, assessment completed, offer stale, candidate stuck → send email/WhatsApp, move stage, notify admin/recruiter)

### Data Import & Management
- Bulk import candidates from Excel/CSV with field mapping
- Manage imported candidate database (pending/invited/sent status tracking)
- Assign imported candidates to organisations; clear import database
- Export candidate, application, and audit data as CSV

### Impersonation & Testing
- Impersonate any user (candidate, recruiter, admin, etc.) from Command Center search
- Impersonation banner shown while impersonating; exit impersonation to return to super admin session

### Audit & Compliance
- View comprehensive audit logs (logins, job creation, stage changes, invitations, offers signed, user creation, etc.)
- Filter audit logs by action, user, date range, level (info/warning/error); export as CSV
- Monitor system health (database, API, background jobs, file storage); run on-demand health checks

### Data Backup & System Maintenance
- Initiate on-demand data backups; download as ZIP; track last backup timestamp
- Run job deduplication platform-wide; monitor uptime/health metrics

### Billing & Subscription Management
- View org subscription status (plan, status, trial days remaining)
- Upgrade/downgrade org plans; view platform revenue/subscription metrics
- Monitor org health/usage metrics; track trial expirations/billing events

### Community & Social Features
- Access shared Career Community feed, People/Network directory, Communities index
- Write and share posts on Career Community

### Profile & Account Management
- Edit own profile (name, email, phone, location, title, company, skills)
- Change own password; manage email notification settings
- Theme switcher (Dark/Light/Ocean); Who's Online; messaging/chat; real-time notifications

---

**End of Super Admin Module Documentation**
