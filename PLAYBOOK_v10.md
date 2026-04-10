# TalentNest HR — Developer Playbook v10.0
*Generated: 2026-04-04 | Commit: d0815e0*

---

## What Changed in v10 (Task Group 2: Advanced Resume Parser)

Implemented a production-ready, India-specific resume parser with per-field confidence scoring, a new API endpoint, and full form pre-fill integration in AddCandidateForm.

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `backend/src/utils/resumeParser.js` | Rewritten | Full async parser; extracts 15 fields from PDF/DOCX/TXT |
| `backend/src/routes/candidates.js` | Modified | Added `POST /api/candidates/parse-resume` route |
| `src/api/services/platform.service.js` | Modified | Added `api.parseResume(file)` using FormData |
| `src/components/shared/AddCandidateForm.jsx` | Rewritten | Full field mapping + confidence-based yellow highlighting |

---

## How the parse-resume Endpoint Works

**Route:** `POST /api/candidates/parse-resume`

**Auth:** Required — roles: `recruiter`, `admin`, `super_admin`

**Request:** `multipart/form-data` with field `resume` (PDF/DOCX/TXT, max 5MB)

**Flow:**
1. multer `memoryStorage` captures the file as a Buffer (no disk writes)
2. `parseResumeUtil(buffer, mimetype)` is called from `backend/src/utils/resumeParser.js`
3. Text is extracted via `pdf-parse` (PDF), `mammoth.extractRawText` (DOCX), or `Buffer.toString('utf8')` (TXT)
4. 15 independent extractor functions run on the text
5. Returns `{ success: true, data: { fields, confidence } }`

**Response shape:**
```json
{
  "success": true,
  "data": {
    "fields": {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "9876543210",
      "currentCompany": "Acme Corp",
      "currentRole": "Senior Developer",
      "totalExperienceYears": 5.5,
      "skills": ["React", "Node.js", "TypeScript"],
      "education": [{ "degree": "B.Tech", "institution": "IIT Hyderabad", "year": "2018" }],
      "currentCTC": 1200000,
      "expectedCTC": 1500000,
      "noticePeriodDays": 30,
      "location": "Hyderabad",
      "linkedinUrl": "https://www.linkedin.com/in/janesmith",
      "githubUrl": "https://www.github.com/janesmith",
      "portfolioUrl": "https://janesmith.dev"
    },
    "confidence": {
      "name": 85,
      "email": 95,
      "phone": 95,
      "currentCompany": 80,
      "currentRole": 75,
      "totalExperienceYears": 90,
      "skills": 85,
      "education": 80,
      "currentCTC": 80,
      "expectedCTC": 80,
      "noticePeriodDays": 90,
      "location": 80,
      "linkedinUrl": 95,
      "githubUrl": 95,
      "portfolioUrl": 70
    }
  }
}
```

---

## Confidence Score Thresholds

| Score | Meaning | UI Treatment |
|-------|---------|-------------|
| 0-59  | Low — likely wrong or missing | Yellow background + "⚠ Please verify — low confidence" note |
| 60-84 | Medium — probably correct but verify | No highlight |
| 85-100 | High — pattern-matched with strong signal | No highlight |

Fields with 0 confidence = not found; they remain empty in the form.

---

## Extractor Logic Summary

| Field | Confidence When Found | Key Pattern |
|-------|-----------------------|-------------|
| name | 85 (pattern) / 50 (first-line) | First 2-5 capitalized words in top 12 lines |
| email | 95 | RFC-style email regex, lowercase |
| phone | 95 (10-digit Indian) / 80 (formatted) | +91 / 6-9XXXXXXXXX pattern |
| currentCompany | 80 (present found) / 75 (line above) | Line adjacent to "present/current/till date" |
| currentRole | 75 | Role keywords near "present" marker |
| totalExperienceYears | 90 (explicit) / 70 (calculated) | "X years experience" OR date range summation |
| skills | 85 (section found) / 60 (scan only) | Skills section + full-text KNOWN_SKILLS scan (~100 terms) |
| education | 80 | Degree regex + Indian institution keywords |
| currentCTC | 80 | "CTC: 12 LPA", "12L", "₹12,00,000" patterns |
| expectedCTC | 80 | Same patterns with "Expected/Desired" prefix |
| noticePeriodDays | 90 | "Immediate", "30 days", "2 months" etc → days integer |
| location | 80 (first 5 lines) / 70 (full text) | 50 Indian city names |
| linkedinUrl | 95 | linkedin.com/in/* regex |
| githubUrl | 95 | github.com/* regex |
| portfolioUrl | 70 | Any https URL not linkedin/github |

---

## Supported File Types

| MIME Type | Library | Notes |
|-----------|---------|-------|
| `application/pdf` | `pdf-parse` ^1.1.1 | Already installed |
| `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `mammoth` ^1.7.0 | Already installed |
| `text/plain` | Native Buffer | No dependency |

Max file size: **5MB**

---

## Form Pre-fill Mapping

| Parser Field | Form Field | Notes |
|-------------|-----------|-------|
| name | name | Direct |
| email | email | Direct |
| phone | phone | Direct |
| currentRole | title | Renamed |
| location | location | Direct |
| linkedinUrl | linkedin | Renamed |
| currentCompany | currentCompany | Direct |
| skills (Array) | skills | Joined as comma-string in form; re-split on save |
| totalExperienceYears | experience | Number → string |
| education (Array) | education | Formatted: "Degree, Institution, Year \| ..." |
| currentCTC | currentCTC | Number → string |
| expectedCTC | expectedCTC | Number → string |
| noticePeriodDays | availability | Only if value matches dropdown options |

---

## How to Test Locally

```bash
# 1. Start backend
cd backend && npm run dev

# 2. Start frontend
npm run dev

# 3. Login as recruiter or admin
# 4. Navigate to Add Candidate
# 5. Upload any PDF or DOCX resume
# 6. Watch fields auto-fill with yellow highlights on low-confidence fields
```

**Manual API test with curl:**
```bash
curl -X POST http://localhost:5000/api/candidates/parse-resume \
  -H "Authorization: Bearer <your_token>" \
  -F "resume=@/path/to/resume.pdf"
```

---

## Known Limitations

1. **Multi-column PDF layouts** — `pdf-parse` returns text left-to-right which may scramble columns; single-column resumes parse best.
2. **Scanned PDFs** — image-only PDFs return no text; an OCR layer (not implemented) would be needed.
3. **Company name extraction** — relies on "Present" marker being on the same line or within 2 lines of the company. Unusual formats may miss this.
4. **CTC detection** — only rupee-denominated values recognized; USD/EUR not handled.
5. **Education year** — picks the last year found in context; may pick graduation year instead of start year.
6. **Skills cap** — maximum 50 skills returned to avoid noise.

---

## Verification Logs
- [x] `node -e "require('./src/utils/resumeParser')"` exits cleanly (no errors)
- [x] `npm run build` passes with zero errors (confirmed 2026-04-04, commit d0815e0)
- [x] `pdf-parse`, `mammoth`, `multer` all present in `backend/package.json` — no new installs required
- [x] Route placed BEFORE `/:id` param route to avoid routing conflict
- [x] Skills always returned as Array from parser, always sent as Array to backend
- [x] FormData upload uses `req()` from client.js which auto-detects FormData and omits Content-Type header
