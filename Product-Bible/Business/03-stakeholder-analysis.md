# Stakeholder Analysis

## Internal stakeholders (platform operator side)

| Stakeholder | Role in product | Primary tools/views | Key interest |
|---|---|---|---|
| **Founder(s) / Leadership** | Strategy, fundraising, prioritization | Super Admin Command Center, Product Intelligence Playbook (`/app/playbooks`) | Growth, fundraising readiness, defensible positioning |
| **Engineering team** | Build/maintain platform | Codebase, Developer Playbook (`/app/playbooks` → Developer Playbook v4) | Code quality, velocity, low technical debt |
| **Super Admins (`super_admin` role)** | Platform operations, tenant management, support | `/app/superadmin/*` pages — Orgs, Billing, Audit, Permissions, Security, Platform config, Playbooks | Tenant health, platform uptime, support load |
| **Sales / GTM (if separate from founders)** | Sell to companies, agencies, colleges | Sales Playbook, Competitive Analysis | Clear ICP, differentiated pitch, demo-ready product |

## External stakeholders (tenant side)

| Stakeholder | Tenant type | Role(s) | Key interest |
|---|---|---|---|
| **HR Admins** | `org` / `tenant` | `admin` | Org setup, billing, recruiter management, analytics, compliance (BGV) |
| **Recruiters** | `org` / `tenant` / `vendor` | `recruiter` | Daily pipeline management, sourcing, interviews, offers |
| **Hiring Managers** | `org` / `tenant` | `hiring_manager` | Reviewing shortlists, interview feedback, final approval |
| **Staffing Agency Operators** | `vendor` | `admin`/`recruiter` | Manage multiple `client` sub-tenants, placements across clients |
| **Agency Clients** | `client` | `client` | Read-only visibility into shortlists/placements without internal data access |
| **Placement Officers** | `college` | `placement_officer` | Student roster management, placement drives, placement tracking, skill-gap insights |
| **Candidates / Job Seekers** | N/A (cross-tenant identity) | `candidate` | Apply to jobs, track applications, build profile/network, get verified (planned) |
| **Students (via College Portal)** | `college` (linked candidate profile) | `candidate` (managed via college tenant) | Visibility into real job opportunities, course recommendations to close skill gaps |

## Stakeholder interests vs. current product capability

| Stakeholder | Top unmet need (from code review) | Where it's tracked |
|---|---|---|
| HR Admins | No public benchmarking (salary, time-to-fill vs. industry) | [Missing Features Analysis](../Roadmap/02-missing-features-analysis.md) |
| Recruiters | No AI-assisted candidate ranking beyond rule-based score | [Technical Debt Analysis](../Technical/03-technical-debt-analysis.md) |
| Agency Operators | `Tenant.parentId` exists but UI for managing multiple clients from one dashboard is not fully documented as a distinct page | [Module Documentation](../Product/03-module-documentation.md) |
| Placement Officers | Multi-college consortium views, inter-college benchmarking | [Future Vision](../Vision/05-future-vision-5-10-20-years.md) |
| Candidates | Portable verified identity (Aadhaar) not yet live | [Compliance Documentation](../Compliance/01-compliance-documentation.md) |
| Super Admins | No public API for tenants to self-integrate (reduces support load long-term) | [Product Roadmap](../Roadmap/01-product-roadmap.md) |

## Decision rights (as implied by RBAC)
The `allowRoles()` middleware pattern across route files (`admin.js`, `orgs.js`, `customFields.js`, `pipelineTemplates.js`, etc.) establishes a clear decision-rights hierarchy:

```
super_admin  → platform-wide (all tenants)
   └── admin → tenant-wide (org settings, billing, invites, customizations)
         ├── recruiter        → operational (jobs, candidates, pipeline, offers)
         ├── hiring_manager   → advisory (feedback, limited pipeline view)
         └── placement_officer → college-tenant operational (students, drives, placements)
client        → read-only (shortlists, placement progress) — scoped via vendor relationship
candidate     → self-service (own profile, applications, network)
```

This hierarchy is enforced server-side via middleware, not just hidden in the UI — meaning stakeholder permissions are a real security boundary, not cosmetic. See [Security Documentation](../Security/01-security-documentation.md).
