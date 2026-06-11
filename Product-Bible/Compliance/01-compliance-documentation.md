# Compliance Documentation

> **Scope note**: This document describes what the *codebase currently implements* with respect to data protection, plus the explicitly-planned Aadhaar verification capability. It is **not** a legal compliance certification. Any formal DPDP Act 2023, GDPR, or SOC2 compliance claims require legal/compliance review beyond what can be derived from source code.

## 1. Data residency
- **Database**: MongoDB Atlas — region/cluster configuration is an infrastructure setting (Atlas project config), not visible in this codebase. For India-first positioning (per [Market Opportunity](../Business/01-market-opportunity.md)), an Atlas region in `ap-south-1` (Mumbai) or similar would align with DPDP Act 2023 data-localization expectations for sensitive personal data — **verify actual cluster region in Atlas dashboard; not confirmable from code**.
- **Media storage**: Cloudinary (third-party, region depends on Cloudinary account configuration).
- **Email/SMS providers**: Resend, Zoho SMTP, Twilio, Fast2SMS — all third-party processors of candidate contact information (email, phone).

## 2. Personal data inventory (by model)
| Category | Models | Notes |
|---|---|---|
| Identity & contact | `User.js`, `Candidate.js` | Name, email, phone, `googleId` |
| Employment history | `Candidate.js` (`currentCompany`, `currentCTC`/`expectedCTC`, `experience`) | |
| Documents | `BgvDocument.js` (`documentType: aadhar/pan/ssn/passport`, `documentUrl`), `Candidate.resumeUrl`, `Candidate.videoResumeUrl`, `OfferLetter.documentUrl`/`signatureImageUrl` | Stored via Cloudinary URLs |
| Communication logs | `EmailLog.js`, `WhatsAppLog.js`, `DirectMessage.js` | |
| Behavioral/feedback | `CandidateNPS.js`, `CompanyReview.js`, `AssessmentSubmission.js` | |
| Financial | `PaymentRecord.js` (Razorpay order/payment/signature), `Tenant.js` billing fields | Tenant-level billing, not candidate financial data |
| Audit | `AuditLog.js` | `ipAddress`, `oldValue`/`newValue` (may contain PII deltas) |

## 3. Soft-delete & retention
- Per [Database Documentation](../Technical/01-database-documentation.md#multi-tenancy-convention), most models support `deletedAt` and are filtered from default queries ("soft delete").
- **No automated purge/retention job was identified** — soft-deleted records (including those containing PII) persist in MongoDB indefinitely unless manually removed.
- **Recommendation** (not yet implemented): a scheduled retention job (e.g., hard-delete records with `deletedAt` older than N days) would align with DPDP Act 2023's storage-limitation principle and "right to erasure" expectations.

## 4. BGV (Background Verification) document handling — CURRENT
- `BgvDocument.js`: `tenantId`, `candidateId`, `userId`, `documentType` (`aadhar/pan/ssn/passport`), `documentUrl`, `verificationStatus` (`pending/approved/rejected`), `verifiedBy`.
- Exposed via `bgv.js` (`/api/bgv`, `authenticate` + `tenantGuard`).
- **This is document-upload-based verification** — actual government ID document images/PDFs are uploaded (via Cloudinary) and manually reviewed by a recruiter/admin (`verifiedBy`). This is the *current, implemented* BGV flow and is distinct from the zero-PII Aadhaar verification described below.
- **Implication**: `BgvDocument.documentUrl` for `documentType: 'aadhar'` may store an actual Aadhaar card image — this is sensitive personal data under DPDP Act 2023 and should be access-controlled (already gated by `authenticate`+`tenantGuard`) and ideally encrypted at rest (Cloudinary-side encryption — verify account settings).

## 5. Aadhaar-Linked Candidate Verification — `PLANNED FUTURE CAPABILITY`
This is the one explicitly-planned major compliance-relevant feature, referenced in [Workflow Diagrams §5](../Product/08-workflow-diagrams.md) and [Future Vision](../Vision/05-future-vision-5-10-20-years.md).

**Design intent (zero-PII-storage)**:
```
[Candidate initiates verification]
        │
        ▼
[Candidate enters: name + phone number (linked to Aadhaar)]
        │
        ▼
[System calls verification provider — match name+phone against Aadhaar-linked record]
        │
        ├─ Match    ──► Candidate.platformVerified = true; name field LOCKED (cannot be edited)
        └─ No match ──► Verification fails; candidate profile remains unverified
```

**Key compliance properties of this planned design**:
1. **No Aadhaar number is collected or stored** — only name + phone number (data the candidate already provides).
2. **No biometric data** is collected.
3. **No document image** (e.g., Aadhaar card photo) is uploaded or stored for this flow.
4. The verification provider performs the match server-side (third-party UIDAI-authorized API); TalentNest stores only the **boolean result** (`Candidate.platformVerified`) and locks the verified `name` field.
5. This is **distinct from `BgvDocument.js`** (§4 above), which *does* store document images today — the two should not be conflated. If/when Aadhaar verification ships, it could reduce reliance on document-upload BGV for identity (though BGV may still be needed for employment-history checks).

**Status**: Not implemented in code as of this audit. `Candidate.platformVerified` field exists on the model (per [Database Documentation](../Technical/01-database-documentation.md)) but the verification-provider integration described above is not present.

## 6. Third-party data processors (subprocessor list — for DPA purposes)
| Provider | Data shared | Purpose |
|---|---|---|
| MongoDB Atlas | All platform data | Primary database |
| Cloudinary | Resumes, video resumes, BGV documents, profile/org images, offer PDFs | Media storage/CDN |
| Resend, Zoho (SMTP) | Recipient email addresses, message content | Transactional email |
| Twilio | Phone numbers, message content | WhatsApp/SMS |
| Fast2SMS | Phone numbers | SMS (India) |
| Razorpay | Tenant billing contact, payment metadata | Subscription billing |
| Google (OAuth) | Email, name, profile photo (OAuth scopes) | Login |
| Vercel, Render | All traffic (infrastructure) | Hosting |
| Gemini API (Google) | Varies by feature — verify scope | AI/text features (where applicable) |

## 7. Recommendations (gap-driven, none implemented)
1. Formal data-retention policy + automated purge job for soft-deleted PII (DPDP Act storage-limitation principle).
2. Documented Data Processing Agreements (DPAs) with each subprocessor in §6.
3. Confirm MongoDB Atlas cluster region for India data-residency claims.
4. Encryption-at-rest verification for Cloudinary-stored BGV documents (Aadhaar/PAN/passport images).
5. Candidate-facing privacy policy describing the §6 subprocessor list (a marketing/legal deliverable, not a code change).
6. When Aadhaar verification (§5) is built, ensure the zero-PII design is preserved end-to-end (no logging of provider request/response bodies containing Aadhaar numbers, even transiently).
