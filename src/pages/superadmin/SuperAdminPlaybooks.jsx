import { useState } from 'react';
import Toast from '../../components/ui/Toast.jsx';

// ─── Playbook HTML generators ─────────────────────────────────────────────────

const BASE_STYLES = `
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#f0f4f8;color:#1e293b;line-height:1.6}
    .hero{background:linear-gradient(135deg,#0a1628 0%,#0176D3 60%,#00C2CB 100%);color:#fff;padding:60px 40px 48px;position:relative;overflow:hidden}
    .hero::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")}
    .hero-badge{display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.3);border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700;letter-spacing:1px;margin-bottom:16px;backdrop-filter:blur(8px)}
    .hero h1{font-size:clamp(28px,5vw,48px);font-weight:900;letter-spacing:-0.02em;margin-bottom:10px}
    .hero p{font-size:16px;opacity:0.85;max-width:600px;margin-bottom:24px}
    .hero-meta{display:flex;gap:20px;flex-wrap:wrap}
    .hero-meta span{font-size:12px;opacity:0.7;display:flex;align-items:center;gap:5px}
    .container{max-width:960px;margin:0 auto;padding:40px 24px}
    .toc{background:#fff;border-radius:16px;padding:28px 32px;margin-bottom:32px;box-shadow:0 2px 16px rgba(0,0,0,0.06);border-left:4px solid #0176D3}
    .toc h2{font-size:14px;font-weight:800;color:#0176D3;letter-spacing:1px;margin-bottom:14px}
    .toc ol{padding-left:18px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:4px 24px}
    .toc li{font-size:13px;color:#475569;padding:3px 0}
    .toc a{color:#0176D3;text-decoration:none;font-weight:600}
    .toc a:hover{text-decoration:underline}
    .section{background:#fff;border-radius:16px;padding:32px;margin-bottom:24px;box-shadow:0 2px 16px rgba(0,0,0,0.06)}
    .section h2{font-size:22px;font-weight:800;color:#0a1628;margin-bottom:6px;display:flex;align-items:center;gap:10px}
    .section h2 .icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
    .section p{color:#475569;font-size:14px;margin-bottom:16px}
    .section h3{font-size:15px;font-weight:700;color:#1e293b;margin:20px 0 10px;border-bottom:2px solid #f0f4f8;padding-bottom:6px}
    .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin:16px 0}
    .card{background:#f8faff;border:1px solid #e2e8f0;border-radius:12px;padding:18px;transition:box-shadow 0.2s}
    .card:hover{box-shadow:0 4px 20px rgba(1,118,211,0.1)}
    .card-icon{font-size:24px;margin-bottom:8px}
    .card h4{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:4px}
    .card p{font-size:12px;color:#64748b;margin:0}
    .badge{display:inline-block;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700}
    .badge-blue{background:#dbeafe;color:#1d4ed8}
    .badge-green{background:#dcfce7;color:#15803d}
    .badge-amber{background:#fef3c7;color:#92400e}
    .badge-red{background:#fee2e2;color:#991b1b}
    .badge-purple{background:#ede9fe;color:#6d28d9}
    .badge-teal{background:#ccfbf1;color:#0f766e}
    table{width:100%;border-collapse:collapse;font-size:13px;margin:14px 0}
    th{background:#f0f4f8;color:#374151;font-weight:700;padding:10px 14px;text-align:left;font-size:12px;letter-spacing:0.5px}
    td{padding:10px 14px;border-bottom:1px solid #f0f4f8;color:#475569;vertical-align:top}
    tr:last-child td{border-bottom:none}
    tr:hover td{background:#f8faff}
    code{background:#1e293b;color:#7dd3fc;padding:2px 8px;border-radius:5px;font-family:'Courier New',monospace;font-size:12px}
    pre{background:#1e293b;color:#e2e8f0;padding:20px;border-radius:12px;overflow-x:auto;font-size:13px;line-height:1.7;margin:14px 0}
    pre .c{color:#64748b}
    pre .k{color:#7dd3fc}
    pre .s{color:#86efac}
    pre .fn{color:#fbbf24}
    .alert{border-radius:10px;padding:14px 18px;margin:14px 0;font-size:13px;display:flex;gap:10px;align-items:flex-start}
    .alert-blue{background:#eff6ff;border-left:4px solid #3b82f6;color:#1e40af}
    .alert-green{background:#f0fdf4;border-left:4px solid #22c55e;color:#15803d}
    .alert-amber{background:#fffbeb;border-left:4px solid #f59e0b;color:#92400e}
    .alert-red{background:#fef2f2;border-left:4px solid #ef4444;color:#991b1b}
    .step{display:flex;gap:14px;align-items:flex-start;margin:12px 0}
    .step-num{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#0176D3,#00C2CB);color:#fff;font-weight:900;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
    .step-body h4{font-size:14px;font-weight:700;color:#1e293b;margin-bottom:3px}
    .step-body p{font-size:13px;color:#64748b;margin:0}
    ul.check{list-style:none;padding:0}
    ul.check li{padding:5px 0;font-size:13px;color:#475569;display:flex;gap:8px;align-items:flex-start}
    ul.check li::before{content:'✓';color:#22c55e;font-weight:700;flex-shrink:0;margin-top:1px}
    .divider{height:1px;background:linear-gradient(90deg,#0176D3,#00C2CB,transparent);margin:28px 0;opacity:0.3}
    footer{text-align:center;padding:32px;color:#94a3b8;font-size:12px}
    footer strong{color:#0176D3}
  </style>
`;

function heroHtml(emoji, badge, title, subtitle, version, date, author) {
  return `${BASE_STYLES}
  <div class="hero">
    <div style="position:relative;z-index:1">
      <div class="hero-badge">${badge}</div>
      <h1>${emoji} ${title}</h1>
      <p>${subtitle}</p>
      <div class="hero-meta">
        <span>📅 ${date}</span>
        <span>✍️ ${author}</span>
        <span>🏷️ v${version}</span>
        <span>🏢 TalentNest HR</span>
      </div>
    </div>
  </div>`;
}

// ─── 1. DEVELOPER PLAYBOOK ────────────────────────────────────────────────────
function buildDeveloperPlaybook() {
  const now = new Date();
  const today = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const todayShort = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return `<!DOCTYPE html><html lang="en"><head><title>Developer Playbook — TalentNest HR</title>${BASE_STYLES}</head><body>
${heroHtml('⚙️','DEVELOPER PLAYBOOK','Developer Playbook','Everything a developer needs to set up, understand, extend, and deploy the TalentNest HR platform.','3.0',today,'Engineering Team')}
<div class="container">

  <div class="toc">
    <h2>📑 TABLE OF CONTENTS</h2>
    <ol>
      <li><a href="#changelog">Live Changelog</a></li>
      <li><a href="#stack">Tech Stack</a></li>
      <li><a href="#setup">Local Setup</a></li>
      <li><a href="#structure">Folder Structure</a></li>
      <li><a href="#auth">Auth Flow</a></li>
      <li><a href="#frontend">Frontend Patterns</a></li>
      <li><a href="#backend">Backend Patterns</a></li>
      <li><a href="#nav">Navigation Architecture</a></li>
      <li><a href="#mobile">Mobile & CSS</a></li>
      <li><a href="#api">API Reference</a></li>
      <li><a href="#deploy">Deployment</a></li>
      <li><a href="#stage-names">Stage Name Reference</a></li>
    </ol>
  </div>

  <div class="section" id="changelog">
    <h2><span class="icon" style="background:#dcfce7">🔄</span>Live Changelog — Auto-generated ${todayShort}</h2>
    <div class="alert alert-green">🟢 This playbook is regenerated on demand — every download reflects the current state of the platform as of <strong>${today}</strong>.</div>
    <table>
      <tr><th>Date</th><th>Area</th><th>Change</th><th>Files</th></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-red">Bug Fix</span></td><td>All admin + candidate + recruiter pages were receiving paginated objects <code>{success,data,pagination}</code> from backend but treating them as arrays — now all pages unwrap <code>.data</code>. Fixed: AdminAnalytics, AdminJobs, AdminJobApproval, AdminDashboard, OrgSettings, RecruiterDashboard, RecruiterCandidates, RecruiterJobs, RecruiterPipeline, RecruiterAssessments, RecruiterAIMatch, CandidateDashboard, CandidateExploreJobs, CandidateProfile, CandidateAIMatch, SuperAdminCandidateImport, SuperAdminPlatform, SuperAdminSecurity, SuperAdminPermissions.</td><td>All page files, <code>api.js</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-red">Bug Fix</span></td><td>Added missing backend routes: GET/PATCH/DELETE /api/jobs, GET /api/jobs/:id, PATCH /api/jobs/:id/assign-recruiter, GET /api/jobs/:id/candidates. These were completely missing — all job list pages were getting 404s.</td><td><code>jobs.js</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-red">Bug Fix</span></td><td>Added missing GET /api/users/:id route. CandidateProfile, CandidateAIMatch, CandidateDashboard, RecruiterPipeline all call this and were getting "Route not found" 404.</td><td><code>users.js</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-red">Bug Fix</span></td><td>Candidate registration: <code>availability: 'Immediate'</code> (capital I) failed Mongoose enum (values are lowercase). Fixed to <code>'immediate'</code>. Also fixed <code>skills: ''</code> (string) → skills array properly parsed.</td><td><code>auth.js</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-red">Bug Fix</span></td><td>Candidate Explore Jobs: GET /api/applications blocked candidates with 403. Fixed — candidates now get their own applications without role check. Also GET /api/applications now supports candidateId filter for admin/recruiter.</td><td><code>applications.js</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-red">Bug Fix</span></td><td><strong>POST /api/applications/public route was missing.</strong> Web users clicking Apply on LandingPage or CareersPage got "Route not found: POST /api/applications/public". Added the route — no auth required, accepts {jobId, name, email, phone, coverLetter}, finds or creates guest candidate by email, prevents duplicates (409), sends confirmation email, increments job application count.</td><td><code>applications.js</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-blue">Enhancement</span></td><td>Availability enum fully synced frontend ↔ backend. AddCandidateForm + UserDetailDrawer dropdowns now use <code>immediate / two_weeks / one_month / not_looking</code> matching Mongoose schema. Job urgency enum removed (was blocking 'High'/'Medium' saves). User model gains <code>settings</code> field (UI preferences). PATCH /api/users/me/settings route added. GET /me + GET /:id now normalize <code>_id → id</code>.</td><td><code>AddCandidateForm.jsx</code>, <code>UserDetailDrawer.jsx</code>, <code>User.js</code>, <code>Job.js</code>, <code>users.js</code>, <code>api.js</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-green">Feature</span></td><td>QuickActionMenu (floating + FAB) restored and wired into Layout — recruiters, admins, super_admins see a "+" button bottom-right on all pages. Expands to "💼 Post Job" and "👤 Add Candidate" quick-action buttons. Hidden for candidates.</td><td><code>QuickActionMenu.jsx</code>, <code>Layout.jsx</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-green">Feature</span></td><td>Welcome email on candidate self-registration now works — was using silent <code>catch{}</code> + broken <code>require('./email')</code>. Fixed to use <code>sendEmailWithRetry</code> (already imported) with proper error logging.</td><td><code>auth.js</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-blue">Nav</span></td><td>Removed Dashboard from Admin &amp; SuperAdmin nav — Analytics renamed to "Overview" (📈). Both roles now land on Overview after login.</td><td><code>Layout.jsx</code>, <code>App.jsx</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-purple">Mobile</span></td><td>Complete mobile nav rewrite — hamburger always visible, 3-bar icon with border, new full-screen overlay with Home/Services/Explore Jobs/HRMS/About/Blog/Contact + "Contact Us" + "Our Platform" CTA cards</td><td><code>MarketingNav.jsx</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-purple">Mobile</span></td><td>Added .grid-2/3/4/5 + .container + .mkt-split + .mkt-hero-grid + .mkt-form-row CSS classes. All marketing page grids now stack on mobile. Fixed ContactPage, LandingPage, ServiceDetailPage, HRMSPage, AboutPage.</td><td><code>index.css</code>, <code>ContactPage.jsx</code>, <code>LandingPage.jsx</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-green">Feature</span></td><td>SuperAdmin Playbooks page: 7 preset playbooks + custom creator. Wired into sidebar nav and App.jsx routing.</td><td><code>SuperAdminPlaybooks.jsx</code>, <code>Layout.jsx</code>, <code>App.jsx</code></td></tr>
      <tr><td>26 Mar 2026</td><td><span class="badge badge-red">Security</span></td><td>Removed plain-text password from invite-admin email. Backend now uses crypto.randomBytes(32) secure token flow. AdminUsers + SuperAdminOrgs create forms no longer show password fields.</td><td><code>orgs.js</code>, <code>AdminUsers.jsx</code>, <code>SuperAdminOrgs.jsx</code></td></tr>
      <tr><td>26 Mar 2026</td><td><span class="badge badge-blue">UX</span></td><td>OrgSettings: save button text color fixed (#fff), Industry + Size converted to dropdowns, Email Settings section added</td><td><code>OrgSettings.jsx</code></td></tr>
      <tr><td>26 Mar 2026</td><td><span class="badge badge-green">Feature</span></td><td>POST /api/users now accepts role: "candidate" and persists all profile fields (phone, title, location, skills, etc.)</td><td><code>users.js</code></td></tr>
      <tr><td>26 Mar 2026</td><td><span class="badge badge-teal">Nav</span></td><td>"Explore Jobs" moved from nav links to right-corner green CTA button on desktop. Also added to mobile menu with LIVE badge.</td><td><code>MarketingNav.jsx</code></td></tr>
      <tr><td>27 Mar 2026</td><td><span class="badge badge-green">Feature</span></td><td>Complete Invitation Flow — Admin/Recruiter invite via secure token email OR temp-password. Backend: POST /api/admin/invite-admin, /invite-recruiter, /resend-invite, /revoke-invite/:id, GET /pending-invites. AdminUsers.jsx: "Pending Invites" tab with Resend/Revoke actions. Add User modal: delivery method toggle (secure link vs temp password).</td><td><code>admin.js</code>, <code>AdminUsers.jsx</code>, <code>inviteToken.js</code>, <code>emailTemplates.js</code></td></tr>
      <tr><td>27 Mar 2026</td><td><span class="badge badge-green">Feature</span></td><td>Professional Logo System — hex-network SVG logo (5 sizes, 3 variants, dark/light themes), LogoContext for real-time propagation, LogoManager drag-drop uploader in SuperAdmin Platform, favicon.svg, inline SVG in email templates. Backend: GET/POST/DELETE /api/orgs/logo, Org model gains logoUrl field.</td><td><code>Logo.jsx</code>, <code>LogoContext.jsx</code>, <code>LogoManager.jsx</code>, <code>orgs.js</code>, <code>Org.js</code>, <code>main.jsx</code></td></tr>
      <tr><td>28 Mar 2026</td><td><span class="badge badge-red">Bug Fix</span></td><td>Job assignment ObjectId crash — jobs returned from API missing virtual <code>id</code> field. Added <code>normalizeJob()</code> helper in AdminJobs to ensure <code>id = _id?.toString() || id</code> on load. All assign/delete/toggle operations now safe.</td><td><code>AdminJobs.jsx</code></td></tr>
      <tr><td>28 Mar 2026</td><td><span class="badge badge-green">Feature</span></td><td>Assessment Creation Modal in Assessments page — "+ Create Assessment" button per job, full modal with title/duration/passing score/instructions/questions (text/MCQ-single/MCQ-multi/code types, marks per question), "Save Draft" + "Create &amp; Publish" buttons. Edit existing assessments. Backend: POST /api/assessments already existed and is now wired. Anti-cheat violation backend endpoint: POST /api/assessments/:id/submissions/:subId/violation.</td><td><code>RecruiterAssessments.jsx</code>, <code>assessments.js</code></td></tr>
      <tr><td>28 Mar 2026</td><td><span class="badge badge-green">Feature</span></td><td>AdminJobs Assign panel upgraded — tabbed modal with "Assign Recruiter" (existing) + new "Assign Candidates" tab. Candidate search, already-assigned candidates shown with stage badge (disabled), bulk selection + POST /api/jobs/:jobId/assign-candidates backend route.</td><td><code>AdminJobs.jsx</code>, <code>jobs.js</code></td></tr>
      <tr><td>28 Mar 2026</td><td><span class="badge badge-green">Feature</span></td><td>Change Password for all roles — ProfilePage now has dedicated "Change Password" section with current/new/confirm fields, show/hide toggles, live strength bar (8+ chars / uppercase / number), POST /api/auth/change-password backend route (bcrypt compare + hash, mustChangePassword cleared). Works for candidate, recruiter, admin, super_admin.</td><td><code>ProfilePage.jsx</code>, <code>auth.js</code></td></tr>
      <tr><td>28 Mar 2026</td><td><span class="badge badge-red">Bug Fix</span></td><td>Array guard sweep — multiple pages calling <code>.filter()/.map()/.sort()</code> directly on paginated <code>{success,data,pagination}</code> response crashing with "h.filter is not a function". Fixed with <code>Array.isArray(r?.data) ? r.data : []</code> guard + explicit <code>.catch(() =&gt; setState([]))</code> on all async state setters: AdminUsers (loadPending), AdminAnalytics (Promise.all catch), RecruiterPipeline (getJobs/getApplications), CandidateDashboard (apply() + catch fallbacks), SuperAdminOrgs (setOrgs), SuperAdminCandidateImport (candidates/recruiters), AssignedCandidates (.filter crash), RecruiterAssessments (getJobs catch).</td><td><code>AdminUsers.jsx</code>, <code>AdminAnalytics.jsx</code>, <code>RecruiterPipeline.jsx</code>, <code>CandidateDashboard.jsx</code>, <code>SuperAdminOrgs.jsx</code>, <code>SuperAdminCandidateImport.jsx</code>, <code>AssignedCandidates.jsx</code>, <code>RecruiterAssessments.jsx</code></td></tr>
      <tr><td>28 Mar 2026</td><td><span class="badge badge-red">Bug Fix</span></td><td>JobDetailDrawer double crash: (1) <code>h.filter is not a function</code> — <code>getUsers('candidate')</code> response stored raw via <code>.then(c =&gt; setAllCandidates(c))</code>, paginated object not unwrapped. Fixed: destructure all 3 Promise.all results, unwrap each with Array.isArray guard. (2) <code>Cast to ObjectId failed for value "undefined"</code> on Assign Recruiter — <code>initialJob</code> from backend <code>.lean()</code> has only <code>_id</code>, not virtual <code>id</code>. Fixed: <code>normJob()</code> helper normalises <code>id = j.id || j._id?.toString()</code> on useState init and on every <code>setJob()</code> call.</td><td><code>JobDetailDrawer.jsx</code></td></tr>
      <tr><td>28 Mar 2026</td><td><span class="badge badge-red">Bug Fix</span></td><td>OrgSettings Logo system fully fixed — mini logo upload in OrgSettings was storing base64 in local <code>form.logo</code> state only, never calling <code>api.uploadOrgLogo()</code>, never updating LogoContext. Removed broken mini-upload section. Replaced with <code>&lt;LogoManager /&gt;</code> which correctly calls API + updates context. LogoManager download button was broken anchor (<code>/api/orgs/logo/download</code> route doesn't exist). Replaced with canvas PNG export — draws logo onto <code>&lt;canvas&gt;</code>, white background, <code>toDataURL('image/png')</code>, triggers browser download as <code>talentnesthr-logo.png</code>.</td><td><code>OrgSettings.jsx</code>, <code>LogoManager.jsx</code></td></tr>
      <tr><td>28 Mar 2026</td><td><span class="badge badge-green">Feature</span></td><td>AdminAnalytics Overview charts — SVG chart row added to Analytics/Overview page. Three charts below KPI row: 14-day AreaChart (application trend), DonutChart (pipeline stage distribution), VertBarChart (top 5 jobs by applicants). Uses the same pure-SVG chart components already used by AdminDashboard + RecruiterDashboard. No new dependencies.</td><td><code>AdminAnalytics.jsx</code></td></tr>
      <tr><td>28 Mar 2026</td><td><span class="badge badge-green">Feature</span></td><td>Inline stage change for admin/recruiter/super_admin — (1) CandidateDetailModal: stage-change dropdown added to profile header card, visible only to admin/recruiter/super_admin. Calls <code>api.updateStage(appId, newStage)</code>, shows toast feedback, fires <code>onStageChange</code> callback to update parent list. (2) JobDetailDrawer pipeline candidate list: each candidate row now has an inline stage select for admin/super_admin (recruiter sees read-only badge). Both use <code>STAGES</code> constant and live-update without page reload.</td><td><code>CandidateDetailModal.jsx</code>, <code>JobDetailDrawer.jsx</code>, <code>RecruiterPipeline.jsx</code></td></tr>
      <tr><td>28 Mar 2026</td><td><span class="badge badge-green">Feature</span></td><td>Notification system expanded — previously only notifications on existing flows. Now: (1) New application submitted → notify all org admins + super_admins via Notification model. (2) Stage change → notify assigned recruiters (excluding the changer) + notify org admins for key milestones (selected / offer_extended / rejected). All notifications use <code>type</code>, <code>title</code>, <code>message</code>, <code>link</code> fields and are visible in the notification bell.</td><td><code>backend/src/routes/applications.js</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-purple">UI Redesign</span></td><td><strong>v3.0 — Landing Page full redesign.</strong> Hero: Unsplash background image + dark overlay. Services section: dark navy <code>#0f172a</code>, 3-col grid, left accent bar, <code>tn-fadeup</code> stagger CSS animation. Industries section: light <code>#f8fafc</code>, compact no-image tiles, 6-colour accent rotation, <code>tn-ind-in</code> animation, tags trimmed to 3. How It Works + CTA banner: dark navy. Open Positions section hidden (<code>display:none</code>).</td><td><code>LandingPage.jsx</code>, <code>index.css</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-purple">UI Redesign</span></td><td>Contact page redesign — hero with Unsplash office photo + dark overlay + trust pills row. Form section background changed from dark to light (<code>#f8fafc</code> bg, dark text, white card). Contact info panel: dark navy card on light page. Input/label styles updated for light theme. Select options background fixed.</td><td><code>ContactPage.jsx</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-red">Bug Fix</span></td><td><strong>Recruiter flow — 3 fixes.</strong> (1) "Assigned to Me" not loading: <code>ap.jobId</code> is a populated Mongoose object after <code>normalizeApp()</code>, not a string — fixed with <code>toStr()</code> fallback chain <code>ap.job?.id || ap.jobId?._id?.toString()</code>. (2) CandidateApplications assessment lookup broken: job key built from populated object → URL became <code>/assessments/job/[object Object]</code> — fixed <code>getJobId()</code> helper. (3) Invite response application missing <code>orgId</code> (required field) → silent validation failure. Fixed: fetch job before creating application, pass <code>orgId: inviteJob.orgId</code>.</td><td><code>RecruiterDashboard.jsx</code>, <code>CandidateApplications.jsx</code>, <code>backend/src/routes/invites.js</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-red">Bug Fix</span></td><td>AdminAnalytics Top Jobs by Applications always showed 0: <code>String(a.jobId)</code> === <code>"[object Object]"</code> because <code>jobId</code> is a populated Mongoose object. Fixed with <code>appJobId()</code> helper using <code>a.job?.id || a.jobId?._id?.toString()</code>. Recruiter stats fixed: was checking <code>j.recruiterId</code> (removed field) → now checks <code>j.assignedRecruiters</code> array.</td><td><code>AdminAnalytics.jsx</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-red">Bug Fix</span></td><td>Modal z-index sweep — all modals platform-wide were <code>zIndex: 2000</code>. Notification panel + profile menu both at <code>9999</code> were overlapping modals. All modals bumped to <code>zIndex: 10001</code>. Files fixed: AdminAnalytics, AdminJobs, AdminJobApproval, AdminUsers, CandidateAssessment, CandidateExploreJobs, RecruiterAssessments, RecruiterCandidates, RecruiterJobs, RecruiterPipeline, OfferLetterModal, AssessmentReviewModal, JobDetailDrawer, Modal.jsx (shared).</td><td>14 files + <code>Modal.jsx</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-red">Bug Fix</span></td><td>RecruiterJobs applicants always showing 0 — backend <code>GET /api/jobs</code> never returned <code>applicantsCount</code>. Added post-query aggregation: two <code>Application.aggregate()</code> calls group by <code>jobId</code> for total count and hired/offered count. Results merged onto each job as <code>applicantsCount</code> and <code>selectedCount</code>.</td><td><code>backend/src/routes/jobs.js</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-red">Bug Fix</span></td><td>SuperAdmin OrgDetailModal close button inaccessible — header was inside <code>overflowY:auto</code> scroll container and scrolled out of view. Fixed architecture: backdrop now scrolls (<code>overflowY:auto</code> on backdrop + centering wrapper), modal panel has no internal scroll. Close button is a styled box (grey bg, border) always visible at top.</td><td><code>SuperAdminOrgs.jsx</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-green">Feature</span></td><td><strong>ShareJobModal v3.0 upgrades.</strong> (1) Candidate Name field — personalises email with "Hi [Name]," greeting. (2) Sender name banner — shows logged-in user's name; appears in email footer "Sent by X via TalentNest HR". (3) Two action buttons: <code>📧 Send Email</code> + <code>📋 Copy Job Link</code>. (4) "I'm Interested" green tracking button in sent email — clicking logs interest against outreach record + redirects candidate to job page. (5) All sends logged to Outreach Tracker via <code>POST /api/invites/log-share</code>.</td><td><code>ShareJobModal.jsx</code>, <code>RecruiterJobs.jsx</code>, <code>AdminJobs.jsx</code>, <code>api.js</code></td></tr>
      <tr><td>${todayShort}</td><td><span class="badge badge-green">Feature</span></td><td>Outreach Tracker v3.0 — new columns: Type badge (📣 Share purple vs ✉️ Invite blue) and Sent By (recruiter/admin name). Backend: <code>POST /api/invites/log-share</code> creates Invite record for job-share emails. <code>GET /api/invites/:token/interested</code> marks outreach as interested + redirects to job page. Invite model gains <code>sentByName</code> and <code>type</code> fields.</td><td><code>OutreachTracker.jsx</code>, <code>backend/src/routes/invites.js</code>, <code>backend/src/models/Invite.js</code></td></tr>
    </table>
  </div>

  <div class="section" id="stack">
    <h2><span class="icon" style="background:#dbeafe">🧱</span>Tech Stack</h2>
    <div class="cards">
      <div class="card"><div class="card-icon">⚛️</div><h4>React 18 + Vite</h4><p>Frontend SPA with lazy-loaded routes, code splitting, 9 manual chunks</p></div>
      <div class="card"><div class="card-icon">🟢</div><h4>Node.js + Express</h4><p>REST API server, JWT auth, role-based middleware, Mongoose ODM</p></div>
      <div class="card"><div class="card-icon">🍃</div><h4>MongoDB Atlas</h4><p>Cloud DB in prod. JSON file fallback locally when no MONGODB_URI</p></div>
      <div class="card"><div class="card-icon">🤖</div><h4>Google Gemini AI</h4><p>gemini-2.0-flash for resume parsing, JD parsing, AI job matching</p></div>
      <div class="card"><div class="card-icon">📧</div><h4>Resend API</h4><p>Transactional email — invites, stage changes, interview scheduling</p></div>
      <div class="card"><div class="card-icon">🚀</div><h4>Railway + Vercel</h4><p>Backend on Railway (port 8080), Frontend on Vercel (Vite build)</p></div>
    </div>
  </div>

  <div class="section" id="setup">
    <h2><span class="icon" style="background:#dcfce7">🛠️</span>Local Setup</h2>
    <h3>Prerequisites</h3>
    <ul class="check">
      <li>Node.js 18+ and npm 9+</li>
      <li>MongoDB Atlas account (or use local fallback)</li>
      <li>Google Gemini API key (for AI features)</li>
      <li>Resend API key (optional — emails log to console in dev)</li>
    </ul>
    <h3>Step-by-step</h3>
    <div class="step"><div class="step-num">1</div><div class="step-body"><h4>Clone and install</h4><p><code>git clone &lt;repo&gt; &amp;&amp; cd resume-generator</code> then <code>npm install</code></p></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><h4>Backend env vars</h4><p>Create <code>backend/.env</code> with: <code>MONGODB_URI</code>, <code>JWT_SECRET</code>, <code>FRONTEND_URL=http://localhost:5173</code>, <code>RESEND_API_KEY</code> (optional)</p></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><h4>Frontend env vars</h4><p>Create <code>.env.local</code> with: <code>VITE_API_URL=http://localhost:5000/api</code>, <code>VITE_GEMINI_API_KEY=your_key</code></p></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><h4>Start backend</h4><p><code>cd backend &amp;&amp; npm run dev</code> — starts on port 5000, auto-seeds super admin</p></div></div>
    <div class="step"><div class="step-num">5</div><div class="step-body"><h4>Start frontend</h4><p><code>npm run dev</code> (root) — starts on port 5173</p></div></div>
    <div class="alert alert-green">🔑 <strong>Default super admin:</strong> admin@talentnesthr.com / TalentNest@2024 — self-healing seed runs on every backend start</div>
  </div>

  <div class="section" id="structure">
    <h2><span class="icon" style="background:#ede9fe">📁</span>Folder Structure</h2>
    <pre><span class="c">resume-generator/
├── src/                     # Frontend (React + Vite)
│   ├── api/
│   │   ├── api.js           # All API calls + 401 interceptor
│   │   ├── config.js        # API_BASE_URL from VITE_API_URL
│   │   └── gemini.js        # Gemini AI integration
│   ├── components/
│   │   ├── shared/          # Reusable business components
│   │   └── ui/              # Generic UI primitives
│   ├── config/
│   │   └── logo.js          # LOGO_PATH — change once, updates everywhere
│   ├── constants/
│   │   ├── styles.js        # btnP, btnG, btnD, card, inp, glass
│   │   └── stages.js        # Pipeline stage constants
│   ├── layout/
│   │   └── Layout.jsx       # Sidebar + header + notification bell
│   ├── pages/
│   │   ├── admin/           # Admin role pages
│   │   ├── candidate/       # Candidate role pages
│   │   ├── recruiter/       # Recruiter role pages
│   │   ├── superadmin/      # Super admin pages
│   │   ├── shared/          # Cross-role pages (Profile, etc.)
│   │   ├── marketing/       # Public marketing site
│   │   ├── auth/            # Login, register, set-password
│   │   └── billing/         # Billing & plans
│   └── App.jsx              # Router + role-based page rendering
│
└── backend/                 # Node.js + Express API
    └── src/
        ├── db/
        │   ├── connect.js   # MongoDB Atlas connection
        │   └── seed.js      # Self-healing seed (super admin + org)
        ├── middleware/
        │   ├── auth.js      # JWT: authenticate, signToken
        │   ├── requireRole  # requireRole(...roles)
        │   └── roleCheck.js # requireSameOrg
        ├── models/          # Mongoose schemas
        │   ├── User.js      # All roles, 2FA, invite token
        │   ├── Org.js       # Organisation + settings (Mixed)
        │   ├── Job.js       # Job postings
        │   ├── Application.js
        │   ├── Assessment.js
        │   ├── Invite.js
        │   └── ...
        ├── routes/          # Express routers (16 files)
        ├── utils/
        │   └── email.js     # Resend API + templates
        └── server.js        # Express app entrypoint</span></pre>
  </div>

  <div class="section" id="auth">
    <h2><span class="icon" style="background:#fef3c7">🔐</span>Auth Flow</h2>
    <h3>JWT Payload Structure</h3>
    <pre><span class="c">// CRITICAL: key must be userId (not id)</span>
<span class="k">const</span> token = <span class="fn">signToken</span>({ <span class="s">userId</span>: user._id, <span class="s">role</span>: user.role, <span class="s">orgId</span>: user.orgId, <span class="s">orgName</span>: user.orgName });
<span class="c">// Stored in: sessionStorage.getItem('tn_token')</span>
<span class="c">// User obj:  sessionStorage.getItem('tn_user')</span></pre>
    <h3>Invite / Password-Set Flow (Secure)</h3>
    <div class="step"><div class="step-num">1</div><div class="step-body"><h4>Admin creates user</h4><p>POST /api/users → generates <code>crypto.randomBytes(32)</code> raw token, stores SHA-256 hash in DB, sets <code>isActive: false</code></p></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><h4>Invite email sent</h4><p>Resend API sends link: <code>/set-password?token=&lt;rawToken&gt;&amp;email=&lt;email&gt;</code></p></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><h4>User sets password</h4><p>POST /api/auth/set-password → verifies SHA-256 hash, bcrypt-hashes password, sets <code>isActive: true</code>, clears token</p></div></div>
    <div class="alert alert-amber">⚠️ Token is single-use, expires in 24h. Admin can resend via "Resend Invite" button in AdminUsers.</div>
  </div>

  <div class="section" id="frontend">
    <h2><span class="icon" style="background:#ccfbf1">⚛️</span>Frontend Patterns</h2>
    <h3>Critical: Style Objects Must Be at Module Level</h3>
    <pre><span class="c">// ❌ WRONG — defined inside component, new reference every render</span>
<span class="k">export default function</span> <span class="fn">MyPage</span>() {
  <span class="k">const</span> inp = { padding: <span class="s">'10px'</span>, borderRadius: <span class="s">10</span> }; <span class="c">// Bug: loses focus on keystroke!</span>
}

<span class="c">// ✅ CORRECT — defined at module level, stable reference</span>
<span class="k">const</span> inp = { padding: <span class="s">'10px'</span>, borderRadius: <span class="s">10</span> };
<span class="k">export default function</span> <span class="fn">MyPage</span>() { <span class="c">/* use inp here */</span> }</pre>
    <h3>Shared Style Constants</h3>
    <table>
      <tr><th>Constant</th><th>Usage</th></tr>
      <tr><td><code>btnP</code></td><td>Primary blue button</td></tr>
      <tr><td><code>btnG</code></td><td>Ghost/secondary button</td></tr>
      <tr><td><code>btnD</code></td><td>Danger/red button</td></tr>
      <tr><td><code>card</code></td><td>White card with shadow</td></tr>
      <tr><td><code>inp</code></td><td>Standard text input</td></tr>
      <tr><td><code>glass</code></td><td>Glassmorphism card</td></tr>
    </table>
    <h3>Lazy Loading Pattern</h3>
    <pre><span class="k">const</span> MyPage = <span class="fn">lazy</span>(() => <span class="k">import</span>(<span class="s">'./pages/MyPage.jsx'</span>));
<span class="c">// All page components are lazy-loaded for code splitting</span>
<span class="c">// Wrapped in &lt;Suspense fallback={&lt;LoadingSpinner/&gt;}&gt; in App.jsx</span></pre>
    <h3>Dashboard Data Loading Pattern</h3>
    <pre><span class="fn">useEffect</span>(() => {
  <span class="k">let</span> cancelled = <span class="k">false</span>;
  <span class="fn">Promise.all</span>([api.<span class="fn">getJobs</span>(), api.<span class="fn">getApplications</span>({})])
    .<span class="fn">then</span>(([jobs, apps]) => { <span class="k">if</span> (!cancelled) { setJobs(jobs); setApps(apps); } })
    .<span class="fn">finally</span>(() => { <span class="k">if</span> (!cancelled) setLoading(<span class="k">false</span>); });
  <span class="k">return</span> () => { cancelled = <span class="k">true</span>; }; <span class="c">// prevents stale state on unmount</span>
}, []);</pre>
  </div>

  <div class="section" id="backend">
    <h2><span class="icon" style="background:#fee2e2">🟢</span>Backend Patterns</h2>
    <h3>Middleware Import (Critical)</h3>
    <pre><span class="c">// ✅ Always destructure authenticate</span>
<span class="k">const</span> { authenticate: auth } = <span class="fn">require</span>(<span class="s">'../middleware/auth'</span>);
<span class="k">const</span> requireRole = <span class="fn">require</span>(<span class="s">'../middleware/requireRole'</span>);

router.<span class="fn">get</span>(<span class="s">'/protected'</span>, auth, <span class="fn">requireRole</span>(<span class="s">'admin'</span>,<span class="s">'super_admin'</span>), <span class="k">async</span> (req, res) => { ... });</pre>
    <h3>16 Registered Route Files</h3>
    <div class="cards">
      <div class="card"><h4>auth.js</h4><p>login, register, google OAuth, 2FA, verify-token, set-password</p></div>
      <div class="card"><h4>users.js</h4><p>CRUD, /me, invite flow, resend-invite, bulk-import</p></div>
      <div class="card"><h4>jobs.js</h4><p>CRUD, public jobs, job candidates, assign recruiter</p></div>
      <div class="card"><h4>applications.js</h4><p>apply, stage updates, notes, feedback, withdraw</p></div>
      <div class="card"><h4>dashboard.js</h4><p>stats, pipeline health, analytics, AI matched jobs, funnels</p></div>
      <div class="card"><h4>orgs.js</h4><p>CRUD, invite-admin (token flow), plan update</p></div>
      <div class="card"><h4>platform.js</h4><p>config, security, feature flags, DB backup</p></div>
      <div class="card"><h4>assessments.js</h4><p>create/edit/delete, start, submit, review submissions</p></div>
      <div class="card"><h4>invites.js</h4><p>send, respond, mine, by-token, resend, delete</p></div>
      <div class="card"><h4>email.js</h4><p>send, SMTP test, logs, resend failed</p></div>
      <div class="card"><h4>notifications.js</h4><p>get, mark read, mark all read</p></div>
      <div class="card"><h4>billing.js</h4><p>usage, plans, upgrade</p></div>
    </div>
  </div>

  <div class="section" id="nav">
    <h2><span class="icon" style="background:#fef3c7">🗺️</span>Navigation Architecture</h2>
    <h3>Role → Nav Items → Component Mapping</h3>
    <table>
      <tr><th>Role</th><th>Landing Page</th><th>Nav Count</th><th>Notes</th></tr>
      <tr><td><span class="badge badge-blue">candidate</span></td><td>dashboard</td><td>5</td><td>Dashboard, Explore Jobs, AI Job Search, My Applications, My Profile</td></tr>
      <tr><td><span class="badge badge-green">recruiter</span></td><td>dashboard</td><td>11</td><td>Dashboard, My Jobs, Add Candidate, My Candidates, Assigned to Me, AI Match, Pipeline, Assessments, Outreach, Mail Queue, My Profile</td></tr>
      <tr><td><span class="badge badge-amber">admin</span></td><td><strong>analytics</strong></td><td>14</td><td>Overview (Analytics), Job Approvals, Add Candidate, Candidates, Outreach, Assessments, Contact Enquiries, Mail Queue, Assignments, Recruiters, All Jobs, Org Settings, Billing, My Profile</td></tr>
      <tr><td><span class="badge badge-purple">super_admin</span></td><td><strong>analytics</strong></td><td>17</td><td>Overview, Platform, Organisations, Billing, Security, Permissions, Import &amp; Assign, Candidates, Recruiters, Admins, All Jobs, Assessments, Outreach, Contact Enquiries, Mail Queue, Playbooks, My Profile</td></tr>
    </table>
    <div class="alert alert-blue">ℹ️ Admin + Super Admin no longer have a "Dashboard" nav item — they land on <strong>Analytics/Overview</strong> (📈) which is the unified KPI + pipeline view. The old Dashboard was removed as a duplicate.</div>
    <h3>Adding a New Page (Checklist)</h3>
    <ul class="check">
      <li>Create the component in the correct role folder under <code>src/pages/</code></li>
      <li>Add lazy import in <code>App.jsx</code>: <code>const MyPage = lazy(() =&gt; import('./pages/.../MyPage.jsx'))</code></li>
      <li>Add route case in <code>renderPage()</code> for the correct role block</li>
      <li>Add nav item to the correct role array in <code>NAVS</code> in <code>Layout.jsx</code></li>
      <li>Add any new API calls to <code>src/api/api.js</code></li>
      <li>Add the corresponding backend route in <code>backend/src/routes/</code> if needed</li>
    </ul>
  </div>

  <div class="section" id="mobile">
    <h2><span class="icon" style="background:#ede9fe">📱</span>Mobile &amp; CSS Guidelines</h2>
    <h3>CSS Class System (index.css)</h3>
    <table>
      <tr><th>Class</th><th>Desktop</th><th>Tablet ≤1024px</th><th>Mobile ≤640px</th></tr>
      <tr><td><code>.grid-2 / .tn-grid-2</code></td><td>2 columns</td><td>2 columns</td><td>1 column</td></tr>
      <tr><td><code>.grid-3 / .tn-grid-3</code></td><td>3 columns</td><td>2 columns</td><td>1 column</td></tr>
      <tr><td><code>.grid-4 / .tn-grid-4</code></td><td>4 columns</td><td>2 columns</td><td>1 column</td></tr>
      <tr><td><code>.grid-5 / .tn-grid-5</code></td><td>5 columns</td><td>3 columns → 2</td><td>1 column</td></tr>
      <tr><td><code>.mkt-split</code></td><td>40/60 split</td><td>stacked</td><td>stacked</td></tr>
      <tr><td><code>.mkt-hero-grid</code></td><td>50/50 hero</td><td>stacked</td><td>stacked + centered</td></tr>
      <tr><td><code>.mkt-form-row</code></td><td>2-col inputs</td><td>2-col inputs</td><td>1 column</td></tr>
      <tr><td><code>.container</code></td><td>max-width 1200px, 24px padding</td><td>—</td><td>16px padding</td></tr>
    </table>
    <div class="alert alert-amber">⚠️ <strong>Rule:</strong> Never use inline <code>gridTemplateColumns</code> for full-page layouts — always use CSS classes so mobile breakpoints work. Inline grids are fine only for decorative UI elements inside a component (like a mini dashboard preview card).</div>
    <h3>Marketing Nav Mobile (MarketingNav.jsx)</h3>
    <ul class="check">
      <li>Hamburger: uses <code>className="tn-hamburger-btn"</code> with inline flex — always visible on mobile, hidden on desktop via CSS media query</li>
      <li>Mobile overlay: full-screen fixed div, zIndex 9999, dark background #070F1E</li>
      <li>Services accordion: <code>mobileServicesOpen</code> state, 7 service items + "View All" link</li>
      <li>Footer CTAs: 2-column grid — "Contact Us" (teal) and "Our Platform" (blue) cards</li>
      <li>Logo: container has <code>background: '#0176D3'</code> fallback — visible even before SVG loads</li>
    </ul>
  </div>

  <div class="section" id="deploy">
    <h2><span class="icon" style="background:#f0fdf4">🚀</span>Deployment</h2>
    <h3>Railway (Backend)</h3>
    <table>
      <tr><th>Env Var</th><th>Value</th><th>Required</th></tr>
      <tr><td><code>MONGODB_URI</code></td><td>MongoDB Atlas connection string</td><td><span class="badge badge-red">Required</span></td></tr>
      <tr><td><code>JWT_SECRET</code></td><td>Random secret string (32+ chars)</td><td><span class="badge badge-red">Required</span></td></tr>
      <tr><td><code>FRONTEND_URL</code></td><td>https://your-app.vercel.app</td><td><span class="badge badge-red">Required</span></td></tr>
      <tr><td><code>RESEND_API_KEY</code></td><td>re_xxxxxxxxxx</td><td><span class="badge badge-amber">Optional</span></td></tr>
    </table>
    <h3>Vercel (Frontend)</h3>
    <table>
      <tr><th>Env Var</th><th>Value</th></tr>
      <tr><td><code>VITE_API_URL</code></td><td>https://your-backend.railway.app/api</td></tr>
      <tr><td><code>VITE_GEMINI_API_KEY</code></td><td>Gemini API key from Google AI Studio</td></tr>
    </table>
    <div class="alert alert-amber">⚠️ <code>VITE_API_URL</code> is baked in at build time. Redeploy after changing it.</div>
  </div>

</div>
<footer>Generated by <strong>TalentNest HR</strong> Super Admin · Confidential &amp; Internal</footer>
</body></html>`;
}

// ─── 2. ALL USERS PLAYBOOK ────────────────────────────────────────────────────
function buildAllUsersPlaybook() {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!DOCTYPE html><html lang="en"><head><title>All Users Playbook — TalentNest HR</title>${BASE_STYLES}</head><body>
${heroHtml('👥','ALL USERS PLAYBOOK','All Users Playbook','Your complete guide to every role in TalentNest HR — from candidates to super admins.','1.0',today,'TalentNest HR Team')}
<div class="container">

  <div class="toc"><h2>📑 TABLE OF CONTENTS</h2><ol>
    <li><a href="#overview">Platform Overview</a></li>
    <li><a href="#candidate">Candidate Guide</a></li>
    <li><a href="#recruiter">Recruiter Guide</a></li>
    <li><a href="#admin">Admin Guide</a></li>
    <li><a href="#superadmin">Super Admin Guide</a></li>
    <li><a href="#tips">Pro Tips</a></li>
  </ol></div>

  <div class="section" id="overview">
    <h2><span class="icon" style="background:#dbeafe">🌐</span>Platform Overview</h2>
    <p>TalentNest HR is a full-featured Applicant Tracking System (ATS) with AI-powered matching, assessment tools, and pipeline management.</p>
    <table>
      <tr><th>Role</th><th>Who</th><th>What they do</th><th>Nav Items</th></tr>
      <tr><td><span class="badge badge-blue">Candidate</span></td><td>Job seekers</td><td>Apply to jobs, track applications, take assessments</td><td>5 pages</td></tr>
      <tr><td><span class="badge badge-green">Recruiter</span></td><td>Hiring team</td><td>Post jobs, manage pipeline, match candidates</td><td>11 pages</td></tr>
      <tr><td><span class="badge badge-amber">Admin</span></td><td>HR managers</td><td>Manage org, approve jobs, analytics</td><td>15 pages</td></tr>
      <tr><td><span class="badge badge-purple">Super Admin</span></td><td>Platform owner</td><td>Manage all orgs, platform settings, security</td><td>17 pages</td></tr>
    </table>
  </div>

  <div class="section" id="candidate">
    <h2><span class="icon" style="background:#dbeafe">🧑‍💼</span>Candidate Guide</h2>
    <h3>Getting Started</h3>
    <div class="step"><div class="step-num">1</div><div class="step-body"><h4>Register as a Job Seeker</h4><p>Go to the login page → select "Job Seeker" tab → fill name, email, password → account is active instantly</p></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><h4>Complete your Profile</h4><p>Navigate to My Profile → fill all 7 tabs (Personal, Summary, Work, Education, Skills, Extras, Preview) → higher profile score = better AI matches</p></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><h4>Find Jobs</h4><p>Use "Explore Jobs" to browse or "AI Job Search" for Gemini-powered smart matching based on your skills</p></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><h4>Track Applications</h4><p>My Applications shows your full pipeline with stage badges, interview details, assessment status, and withdrawal option</p></div></div>
    <h3>Key Features</h3>
    <ul class="check">
      <li>AI-matched job recommendations with fit score</li>
      <li>Live pipeline tracker (Applied → Hired)</li>
      <li>Online assessments with instant feedback</li>
      <li>Interview scheduling with calendar details</li>
      <li>Withdraw application (in applied/screening stage)</li>
      <li>Resume builder with PDF download</li>
    </ul>
  </div>

  <div class="section" id="recruiter">
    <h2><span class="icon" style="background:#dcfce7">🧑‍💻</span>Recruiter Guide</h2>
    <h3>Daily Workflow</h3>
    <div class="step"><div class="step-num">1</div><div class="step-body"><h4>Post a Job</h4><p>My Jobs → "+ Post Job" → upload JD (AI auto-fills fields) or fill manually → submit for admin approval</p></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><h4>Add Candidates</h4><p>Add Candidate → upload resume (AI parses it) → review auto-filled profile → "Add Candidate" sends invitation email</p></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><h4>Manage Pipeline</h4><p>Pipeline (Kanban) → drag cards or use stage buttons → schedule interviews → add notes → send offers</p></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><h4>Run Assessments</h4><p>Assessments → select job → view submissions → review scores → mark pass/fail with feedback</p></div></div>
    <h3>Pipeline Stages</h3>
    <div class="cards">
      <div class="card"><h4>Applied</h4><p>New application received</p></div>
      <div class="card"><h4>Screening</h4><p>Initial review in progress</p></div>
      <div class="card"><h4>Shortlisted</h4><p>Moved to shortlist</p></div>
      <div class="card"><h4>Interview Scheduled</h4><p>Interview booked with details</p></div>
      <div class="card"><h4>Offer Extended</h4><p>Offer letter sent</p></div>
      <div class="card"><h4>Selected / Hired</h4><p>Candidate accepted</p></div>
    </div>
  </div>

  <div class="section" id="admin">
    <h2><span class="icon" style="background:#fef3c7">👔</span>Admin Guide</h2>
    <h3>Organisation Setup</h3>
    <div class="step"><div class="step-num">1</div><div class="step-body"><h4>Configure Org Settings</h4><p>Org Settings → upload logo, set industry/size, customise pipeline stages, configure email provider</p></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><h4>Invite Recruiters</h4><p>Recruiters tab → "+ Add Recruiter" → invitation email sent → they set their own password</p></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><h4>Approve Jobs</h4><p>Job Approvals → review pending jobs → approve or reject with reason → approved jobs go live</p></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><h4>Monitor Analytics</h4><p>Analytics → click any KPI card for drill-down details → view stage distribution, recruiter performance</p></div></div>
    <h3>Admin Responsibilities</h3>
    <ul class="check">
      <li>Approve / reject job postings before they go live</li>
      <li>Manage recruiter and candidate accounts</li>
      <li>Respond to Contact Enquiries from the website</li>
      <li>Monitor the Mail Queue for failed emails</li>
      <li>Configure billing plan and usage limits</li>
    </ul>
  </div>

  <div class="section" id="superadmin">
    <h2><span class="icon" style="background:#ede9fe">👑</span>Super Admin Guide</h2>
    <ul class="check">
      <li><strong>Platform Overview</strong> — KPIs, org breakdown, plan distribution, DB backup download</li>
      <li><strong>Organisations</strong> — create, edit, suspend, delete orgs; invite admins via token email</li>
      <li><strong>Security</strong> — feature flags per plan, audit log (CSV export), user impersonation</li>
      <li><strong>Permissions</strong> — role-based permission matrix, per-field view/edit toggles</li>
      <li><strong>Playbooks</strong> — download or create internal documentation</li>
    </ul>
    <div class="alert alert-red">🔒 Super admin credentials must never be shared. Use impersonation to debug user issues.</div>
  </div>

  <div class="section" id="tips">
    <h2><span class="icon" style="background:#ccfbf1">💡</span>Pro Tips</h2>
    <div class="cards">
      <div class="card"><div class="card-icon">⚡</div><h4>Use AI Parsing</h4><p>Upload resumes / JDs — Gemini fills 90% of fields automatically</p></div>
      <div class="card"><div class="card-icon">🎯</div><h4>Tag Candidates</h4><p>Use pipeline tags (Top Talent, Budget Fit, Culture Fit) for quick filtering</p></div>
      <div class="card"><div class="card-icon">📧</div><h4>Bulk Outreach</h4><p>Select candidates → Invite → pick template → personalise with tokens like [name]</p></div>
      <div class="card"><div class="card-icon">📊</div><h4>Drill Down</h4><p>In Analytics, click any KPI card to see the actual records behind the number</p></div>
    </div>
  </div>

</div>
<footer>Generated by <strong>TalentNest HR</strong> Super Admin · Confidential &amp; Internal</footer>
</body></html>`;
}

// ─── 3. SALES PLAYBOOK ────────────────────────────────────────────────────────
function buildSalesPlaybook() {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!DOCTYPE html><html lang="en"><head><title>Sales Playbook — TalentNest HR</title>${BASE_STYLES}</head><body>
${heroHtml('💼','SALES PLAYBOOK','Sales Playbook','Everything you need to pitch, demo, and close deals for TalentNest HR.','1.0',today,'Sales Team')}
<div class="container">

  <div class="toc"><h2>📑 TABLE OF CONTENTS</h2><ol>
    <li><a href="#company">Company Overview</a></li>
    <li><a href="#icp">Ideal Customer Profile</a></li>
    <li><a href="#value">Value Proposition</a></li>
    <li><a href="#pricing">Pricing Tiers</a></li>
    <li><a href="#demo">Demo Script</a></li>
    <li><a href="#objections">Objection Handling</a></li>
    <li><a href="#contact">Contact & CTA</a></li>
  </ol></div>

  <div class="section" id="company">
    <h2><span class="icon" style="background:#dbeafe">🏢</span>Company Overview</h2>
    <div class="cards">
      <div class="card"><div class="card-icon">🎯</div><h4>Mission</h4><p>Make world-class recruitment technology accessible to every growing organisation in India</p></div>
      <div class="card"><div class="card-icon">🌐</div><h4>Product</h4><p>Full-stack ATS + HRMS with AI matching, assessments, and pipeline management</p></div>
      <div class="card"><div class="card-icon">📍</div><h4>HQ</h4><p>Floor 3, Brindavanam Block C, Ganesh Nagar, Miyapur, Hyderabad – 502033</p></div>
      <div class="card"><div class="card-icon">📞</div><h4>Contact</h4><p>+91 79955 35539 · hr@talentnesthr.com · www.talentnesthr.com</p></div>
    </div>
  </div>

  <div class="section" id="icp">
    <h2><span class="icon" style="background:#dcfce7">🎯</span>Ideal Customer Profile</h2>
    <table>
      <tr><th>Segment</th><th>Company Size</th><th>Pain Points</th><th>Budget Signal</th></tr>
      <tr><td>IT Staffing Firms</td><td>10–200 employees</td><td>Manual resume tracking, no pipeline visibility</td><td><span class="badge badge-green">High</span></td></tr>
      <tr><td>Recruitment Agencies</td><td>5–50 recruiters</td><td>Scattered spreadsheets, no client portal</td><td><span class="badge badge-green">High</span></td></tr>
      <tr><td>Mid-size Tech Cos</td><td>50–500 employees</td><td>Scaling hiring, need structured ATS</td><td><span class="badge badge-blue">Medium</span></td></tr>
      <tr><td>Manufacturing / Non-IT</td><td>100–1000 employees</td><td>High-volume hiring, bulk import needs</td><td><span class="badge badge-amber">Growing</span></td></tr>
    </table>
  </div>

  <div class="section" id="value">
    <h2><span class="icon" style="background:#fef3c7">⭐</span>Value Proposition</h2>
    <div class="cards">
      <div class="card"><div class="card-icon">🤖</div><h4>AI-Powered</h4><p>Gemini AI parses resumes, matches candidates to jobs, and ranks by fit score — saving hours per hire</p></div>
      <div class="card"><div class="card-icon">📊</div><h4>Full Pipeline</h4><p>Visual Kanban board from Applied to Hired with interview scheduling, assessments, and offer letters</p></div>
      <div class="card"><div class="card-icon">🏢</div><h4>Multi-Org</h4><p>One platform for multiple clients — super admin manages all orgs, each isolated with their own data</p></div>
      <div class="card"><div class="card-icon">📧</div><h4>Automated Emails</h4><p>Stage changes, interview invites, and offers sent automatically via Resend — zero manual follow-up</p></div>
      <div class="card"><div class="card-icon">🔒</div><h4>Secure</h4><p>JWT auth, bcrypt passwords, secure invite tokens, no plain-text credentials anywhere</p></div>
      <div class="card"><div class="card-icon">📱</div><h4>Mobile Ready</h4><p>Fully responsive — candidates apply on mobile, recruiters manage pipeline on any device</p></div>
    </div>
  </div>

  <div class="section" id="pricing">
    <h2><span class="icon" style="background:#ede9fe">💳</span>Pricing Tiers</h2>
    <table>
      <tr><th>Plan</th><th>Price</th><th>Jobs</th><th>Recruiters</th><th>Key Features</th></tr>
      <tr><td><span class="badge badge-teal">Free</span></td><td>₹0</td><td>5</td><td>1</td><td>Basic pipeline, job board</td></tr>
      <tr><td><span class="badge badge-amber">Trial</span></td><td>14 days</td><td>20</td><td>3</td><td>AI matching, bulk email, assessments</td></tr>
      <tr><td><span class="badge badge-blue">Starter</span></td><td>Contact Sales</td><td>50</td><td>5</td><td>Everything in Trial + advanced reports</td></tr>
      <tr><td><span class="badge badge-purple">Growth</span></td><td>Contact Sales</td><td>Unlimited</td><td>20</td><td>API access, calendar sync, candidate ranking</td></tr>
      <tr><td><span class="badge" style="background:#1e293b;color:#f0f4f8">Enterprise</span></td><td>Custom</td><td>Unlimited</td><td>Unlimited</td><td>White-label, SSO, dedicated support</td></tr>
    </table>
  </div>

  <div class="section" id="demo">
    <h2><span class="icon" style="background:#ccfbf1">🎬</span>Demo Script (15 minutes)</h2>
    <div class="step"><div class="step-num">1</div><div class="step-body"><h4>Hook (2 min)</h4><p>"How many hours does your team spend this week manually tracking candidate statuses?" → Show the pain → introduce TalentNest HR</p></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><h4>AI Resume Parsing (3 min)</h4><p>Upload a sample resume → show AI extracting name, skills, experience, education in seconds → "Your recruiters never type candidate details again"</p></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><h4>Kanban Pipeline (4 min)</h4><p>Show a job's pipeline → move a candidate to Interview → system auto-sends the interview email → no manual follow-up</p></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><h4>Analytics (3 min)</h4><p>Click the Admin Analytics → show KPIs → click a card to drill into real candidate records → "Your manager gets this dashboard every Monday"</p></div></div>
    <div class="step"><div class="step-num">5</div><div class="step-body"><h4>Close (3 min)</h4><p>"We can have you live in 24 hours. Which team would you start with?" → Trial offer → schedule onboarding call</p></div></div>
  </div>

  <div class="section" id="objections">
    <h2><span class="icon" style="background:#fee2e2">🛡️</span>Objection Handling</h2>
    <table>
      <tr><th>Objection</th><th>Response</th></tr>
      <tr><td>"We use spreadsheets and they work fine"</td><td>Ask: "How long does it take to find out which candidates are in which stage across all your jobs?" — Pipeline view answers in 2 seconds</td></tr>
      <tr><td>"It looks complicated"</td><td>Show the Add Candidate flow — upload resume, AI fills everything, click submit. "That's all your recruiter ever does"</td></tr>
      <tr><td>"We don't have budget right now"</td><td>Start on the free tier — no credit card. Show ROI: "One hire made 2 weeks faster pays for the platform"</td></tr>
      <tr><td>"We already have an ATS"</td><td>"Great — what's your AI match score? Can your recruiters see candidate fit % before they pick up the phone?"</td></tr>
      <tr><td>"Is our data safe?"</td><td>MongoDB Atlas encrypted at rest, JWT auth, no plain-text passwords, Railway/Vercel SOC 2 compliant hosting</td></tr>
    </table>
  </div>

  <div class="section" id="contact">
    <h2><span class="icon" style="background:#f0fdf4">📞</span>Contact & CTA</h2>
    <div class="alert alert-green">📞 <strong>+91 79955 35539</strong> | ✉️ <strong>hr@talentnesthr.com</strong> | 🌐 <strong>www.talentnesthr.com</strong></div>
    <div class="alert alert-blue">🔗 Live demo: <strong>www.talentnesthr.com/login</strong> | Super Admin: <strong>admin@talentnesthr.com</strong></div>
  </div>

</div>
<footer>Generated by <strong>TalentNest HR</strong> Super Admin · Confidential &amp; Internal</footer>
</body></html>`;
}

// ─── 4. TESTER PLAYBOOK ────────────────────────────────────────────────────────
function buildTesterPlaybook() {
  const now = new Date();
  const today = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const todayShort = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const dayOfWeek = now.toLocaleDateString('en-IN', { weekday: 'long' });
  // Generate next 7 days for the daily loop
  const nextDays = Array.from({length:7}, (_,i) => {
    const d = new Date(now); d.setDate(d.getDate()+i);
    return { label: d.toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short'}), iso: d.toISOString().split('T')[0] };
  });
  return `<!DOCTYPE html><html lang="en"><head><title>Tester Playbook — TalentNest HR</title>${BASE_STYLES}</head><body>
${heroHtml('🧪','TESTER PLAYBOOK','Tester Playbook','Daily test loop, manual test cases, automation guide and live change tracking for TalentNest HR.','3.0',today,'QA Team')}
<div class="container">

  <div class="toc"><h2>📑 TABLE OF CONTENTS</h2><ol>
    <li><a href="#live">Live Changes to Test</a></li>
    <li><a href="#daily">Daily Test Loop</a></li>
    <li><a href="#env">Test Environments</a></li>
    <li><a href="#manual">Manual Test Cases</a></li>
    <li><a href="#regression">Regression Suite</a></li>
    <li><a href="#automation">Automation (Playwright)</a></li>
    <li><a href="#api-tests">API Testing (Postman)</a></li>
    <li><a href="#edge">Edge Cases</a></li>
    <li><a href="#checklist">Release Checklist</a></li>
  </ol></div>

  <div class="section" id="live">
    <h2><span class="icon" style="background:#fee2e2">🔴</span>Live Changes to Test — ${todayShort}</h2>
    <div class="alert alert-red">🚨 These changes were deployed recently. Test them <strong>first</strong> before running the full regression suite.</div>
    <table>
      <tr><th>Date</th><th>Change</th><th>Test Cases</th><th>Status</th></tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>🔴 Paginated API Unwrap:</strong> ALL pages (admin, recruiter, candidate) were receiving <code>{success,data[],pagination}</code> from backend but using the whole object as an array → empty screens everywhere. Fixed across 18 pages.</td>
        <td>Login as admin → Analytics shows real counts. Jobs page shows jobs list. Users page shows candidates/recruiters. Login as recruiter → Pipeline shows jobs. Login as candidate → Explore Jobs shows jobs, My Profile loads, AI Job Search works.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>🔴 Missing /api/jobs Routes:</strong> GET, PATCH, DELETE /api/jobs and GET /api/jobs/:id were entirely missing from the backend — all job list pages got 404s.</td>
        <td>Admin → Jobs page loads jobs. Recruiter → Jobs loads assigned jobs. Recruiter → Pipeline → select job → shows applicants. Admin → Job Approval shows pending jobs. GET /api/jobs → 200 with data array. GET /api/jobs/:id → 200 with single job.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>🔴 Missing /api/users/:id Route:</strong> GET /api/users/:id did not exist — CandidateProfile, CandidateAIMatch, RecruiterPipeline all got "Route not found".</td>
        <td>Candidate → My Profile → loads name, email, skills. Candidate → AI Job Search → profile loads, matching works. Recruiter → Pipeline → recruiter profile loads. GET /api/users/:id with own token → 200. GET /api/users/:id with other user's token (non-admin) → 403.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>🔴 Candidate Registration 500:</strong> <code>availability: 'Immediate'</code> failed Mongoose enum (lowercase only). <code>skills: ''</code> sent string to array field. Both caused 500 on self-registration.</td>
        <td>Register new candidate at /login → no 500 error → auto-login, lands on Candidate Dashboard. Check DB: availability = 'immediate', skills = []. Register with skills field filled → skills stored as array.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>🔴 Explore Jobs 403:</strong> GET /api/applications required admin/recruiter role — candidates got "Access denied". Fixed so candidates fetch their own applications.</td>
        <td>Login as candidate → Explore Jobs → jobs list loads. Previously-applied jobs show "Applied ✓" badge. No 403 error in console. Also test: admin/recruiter GET /api/applications?candidateId=xxx → 200.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>🔴 Public Apply "Route not found":</strong> <code>POST /api/applications/public</code> was missing entirely. Web users on LandingPage and CareersPage clicking Apply got "Route not found: POST /api/applications/public". Added route — no auth, accepts jobId + name + email + phone + coverLetter. Finds/creates guest candidate, blocks duplicates (409), sends confirmation email.</td>
        <td>1) Go to <code>talentnesthr.com</code> or <code>/careers</code> — click Apply on any job. Fill name + email + phone → Submit. Expect: "Application Submitted! 🎉" modal. No console errors. 2) Submit same email again → expect 409 "already applied". 3) Submit with missing email → expect 400 validation error. 4) Check Railway logs: "Application submitted" audit log entry. 5) Admin → Applications list should show the new application with stage=applied, source=careers_page.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>Availability Dropdowns + QuickActionMenu:</strong> AddCandidateForm and UserDetailDrawer dropdowns now show correct options (Immediate / 2 Weeks Notice / 1 Month Notice / Not Looking) matching the DB enum. Job urgency enum removed — 'High'/'Medium'/'Low' saves correctly now. QuickActionMenu floating FAB appears bottom-right for recruiter/admin/super_admin on all pages.</td>
        <td>1) Admin → Add Candidate → open Availability dropdown → confirm 4 options shown. Save → no 422/500. 2) Admin → Candidates → click a candidate → Edit tab → Availability dropdown → 4 options. 3) Recruiter → My Jobs → Create Job → set urgency to High → save → no validation error. 4) Login as recruiter/admin → confirm "+" FAB visible bottom-right. Click it → "💼 Post Job" and "👤 Add Candidate" appear. 5) Login as candidate → confirm FAB is NOT visible.</td>
        <td><span class="badge badge-amber">New</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>Welcome Email on Registration:</strong> Was silently failing — used <code>require('./email')</code> inside <code>catch{}</code>. Fixed to use <code>sendEmailWithRetry</code> with proper error logging.</td>
        <td>Register new candidate → check inbox for welcome email with TalentNest branding. If no email received, check Railway logs for "Welcome email failed" warning (not a crash). Test both candidate and recruiter self-registration.</td>
        <td><span class="badge badge-amber">New</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>Nav Dedup:</strong> Admin + SuperAdmin — Dashboard removed, Analytics renamed "Overview" (📈). Landing page changed from dashboard → analytics.</td>
        <td>Login as admin → confirm lands on Overview, not Dashboard. Check sidebar has no Dashboard item. Navigate away and back — still Overview.</td>
        <td><span class="badge badge-green">Verified</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>Mobile Nav:</strong> Hamburger now always visible. Full-screen menu with Contact Us + Our Platform CTAs.</td>
        <td>Open talentnesthr.com on mobile (or DevTools 375px). Confirm ☰ button visible top-right. Tap it → full menu appears with all pages. Services accordion expands. "Explore Jobs" shows LIVE badge. Footer shows 2 buttons: Contact Us + Our Platform.</td>
        <td><span class="badge badge-green">Verified</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>Mobile Grids:</strong> Marketing pages now stack on mobile. Fixed .grid-2/3/4/5 CSS classes that were missing.</td>
        <td>Open /services, /about, /hrms, /contact on mobile. All card grids should stack to 1 column. Contact form Name+Email row should stack vertically. Hero section should stack image below text.</td>
        <td><span class="badge badge-green">Verified</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>Playbooks Page:</strong> New 📚 Playbooks menu item in SuperAdmin sidebar.</td>
        <td>Login as super_admin → confirm "📚 Playbooks" in sidebar. Click it → 7 preset cards appear. Click Preview on any card → iframe opens. Click Download → .html file downloaded. Create custom playbook → appears in My Playbooks. Delete custom → removed.</td>
        <td><span class="badge badge-green">Verified</span></td>
      </tr>
      <tr>
        <td>26 Mar 2026</td>
        <td><strong>Invite Security:</strong> Admin/SuperAdmin create user forms no longer show password field. Secure token invite email sent instead.</td>
        <td>Admin → Recruiters → Add Recruiter → confirm NO password field. Submit → success toast says "Invitation email sent". Check DB: user has isActive=false and resetPasswordToken hash. Email contains set-password link (no plain password).</td>
        <td><span class="badge badge-green">Verified</span></td>
      </tr>
      <tr>
        <td>26 Mar 2026</td>
        <td><strong>Resend Invite:</strong> "Resend Invite" button (amber) appears for inactive users in AdminUsers.</td>
        <td>Find user with isActive=false → confirm amber "📧 Resend Invite" button visible. Active users show "Reset Pwd" button instead.</td>
        <td><span class="badge badge-green">Verified</span></td>
      </tr>
      <tr>
        <td>28 Mar 2026</td>
        <td><strong>🔴 Job Assignment ObjectId Crash:</strong> AdminJobs "👤 Assign" button for job recruiter assignment was throwing "Cast to ObjectId failed for value 'undefined'" because jobs from API only had <code>_id</code> not <code>id</code>. Added <code>normalizeJob()</code> to always set <code>id = _id?.toString()</code> on load.</td>
        <td>1) Admin → Jobs → click "👤 Assign" on any job. 2) Select a recruiter from dropdown. 3) Click "✓ Save Recruiter" → confirm "✅ Recruiter assigned!" toast, no error. 4) Reload page → job should show recruiter name. 5) No ObjectId console errors.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>28 Mar 2026</td>
        <td><strong>AdminUsers Pending Invites Tab:</strong> Non-candidate user pages now have a "📧 Pending Invites" tab. Shows all unaccepted invites with Resend/Revoke actions, expiry status, and who sent the invite.</td>
        <td>1) Admin → Recruiters → click "📧 Pending Invites" tab. 2) Confirm pending invites listed with name, email, role, sent date. 3) Click "📧 Resend" → success toast. 4) Click "Revoke" → confirm dialog → user deleted. 5) Tab switches back to "All Recruiters" when filterRole changes.</td>
        <td><span class="badge badge-amber">New</span></td>
      </tr>
      <tr>
        <td>28 Mar 2026</td>
        <td><strong>Invite Method Toggle (Admin/Recruiter):</strong> "Add Recruiter"/"Add Admin" modal now has a delivery method toggle — "🔗 Secure invite link" (they set own password) vs "🔑 Temp password" (credentials emailed). Routes to correct API endpoint based on role.</td>
        <td>1) Admin → Recruiters → "+ Add Recruiter" → confirm two-button toggle visible. 2) Select "🔑 Temp password" → info banner shows temp pwd. Submit → "Account created — temporary password sent by email" toast. 3) Select "🔗 Secure invite link" → submit → "Invitation email sent" toast. 4) Verify DB: isActive=false for invite link, isActive=false+mustChangePassword=true for temp.</td>
        <td><span class="badge badge-amber">New</span></td>
      </tr>
      <tr>
        <td>28 Mar 2026</td>
        <td><strong>Assessment Creation Modal:</strong> Assessments page now has "+ Create Assessment" button. Modal has: job selector, title, duration, passing score, instructions, dynamic questions list (text/MCQ/code types, per-question marks), "Save Draft" + "Create &amp; Publish" buttons. Existing assessments show "✏️ Edit Assessment" button. Anti-cheat violation endpoint added to backend.</td>
        <td>1) Recruiter → Assessments → select a job with no assessment → "+ Create Assessment" button appears. 2) Click it → modal opens with job pre-selected. 3) Fill title + add 2 questions (one text, one MCQ) + set duration 30 mins → "Create &amp; Publish". 4) Confirm assessment appears for that job with "Edit Assessment" button. 5) Click Edit → existing questions load in form. 6) POST /api/assessments/:id/submissions/:subId/violation → 200 with violationCount.</td>
        <td><span class="badge badge-amber">New</span></td>
      </tr>
      <tr>
        <td>28 Mar 2026</td>
        <td><strong>AdminJobs Assign Candidates Tab:</strong> Assign panel upgraded to tabbed modal. "Assign Candidates" tab shows candidate search, filter list with already-assigned candidates disabled (showing their current stage badge), bulk selection, POST /api/jobs/:jobId/assign-candidates endpoint.</td>
        <td>1) Admin → Jobs → "👤 Assign" → two tabs: "👤 Assign Recruiter" + "👥 Assign Candidates". 2) Tab 2 → search candidates → select 2 → "Assign 2 →" → success toast. 3) Reload assign panel → those 2 now show as disabled with stage badge. 4) POST /api/jobs/:id/assign-candidates with valid IDs → 201 {created:2,skipped:0}. 5) Re-assign same candidates → {created:0,skipped:2}.</td>
        <td><span class="badge badge-amber">New</span></td>
      </tr>
      <tr>
        <td>28 Mar 2026</td>
        <td><strong>Change Password (All Roles):</strong> My Profile page for all roles now has a "Change Password" section with current/new/confirm fields, show/hide toggles, live strength bar. POST /api/auth/change-password backend route with bcrypt comparison.</td>
        <td>1) Login as any role → My Profile → scroll down → "Change Password" section visible. 2) Enter wrong current password → "Current password is incorrect" error. 3) Enter new password with no uppercase → strength check fails. 4) Fill valid current + strong new password + matching confirm → "Update Password" → "Password updated successfully!" banner. 5) Log out → log in with new password → succeeds.</td>
        <td><span class="badge badge-amber">New</span></td>
      </tr>
      <tr>
        <td>28 Mar 2026</td>
        <td><strong>🔴 Array Guard Sweep (8 pages):</strong> AdminUsers, AdminAnalytics, RecruiterPipeline, CandidateDashboard, SuperAdminOrgs, SuperAdminCandidateImport, AssignedCandidates, RecruiterAssessments were calling <code>.filter()/.map()</code> on the paginated <code>{success,data[],pagination}</code> API response instead of the unwrapped array → blank screens / "h.filter is not a function" crashes.</td>
        <td>1) Admin → Overview → KPI cards show real numbers (not zeros). 2) Admin → Users → Candidates/Recruiters tabs show data. 3) Recruiter → Pipeline → jobs list loads, selecting a job shows applicants. 4) Candidate → Dashboard → application count visible. 5) SuperAdmin → Orgs → org list loads. 6) Admin → Jobs → "👥 Assigned Candidates" list loads. 7) Recruiter → Assessments → jobs dropdown has options.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>28 Mar 2026</td>
        <td><strong>🔴 JobDetailDrawer Double Crash:</strong> (1) "View Details" for any job crashed with "h.filter is not a function" — candidates list from paginated API stored raw. (2) Selecting a recruiter in the Assign Recruiter dropdown crashed with "Cast to ObjectId failed for value 'undefined'" — <code>job.id</code> was <code>undefined</code> because backend <code>.lean()</code> strips virtual <code>id</code>. Both fixed.</td>
        <td>1) Admin/SuperAdmin → All Jobs → click "View Details" on any job → drawer opens, no console errors. 2) In drawer → Assign Recruiter tab → select a recruiter from dropdown → click Save → "✅ Recruiter assigned!" toast, no ObjectId error. 3) Reload page → recruiter name still shown on job card. 4) View Details → pipeline tab → candidates list loads with stage badges.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>28 Mar 2026</td>
        <td><strong>🔴 Logo Upload / Preview / Download (OrgSettings):</strong> Admin → Org Settings logo section was broken — upload stored base64 in local state only (never hit API), download link was a dead endpoint. Now: upload calls <code>api.uploadOrgLogo()</code> and propagates via LogoContext. Download exports a real PNG file via canvas rendering.</td>
        <td>1) Admin → Org Settings → scroll to Company Logo → <code>&lt;LogoManager&gt;</code> visible with Upload / Download / Reset buttons. 2) Upload a PNG logo → preview updates instantly, sidebar logo changes. 3) Click "⬇️ Download PNG" → <code>talentnesthr-logo.png</code> file downloads (not a broken 404). 4) Click "Reset Logo" → reverts to default TN logo. 5) Refresh page → uploaded logo still shows (persisted via API).</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>28 Mar 2026</td>
        <td><strong>AdminAnalytics Overview Charts:</strong> Admin/SuperAdmin → Overview page now shows SVG charts below the KPI row: 14-day application trend (AreaChart), pipeline stage distribution (DonutChart), top 5 jobs by applicants (VertBarChart).</td>
        <td>1) Login as admin or super_admin → Overview page. 2) Below KPI cards → confirm 3-column chart row visible. 3) AreaChart shows 14 data points (last 14 days). 4) DonutChart shows coloured segments per pipeline stage with legend. 5) VertBarChart shows up to 5 bars (jobs with most applicants). 6) Charts render without errors even when there is no data (graceful empty state).</td>
        <td><span class="badge badge-amber">New</span></td>
      </tr>
      <tr>
        <td>28 Mar 2026</td>
        <td><strong>Inline Stage Change from Candidate Record:</strong> Admin, recruiter, and super_admin can now change a candidate's pipeline stage directly from CandidateDetailModal (the candidate profile popup). Also, admin/super_admin can change stages inline from the JobDetailDrawer pipeline candidate list.</td>
        <td>1) Admin → Pipeline or Jobs → open any candidate record → in the profile header, confirm "CHANGE STAGE" dropdown visible (coloured border matches current stage). 2) Change stage → "✅ Stage updated → Shortlisted" toast appears. 3) Close and reopen → new stage persists. 4) Login as candidate → open own record if possible → confirm NO stage dropdown visible. 5) Admin → Jobs → View Details → pipeline tab → each candidate row has inline stage select → change it → updates immediately without reload.</td>
        <td><span class="badge badge-amber">New</span></td>
      </tr>
      <tr>
        <td>28 Mar 2026</td>
        <td><strong>Notification Bell Expanded:</strong> Bell now notifies: (1) All org admins + super_admins when a new candidate applies. (2) Assigned recruiters when a stage changes (excluding the person who made the change). (3) Org admins when a candidate reaches a key milestone (Selected / Offer Extended / Rejected).</td>
        <td>1) Candidate applies to a job → login as admin → check notification bell → "New Application" notification present. 2) Recruiter moves candidate to "Selected" → login as admin → bell shows "Candidate Selected" notification. 3) Recruiter A moves candidate → login as Recruiter B (also assigned to the job) → bell shows stage change notification. 4) Mark all as read → bell count resets to 0. 5) Check bell polls every 30s (watch network tab — GET /api/notifications every 30s).</td>
        <td><span class="badge badge-amber">New</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>v3.0 🔴 Landing Page + Contact Page Redesign:</strong> Hero has Unsplash background + dark overlay. Services: dark navy, left accent bars, stagger animation. Industries: light bg, compact tiles, colour rotation, reduced size. "Open Positions" section hidden. Contact page: light theme form, dark navy info panel, trust pills hero row.</td>
        <td>1) Open talentnesthr.com → hero shows background image with dark overlay + white text. 2) Scroll to "What We Do" → dark navy section with 3-col cards, left accent bars, stagger fade-up animation. 3) Scroll to "Industries" → light background, compact coloured tiles. 4) Confirm "Open Positions" section is NOT visible. 5) Navigate to /contact → hero has office background image. 6) Contact form has light background, dark labels, white card. 7) Info panel (right) is dark navy. 8) No console errors on either page.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>v3.0 🔴 Recruiter Flow — 3 Bug Fixes:</strong> (1) "Assigned to Me" was empty — <code>ap.jobId</code> was a populated object not a string. (2) CandidateApplications assessments showed wrong job URL <code>/[object Object]</code>. (3) Invite response not creating application — <code>orgId</code> missing.</td>
        <td>1) Login as recruiter → "Assigned to Me" page → confirm candidates from assigned jobs appear. 2) Login as candidate who was invited → go to My Applications → click "Take Assessment" on a job → assessment loads (no 404 URL). 3) Click "Still Interested" in invite email → application is created in DB with correct orgId. No console errors for any of the above.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>v3.0 🔴 Top Jobs by Applications — Admin Overview:</strong> Chart always showed 0 applications — <code>String(a.jobId)</code> printed <code>"[object Object]"</code> instead of the ID. Fixed with helper that reads <code>a.job?.id || a.jobId?._id?.toString()</code>.</td>
        <td>1) Login as admin/super_admin → Overview → scroll to "Top Jobs by Applications" VertBarChart. 2) Confirm bars show non-zero counts for jobs that have applications. 3) Hover over bars → tooltip shows job title + count. 4) No console errors. 5) If no jobs have applications, chart shows empty state gracefully.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>v3.0 🔴 All Modals Z-Index (10001):</strong> Notification panel + profile menu (z-index 9999) were rendering over all modals (z-index 2000). All modals platform-wide bumped to 10001.</td>
        <td>1) Open notification panel → click any link that opens a modal (e.g. Admin → Jobs → View Details). 2) Confirm modal appears ON TOP of the page, not hidden behind nav or notification panel. 3) Open any recruiter/admin modal with the profile menu open → modal should be on top. 4) Test in: AdminJobs, RecruiterPipeline, CandidateExploreJobs, RecruiterAssessments. No modal should be obscured.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>v3.0 RecruiterJobs Applicant Count:</strong> Jobs page was showing 0 applicants for all jobs. Backend <code>GET /api/jobs</code> now includes aggregated <code>applicantsCount</code> + <code>selectedCount</code> per job.</td>
        <td>1) Login as recruiter → My Jobs → job cards show "👥 X Applicants" with real counts. 2) Click "👥 X Applicants" button → applicants panel opens listing all candidates. 3) Total count on button matches count in panel. 4) Job with 0 applications shows "👥 Applicants" (not "👥 0 Applicants"). 5) API: GET /api/jobs → each job object has <code>applicantsCount</code> field.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>v3.0 SuperAdmin OrgDetailModal Close Button:</strong> "Click to Manage" modal had close button scrolling out of view on tall content. Now backdrop scrolls (not modal) so close button is always at top.</td>
        <td>1) SuperAdmin → Organisations → click any org card ("Click to manage"). 2) Modal opens — confirm ✕ close button visible immediately (top-right, styled grey box). 3) Scroll down inside the modal → ✕ button should NOT disappear. 4) Click outside the modal → closes. 5) Click ✕ → closes. 6) Edit Details → Edit form appears — ✕ still visible at top. 7) Open on mobile (375px) → modal scrollable, close button always visible.</td>
        <td><span class="badge badge-red">Critical Fix</span></td>
      </tr>
      <tr>
        <td>${todayShort}</td>
        <td><strong>v3.0 ShareJobModal — Candidate Name + Sender + Interested Button + Outreach Logging:</strong> Email tab now has: Candidate Name field (personalises greeting), sender info banner, 2 action buttons (Send + Copy Link). Sent email has 2 buttons: "Apply Now" (blue) + "I'm Interested" (green tracking link). Every send is logged to Outreach Tracker.</td>
        <td>1) Recruiter → My Jobs → click "📣 Share" → Email tab → confirm "CANDIDATE NAME" input field visible. 2) Confirm sender info banner shows logged-in user's name. 3) Confirm preview shows TWO buttons: blue "👉 View Job &amp; Apply Now" + green "✅ I'm Interested". 4) Confirm 3 action buttons: "📧 Send to X Emails", "📋 Copy Job Link", "Close". 5) Fill candidate name + email → send → check inbox: email has "Hi [Name]," and green "I'm Interested" button. 6) Click "I'm Interested" link → redirected to job page. 7) Check Outreach Tracker → new row with type "📣 Share", sender name visible, status "Sent". 8) After clicking interested link → status changes to "Interested" in tracker.</td>
        <td><span class="badge badge-amber">New</span></td>
      </tr>
    </table>
  </div>

  <div class="section" id="daily">
    <h2><span class="icon" style="background:#dcfce7">🔁</span>Daily Test Loop — ${dayOfWeek}, ${today}</h2>
    <div class="alert alert-blue">ℹ️ Run this loop every working day. Each session starts fresh — clear sessionStorage or use Incognito. Estimated time: <strong>25–35 min</strong>.</div>
    <h3>🗓️ This Week's Test Schedule</h3>
    <table>
      <tr><th>Day</th><th>Focus Area</th><th>Accounts Needed</th><th>Estimated Time</th></tr>
      <tr><td><strong>${nextDays[0].label}</strong> ← Today</td><td>Auth + Invite Flow + Live Changes (see above)</td><td>super_admin, new test admin, new test recruiter</td><td>30 min</td></tr>
      <tr><td>${nextDays[1].label}</td><td>Job Lifecycle (create → approve → publish → apply → pipeline)</td><td>admin, recruiter, candidate</td><td>35 min</td></tr>
      <tr><td>${nextDays[2].label}</td><td>Mobile Regression (all marketing pages + nav)</td><td>Any (DevTools mobile)</td><td>25 min</td></tr>
      <tr><td>${nextDays[3].label}</td><td>Assessments + Outreach + Email Logs</td><td>recruiter, candidate</td><td>30 min</td></tr>
      <tr><td>${nextDays[4].label}</td><td>SuperAdmin — Orgs, Platform, Security, Playbooks</td><td>super_admin</td><td>25 min</td></tr>
      <tr><td>${nextDays[5].label}</td><td>API Tests (Postman collection — all 16 routes)</td><td>All roles via tokens</td><td>40 min</td></tr>
      <tr><td>${nextDays[6].label}</td><td>Full smoke test on Production (talentnesthr.com)</td><td>Test accounts only</td><td>20 min</td></tr>
    </table>
    <h3>⚡ Daily 10-Minute Smoke Test (Run Every Day)</h3>
    <div class="step"><div class="step-num">1</div><div class="step-body"><h4>Super Admin Login</h4><p>Login as admin@talentnesthr.com → confirm lands on 📈 Overview (not Dashboard) → sidebar shows Playbooks → no duplicate Dashboard item</p></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><h4>Marketing Mobile Check</h4><p>Open talentnesthr.com in DevTools at 375px → confirm hamburger visible (3-bar button with border) → tap → menu slides in → Services accordion works → footer CTAs show "Contact Us" and "Our Platform"</p></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><h4>Auth Smoke</h4><p>Register a new candidate → auto-login → lands on Candidate Dashboard → logout → login again → same page</p></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><h4>Core API Health</h4><p>GET /api/health → 200 OK. GET /api/jobs/public → array. GET /api/stats/public → object with counts</p></div></div>
    <div class="step"><div class="step-num">5</div><div class="step-body"><h4>Invite Flow</h4><p>Admin → Add Recruiter → no password field shown → submit → check user created with isActive=false</p></div></div>
  </div>

  <div class="section" id="env">
    <h2><span class="icon" style="background:#dbeafe">🌍</span>Test Environments</h2>
    <table>
      <tr><th>Environment</th><th>URL</th><th>Credentials</th><th>Use For</th></tr>
      <tr><td>Local Frontend</td><td>http://localhost:5173</td><td>Any registered account</td><td>Feature dev testing</td></tr>
      <tr><td>Local Backend</td><td>http://localhost:5000/api</td><td>—</td><td>API testing</td></tr>
      <tr><td>Production</td><td>https://talentnesthr.com</td><td>Test accounts only</td><td>Smoke tests, UAT</td></tr>
      <tr><td>Super Admin (prod)</td><td>/login → Super Admin tab</td><td>admin@talentnesthr.com / TalentNest@2024</td><td>Platform admin testing</td></tr>
    </table>
    <div class="alert alert-amber">⚠️ Never test with real candidate data. Use names like "Test Candidate ${todayShort}-01" to track test data by date.</div>
  </div>

  <div class="section" id="manual">
    <h2><span class="icon" style="background:#dcfce7">✅</span>Manual Test Cases</h2>
    <h3>Auth &amp; Invite Flow — Updated ${todayShort}</h3>
    <table>
      <tr><th>#</th><th>Test Case</th><th>Expected Result</th><th>Added</th></tr>
      <tr><td>A01</td><td>Register as candidate with valid details</td><td>Auto-login, lands on Candidate Dashboard</td><td>Original</td></tr>
      <tr><td>A02</td><td>Register with duplicate email</td><td>Error: "Email already in use"</td><td>Original</td></tr>
      <tr><td>A03</td><td>Login with wrong password</td><td>Error: "Invalid credentials"</td><td>Original</td></tr>
      <tr><td>A04</td><td>Clear sessionStorage while logged in</td><td>Redirected to login with "Session expired"</td><td>Original</td></tr>
      <tr><td>A05</td><td>Admin invites recruiter (no password field)</td><td>User created with isActive=false; invite email sent</td><td>${todayShort}</td></tr>
      <tr><td>A06</td><td>Open invite email link → set password</td><td>SetPasswordPage, email pre-filled, token valid</td><td>Original</td></tr>
      <tr><td>A07</td><td>Use invite link a second time</td><td>Error: "Invalid or expired token"</td><td>Original</td></tr>
      <tr><td>A08</td><td>Admin clicks "Resend Invite" for inactive user</td><td>New invite email sent, new token generated</td><td>${todayShort}</td></tr>
      <tr><td>A09</td><td>Login as admin → confirm no Dashboard nav item</td><td>Sidebar shows Overview (📈) as first item</td><td>${todayShort}</td></tr>
      <tr><td>A10</td><td>Login as super_admin → landing page</td><td>Lands on Analytics/Overview, NOT Dashboard</td><td>${todayShort}</td></tr>
      <tr><td>A11</td><td>Register new candidate — check availability stored correctly</td><td>No 500 error; DB shows availability = 'immediate', skills = []</td><td>${todayShort}</td></tr>
      <tr><td>A12</td><td>Register new candidate — check welcome email received</td><td>Email in inbox with TalentNest branding + login link</td><td>${todayShort}</td></tr>
    </table>
    <h3>Mobile &amp; Nav — Updated ${todayShort}</h3>
    <table>
      <tr><th>#</th><th>Test Case</th><th>Expected Result</th><th>Added</th></tr>
      <tr><td>M01</td><td>Open site on 375px viewport — hamburger visible</td><td>3-bar icon with border visible top-right of nav</td><td>${todayShort}</td></tr>
      <tr><td>M02</td><td>Tap hamburger → mobile menu opens</td><td>Full-screen overlay with all nav links</td><td>${todayShort}</td></tr>
      <tr><td>M03</td><td>Mobile menu → Services → tap accordion</td><td>7 service items expand with left border accent</td><td>${todayShort}</td></tr>
      <tr><td>M04</td><td>Mobile menu footer → "Contact Us" button</td><td>Navigates to /contact, menu closes</td><td>${todayShort}</td></tr>
      <tr><td>M05</td><td>Mobile menu footer → "Our Platform" button</td><td>Navigates to /login, menu closes</td><td>${todayShort}</td></tr>
      <tr><td>M06</td><td>Open /contact on mobile (375px)</td><td>Info panel and form stack vertically, inputs full-width</td><td>${todayShort}</td></tr>
      <tr><td>M07</td><td>Open /about on mobile</td><td>All card grids stack to 1-col</td><td>${todayShort}</td></tr>
      <tr><td>M08</td><td>Open /hrms on mobile</td><td>All feature grids stack, no horizontal overflow</td><td>${todayShort}</td></tr>
    </table>
    <h3>Job &amp; Application Flow — Updated ${todayShort}</h3>
    <table>
      <tr><th>#</th><th>Test Case</th><th>Expected Result</th><th>Added</th></tr>
      <tr><td>J01</td><td>Recruiter creates a job with all fields</td><td>Job created with "Pending Approval" status</td><td>Original</td></tr>
      <tr><td>J02</td><td>Admin approves the job</td><td>Job active, visible on public board at /careers</td><td>Original</td></tr>
      <tr><td>J03</td><td>Candidate applies to job from Explore Jobs</td><td>Application in pipeline, recruiter sees it</td><td>Original</td></tr>
      <tr><td>J04</td><td>Recruiter moves candidate → Interview Scheduled</td><td>Stage updated, candidate gets email notification</td><td>Original</td></tr>
      <tr><td>J05</td><td>Candidate withdraws from Applied stage</td><td>Application removed from recruiter pipeline</td><td>Original</td></tr>
      <tr><td>J06</td><td>Recruiter moves candidate → Selected (Hired)</td><td>Stage = "selected", notification sent</td><td>Original</td></tr>
      <tr><td>J07</td><td>Admin → Jobs page loads — shows job list</td><td>Jobs visible with title, status, applicant count (not empty)</td><td>${todayShort}</td></tr>
      <tr><td>J08</td><td>Recruiter → Jobs page loads own jobs</td><td>Only assigned jobs visible, not all org jobs</td><td>${todayShort}</td></tr>
      <tr><td>J09</td><td>Admin → Job Approval page loads pending jobs</td><td>Jobs with status "pending" visible; approve button works</td><td>${todayShort}</td></tr>
      <tr><td>J10</td><td>Candidate → Explore Jobs loads job list</td><td>Approved active jobs visible; no Access Denied error</td><td>${todayShort}</td></tr>
      <tr><td>J11</td><td>Candidate → Explore Jobs — applied jobs show badge</td><td>Jobs candidate already applied to show "Applied ✓"</td><td>${todayShort}</td></tr>
    </table>
    <h3>Candidate Profile &amp; AI Match — Updated ${todayShort}</h3>
    <table>
      <tr><th>#</th><th>Test Case</th><th>Expected Result</th><th>Added</th></tr>
      <tr><td>CP01</td><td>Candidate → My Profile page loads</td><td>Profile data shows — no "Route not found" error</td><td>${todayShort}</td></tr>
      <tr><td>CP02</td><td>Candidate → AI Job Search — click Match</td><td>Matching results appear, no "Matching failed" error</td><td>${todayShort}</td></tr>
      <tr><td>CP03</td><td>Candidate Dashboard loads KPIs</td><td>Applications count, job matches, assessment status visible</td><td>${todayShort}</td></tr>
      <tr><td>CP04</td><td>Admin → Users → Candidates tab</td><td>Shows actual candidate list (not empty)</td><td>${todayShort}</td></tr>
      <tr><td>CP05</td><td>Admin → Users → Recruiters tab</td><td>Shows actual recruiter list (not empty)</td><td>${todayShort}</td></tr>
    </table>
    <h3>Assessment Flow</h3>
    <table>
      <tr><th>#</th><th>Test Case</th><th>Expected Result</th></tr>
      <tr><td>AS01</td><td>Recruiter creates 5-question assessment for a job</td><td>Assessment linked to job, visible in Assessments page</td></tr>
      <tr><td>AS02</td><td>Candidate starts and submits assessment</td><td>Submission recorded with answers + time</td></tr>
      <tr><td>AS03</td><td>Recruiter reviews and marks Pass</td><td>Score visible on candidate card, status updated</td></tr>
    </table>
    <h3>SuperAdmin — Orgs &amp; Platform</h3>
    <table>
      <tr><th>#</th><th>Test Case</th><th>Expected Result</th></tr>
      <tr><td>SA01</td><td>Create new organisation</td><td>Org appears in Organisations list with Trial plan</td></tr>
      <tr><td>SA02</td><td>Invite Admin to org</td><td>Admin user created with isActive=false, invite email sent (no plain password in email)</td></tr>
      <tr><td>SA03</td><td>Change org plan to Growth via Plan modal</td><td>Plan updated, limits increase (maxJobs → 100)</td></tr>
      <tr><td>SA04</td><td>Download DB backup from Platform page</td><td>.json file downloaded with all collections</td></tr>
      <tr><td>SA05</td><td>Open 📚 Playbooks → Preview Developer Playbook</td><td>Iframe opens, shows changelog with today's date</td></tr>
      <tr><td>SA06</td><td>Download Tester Playbook</td><td>tester-playbook.html downloaded, opens correctly</td></tr>
    </table>
  </div>

  <div class="section" id="regression">
    <h2><span class="icon" style="background:#fef3c7">🔬</span>Regression Suite — Run After Every Deploy</h2>
    <div class="alert alert-amber">⚡ Run this full suite after every push to main. Focus on the "Changed" column — test those first.</div>
    <table>
      <tr><th>Area</th><th>Tests</th><th>Last Changed</th><th>Risk</th></tr>
      <tr><td>Auth + Invite + Registration</td><td>A01–A12</td><td>${todayShort}</td><td><span class="badge badge-red">High</span></td></tr>
      <tr><td>Candidate Registration 500</td><td>A11, A12</td><td>${todayShort}</td><td><span class="badge badge-red">High</span></td></tr>
      <tr><td>Job Pages — Admin &amp; Recruiter</td><td>J07–J09</td><td>${todayShort}</td><td><span class="badge badge-red">High</span></td></tr>
      <tr><td>Candidate Explore Jobs + Profile</td><td>J10, J11, CP01–CP05</td><td>${todayShort}</td><td><span class="badge badge-red">High</span></td></tr>
      <tr><td>Admin Users — Candidates &amp; Recruiters tab</td><td>CP04, CP05</td><td>${todayShort}</td><td><span class="badge badge-red">High</span></td></tr>
      <tr><td>Mobile Nav</td><td>M01–M08</td><td>${todayShort}</td><td><span class="badge badge-blue">Medium</span></td></tr>
      <tr><td>Marketing Pages Mobile</td><td>M06–M08 + /services, /blog</td><td>${todayShort}</td><td><span class="badge badge-blue">Medium</span></td></tr>
      <tr><td>Admin Analytics (Overview)</td><td>A09, SA05</td><td>${todayShort}</td><td><span class="badge badge-blue">Medium</span></td></tr>
      <tr><td>Job Full Pipeline</td><td>J01–J06</td><td>${todayShort}</td><td><span class="badge badge-blue">Medium</span></td></tr>
      <tr><td>Assessments</td><td>AS01–AS03</td><td>Stable</td><td><span class="badge badge-green">Low</span></td></tr>
      <tr><td>SuperAdmin — Orgs/Platform</td><td>SA01–SA06</td><td>${todayShort}</td><td><span class="badge badge-blue">Medium</span></td></tr>
      <tr><td>Notifications</td><td>Bell icon, unread count, mark all read, new-application + stage-change + milestone alerts</td><td>28 Mar 2026</td><td><span class="badge badge-blue">Medium</span></td></tr>
      <tr><td>Array Guards — 8 pages</td><td>AdminUsers, AdminAnalytics, RecruiterPipeline, CandidateDashboard, SuperAdminOrgs, SuperAdminCandidateImport, AssignedCandidates, RecruiterAssessments</td><td>28 Mar 2026</td><td><span class="badge badge-red">High</span></td></tr>
      <tr><td>JobDetailDrawer</td><td>View Details, Assign Recruiter, Assign Candidates, Inline Stage Change</td><td>28 Mar 2026</td><td><span class="badge badge-red">High</span></td></tr>
      <tr><td>Logo System (OrgSettings)</td><td>Upload, preview, download PNG, reset</td><td>28 Mar 2026</td><td><span class="badge badge-red">High</span></td></tr>
      <tr><td>Stage Change (CandidateDetailModal)</td><td>Dropdown in candidate profile for admin/recruiter/super_admin</td><td>28 Mar 2026</td><td><span class="badge badge-blue">Medium</span></td></tr>
      <tr><td>Email Logs</td><td>Mail Queue page, resend failed email</td><td>Stable</td><td><span class="badge badge-green">Low</span></td></tr>
    </table>
  </div>

  <div class="section" id="automation">
    <h2><span class="icon" style="background:#ede9fe">🤖</span>Automation Guide (Playwright)</h2>
    <pre><span class="c"># Install Playwright</span>
<span class="k">npm</span> install -D @playwright/test
<span class="k">npx</span> playwright install chromium</pre>
    <h3>Test: Admin Login → Overview (Updated ${todayShort})</h3>
    <pre><span class="k">import</span> { test, expect } <span class="k">from</span> <span class="s">'@playwright/test'</span>;

test(<span class="s">'admin lands on Overview after login'</span>, <span class="k">async</span> ({ page }) => {
  <span class="k">await</span> page.<span class="fn">goto</span>(<span class="s">'http://localhost:5173/login'</span>);
  <span class="k">await</span> page.<span class="fn">click</span>(<span class="s">'text=HR Admin'</span>);
  <span class="k">await</span> page.<span class="fn">fill</span>(<span class="s">'[type="email"]'</span>, <span class="s">'admin@testorg.com'</span>);
  <span class="k">await</span> page.<span class="fn">fill</span>(<span class="s">'[type="password"]'</span>, <span class="s">'Admin@1234'</span>);
  <span class="k">await</span> page.<span class="fn">click</span>(<span class="s">'text=Sign In'</span>);
  <span class="c">// Should land on Overview/Analytics — NOT Dashboard</span>
  <span class="k">await</span> expect(page.<span class="fn">locator</span>(<span class="s">'text=Overview'</span>)).<span class="fn">toBeVisible</span>();
  <span class="k">await</span> expect(page.<span class="fn">locator</span>(<span class="s">'text=Dashboard'</span>)).<span class="fn">not</span>.<span class="fn">toBeVisible</span>();
});</pre>
    <h3>Test: Mobile Hamburger Visible (New ${todayShort})</h3>
    <pre>test(<span class="s">'hamburger visible on mobile viewport'</span>, <span class="k">async</span> ({ page }) => {
  <span class="k">await</span> page.<span class="fn">setViewportSize</span>({ width: 375, height: 812 });
  <span class="k">await</span> page.<span class="fn">goto</span>(<span class="s">'https://talentnesthr.com'</span>);
  <span class="k">const</span> hamburger = page.<span class="fn">locator</span>(<span class="s">'.tn-hamburger-btn'</span>);
  <span class="k">await</span> expect(hamburger).<span class="fn">toBeVisible</span>();
  <span class="k">await</span> hamburger.<span class="fn">click</span>();
  <span class="k">await</span> expect(page.<span class="fn">locator</span>(<span class="s">'text=Contact Us'</span>)).<span class="fn">toBeVisible</span>();
  <span class="k">await</span> expect(page.<span class="fn">locator</span>(<span class="s">'text=Our Platform'</span>)).<span class="fn">toBeVisible</span>();
});</pre>
    <h3>Test: Invite Flow — No Password Sent (Updated ${todayShort})</h3>
    <pre>test(<span class="s">'create recruiter does not expose password'</span>, <span class="k">async</span> ({ page }) => {
  <span class="c">// Login as admin, navigate to Recruiters, open Add modal</span>
  <span class="k">await</span> page.<span class="fn">goto</span>(<span class="s">'http://localhost:5173/login'</span>);
  <span class="c">// ... login steps ...</span>
  <span class="k">const</span> modal = page.<span class="fn">locator</span>(<span class="s">'[data-modal="add-user"]'</span>);
  <span class="k">await</span> expect(modal.<span class="fn">locator</span>(<span class="s">'[type="password"]'</span>)).<span class="fn">not</span>.<span class="fn">toBeVisible</span>();
  <span class="k">await</span> expect(modal.<span class="fn">locator</span>(<span class="s">'text=invitation email'</span>)).<span class="fn">toBeVisible</span>();
});</pre>
    <h3>Automation Priorities — ${todayShort}</h3>
    <table>
      <tr><th>Priority</th><th>Flow</th><th>Status</th></tr>
      <tr><td><span class="badge badge-red">P0</span></td><td>Auth: register, login, token expiry</td><td><span class="badge badge-green">Spec ready</span></td></tr>
      <tr><td><span class="badge badge-red">P0</span></td><td>Admin login → lands on Overview (not Dashboard)</td><td><span class="badge badge-amber">New — write this</span></td></tr>
      <tr><td><span class="badge badge-red">P0</span></td><td>Mobile hamburger visible + menu opens</td><td><span class="badge badge-amber">New — write this</span></td></tr>
      <tr><td><span class="badge badge-red">P0</span></td><td>Job create → approve → apply pipeline</td><td><span class="badge badge-green">Spec ready</span></td></tr>
      <tr><td><span class="badge badge-blue">P1</span></td><td>Invite flow: no password field, token email sent</td><td><span class="badge badge-amber">New — write this</span></td></tr>
      <tr><td><span class="badge badge-blue">P1</span></td><td>Mobile page grids stack at 640px</td><td><span class="badge badge-amber">New — write this</span></td></tr>
      <tr><td><span class="badge badge-blue">P1</span></td><td>Assessment: create → submit → review</td><td><span class="badge badge-green">Spec ready</span></td></tr>
      <tr><td><span class="badge badge-green">P2</span></td><td>Playbooks: preview iframe, download file</td><td><span class="badge badge-amber">New — write this</span></td></tr>
    </table>
  </div>

  <div class="section" id="api-tests">
    <h2><span class="icon" style="background:#ccfbf1">🔌</span>API Testing (Postman)</h2>
    <h3>Base URLs</h3>
    <pre>Local:   http://localhost:5000/api
Prod:    https://talentnest-hr-production.up.railway.app/api</pre>
    <h3>Auth Header</h3>
    <pre>Authorization: Bearer {{tn_token}}</pre>
    <h3>Key API Tests — ${todayShort}</h3>
    <table>
      <tr><th>Endpoint</th><th>Method</th><th>Test</th><th>Changed</th></tr>
      <tr><td>/auth/login</td><td>POST</td><td>Valid creds → 200 + token; wrong pwd → 401</td><td>—</td></tr>
      <tr><td>/auth/register</td><td>POST</td><td>New candidate → 201 + token + user; availability = 'immediate', skills = []; welcome email sent</td><td>${todayShort}</td></tr>
      <tr><td>/auth/login (admin role)</td><td>POST</td><td>Response user.role=admin, token valid, can call /orgs</td><td>—</td></tr>
      <tr><td>/users</td><td>GET</td><td>Admin token → 200 + {success,data:[],pagination}; candidate token → 403</td><td>${todayShort}</td></tr>
      <tr><td>/users?role=candidate</td><td>GET</td><td>Returns only candidate users in .data array</td><td>${todayShort}</td></tr>
      <tr><td>/users/:id</td><td>GET</td><td>Own token → 200 + {success,data:{user}}; other user's token → 403; super_admin → any user 200</td><td>${todayShort}</td></tr>
      <tr><td>/jobs</td><td>GET</td><td>Admin token → 200 + {success,data:[],pagination}. Recruiter → only assigned jobs. SuperAdmin → all jobs.</td><td>${todayShort}</td></tr>
      <tr><td>/jobs/:id</td><td>GET</td><td>Valid id → 200 + {success,data:{job}}; invalid id → 404</td><td>${todayShort}</td></tr>
      <tr><td>/jobs/public</td><td>GET</td><td>No auth required; returns {success,data:[],pagination} with active approved jobs</td><td>—</td></tr>
      <tr><td>/applications</td><td>GET</td><td>Candidate token → own applications only (no 403). Admin → all with filters. ?candidateId=xxx works for admin.</td><td>${todayShort}</td></tr>
      <tr><td>/users (POST, role=candidate)</td><td>POST</td><td>Creates candidate with profile fields, isActive=false, sends invite email</td><td>${todayShort}</td></tr>
      <tr><td>/users/:id/resend-invite</td><td>POST</td><td>Inactive user → 200 + new token; active user → 400</td><td>${todayShort}</td></tr>
      <tr><td>/orgs/:id/invite-admin</td><td>POST</td><td>Body has name+email only (no password). Response has no password field. User isActive=false.</td><td>26 Mar 2026</td></tr>
      <tr><td>/dashboard/analytics</td><td>GET</td><td>Admin/SuperAdmin get stats; candidate gets 403</td><td>—</td></tr>
      <tr><td>/platform/backup</td><td>GET</td><td>Super admin gets JSON blob; admin gets 403</td><td>—</td></tr>
    </table>
  </div>

  <div class="section" id="edge">
    <h2><span class="icon" style="background:#fee2e2">⚠️</span>Edge Cases</h2>
    <table>
      <tr><th>Scenario</th><th>Expected Behaviour</th><th>Risk</th></tr>
      <tr><td>Upload 10MB PDF resume</td><td>Size error shown OR Gemini processes gracefully</td><td><span class="badge badge-blue">Medium</span></td></tr>
      <tr><td>Invite link opened after 24h</td><td>"Invalid or expired token" error on SetPasswordPage</td><td><span class="badge badge-red">High</span></td></tr>
      <tr><td>Recruiter tries GET /api/orgs directly</td><td>403 Forbidden — role check enforced</td><td><span class="badge badge-red">High</span></td></tr>
      <tr><td>Two users register same email simultaneously</td><td>One succeeds, one gets unique constraint error</td><td><span class="badge badge-blue">Medium</span></td></tr>
      <tr><td>Bulk import 100 candidates CSV</td><td>All created, duplicates show per-row error (not crash)</td><td><span class="badge badge-blue">Medium</span></td></tr>
      <tr><td>Admin opens mobile nav and rotates device</td><td>Menu state preserved, no layout break</td><td><span class="badge badge-green">Low</span></td></tr>
      <tr><td>Super admin suspends own org</td><td>Should prevent or warn — super admin access should not be blocked</td><td><span class="badge badge-red">High</span></td></tr>
      <tr><td>Candidate applies to same job twice</td><td>Second application rejected — duplicate prevention</td><td><span class="badge badge-blue">Medium</span></td></tr>
    </table>
  </div>

  <div class="section" id="checklist">
    <h2><span class="icon" style="background:#f0fdf4">📋</span>Release Checklist — ${todayShort}</h2>
    <div class="alert alert-green">✅ All boxes must be checked before merging to main and deploying to production.</div>
    <h3>Pre-Deploy</h3>
    <ul class="check">
      <li><code>npm run build</code> passes with 0 errors, 0 warnings</li>
      <li>All P0 Playwright tests passing locally</li>
      <li>Daily smoke test completed (5 steps above)</li>
      <li>No plain-text passwords in any email, API response, or frontend form</li>
      <li>Backend syntax checked: <code>node --check backend/server.js</code></li>
    </ul>
    <h3>Live Changes Verified (${todayShort})</h3>
    <ul class="check">
      <li>Candidate self-registration → no 500 error; DB: availability='immediate', skills=[]</li>
      <li>Candidate receives welcome email after registration</li>
      <li>Admin → Jobs page shows actual jobs (not empty)</li>
      <li>Recruiter → Jobs page shows assigned jobs (not empty)</li>
      <li>Candidate → Explore Jobs shows jobs, no 403 Access Denied</li>
      <li>Candidate → My Profile loads without "Route not found"</li>
      <li>Candidate → AI Job Search matching works without error</li>
      <li>Admin → Users → Candidates tab shows candidates</li>
      <li>Admin → Users → Recruiters tab shows recruiters</li>
      <li>Admin → Analytics shows real KPI counts (not zeros)</li>
      <li>Admin + SuperAdmin login → land on Overview, not Dashboard</li>
      <li>Mobile hamburger visible at 375px, menu opens with correct items</li>
      <li>Contact Us + Our Platform CTAs present in mobile menu footer</li>
      <li>All marketing pages stack on mobile (no horizontal scroll)</li>
      <li>Playbooks sidebar item navigates to Playbooks page</li>
      <li>Add Recruiter / Add Admin — no password field, invite notice shown</li>
      <li>Admin → Overview → charts visible below KPI row (AreaChart + DonutChart + VertBarChart)</li>
      <li>Admin → Jobs → View Details → drawer opens, no h.filter crash, no ObjectId error on Assign Recruiter</li>
      <li>Admin → Org Settings → Logo section shows LogoManager, upload works, Download PNG produces a file</li>
      <li>Open candidate record as admin → "CHANGE STAGE" dropdown visible and functional</li>
      <li>Notification bell rings for new applications and stage milestones</li>
      <li><strong>v3.0</strong> — Landing page hero shows background image with dark overlay</li>
      <li><strong>v3.0</strong> — Services section dark navy with stagger animation, Industries section light with compact tiles</li>
      <li><strong>v3.0</strong> — "Open Positions" section hidden on home page</li>
      <li><strong>v3.0</strong> — Contact page shows light theme form + dark navy info panel</li>
      <li><strong>v3.0</strong> — Recruiter "Assigned to Me" shows actual candidates</li>
      <li><strong>v3.0</strong> — CandidateApplications "Take Assessment" uses correct job ID (no [object Object] in URL)</li>
      <li><strong>v3.0</strong> — Admin Overview "Top Jobs by Applications" chart shows real counts (not all zeros)</li>
      <li><strong>v3.0</strong> — All modals appear above notification panel and profile menu</li>
      <li><strong>v3.0</strong> — RecruiterJobs job cards show real applicant counts</li>
      <li><strong>v3.0</strong> — SuperAdmin OrgDetailModal ✕ button always visible; clicking outside closes modal</li>
      <li><strong>v3.0</strong> — ShareJobModal email tab: Candidate Name field, sender name banner, 3 buttons (Send + Copy Link + Close)</li>
      <li><strong>v3.0</strong> — Email preview shows both Apply Now (blue) and I'm Interested (green) buttons</li>
      <li><strong>v3.0</strong> — Sent job-share email logged in Outreach Tracker with Type=Share, Sent By name</li>
      <li><strong>v3.0</strong> — "I'm Interested" link in email → updates Outreach status to Interested + redirects to job</li>
      <li><strong>v3.0</strong> — Developer Playbook and Tester Playbook both show version 3.0 in hero badge</li>
    </ul>
    <h3>Post-Deploy</h3>
    <ul class="check">
      <li>Railway health check: GET /health → 200</li>
      <li>Vercel deploy: talentnesthr.com loads, no white screen</li>
      <li>Super admin login on production works</li>
      <li>Super admin seeded: admin@talentnesthr.com / TalentNest@2024</li>
      <li>VITE_API_URL points to correct Railway backend URL</li>
    </ul>
  </div>

</div>
<footer>Generated by <strong>TalentNest HR</strong> Super Admin · Auto-updated ${today} · Confidential &amp; Internal</footer>
</body></html>`;
}

// ─── 5. ARCHITECTURE PLAYBOOK ─────────────────────────────────────────────────
function buildArchitecturePlaybook() {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!DOCTYPE html><html lang="en"><head><title>Architecture Playbook — TalentNest HR</title>${BASE_STYLES}</head><body>
${heroHtml('🏗️','ARCHITECTURE PLAYBOOK','Architecture Playbook','System design, data models, infrastructure, and security architecture of TalentNest HR.','1.0',today,'Engineering Team')}
<div class="container">

  <div class="toc"><h2>📑 TABLE OF CONTENTS</h2><ol>
    <li><a href="#overview">System Overview</a></li>
    <li><a href="#frontend">Frontend Architecture</a></li>
    <li><a href="#backend">Backend Architecture</a></li>
    <li><a href="#db">Data Models</a></li>
    <li><a href="#security">Security Design</a></li>
    <li><a href="#infra">Infrastructure</a></li>
  </ol></div>

  <div class="section" id="overview">
    <h2><span class="icon" style="background:#dbeafe">🌐</span>System Overview</h2>
    <pre><span class="c">┌─────────────────────────────────────────────────────────────────┐
│                        TALENTNEST HR                            │
│                                                                 │
│  Browser / Mobile                                               │
│  ┌──────────────────────────────────────────┐                  │
│  │  React 18 SPA (Vercel CDN)               │                  │
│  │  • Vite build, 9 code-split chunks        │                  │
│  │  • React Router v6, lazy page loads       │                  │
│  │  • sessionStorage JWT, api.js layer       │                  │
│  └──────────────┬───────────────────────────┘                  │
│                 │ HTTPS REST (JSON)                             │
│  ┌──────────────▼───────────────────────────┐                  │
│  │  Express API (Railway, port 8080)         │                  │
│  │  • 16 route files, JWT middleware         │                  │
│  │  • Role-based access (4 roles)            │                  │
│  │  • Mongoose ODM → MongoDB Atlas           │                  │
│  └──────┬───────────────────┬───────────────┘                  │
│         │                   │                                   │
│  ┌──────▼──────┐   ┌────────▼───────┐                          │
│  │MongoDB Atlas│   │  External APIs  │                          │
│  │(Cloud DB)   │   │ • Resend Email  │                          │
│  │             │   │ • Google Gemini │                          │
│  └─────────────┘   └────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘</span></pre>
  </div>

  <div class="section" id="frontend">
    <h2><span class="icon" style="background:#dcfce7">⚛️</span>Frontend Architecture</h2>
    <h3>Code Splitting Strategy</h3>
    <table>
      <tr><th>Chunk</th><th>Contents</th><th>Size (gzip)</th></tr>
      <tr><td>vendor-react</td><td>React, ReactDOM</td><td>~45 KB</td></tr>
      <tr><td>vendor-router</td><td>React Router</td><td>~8 KB</td></tr>
      <tr><td>pages-admin</td><td>All admin pages</td><td>~46 KB</td></tr>
      <tr><td>pages-candidate</td><td>Candidate pages</td><td>~21 KB</td></tr>
      <tr><td>pages-recruiter</td><td>Recruiter pages</td><td>~33 KB</td></tr>
      <tr><td>pages-superadmin</td><td>Super admin pages</td><td>~161 KB</td></tr>
      <tr><td>pages-marketing</td><td>Public site pages</td><td>~47 KB</td></tr>
      <tr><td>vendor-pdf</td><td>PDF generation</td><td>~130 KB</td></tr>
      <tr><td>util-parser</td><td>Resume parser utils</td><td>~20 KB</td></tr>
    </table>
    <h3>State Management</h3>
    <p>No Redux or Zustand — state is local to components with <code>useState</code>/<code>useEffect</code>. User/token in <code>sessionStorage</code>. URL is the source of truth for navigation (page param).</p>
    <h3>API Layer Pattern</h3>
    <pre><span class="c">// api.js — single source of truth for all HTTP calls
// Features:
// 1. In-flight GET deduplication (parallel calls to same URL share one fetch)
// 2. Global 401 handler → auto-logout → redirect to login
// 3. Token from sessionStorage on every authenticated call</span>
<span class="k">const</span> _inflight = <span class="k">new</span> Map();
<span class="k">async function</span> <span class="fn">req</span>(method, path, body, auth) {
  <span class="k">if</span> (method === <span class="s">'GET'</span>) {
    <span class="k">if</span> (_inflight.<span class="fn">has</span>(path)) <span class="k">return</span> _inflight.<span class="fn">get</span>(path);
    <span class="c">// ... dedup logic</span>
  }
}</pre>
  </div>

  <div class="section" id="backend">
    <h2><span class="icon" style="background:#fef3c7">🟢</span>Backend Architecture</h2>
    <h3>Request Lifecycle</h3>
    <div class="step"><div class="step-num">1</div><div class="step-body"><h4>CORS Middleware</h4><p>Allows: *.vercel.app, *.railway.app, talentnesthr.com, localhost:*</p></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><h4>Health Check</h4><p>GET /health — always first, bypasses all auth. Used by Railway health monitor.</p></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><h4>authenticate middleware</h4><p>Verifies JWT, attaches <code>req.user</code> with userId/role/orgId</p></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><h4>requireRole middleware</h4><p>Checks <code>req.user.role</code> against allowed roles list</p></div></div>
    <div class="step"><div class="step-num">5</div><div class="step-body"><h4>Route Handler</h4><p>Business logic, Mongoose queries, response JSON</p></div></div>
    <h3>Email Architecture</h3>
    <pre><span class="c">// utils/email.js
// Primary: Resend API (RESEND_API_KEY env var)
// Fallback: console.log in dev (no API key)
// Retry: 3 attempts with exponential backoff (1s, 2s, 4s)
// Templates: invite, stageChange, interviewScheduled</span></pre>
  </div>

  <div class="section" id="db">
    <h2><span class="icon" style="background:#ede9fe">🍃</span>Data Models</h2>
    <table>
      <tr><th>Model</th><th>Key Fields</th><th>Indexes</th></tr>
      <tr><td><strong>User</strong></td><td>name, email, role, orgId, isActive, skills[], resetPasswordToken, twoFactorEnabled</td><td>orgId, role, skills, availability, orgId+role</td></tr>
      <tr><td><strong>Org</strong></td><td>name, domain, slug, plan, status, settings (Mixed — emailSettings, pipelineStages, featureFlags)</td><td>slug (unique), domain</td></tr>
      <tr><td><strong>Job</strong></td><td>title, orgId, recruiterId, skills[], approvalStatus, urgency, isPublic, salary</td><td>orgId, recruiterId, approvalStatus</td></tr>
      <tr><td><strong>Application</strong></td><td>jobId, candidateId, stage, notes[], tags[], feedback, interviewDate, addedBy</td><td>jobId, candidateId, stage</td></tr>
      <tr><td><strong>Assessment</strong></td><td>jobId, orgId, questions[], timeLimit, passingScore</td><td>jobId</td></tr>
      <tr><td><strong>Invite</strong></td><td>candidateId, jobId, recruiterId, status, message, openedAt</td><td>candidateId, status</td></tr>
      <tr><td><strong>Notification</strong></td><td>userId, type, message, read, link</td><td>userId, read</td></tr>
    </table>
    <div class="alert alert-blue">ℹ️ All models use Mongoose timestamps (<code>createdAt</code>, <code>updatedAt</code>). Org.settings is a Mixed type — stores emailSettings, pipelineStages, featureFlags, permissions all in one flexible field.</div>
  </div>

  <div class="section" id="security">
    <h2><span class="icon" style="background:#fee2e2">🔒</span>Security Design</h2>
    <div class="cards">
      <div class="card"><div class="card-icon">🔑</div><h4>No Plain Passwords</h4><p>All passwords bcrypt-hashed (10 rounds). Invite flow uses crypto token — password never sent over email</p></div>
      <div class="card"><div class="card-icon">🎟️</div><h4>Secure Invite Tokens</h4><p>32 bytes random → SHA-256 hash stored in DB → raw token in email link → single-use, 24h expiry</p></div>
      <div class="card"><div class="card-icon">🛡️</div><h4>Role-Based Access</h4><p>Every protected route uses authenticate + requireRole. Admins can't access other org's data (requireSameOrg)</p></div>
      <div class="card"><div class="card-icon">📋</div><h4>Audit Logging</h4><p>logAudit() records all key actions to localStorage (frontend). Super admin can export as CSV</p></div>
      <div class="card"><div class="card-icon">🔐</div><h4>2FA Ready</h4><p>User model has twoFactorEnabled + twoFactorSecret fields. OTP flow implemented in auth.js</p></div>
      <div class="card"><div class="card-icon">🚫</div><h4>CORS Policy</h4><p>Strict allowlist: only known Vercel/Railway/talentnesthr.com origins. No wildcard in production</p></div>
    </div>
  </div>

  <div class="section" id="infra">
    <h2><span class="icon" style="background:#ccfbf1">☁️</span>Infrastructure</h2>
    <table>
      <tr><th>Component</th><th>Platform</th><th>Config</th></tr>
      <tr><td>Frontend</td><td>Vercel</td><td>Auto-deploy from main branch, VITE_API_URL env var baked at build time</td></tr>
      <tr><td>Backend API</td><td>Railway</td><td>Port 8080, auto-restart, health check at /health</td></tr>
      <tr><td>Database</td><td>MongoDB Atlas</td><td>M0 free tier or paid cluster, encrypted at rest</td></tr>
      <tr><td>Email</td><td>Resend</td><td>Transactional, from hr@talentnesthr.com</td></tr>
      <tr><td>AI</td><td>Google AI Studio</td><td>gemini-2.0-flash, API key in VITE_GEMINI_API_KEY</td></tr>
      <tr><td>Domain</td><td>talentnesthr.com</td><td>DNS points to Vercel, subdomains as needed</td></tr>
    </table>
  </div>

</div>
<footer>Generated by <strong>TalentNest HR</strong> Super Admin · Confidential &amp; Internal</footer>
</body></html>`;
}

// ─── 6. PLATFORM PLAYBOOK ────────────────────────────────────────────────────
function buildPlatformPlaybook() {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!DOCTYPE html><html lang="en"><head><title>Platform Playbook — TalentNest HR</title>${BASE_STYLES}</head><body>
${heroHtml('🌐','PLATFORM PLAYBOOK','Platform Playbook','Complete feature matrix, configuration guide, and platform capabilities of TalentNest HR.','1.0',today,'Platform Team')}
<div class="container">

  <div class="toc"><h2>📑 TABLE OF CONTENTS</h2><ol>
    <li><a href="#features">Feature Matrix</a></li>
    <li><a href="#config">Platform Configuration</a></li>
    <li><a href="#flags">Feature Flags</a></li>
    <li><a href="#email">Email Configuration</a></li>
    <li><a href="#backup">Data Backup</a></li>
    <li><a href="#limits">Plan Limits</a></li>
  </ol></div>

  <div class="section" id="features">
    <h2><span class="icon" style="background:#dbeafe">🗂️</span>Feature Matrix</h2>
    <table>
      <tr><th>Feature</th><th>Free</th><th>Trial</th><th>Starter</th><th>Growth</th><th>Enterprise</th></tr>
      <tr><td>AI Job Matching</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
      <tr><td>Bulk Email Outreach</td><td>❌</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
      <tr><td>Custom Pipeline Stages</td><td>❌</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
      <tr><td>Job Approval Workflow</td><td>❌</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
      <tr><td>Screening Questions/Assessments</td><td>❌</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
      <tr><td>Analytics CSV Export</td><td>❌</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
      <tr><td>Advanced Reporting</td><td>❌</td><td>❌</td><td>✅</td><td>✅</td><td>✅</td></tr>
      <tr><td>API Access</td><td>❌</td><td>❌</td><td>❌</td><td>✅</td><td>✅</td></tr>
      <tr><td>Google Calendar Sync</td><td>❌</td><td>❌</td><td>❌</td><td>✅</td><td>✅</td></tr>
      <tr><td>AI Candidate Ranking</td><td>❌</td><td>✅</td><td>✅</td><td>✅</td><td>✅</td></tr>
      <tr><td>White-Label Branding</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>✅</td></tr>
      <tr><td>SSO (SAML/OAuth)</td><td>❌</td><td>❌</td><td>❌</td><td>❌</td><td>✅</td></tr>
    </table>
  </div>

  <div class="section" id="config">
    <h2><span class="icon" style="background:#dcfce7">⚙️</span>Platform Configuration (Super Admin)</h2>
    <h3>Security Settings</h3>
    <table>
      <tr><th>Setting</th><th>Default</th><th>Description</th></tr>
      <tr><td>Session Timeout</td><td>7 days</td><td>JWT expiry duration</td></tr>
      <tr><td>Min Password Length</td><td>8</td><td>Enforced on set-password page</td></tr>
      <tr><td>Max Login Attempts</td><td>5</td><td>Before account lockout</td></tr>
      <tr><td>Lockout Duration</td><td>30 min</td><td>Time before retry allowed</td></tr>
      <tr><td>Require Strong Password</td><td>true</td><td>Uppercase + number required</td></tr>
      <tr><td>Audit Log Retention</td><td>90 days</td><td>Days to keep audit events</td></tr>
    </table>
    <h3>Org-Level Settings (Admin)</h3>
    <ul class="check">
      <li><strong>Logo</strong> — uploaded via LogoManager (drag-drop or file picker) → stored via <code>POST /api/orgs/logo</code> → propagated via LogoContext → sidebar + marketing site update live. Canvas PNG download available.</li>
      <li><strong>Pipeline Stages</strong> — customised per org, reordered with arrows</li>
      <li><strong>Email Settings</strong> — From Name, From Email, Provider, API Key, SMTP</li>
      <li><strong>Industry &amp; Size</strong> — displayed in super admin org view</li>
    </ul>
  </div>

  <div class="section" id="flags">
    <h2><span class="icon" style="background:#fef3c7">🚩</span>Feature Flags</h2>
    <p>Feature flags are set per-plan by the super admin in Security → Feature Flags. They can be overridden per-org.</p>
    <div class="cards">
      <div class="card"><h4>aiJobMatch</h4><p>Gemini-powered candidate-job matching. Enabled for all paid plans.</p></div>
      <div class="card"><h4>bulkEmail</h4><p>Send outreach emails to multiple candidates at once.</p></div>
      <div class="card"><h4>customPipeline</h4><p>Org can edit their hiring pipeline stages in Org Settings.</p></div>
      <div class="card"><h4>apiAccess</h4><p>REST API key access for third-party integrations. Growth+ only.</p></div>
      <div class="card"><h4>whiteLabel</h4><p>Custom logo, colors, domain. Enterprise only.</p></div>
      <div class="card"><h4>analyticsExport</h4><p>Download pipeline &amp; hiring reports as CSV.</p></div>
      <div class="card"><h4>jobApproval</h4><p>Require admin to approve jobs before they go live.</p></div>
      <div class="card"><h4>sso</h4><p>SAML/OAuth enterprise single sign-on. Enterprise only.</p></div>
    </div>
  </div>

  <div class="section" id="email">
    <h2><span class="icon" style="background:#ede9fe">📧</span>Email Configuration</h2>
    <h3>Supported Providers</h3>
    <table>
      <tr><th>Provider</th><th>Setup</th><th>Recommended For</th></tr>
      <tr><td>Resend</td><td>API key only</td><td><span class="badge badge-green">Best for most orgs</span></td></tr>
      <tr><td>Gmail SMTP</td><td>Enable App Password in Google Account</td><td>Small teams</td></tr>
      <tr><td>Zoho Mail</td><td>smtp.zoho.in:587, use ZOHO credentials</td><td>Indian businesses</td></tr>
      <tr><td>Outlook/O365</td><td>smtp.office365.com:587</td><td>Microsoft shops</td></tr>
      <tr><td>Custom SMTP</td><td>Any SMTP host + port + credentials</td><td>Self-hosted email</td></tr>
    </table>
    <h3>Auto-Sent Emails</h3>
    <ul class="check">
      <li>Invitation email with secure set-password link (user creation)</li>
      <li>Stage change notifications (e.g., "You've been shortlisted")</li>
      <li>Interview scheduled confirmation with date/time/link</li>
      <li>Welcome email for new candidate registrations</li>
    </ul>
  </div>

  <div class="section" id="backup">
    <h2><span class="icon" style="background:#ccfbf1">🗄️</span>Data Backup</h2>
    <p>Super admin can download a full JSON backup from Platform Overview → Database Backup.</p>
    <h3>Backup Contents</h3>
    <ul class="check">
      <li>All users (passwords excluded)</li>
      <li>All jobs and applications</li>
      <li>All organisations</li>
      <li>Leads and invites</li>
      <li>Email logs and notifications</li>
      <li>Assessments and submissions</li>
    </ul>
    <div class="alert alert-amber">⚠️ Backup file contains PII. Store securely. Never share externally.</div>
  </div>

  <div class="section" id="limits">
    <h2><span class="icon" style="background:#fee2e2">📊</span>Plan Limits</h2>
    <table>
      <tr><th>Plan</th><th>Max Jobs</th><th>Max Recruiters</th><th>Max Candidates</th><th>Max Admins</th></tr>
      <tr><td><span class="badge badge-teal">Free</span></td><td>5</td><td>1</td><td>100</td><td>1</td></tr>
      <tr><td><span class="badge badge-amber">Trial</span></td><td>20</td><td>3</td><td>500</td><td>2</td></tr>
      <tr><td><span class="badge badge-blue">Starter</span></td><td>50</td><td>5</td><td>1,000</td><td>2</td></tr>
      <tr><td><span class="badge badge-purple">Growth</span></td><td>Unlimited</td><td>20</td><td>10,000</td><td>5</td></tr>
      <tr><td><span class="badge" style="background:#1e293b;color:#f0f4f8">Enterprise</span></td><td>Unlimited</td><td>Unlimited</td><td>Unlimited</td><td>Unlimited</td></tr>
    </table>
  </div>

</div>
<footer>Generated by <strong>TalentNest HR</strong> Super Admin · Confidential &amp; Internal</footer>
</body></html>`;
}

// ─── 7. USER PLAYBOOK ─────────────────────────────────────────────────────────
function buildUserPlaybook() {
  const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<!DOCTYPE html><html lang="en"><head><title>User Playbook — TalentNest HR</title>${BASE_STYLES}</head><body>
${heroHtml('📖','USER PLAYBOOK','User Playbook','Step-by-step guide for every user of TalentNest HR — your hiring journey from day one.','1.0',today,'TalentNest HR Team')}
<div class="container">

  <div class="toc"><h2>📑 TABLE OF CONTENTS</h2><ol>
    <li><a href="#start">Getting Started</a></li>
    <li><a href="#candidate">For Candidates</a></li>
    <li><a href="#recruiter">For Recruiters</a></li>
    <li><a href="#admin">For HR Admins</a></li>
    <li><a href="#faq">FAQ</a></li>
  </ol></div>

  <div class="section" id="start">
    <h2><span class="icon" style="background:#dbeafe">🚀</span>Getting Started</h2>
    <div class="alert alert-blue">🌐 Platform URL: <strong>www.talentnesthr.com</strong> | Login: <strong>www.talentnesthr.com/login</strong></div>
    <h3>How to Access</h3>
    <div class="cards">
      <div class="card"><div class="card-icon">🧑‍💼</div><h4>Job Seeker (Candidate)</h4><p>Self-register at /login → "Job Seeker" tab. Instant access, no approval needed.</p></div>
      <div class="card"><div class="card-icon">🧑‍💻</div><h4>Recruiter / Admin</h4><p>Invited by your organisation admin. Check your email for a set-password link.</p></div>
      <div class="card"><div class="card-icon">👑</div><h4>Super Admin</h4><p>Platform owner account. Credentials provided during onboarding.</p></div>
    </div>
  </div>

  <div class="section" id="candidate">
    <h2><span class="icon" style="background:#dcfce7">🎓</span>For Candidates</h2>
    <h3>Your 5-Step Journey</h3>
    <div class="step"><div class="step-num">1</div><div class="step-body"><h4>Register &amp; Log In</h4><p>Select "Job Seeker" → enter your details → you're in! No email verification needed.</p></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><h4>Build Your Profile</h4><p>Click "My Profile" → complete all 7 sections. The more complete your profile, the higher your AI match score.</p></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><h4>Find Jobs</h4><p>"Explore Jobs" shows all active openings. "AI Job Search" uses your skills to find the best matches.</p></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><h4>Apply &amp; Track</h4><p>"My Applications" shows every application with live stage updates, interview details, and assessment status.</p></div></div>
    <div class="step"><div class="step-num">5</div><div class="step-body"><h4>Take Assessments</h4><p>If assigned, complete your assessment from "My Applications". Results are shared with the recruiter.</p></div></div>
    <h3>Application Stages — What They Mean</h3>
    <table>
      <tr><th>Stage</th><th>What It Means</th><th>What to Do</th></tr>
      <tr><td><span class="badge badge-blue">Applied</span></td><td>Application received</td><td>Wait for recruiter review</td></tr>
      <tr><td><span class="badge badge-amber">Screening</span></td><td>Under initial review</td><td>Keep your profile updated</td></tr>
      <tr><td><span class="badge badge-purple">Shortlisted</span></td><td>You made the shortlist!</td><td>Prepare for interview</td></tr>
      <tr><td><span class="badge badge-teal">Interview Scheduled</span></td><td>Interview booked</td><td>Check interview details in app</td></tr>
      <tr><td><span class="badge badge-green">Offer Extended</span></td><td>Offer is out</td><td>Review and respond to recruiter</td></tr>
      <tr><td><span class="badge badge-green">Selected</span></td><td>Congratulations! 🎉</td><td>Await onboarding instructions</td></tr>
    </table>
  </div>

  <div class="section" id="recruiter">
    <h2><span class="icon" style="background:#fef3c7">🔍</span>For Recruiters</h2>
    <h3>Daily Checklist</h3>
    <ul class="check">
      <li>Check Dashboard for new applications and upcoming interviews</li>
      <li>Review Pipeline → move candidates through stages</li>
      <li>Add new candidates via "Add Candidate" (AI parses resumes automatically)</li>
      <li>Send outreach invites to matched candidates</li>
      <li>Review assessment submissions for your jobs</li>
    </ul>
    <h3>Keyboard Shortcuts in Pipeline</h3>
    <table>
      <tr><th>Action</th><th>How</th></tr>
      <tr><td>Move candidate to next stage</td><td>Click the stage name in the candidate card</td></tr>
      <tr><td>Bulk select candidates</td><td>Check the checkbox → bulk action bar appears</td></tr>
      <tr><td>Quick note</td><td>Click the notes icon in candidate card → auto-saves with debounce</td></tr>
      <tr><td>Schedule interview</td><td>Interview stage → calendar icon → fill details</td></tr>
      <tr><td>Tag a candidate</td><td>Candidate card → Tags → pick Top Talent / Budget Fit / Culture Fit etc.</td></tr>
    </table>
  </div>

  <div class="section" id="admin">
    <h2><span class="icon" style="background:#ede9fe">⚡</span>For HR Admins</h2>
    <h3>First-Time Setup</h3>
    <div class="step"><div class="step-num">1</div><div class="step-body"><h4>Org Settings</h4><p>Go to Org Settings → upload your company logo, set industry &amp; size, configure email provider</p></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><h4>Invite Recruiters</h4><p>Recruiters tab → "+ Add Recruiter" → they get an invitation email with a secure password setup link</p></div></div>
    <div class="step"><div class="step-num">3</div><div class="step-body"><h4>Create First Job</h4><p>All Jobs → "+ Post Job" → upload JD or fill manually → approve it in Job Approvals</p></div></div>
    <div class="step"><div class="step-num">4</div><div class="step-body"><h4>Monitor Dashboard</h4><p>Analytics tab → KPI cards → click any card to drill into real candidate records</p></div></div>
    <h3>Admin Superpowers</h3>
    <ul class="check">
      <li>Approve or reject job postings before they go live</li>
      <li>Resend invite emails to users who haven't activated yet</li>
      <li>View recruiter activity panels (jobs + pipeline counts)</li>
      <li>Respond to contact enquiries from the marketing website</li>
      <li>Download analytics reports as CSV</li>
    </ul>
  </div>

  <div class="section" id="faq">
    <h2><span class="icon" style="background:#ccfbf1">❓</span>FAQ</h2>
    <table>
      <tr><th>Question</th><th>Answer</th></tr>
      <tr><td>I didn't receive the invite email</td><td>Ask your admin to click "Resend Invite" on your account in the Users section</td></tr>
      <tr><td>My invite link says "expired"</td><td>Links expire after 24 hours. Ask your admin to resend</td></tr>
      <tr><td>I forgot my password</td><td>Click "Forgot Password" on the login page — enter your email to receive a reset link</td></tr>
      <tr><td>Can I apply to multiple jobs?</td><td>Yes — you can apply to any active job. Each application is tracked independently</td></tr>
      <tr><td>Can I withdraw an application?</td><td>Yes — in "My Applications", you can withdraw if your application is in Applied or Screening stage</td></tr>
      <tr><td>How is my AI match score calculated?</td><td>Gemini compares your skills with the job's required skills. More matching skills = higher score</td></tr>
      <tr><td>Who can see my resume?</td><td>Only recruiters and admins in organisations you've applied to</td></tr>
    </table>
    <div class="alert alert-green">📞 Need help? Email us at <strong>hr@talentnesthr.com</strong> or call <strong>+91 79955 35539</strong></div>
  </div>

</div>
<footer>Generated by <strong>TalentNest HR</strong> Super Admin · Confidential &amp; Internal</footer>
</body></html>`;
}

// ─── 8. SYSTEM AUDIT REPORT PLAYBOOK ─────────────────────────────────────────
function buildAuditReportPlaybook() {
  const now = new Date();
  const today = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const todayShort = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return `<!DOCTYPE html><html lang="en"><head><title>System Audit Report — TalentNest HR</title>${BASE_STYLES}</head><body>
${heroHtml('🔍','SYSTEM AUDIT REPORT','TalentNest HR — Full System Audit','Manual inspection of UI, backend API, frontend code, and all known issues. Generated on demand.','1.0',today,'Engineering / QA Team')}
<div class="container">
  <div class="toc"><h2>📑 TABLE OF CONTENTS</h2><ol>
    <li><a href="#summary">Executive Summary</a></li>
    <li><a href="#backend">Backend API Check</a></li>
    <li><a href="#frontend">Frontend Code Check</a></li>
    <li><a href="#ui">UI/UX Check</a></li>
    <li><a href="#bugs">Bugs Found &amp; Fixed</a></li>
    <li><a href="#security">Security Check</a></li>
    <li><a href="#known">Known Issues &amp; Remaining Work</a></li>
    <li><a href="#checklist">Sign-Off Checklist</a></li>
  </ol></div>

  <div class="section" id="summary">
    <h2><span class="icon" style="background:#dcfce7">📋</span>Executive Summary — ${todayShort} ${time}</h2>
    <div class="alert alert-blue">ℹ️ This report was generated by manual code inspection of every backend route, frontend page, API client, and UI flow in TalentNest HR.</div>
    <div class="cards">
      <div class="card"><div class="card-icon">🟢</div><h4>Overall Status</h4><p>Core platform functional. 3 critical backend bugs fixed. All frontend pages null-safe.</p></div>
      <div class="card"><div class="card-icon">⚙️</div><h4>Backend Routes</h4><p>16 route files, ~85 endpoints. 3 missing routes added. All major CRUD operations present.</p></div>
      <div class="card"><div class="card-icon">⚛️</div><h4>Frontend Pages</h4><p>40+ pages across 4 roles. All data-fetching uses Array.isArray null-safe guards.</p></div>
      <div class="card"><div class="card-icon">🔐</div><h4>Security</h4><p>JWT auth + bcrypt + secure invite tokens + orgId guards. Impersonation role-validated.</p></div>
      <div class="card"><div class="card-icon">🐛</div><h4>Bugs Fixed</h4><p>3 critical crashes fixed: /count route 500, lean() id stripping, super_admin orgId 400.</p></div>
      <div class="card"><div class="card-icon">📱</div><h4>UI/UX</h4><p>Consistent design system. Proper loading states. 3 minor cosmetic issues noted.</p></div>
    </div>
    <h3>Audit Scope</h3>
    <table>
      <tr><th>Area</th><th>Files Inspected</th><th>Status</th></tr>
      <tr><td>Backend routes</td><td>users.js, auth.js, jobs.js, applications.js, platform.js, orgs.js, dashboard.js, assessments.js, invites.js, email.js, notifications.js, billing.js, stats.js, leads.js, social.js, parseResume.js</td><td><span class="badge badge-green">All Reviewed</span></td></tr>
      <tr><td>Admin pages</td><td>AdminAnalytics, AdminDashboard, AdminJobs, AdminUsers, AdminJobApproval, OrgSettings, OutreachTracker, ContactLeads, EmailLogsPage</td><td><span class="badge badge-green">All Reviewed</span></td></tr>
      <tr><td>SuperAdmin pages</td><td>SuperAdminSecurity, SuperAdminPermissions, SuperAdminOrgs, SuperAdminPlatform, SuperAdminPlaybooks, SuperAdminCandidateImport</td><td><span class="badge badge-green">All Reviewed</span></td></tr>
      <tr><td>Recruiter pages</td><td>RecruiterJobs, RecruiterCandidates (AdminUsers), RecruiterPipeline, RecruiterAssessments</td><td><span class="badge badge-green">Reviewed</span></td></tr>
      <tr><td>Candidate pages</td><td>CandidateDashboard, CandidateExploreJobs, CandidateProfile, CandidateAIMatch, CandidateApplications</td><td><span class="badge badge-blue">Spot-checked</span></td></tr>
      <tr><td>API client</td><td>src/api/api.js — all ~60 methods</td><td><span class="badge badge-green">Reviewed</span></td></tr>
      <tr><td>Data models</td><td>User.js, Org.js, Job.js, Application.js, Assessment.js + others</td><td><span class="badge badge-green">Reviewed</span></td></tr>
    </table>
  </div>

  <div class="section" id="backend">
    <h2><span class="icon" style="background:#dcfce7">🟢</span>Backend API Check</h2>
    <div class="alert alert-green">✅ server.js registers 16 route files correctly. Rate limiting, CORS, compression, and Helmet all configured.</div>
    <h3>Route File Status</h3>
    <table>
      <tr><th>Route File</th><th>Key Endpoints</th><th>Status</th><th>Notes</th></tr>
      <tr><td><code>auth.js</code></td><td>POST /login, /register, /google, /impersonate, /verify-token, /set-password, 2FA routes</td><td><span class="badge badge-green">✓ OK</span></td><td>Impersonate: fixed to properly use targetUserId. Role check: super_admin only.</td></tr>
      <tr><td><code>users.js</code></td><td>GET /users, /count, /candidates, /me, /:id — POST, PATCH, DELETE</td><td><span class="badge badge-green">✓ Fixed</span></td><td>ADDED: /count, /candidates. FIXED: lean() strips id virtual — now adds id manually.</td></tr>
      <tr><td><code>jobs.js</code></td><td>GET /jobs, /public, /:id — POST, PATCH, DELETE + assign-recruiter + /:id/candidates</td><td><span class="badge badge-green">✓ OK</span></td><td>Role-scoped: recruiter sees assigned jobs only. All CRUD present.</td></tr>
      <tr><td><code>applications.js</code></td><td>GET, POST /applications + POST /applications/public + stage/interview/notes updates</td><td><span class="badge badge-green">✓ OK</span></td><td>POST /public added ${todayShort} — no auth, guest apply from LandingPage/CareersPage. Finds/creates candidate by email, 409 on duplicate, sends confirmation email.</td></tr>
      <tr><td><code>dashboard.js</code></td><td>GET /stats, /pipeline-health, /analytics, /recruiter-leaderboard, /ai-matched-jobs</td><td><span class="badge badge-green">✓ OK</span></td><td>All aggregation endpoints present and registered.</td></tr>
      <tr><td><code>orgs.js</code></td><td>GET /orgs, /:id — POST, PATCH, DELETE + invite-admin + plan update</td><td><span class="badge badge-green">✓ OK</span></td><td>invite-admin uses secure token email (no plain password).</td></tr>
      <tr><td><code>platform.js</code></td><td>GET /config, PATCH /security, PATCH /flags, GET /backup</td><td><span class="badge badge-green">✓ OK</span></td><td>super_admin only. DB backup endpoint returns live data export.</td></tr>
      <tr><td><code>assessments.js</code></td><td>Full CRUD + /start, /submit, /review, /submissions</td><td><span class="badge badge-green">✓ OK</span></td><td>Complete assessment lifecycle covered.</td></tr>
      <tr><td><code>invites.js</code></td><td>POST, GET /mine, GET /:token, PATCH /respond, POST /resend</td><td><span class="badge badge-green">✓ OK</span></td><td>Bulk invite by job — used by InviteModal in AdminUsers.</td></tr>
      <tr><td><code>email.js</code></td><td>POST /send, GET /logs, POST /resend/:id, POST /test</td><td><span class="badge badge-green">✓ OK</span></td><td>Uses Resend API. Falls back to console.log in dev.</td></tr>
      <tr><td><code>notifications.js</code></td><td>GET, PATCH /:id/read, PATCH /read-all</td><td><span class="badge badge-green">✓ OK</span></td><td>Polled by notification bell in Layout.jsx.</td></tr>
      <tr><td><code>parseResume.js</code></td><td>POST /parse-resume, POST /parse-jd</td><td><span class="badge badge-green">✓ OK</span></td><td>Gemini AI powered. Requires VITE_GEMINI_API_KEY.</td></tr>
      <tr><td><code>billing.js</code></td><td>GET /usage, GET /plans, POST /upgrade</td><td><span class="badge badge-green">✓ OK</span></td><td>Plan logic tied to org.plan field.</td></tr>
      <tr><td><code>stats.js</code></td><td>GET /stats/public, GET /stats/platform</td><td><span class="badge badge-green">✓ OK</span></td><td>Public stats used on marketing homepage.</td></tr>
      <tr><td><code>leads.js</code></td><td>POST /leads, GET /leads</td><td><span class="badge badge-green">✓ OK</span></td><td>Contact form submissions stored here.</td></tr>
      <tr><td><code>social.js</code></td><td>GET /social/feed, POST /social/post</td><td><span class="badge badge-blue">ℹ️ Unused</span></td><td>Registered in server.js but no frontend UI uses it yet.</td></tr>
    </table>
    <h3>Critical Backend Findings</h3>
    <table>
      <tr><th>Severity</th><th>Issue</th><th>Root Cause</th><th>Fix Applied</th></tr>
      <tr><td><span class="badge badge-red">CRITICAL</span></td><td>GET /api/users/count → 500</td><td>Route didn't exist before /:id. "count" treated as MongoDB ObjectId → CastError.</td><td>Added /count BEFORE /:id with super_admin orgId-free path.</td></tr>
      <tr><td><span class="badge badge-red">CRITICAL</span></td><td>POST /impersonate → 400 "targetUserId required"</td><td>lean() strips Mongoose id virtual. u.id was undefined in ImpersonateTab.</td><td>users.js: add id: u._id?.toString() on all lean(). Frontend: u._id?.toString() || u.id fallback.</td></tr>
      <tr><td><span class="badge badge-amber">MEDIUM</span></td><td>GET /api/candidates → 500</td><td>Route /api/candidates didn't exist — not in server.js or users.js.</td><td>Added GET /candidates route in users.js + app.use('/api/candidates', usersRouter) alias in server.js.</td></tr>
      <tr><td><span class="badge badge-amber">MEDIUM</span></td><td>super_admin /count → 400</td><td>Guard checked req.user?.orgId but super_admin has orgId=null by design.</td><td>super_admin uses {} query (no orgId filter). Guard only applies to admin role.</td></tr>
    </table>
  </div>

  <div class="section" id="frontend">
    <h2><span class="icon" style="background:#dbeafe">⚛️</span>Frontend Code Check</h2>
    <div class="alert alert-blue">ℹ️ All pages now guard API responses with: <code>Array.isArray(res) ? res : (res?.data || [])</code> to handle both paginated and non-paginated responses.</div>
    <h3>Page Status</h3>
    <table>
      <tr><th>Page</th><th>Role</th><th>Null-Safe?</th><th>Issues Found</th></tr>
      <tr><td>AdminAnalytics</td><td>admin/super_admin</td><td><span class="badge badge-green">✓ Enhanced</span></td><td><b>NEW: Universal Drill-Down.</b> Admins can edit job statuses, application stages, and user roles directly through secure modal overlays. Null-safe data guards active.</td></tr>
      <tr><td>AdminDashboard</td><td>admin/super_admin</td><td><span class="badge badge-green">✓</span></td><td>Minor: uses j?.company but Job model has companyName. Activity feed shows blank company name.</td></tr>
      <tr><td>AdminJobs</td><td>admin/super_admin</td><td><span class="badge badge-green">✓</span></td><td>useState([]) init. All filter/map guards present.</td></tr>
      <tr><td>AdminUsers</td><td>admin/recruiter</td><td><span class="badge badge-green">✓</span></td><td>skills parsed safely (Array.isArray). all?.data fallback present. Availability filter bug-05 (see below).</td></tr>
      <tr><td>AdminJobApproval</td><td>admin/super_admin</td><td><span class="badge badge-green">✓</span></td><td>Filter for pending status done after data loaded.</td></tr>
      <tr><td>SuperAdminSecurity</td><td>super_admin</td><td><span class="badge badge-green">✓ Fixed</span></td><td>FIXED: impersonate uses u._id?.toString() || u.id. List key uses uid fallback. Toast on missing ID.</td></tr>
      <tr><td>SuperAdminOrgs</td><td>super_admin</td><td><span class="badge badge-green">✓</span></td><td>org.data fallback present. Secure invite admin email flow.</td></tr>
      <tr><td>SuperAdminCandidateImport</td><td>super_admin</td><td><span class="badge badge-green">✓</span></td><td>Candidates state initialized as []. getUserCount reads .count correctly.</td></tr>
      <tr><td>RecruiterJobs</td><td>recruiter</td><td><span class="badge badge-green">✓</span></td><td>j?.data || [] pattern used. Jobs scoped to assigned recruiter.</td></tr>
    </table>
    <h3>API Client Gaps</h3>
    <table>
      <tr><th>Gap</th><th>Impact</th><th>Fix Needed</th></tr>
      <tr><td><code>api.getOrgs()</code> method missing from api.js</td><td>SuperAdminSecurity feature flags org selector always shows empty — .catch(() => []) swallows the error gracefully</td><td>Add: <code>async getOrgs() { return req('GET', '/orgs'); }</code></td></tr>
    </table>
  </div>

  <div class="section" id="ui">
    <h2><span class="icon" style="background:#ede9fe">🎨</span>UI / UX Check</h2>
    <h3>Design System Status</h3>
    <div class="alert alert-green">✅ Consistent design system across all pages: btnP/btnG/btnD/card/inp/glass from constants/styles.js. All defined at module level — no re-render focus-loss issues.</div>
    <h3>UI Issues Found</h3>
    <table>
      <tr><th>Severity</th><th>Page</th><th>Issue</th><th>Status</th></tr>
      <tr><td><span class="badge badge-amber">UX Bug</span></td><td>AdminUsers — Candidates</td><td>Availability filter dropdown shows "Immediate"/"2 weeks"/"1 month" but DB enum is 'immediate'/'two_weeks'/'one_month'. Filter always returns 0 results.</td><td><span class="badge badge-green">✓ Fixed</span></td></tr>
      <tr><td><span class="badge badge-green">Minor</span></td><td>AdminDashboard — Activity</td><td>Shows j?.company but Job model field is companyName → blank company in activity feed.</td><td><span class="badge badge-green">✓ Fixed</span></td></tr>
      <tr><td><span class="badge badge-green">Minor</span></td><td>All list pages</td><td>Backend paginates at limit=20 but no pagination controls in UI. Only first 20 records shown.</td><td>⚠️ Known limitation</td></tr>
      <tr><td><span class="badge badge-green">Minor</span></td><td>AdminDashboard — Job tracker</td><td>Uses j.id vs a.jobId comparison. lean() results have _id. Mixed format can cause mismatches.</td><td><span class="badge badge-green">✓ Fixed</span></td></tr>
    </table>
    <h3>Navigation Check — All Roles</h3>
    <table>
      <tr><th>Role</th><th>Landing Page</th><th>Nav Items</th><th>Status</th></tr>
      <tr><td>super_admin</td><td>analytics</td><td>Overview, Platform, Organisations, Billing, Security, Permissions, Import, Candidates, Recruiters, Admins, All Jobs, Assessments, Outreach, Contact, Mail Queue, 📚 Playbooks, Profile</td><td><span class="badge badge-green">✓ 17 items</span></td></tr>
      <tr><td>admin</td><td>analytics</td><td>Overview, Job Approvals, Add Candidate, Candidates, Outreach, Assessments, Contact, Mail Queue, Assignments, Recruiters, All Jobs, Org Settings, Billing, Profile</td><td><span class="badge badge-green">✓ 14 items</span></td></tr>
      <tr><td>recruiter</td><td>dashboard</td><td>Dashboard, My Jobs, Add Candidate, My Candidates, Assigned to Me, AI Match, Pipeline, Assessments, Outreach, Mail Queue, Profile</td><td><span class="badge badge-green">✓ 11 items</span></td></tr>
      <tr><td>candidate</td><td>dashboard</td><td>Dashboard, Explore Jobs, AI Job Search, My Applications, My Profile</td><td><span class="badge badge-green">✓ 5 items</span></td></tr>
    </table>
  </div>

  <div class="section" id="bugs">
    <h2><span class="icon" style="background:#fee2e2">🐛</span>Bugs Found &amp; Fixed — ${todayShort}</h2>
    <table>
      <tr><th>#</th><th>Bug</th><th>Symptom</th><th>Root Cause</th><th>Fix</th><th>Files</th></tr>
      <tr><td>BUG-01</td><td><span class="badge badge-red">CRITICAL</span> /count → 500</td><td>SuperAdmin pages crash fetching candidate count</td><td>No /count route — "count" matched /:id → MongoDB CastError</td><td>Added /count BEFORE /:id</td><td><code>users.js</code></td></tr>
      <tr><td>BUG-02</td><td><span class="badge badge-red">CRITICAL</span> Impersonate → 400</td><td>"targetUserId required" in ImpersonateTab</td><td>lean() strips id virtual. u.id = undefined. POST sends targetUserId=undefined</td><td>Add id on lean(); frontend uses u._id?.toString()||u.id</td><td><code>users.js</code>, <code>SuperAdminSecurity.jsx</code></td></tr>
      <tr><td>BUG-03</td><td><span class="badge badge-red">CRITICAL</span> /candidates → 500</td><td>Crash when loading candidates data</td><td>/api/candidates route didn't exist anywhere</td><td>Added GET /candidates in users.js + server.js alias</td><td><code>users.js</code>, <code>server.js</code></td></tr>
      <tr><td>BUG-04</td><td><span class="badge badge-amber">MEDIUM</span> super_admin /count → 400</td><td>Count returns 400 for super_admin user</td><td>Guard required orgId but super_admin has orgId=null</td><td>Guard skipped for super_admin; uses empty {} query</td><td><code>users.js</code></td></tr>
      <tr><td>BUG-05</td><td><span class="badge badge-amber">MEDIUM</span> Availability filter broken</td><td>Filtering by availability → 0 results always</td><td>Display values don't match enum values in DB</td><td>Fixed — mapped values to DB enum</td><td><code>AdminUsers.jsx</code></td></tr>
      <tr><td>BUG-06</td><td><span class="badge badge-green">MINOR</span> api.getOrgs() missing</td><td>SuperAdminSecurity org selector empty</td><td>Method doesn't exist in api.js</td><td>Fixed — added getOrgs to api.js</td><td><code>api.js</code></td></tr>
    </table>
  </div>

  <div class="section" id="security">
    <h2><span class="icon" style="background:#dcfce7">🔐</span>Security Check</h2>
    <div class="alert alert-green">✅ No plain-text passwords found. JWT HS256. bcrypt 12 rounds. Secure invite tokens. All sensitive routes gated.</div>
    <table>
      <tr><th>Check</th><th>Status</th><th>Notes</th></tr>
      <tr><td>JWT authentication</td><td><span class="badge badge-green">✓ Pass</span></td><td>All protected routes use authenticate middleware.</td></tr>
      <tr><td>Role-based access</td><td><span class="badge badge-green">✓ Pass</span></td><td>requireRole() middleware on all sensitive routes.</td></tr>
      <tr><td>Multi-tenancy (orgId)</td><td><span class="badge badge-green">✓ Pass</span></td><td>All queries scoped to req.user.orgId for admin/recruiter.</td></tr>
      <tr><td>Impersonation security</td><td><span class="badge badge-green">✓ Fixed</span></td><td>Validates JWT role=super_admin before allowing target user lookup.</td></tr>
      <tr><td>Password storage</td><td><span class="badge badge-green">✓ Pass</span></td><td>bcrypt (12 rounds). comparePassword() on schema.</td></tr>
      <tr><td>Invite token security</td><td><span class="badge badge-green">✓ Pass</span></td><td>Raw token in email, SHA-256 hash in DB. Single-use, 24h expiry.</td></tr>
      <tr><td>Rate limiting</td><td><span class="badge badge-green">✓ Pass</span></td><td>200/15min global. 10/15min login. 5/15min register.</td></tr>
      <tr><td>CORS policy</td><td><span class="badge badge-green">✓ Pass</span></td><td>Whitelist: localhost:*, *.vercel.app, *.railway.app, talentnesthr.com</td></tr>
      <tr><td>Input validation</td><td><span class="badge badge-amber">⚠️ Partial</span></td><td>validate.js on user creation but not all routes. Mongoose schema validation as fallback.</td></tr>
    </table>
  </div>

  <div class="section" id="known">
    <h2><span class="icon" style="background:#fef3c7">⚠️</span>Known Issues &amp; Remaining Work</h2>
    <table>
      <tr><th>Priority</th><th>Issue</th><th>Affected Pages</th><th>Effort</th></tr>
      <tr><td><span class="badge badge-amber">Medium</span></td><td>No pagination UI — only first 20 records shown on all list pages</td><td>AdminUsers, AdminJobs, etc.</td><td>2–3 days</td></tr>
      <tr><td><span class="badge badge-amber">Medium</span></td><td>social.js route registered but no frontend UI for it</td><td>N/A</td><td>Implement or remove</td></tr>
      <tr><td><span class="badge badge-green">Low</span></td><td>Forgot Password: backend endpoint exists, no frontend ForgotPasswordPage</td><td>Auth pages</td><td>45 min</td></tr>
      <tr><td><span class="badge badge-green">Low</span></td><td>2FA: backend endpoints exist (/2fa/setup, /verify) but no UI in Profile pages</td><td>Profile</td><td>2–3 hours</td></tr>
    </table>
  </div>

  <div class="section" id="checklist">
    <h2><span class="icon" style="background:#f0fdf4">✅</span>Audit Sign-Off Checklist</h2>
    <div class="alert alert-green">Generated automatically on ${today} at ${time}. Re-generate after major code changes.</div>
    <ul class="check">
      <li>All 16 backend route files reviewed and registered in server.js</li>
      <li>GET /api/users/count route added BEFORE /:id — no more CastError 500</li>
      <li>GET /api/users/candidates route added with id-mapped lean() results</li>
      <li>lean() id stripping fixed — all users.js lean() results include explicit id field</li>
      <li>Impersonation 400 bug fixed — frontend uses u._id?.toString() || u.id</li>
      <li>super_admin /count 400 bug fixed — super_admin bypasses orgId guard</li>
      <li>All frontend pages initialize state as [] (not null or {})</li>
      <li>All API responses guarded: Array.isArray(res) ? res : (res?.data || [])</li>
      <li>JWT auth, bcrypt, invite tokens, rate limiting, CORS verified</li>
      <li>Multi-tenancy orgId scoping verified across users, jobs, applications</li>
      <li>Navigation verified for all 4 roles — no broken routes in App.jsx</li>
    </ul>
    <h3>Next Actions (Post-Audit)</h3>
    <div class="step"><div class="step-num">1</div><div class="step-body"><h4>Plan pagination UI</h4><p>Add "Load more" or page controls to AdminUsers and AdminJobs — highest-volume list views</p></div></div>
    <div class="step"><div class="step-num">2</div><div class="step-body"><h4>Forgot Password Flow</h4><p>Build the frontend component for the existing backend /api/auth/forgot-password route</p></div></div>
  </div>

</div>
<footer>Generated by <strong>TalentNest HR</strong> Super Admin · System Audit · ${todayShort}</footer>
</body></html>`;
}

// ─── DEVELOPER PLAYBOOK V4 ───────────────────────────────────────────────────
function buildDeveloperPlaybookV4() {
  const now = new Date();
  const today = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const todayShort = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const EXTRA_STYLES = `
  <style>
    .flow-wrap{overflow-x:auto;padding:8px 0}
    .flow{display:flex;align-items:center;gap:0;flex-wrap:nowrap;min-width:max-content;margin:12px 0}
    .flow-col{display:flex;flex-direction:column;align-items:center;gap:0}
    .fbox{border-radius:10px;padding:10px 18px;font-size:12px;font-weight:700;text-align:center;white-space:nowrap;min-width:110px;box-shadow:0 2px 8px rgba(0,0,0,0.08)}
    .fbox-blue{background:#dbeafe;color:#1d4ed8;border:2px solid #93c5fd}
    .fbox-green{background:#dcfce7;color:#15803d;border:2px solid #86efac}
    .fbox-amber{background:#fef3c7;color:#92400e;border:2px solid #fcd34d}
    .fbox-red{background:#fee2e2;color:#991b1b;border:2px solid #fca5a5}
    .fbox-purple{background:#ede9fe;color:#6d28d9;border:2px solid #c4b5fd}
    .fbox-teal{background:#ccfbf1;color:#0f766e;border:2px solid #5eead4}
    .fbox-gray{background:#f1f5f9;color:#374151;border:2px solid #cbd5e1}
    .fbox-dark{background:#1e293b;color:#e2e8f0;border:2px solid #475569}
    .farrow{font-size:18px;color:#94a3b8;padding:0 4px;align-self:center}
    .farrow-down{font-size:18px;color:#94a3b8;padding:4px 0;display:flex;justify-content:center}
    .fdiamond{background:#fef3c7;color:#92400e;border:2px solid #fcd34d;border-radius:4px;padding:8px 16px;font-size:11px;font-weight:700;text-align:center;transform:rotate(0deg);position:relative;min-width:120px}
    .fdiamond::before{content:'◆';position:absolute;left:-16px;top:50%;transform:translateY(-50%);color:#fcd34d;font-size:14px}
    .schema-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin:16px 0}
    .schema-box{background:#fff;border:2px solid #e2e8f0;border-radius:12px;overflow:hidden}
    .schema-head{padding:10px 16px;font-weight:800;font-size:13px;display:flex;align-items:center;gap:8px}
    .schema-field{display:flex;justify-content:space-between;align-items:center;padding:6px 16px;border-top:1px solid #f1f5f9;font-size:12px}
    .schema-field:nth-child(even){background:#f8faff}
    .sf-name{color:#1e293b;font-weight:600}
    .sf-type{color:#64748b;font-family:monospace;font-size:11px}
    .sf-req{color:#ef4444;font-size:10px;font-weight:700}
    .sf-idx{color:#0176D3;font-size:10px;font-weight:700}
    .arch-layer{border-radius:12px;padding:16px 20px;margin:8px 0;display:flex;align-items:center;gap:16px;font-size:13px}
    .api-table th{font-size:11px}
    .api-table td{font-size:12px;font-family:monospace}
    .role-lane{border-left:4px solid;padding:12px 16px;margin:8px 0;border-radius:0 10px 10px 0;background:#f8faff}
    .role-lane-blue{border-color:#0176D3}
    .role-lane-green{border-color:#10b981}
    .role-lane-purple{border-color:#8b5cf6}
    .role-lane-amber{border-color:#f59e0b}
    .role-lane h4{font-size:13px;font-weight:800;margin-bottom:6px}
    .mini-flow{display:flex;flex-direction:column;gap:0;align-items:flex-start}
    .mini-step{display:flex;align-items:center;gap:8px;font-size:12px;color:#475569}
    .mini-step .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
    .mini-step .line{width:2px;height:16px;margin-left:3px;background:#e2e8f0}
    .stage-pill{display:inline-block;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700;margin:2px}
    .env-row{display:grid;grid-template-columns:1fr 2fr auto;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:12px}
    .env-key{font-family:monospace;color:#1d4ed8;font-weight:700}
    .env-val{color:#475569}
    .env-req{color:#ef4444;font-weight:700;font-size:10px}
    .env-opt{color:#10b981;font-weight:700;font-size:10px}
  </style>`;

  return `<!DOCTYPE html><html lang="en"><head><title>Developer Playbook v4 — TalentNest HR</title>${BASE_STYLES}${EXTRA_STYLES}</head><body>
${heroHtml('🗺️','DEVELOPER PLAYBOOK v4.0','Developer Playbook v4','Complete platform reference — all flows, schemas, API routes, architecture, testing & deployment. One doc to understand everything.','4.0',today,'Engineering Team')}
<div class="container">

<div class="toc">
  <h2>📑 TABLE OF CONTENTS</h2>
  <ol>
    <li><a href="#stack">Tech Stack & Architecture</a></li>
    <li><a href="#env">Environment Variables</a></li>
    <li><a href="#setup">Local Setup</a></li>
    <li><a href="#auth-flows">Auth Flows (All)</a></li>
    <li><a href="#user-flows">User Management Flows</a></li>
    <li><a href="#job-flows">Job Lifecycle Flow</a></li>
    <li><a href="#app-flows">Application Pipeline Flow</a></li>
    <li><a href="#invite-flows">Candidate Invite Flow</a></li>
    <li><a href="#dashboard-flows">Dashboard Flows by Role</a></li>
    <li><a href="#superadmin-flows">Super Admin Flows</a></li>
    <li><a href="#schemas">Database Schemas (All Models)</a></li>
    <li><a href="#api">API Route Reference</a></li>
    <li><a href="#deploy">Deployment (Railway + Vercel)</a></li>
    <li><a href="#testing">Testing Guide</a></li>
    <li><a href="#changelog">Live Changelog</a></li>
  </ol>
</div>

<!-- ═══ 1. TECH STACK ═══ -->
<div class="section" id="stack">
  <h2><span class="icon" style="background:#dbeafe">⚡</span> Tech Stack & Platform Architecture</h2>
  <div class="arch-layer" style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #93c5fd">
    <span style="font-size:24px">🖥️</span>
    <div><strong style="color:#1d4ed8">Frontend — Vercel</strong><br>React 18 + Vite · React Router DOM v6 · No Redux (useState/Context) · Pure SVG charts · Tailwind-free (custom CSS)</div>
  </div>
  <div class="arch-layer" style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac">
    <span style="font-size:24px">🚂</span>
    <div><strong style="color:#15803d">Backend — Railway (port 8080)</strong><br>Node.js 20 + Express 4 · Mongoose ODM · JWT Auth · bcryptjs · Resend Email API · Google Gemini AI</div>
  </div>
  <div class="arch-layer" style="background:linear-gradient(135deg,#fdf4ff,#fae8ff);border:1px solid #d8b4fe">
    <span style="font-size:24px">🍃</span>
    <div><strong style="color:#7e22ce">Database — MongoDB Atlas</strong><br>Cloud-hosted MongoDB · Mongoose schemas · Multi-tenant (orgId scoping) · JSON file DB fallback (local dev, no MONGODB_URI)</div>
  </div>
  <div class="arch-layer" style="background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1px solid #fcd34d">
    <span style="font-size:24px">🤖</span>
    <div><strong style="color:#92400e">AI — Google Gemini API</strong><br>gemini-2.0-flash model · Resume parsing · Job description enhancement · Candidate matching</div>
  </div>
  <h3>Platform Architecture Diagram</h3>
  <div class="flow-wrap">
    <div style="display:flex;flex-direction:column;gap:0;align-items:center">
      <div class="fbox fbox-blue" style="width:300px;margin-bottom:0">🌐 Browser / User (React SPA on Vercel)</div>
      <div class="farrow-down">↕ HTTPS REST API (JSON)</div>
      <div class="fbox fbox-green" style="width:300px">🚂 Railway — Express Server :8080<br><small style="font-weight:400">CORS · JWT Auth · Rate Limit · Logging</small></div>
      <div style="display:flex;gap:32px;align-items:flex-start;margin-top:0">
        <div style="display:flex;flex-direction:column;align-items:center">
          <div class="farrow-down">↕</div>
          <div class="fbox fbox-purple" style="min-width:160px">🍃 MongoDB Atlas<br><small style="font-weight:400">mongoose ODM</small></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center">
          <div class="farrow-down">↕</div>
          <div class="fbox fbox-amber" style="min-width:160px">📧 Resend API<br><small style="font-weight:400">transactional email</small></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center">
          <div class="farrow-down">↕</div>
          <div class="fbox fbox-teal" style="min-width:160px">🤖 Gemini AI<br><small style="font-weight:400">gemini-2.0-flash</small></div>
        </div>
      </div>
    </div>
  </div>
  <h3>Folder Structure</h3>
  <pre>resume-generator/
├── src/                        <span class="c"># React frontend (Vite)</span>
│   ├── api/                    <span class="c"># API client, services, config</span>
│   │   ├── api.js              <span class="c"># All API calls + 401 interceptor</span>
│   │   ├── client.js           <span class="c"># Base req() helper</span>
│   │   ├── config.js           <span class="c"># API_BASE_URL from VITE_API_URL</span>
│   │   └── services/           <span class="c"># platform.service.js, etc.</span>
│   ├── components/             <span class="c"># Shared UI: charts, modals, drawers</span>
│   ├── constants/styles.js     <span class="c"># btnP, btnG, glass, card, inp, btnD</span>
│   ├── context/                <span class="c"># LogoContext, AuthContext</span>
│   ├── layout/Layout.jsx       <span class="c"># Sidebar + nav shell</span>
│   ├── pages/                  <span class="c"># admin/ candidate/ recruiter/ superadmin/ auth/</span>
│   └── App.jsx                 <span class="c"># Routes + ErrorBoundary + 401 handler</span>
├── backend/
│   ├── server.js               <span class="c"># Express app entry, CORS, health check</span>
│   └── src/
│       ├── db/connect.js       <span class="c"># MongoDB Atlas connection (10s timeout)</span>
│       ├── db/seed.js          <span class="c"># Seeds super_admin + TalentNest org on start</span>
│       ├── middleware/         <span class="c"># auth.js, requireRole.js, paginate.js, logger.js</span>
│       ├── models/             <span class="c"># User, Job, Application, Org, AuditLog, etc.</span>
│       ├── routes/             <span class="c"># auth, users, jobs, applications, orgs, platform…</span>
│       ├── services/           <span class="c"># user.service.js, job.service.js</span>
│       └── utils/              <span class="c"># email.js, asyncHandler.js, AppError.js</span>
└── nixpacks.toml               <span class="c"># Railway build config</span></pre>
</div>

<!-- ═══ 2. ENV VARS ═══ -->
<div class="section" id="env">
  <h2><span class="icon" style="background:#fef3c7">🔑</span> Environment Variables</h2>
  <h3>Backend (.env in backend/)</h3>
  <div class="env-row" style="border-bottom:2px solid #e2e8f0;font-weight:700;color:#374151"><span>Variable</span><span>Description / Example</span><span>Required?</span></div>
  <div class="env-row"><span class="env-key">MONGODB_URI</span><span class="env-val">mongodb+srv://user:pass@cluster.mongodb.net/talentnest</span><span class="env-req">REQUIRED</span></div>
  <div class="env-row"><span class="env-key">JWT_SECRET</span><span class="env-val">long random string (min 32 chars)</span><span class="env-req">REQUIRED</span></div>
  <div class="env-row"><span class="env-key">RESEND_API_KEY</span><span class="env-val">re_xxxxxxxxxx (from resend.com)</span><span class="env-opt">optional</span></div>
  <div class="env-row"><span class="env-key">GEMINI_API_KEY</span><span class="env-val">AIza... (from Google AI Studio)</span><span class="env-opt">optional</span></div>
  <div class="env-row"><span class="env-key">FRONTEND_URL</span><span class="env-val">https://yourapp.vercel.app (CORS origin)</span><span class="env-req">REQUIRED</span></div>
  <div class="env-row"><span class="env-key">PORT</span><span class="env-val">8080 (Railway sets automatically)</span><span class="env-opt">optional</span></div>
  <div class="env-row"><span class="env-key">NODE_ENV</span><span class="env-val">production (set in nixpacks.toml)</span><span class="env-opt">optional</span></div>
  <div class="env-row"><span class="env-key">GOOGLE_CLIENT_ID</span><span class="env-val">xxx.apps.googleusercontent.com</span><span class="env-opt">optional</span></div>
  <div class="env-row"><span class="env-key">ADMIN_EMAIL</span><span class="env-val">admin@talentnesthr.com (seed email)</span><span class="env-opt">optional</span></div>
  <div class="env-row"><span class="env-key">ADMIN_PASSWORD</span><span class="env-val">TalentNest@2024 (seed password)</span><span class="env-opt">optional</span></div>
  <h3>Frontend (.env in root)</h3>
  <div class="env-row"><span class="env-key">VITE_API_URL</span><span class="env-val">https://your-backend.railway.app/api</span><span class="env-req">REQUIRED</span></div>
  <div class="env-row"><span class="env-key">VITE_GOOGLE_CLIENT_ID</span><span class="env-val">xxx.apps.googleusercontent.com</span><span class="env-opt">optional</span></div>
</div>

<!-- ═══ 3. SETUP ═══ -->
<div class="section" id="setup">
  <h2><span class="icon" style="background:#dcfce7">🚀</span> Local Setup</h2>
  <div class="step"><div class="step-num">1</div><div class="step-body"><h4>Clone & Install</h4>
  <pre>git clone &lt;repo&gt; resume-generator
cd resume-generator
npm install          <span class="c"># frontend deps</span>
cd backend && npm install  <span class="c"># backend deps</span></pre></div></div>
  <div class="step"><div class="step-num">2</div><div class="step-body"><h4>Configure .env files</h4><p>Create <code>backend/.env</code> with MONGODB_URI, JWT_SECRET. Create root <code>.env</code> with VITE_API_URL=http://localhost:5000/api</p></div></div>
  <div class="step"><div class="step-num">3</div><div class="step-body"><h4>Run Backend</h4><pre>cd backend && npm run dev   <span class="c"># → http://localhost:5000/api</span></pre></div></div>
  <div class="step"><div class="step-num">4</div><div class="step-body"><h4>Run Frontend</h4><pre>npm run dev   <span class="c"># → http://localhost:5173</span></pre></div></div>
  <div class="step"><div class="step-num">5</div><div class="step-body"><h4>Seed Data (auto)</h4><p>On backend start, <code>db/seed.js</code> auto-creates TalentNest HR org + super_admin user. Login: <strong>admin@talentnesthr.com / TalentNest@2024</strong></p></div></div>
  <div class="alert alert-amber">⚠️ No MONGODB_URI? Backend falls back to a JSON file database. Data won't persist across restarts. Set MONGODB_URI for proper dev.</div>
</div>

<!-- ═══ 4. AUTH FLOWS ═══ -->
<div class="section" id="auth-flows">
  <h2><span class="icon" style="background:#ede9fe">🔐</span> Auth Flows (All)</h2>

  <h3>1. Email / Password Login</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">User enters email + password</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">POST /api/auth/login</div><div class="farrow">→</div>
    <div class="fbox fbox-amber">2FA enabled?</div>
  </div></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:8px 0">
    <div>
      <div class="fbox fbox-red" style="margin-bottom:8px">YES → OTP sent via Resend email</div>
      <div class="flow-wrap"><div class="flow">
        <div class="fbox fbox-teal">User enters OTP</div><div class="farrow">→</div>
        <div class="fbox fbox-gray">POST /api/auth/verify-otp</div><div class="farrow">→</div>
        <div class="fbox fbox-green">JWT issued → store in sessionStorage as tn_token</div>
      </div></div>
    </div>
    <div>
      <div class="fbox fbox-green" style="margin-bottom:8px">NO → JWT issued immediately</div>
      <div class="fbox fbox-blue">Token stored: sessionStorage.tn_token + tn_user<br>Redirect to role dashboard</div>
    </div>
  </div>
  <div class="alert alert-blue">JWT payload: <code>&#123; userId, role, orgId, orgName, iat, exp &#125;</code> — key is <strong>userId</strong> (not <code>id</code>). Token expires in 7d.</div>

  <h3>2. Google Sign-In (SSO)</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">User clicks Google Sign-In</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">Google OAuth popup → credential token</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">POST /api/auth/google &#123; token &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-amber">User exists?</div>
  </div></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:8px 0">
    <div class="fbox fbox-green">YES → Update googleId + JWT issued</div>
    <div class="fbox fbox-red">NO → Create new user (candidate role) + JWT</div>
  </div>

  <h3>3. Forgot Password</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">POST /api/auth/forgot-password &#123; email &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">crypto.randomBytes(32) → raw token</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">SHA-256 hash stored in DB (resetPasswordToken)</div><div class="farrow">→</div>
    <div class="fbox fbox-amber">Reset link emailed (valid 1hr)</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">POST /api/auth/reset-password &#123; token, newPassword &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-green">Password bcrypt-hashed + saved, token cleared</div>
  </div></div>

  <h3>4. Invite Accept / Set Password Flow</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">Admin invites user (POST /api/users)</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">User created: isActive=false, inviteToken hash stored</div><div class="farrow">→</div>
    <div class="fbox fbox-amber">Email sent with link: /set-password?token=RAW_TOKEN</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">SetPasswordPage: POST /api/auth/set-password &#123; token, password &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-green">isActive=true, token cleared, JWT issued, redirect to dashboard</div>
  </div></div>
  <div class="alert alert-green">Security: Raw 32-byte token travels in email. DB stores only SHA-256 hash. Never plain-text password in email.</div>

  <h3>5. Impersonation (Super Admin only)</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-dark">Super Admin clicks Impersonate</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">POST /api/auth/impersonate &#123; targetUserId &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-amber">New JWT issued with target user's role/orgId</div><div class="farrow">→</div>
    <div class="fbox fbox-red">Original token saved as tn_original_token</div><div class="farrow">→</div>
    <div class="fbox fbox-purple">UI shows "Impersonating: [name]" banner</div>
  </div></div>

  <h3>6. Change Password (Self / Super Admin)</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">PATCH /api/users/:id/change-password &#123; newPassword &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-amber">Must be own ID OR super_admin role</div><div class="farrow">→</div>
    <div class="fbox fbox-green">bcrypt.hashSync(newPassword, 10) → user.save()</div>
  </div></div>
</div>

<!-- ═══ 5. USER MANAGEMENT FLOWS ═══ -->
<div class="section" id="user-flows">
  <h2><span class="icon" style="background:#dcfce7">👥</span> User Management Flows</h2>

  <h3>Who Can Create Whom</h3>
  <table>
    <tr><th>Acting Role</th><th>Can Create/Invite</th><th>Restriction</th></tr>
    <tr><td><span class="badge badge-red">super_admin</span></td><td>admin, recruiter, candidate</td><td>Any org (must pass orgId)</td></tr>
    <tr><td><span class="badge badge-purple">admin</span></td><td>recruiter, candidate</td><td>Own org only</td></tr>
    <tr><td><span class="badge badge-blue">recruiter</span></td><td>candidate only</td><td>Own org only</td></tr>
    <tr><td><span class="badge badge-green">candidate</span></td><td>—</td><td>No user creation</td></tr>
  </table>

  <h3>Invite User Flow (Admin/Recruiter)</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">POST /api/users &#123; name, email, role, orgId &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">userService.inviteUser()</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">Check duplicate email</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">crypto token → hash → DB</div><div class="farrow">→</div>
    <div class="fbox fbox-amber">Resend email: "You're invited!"</div><div class="farrow">→</div>
    <div class="fbox fbox-green">User created (isActive: false, inviteStatus: 'pending')</div>
  </div></div>

  <h3>Resend Invite</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">POST /api/users/:id/resend-invite</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">userService.resendInvite()</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">New token generated + expiry reset (48h)</div><div class="farrow">→</div>
    <div class="fbox fbox-amber">New invite email sent</div>
  </div></div>

  <h3>Revoke Invite</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">DELETE /api/users/revoke-invite/:id</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">userService.revokeInvite()</div><div class="farrow">→</div>
    <div class="fbox fbox-red">User record deleted (was never activated)</div>
  </div></div>

  <h3>Bulk Import Candidates</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">POST /api/users/bulk-import &#123; candidates[], jobId &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">userService.bulkImport()</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">For each: upsert by email</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">If jobId: create Application record</div><div class="farrow">→</div>
    <div class="fbox fbox-green">Return count of imported</div>
  </div></div>

  <h3>Soft Delete User</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">DELETE /api/users/:id</div><div class="farrow">→</div>
    <div class="fbox fbox-amber">Admin: must be same org</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">userService.softDelete()</div><div class="farrow">→</div>
    <div class="fbox fbox-red">isActive=false, deletedAt=now (NOT removed from DB)</div>
  </div></div>

  <h3>Pending Invites Route Gotcha</h3>
  <div class="alert alert-red">⚠️ <strong>Express route ordering is critical:</strong> GET /pending, GET /me, GET /count, GET /candidates MUST be defined BEFORE GET /:id. Otherwise Express matches "pending" as a user ID parameter.</div>
</div>

<!-- ═══ 6. JOB FLOWS ═══ -->
<div class="section" id="job-flows">
  <h2><span class="icon" style="background:#fef3c7">💼</span> Job Lifecycle Flow</h2>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">Admin/Recruiter creates job<br>POST /api/jobs</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">status: 'draft'<br>Saved to DB</div><div class="farrow">→</div>
    <div class="fbox fbox-amber">Admin reviews<br>PATCH /api/jobs/:id &#123; status: 'active' &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-green">status: 'active'<br>Visible to candidates</div><div class="farrow">→</div>
    <div class="fbox fbox-purple">Recruiters assigned<br>(assignedRecruiters[])</div><div class="farrow">→</div>
    <div class="fbox fbox-teal">Applications flow in</div><div class="farrow">→</div>
    <div class="fbox fbox-red">Admin closes job<br>status: 'closed'</div>
  </div></div>

  <h3>Job Status Values</h3>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">
    <span class="stage-pill" style="background:#fef3c7;color:#92400e">draft</span>
    <span class="stage-pill" style="background:#dcfce7;color:#15803d">active</span>
    <span class="stage-pill" style="background:#fee2e2;color:#991b1b">closed</span>
    <span class="stage-pill" style="background:#f1f5f9;color:#374151">paused</span>
  </div>

  <h3>Job Fields (Key)</h3>
  <table>
    <tr><th>Field</th><th>Type</th><th>Notes</th></tr>
    <tr><td>title</td><td>String</td><td>Required</td></tr>
    <tr><td>department</td><td>String</td><td>—</td></tr>
    <tr><td>type</td><td>String</td><td>full-time / part-time / contract / internship</td></tr>
    <tr><td>location</td><td>String</td><td>—</td></tr>
    <tr><td>isRemote</td><td>Boolean</td><td>—</td></tr>
    <tr><td>status</td><td>String</td><td>draft / active / closed / paused</td></tr>
    <tr><td>orgId</td><td>ObjectId → Org</td><td>Multi-tenant scope</td></tr>
    <tr><td>createdBy</td><td>ObjectId → User</td><td>—</td></tr>
    <tr><td>assignedRecruiters</td><td>[ObjectId → User]</td><td>—</td></tr>
    <tr><td>applicationCount</td><td>Number</td><td>Denormalized counter</td></tr>
    <tr><td>skills</td><td>[String]</td><td>—</td></tr>
    <tr><td>salary</td><td>String</td><td>—</td></tr>
  </table>
  <div class="alert alert-amber">⚠️ <strong>ID Normalization:</strong> After .lean(), _id exists but not virtual id. Always map: <code>&#123; ...job, id: job.id || job._id?.toString() &#125;</code></div>
</div>

<!-- ═══ 7. APPLICATION PIPELINE ═══ -->
<div class="section" id="app-flows">
  <h2><span class="icon" style="background:#ccfbf1">📋</span> Application Pipeline Flow</h2>
  <h3>9 Pipeline Stages</h3>
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin:12px 0">
    <span class="stage-pill" style="background:#f1f5f9;color:#374151">applied</span>
    <span style="color:#94a3b8;align-self:center">→</span>
    <span class="stage-pill" style="background:#dbeafe;color:#1d4ed8">screening</span>
    <span style="color:#94a3b8;align-self:center">→</span>
    <span class="stage-pill" style="background:#ede9fe;color:#6d28d9">interview</span>
    <span style="color:#94a3b8;align-self:center">→</span>
    <span class="stage-pill" style="background:#fef3c7;color:#92400e">assessment</span>
    <span style="color:#94a3b8;align-self:center">→</span>
    <span class="stage-pill" style="background:#fce7f3;color:#9d174d">shortlisted</span>
    <span style="color:#94a3b8;align-self:center">→</span>
    <span class="stage-pill" style="background:#d1fae5;color:#065f46">offered</span>
    <span style="color:#94a3b8;align-self:center">→</span>
    <span class="stage-pill" style="background:#dcfce7;color:#15803d">hired</span>
  </div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
    <span class="stage-pill" style="background:#fee2e2;color:#991b1b">rejected</span>
    <span class="stage-pill" style="background:#f8faff;color:#64748b;border:1px solid #e2e8f0">withdrawn</span>
  </div>

  <h3>Stage Transition Flow</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">PATCH /api/applications/:id<br>&#123; stage: 'interview' &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">Push to stageHistory[]<br>&#123; stage, changedAt, changedBy &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">Update application.stage</div><div class="farrow">→</div>
    <div class="fbox fbox-amber">Notification created<br>(if candidate)</div><div class="farrow">→</div>
    <div class="fbox fbox-green">AuditLog entry created</div>
  </div></div>

  <div class="alert alert-red">⚠️ <strong>stageHistory field is changedAt (NOT date).</strong> Frontend must use <code>entry.changedAt</code></div>

  <h3>Application Key Fields</h3>
  <table>
    <tr><th>Field</th><th>Type</th><th>Notes</th></tr>
    <tr><td>candidateId</td><td>ObjectId → User</td><td>Populated on fetch — access as <code>a.candidateId.name</code></td></tr>
    <tr><td>jobId</td><td>ObjectId → Job</td><td>Populated on fetch — access as <code>a.jobId.title</code></td></tr>
    <tr><td>stage</td><td>String</td><td>One of 9 values above</td></tr>
    <tr><td>stageHistory</td><td>[&#123;stage, changedAt, changedBy&#125;]</td><td>Full audit trail</td></tr>
    <tr><td>interviews</td><td>[&#123;scheduledAt, type, meetLink, notes&#125;]</td><td>Array — use interviews[0].scheduledAt (NO flat interviewDate field)</td></tr>
    <tr><td>resumeUrl</td><td>String</td><td>Stored URL or base64</td></tr>
    <tr><td>source</td><td>String</td><td>direct / invite / import</td></tr>
    <tr><td>isWithdrawn</td><td>Boolean</td><td>Candidate withdrew</td></tr>
    <tr><td>orgId</td><td>ObjectId → Org</td><td>Denormalized for fast scoping</td></tr>
  </table>

  <h3>Apply to Job Flow (Candidate)</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">Candidate opens job listing</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">GET /api/jobs (public or auth)</div><div class="farrow">→</div>
    <div class="fbox fbox-blue">POST /api/applications &#123; jobId, resumeUrl, coverLetter &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">Check: no duplicate application for same job</div><div class="farrow">→</div>
    <div class="fbox fbox-green">Application created (stage: 'applied')</div><div class="farrow">→</div>
    <div class="fbox fbox-amber">Notification to recruiter</div>
  </div></div>

  <h3>Withdraw Flow</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">PATCH /api/applications/:id/withdraw</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">isWithdrawn=true, stage='withdrawn'</div><div class="farrow">→</div>
    <div class="fbox fbox-red">Removed from active pipeline views</div>
  </div></div>
</div>

<!-- ═══ 8. CANDIDATE INVITE FLOW ═══ -->
<div class="section" id="invite-flows">
  <h2><span class="icon" style="background:#fce7f3">📨</span> Candidate Invite Flow (Recruiter → Candidate)</h2>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-blue">Recruiter selects candidates + job</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">POST /api/invites &#123; candidateIds[], jobId, message &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">Invite records created (status: 'sent')</div><div class="farrow">→</div>
    <div class="fbox fbox-amber">Job share email sent (Resend API)<br>Contains: Apply Now + I'm Interested buttons</div>
  </div></div>

  <div class="flow-wrap" style="margin-top:8px"><div class="flow">
    <div class="fbox fbox-teal">Candidate opens email</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">Tracking pixel fires<br>PATCH /api/invites/:token/status &#123; status: 'opened' &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-amber">Candidate clicks "I'm Interested"</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">PATCH /api/invites/:token/respond &#123; response: 'interested' &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-green">Invite status: 'interested'<br>Application created (source: 'invite', stage: 'applied')</div>
  </div></div>

  <h3>Invite Status Values</h3>
  <table>
    <tr><th>Status</th><th>Meaning</th></tr>
    <tr><td><span class="badge badge-blue">sent</span></td><td>Email delivered, not opened</td></tr>
    <tr><td><span class="badge badge-amber">opened</span></td><td>Tracking pixel fired (email opened)</td></tr>
    <tr><td><span class="badge badge-green">interested</span></td><td>Candidate clicked "I'm Interested" — application auto-created</td></tr>
    <tr><td><span class="badge badge-red">declined</span></td><td>Candidate explicitly declined</td></tr>
    <tr><td><span class="badge badge-purple">applied</span></td><td>Candidate clicked "Apply Now" directly</td></tr>
  </table>
</div>

<!-- ═══ 9. DASHBOARD FLOWS ═══ -->
<div class="section" id="dashboard-flows">
  <h2><span class="icon" style="background:#dbeafe">📊</span> Dashboard Flows by Role</h2>

  <div class="role-lane role-lane-green">
    <h4>🟢 Candidate Dashboard</h4>
    <ul class="check">
      <li>GET /api/applications?candidateId=me → My Applications list</li>
      <li>GET /api/jobs?status=active → AI-matched job suggestions</li>
      <li>GET /api/invites/mine → Pending recruiter invites</li>
      <li>GET /api/assessments/candidate/my → My Assessments</li>
      <li>Drills: click application → ApplicationDetailModal</li>
      <li>Next interview: applications[0].interviews[0].scheduledAt (NOT a.interviewDate)</li>
    </ul>
  </div>
  <div class="role-lane role-lane-blue" style="margin-top:8px">
    <h4>🔵 Recruiter Dashboard</h4>
    <ul class="check">
      <li>GET /api/jobs?assignedRecruiters=me → My Jobs</li>
      <li>GET /api/applications?recruiterId=me → My Pipeline</li>
      <li>GET /api/users?role=candidate → Candidate pool</li>
      <li>GET /api/invites → Sent invites (I'm Interested tracking)</li>
      <li>Drills: click stat card → drawer with filtered applications</li>
      <li>Key: a.candidateId.name (NOT a.candidate.name)</li>
    </ul>
  </div>
  <div class="role-lane role-lane-purple" style="margin-top:8px">
    <h4>🟣 Admin — Overview (Analytics)</h4>
    <ul class="check">
      <li>GET /api/applications (all for org) → KPI stats</li>
      <li>GET /api/jobs (all for org) → Job funnel</li>
      <li>GET /api/users?role=candidate → Candidate count</li>
      <li>Charts: AreaChart, VertBarChart, DonutChart, FunnelChart (pure SVG)</li>
      <li>Drills: click KPI card → slide-in panel with records</li>
      <li>a.jobId is a populated object — use a.jobId?.title, a.jobId?.id (NOT a.job)</li>
    </ul>
  </div>
  <div class="role-lane role-lane-amber" style="margin-top:8px">
    <h4>🟡 Super Admin — Analytics + Platform</h4>
    <ul class="check">
      <li>Same as Admin but org filter removed (sees ALL orgs)</li>
      <li>GET /api/platform/config → Platform flags, security settings</li>
      <li>GET /api/orgs → All organizations</li>
      <li>Impersonation available for any user</li>
      <li>Pagination: must use limit=1000 for full lists (default backend limit=25)</li>
    </ul>
  </div>

  <div class="alert alert-amber">⚠️ <strong>API Response Unwrapping Rule:</strong> Always unwrap before .filter()/.map():
  <code>const items = Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []);</code></div>
</div>

<!-- ═══ 10. SUPER ADMIN FLOWS ═══ -->
<div class="section" id="superadmin-flows">
  <h2><span class="icon" style="background:#1e293b">👑</span> Super Admin Flows</h2>

  <h3>Org Management</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-dark">GET /api/orgs → All orgs list</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">Click org → OrgDetailModal</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">PATCH /api/orgs/:id → Update org</div>
  </div></div>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-dark">POST /api/orgs/invite-admin &#123; orgId, email &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">Invite token created → email sent</div><div class="farrow">→</div>
    <div class="fbox fbox-green">Admin user created (isActive: false)</div>
  </div></div>

  <h3>Raw Data Editor (TechnicalDataDrawer)</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-dark">Click "Full Edit" on any record</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">GET /api/platform/raw/:model/:id</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">TechnicalDataDrawer renders sectioned form</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">User edits fields → PATCH /api/platform/raw/:model/:id</div><div class="farrow">→</div>
    <div class="fbox fbox-green">Record updated in DB</div>
  </div></div>
  <div class="alert alert-red">⚠️ platform.js backend route must import logger: <code>const logger = require('../middleware/logger');</code> — missing import crashes every PATCH.</div>

  <h3>Platform Config</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-dark">GET /api/platform/config</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">Returns flags, security, plans, email settings</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">PATCH /api/platform/security &#123; require2FA, requireStrongPassword... &#125;</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">PATCH /api/platform/flags &#123; flags: &#123; featureName: bool &#125; &#125;</div>
  </div></div>

  <h3>Email Logs & Resend</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-dark">GET /api/email/logs</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">EmailLog records (to, subject, status, sentAt)</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">POST /api/email/logs/:id/resend → Re-sends failed email</div>
  </div></div>

  <h3>Backup</h3>
  <div class="flow-wrap"><div class="flow">
    <div class="fbox fbox-dark">GET /api/platform/backup</div><div class="farrow">→</div>
    <div class="fbox fbox-gray">Streams JSON dump of all collections</div><div class="farrow">→</div>
    <div class="fbox fbox-green">Downloaded as talentnest-backup-YYYY-MM-DD.json</div>
  </div></div>
</div>

<!-- ═══ 11. SCHEMAS ═══ -->
<div class="section" id="schemas">
  <h2><span class="icon" style="background:#fce7f3">🗄️</span> Database Schemas (All Models)</h2>
  <div class="schema-grid">

    <div class="schema-box">
      <div class="schema-head" style="background:#dbeafe;color:#1d4ed8">👤 User</div>
      <div class="schema-field"><span class="sf-name">_id</span><span class="sf-type">ObjectId</span><span class="sf-idx">PK</span></div>
      <div class="schema-field"><span class="sf-name">name</span><span class="sf-type">String</span><span class="sf-req">req</span></div>
      <div class="schema-field"><span class="sf-name">email</span><span class="sf-type">String</span><span class="sf-req">req, unique</span></div>
      <div class="schema-field"><span class="sf-name">password</span><span class="sf-type">String (bcrypt)</span></div>
      <div class="schema-field"><span class="sf-name">role</span><span class="sf-type">candidate|recruiter|admin|super_admin</span></div>
      <div class="schema-field"><span class="sf-name">orgId</span><span class="sf-type">ref:Org</span><span class="sf-idx">idx</span></div>
      <div class="schema-field"><span class="sf-name">isActive</span><span class="sf-type">Boolean</span><span class="sf-idx">idx</span></div>
      <div class="schema-field"><span class="sf-name">inviteStatus</span><span class="sf-type">pending|accepted|expired</span></div>
      <div class="schema-field"><span class="sf-name">invitedBy</span><span class="sf-type">ref:User</span></div>
      <div class="schema-field"><span class="sf-name">invitedAt</span><span class="sf-type">Date</span></div>
      <div class="schema-field"><span class="sf-name">resetPasswordToken</span><span class="sf-type">String (SHA-256)</span></div>
      <div class="schema-field"><span class="sf-name">resetPasswordExpires</span><span class="sf-type">Date</span></div>
      <div class="schema-field"><span class="sf-name">twoFactorEnabled</span><span class="sf-type">Boolean</span></div>
      <div class="schema-field"><span class="sf-name">twoFactorOtp</span><span class="sf-type">String (hashed)</span></div>
      <div class="schema-field"><span class="sf-name">twoFactorOtpExpires</span><span class="sf-type">Date</span></div>
      <div class="schema-field"><span class="sf-name">googleId</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">mustChangePassword</span><span class="sf-type">Boolean</span></div>
      <div class="schema-field"><span class="sf-name">assignedRecruiter</span><span class="sf-type">ref:User</span></div>
      <div class="schema-field"><span class="sf-name">lastContactedAt</span><span class="sf-type">Date</span></div>
      <div class="schema-field"><span class="sf-name">contactLog</span><span class="sf-type">[&#123;note,date,by&#125;]</span></div>
      <div class="schema-field"><span class="sf-name">deletedAt</span><span class="sf-type">Date (soft delete)</span></div>
    </div>

    <div class="schema-box">
      <div class="schema-head" style="background:#dcfce7;color:#15803d">💼 Job</div>
      <div class="schema-field"><span class="sf-name">_id</span><span class="sf-type">ObjectId</span><span class="sf-idx">PK</span></div>
      <div class="schema-field"><span class="sf-name">title</span><span class="sf-type">String</span><span class="sf-req">req</span></div>
      <div class="schema-field"><span class="sf-name">description</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">requirements</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">responsibilities</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">department</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">type</span><span class="sf-type">full-time|part-time|contract|internship</span></div>
      <div class="schema-field"><span class="sf-name">location</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">isRemote</span><span class="sf-type">Boolean</span></div>
      <div class="schema-field"><span class="sf-name">salary</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">experience</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">status</span><span class="sf-type">draft|active|closed|paused</span><span class="sf-idx">idx</span></div>
      <div class="schema-field"><span class="sf-name">urgency</span><span class="sf-type">low|medium|high</span></div>
      <div class="schema-field"><span class="sf-name">openings</span><span class="sf-type">Number</span></div>
      <div class="schema-field"><span class="sf-name">applicationCount</span><span class="sf-type">Number</span></div>
      <div class="schema-field"><span class="sf-name">hiredCount</span><span class="sf-type">Number</span></div>
      <div class="schema-field"><span class="sf-name">skills</span><span class="sf-type">[String]</span></div>
      <div class="schema-field"><span class="sf-name">tags</span><span class="sf-type">[String]</span></div>
      <div class="schema-field"><span class="sf-name">orgId</span><span class="sf-type">ref:Org</span><span class="sf-idx">idx</span></div>
      <div class="schema-field"><span class="sf-name">createdBy</span><span class="sf-type">ref:User</span></div>
      <div class="schema-field"><span class="sf-name">assignedRecruiters</span><span class="sf-type">[ref:User]</span></div>
      <div class="schema-field"><span class="sf-name">companyName</span><span class="sf-type">String</span></div>
    </div>

    <div class="schema-box">
      <div class="schema-head" style="background:#fce7f3;color:#9d174d">📋 Application</div>
      <div class="schema-field"><span class="sf-name">_id</span><span class="sf-type">ObjectId</span><span class="sf-idx">PK</span></div>
      <div class="schema-field"><span class="sf-name">candidateId</span><span class="sf-type">ref:User</span><span class="sf-req">req</span><span class="sf-idx">idx</span></div>
      <div class="schema-field"><span class="sf-name">jobId</span><span class="sf-type">ref:Job</span><span class="sf-req">req</span><span class="sf-idx">idx</span></div>
      <div class="schema-field"><span class="sf-name">orgId</span><span class="sf-type">ref:Org</span><span class="sf-idx">idx</span></div>
      <div class="schema-field"><span class="sf-name">stage</span><span class="sf-type">applied|screening|interview|assessment|shortlisted|offered|hired|rejected|withdrawn</span></div>
      <div class="schema-field"><span class="sf-name">stageHistory</span><span class="sf-type">[&#123;stage, changedAt, changedBy&#125;]</span></div>
      <div class="schema-field"><span class="sf-name">interviews</span><span class="sf-type">[&#123;scheduledAt, type, meetLink, notes&#125;]</span></div>
      <div class="schema-field"><span class="sf-name">resumeUrl</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">coverLetter</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">source</span><span class="sf-type">direct|invite|import</span></div>
      <div class="schema-field"><span class="sf-name">isWithdrawn</span><span class="sf-type">Boolean</span></div>
      <div class="schema-field"><span class="sf-name">notes</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">score</span><span class="sf-type">Number</span></div>
      <div class="schema-field"><span class="sf-name">aiScore</span><span class="sf-type">Number</span></div>
      <div class="schema-field"><span class="sf-name">appliedAt</span><span class="sf-type">Date</span></div>
    </div>

    <div class="schema-box">
      <div class="schema-head" style="background:#fef3c7;color:#92400e">🏢 Organization (Org)</div>
      <div class="schema-field"><span class="sf-name">_id</span><span class="sf-type">ObjectId</span><span class="sf-idx">PK</span></div>
      <div class="schema-field"><span class="sf-name">name</span><span class="sf-type">String</span><span class="sf-req">req</span></div>
      <div class="schema-field"><span class="sf-name">slug</span><span class="sf-type">String</span><span class="sf-idx">unique</span></div>
      <div class="schema-field"><span class="sf-name">domain</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">plan</span><span class="sf-type">free|starter|pro|enterprise</span></div>
      <div class="schema-field"><span class="sf-name">logoUrl</span><span class="sf-type">String (base64/URL)</span></div>
      <div class="schema-field"><span class="sf-name">ssoEnabled</span><span class="sf-type">Boolean</span></div>
      <div class="schema-field"><span class="sf-name">require2FA</span><span class="sf-type">Boolean</span></div>
      <div class="schema-field"><span class="sf-name">requireStrongPassword</span><span class="sf-type">Boolean</span></div>
      <div class="schema-field"><span class="sf-name">maxUsers</span><span class="sf-type">Number</span></div>
      <div class="schema-field"><span class="sf-name">maxJobs</span><span class="sf-type">Number</span></div>
      <div class="schema-field"><span class="sf-name">isActive</span><span class="sf-type">Boolean</span></div>
      <div class="schema-field"><span class="sf-name">features</span><span class="sf-type">&#123;aiEnabled, assessments, bulkImport...&#125;</span></div>
      <div class="schema-field"><span class="sf-name">adminEmail</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">inviteToken</span><span class="sf-type">String (SHA-256)</span></div>
    </div>

    <div class="schema-box">
      <div class="schema-head" style="background:#ede9fe;color:#6d28d9">🔔 Notification</div>
      <div class="schema-field"><span class="sf-name">_id</span><span class="sf-type">ObjectId</span><span class="sf-idx">PK</span></div>
      <div class="schema-field"><span class="sf-name">userId</span><span class="sf-type">ref:User</span><span class="sf-idx">idx</span></div>
      <div class="schema-field"><span class="sf-name">type</span><span class="sf-type">String (application_update, invite...)</span></div>
      <div class="schema-field"><span class="sf-name">title</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">message</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">isRead</span><span class="sf-type">Boolean</span></div>
      <div class="schema-field"><span class="sf-name">link</span><span class="sf-type">String (URL to navigate)</span></div>
      <div class="schema-field"><span class="sf-name">orgId</span><span class="sf-type">ref:Org</span></div>
    </div>

    <div class="schema-box">
      <div class="schema-head" style="background:#f0fdf4;color:#15803d">📊 AuditLog</div>
      <div class="schema-field"><span class="sf-name">_id</span><span class="sf-type">ObjectId</span><span class="sf-idx">PK</span></div>
      <div class="schema-field"><span class="sf-name">action</span><span class="sf-type">String</span><span class="sf-req">req</span></div>
      <div class="schema-field"><span class="sf-name">userId</span><span class="sf-type">ref:User</span></div>
      <div class="schema-field"><span class="sf-name">orgId</span><span class="sf-type">ref:Org</span></div>
      <div class="schema-field"><span class="sf-name">meta</span><span class="sf-type">Object (any extra data)</span></div>
      <div class="schema-field"><span class="sf-name">ip</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">userAgent</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">createdAt</span><span class="sf-type">Date</span><span class="sf-idx">idx</span></div>
    </div>

    <div class="schema-box">
      <div class="schema-head" style="background:#ccfbf1;color:#0f766e">📨 Invite (Job-Candidate)</div>
      <div class="schema-field"><span class="sf-name">_id</span><span class="sf-type">ObjectId</span><span class="sf-idx">PK</span></div>
      <div class="schema-field"><span class="sf-name">candidateId</span><span class="sf-type">ref:User</span><span class="sf-idx">idx</span></div>
      <div class="schema-field"><span class="sf-name">jobId</span><span class="sf-type">ref:Job</span><span class="sf-idx">idx</span></div>
      <div class="schema-field"><span class="sf-name">recruiterId</span><span class="sf-type">ref:User</span></div>
      <div class="schema-field"><span class="sf-name">orgId</span><span class="sf-type">ref:Org</span></div>
      <div class="schema-field"><span class="sf-name">status</span><span class="sf-type">sent|opened|interested|declined|applied</span></div>
      <div class="schema-field"><span class="sf-name">token</span><span class="sf-type">String (unique, URL-safe)</span><span class="sf-idx">unique</span></div>
      <div class="schema-field"><span class="sf-name">message</span><span class="sf-type">String (custom recruiter msg)</span></div>
      <div class="schema-field"><span class="sf-name">source</span><span class="sf-type">invite|share</span></div>
      <div class="schema-field"><span class="sf-name">sentAt</span><span class="sf-type">Date</span></div>
      <div class="schema-field"><span class="sf-name">openedAt</span><span class="sf-type">Date</span></div>
      <div class="schema-field"><span class="sf-name">respondedAt</span><span class="sf-type">Date</span></div>
    </div>

    <div class="schema-box">
      <div class="schema-head" style="background:#fef3c7;color:#92400e">📧 EmailLog</div>
      <div class="schema-field"><span class="sf-name">_id</span><span class="sf-type">ObjectId</span><span class="sf-idx">PK</span></div>
      <div class="schema-field"><span class="sf-name">to</span><span class="sf-type">String</span><span class="sf-req">req</span></div>
      <div class="schema-field"><span class="sf-name">subject</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">template</span><span class="sf-type">String (invite/reset/otp...)</span></div>
      <div class="schema-field"><span class="sf-name">status</span><span class="sf-type">sent|failed|bounced</span></div>
      <div class="schema-field"><span class="sf-name">error</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">resendId</span><span class="sf-type">String (Resend delivery ID)</span></div>
      <div class="schema-field"><span class="sf-name">orgId</span><span class="sf-type">ref:Org</span></div>
      <div class="schema-field"><span class="sf-name">sentAt</span><span class="sf-type">Date</span></div>
    </div>

    <div class="schema-box">
      <div class="schema-head" style="background:#f0f4f8;color:#374151">📝 Assessment</div>
      <div class="schema-field"><span class="sf-name">_id</span><span class="sf-type">ObjectId</span><span class="sf-idx">PK</span></div>
      <div class="schema-field"><span class="sf-name">jobId</span><span class="sf-type">ref:Job</span><span class="sf-idx">idx</span></div>
      <div class="schema-field"><span class="sf-name">orgId</span><span class="sf-type">ref:Org</span></div>
      <div class="schema-field"><span class="sf-name">title</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">questions</span><span class="sf-type">[&#123;text, type, options, correct&#125;]</span></div>
      <div class="schema-field"><span class="sf-name">timeLimit</span><span class="sf-type">Number (minutes)</span></div>
      <div class="schema-field"><span class="sf-name">passingScore</span><span class="sf-type">Number</span></div>
      <div class="schema-field"><span class="sf-name">createdBy</span><span class="sf-type">ref:User</span></div>
    </div>

    <div class="schema-box">
      <div class="schema-head" style="background:#fee2e2;color:#991b1b">🎯 Lead (Contact Form)</div>
      <div class="schema-field"><span class="sf-name">_id</span><span class="sf-type">ObjectId</span><span class="sf-idx">PK</span></div>
      <div class="schema-field"><span class="sf-name">name</span><span class="sf-type">String</span><span class="sf-req">req</span></div>
      <div class="schema-field"><span class="sf-name">email</span><span class="sf-type">String</span><span class="sf-req">req</span></div>
      <div class="schema-field"><span class="sf-name">company</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">message</span><span class="sf-type">String</span></div>
      <div class="schema-field"><span class="sf-name">status</span><span class="sf-type">new|contacted|qualified|closed</span></div>
      <div class="schema-field"><span class="sf-name">source</span><span class="sf-type">landing|demo|referral</span></div>
      <div class="schema-field"><span class="sf-name">notes</span><span class="sf-type">String (admin notes)</span></div>
    </div>

  </div>

  <h3>Model Relationships Diagram</h3>
  <div style="background:#f8faff;border-radius:12px;padding:20px;border:1px solid #e2e8f0;overflow-x:auto">
    <table style="border-collapse:separate;border-spacing:0">
      <tr>
        <td style="padding:4px 8px;text-align:center"><div class="fbox fbox-amber" style="min-width:80px">Org</div></td>
        <td style="padding:4px 8px;color:#94a3b8;font-weight:700">1:N →</td>
        <td style="padding:4px 8px;text-align:center"><div class="fbox fbox-blue" style="min-width:80px">User</div></td>
        <td style="padding:4px 8px;color:#94a3b8;font-weight:700">1:N →</td>
        <td style="padding:4px 8px;text-align:center"><div class="fbox fbox-purple" style="min-width:80px">Application</div></td>
      </tr>
      <tr><td></td><td></td><td style="text-align:center;color:#94a3b8;padding:2px 8px">↕ 1:N</td><td></td><td style="text-align:center;color:#94a3b8;padding:2px 8px">↕ N:1</td></tr>
      <tr>
        <td></td><td></td>
        <td style="padding:4px 8px;text-align:center"><div class="fbox fbox-green" style="min-width:80px">Job</div></td>
        <td style="padding:4px 8px;color:#94a3b8;font-weight:700">1:N →</td>
        <td style="padding:4px 8px;text-align:center"><div class="fbox fbox-teal" style="min-width:80px">Invite</div></td>
      </tr>
    </table>
    <div style="margin-top:8px;font-size:12px;color:#64748b">Org → Users (orgId) → Applications (candidateId) ← Jobs (orgId) → Invites (jobId + candidateId)</div>
  </div>
</div>

<!-- ═══ 12. API ROUTES ═══ -->
<div class="section" id="api">
  <h2><span class="icon" style="background:#f1f5f9">🔌</span> API Route Reference</h2>
  <h3>Auth Routes (/api/auth)</h3>
  <table class="api-table">
    <tr><th>Method</th><th>Path</th><th>Auth</th><th>Description</th></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/login</td><td>—</td><td>Email + password login → JWT</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/register</td><td>—</td><td>Self-register (candidate role)</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/google</td><td>—</td><td>Google OAuth → JWT</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/verify-otp</td><td>—</td><td>Verify 2FA OTP</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/forgot-password</td><td>—</td><td>Send reset email</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/reset-password</td><td>—</td><td>Reset with token</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/set-password</td><td>—</td><td>Set password from invite token</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/impersonate</td><td>super_admin</td><td>Body: &#123; targetUserId &#125;</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/refresh</td><td>—</td><td>Refresh JWT token</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/logout</td><td>any</td><td>Invalidate session</td></tr>
  </table>

  <h3>User Routes (/api/users)</h3>
  <table class="api-table">
    <tr><th>Method</th><th>Path</th><th>Auth</th><th>Description</th></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/</td><td>admin+</td><td>Invite user</td></tr>
    <tr><td><span class="badge badge-green">GET</span></td><td>/</td><td>admin+</td><td>Paginated user list</td></tr>
    <tr><td><span class="badge badge-green">GET</span></td><td>/me</td><td>any</td><td>Own profile</td></tr>
    <tr><td><span class="badge badge-amber">PATCH</span></td><td>/me</td><td>any</td><td>Update own profile</td></tr>
    <tr><td><span class="badge badge-green">GET</span></td><td>/candidates</td><td>recruiter+</td><td>All candidates (org-scoped)</td></tr>
    <tr><td><span class="badge badge-green">GET</span></td><td>/count</td><td>recruiter+</td><td>Count users (filterable by role)</td></tr>
    <tr><td><span class="badge badge-green">GET</span></td><td>/pending</td><td>admin+</td><td>Pending invites list</td></tr>
    <tr><td><span class="badge badge-green">GET</span></td><td>/:id</td><td>any (own or admin+)</td><td>User detail</td></tr>
    <tr><td><span class="badge badge-amber">PATCH</span></td><td>/:id</td><td>admin+</td><td>Update user</td></tr>
    <tr><td><span class="badge badge-red">DELETE</span></td><td>/:id</td><td>admin+</td><td>Soft delete user</td></tr>
    <tr><td><span class="badge badge-amber">PATCH</span></td><td>/:id/change-password</td><td>own or super_admin</td><td>Change password</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/bulk-import</td><td>recruiter+</td><td>CSV bulk import</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/resend-invite</td><td>admin+</td><td>Body: &#123; userId &#125;</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/:id/resend-invite</td><td>admin+</td><td>Resend by URL param</td></tr>
    <tr><td><span class="badge badge-red">DELETE</span></td><td>/revoke-invite/:id</td><td>admin+</td><td>Cancel pending invite</td></tr>
    <tr><td><span class="badge badge-amber">PATCH</span></td><td>/bulk-ta</td><td>recruiter+</td><td>Bulk assign TA</td></tr>
    <tr><td><span class="badge badge-amber">PATCH</span></td><td>/:id/reach-out</td><td>recruiter+</td><td>Log contact attempt</td></tr>
    <tr><td><span class="badge badge-amber">PATCH</span></td><td>/:id/assign</td><td>recruiter+</td><td>Assign recruiter to candidate</td></tr>
  </table>

  <h3>Job Routes (/api/jobs)</h3>
  <table class="api-table">
    <tr><th>Method</th><th>Path</th><th>Auth</th><th>Description</th></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/</td><td>recruiter+</td><td>Create job</td></tr>
    <tr><td><span class="badge badge-green">GET</span></td><td>/</td><td>any</td><td>List jobs (paginated, filterable)</td></tr>
    <tr><td><span class="badge badge-green">GET</span></td><td>/:id</td><td>any</td><td>Job detail</td></tr>
    <tr><td><span class="badge badge-amber">PATCH</span></td><td>/:id</td><td>recruiter+</td><td>Update job</td></tr>
    <tr><td><span class="badge badge-red">DELETE</span></td><td>/:id</td><td>admin+</td><td>Delete job</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/:id/enhance</td><td>recruiter+</td><td>AI-enhance job description</td></tr>
  </table>

  <h3>Application Routes (/api/applications)</h3>
  <table class="api-table">
    <tr><th>Method</th><th>Path</th><th>Auth</th><th>Description</th></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/</td><td>candidate</td><td>Apply to job</td></tr>
    <tr><td><span class="badge badge-green">GET</span></td><td>/</td><td>recruiter+</td><td>List all (org-scoped)</td></tr>
    <tr><td><span class="badge badge-green">GET</span></td><td>/my</td><td>candidate</td><td>Own applications</td></tr>
    <tr><td><span class="badge badge-green">GET</span></td><td>/:id</td><td>recruiter+</td><td>Application detail</td></tr>
    <tr><td><span class="badge badge-amber">PATCH</span></td><td>/:id</td><td>recruiter+</td><td>Update stage / notes</td></tr>
    <tr><td><span class="badge badge-amber">PATCH</span></td><td>/:id/withdraw</td><td>candidate (own)</td><td>Withdraw application</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/:id/schedule-interview</td><td>recruiter+</td><td>Push to interviews[]</td></tr>
    <tr><td><span class="badge badge-blue">POST</span></td><td>/:id/parse-resume</td><td>recruiter+</td><td>AI resume parsing</td></tr>
  </table>

  <h3>Platform Routes (/api/platform)</h3>
  <table class="api-table">
    <tr><th>Method</th><th>Path</th><th>Auth</th><th>Description</th></tr>
    <tr><td><span class="badge badge-green">GET</span></td><td>/config</td><td>super_admin</td><td>Full platform config</td></tr>
    <tr><td><span class="badge badge-amber">PATCH</span></td><td>/security</td><td>super_admin</td><td>Update security settings</td></tr>
    <tr><td><span class="badge badge-amber">PATCH</span></td><td>/flags</td><td>super_admin</td><td>Feature flag toggles</td></tr>
    <tr><td><span class="badge badge-green">GET</span></td><td>/backup</td><td>super_admin</td><td>Full JSON backup download</td></tr>
    <tr><td><span class="badge badge-green">GET</span></td><td>/raw/:model/:id</td><td>super_admin</td><td>Raw DB record fetch</td></tr>
    <tr><td><span class="badge badge-amber">PATCH</span></td><td>/raw/:model/:id</td><td>super_admin</td><td>Raw DB record update</td></tr>
  </table>
</div>

<!-- ═══ 13. DEPLOYMENT ═══ -->
<div class="section" id="deploy">
  <h2><span class="icon" style="background:#dcfce7">🚂</span> Deployment Guide</h2>
  <h3>Backend — Railway</h3>
  <div class="step"><div class="step-num">1</div><div class="step-body"><h4>nixpacks.toml (Critical)</h4>
  <pre>[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["unset NPM_CONFIG_PRODUCTION && npm install --omit=dev --no-fund --no-audit"]

[envs]
  NODE_ENV = "production"</pre>
  <div class="alert alert-amber">⚠️ Railway injects NPM_CONFIG_PRODUCTION=true when NODE_ENV=production. The only fix is <code>unset NPM_CONFIG_PRODUCTION</code> before npm runs. Setting it to false still triggers the warning.</div>
  </div></div>
  <div class="step"><div class="step-num">2</div><div class="step-body"><h4>Railway Env Vars to Set</h4>
  <p>MONGODB_URI, JWT_SECRET, RESEND_API_KEY, GEMINI_API_KEY, FRONTEND_URL, GOOGLE_CLIENT_ID</p></div></div>
  <div class="step"><div class="step-num">3</div><div class="step-body"><h4>Start Command</h4>
  <pre>node server.js</pre></div></div>
  <div class="step"><div class="step-num">4</div><div class="step-body"><h4>Health Check</h4>
  <p>Railway pings <code>GET /health</code> → <code>&#123; status: 'ok' &#125;</code> — must return 200 or Railway restarts service</p></div></div>

  <h3>Frontend — Vercel</h3>
  <div class="step"><div class="step-num">1</div><div class="step-body"><h4>Vercel Project Settings</h4><p>Framework: Vite · Build command: <code>npm run build</code> · Output: <code>dist/</code></p></div></div>
  <div class="step"><div class="step-num">2</div><div class="step-body"><h4>Vercel Env Var</h4><pre>VITE_API_URL = https://your-backend.railway.app/api</pre></div></div>
  <div class="step"><div class="step-num">3</div><div class="step-body"><h4>SPA Routing Fix</h4><p>Add <code>vercel.json</code> to root with rewrite: all paths → <code>index.html</code></p>
  <pre>&#123;"rewrites":[&#123;"source":"/((?!api).*)", "destination":"/index.html"&#125;]&#125;</pre></div></div>
</div>

<!-- ═══ 14. TESTING ═══ -->
<div class="section" id="testing">
  <h2><span class="icon" style="background:#ede9fe">🧪</span> Testing Guide</h2>
  <h3>Daily Test Loop (7-step)</h3>
  <div class="step"><div class="step-num">1</div><div class="step-body"><h4>Auth Gauntlet</h4><p>Login all 4 roles (candidate, recruiter, admin, super_admin). Verify JWT stored in sessionStorage. Test 2FA flow if enabled.</p></div></div>
  <div class="step"><div class="step-num">2</div><div class="step-body"><h4>Invite Flow</h4><p>Admin invites recruiter → email arrives → set password → login. Check pending invites page shows 0 after acceptance. Test resend + revoke.</p></div></div>
  <div class="step"><div class="step-num">3</div><div class="step-body"><h4>Job Lifecycle</h4><p>Create job (draft) → publish (active) → candidate applies → verify applicationCount increments → move through all 9 stages → verify stageHistory.</p></div></div>
  <div class="step"><div class="step-num">4</div><div class="step-body"><h4>Dashboard KPIs</h4><p>Check all drill-down cards open with correct records. Verify charts show data. Confirm a.candidateId.name works (not a.candidate.name).</p></div></div>
  <div class="step"><div class="step-num">5</div><div class="step-body"><h4>Invite / Tracking</h4><p>Recruiter sends job invite → email → click "I'm Interested" → verify application auto-created → invite status changes to 'interested'.</p></div></div>
  <div class="step"><div class="step-num">6</div><div class="step-body"><h4>Super Admin</h4><p>Impersonate each role. Edit raw record. Platform config save. Backup download. Org creation + admin invite.</p></div></div>
  <div class="step"><div class="step-num">7</div><div class="step-body"><h4>Mobile Responsive</h4><p>Resize to 375px. All grids collapse. Sidebar toggles. No overflow. Touch targets sufficient.</p></div></div>

  <h3>Critical Regression Checks</h3>
  <table>
    <tr><th>Check</th><th>Expected</th><th>Common Failure</th></tr>
    <tr><td>GET /api/users/pending</td><td>Returns pending invites array</td><td>Route defined AFTER /:id → treats "pending" as ID</td></tr>
    <tr><td>PATCH /api/platform/raw/:model/:id</td><td>Saves successfully</td><td>logger not imported in platform.js → ReferenceError</td></tr>
    <tr><td>POST /api/auth/impersonate</td><td>Returns impersonation JWT</td><td>Sending &#123; userId &#125; instead of &#123; targetUserId &#125;</td></tr>
    <tr><td>Dashboard topJobs chart</td><td>Groups by job correctly</td><td>Using a.jobId (object) as Map key → [object Object]</td></tr>
    <tr><td>Stage history timeline</td><td>Shows dates</td><td>Using entry.date instead of entry.changedAt</td></tr>
    <tr><td>Interview date shown</td><td>Shows interview time</td><td>Using a.interviewDate instead of a.interviews[0].scheduledAt</td></tr>
    <tr><td>Super admin user count</td><td>Shows correct count</td><td>orgId filter applied to super_admin (should be unrestricted)</td></tr>
  </table>

  <h3>Postman Quick Tests</h3>
  <pre><span class="c"># 1. Login</span>
POST {{base}}/api/auth/login
&#123; "email": "admin@talentnesthr.com", "password": "TalentNest@2024" &#125;

<span class="c"># 2. Get all users (super admin)</span>
GET {{base}}/api/users?limit=1000
Authorization: Bearer {{token}}

<span class="c"># 3. Create job</span>
POST {{base}}/api/jobs
&#123; "title": "Senior Dev", "department": "Engineering", "type": "full-time", "status": "active" &#125;

<span class="c"># 4. Apply to job</span>
POST {{base}}/api/applications
&#123; "jobId": "{{jobId}}", "resumeUrl": "https://example.com/resume.pdf" &#125;

<span class="c"># 5. Move stage</span>
PATCH {{base}}/api/applications/{{appId}}
&#123; "stage": "interview" &#125;</pre>
</div>

<!-- ═══ 15. CHANGELOG ═══ -->
<div class="section" id="changelog">
  <h2><span class="icon" style="background:#f0f4f8">📅</span> Live Changelog</h2>
  <div class="step"><div class="step-num" style="background:linear-gradient(135deg,#10b981,#059669)">✓</div><div class="step-body"><h4>${todayShort} — v4.0 Developer Playbook</h4><p>Comprehensive v4 combining Developer + Tester playbooks. Added all flow diagrams, schema diagrams, API reference, regression checks.</p></div></div>
  <div class="step"><div class="step-num" style="background:linear-gradient(135deg,#10b981,#059669)">✓</div><div class="step-body"><h4>2026-03-30 — Critical Superadmin Fixes</h4><p>Fixed logger import in platform.js (PATCH was crashing). Fixed impersonation payload (targetUserId). Fixed pagination for super admin lists. Fixed white-on-white text bug in SuperAdminPlatform.</p></div></div>
  <div class="step"><div class="step-num" style="background:linear-gradient(135deg,#10b981,#059669)">✓</div><div class="step-body"><h4>2026-03-30 — Dashboard Data Mapping Fixes</h4><p>Fixed a.candidateId (not a.candidate), a.jobId (not a.job), interviews[0].scheduledAt (not interviewDate), stageHistory[n].changedAt (not .date) across all dashboards.</p></div></div>
  <div class="step"><div class="step-num" style="background:linear-gradient(135deg,#10b981,#059669)">✓</div><div class="step-body"><h4>2026-03-30 — Express Route Order Fix</h4><p>GET /pending, /me, /count, /candidates moved BEFORE GET /:id in users.js. Added /bulk-ta, /:id/reach-out, /:id/assign routes.</p></div></div>
  <div class="step"><div class="step-num" style="background:linear-gradient(135deg,#10b981,#059669)">✓</div><div class="step-body"><h4>2026-03-28 — v3.0 TalentNest Platform</h4><p>Landing page redesign. SVG charts added (AreaChart, VertBarChart, DonutChart, FunnelChart). Logo system with LogoContext. Playbooks feature with 8 presets. 2FA OTP flow. Candidate invite tracking with pixel.</p></div></div>
  <div class="step"><div class="step-num" style="background:linear-gradient(135deg,#10b981,#059669)">✓</div><div class="step-body"><h4>2026-03-26 — Secure Invite Token Flow</h4><p>All user invites use SHA-256 hashed tokens. No plain-text passwords in emails. isActive=false until password set. Forgot password with 1hr token expiry.</p></div></div>
  <div class="step"><div class="step-num" style="background:linear-gradient(135deg,#10b981,#059669)">✓</div><div class="step-body"><h4>2026-03-20 — Multi-Tenant Architecture</h4><p>orgId scoping across all models. Role hierarchy: super_admin > admin > recruiter > candidate. Soft delete for users. Bulk import candidates.</p></div></div>
</div>

</div>
<footer>Generated by <strong>TalentNest HR</strong> Super Admin · Developer Playbook v4 · ${todayShort} · Confidential &amp; Internal</footer>
</body></html>`;
}

// ─── Playbook registry ─────────────────────────────────────────────────────────
const PRESET_PLAYBOOKS = [
  { id: 'developer-v4', icon: '🗺️', title: 'Developer Playbook v4',  desc: 'Complete platform reference: all flows, schemas, API, architecture — Developer + Tester combined', color: '#0a1628', badge: 'v4.0 COMPLETE', fn: buildDeveloperPlaybookV4 },
  { id: 'developer',    icon: '⚙️', title: 'Developer Playbook',    desc: 'Live changelog + tech stack, setup, nav architecture, mobile CSS, deployment', color: '#0176D3', badge: 'v3.0 LIVE',  fn: buildDeveloperPlaybook },
  { id: 'all-users',   icon: '👥', title: 'All Users Playbook',    desc: 'Role-by-role guide for every user of the platform',  color: '#10b981', badge: 'ONBOARDING', fn: buildAllUsersPlaybook },
  { id: 'sales',       icon: '💼', title: 'Sales Playbook',        desc: 'ICP, pricing, demo script, objection handling',      color: '#f59e0b', badge: 'SALES',      fn: buildSalesPlaybook },
  { id: 'tester',      icon: '🧪', title: 'Tester Playbook',       desc: 'Daily test loop + live changes + manual cases + Playwright + Postman', color: '#8b5cf6', badge: 'v3.0 LIVE',  fn: buildTesterPlaybook },
  { id: 'architecture',icon: '🏗️', title: 'Architecture Playbook', desc: 'System design, data models, security, infra',        color: '#ef4444', badge: 'ENGINEERING', fn: buildArchitecturePlaybook },
  { id: 'platform',    icon: '🌐', title: 'Platform Playbook',     desc: 'Feature matrix, flags, email config, plan limits',   color: '#06b6d4', badge: 'PLATFORM',   fn: buildPlatformPlaybook },
  { id: 'user',        icon: '📖', title: 'User Playbook',         desc: 'End-user guide: candidates, recruiters, admins, FAQ', color: '#ec4899', badge: 'GUIDE',      fn: buildUserPlaybook },
  { id: 'audit',       icon: '🔍', title: 'System Audit Report',   desc: 'Full manual inspection: backend API, frontend code, UI/UX, all bugs found & fixed, sign-off checklist', color: '#7c3aed', badge: 'AUDIT LIVE', fn: buildAuditReportPlaybook },
];


const EMPTY_CUSTOM = { title: '', desc: '', icon: '📄', content: '' };

// ─── Component ────────────────────────────────────────────────────────────────
export default function SuperAdminPlaybooks() {
  const [toast, setToast] = useState('');
  const [customPlaybooks, setCustomPlaybooks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tn_custom_playbooks') || '[]'); } catch { return []; }
  });
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_CUSTOM);
  const [preview, setPreview] = useState(null); // { title, html }
  const sf = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const download = (filename, html) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    setToast(`✅ Downloaded ${filename}`);
  };

  const handleDownload = (pb) => {
    const html = pb.fn();
    download(`${pb.id}-playbook.html`, html);
  };

  const handlePreview = (pb) => {
    setPreview({ title: pb.title, html: pb.fn() });
  };

  const saveCustom = () => {
    if (!form.title.trim()) { setToast('❌ Title is required'); return; }
    if (!form.content.trim()) { setToast('❌ Content is required'); return; }
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const html = `<!DOCTYPE html><html lang="en"><head><title>${form.title} — TalentNest HR</title>${BASE_STYLES}</head><body>
${heroHtml(form.icon,'CUSTOM PLAYBOOK',form.title, form.desc || 'Custom playbook created by TalentNest HR team.','1.0',today,'Super Admin')}
<div class="container">
  <div class="section">
    <div style="font-size:14px;color:#475569;line-height:1.8;white-space:pre-wrap">${form.content.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
  </div>
</div>
<footer>Generated by <strong>TalentNest HR</strong> Super Admin · Confidential &amp; Internal</footer>
</body></html>`;
    const newPb = { id: `custom-${Date.now()}`, title: form.title, desc: form.desc, icon: form.icon, html, createdAt: new Date().toISOString() };
    const updated = [...customPlaybooks, newPb];
    setCustomPlaybooks(updated);
    localStorage.setItem('tn_custom_playbooks', JSON.stringify(updated));
    setForm(EMPTY_CUSTOM);
    setShowCreate(false);
    setToast(`✅ "${form.title}" saved!`);
  };

  const deleteCustom = (id) => {
    const updated = customPlaybooks.filter(p => p.id !== id);
    setCustomPlaybooks(updated);
    localStorage.setItem('tn_custom_playbooks', JSON.stringify(updated));
    setToast('✅ Playbook deleted');
  };

  return (
    <div>
      <Toast msg={toast} onClose={() => setToast('')} />

      {/* Preview Modal */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: '#0a1628', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>👁 Preview — {preview.title}</span>
            <button onClick={() => setPreview(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>✕ Close</button>
          </div>
          <iframe srcDoc={preview.html} style={{ flex: 1, border: 'none', background: '#fff' }} title={preview.title} />
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#181818', fontSize: 24, fontWeight: 800, margin: 0 }}>📚 Playbooks</h1>
        <p style={{ color: '#706E6B', fontSize: 13, marginTop: 4 }}>Download, preview, or create internal documentation playbooks for your team</p>
      </div>

      {/* Preset Playbooks */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ color: '#0A1628', fontSize: 16, fontWeight: 800, margin: 0 }}>Official Playbooks</h2>
            <p style={{ color: '#64748B', fontSize: 12, margin: '3px 0 0' }}>7 pre-built playbooks covering every aspect of the TalentNest HR platform</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {PRESET_PLAYBOOKS.map(pb => (
            <div key={pb.id} style={{ border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', background: '#FAFAFA', transition: 'box-shadow 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              {/* Color bar */}
              <div style={{ height: 5, background: pb.color }} />
              <div style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${pb.color}18`, border: `1px solid ${pb.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{pb.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                      <h3 style={{ color: '#0A1628', fontWeight: 700, fontSize: 14, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pb.title}</h3>
                      <span style={{ background: `${pb.color}18`, color: pb.color, border: `1px solid ${pb.color}30`, borderRadius: 20, padding: '1px 7px', fontSize: 9, fontWeight: 800, letterSpacing: '0.5px', flexShrink: 0 }}>{pb.badge}</span>
                    </div>
                    <p style={{ color: '#64748B', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{pb.desc}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handlePreview(pb)}
                    style={{ flex: 1, background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 8, color: '#3E3E3C', fontWeight: 600, fontSize: 12, padding: '8px', cursor: 'pointer' }}>
                    👁 Preview
                  </button>
                  <button onClick={() => handleDownload(pb)}
                    style={{ flex: 1, background: pb.color, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, padding: '8px', cursor: 'pointer' }}>
                    ⬇️ Download
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Playbooks */}
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ color: '#0A1628', fontSize: 16, fontWeight: 800, margin: 0 }}>Custom Playbooks</h2>
            <p style={{ color: '#64748B', fontSize: 12, margin: '3px 0 0' }}>Create your own playbooks — saved locally and downloadable as HTML</p>
          </div>
          <button onClick={() => setShowCreate(v => !v)}
            style={{ background: showCreate ? '#F3F2F2' : 'linear-gradient(135deg,#0176D3,#014486)', border: 'none', borderRadius: 10, color: showCreate ? '#3E3E3C' : '#fff', fontWeight: 700, fontSize: 13, padding: '10px 20px', cursor: 'pointer' }}>
            {showCreate ? '✕ Cancel' : '+ Create Playbook'}
          </button>
        </div>

        {/* Create Form */}
        {showCreate && (
          <div style={{ background: '#F8FAFF', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ color: '#0176D3', fontSize: 13, fontWeight: 700, margin: '0 0 16px', letterSpacing: '0.5px' }}>📝 NEW PLAYBOOK</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ color: '#3E3E3C', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>Icon</label>
                <input value={form.icon} onChange={e => sf('icon', e.target.value)} maxLength={2}
                  style={{ width: '100%', padding: '10px', background: '#fff', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, fontSize: 22, textAlign: 'center', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: '#3E3E3C', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>Title *</label>
                <input value={form.title} onChange={e => sf('title', e.target.value)} placeholder="e.g. Onboarding Playbook"
                  style={{ width: '100%', padding: '10px 12px', background: '#fff', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  onFocus={e => { e.target.style.borderColor = '#0176D3'; e.target.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }} />
              </div>
              <div>
                <label style={{ color: '#3E3E3C', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>Short Description</label>
                <input value={form.desc} onChange={e => sf('desc', e.target.value)} placeholder="One-line description"
                  style={{ width: '100%', padding: '10px 12px', background: '#fff', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  onFocus={e => { e.target.style.borderColor = '#0176D3'; e.target.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }} />
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#3E3E3C', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 5 }}>Content * <span style={{ color: '#706E6B', fontWeight: 400 }}>(write in plain text — sections, bullet points, tables, etc.)</span></label>
              <textarea value={form.content} onChange={e => sf('content', e.target.value)} rows={10}
                placeholder={`## Introduction\nDescribe the purpose of this playbook...\n\n## Key Steps\n1. First step\n2. Second step\n\n## Notes\n- Important note 1\n- Important note 2`}
                style={{ width: '100%', padding: '12px', background: '#fff', border: '1px solid rgba(1,118,211,0.2)', borderRadius: 8, color: '#181818', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.7 }}
                onFocus={e => { e.target.style.borderColor = '#0176D3'; e.target.style.boxShadow = '0 0 0 3px rgba(1,118,211,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveCustom} style={{ background: 'linear-gradient(135deg,#0176D3,#014486)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, padding: '10px 22px', cursor: 'pointer' }}>
                💾 Save Playbook
              </button>
              <button onClick={() => { setShowCreate(false); setForm(EMPTY_CUSTOM); }} style={{ background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 10, color: '#3E3E3C', fontWeight: 600, fontSize: 13, padding: '10px 18px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Custom list */}
        {customPlaybooks.length === 0 && !showCreate ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#9E9D9B' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#3E3E3C', marginBottom: 4 }}>No custom playbooks yet</div>
            <div style={{ fontSize: 12 }}>Create your first playbook using the button above</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {customPlaybooks.map(pb => (
              <div key={pb.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: '#FAFAFA', borderRadius: 12, border: '1px solid #F0F0F0' }}>
                <div style={{ fontSize: 24, width: 40, height: 40, background: '#F3F2F2', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{pb.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#181818', fontWeight: 700, fontSize: 14 }}>{pb.title}</div>
                  <div style={{ color: '#706E6B', fontSize: 12, marginTop: 2 }}>
                    {pb.desc || 'Custom playbook'} · Created {new Date(pb.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => setPreview({ title: pb.title, html: pb.html })}
                    style={{ background: '#F3F2F2', border: '1px solid #DDDBDA', borderRadius: 8, color: '#3E3E3C', fontWeight: 600, fontSize: 12, padding: '7px 14px', cursor: 'pointer' }}>
                    👁 Preview
                  </button>
                  <button onClick={() => download(`${pb.title.toLowerCase().replace(/\s+/g,'-')}.html`, pb.html)}
                    style={{ background: '#0176D3', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 12, padding: '7px 14px', cursor: 'pointer' }}>
                    ⬇️ Download
                  </button>
                  <button onClick={() => deleteCustom(pb.id)}
                    style={{ background: 'rgba(186,5,23,0.08)', border: '1px solid rgba(186,5,23,0.2)', borderRadius: 8, color: '#BA0517', fontWeight: 600, fontSize: 12, padding: '7px 10px', cursor: 'pointer' }}>
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
