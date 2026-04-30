'use strict';
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const { authenticate: auth } = require('../middleware/auth');
const { tenantGuard } = require('../middleware/tenantGuard');
const { allowRoles } = require('../middleware/rbac');
const Tenant = require('../models/Tenant');
const Organization = require('../models/Organization');
const Job = require('../models/Job');

// ── Helpers: normalize across Organization + Tenant models ─────────────────
// Platform data lives in Organization; self-service sign-ups use Tenant.
// Always check Organization first.
async function resolveOrg(tenantId) {
  const org = await Organization.findById(tenantId).lean();
  if (org) return { ...org, _model: 'org' };
  const ten = await Tenant.findById(tenantId).lean();
  if (ten) return { ...ten, _model: 'tenant' };
  return null;
}

async function updateOrg(tenantId, update) {
  const org = await Organization.findByIdAndUpdate(tenantId, update, { new: true });
  if (!org) await Tenant.findByIdAndUpdate(tenantId, update);
}

// Normalize plan/status fields that differ between models
function normBilling(org) {
  if (!org) return null;
  const status = org.subscriptionStatus
    || (org.status === 'suspended' ? 'suspended' : org.status === 'active' ? 'active' : 'active');
  const expiry = org.subscriptionExpiry || org.trialEndsAt || null;
  return { plan: org.plan || 'trial', subscriptionStatus: status, subscriptionExpiry: expiry, name: org.name };
}
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const PaymentRecord = require('../models/PaymentRecord');
const { getPublicPlans, getPlan } = require('../config/plans');
const generateInvoice = require('../utils/generateInvoice');
const { sendEmailWithRetry } = require('../utils/email');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const logger = require('../middleware/logger');

// Initialize Razorpay conditionally to prevent startup crash if keys are missing
let razorpay;
if (process.env.RAZORPAY_KEY_ID) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  logger.warn('RAZORPAY_KEY_ID is missing. Billing config is incomplete.');
}

// ── Public Routes ──────────────────────────────────────────────────────────

// GET /api/billing/plans — Return all active plans (no auth required)
router.get('/plans', (req, res) => {
  const plans = getPublicPlans();
  res.json({ success: true, data: plans });
});

// ── Protected Routes ───────────────────────────────────────────────────────

// GET /api/billing/usage — Get current plan usage and limits
router.get('/usage', auth, tenantGuard, asyncHandler(async (req, res) => {
  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant) throw new AppError('Tenant not found.', 404);

  const planKey = tenant.plan || 'trial';
  const plan = getPlan(planKey);
  const limits = plan?.limits || getPlan('starter').limits;

  // Real-time usage counts
  const [activeJobs, activeRecruiters, totalCandidates] = await Promise.all([
    Job.countDocuments({
      tenantId: req.user.tenantId,
      status: { $in: ['active', 'draft'] },
      deletedAt: null,
    }),
    User.countDocuments({
      tenantId: req.user.tenantId,
      role: 'recruiter',
      isActive: true,
    }),
    Candidate.countDocuments({
      tenantId: req.user.tenantId,
    }),
  ]);

  res.json({
    success: true,
    data: {
      planName: plan?.name || 'Trial',
      subscriptionStatus: tenant.subscriptionStatus,
      subscriptionExpiry: tenant.subscriptionExpiry,
      limits: {
        activeJobs: { used: activeJobs, max: limits.maxActiveJobs },
        recruiters: { used: activeRecruiters, max: limits.maxRecruiterSeats },
        candidates: { used: totalCandidates, max: limits.maxCandidateRecords },
        storageGB: { used: 0, max: limits.maxStorageGB }, // Storage tracking deferred
      },
    },
  });
}));

// POST /api/billing/create-order — Create a Razorpay order
router.post('/create-order', auth, asyncHandler(async (req, res) => {
  if (!razorpay) throw new AppError('Billing setup is incomplete.', 503);
  const { planName } = req.body;
  const plan = getPlan(planName);

  if (!plan) throw new AppError('Invalid plan selected.', 400);

  const options = {
    amount: plan.priceINR * 100, // Amount in paise
    currency: 'INR',
    receipt: `order_rcpt_${req.user.tenantId}_${Date.now()}`,
    notes: {
      tenantId: req.user.tenantId.toString(),
      planName,
    },
  };

  const order = await razorpay.orders.create(options);

  // Store order ID on Tenant for verification
  await Tenant.findByIdAndUpdate(req.user.tenantId, { razorpayOrderId: order.id });

  res.json({
    success: true,
    data: {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    },
  });
}));

// POST /api/billing/verify-payment — Verify payment signature and update subscription
router.post('/verify-payment', auth, asyncHandler(async (req, res) => {
  if (!razorpay) throw new AppError('Billing setup is incomplete.', 503);
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  // 1. Verify Signature
  const body = razorpayOrderId + '|' + razorpayPaymentId;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    throw new AppError('Payment verification failed. Invalid signature.', 400);
  }

  // 2. Resolve Tenant and Plan
  const tenant = await Tenant.findById(req.user.tenantId);
  const orderInfo = await razorpay.orders.fetch(razorpayOrderId);
  const planName = orderInfo.notes.planName;
  const plan = getPlan(planName);

  if (!plan) throw new AppError('Internal Error: Plan not found during verification.', 500);

  // 3. Atomically increment invoice sequence and update Tenant
  const updatedTenant = await Tenant.findByIdAndUpdate(
    req.user.tenantId,
    {
      $set: {
        plan: planName,
        subscriptionStatus: 'active',
        subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        razorpayPaymentId,
      },
      $inc: { invoiceSequence: 1 },
    },
    { new: true }
  );

  // 4. Generate GST Invoice
  const invoiceData = await generateInvoice(updatedTenant, {
    planName,
    amountINR: plan.priceINR,
    razorpayPaymentId,
  });

  // 5. Create PaymentRecord with GST breakdown
  const subtotal = plan.priceINR;
  const isInterState = (updatedTenant.billingState || '').toLowerCase() !== (process.env.TALENTNEST_STATE || 'telangana').toLowerCase();
  
  let cgst = 0, sgst = 0, igst = 0;
  if (isInterState) {
    igst = subtotal * 0.18;
  } else {
    cgst = subtotal * 0.09;
    sgst = subtotal * 0.09;
  }

  const paymentRecord = await PaymentRecord.create({
    tenantId: updatedTenant._id,
    planName,
    amountInPaise: plan.priceINR * 100,
    amountINR: plan.priceINR,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    status: 'captured',
    invoiceNumber: invoiceData.invoiceNumber,
    invoicePdfUrl: invoiceData.invoicePdfUrl,
    gstAmount: cgst + sgst + igst,
    cgst,
    sgst,
    igst,
    isInterState,
    customerGSTIN: updatedTenant.gstinNumber,
    paidAt: new Date(),
  });

  // 6. Send Confirmation Email
  await sendEmailWithRetry(
    req.user.email,
    `Payment Success — Invoice ${invoiceData.invoiceNumber}`,
    `<h1>Thank you for choosing TalentNest</h1>
     <p>Your subscription to the <b>${plan.name}</b> plan is now active.</p>
     <p><b>Invoice No:</b> ${invoiceData.invoiceNumber}</p>
     <p><a href="${invoiceData.invoicePdfUrl}">Download Invoice</a></p>`
  );

  res.json({
    success: true,
    data: {
      plan: plan.name,
      expiry: updatedTenant.subscriptionExpiry,
      invoiceNumber: invoiceData.invoiceNumber,
      invoicePdfUrl: invoiceData.invoicePdfUrl,
    },
  });
}));

// GET /api/billing/invoices — Get payment history
router.get('/invoices', auth, tenantGuard, asyncHandler(async (req, res) => {
  const invoices = await PaymentRecord.find({ tenantId: req.user.tenantId })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: invoices.map(inv => ({ ...inv, id: inv._id.toString() })),
    total: invoices.length,
  });
}));

// POST /api/billing/webhook — Handle Razorpay webhooks
router.post('/webhook', (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  const shasum = crypto.createHmac('sha256', secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest('hex');

  if (digest !== signature) {
    return res.status(403).json({ success: false, message: 'Invalid webhook signature' });
  }

  const event = req.body.event;
  // Acknowledge receipt first
  res.status(200).json({ success: true });

  // Handle events asynchronously
  (async () => {
    try {
      const { notes } = req.body.payload.payment.entity || {};
      const tenantId = notes?.tenantId;

      if (event === 'payment.captured' && tenantId) {
        logger.info(`Webhook: Payment captured for tenant ${tenantId}`);
        // Verification already handles standard flow, webhooks catch failures/asynchronous updates
      } else if (event === 'subscription.cancelled' && tenantId) {
        await Tenant.findByIdAndUpdate(tenantId, { subscriptionStatus: 'cancelled' });
      } else if (event === 'payment.failed') {
        logger.warn(`Webhook: Payment failed for entity ${req.body.payload.payment.entity.id}`);
      }
    } catch (err) {
      logger.error('Webhook processing error', { err: err.message });
    }
  })();
});

module.exports = router;
