# User Stories

Organized by role, in "As a [role], I want [capability], so that [benefit]" form. Each story is traceable to an existing route/page (i.e. these describe **implemented** functionality, useful as regression-test source material).

## Super Admin
1. As a **super admin**, I want to view and manage all tenant orgs from one dashboard, so that I can support customers without database access. *(`SuperAdminOrgs`, `orgs.js`)*
2. As a **super admin**, I want to view a platform-wide audit log, so that I can investigate support issues or security incidents. *(`audit.js`)*
3. As a **super admin**, I want to generate an up-to-date Product Intelligence Playbook with one click, so that I can share an accurate platform overview with investors without manually writing docs. *(`SuperAdminPlaybooks.jsx`)*
4. As a **super admin**, I want to see a "Top college" badge and search/paginate the College Groups list, so that I can identify our most engaged college communities. *(College Groups page)*
5. As a **super admin**, I want near-duplicate college names automatically merged, so that placement data isn't fragmented across spelling variants. *(`collegeNames.js`)*

## Admin (HR Manager)
6. As an **admin**, I want to invite recruiters and hiring managers via a secure link or temp password, so that I can onboard my team without exposing plain-text credentials. *(`admin.js` invite endpoints)*
7. As an **admin**, I want org-wide analytics (application trend, pipeline distribution, top jobs), so that I can report on hiring performance to leadership. *(`AdminAnalytics`)*
8. As an **admin**, I want to define custom fields on candidates/applications/jobs, so that I can capture data specific to my org's process. *(`customFields.js`)*
9. As an **admin**, I want to configure reusable pipeline stage templates, so that every recruiter follows a consistent process. *(`pipelineTemplates.js`)*
10. As an **admin**, I want to upload our company logo and brand colors, so that our career page and emails reflect our brand. *(`LogoManager`, `OrgCustomizations.js`)*

## Recruiter
11. As a **recruiter**, I want to post a job and have it instantly appear on our career page, so that candidates can apply without delay. *(`jobs.js`, career page routes)*
12. As a **recruiter**, I want to see a smart match score for each applicant, so that I can prioritize screening. *(`Application.matchBreakdown`)*
13. As a **recruiter**, I want to move multiple applications between pipeline stages at once, so that I can process a batch of rejections or advances quickly. *(bulk-stage endpoint)*
14. As a **recruiter**, I want to send a candidate a self-scheduling link for an interview, so that I don't have to coordinate availability manually. *(`schedule.js`)*
15. As a **recruiter**, I want to conduct a video interview within the platform, so that I don't need a separate Zoom/Meet link. *(`videoRooms.js`)*
16. As a **recruiter**, I want to assign an assessment to a candidate and have it auto-scored, so that I save time on manual evaluation. *(`assessments.js`)*
17. As a **recruiter**, I want to generate and send a digitally-signable offer letter PDF, so that candidates can accept offers online. *(`offers.js`)*
18. As a **recruiter**, I want to request BGV documents from a candidate and track verification status, so that compliance steps aren't lost in email. *(`bgv.js`)*
19. As a **recruiter**, I want to message candidates over WhatsApp from within the platform, so that I reach them on their preferred channel. *(`whatsapp.js`)*
20. As a **recruiter**, I want to share a job via email or copyable link and track who clicked "I'm Interested," so that I can measure outreach effectiveness. *(`ShareJobModal`, Outreach Tracker, `invites.js`)*

## Hiring Manager
21. As a **hiring manager**, I want to give structured interview feedback against a scorecard, so that hiring decisions are based on consistent criteria. *(`InterviewKit.js`)*
22. As a **hiring manager**, I want to see my department's headcount plan, so that I know how many roles I can fill this quarter. *(`HeadcountPlan.js`)*

## Client
23. As a **client**, I want to see the status of candidates shortlisted for my requisitions, so that I have visibility into the agency's progress without needing internal access. *(read-only client view)*

## Candidate
24. As a **candidate**, I want my resume to be parsed automatically when I upload it, so that I don't have to manually fill in my skills and experience. *(`parseResume.js`)*
25. As a **candidate**, I want to see exactly what stage my application is in, so that I'm not left wondering after I apply. *(`Application.stageHistory`, real-time notifications)*
26. As a **candidate**, I want to read reviews of a company before applying, so that I can gauge if it's a good fit. *(`companyReviews.js`)*
27. As a **candidate**, I want to subscribe to job alerts matching my skills, so that I hear about relevant openings without checking daily. *(`JobAlert.js`)*
28. As a **candidate**, I want to generate a referral link and earn rewards when someone I refer is hired, so that I'm incentivized to share openings. *(`Referral.js`)*
29. As a **candidate**, I want to join communities related to my college or target companies, so that I can network with relevant people. *(`communities.js`)*
30. As a **candidate**, I want to message other professionals directly, so that I can build my network. *(`messages.js`)*

## Placement Officer
31. As a **placement officer**, I want a single dashboard showing total/current students, alumni, applications, placements, and placement rate, so that I have an at-a-glance view of my college's outcomes. *(College Overview)*
32. As a **placement officer**, I want to click any KPI or breakdown bar to drill into the underlying student/application list, so that I can investigate without re-running searches. *(URL-param-based drill-down)*
33. As a **placement officer**, I want to filter students by department and batch year, so that I can report to specific department heads. *(College Students filters)*
34. As a **placement officer**, I want to see each student's recommended courses based on their skill gaps, so that I can proactively guide them. *(`getStudentSkillRecommendations`)*
35. As a **placement officer**, I want to schedule and manage on-campus placement drives with eligibility criteria, so that only eligible students register. *(`PlacementDrive.js`)*
36. As a **placement officer**, I want to track placement records by company and stage with private notes, so that I can follow up without exposing notes to other colleges. *(College Placements, `collegeNotes`)*
37. As a **placement officer**, I want to see which skills are most in-demand vs. how many of my students have them, with course recommendations, so that I can close skill gaps proactively. *(Skill Gap Analysis)*

---

For stories that describe **planned** capabilities (e.g. Aadhaar verification), see [Missing Features Analysis](../Roadmap/02-missing-features-analysis.md) — kept separate so this document remains a faithful record of *current* behavior.
