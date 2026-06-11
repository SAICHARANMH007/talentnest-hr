# TalentNest HR — Product Bible (Master Index)

**Document classification:** Founder + Investor + Enterprise Grade
**Source of truth:** This entire Product Bible is derived directly from the TalentNest HR codebase (`/home/user/talentnest-hr`) — Mongoose models, Express route files, React pages, and configuration files (`render.yaml`, `vercel.json`, `package.json`). Where a capability does **not** exist in code yet, it is explicitly marked **`PLANNED FUTURE CAPABILITY`**. Nothing in this Bible should be treated as implemented unless it is traceable to a specific file/route/model.

---

## 📁 /Vision
| # | Document | Description |
|---|----------|-------------|
| 1 | [Executive Summary](Vision/01-executive-summary.md) | One-page snapshot of what TalentNest HR is, who it's for, and where it stands today |
| 2 | [Product Vision](Vision/02-product-vision.md) | The long-term vision — Talent Operating System (TOS), not just an ATS |
| 3 | [Mission & Values](Vision/03-mission-values.md) | Why TalentNest exists and the principles guiding product decisions |
| 4 | [Problem Statement](Vision/04-problem-statement.md) | The core problems in Indian hiring that TalentNest solves |
| 5 | [Future Vision (5/10/20 Years)](Vision/05-future-vision-5-10-20-years.md) | Long-horizon roadmap framed as planned future capability |

## 📁 /Business
| # | Document | Description |
|---|----------|-------------|
| 1 | [Market Opportunity](Business/01-market-opportunity.md) | TAM/SAM/SOM framing for Indian HR Tech |
| 2 | [Product Positioning](Business/02-product-positioning.md) | How TalentNest is positioned vs. category alternatives |
| 3 | [Stakeholder Analysis](Business/03-stakeholder-analysis.md) | Internal & external stakeholders and their interests |
| 4 | [Revenue Model](Business/04-revenue-model.md) | How TalentNest makes (and could make) money |
| 5 | [Pricing Strategy](Business/05-pricing-strategy.md) | Plan tiers, limits, and pricing levers found in code |

## 📁 /Product
| # | Document | Description |
|---|----------|-------------|
| 1 | [User Personas](Product/01-user-personas.md) | The 7 user roles as personas |
| 2 | [Feature Inventory](Product/02-feature-inventory.md) | Full list of 42 features with implementation status |
| 3 | [Module Documentation](Product/03-module-documentation.md) | Functional breakdown of each module/page group |
| 4 | [Functional Requirements](Product/04-functional-requirements.md) | What the system must do, by module |
| 5 | [Non-Functional Requirements](Product/05-non-functional-requirements.md) | Performance, scalability, availability, usability |
| 6 | [User Stories](Product/06-user-stories.md) | "As a ___, I want ___" stories per role |
| 7 | [Acceptance Criteria](Product/07-acceptance-criteria.md) | Given/When/Then criteria for key flows |
| 8 | [Workflow Diagrams](Product/08-workflow-diagrams.md) | Text-based flow diagrams of core processes |
| 9 | [User Journey Maps](Product/09-user-journey-maps.md) | End-to-end journeys per role |

## 📁 /Technical
| # | Document | Description |
|---|----------|-------------|
| 1 | [Database Documentation](Technical/01-database-documentation.md) | All 56 Mongoose models, fields, relationships |
| 2 | [API Documentation](Technical/02-api-documentation.md) | All 63 route files and key endpoints |
| 3 | [Technical Debt Analysis](Technical/03-technical-debt-analysis.md) | Known issues, inconsistencies, and risk areas |

## 📁 /Architecture
| # | Document | Description |
|---|----------|-------------|
| 1 | [Architecture Documentation](Architecture/01-architecture-documentation.md) | System architecture, multi-tenancy, real-time layer |
| 2 | [Deployment Documentation](Architecture/02-deployment-documentation.md) | Vercel + Render + MongoDB Atlas deployment topology |

## 📁 /Security
| # | Document | Description |
|---|----------|-------------|
| 1 | [Security Documentation](Security/01-security-documentation.md) | AuthN/AuthZ, encryption, rate limiting, audit logging |

## 📁 /Compliance
| # | Document | Description |
|---|----------|-------------|
| 1 | [Compliance Documentation](Compliance/01-compliance-documentation.md) | DPDP Act 2023, data residency, BGV handling, gaps |

## 📁 /Operations
| # | Document | Description |
|---|----------|-------------|
| 1 | [Operations Documentation](Operations/01-operations-documentation.md) | Day-to-day operational runbook |
| 2 | [Support Documentation](Operations/02-support-documentation.md) | Support tiers, escalation, known-issue playbook |

## 📁 /QA
| # | Document | Description |
|---|----------|-------------|
| 1 | [QA Strategy](QA/01-qa-strategy.md) | Testing philosophy and current coverage |
| 2 | [Test Cases](QA/02-test-cases.md) | Representative test cases per module |

## 📁 /Sales
| # | Document | Description |
|---|----------|-------------|
| 1 | [Sales Playbook](Sales/01-sales-playbook.md) | Pitch, objection handling, ICP |
| 2 | [Competitive Analysis](Sales/02-competitive-analysis.md) | TalentNest vs. Naukri, Darwinbox, Zoho Recruit, etc. |

## 📁 /Investor
| # | Document | Description |
|---|----------|-------------|
| 1 | [Investor Pitch Narrative](Investor/01-investor-pitch-narrative.md) | The story for fundraising conversations |
| 2 | [SWOT Analysis](Investor/02-swot-analysis.md) | Strengths, Weaknesses, Opportunities, Threats |
| 3 | [Risk Analysis](Investor/03-risk-analysis.md) | Product, market, technical, and execution risks |

## 📁 /Roadmap
| # | Document | Description |
|---|----------|-------------|
| 1 | [Product Roadmap](Roadmap/01-product-roadmap.md) | Near/mid/long-term roadmap |
| 2 | [Missing Features Analysis](Roadmap/02-missing-features-analysis.md) | What's missing vs. a full Talent OS |
| 3 | [Gap Analysis & Enterprise Documentation Audit](Roadmap/03-gap-analysis-documentation.md) | What enterprise docs are still missing |

---

## How to keep this Bible current
This Bible was generated by reading the actual codebase as of **11 June 2026** (commit `d5fd074` on `claude/review-june-5-6-changes-KrN9J` / `main`). As the platform evolves:
1. Re-run the codebase audit (models, routes, pages) before re-publishing.
2. Anything marked `PLANNED FUTURE CAPABILITY` should be moved to "LIVE" status only once it is merged and verified in code.
3. The `SuperAdminPlaybooks.jsx` "Product Intelligence Playbook" (`/app/playbooks`) is the live, in-app, auto-dated companion to this static Bible — both should be kept in sync.
