# PLAYBOOK v17 — Custom Fields & Pipeline Templates

**Date:** 2026-04-06
**Commit:** `b090063`
**Task Group:** 10

---

## Files Created

| File | Purpose |
|------|---------|
| `backend/src/models/CustomFieldDefinition.js` | Tenant-scoped field schema for candidate/job/application, 8 field types, unique fieldKey per entity |
| `backend/src/models/CustomFieldValue.js` | Per-record value storage, unique index on (fieldId, recordId), bulkWrite upsert |
| `backend/src/routes/customFields.js` | CRUD + reorder/batch + values GET/PUT |
| `backend/src/routes/pipelineTemplates.js` | 6 presets + save/apply/delete custom templates stored in Tenant.settings |
| `src/pages/admin/AdminCustomFields.jsx` | Full field manager UI with entity tabs, form, type-specific options, disable/delete |

## Files Modified

| File | Change |
|------|--------|
| `backend/server.js` | Registered `/api/custom-fields` and `/api/pipeline-templates` |
| `src/pages/admin/OrgSettings.jsx` | Pipeline Templates section: preset chips, custom template chips, save-as-template input |
| `src/layout/Layout.jsx` | `🧩 Custom Fields` nav item added to admin and superadmin |
| `src/App.jsx` | `AdminCustomFields` lazy import + routes for admin and superadmin |
| `src/api/services/platform.service.js` | 10 new API methods for custom fields and pipeline templates |

---

## Custom Fields

**8 supported types:** `text`, `textarea`, `number`, `date`, `select`, `multiselect`, `checkbox`, `url`

**3 entities:** `candidate`, `job`, `application`

**API pattern:**
```
GET  /api/custom-fields?entity=candidate   → list active fields
POST /api/custom-fields                     → create field (auto-generates fieldKey from label)
PATCH /api/custom-fields/:id               → update label/type/options/isRequired/isActive/order
DELETE /api/custom-fields/:id              → soft-delete (isActive=false)
PATCH /api/custom-fields/reorder/batch     → batch reorder { items: [{id, order}] }

GET /api/custom-fields/values/:entity/:recordId  → get values with field definitions merged
PUT /api/custom-fields/values/:entity/:recordId  → upsert { values: { fieldId: value } }
```

## Pipeline Templates

**6 built-in presets:**
- Standard Hiring (8 stages)
- Fast Track (6 stages)
- Technical Hiring (8 stages)
- Executive Search (9 stages)
- Internship (7 stages)
- Bulk Hiring (8 stages)

**Custom templates** stored in `Tenant.settings.pipelineTemplates[]`.
Applying a template overwrites `Tenant.settings.pipelineStages`.

**API:**
```
GET    /api/pipeline-templates                     → { presets, custom }
POST   /api/pipeline-templates                     → save current stages as named template
PATCH  /api/pipeline-templates/:name/apply         → apply to active pipeline
DELETE /api/pipeline-templates/:name               → remove custom template
```

---

## Task Groups Complete

| Group | Feature | Commit |
|-------|---------|--------|
| 6  | Workflow Automation + SLA | f4c44d7 |
| 7  | NPS, Docs, Video, Referrals | f4c44d7 |
| 8  | 2FA SMS, Sessions, Google SSO | a3f7bb5 |
| 9  | Pre-boarding + Crons | d7b5704 |
| 10 | Custom Fields + Pipeline Templates | b090063 |
