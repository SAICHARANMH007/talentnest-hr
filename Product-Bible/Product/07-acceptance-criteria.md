# Acceptance Criteria

Given/When/Then criteria for the highest-value flows, written against current implemented behavior. These can be used directly as the basis for QA test scripts (see [Test Cases](../QA/02-test-cases.md)).

## AC-1: Public job application (no account required)
- **Given** a published job has a public career page slug
- **When** a visitor fills out the application form (name, email, phone, cover letter) and submits without logging in
- **Then** the system shall: find or create a guest `Candidate` by email, prevent a duplicate application for the same job+email (return 409 if duplicate), send a confirmation email, and increment the job's application count.
- **Source**: `POST /api/applications/public` (`applications.js`)

## AC-2: Application stage change notifications
- **Given** an application's `currentStage` is changed by a recruiter or admin
- **When** the new stage is `selected`, `offer_extended`, or `rejected`
- **Then** the system shall notify the org's admins/super-admins **and** the assigned recruiters (excluding the user who made the change), via the `Notification` model (visible in the notification bell).
- **Source**: `applications.js` stage-change handler

## AC-3: Resume upload → profile auto-population
- **Given** a candidate uploads a resume (PDF/DOCX)
- **When** the upload completes
- **Then** the system shall extract and populate `skills`, `experience`, and contact fields on the `Candidate` profile via `parseResume.js`, without requiring manual re-entry.

## AC-4: Offer letter generation and signing
- **Given** a recruiter creates an offer with `ctcOffered`, `tenure`, and `joiningDate`
- **When** the offer is sent
- **Then** the system shall generate a PDF (PDFKit), set `OfferLetter.status = 'sent'`, and allow the candidate to digitally sign (storing `signatureImageUrl`), transitioning status to `accepted` or `rejected`.

## AC-5: BGV document verification
- **Given** a candidate uploads a BGV document of type `aadhar/pan/ssn/passport`
- **When** an admin/recruiter reviews it
- **Then** the system shall allow setting `verificationStatus` to `approved` or `rejected` and record `verifiedBy`.

## AC-6: Communities load performance
- **Given** a user navigates to the Communities page
- **When** the page loads
- **Then** the community list shall render in under 1 second, sorted by (1) the user's own college/company first, (2) live `memberCount` descending, (3) alphabetically — and maintenance sync jobs shall not run on this request unless more than `MAINTENANCE_SYNC_INTERVAL_MS` (10 min) has elapsed since the last run.

## AC-7: Near-duplicate college name merging
- **Given** two college names like "B.V. Raju Institute of Technology" and "BV Raju Institute of Technology" exist in candidate education records
- **When** Communities or College Groups are computed
- **Then** both shall be normalized via `normalizeCollegeKey` (`collegeNames.js`) into a single community/row, used consistently in `communities.js` and `dashboard.js` (`/college-groups`).

## AC-8: Company review submission for Company Communities (Super Admin)
- **Given** a `super_admin` user writes a review from a Company Community page
- **When** the review is submitted
- **Then** the system shall **not** require `tenantId` on `CompanyReview` (since `tenantGuard` does not set `req.tenantId` for `super_admin`), and the review shall save successfully without a `Path 'tenantId' is required` validation error.

## AC-9: College Overview drill-down navigation
- **Given** a placement officer is on the College Overview dashboard
- **When** they click a stat card (e.g. "Placements"), a department/batch breakdown bar, a recent placement row, or a top hiring company row
- **Then** the system shall navigate to `/app/candidates` or `/app/applicants` with appropriate query params (`type`, `dept`, `year`, `stage`, `company`, `q`), and the destination page shall apply those filters on initial load and display a "Filtered by: ... ✕ Clear" chip.

## AC-10: Student skill recommendations
- **Given** a placement officer opens a student's profile in College Students
- **When** the profile modal loads
- **Then** the system shall fetch and display `getStudentSkillRecommendations(studentId)` results — a list of skills the student lacks (relative to in-demand job skills) with recommended courses (title, provider, URL) — or a message indicating the student's skills already cover current demand if the list is empty.

## AC-11: Placement record private notes
- **Given** a placement officer views a placement record in College Placements
- **When** they click the notes cell and enter a note, then click Save
- **Then** the system shall persist the note via `api.updateCollegePlacementNotes(recordId, note)`, scoped to the college tenant (not visible to other colleges or the candidate), and update the row in place without a full page reload.

## AC-12: Playbook generation does not throw at runtime
- **Given** a super admin clicks "Preview" or "Download" on any preset playbook card (including Product Intelligence and Complete Platform Bible)
- **When** `pb.fn()` is invoked
- **Then** the function shall return a complete HTML string without throwing — verified by executing all 11 `build*Playbook` functions in isolation, all returning successfully (regression test for the `ReferenceError: amp is not defined` bug fixed in commit `d5fd074`).

---

For acceptance criteria covering **planned** features (Aadhaar verification, public API, AI matching), see [Missing Features Analysis](../Roadmap/02-missing-features-analysis.md) — these would need their own AC sets once specced for implementation.
