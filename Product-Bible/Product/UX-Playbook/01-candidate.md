# Candidate Module — User Experience & Feature Playbook

**Sidebar nav** (`NAVS.candidate` in `Layout.jsx`): Dashboard · Find Jobs · Opportunities · My Applications · My Interviews · Career Community · My Network · Communities · Company Reviews · Offer Comparison · Job Alerts · Refer & Grow · Pre-boarding · BGV Documents · My Profile

> Shared sidebar/header elements (notifications, messages, theme, profile menu, etc.) are documented once in [00-overview.md](00-overview.md) and not repeated here.

---

### Page: Dashboard (`/app/dashboard`)
- **Component file**: `src/pages/candidate/CandidateDashboard.jsx`
- **Purpose**: Central hub showing application pipeline status, matched job recommendations, profile completion tracker, and recent activity updates.
- **Sections/Cards/Widgets**:
  - Profile Completion Banner (%), with link to complete profile
  - Location Permission Banner (request geolocation for nearby job recommendations)
  - Admin-Assigned Jobs section (jobs added to pipeline by HR, with action prompt)
  - Action Required panel (alerts for offers, interviews, shortlists)
  - Recent Activity Updates (3 most recent application changes)
  - KPI Cards: Applications Sent, Shortlisted, Active Processes, Success Rate (click → Applications)
  - Next Interview card (countdown, date/time, type, meeting link)
  - Pipeline Overview pills (counts per stage)
  - Refer & Earn badge/progress
  - Matched Jobs section (top 4 matched jobs with score, Apply button)
  - Skills Gap Analyzer (missing skills to add to profile)
- **Buttons & Actions**: "Complete Profile →"; "📍 Allow Location" (geolocation, calls `updateMyLoginLocation`) / "Skip"; "View Details →" (admin-assigned jobs); "✨ Find matching jobs"; Apply on matched jobs (`applyToJob`); KPI/stage pills navigate to Applications.
- **Statuses/Badges**: Application stage badges (Applied, Screening, Shortlisted, Interview, Completed, Offered, Hired, Rejected); match score badges (green ≥80%, orange ≥60%, red <60%).
- **Empty/Loading**: Loading spinner; "No applications yet".

---

### Page: Find Jobs / Smart Match (`/app/smart-match`)
- **Component file**: `src/pages/candidate/CandidateSmartMatch.jsx`
- **Purpose**: AI-style job matching engine with ranked recommendations, skill-match reasoning, and company/industry/department filters.
- **Sections/Cards/Widgets**: Search & "📊 Refresh Match" row; filter row (Company, Industry, Department); job cards (rank, title, match score %, Applied/Urgent badges, company, location, experience, reasoning); expandable details panel (company overview — HQ, industry, founding year, employee count, website, description, products/services, culture, success stories; company reviews; assessment-required badge with "Take Assessment").
- **Filters & Search**: Keyword search (debounced 400ms); Company / Industry / Department dropdowns (populated from loaded jobs).
- **Buttons & Actions**: "📊 Refresh Match"; "▼ View Details"/"▲ Hide"; "Apply Now" → "✓ Applied" (`applyToJob`); "Take Assessment" → `/app/assessment/{id}`; "Load more" (pagination +100).
- **Empty/Loading**: Spinner while matching; "No matches found"; "Loading open positions...".

---

### Page: Opportunities (`/app/opportunities`)
- **Component file**: `src/pages/candidate/CandidateOpportunities.jsx`
- **Purpose**: Unified view of placement drives, internships, exams, training resources, and recommended courses (primarily for college/institutional candidates).
- **Sections/Cards/Widgets**: Tabs — Placements, Internships, Exams & Tests, Training Resources, Recommended Courses. Opportunity cards (title, company, status, date, mode, location, description, eligibility, registration status). Training Resources tab: resource cards (title, category, description, link). Recommended Courses tab: skill cards (skill name, demand count, linked courses).
- **Buttons & Actions**: Tab switcher; "✅ Register" (`registerForOpportunity`, disables after); "📝 Take Test" → `/app/assessment/{id}`; "🔗 External Registration" (opens external link).
- **Statuses/Badges**: Opportunity status (upcoming/ongoing/completed/cancelled); registration status (registered/shortlisted/selected/rejected); course demand count.
- **Empty/Loading**: Spinner; error message; "No [type] available right now".

---

### Page: My Applications (`/app/applications`)
- **Component file**: `src/pages/candidate/CandidateApplications.jsx`
- **Purpose**: Track job applications through pipeline stages; view interviews, assessments, feedback; manage invitations.
- **Sections/Cards/Widgets**:
  - Two tabs: **Applications** (with count) and **Invitations** (with count + pending badge).
  - **Applications tab**: HR-assigned-jobs alert banner; stage filter pills (All, Applied, Screening, Shortlisted, Interview, Completed, Offered, Hired, Rejected, Withdrawn) with counts; application stepper (Applied → Screening → Shortlisted → Interview Scheduled → Interview Completed → Offer Extended → Selected); application cards (stage header/icon, job title, company, location, applied date, source badge: HR/Career Page/Referral); resume match-score breakdown (Skills/Experience/Location %); assigned recruiter card (avatar, name, title, email link); interview prep tips (interview_scheduled stage); interview details (date/time, type, join link, notes); offer info (View & Sign link for offer_extended/selected); rejection-reason feedback; recruiter feedback with rating stars; assessment status (Not Started/In Progress/Submitted/Expired) with Take Assessment button.
  - **Invitations tab**: invitation cards (job title, company, location, type: sent/opened/interested/declined, sent date, optional recruiter message); status badges (📨 Pending, 👁 Opened, ⭐ Shortlisted, 👋 Declined, 🚫 Failed); "TALENT MATCH" badge.
- **Filters & Search**: Stage tabs (hides empty stages).
- **Buttons & Actions**: Tab selector; stage filter pills; "✕ Withdraw" (applied/screening only → withdrawal modal with reason dropdown); "View & Respond" (opens `/invite/{token}` new tab); "📊 Track Application Progress"; "✍️ View & Sign Offer" / "📄 View Signed Offer" → `/app/offer/{offerId}`; "📝 Take Screening Assessment" / "⏱ Resume Assessment — In Progress" → `/app/assessment/{id}`.
- **Forms/Modals**: Withdrawal confirmation modal — reason dropdown (Accepted another offer, Role not a fit, Salary expectations, Location/remote, Applied by mistake, Personal, Other), confirm.
- **Statuses/Badges**: Pipeline stage icons; source badges; assessment status; offer status (Sent, Signed, Hired).
- **Empty/Loading**: Spinner; "No applications yet"; "No invitations yet"; per-stage "No applications in this stage".

---

### Page: My Interviews (`/app/interviews`)
- **Component file**: `src/pages/candidate/CandidateInterviews.jsx`
- **Purpose**: Calendar view of all scheduled interviews (upcoming + past) with meeting links and calendar export.
- **Sections/Cards/Widgets**: Upcoming Interviews section (count); Past Interviews section (count, if any); interview cards (job title, company, round number, format icon — video/phone/in-person, scheduled date/time, interviewer name, location, format type). Past interviews shown with reduced opacity.
- **Buttons & Actions**: "🔗 Join Interview" (videoLink, opens new tab); "📆 Add to Calendar" (downloads `.ics`).
- **Empty/Loading**: Spinner; error message; "No upcoming interviews scheduled yet".

---

### Page: Career Community / Feed (`/app/feed`)
- **Component file**: `src/pages/shared/CommunityFeed.jsx`
- **Purpose**: Social feed of posts from connections/communities — likes, comments, hashtags, mentions.
- **Sections/Cards/Widgets**: Post composition box (text + char count); feed of posts (author avatar/name, role badge, post-type badge — Achievement/Milestone/Hiring/Announcement/Resource/Pro Tip/Feedback/Question/Poll, color-coded; content with hashtag/mention linkification; timestamp; like/comment counts); "1st degree connection" badge on posts from connections.
- **Filters & Search**: Hashtag click-to-filter; connection/community filtering.
- **Buttons & Actions**: Compose/post; Like toggle; Comment (opens thread modal); hashtag links; @mention → profile; Share (where applicable).
- **Empty/Loading**: Spinner; "No posts yet".

---

### Page: My Network / People (`/app/people`)
- **Component file**: `src/pages/shared/PeoplePage.jsx`
- **Purpose**: Browse/manage professional network — connections, requests, profiles, masked-contact requests.
- **Sections/Cards/Widgets**: Search bar (name/title/company); filter tabs (My Connections, Pending Requests, Suggested); people cards (avatar, name, title, company, mutual connections, connection status); profile drawer (profile details, role badge, recent posts, masked contact info, connection options); contact-info-request modal.
- **Buttons & Actions**: "Connect"; "Pending" (cancel option); "✓ Connected"; "Message" (opens compose in drawer); "Request Contact Info" (with note); card click → drawer.
- **Empty/Loading**: Spinner; "No people found".

---

### Page: Communities (`/app/communities`)
- **Component file**: `src/pages/shared/CommunitiesPage.jsx`
- **Purpose**: Discover/join communities by category (Tech, HR, Business, Design, Other).
- **Sections/Cards/Widgets**: Search/filter section; community cards (cover color, icon, name, category badge, description, member count, join/leave button); "🎓 Your College" badge on auto-member communities.
- **Filters & Search**: Search by name; category filter.
- **Buttons & Actions**: "Join" (`joinCommunity`); "Leave" on hover (`leaveCommunity`); "Joined" badge; card click → `/app/communities/{slug}`.
- **Empty/Loading**: Spinner; "No communities found".

---

### Page: Company Reviews (`/app/company-reviews`)
- **Component file**: `src/pages/shared/CompanyReviewsPage.jsx`
- **Purpose**: Browse and submit employer reviews.
- **Sections/Cards/Widgets**: Company search/dropdown (autocomplete); review submission form; submitted reviews list (star rating, title, reviewer name/role/company, date, pros/cons); average rating with stars.
- **Forms/Modals**: Review form — Company (dropdown), Rating (1-5 star picker), Title (text), Pros (textarea), Cons (textarea), Role (dropdown), Anonymous (checkbox). "Submit Review" (`submitMyOrgReview`); "Write another" resets form.
- **Empty/Loading**: Spinner; "No reviews yet"; "Review posted!" success message.

---

### Page: Offer Comparison (`/app/offer-comparison`)
- **Component file**: `src/pages/candidate/OfferComparison.jsx`
- **Purpose**: Side-by-side comparison of up to 3 offers with decision scoring and a pre-decision checklist.
- **Sections/Cards/Widgets**: Offer selection cards (click to select, max 3); comparison table (Job Title, Company, Total CTC, Location, Joining Date, Offer Date, Status); Decision Score panel (0-100 per offer, based on CTC/status/joining date); Smart Insights (salary/location/joining-timeline comparison); "★ Highest CTC" / "TOP PICK" highlight; Pre-Decision Checklist (6 items: salary breakup, notice period, benefits, work mode, growth, company reviews).
- **Buttons & Actions**: Select-offer toggle (max 3); "+ Add CTC" inline edit; "+ Add Date" inline date picker; checklist checkboxes.
- **Statuses/Badges**: Decision score color (green ≥80%, orange ≥60%, red <60%); checklist progress.
- **Empty/Loading**: Spinner; "No offers yet"; "Select 2–3 offers to compare".

---

### Page: Job Alerts (`/app/job-alerts`)
- **Component file**: `src/pages/candidate/CandidateJobAlerts.jsx`
- **Purpose**: Create/manage email alerts for jobs matching criteria.
- **Sections/Cards/Widgets**: Create New Alert form; existing alerts list (criteria summary, frequency, active/paused status, last sent date).
- **Forms/Modals**: Create form — Keywords (comma-separated text), Location (text), Job Type (Full-Time/Part-Time/Contract/Remote/Internship), Industry (select), Department (select), Min/Max Experience (selects), Email Frequency (daily/weekly). Validation: requires at least one of keywords/location/job type.
- **Buttons & Actions**: "🔔 Create Alert" (`createJobAlert`); "⏸ Pause" / "▶ Resume" (`updateJobAlert`); "Remove" (`deleteJobAlert`).
- **Empty/Loading**: Spinner; "No alerts yet" + CTA.

---

### Page: Refer & Grow (`/app/refer-earn`)
- **Component file**: `src/pages/candidate/CandidateReferEarn.jsx`
- **Purpose**: Referral program — earn coins by inviting friends.
- **Sections/Cards/Widgets**: `ReferralHub` (referral link, copy button, progress/stats, rewards breakdown); `MyJobReferrals` (job referrals made + status).
- **Buttons & Actions**: Copy referral link; Refer-friend share/invite flow.
- **Statuses/Badges**: Referral progress, coins earned, reward tier badges.

---

### Page: Pre-boarding (`/app/onboarding`)
- **Component file**: `src/pages/candidate/CandidateOnboarding.jsx`
- **Purpose**: Pre-joining checklist — tasks, documents, offer signing, progress tracking.
- **Sections/Cards/Widgets**: Hero (role, department, joining date, days countdown, confirm-joining button); circular progress (% complete); Offer Letter section (status, signing UI, signed date); task groups by category (Documents, Training, IT Setup, Policies, Orientation, Other); task cards (title, description, due date, status badge, upload controls for documents); HR feedback section (rejected/resubmission_required docs); "BGV Verified" badge; completion banner at 100%.
- **Buttons & Actions**: "✅ Confirm My Joining" (`confirmPreBoardingJoining`); task checkboxes (`updatePreBoardingTask`); "📎 Upload Doc" / "🔄 Re-upload" (`uploadPreBoardingDocument`); "👁 View" (preview modal); "🗑 Delete" (`deletePreBoardingDocument`); "✍️ Sign Offer" → inline form → "✍️ Confirm Sign" (typed-name signature, `signOffer`).
- **Statuses/Badges**: Task completion checkbox; document verification status (Upload Required, Under Review, Verified, Rejected, Resubmit); offer "Signed"; BGV verified badge.
- **Empty/Loading**: Spinner; "No Pre-boarding Yet".

---

### Page: BGV Documents (`/app/background-verification`)
- **Component file**: `src/pages/candidate/CandidateBackgroundVerification.jsx`
- **Purpose**: Upload KYC/employment documents for background verification, reusable across applications.
- **Sections/Cards/Widgets**: BGV status banner (Verified/In Progress/none); info boxes (upload-once messaging, privacy reassurance); upload form (document type dropdown, custom label, file picker); documents list (file icon, name, type, size, upload date, verification status badge, delete).
- **Forms/Modals**: Upload modal — Document Type (required: Aadhaar, PAN, Passport, Degree, Salary Slip, Experience Letter, Relieving Letter, Address Proof, Bank Details, Reference, Other, plus org-customized types), Custom Label (optional), File (required, max 10MB, .pdf/.jpg/.jpeg/.png/.docx). "📤 Upload" (`uploadBgvDocument`). Document preview modal (PDF embed/image/download).
- **Buttons & Actions**: "+ Upload Document"; "Preview" (`getBgvDocumentFile`); "Delete" (`deleteBgvDocument`, confirm).
- **Statuses/Badges**: Verification status (Uploaded, Under Review, Verified, Rejected); "🏅 TalentNest Verified" badge when all verified; verified/total count.
- **Empty/Loading**: Spinner; "No Documents Yet".

---

### Page: My Profile (`/app/profile`)
- **Component file**: `src/pages/candidate/CandidateProfile.jsx`
- **Purpose**: Edit personal info, education, work history, skills, certifications, resume, video resume.
- **Sections/Cards/Widgets**: Profile sections — Personal, Work Experience, Education, Certifications, Links, Resume/Video Resume.
- **Forms/Modals**: Work entry (Job Title, Company autocomplete, Location, Employment Type, From/To dates, Current checkbox, Responsibilities); Education entry (Degree, Institution autocomplete, University, Location, Year, Grade/CGPA); Certification entry (Name, Issuing Organization, Year, Credential URL); Video Resume (record/upload/preview/delete).
- **Buttons & Actions**: Add/Delete entries (work, education, certifications); record/upload/delete video resume; Save profile.

---

## Candidate Feature Checklist

- Apply to jobs (smart-match, explore, careers page) with screening questions
- AI-style job matching with skill-match reasoning and company/industry/department filters
- View full job + company details (overview, products/services, culture, success stories, reviews)
- Take screening/skills assessments inline
- Track applications through 7-stage pipeline (Applied → Screening → Shortlisted → Interview Scheduled → Interview Completed → Offer Extended → Selected/Rejected/Withdrawn)
- Withdraw an application with a reason
- View assigned recruiter (avatar, name, title, email)
- Interview prep tips, interview details (date/time/type/location/join link), add interview to calendar (.ics)
- View recruiter feedback/ratings and rejection reasons
- View, sign, and download offer letters
- Compare up to 3 offers (CTC, location, joining date, status) with decision score and pre-decision checklist
- Manage job alerts (keywords, location, type, industry, department, experience, frequency)
- Browse placement drives, internships, exams/tests, training resources, recommended courses (Opportunities)
- Register for opportunities; take exam assessments; open external registration links
- Refer & Grow referral program (referral link, coin rewards, job referral tracking)
- Career feed: post, like, comment, hashtags, mentions, post-type badges
- My Network: search, connect, message, request masked contact info, view profiles
- Join/leave communities (including auto-member college communities)
- Submit and read company reviews (star ratings, pros/cons, anonymous option)
- Complete pre-boarding: confirm joining date, complete tasks, upload documents, sign offer
- Upload/manage BGV/KYC documents; earn "TalentNest Verified" badge
- Edit profile: personal info, work history, education, certifications, resume upload, video resume recording
- Profile completion tracker and skills-gap analyzer
- Geolocation opt-in for nearby job recommendations
- Notification settings, change password, theme switcher
