# Sales Playbook

## 1. Ideal Customer Profile (ICP) — by tenant type
| Tenant type | Who | Buying trigger |
|---|---|---|
| `org`/`tenant` (SMB/Mid-market company) | HR/Talent Acquisition lead at a 20–500 employee company | Outgrowing spreadsheets/WhatsApp for hiring, or frustrated with Naukri/LinkedIn lead-gen-only tools |
| `vendor` (Staffing agency) | Agency owner managing multiple client companies (`Client.js`) | Needs to manage candidates across clients, track placements/fees, give clients visibility |
| `client` (Agency's client, sub-tenant via `Tenant.parentId`) | Company that outsources hiring to an agency | Wants visibility into their requisitions without managing the tool themselves |
| `college` | Placement Cell / Training & Placement Officer | Currently runs placement season via spreadsheets + WhatsApp (per [Problem Statement](../Vision/04-problem-statement.md)); wants drive management + skill-gap insight |

## 2. Core pitch (by audience)

### For HR/TA leads (org/tenant)
"TalentNest replaces your spreadsheet-and-WhatsApp hiring process with one platform: post jobs, get a branded career page automatically, screen candidates with rule-based match scoring (Talent Mirror), run interviews and assessments in-platform, send offers, verify backgrounds, and onboard new hires — all with full audit trails for compliance."

### For staffing agency owners (vendor/client)
"Manage your candidate pool once, share it across all your client companies' open roles, and give each client a scoped view into their own requisitions (`Client.js`) — without giving them access to your full database."

### For Placement Officers (college)
"The College Hiring Portal turns a multi-week spreadsheet exercise into a single dashboard session: see every student, every drive, every placement, and exactly which skills your students are missing for the jobs companies are actually posting — with one-click drill-downs from KPI to student list."

## 3. Key differentiators (vs. competitors — see [Competitive Analysis](02-competitive-analysis.md) for detail)
1. **End-to-end pipeline in one tool** — career page → application → screening → interview → assessment → offer → BGV → onboarding → NPS, vs. point solutions (job boards) or generic ATS that stop at "hire."
2. **Candidate retention flywheel** — Communities/Feed give candidates a reason to stay engaged even when not actively job-hunting (per [Product Vision](../Vision/02-product-vision.md)).
3. **College Hiring Portal** — a dedicated, drill-down placement-cell experience most generic ATS/HRMS tools do not offer.
4. **India-first integrations** — Razorpay billing, WhatsApp/Twilio + Fast2SMS candidate communication, designed for the Indian hiring market's communication norms.
5. **Multi-tenant from day one** — supports staffing agencies (vendor/client hierarchy) and colleges natively, not as an afterthought.

## 4. Honest positioning — what NOT to claim
Per [Technical Debt #10](../Technical/03-technical-debt-analysis.md#10-aiml-claims-vs-reality):
- Talent Mirror / `matchBreakdown` scoring is **rule-based** (skill/experience/location/notice), **not ML/LLM-based**. Sales materials should describe this as "intelligent matching" or "structured scoring," not "AI-powered" or "machine learning," unless/until an ML model is actually integrated.
- "Aadhaar-Linked Verification" is a **planned** capability, not currently live — do not promise it in active deals without an explicit roadmap commitment from product/eng.

## 5. Common objections & responses
| Objection | Response |
|---|---|
| "We already use Naukri/LinkedIn for job posting" | "Those are sourcing channels, not pipeline-management tools — TalentNest manages everything *after* the application comes in, and you can still post your job link anywhere, including Naukri/LinkedIn." |
| "We use [Darwinbox/Zoho Recruit] already" | See [Competitive Analysis](02-competitive-analysis.md) — focus on pricing simplicity (Razorpay-based, India-native), and the College Hiring Portal / candidate-community angle if relevant to their hiring funnel (campus hiring). |
| "Is this AI-powered matching?" | "Match scoring today is a transparent, rule-based algorithm across skills/experience/location/notice period — recruiters can see exactly *why* a candidate scored the way they did, which many ML-based 'black box' tools can't offer." |
| "What about data security/compliance?" | Reference [Security Documentation](../Security/01-security-documentation.md) — JWT auth, tenant isolation, audit logs, rate limiting. Avoid making compliance certifications (SOC2/ISO) claims not yet obtained. |
| "Can we try it for our college's placement season?" | Yes — `college` tenant type with `placement_officer` role is a first-class, fully-built experience (College Overview, Students, Drives, Placements). |

## 6. Plan/pricing reference
See [Pricing Strategy](../Business/05-pricing-strategy.md) for the `Tenant.plan` enum (`free/trial/starter/basic/growth/pro/agency/enterprise`) and plan-to-buyer mapping.

## 7. Demo flow recommendation
1. Career page (public, branded) → show how a candidate applies.
2. Recruiter Pipeline → show Talent Mirror score + stage movement.
3. Self-scheduling + Video Room → show the in-platform interview experience.
4. Offer → BGV → Pre-boarding → "Day 1" narrative (full [Candidate Journey](../Product/09-user-journey-maps.md)).
5. If audience is a college: pivot to College Overview drill-down instead of step 2–4.
6. If audience is a staffing agency: show Client.js scoping + Talent Pool segmentation.
