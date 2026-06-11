# Support Documentation

> **Scope note**: No formal support ticketing system, SLA documents, or support-tier policy were found in the codebase. This document describes the **in-product support-relevant features** that exist today, plus a recommended structure for the support function (organizational, not code).

## 1. In-product channels relevant to support
| Feature | Where | Use for support |
|---|---|---|
| Direct Messages | `messages.js` / `DirectMessage.js` | Internal user-to-user — could be used for org admin ↔ TalentNest support contact if a "support" user account exists per tenant |
| Notifications | `notifications.js` / `Notification.js` | In-app alerts for key events (offer accepted, application stage change, etc.) |
| Audit Logs | `audit.js` / `AuditLog.js` | First-line diagnostic tool for "why did X happen" tenant-admin/support questions |
| Info Requests | `infoRequests.js` / `InfoRequest.js` | HR → candidate info requests with response tracking — candidate-facing support-adjacent flow |
| NPS Surveys | `nps.js` / `CandidateNPS.js` | Sentiment signal (`positive/neutral/negative`) — could feed a support-prioritization queue |
| Company Reviews / Post Reports | `companyReviews.js`, `PostReport.js` | Moderation queue for Super Admin (content/abuse support) |
| Platform Health | `/api/platform/health` | First check when investigating "is the platform down" reports |

## 2. Recommended support tiers (organizational — not implemented in code)
| Tier | Audience | Scope | Suggested response target |
|---|---|---|---|
| Tier 1 — Self-serve | All users | In-app help text, FAQ/help center (not currently part of this codebase as a dedicated page — verify) | N/A |
| Tier 2 — Tenant Admin support | `admin`/`super_admin` of a tenant | Org configuration, billing (Razorpay), user invites/role issues | Business hours |
| Tier 3 — Platform support (TalentNest team) | Super Admin escalation | Cross-tenant bugs, data issues, platform incidents | Defined SLA per plan tier (`Tenant.plan`) — not currently differentiated in code |

## 3. Known-issue playbook (derived from Technical Debt)
When investigating a reported bug, check these **recurring historical patterns first** (from [Technical Debt Analysis](../Technical/03-technical-debt-analysis.md)):

| Symptom | Likely cause | Reference |
|---|---|---|
| `"h.filter is not a function"` / blank list page | Page treating a `{success, data, pagination}` API response as a raw array | Technical Debt #2 |
| A count/ID shows as `0`, `"[object Object]"`, or crashes with `Cast to ObjectId failed` | `jobId`/`recruiterId`/`id` is a populated object vs. raw string mismatch | Technical Debt #3 |
| Modal renders behind another overlay (notification panel, profile menu) | z-index conflict | Technical Debt #4 |
| Saving a job/candidate field silently fails | Frontend sends an enum value not present in the Mongoose schema enum | Technical Debt #5 |
| Frontend page 404s calling an API route | Route not registered in `server.js` / route file | Technical Debt #6 |
| Playbook Preview/Download does nothing or throws `ReferenceError: amp is not defined` (or similar `ReferenceError`) | Unescaped backtick in a `SuperAdminPlaybooks.jsx` template literal — **fixed for the 2 known cases in commit `d5fd074`**, but the bug *class* remains possible if new playbook content is added without escaping backticks | Technical Debt #7 |
| A button/action defined via a prop (e.g., `actions={...}`) doesn't render | Prop name mismatch with the shared component's expected prop (e.g., `PageHeader` expects `action`, singular) | Technical Debt #9 |

## 4. Escalation checklist (recommended)
1. Reproduce with the reporting user's **role** and **tenant type** (`org/tenant/vendor/client/college`) — many bugs are role- or tenant-type-specific (e.g., College Hiring Portal issues only affect `placement_officer` + `college` tenants).
2. Check `/api/platform/health` for platform-wide issues before assuming a tenant-specific bug.
3. Check `AuditLog` for the affected `entityId` to see the change history.
4. Check Render logs (`morgan` `combined` format) for the request/response and any stack trace.
5. Cross-reference against the Known-Issue Playbook (§3) before filing a new bug.

## 5. PLANNED FUTURE CAPABILITY
- Dedicated help center / knowledge base.
- In-app support ticket/chat widget.
- Plan-tier-based SLA enforcement (e.g., `enterprise` tenants get priority queue).
- Status page (public uptime/incident history).
