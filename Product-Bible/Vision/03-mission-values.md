# Mission & Values

## Mission
To make hiring in India **faster, fairer, and more transparent** — for companies who need to hire, for candidates who need jobs, and for colleges who need their students placed — by giving all three a shared, trustworthy platform instead of fragmented spreadsheets, job boards, and WhatsApp groups.

## Values reflected in the product (evidence-based, not aspirational)

### 1. Transparency over opacity
- **Company Reviews** (`companyReviews.js`, `CompanyReview.js`) let candidates rate employers publicly — a Glassdoor-style layer most Indian ATS products don't build.
- **Real-time application tracking** — candidates see their actual pipeline stage (`Application.stageHistory`), not "we'll get back to you."
- **Candidate-facing placement records** with college visibility (`/college/placements`) — placement officers and students can both see real outcomes.

### 2. India-first, not India-adapted
- **Razorpay** for billing (not Stripe-first with India as an afterthought).
- **WhatsApp** (Twilio) as a first-class communication channel alongside email — reflecting how Indian recruiters and candidates actually communicate.
- **Aadhaar/PAN-based BGV** (`BgvDocument.js` enum: `aadhar/pan/ssn/passport`) and the planned Aadhaar-linked verification spec designed around **India's identity infrastructure with zero PII storage**.

### 3. Multi-tenancy as a first principle, not a retrofit
Every single Mongoose model in the system carries a `tenantId` field (with the documented exception of cross-tenant Communities). This is not a SaaS bolt-on — it's the foundational design decision that lets one codebase serve agencies, single companies, vendors, clients, and colleges simultaneously.

### 4. Don't make people re-enter data
- **Resume parsing** (`parseResume.js`) extracts skills/experience automatically.
- **Pipeline templates**, **rejection templates**, **onboarding templates**, **interview kits** — all reusable-by-design so admins configure once and reuse across every job.
- College students' profiles double as their TalentNest candidate profiles — one identity across the candidate platform and the campus portal.

### 5. Privacy-conscious identity verification
The planned Aadhaar-linked verification (see [Compliance Documentation](../Compliance/01-compliance-documentation.md)) is explicitly designed as **name + phone match only, with zero Aadhaar data stored** — verification-as-a-signal, not data hoarding. This reflects a values choice to prioritize candidate trust even when it's the harder engineering path.

## What these values mean for prioritization
When evaluating new features, the implicit bar set by the existing codebase is:
- Does it work for **all 7 roles and 5 tenant types**, or does it create a special case?
- Does it respect **tenant data isolation** (every query scoped by `tenantId`)?
- Does it have an **India-relevant delivery channel** (WhatsApp/email, INR pricing via Razorpay)?
- Does it **reduce manual re-entry** for recruiters, candidates, or placement officers?
