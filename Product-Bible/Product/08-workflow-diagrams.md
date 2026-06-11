# Workflow Diagrams (Text-Based)

## 1. Candidate Application → Hire Workflow
```
[Candidate browses career page]
        │
        ▼
[Apply — authenticated OR public POST /api/applications/public]
        │  (find/create guest Candidate by email; reject duplicate w/ 409)
        ▼
[Application created — currentStage = "Applied"]
        │  → Notification to org admins/super_admins
        ▼
[Recruiter reviews — matchBreakdown score shown]
        │
        ▼
[Stage: Screening] ──► [Stage: Interview] ──► [Stage: Assessment (optional)]
        │                       │
        │                       ▼
        │              [Self-scheduling link sent → candidate confirms]
        │                       │
        │                       ▼
        │              [Video interview room (WebRTC/Socket.io)]
        ▼
[Stage: Offer] ──► [Offer letter generated (PDF) → sent → candidate signs]
        │              → Notification to assigned recruiters + admins (key milestones)
        ▼
[Stage: Hired] ──► [BGV documents requested → uploaded → verified]
        │
        ▼
[Pre-Boarding checklist generated from OnboardingTemplate → tasks tracked → Day 1]
```

## 2. Org Onboarding Workflow
```
[Admin signs up / org created] (Tenant.type = 'org' or 'tenant', plan = 'free'/'trial')
        │
        ▼
[Admin configures OrgCustomizations: logo, brand colors, email settings, pipeline stages]
        │
        ▼
[Admin invites team via admin.js: invite-admin / invite-recruiter]
        │  (secure token email OR temp password — admin chooses delivery method)
        ▼
[Invitee clicks link → activates account → sets password]
        │
        ▼
[Recruiter posts first job → career page slug auto-generated]
        │
        ▼
[Applications start flowing in → see Workflow 1]
```

## 3. College Hiring Portal Workflow (Placement Officer)
```
[Placement Officer logs in — role = placement_officer, Tenant.type = 'college']
        │
        ▼
[College Overview loads]
   ├─ KPI cards: Total/Current Students, Alumni, Applications, Placements, Placement Rate, Upcoming Interviews
   ├─ Department breakdown bars
   ├─ Batch/year breakdown bars + Placement rate by batch
   ├─ Recent placements list
   ├─ Top hiring companies list
   ├─ Recently joined students list
   └─ Skill Gap Analysis (in-demand skills vs. student coverage + course recommendations)
        │
        ├──(click any KPI/bar/row)──► [/app/candidates?dept=&year=&type=&q= OR /app/applicants?stage=&company=&q=]
        │                                   │
        │                                   ▼
        │                           [Filtered list view, "Filtered by: ✕ Clear" chip]
        │
        ▼
[College Students page]
   ├─ Search/filter by dept, year, type (current/alumni)
   └─ Click student → Profile modal → skills, education, course recommendations
        │
        ▼
[College Drives page]
   ├─ Create drive: company, date, mode (On-Campus/Virtual/Off-Campus), eligibility (CGPA/branches/skills)
   └─ View/manage student registrations
        │
        ▼
[College Placements page]
   ├─ View placement records (student, job, company, stage, applied date)
   ├─ Filter by stage / company (chip-clearable)
   └─ Add/edit private follow-up notes per record (college-only visibility)
```

## 4. Communities & Social Workflow
```
[User opens Communities page]
        │
        ▼
[GET communities — sorted: own college/company first → memberCount desc → alphabetical]
   │
   ├─ if > MAINTENANCE_SYNC_INTERVAL_MS since last sync:
   │      └─ run idempotent maintenance sync (default community upsert,
   │           per-college-tenant sync) — throttled to ≤1× per 10 min
   │
   └─ async background: auto-create new candidate/company communities
        │
        ▼
[User joins/leaves a community]
        │
        ▼
[Community feed: posts, reactions, comments via feed.js]
```

## 5. Aadhaar-Linked Verification Workflow — `PLANNED FUTURE CAPABILITY`
```
[Candidate initiates verification]
        │
        ▼
[Candidate enters: name + phone number (linked to Aadhaar)]
        │
        ▼
[System calls verification provider — match name+phone against Aadhaar-linked record]
        │
        ├─ Match ──► [Candidate.platformVerified = true; name field LOCKED (cannot be edited)]
        │
        └─ No match ──► [Verification fails; candidate profile remains unverified]

NOTE: No Aadhaar number, biometric, or document image is stored at any point —
zero-PII-storage design. Full spec in Compliance Documentation.
```

## 6. Playbook Generation Workflow (Super Admin)
```
[Super Admin opens /app/playbooks]
        │
        ▼
[Selects a preset playbook card (e.g. Product Intelligence, Full Bible, Developer v4...)]
        │
        ├─ Click "Preview" ──► handlePreview(pb) ──► pb.fn() returns HTML string ──► rendered in <iframe srcDoc>
        │
        └─ Click "Download" ──► handleDownload(pb) ──► pb.fn() returns HTML ──► Blob → browser download
        │
        └─ "Download All" ──► JSZip bundles all PRESET_PLAYBOOKS .fn() outputs into TalentNest-Bible.zip
```
