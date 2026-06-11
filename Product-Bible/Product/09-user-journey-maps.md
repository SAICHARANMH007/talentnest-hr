# User Journey Maps

## 1. Candidate Journey: "From Discovery to Day 1"

| Stage | Touchpoint | What happens | Emotion |
|---|---|---|---|
| **Discovery** | Career page / referral link / community | Candidate finds a job via an org's branded career page or a referral link from a connection | Curious |
| **Apply** | Public or authenticated application form | Resume uploaded → auto-parsed (skills/experience extracted); application submitted; duplicate prevented | Hopeful |
| **Track** | Candidate Dashboard / Applications | Real-time stage updates (`stageHistory`); notifications on key milestones | Reassured (vs. typical "black hole") |
| **Engage** | Communities / Feed | Joins college/company communities, posts updates, connects with professionals | Engaged |
| **Assess** | Assessment module | Takes assigned assessment (MCQ/code/text), auto-scored | Tested |
| **Interview** | Self-scheduling link → Video room | Picks a slot, joins WebRTC interview in-platform | Prepared |
| **Offer** | Offer Letter modal | Reviews CTC/tenure/joining date, digitally signs PDF | Excited |
| **Verify** | BGV upload | Uploads Aadhaar/PAN/education/employment docs, tracks approval status | Cooperative |
| **Onboard** | Pre-Boarding checklist | Completes tasks from `OnboardingTemplate` before Day 1 | Prepared |
| **Reflect** | NPS survey / Company Review | Submits NPS score and/or public company review | Heard |

**Key differentiator vs. typical job-board journeys**: the "Track," "Engage," and "Reflect" stages give candidates a reason to return to the platform even when not actively job-hunting — this is the retention flywheel referenced in [Product Vision](../Vision/02-product-vision.md).

---

## 2. Recruiter Journey: "From Requisition to Hire"

| Stage | Touchpoint | What happens |
|---|---|---|
| **Plan** | Headcount Plans | Reviews department headcount forecast/budget |
| **Post** | Recruiter Jobs | Creates job (title, skills, salary, location); career page slug auto-generated |
| **Source** | Recruiter Candidates / Talent Pool | Adds candidates manually, via bulk import, or from saved searches; shares job via `ShareJobModal` (email/link) |
| **Screen** | Recruiter Pipeline (Talent Mirror) | Reviews `matchBreakdown` scores; moves candidates through stages (single or bulk) |
| **Interview** | Interview Kits / Scheduling / Video Rooms | Sends self-scheduling link; conducts structured interview with scorecard |
| **Decide** | Pipeline inline stage change | Moves candidate to Offer or Rejected (using `RejectionTemplate` if rejecting) |
| **Offer** | Offers module | Generates and sends offer PDF; tracks acceptance |
| **Verify & Onboard** | BGV / Pre-Boarding | Requests BGV docs; assigns pre-boarding checklist |
| **Review** | Recruiter Dashboard / Outreach Tracker | Reviews funnel analytics, outreach effectiveness (shares vs. invites, sent-by attribution) |

---

## 3. Placement Officer Journey: "From Term Start to Placement Season Wrap-Up"

| Stage | Touchpoint | What happens |
|---|---|---|
| **Onboard cohort** | College Students | Roster of current students (and existing alumni) loaded; filterable by department/batch |
| **Identify gaps** | College Overview — Skill Gap Analysis | Reviews in-demand skills vs. student coverage; shares course recommendations with departments/students |
| **Schedule drives** | College Drives | Creates placement drives with eligibility criteria (CGPA, branches, skills); students register |
| **Monitor activity** | College Overview | Watches Total Applications, Upcoming Interviews KPIs; drills into `/app/applicants?stage=Interview` |
| **Track outcomes** | College Placements | Reviews placement records by company/stage; adds private follow-up notes |
| **Report** | College Overview — dept/batch breakdowns | Pulls department- and batch-level placement rates for institutional reporting |
| **Close the loop** | College Students — recommended courses | Directs students with skill gaps to specific courses ahead of next placement cycle |

**Key insight**: This journey was historically conducted via spreadsheets + WhatsApp (see [Problem Statement](../Vision/04-problem-statement.md)). The College Hiring Portal compresses "Identify gaps → Report" into a single session instead of a multi-week manual data-collection exercise.

---

## 4. Admin Journey: "From Org Setup to Steady-State Operations"

| Stage | Touchpoint | What happens |
|---|---|---|
| **Setup** | Org Settings | Configures branding, logo, email settings, custom pipeline stages |
| **Staff up** | Admin Users | Invites recruiters/hiring managers/clients (secure link or temp password); manages pending invites (resend/revoke) |
| **Configure** | Custom Fields, Pipeline Templates, Rejection/Onboarding Templates, Interview Kits | Sets up reusable configuration so recruiters don't reinvent process per job |
| **Operate** | Admin Jobs, Job Approval | Approves/rejects jobs posted by recruiters (if approval workflow enabled) |
| **Monitor** | Admin Analytics | Reviews application trends, pipeline distribution, top jobs, recruiter performance |
| **Govern** | Audit Logs, Billing | Reviews action history; manages plan/subscription via Razorpay |

---

## 5. Super Admin Journey: "Platform Health & Growth"

| Stage | Touchpoint | What happens |
|---|---|---|
| **Monitor** | Command Center, Platform health (`/api/platform/health`) | Cross-tenant system health check |
| **Support** | Orgs, Audit | Investigates tenant issues using cross-tenant audit logs |
| **Moderate** | Company Reviews moderation, Feed post reports | Reviews/removes flagged content |
| **Grow** | College Groups | Identifies top-engagement colleges for the College Placement Cell distribution strategy |
| **Communicate** | Playbooks | Generates up-to-date Product Intelligence / Sales / Investor playbooks for stakeholder conversations |
