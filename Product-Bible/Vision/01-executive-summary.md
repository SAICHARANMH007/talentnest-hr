# Executive Summary

## What TalentNest HR is
TalentNest HR is a **full-stack, multi-tenant B2B SaaS platform** for the Indian hiring market. At its core it is an **Applicant Tracking System (ATS) + HRMS** combined with a **candidate-facing job board, professional social network, and college campus-hiring portal** — all running on a single shared codebase with strict tenant isolation (`tenantId` on every record).

It is not a single-purpose tool. As implemented today it already spans:
- **Recruiting / ATS**: job postings, application pipelines, smart-match scoring, interview scheduling, video interviews, assessments, offer letters, BGV document collection, pre-boarding.
- **Candidate platform**: career pages, profile + resume parsing, application tracking, job alerts, referrals, company reviews, social feed, communities, direct messaging, connections.
- **Employer branding**: customizable career pages, blogs, social posting (Facebook/Instagram), logo/branding system.
- **Campus / College Hiring Portal**: a dedicated `placement_officer` role and tenant type (`college`) with a drill-down dashboard, student roster, placement drives, placement record tracking, and skill-gap/course recommendations.
- **Platform operations**: Super Admin command center, billing (Razorpay), audit logs, NPS, webhooks, custom fields, pipeline templates.

## Where it stands today
- **56 MongoDB/Mongoose models**, **63 backend route files**, **7 user roles**, **5 tenant types**.
- **42 features** are catalogued as **LIVE** in the in-app Product Intelligence Playbook (`/app/playbooks`); **1 major feature** (Aadhaar-Linked Candidate Verification) is documented as a fully-specified **PLANNED FUTURE CAPABILITY**.
- Frontend: React 18.2 + Vite SPA deployed on **Vercel**. Backend: Node.js/Express on **Render**. Database: **MongoDB Atlas**.
- India-first integrations are already wired: **Razorpay** (billing), **Twilio WhatsApp**, **Cloudinary** (file storage), **Resend/Zoho SMTP** (email), **Google OAuth**, **VAPID web push**, **IndexNow** (SEO).

## Why it matters
Most Indian HR-tech vendors sell either (a) a job board, (b) an ATS, or (c) an HRMS — rarely all three, and almost never with a built-in social/community layer or a campus-hiring product attached. TalentNest's single multi-tenant codebase already covers all of these surfaces for **6 commercial tenant types** (`org`, `tenant`, `vendor`, `client`, `college`, plus the platform-level `super_admin` tenant), which is the foundation for the "Talent Operating System" positioning described in [Product Vision](02-product-vision.md).

## Top-line numbers (from code, not aspiration)
| Metric | Value | Source |
|---|---|---|
| Backend route files | 63 | `backend/src/routes/*.js` |
| Mongoose models | 56 | `backend/src/models/*.js` |
| User roles | 7 | `User.js` role enum |
| Tenant types | 5 | `Tenant.js` type enum |
| Catalogued LIVE features | 42 | Product Intelligence Playbook §5 |
| Planned major capabilities (documented spec) | 1 (Aadhaar verification) | Product Intelligence Playbook §37 |

## What this Bible does NOT claim
- No AI/ML features are implemented today (smart-match scoring is rule-based, not LLM-based).
- No mobile native apps — the product is a responsive web SPA.
- No public API / developer platform yet.
- These and other gaps are catalogued honestly in [Missing Features Analysis](../Roadmap/02-missing-features-analysis.md) and [Gap Analysis](../Roadmap/03-gap-analysis-documentation.md).
