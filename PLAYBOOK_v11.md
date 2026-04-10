# TalentNest HR — PLAYBOOK v11.0
*Task Group 3: Advanced Analytics and Scheduled Reports*
*Date: 2026-04-06 | Commit: 9b4790f*

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `backend/src/routes/dashboard.js` | Rewritten | 8 new analytics endpoints + 3 Excel export endpoints |
| `backend/src/utils/exportToExcel.js` | Created | ExcelJS utility — title, columns, rows → Buffer |
| `backend/src/jobs/weeklyReport.js` | Created | node-cron weekly Monday 9AM IST report email |
| `backend/server.js` | Updated | Registers weeklyReport cron after DB connect |
| `backend/package.json` | Updated | Added exceljs, node-cron |
| `backend/src/models/Tenant.js` | Updated | Additional billing/analytics fields |
| `src/pages/admin/AdminAnalytics.jsx` | Rewritten | Date range picker, 7 chart sections, per-section loading |
| `src/api/services/dashboard.service.js` | Updated | 8 new API functions with query param support |
| `src/api/client.js` | Updated | Minor auth header fix |
| `src/api/services/application.service.js` | Updated | Minor update |
| `backend/src/routes/parseResume.js` | Updated | Resume parse route refinements |

---

## Analytics Endpoints

All endpoints:
- Require `authenticate` + `tenantGuard`
- Filter by `tenantId: req.user.tenantId`
- Accept query params: `startDate`, `endDate` (ISO), `jobId`, `recruiterId`
- Default range: last 30 days

| Endpoint | Description | Returns |
|----------|-------------|---------|
| `GET /dashboard/funnel` | Applications per stage | `[{ stage, count, percentage }]` |
| `GET /dashboard/source-breakdown` | Candidates by source | `[{ source, count, percentage }]` |
| `GET /dashboard/time-to-hire` | Avg days from apply→hire | `[{ jobTitle, recruiterName, avgDaysToHire, hiredCount }]` |
| `GET /dashboard/stage-velocity` | Avg hours per stage | `[{ stage, avgHours, sampleCount }]` |
| `GET /dashboard/offer-acceptance` | Offer sent vs accepted | `{ offersSent, offersAccepted, acceptanceRate }` |
| `GET /dashboard/dropout-analysis` | Rejections by stage | `[{ stage, count, percentage, topReasons }]` |
| `GET /dashboard/recruiter-performance` | Per-recruiter metrics | `[{ recruiterName, jobsAssigned, candidatesAdded, shortlisted, offers, avgDaysToShortlist }]` |
| `GET /dashboard/sla-compliance` | Stage SLA breaches | `{ complianceRate, byStage: [{ stage, compliant, breached, rate }] }` |

### Excel Export Endpoints
| Endpoint | Filename |
|----------|----------|
| `GET /dashboard/funnel/export` | `funnel-report-{date}.xlsx` |
| `GET /dashboard/recruiter-performance/export` | `recruiter-performance-{date}.xlsx` |
| `GET /dashboard/dropout-analysis/export` | `dropout-analysis-{date}.xlsx` |

---

## Weekly Report Cron Job

**Schedule:** Every Monday at 03:30 UTC (09:00 AM IST)
**File:** `backend/src/jobs/weeklyReport.js`
**Logic:**
1. Find all Tenants with `subscriptionStatus: 'active'`
2. For each tenant with ≥1 recruiter: query last week's activity
3. Send formatted HTML email to the tenant's admin user via Resend

**Metrics in report:** New applications, moved to interview, offers sent, hired/accepted

---

## New npm Packages

| Package | Purpose |
|---------|---------|
| `exceljs` | Excel file generation for export endpoints |
| `node-cron` | Cron scheduling for weekly report |

---

## How to Test Locally

```bash
# Test analytics endpoint
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5000/api/dashboard/funnel?startDate=2026-01-01&endDate=2026-04-06"

# Test Excel export (saves to file)
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5000/api/dashboard/funnel/export" --output funnel.xlsx

# Manually trigger weekly report
node -e "require('./backend/src/jobs/weeklyReport').runWeeklyReports()"
```

---

## AdminAnalytics Page Sections

1. **Date Range Picker** — start/end date inputs, Apply button
2. **Hiring Funnel** — horizontal bar chart, Export button
3. **Source Breakdown** — donut chart with legend
4. **Time to Hire** — table by job/recruiter, Export button
5. **Stage Velocity** — bar chart, highlights >48h yellow, >72h red
6. **Offer Acceptance** — 3 KPI cards
7. **Recruiter Performance** — sortable table, Export button
8. **Dropout Analysis** — bar chart by stage, Export button

Each section loads independently — failure in one doesn't block others.
