# Master Feature Inventory — Role → Menu → Page → Section → Feature → Action → Permission

This table is the consolidated index of the UX Playbook. Each row maps a sidebar menu item to its page, the major sections/features on that page, the primary user actions available, and which roles can access it. For full per-page detail (forms, tables, statuses, empty states), follow the link to the relevant role doc.

**Legend for Permission column**: "Org-scoped" = data limited to the user's own organisation/tenant; "Platform-wide" = super admin sees data across ALL organisations; "Own" = user sees only their own records (e.g. own applications, own assigned candidates); "View-only" = no edit/action rights, read access only.

---

## Candidate ([01-candidate.md](01-candidate.md))

| Menu | Page (Route) | Key Sections/Features | Primary Actions | Permission |
|---|---|---|---|---|
| Dashboard | `/app/dashboard` | Profile completion, location banner, admin-assigned jobs, action-required panel, KPI cards, next interview, pipeline pills, refer & earn, matched jobs, skills gap analyzer | Apply to matched jobs, allow location, view application details | Own |
| Find Jobs / Smart Match | `/app/smart-match` | AI-ranked job matches, company details, reviews, assessment badges | Apply Now, View Details, Take Assessment, Refresh Match | Own |
| Opportunities | `/app/opportunities` | Placements, Internships, Exams & Tests, Training Resources, Recommended Courses tabs | Register, Take Test, External Registration | Own |
| My Applications | `/app/applications` | Applications & Invitations tabs, stage pipeline, recruiter card, interview/offer info, assessments | Withdraw, View & Respond, Sign Offer, Take Assessment | Own |
| My Interviews | `/app/interviews` | Upcoming/Past interview cards | Join Interview, Add to Calendar (.ics) | Own |
| Career Community | `/app/feed` | Social feed, post composer, hashtags, mentions | Post, Like, Comment, Share | Org-scoped feed |
| My Network | `/app/people` | Connections, requests, profile drawer | Connect, Message, Request Contact Info | Org-scoped |
| Communities | `/app/communities` | Community discovery by category | Join, Leave | Org-scoped |
| Company Reviews | `/app/company-reviews` | Review form, submitted reviews list | Submit Review | Org-scoped |
| Offer Comparison | `/app/offer-comparison` | Side-by-side offer table, decision score, pre-decision checklist | Select offers (max 3), Add CTC/Date, checklist | Own |
| Job Alerts | `/app/job-alerts` | Alert creation form, alerts list | Create, Pause/Resume, Delete | Own |
| Refer & Grow | `/app/refer-earn` | Referral hub, job referrals | Copy referral link, refer friend | Own |
| Pre-boarding | `/app/onboarding` | Hero/progress, offer signing, task groups | Confirm Joining, Upload Docs, Sign Offer | Own |
| BGV Documents | `/app/background-verification` | Status banner, upload form, document list | Upload, Preview, Delete | Own |
| My Profile | `/app/profile` | Personal/Work/Education/Certs/Resume/Video sections | Add/Edit/Delete entries, Save | Own |

---

## Recruiter ([02-recruiter.md](02-recruiter.md))

| Menu | Page (Route) | Key Sections/Features | Primary Actions | Permission |
|---|---|---|---|---|
| Dashboard | `/app/dashboard` | KPIs, pipeline summary, recent activity | View metrics, navigate to pipeline | Own/assigned |
| My Performance | `/app/my-performance` | Personal performance metrics, trends | View metrics | Own |
| Applicants | `/app/applicants` | Application records table | View, Move Stage, Schedule Interview, Send Offer, Reject, Export CSV | Org-scoped (assigned jobs) |
| My Jobs | `/app/my-jobs` | Job list, create/edit jobs | Create Job, Edit, Publish, View Applications | Own jobs |
| College Drives | `/app/college-drives` | Drive list, applications per drive | View, Download report, Schedule callback | Org-scoped |
| My Candidates | `/app/candidates` | Candidate records | View, Edit, Assign, Export | Org-scoped |
| Assigned to Me | `/app/assigned-candidates` | Candidates assigned to recruiter | Reassign, View Profile, Open Pipeline | Own/assigned |
| Job Match | `/app/job-match` | AI-style candidate-to-job matching | View match scores | Org-scoped |
| Pipeline | `/app/pipeline` | Stage-based kanban/table of applications | Move stage, schedule, offer, reject | Org-scoped |
| Talent Pool | `/app/talent-pool` | Passive/interested candidates | Add to Pipeline, Assign, Tag, Email | Org-scoped |
| Interviews | `/app/interviews` | Scheduled interviews, feedback | Schedule, Add Feedback, Reschedule | Org-scoped |
| Offers | `/app/offers` | Offer generation/tracking | Generate Offer, Track Status | Org-scoped |
| Pre-boarding | `/app/onboarding` | Onboarding records, document verification | View Details, Verify Docs, Add Task | Org-scoped |
| Assessments | `/app/assessments` | Assigned assessments, scores | Review, Resend, View Feedback | Org-scoped |
| Outreach | `/app/outreach` | Email/WhatsApp campaigns, delivery logs | New Campaign, Resend, Download Report | Org-scoped |
| Candidate Requests | `/app/candidate-requests` | Sourcing requests | Create Request, View Sourced, Close | Org-scoped |
| Client Requirements | `/app/job-requirements` | Client hiring requirements | Create, View Details, Mark Fulfilled | Org-scoped |
| Clients | `/app/clients` | Client records, billing terms | Create/Edit Client | Org-scoped |
| Career Community | `/app/feed` | Shared feed | Post, Like, Comment | Org-scoped |
| My Network | `/app/people` | Shared network | Connect, Message | Org-scoped |
| Communities | `/app/communities` | Shared communities | Join/Leave | Org-scoped |
| Company Reviews | `/app/company-reviews` | Shared reviews | Submit Review | Org-scoped |
| My Profile | `/app/profile` | Profile management | Edit Profile, Change Password | Own |

---

## Admin ([03-admin.md](03-admin.md))

| Menu | Page (Route) | Key Sections/Features | Primary Actions | Permission |
|---|---|---|---|---|
| Overview | `/app/analytics` | Org-wide KPIs, hiring funnel, source breakdown, top recruiters | Export Analytics, View Pipeline | Org-scoped |
| Insights | `/app/insights` | Smart alerts, SLA compliance, recruiter leaderboard, dropout analysis | Reload All, Retry | Org-scoped |
| Applicants | `/app/applicants` | Org-wide application records | View, Move Stage, Schedule, Offer, Reject, Export | Org-scoped |
| Job Approvals | `/app/job-approvals` | Queue of recruiter-submitted jobs | Preview, Approve & Publish, Reject (with feedback) | Org-scoped |
| Candidates | `/app/candidates` | Org-wide candidate database | View, Edit, Assign, Merge, Tag, Export | Org-scoped |
| College Drives | `/app/college-drives` | Org-wide college drives | View, Download report | Org-scoped |
| Outreach | `/app/outreach` | Bulk email/WhatsApp campaigns | New Campaign, View Logs, Resend | Org-scoped |
| Assessments | `/app/assessments` | Org-wide assessments | Review, Resend | Org-scoped |
| Pre-boarding | `/app/onboarding` | Org-wide onboarding records | View, Verify/Reject Docs, Add Task, Send Reminder | Org-scoped |
| Candidate Requests | `/app/candidate-requests` | Sourcing requests | Create, View Sourced, Close, Edit, Delete | Org-scoped |
| Assignments | `/app/assigned-candidates` | Org-wide candidate assignments | Reassign, Unassign | Org-scoped |
| Recruiters | `/app/recruiters` | Recruiter team management | View, Edit, Deactivate/Activate, Invite, Reset Password, Assign Jobs | Org-scoped |
| Hiring Managers | `/app/hiring-managers` | Hiring manager accounts | View, Edit, Assign Team, Deactivate, Invite | Org-scoped |
| Org Chart | `/app/org-chart` | Visual org hierarchy | Redistribute Jobs/Candidates, Classify Team | Org-scoped |
| Client Requirements | `/app/job-requirements` | Org-wide client requirements | Create, View, Mark Fulfilled, Close | Org-scoped |
| All Jobs | `/app/jobs` | Org-wide job list & lifecycle | Create, Edit, Publish, Close, Archive, Download Applicants | Org-scoped |
| Interview Kits | `/app/interview-kits` | Reusable interview question sets | Create Kit, Edit, Set Default, Delete | Org-scoped |
| Webhooks | `/app/webhooks` | Outbound integrations | Create Webhook, Test, View Logs, Retry, Activate/Deactivate | Org-scoped |
| Diversity | `/app/diversity` | Gender representation funnel | Filter by date, Populate sample data | Org-scoped |
| Reviews | `/app/reviews` | Candidate feedback/reviews | View, Respond, Archive, Flag | Org-scoped |
| Referrals | `/app/referrals` | Employee referral tracking | View Details, Approve/Reject Reward, Send Payout | Org-scoped |
| Talent Pool | `/app/talent-pool` | Org-wide passive candidates | Add to Pipeline, Assign, Tag, Email | Org-scoped |
| NPS | `/app/nps-dashboard` | Net Promoter Score dashboard | Filter, View Feedback, Generate sample data | Org-scoped |
| Time to Fill | `/app/time-to-fill` | Days-to-fill per job | View Details, Download Report | Org-scoped |
| Merge Duplicates | `/app/duplicate-merge` | Duplicate candidate scanner | Set as Primary, Merge, Dismiss | Org-scoped |
| Sourcing Tracker | `/app/sourcing-tracker` | Source quality/conversion/cost | Edit Source, Download Report | Org-scoped |
| Rejection Templates | `/app/rejection-templates` | Reusable rejection emails | Create, Edit, Preview, Set Default, Seed Defaults | Org-scoped |
| Offer Letter Builder | `/app/offer-letter-builder` | Offer template sections/placeholders | Edit sections, Live Preview, Save Template | Org-scoped |
| Dashboard Widgets | `/app/dashboard-widgets` | Dashboard customization | Enable/Disable widgets, Reorder, Configure | Org-scoped |
| Headcount Planner | `/app/headcount-planner` | Hiring forecast vs actual | Create Plan, Edit, Track Progress, Export | Org-scoped |
| Hiring Alerts | `/app/sla-alerts` | SLA breach monitoring | Create/Edit SLA, Acknowledge, Auto-remediate | Org-scoped |
| Custom Stages | `/app/custom-stages` | Custom pipeline stages | Add/Edit/Delete/Reorder Stage | Org-scoped |
| Automation | `/app/automation` | Workflow rule engine | Create Rule, Test, Activate/Deactivate, View Logs | Org-scoped |
| Customizations | `/app/customizations` | Branding, custom fields, workflows | Add Custom Field, Save Brand Colors, Edit Email Templates | Org-scoped |
| Career Community | `/app/feed` | Shared feed (+ moderation) | Post, Delete, Report | Org-scoped |
| My Network | `/app/people` | Shared network | Connect, Message | Org-scoped |
| Communities | `/app/communities` | Shared communities | Join/Leave | Org-scoped |
| Reported Posts | `/app/reported-posts` | Moderation queue | Review, Approve/Delete Post, Ban/Warn User | Org-scoped |
| Org Settings | `/app/org-settings` | Org/email/branding/stages/team config | Save Settings, Test Email, Manage Stages/Team | Org-scoped |
| Platform Guide | `/app/modal-guide` | Component/modal reference | View Code, Copy HTML | Org-scoped |
| Billing | `/app/billing` | Plan, usage, invoices | Upgrade Plan, Download Invoice, Update Payment | Org-scoped |
| My Profile | `/app/profile` | Profile management | Edit, Change Password | Own |

---

## Super Admin ([04-superadmin.md](04-superadmin.md))

| Menu | Page (Route) | Key Sections/Features | Primary Actions | Permission |
|---|---|---|---|---|
| Command Center | `/app/command-center` | Global search, health, quick shortcuts | Search, Check System Health, Impersonate User | Platform-wide |
| Overview | `/app/analytics` | Platform-wide analytics (shared w/ Admin) | Export Analytics | Platform-wide |
| Platform | `/app/platform` | Org KPIs, plan breakdown, revenue, backups, broadcast | Download Backup, Deduplicate Jobs, Send Broadcast | Platform-wide |
| Organisations | `/app/organisations` | Org directory, member management | Create/Edit/Delete Org, Create User, Toggle Status, Merge Users | Platform-wide |
| Company Reviews | `/app/reviews` | All-org reviews (shared w/ Admin) | View, Respond | Platform-wide |
| NPS Dashboard | `/app/nps-dashboard` | All-org NPS (shared w/ Admin) | Filter, View Feedback | Platform-wide |
| Reported Posts | `/app/reported-posts` | Community moderation | Delete Post, Dismiss Report | Platform-wide |
| Registered Users | `/app/candidates` | All registered candidates (shared AdminUsers) | View, Edit, Assign | Platform-wide |
| Guest Applicants | `/app/unregistered-candidates` | Guest/unregistered applicants | Edit Record, Save Changes | Platform-wide |
| Candidate Database | `/app/all-candidates` | Master candidate records | View Profile, Change Stage, Export CSV | Platform-wide |
| College Groups | `/app/college-groups` | Candidates by college affiliation | View candidates (drawer, Load More) | Platform-wide |
| Company Groups | `/app/company-groups` | Candidates by company affiliation | View candidates (drawer, Load More) | Platform-wide |
| Application Records | `/app/applicants` | All-org applications (shared) | View, Move Stage, Export | Platform-wide |
| Job Approvals | `/app/job-approvals` | All-org job approval queue (shared) | Approve/Reject | Platform-wide |
| Billing | `/app/billing` | Platform billing/revenue (shared) | View plans/invoices | Platform-wide |
| Security | `/app/security` | Feature flags, security settings, audit log | Toggle Feature Flags, Save Settings, Export Audit Log | Platform-wide |
| Permissions | `/app/permissions` | Role-based permission matrix | Toggle view/edit per resource/field, Save | Platform-wide |
| Import & Assign | `/app/import-candidates` | Bulk candidate import | Upload File, Start Import, Send Invites, Clear Database | Platform-wide |
| Recruiters | `/app/recruiters` | All-org recruiters (shared AdminUsers) | View, Edit, Deactivate, Invite | Platform-wide |
| Hiring Managers | `/app/hiring-managers` | All-org HMs (shared AdminUsers) | View, Edit, Deactivate, Invite | Platform-wide |
| Admins | `/app/admins` | All-org admin accounts | Edit, Deactivate, Delete | Platform-wide |
| All Jobs | `/app/jobs` | All-org jobs (shared AdminJobs) | Create, Edit, Publish, Close | Platform-wide |
| Assessments | `/app/assessments` | All-org assessments (shared) | Review, Resend | Platform-wide |
| Pre-boarding | `/app/onboarding` | All-org onboarding (shared) | Verify Docs, Add Task | Platform-wide |
| BGV Tracker | `/app/bgv-tracker` | BGV document verification | Preview, Verify (verified/rejected), Delete | Platform-wide |
| Automation | `/app/automation` | Platform-wide automation rules (shared) | Create Rule, Test, Activate | Platform-wide |
| Customizations | `/app/customizations` | System field schema, automation config | Toggle field visibility, Add Custom Field | Platform-wide |
| Outreach | `/app/outreach` | All-org outreach (shared) | New Campaign, View Logs | Platform-wide |
| Contact Enquiries | `/app/contact-leads` | Inbound contact/lead enquiries (shared) | View, Respond | Platform-wide |
| Candidate Requests | `/app/candidate-requests` | Platform-wide candidate sourcing requests | Search Candidates, Park, Fulfill/Cancel Request | Platform-wide |
| Playbooks | `/app/playbooks` | Auto-generated platform handbooks | Generate, Download, Regenerate, Preview | Platform-wide |
| Blog Manager | `/app/blogs` | Marketing blog CMS | Create/Edit/Delete Blog, Publish/Unpublish, Feature | Platform-wide |
| Job Referrals | `/app/referrals` | All-org referral tracking (shared) | View Details, Approve Reward | Platform-wide |
| Platform Referrals | `/app/platform-referrals` | Platform referral leaderboard | View-only | Platform-wide |
| Career Community | `/app/feed` | Shared feed | Post, Like, Comment | Platform-wide |
| My Network | `/app/people` | Shared network | Connect, Message | Platform-wide |
| Communities | `/app/communities` | Shared communities | Join/Leave | Platform-wide |
| Org Reviews | `/app/company-reviews` | Shared company reviews | Submit Review | Platform-wide |
| Modal Guide | `/app/modal-guide` | Component/modal reference (shared) | View Code, Copy HTML | Platform-wide |
| My Profile | `/app/profile` | Profile management (shared) | Edit, Change Password | Own |

---

## Client ([05-client.md](05-client.md))

| Menu | Page (Route) | Key Sections/Features | Primary Actions | Permission |
|---|---|---|---|---|
| Dashboard | `/app/dashboard` | Pipeline KPIs, stage breakdown, top shortlisted, recent hires | View metrics, navigate to Shortlists | Own org (client-scoped) |
| Hiring Requirements | `/app/requirements` | Requirement list & status tracking | Create, Edit/Withdraw (if new), track status | Own |
| Shortlists | `/app/shortlists` | Candidates in shortlist/interview/offer/hired stages | Rate (1-5 stars), Save comment, Approve, Reject | Own |
| Interviews | `/app/interviews` | All scheduled interviews | Reschedule, Add Feedback | Own |
| Placements | `/app/placements` | Hired candidates, placement KPIs | Save onboarding notes | Own |
| Career Community | `/app/feed` | Shared feed | Post, Like, Comment | Org-scoped |
| My Network | `/app/people` | Shared network | Connect, Message | Org-scoped |
| Communities | `/app/communities` | Shared communities | Join/Leave | Org-scoped |
| Company Reviews | `/app/company-reviews` | Shared reviews | Submit Review | Org-scoped |
| My Profile | `/app/profile` | Profile management | Edit, Change Password | Own |

---

## College ([06-college.md](06-college.md))

| Menu | Page (Route) | Key Sections/Features | Primary Actions | Permission |
|---|---|---|---|---|
| Overview | `/app/analytics` | Student/placement KPIs, department/batch charts, skill gaps | Send Announcement, click-through filters | Org-scoped (college) |
| Students | `/app/candidates` | Student/alumni database with profiles | View Profile, Edit, Delete, Download CSV | Org-scoped |
| Add Candidates | `/app/add-candidates` | Bulk import (Excel/CSV) or manual add | Upload & Map, Import, Add Manually | Org-scoped |
| Placement Records | `/app/applicants` | Student applications/placements across companies | Filter by stage/company, Save notes | Org-scoped |
| Placement Drives | `/app/drives` | Internal drives, internships, exams, training resources | Create Drive, Notify Students, Add Resource | Org-scoped |
| Reviews | `/app/reviews` | College-scoped reviews (shared AdminReviews) | View, Respond | Org-scoped |
| Career Community | `/app/feed` | Shared feed | Post, Like, Comment | Org-scoped |
| My Network | `/app/people` | Shared network | Connect, Message | Org-scoped |
| Communities | `/app/communities` | Shared communities | Join/Leave | Org-scoped |
| Org Settings | `/app/org-settings` | College org configuration (shared OrgSettings) | Save Settings, Manage Stages/Team | Org-scoped |
| My Profile | `/app/profile` | Profile management | Edit, Change Password | Own |

---

## Hiring Manager ([07-hiring-manager.md](07-hiring-manager.md))

| Menu | Page (Route) | Key Sections/Features | Primary Actions | Permission |
|---|---|---|---|---|
| Dashboard | `/app/dashboard` | KPIs, pipeline distribution, priority board, candidate list | Search/Filter/Sort candidates | Own team |
| My Team | `/app/my-team` | Assigned jobs, recruiters, pipeline breakdown | View Pipeline (→ shared AdminPipeline) | Own team |
| Pipeline | `/app/pipeline` | Team's pipeline (shared AdminPipeline) | View-only | Own team, View-only |
| Interviews | `/app/interviews` | Team's scheduled interviews (shared RecruiterInterviews) | View-only | Own team, View-only |
| Client Requirements | `/app/job-requirements` | Client hiring requirements (shared JobRequirements) | View | Org-scoped |
| Clients | `/app/clients` | Client list (shared AdminClients) | View-only | Org-scoped, View-only |
| Career Community | `/app/feed` | Shared feed | Post, Like, Comment | Org-scoped |
| My Network | `/app/people` | Shared network | Connect, Message | Org-scoped |
| Communities | `/app/communities` | Shared communities | Join/Leave | Org-scoped |
| Company Reviews | `/app/company-reviews` | Shared reviews | Submit Review | Org-scoped |
| My Profile | `/app/profile` | Profile management | Edit, Change Password | Own |

---

## Shared / Cross-Role Elements ([00-overview.md](00-overview.md))

| Element | Available To | Feature | Action | Permission |
|---|---|---|---|---|
| Notification Bell | All roles | Unread/All tabs, type-specific icons, drill-down modal | Mark all read, Clear all, Settings shortcut (candidate) | Own |
| Messages (ChatPanel) | All roles | Inbox, unread badge (polled 20s) | Send/receive messages | Own |
| Who's Online | All roles | Online users panel | Start chat | Own |
| Theme Switcher | All roles | Light/Dark/Ocean | Switch theme | Own |
| Profile Menu | All roles | My Profile, Change Password, Email Settings (hidden for candidate), Theme, Sign Out | Navigate/toggle | Own |
| Impersonation Banner | Super Admin (active) | Shows "Impersonating: X" | Exit Impersonation | Super Admin only |
| Offline Banner | All roles | Connection lost indicator | None | N/A |
| Trial Banner | Admin | "N days left" + Upgrade now | Navigate to billing | Org-scoped |
| QuickActionMenu | All roles (role-aware) | Floating quick actions | Role-specific shortcuts | Own |
| BroadcastBanner | All roles | Platform-wide announcements | View | Role-targeted |
| CallManager | All roles | Voice/video call UI | Accept/decline calls | Own |

---

**End of Master Feature Inventory** — see [00-overview.md](00-overview.md) for the playbook index and shared-element details.
