# TalentNest HR — Developer Playbook v9.0
*Generated: 2026-04-04 | Commit: 3f8d92a*

---

## What Changed in v9 (Task Group 1: Billing & Subscriptions)

Implemented a robust, production-ready billing system with Razorpay integration, automated GST invoices, and plan limit enforcement.

### Key Components Built

1.  **Plan Configuration (`backend/src/config/plans.js`)**
    - Defined 3 tiers: **Starter** (2,999), **Growth** (4,999), **Agency** (9,999).
    - Established strict quotas for active jobs, recruiter seats, candidate records, and storage.
    - Added security layer to strip Razorpay plan IDs from public API responses.

2.  **Billing Data Models**
    - **`Tenant.js`**: Enhanced with billing details (GSTIN, Address, State), subscription timestamps, and automatic `invoiceSequence` tracking.
    - **`PaymentRecord.js`**: New model to log every capture, storing full GST breakdowns (CGST/SGST/IGST), Razorpay signatures, and Cloudinary invoice URLs.

3.  **GST Invoice Generation (`backend/src/utils/generateInvoice.js`)**
    - Professional PDF generation using `pdfkit`.
    - Dynamic tax calculation: **IGST (18%)** for inter-state, **CGST (9%) + SGST (9%)** for intra-state.
    - Automatic upload to Cloudinary (`/invoices` folder).

4.  **Quota Enforcement (`backend/src/middleware/checkPlanLimits.js`)**
    - Synchronized with `plans.js` to block resource creation (Jobs, Recruiters, Candidates) when limits are hit.
    - Provides a direct `upgradeUrl` (/billing) in the error response.

5.  **Razorpay Integration (`backend/src/routes/billing.js`)**
    - `POST /create-order`: Securely initiates payments.
    - `POST /verify-payment`: Verifies HMAC signatures, triggers subscription activation, generates invoices, and sends confirmation emails via Resend.
    - `POST /webhook`: Robust handler for `payment.captured` and `subscription.cancelled`.

6.  **Admin Billing UI (`src/pages/billing/BillingPage.jsx`)**
    - Real-time usage meters (progress bars) for all plan limits.
    - Integrated Razorpay Checkout widget.
    - Self-serve GST and Billing Address configuration.
    - Downloadable purchase history linked to Cloudinary PDF invoices.

### Environment Variables Added (REQUIRED)
| Name | Description |
|------|-------------|
| `RAZORPAY_KEY_ID` | Public key from Razorpay Dashboard |
| `RAZORPAY_KEY_SECRET` | Private key from Razorpay Dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | Secret set in Razorpay Webhook settings |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary name for storage |
| `CLOUDINARY_API_KEY` | Cloudinary key |
| `CLOUDINARY_API_SECRET` | Cloudinary secret |
| `TALENTNEST_STATE` | Our registered state (e.g., "Maharashtra") |
| `TALENTNEST_GSTIN` | Our company GST number |
| `TALENTNEST_ADDRESS` | Our office address (Footer of invoice) |

---

## Technical Debt / Next Steps
- Implement storage limit tracking (currently set to 0/max).
- Add support for discount coupons in Razorpay orders.

---

## Verification Logs
- [x] Schema validation for `Tenant` and `PaymentRecord`.
- [x] Middleware correctly blocks creation on a "Starter" plan at 5 jobs.
- [x] PDF calculations verified for both Intra-state and Inter-state.
- [x] `npm run build` passes with zero errors (confirmed 2026-04-04, commit 3a64cca).
- [x] `razorpay ^2.9.6` and `cloudinary` installed in `backend/package.json`.
- [x] `checkPlanLimits('recruiters')` applied to `POST /api/users`.
- [x] `AppError` updated to accept optional 3rd `data` argument.
- [x] `generateInvoice.js` scoping bug fixed — `invoiceNumber` declared before use.
- [x] `AddCandidateForm.jsx` JSX corruption fixed (caused build failure).
