# College Module — User Experience & Feature Playbook

**Sidebar nav** (`NAVS.college` in `Layout.jsx`): Overview (analytics) · Students (candidates) · Add Candidates · Placement Records (applicants) · Placement Drives (drives) · Reviews · Career Community (feed) · My Network (people) · Communities · Org Settings · My Profile

> Shared sidebar/header elements (notifications, messages, theme, profile menu, etc.) are documented once in [00-overview.md](00-overview.md) and not repeated here. Per role-resolution logic (`Layout.jsx:1003`), college-tenant `admin`/`placement_officer` users see this sidebar instead of the standard Admin sidebar.

---

### Page: Overview (`/app/analytics`)
- **Component file**: `src/pages/college/CollegeOverview.jsx`
- **Purpose**: Dashboard showing student counts, placement metrics, department/batch breakdowns, and placement rate by batch.
- **Sections/Cards/Widgets**: Clickable KPI stat cards (Total Students, Current Students, Alumni, Total Applications, Placements, Placement Rate %, Upcoming Interviews); Students by Department (clickable bar chart); Students by Batch/Passing Year (clickable bar chart); Placement Rate by Batch (bar chart); Skill Gaps panel (top 5 in-demand skills not covered by students); Send Announcement panel.
- **Tables/Lists**: None (charts and stat cards only).
- **Filters & Search**: All charts act as clickable filters that navigate to candidate/placement views with query params.
- **Buttons & Actions**: KPI cards clickable → `/app/candidates` or `/app/applicants` with query filters; Department/Batch bars clickable → filter students; "Send Announcement" (`sendCollegeAnnouncement()`).
- **Forms/Modals/Popups**: Send Announcement panel — Title (text), Message (textarea), Link (optional text), Send button, inline success/error feedback.
- **Statuses/Badges**: None.
- **Empty/Loading/Error states**: Spinner; error message; "No data yet" in chart panels.

---

### Page: Students (`/app/candidates`)
- **Component file**: `src/pages/college/CollegeStudents.jsx`
- **Purpose**: Manage college student database; view individual student profiles with education/skills/recommendations.
- **Sections/Cards/Widgets**: Table-based interface.
- **Tables/Lists**: Columns — Name, Email, Phone, Type (Student/Alumni), Education, Location, Skills, Actions. Sortable (Name, Email, Type); pagination configurable.
- **Filters & Search**: Search (name/email); Type filter (Student/Alumni); Department filter (`?dept=`); Passing Year filter (`?year=`); query params `q`, `type`, `dept`, `year`, `page`, `limit`.
- **Buttons & Actions**: View profile (ProfileModal); Delete (alumni/completed students); Edit (inline/modal if available); Download CSV.
- **Forms/Modals/Popups**: Student Profile Modal (read-only) — Name, Email, Phone, Student Type badge; Current Role (if alumni: Title, Company, Experience, Location); Education (Degree, Field, Institution, University, Year, Grade — repeating); Certifications (Name, Issuer, Year, Credential URL — repeating); Projects (free text); Achievements (free text); Skills (comma-separated); Recommended Skills & Courses (AI-driven, grouped by skill with course links); Close button.
- **Statuses/Badges**: Type badge — "Student" (blue #0176D3) or "Alumni" (purple #7C3AED).
- **Empty/Loading/Error states**: Skeleton rows; "No students found"; loading spinner for recommendations.

---

### Page: Add Candidates (`/app/add-candidates`)
- **Component file**: `src/pages/college/CollegeAddCandidates.jsx`
- **Purpose**: Bulk import students from Excel/CSV or add individual candidates manually.
- **Sections/Cards/Widgets**: Multi-step form interface (Upload → Map & Preview → Result).
- **Tables/Lists**: Step 2 — preview table of parsed data (5 rows); Step 3 — result summary table (imported/failed rows with error messages).
- **Filters & Search**: None.
- **Buttons & Actions**: Step 1 — file upload (.xlsx/.xls/.csv), "Upload & Continue", "Add Candidate Manually" link; Step 2 — column mapping dropdowns (auto-guessed headers), "Mark as Fresher" checkbox (hides alumni-only fields), "Import", "Back"; Step 3 — summary (X added, Y errors), "Back to Upload" / "View Students".
- **Forms/Modals/Popups**: Manual Candidate Form (inline) — required: Name, Email; optional: Phone, Location, Skills, Institution, Degree, Field of Study, Year, Grade, Title, Company, Experience, Certifications; Fresher checkbox hides alumni fields; Submit → `addCandidate()`.
- **Statuses/Badges**: None.
- **Empty/Loading/Error states**: Error messages for invalid file format; success messages; import progress spinner.

---

### Page: Placement Records (`/app/applicants`)
- **Component file**: `src/pages/college/CollegePlacements.jsx`
- **Purpose**: Track student job applications and placement outcomes across hiring companies.
- **Sections/Cards/Widgets**: Stage summary chips (Applied, Screening, Interview, Offer, Hired, Rejected with counts, clickable to filter); quick filters for stage/company.
- **Tables/Lists**: Columns — Candidate Name, Company, Job Title, Stage, Applied Date, College Notes. Pagination configurable.
- **Filters & Search**: Search (name/company/job); Stage filter dropdown; Company filter (pill badge, clearable); query params `q`, `stage`, `company`, `page`.
- **Buttons & Actions**: Stage chips clickable to filter; "Clear" (company filter); Notes cell click → inline edit; "Save" (`updateCollegePlacementNotes()`); "Cancel" (revert).
- **Forms/Modals/Popups**: Inline Notes Editor — textarea (max 1000 chars), Save/Cancel, error message on save failure.
- **Statuses/Badges**: Stage badges — Applied #706E6B, Screening #0176D3, Interview #9333EA, Offer #D97706, Hired #16A34A, Rejected #BA0517.
- **Empty/Loading/Error states**: Skeleton rows; "No placement records found"; error on note save with retry.

---

### Page: Placement Drives (`/app/drives`)
- **Component file**: `src/pages/college/CollegeDrives.jsx`
- **Purpose**: Create/manage college-specific placement drives, internship programs, and exam opportunities; notify students of external company hiring events.
- **Sections/Cards/Widgets**: "Recent Hiring Opportunities" (external recruiter jobs — DriveCard with title, company, location, job type, experience, salary, required skills, "Notify My Students"); "Your Placement Drives" (PlacementDriveCard — title, company, status [upcoming/ongoing/completed/cancelled], type [placement/internship/exam], date, mode, location, eligible/shortlisted/selected counts, Edit/View/Delete); "Training Resources" (category tabs — Aptitude, Coding, Verbal, Reasoning, Interview, Other; resource cards — title, URL, description; "Add Resource").
- **Tables/Lists**: Card-based layout, no tables.
- **Filters & Search**: Status filter (All/Upcoming/Ongoing/Completed/Cancelled); Type filter (All/Placement/Internship/Exam).
- **Buttons & Actions**: "+ New Drive" (→ `/app/drives/new`, CollegeDriveCreate); "Notify My Students" (broadcasts job to eligible students); "View Students →" (CollegeDriveDetail); "Cancel" (delete drive, with confirmation); "Add Resource".
- **Forms/Modals/Popups**: Drive creation form is on a separate page (`CollegeDriveCreate`).
- **Statuses/Badges**: Status badges (upcoming, ongoing, completed, cancelled — distinct colors); opportunity type badges (Placement 🎯, Internship 💼, Exam 📝).
- **Empty/Loading/Error states**: Loading spinner; "No drives yet"; success/error toasts.

---

### Shared Pages
- Career Community (`/app/feed`) — `CommunityFeed.jsx`, same as [01-candidate.md](01-candidate.md) / [02-recruiter.md](02-recruiter.md).
- My Network (`/app/people`) — `PeoplePage.jsx`, same as other roles.
- Communities (`/app/communities`) — `CommunitiesPage.jsx`, same as other roles.
- Reviews (`/app/reviews`) — `AdminReviews.jsx`, same as [03-admin.md](03-admin.md); college sees college-scoped reviews.
- Org Settings (`/app/org-settings`) — `OrgSettings.jsx`, same as [03-admin.md](03-admin.md); college manages college-specific org settings.
- My Profile (`/app/profile`) — `ProfilePage.jsx`, role-aware (see [00-overview.md](00-overview.md)).

---

## College Feature Checklist

- View placement overview dashboard (student counts, application metrics, placement rate)
- Filter student data by department and passing year (batch)
- View placement rate breakdown by batch
- See skill gaps across student population with course recommendations
- Broadcast announcements to students (with optional link)
- Manage student database (add, view, edit, delete)
- View detailed student profiles (education, certifications, projects, achievements, skills)
- Get AI-driven skill recommendations with course links per student
- Bulk import students from Excel/CSV with column mapping
- Manually add individual students (fresher or alumni)
- Track student job applications and placements across companies
- Filter placement records by search/stage/company; add private follow-up notes
- Create placement drives, internship opportunities, and exam/test opportunities
- View hiring opportunities posted by external companies; notify eligible students
- Manage training resources by category (Aptitude, Coding, Verbal, Reasoning, Interview, Other)
- Participate in Career Community, My Network, Communities
- Read company reviews (college-scoped)
- Manage college organization settings
- Update profile information

---

**End of College Module Documentation**
