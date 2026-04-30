'use strict';
const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  // Core
  name  : { type: String, required: true, trim: true },
  slug  : { type: String, required: true, unique: true, lowercase: true, trim: true },
  domain: { type: String, trim: true },
  logoUrl: { type: String },
  website: { type: String },
  industry: { type: String },
  size: { type: String },
  location: { type: String },

  // Hierarchy (The "Parent-Child" / "Vendor-Client" logic)
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
  type: { type: String, enum: ['org', 'tenant', 'vendor', 'client'], default: 'tenant' },

  // Business Logic
  isRecruitmentAgency: { type: Boolean, default: false },
  isStaffingAgency: { type: Boolean, default: false }, // Alias for recruitment agency logic

  plan: {
    type   : String,
    enum   : ['free', 'trial', 'starter', 'basic', 'growth', 'pro', 'agency', 'enterprise'],
    default: 'trial',
  },

  // Legacy Status Support (Organization uses 'status')
  status: {
    type: String,
    enum: ['active', 'suspended', 'trial', 'pending'],
    default: 'active'
  },

  // Subscription Status (Tenant uses 'subscriptionStatus')
  subscriptionStatus: {
    type   : String,
    enum   : ['active', 'expired', 'suspended', 'cancelled'],
    default: 'active'
  },

  subscriptionExpiry  : { type: Date },
  currentPeriodStart  : { type: Date },
  currentPeriodEnd    : { type: Date },

  // Razorpay references
  razorpayOrderId     : { type: String },
  razorpayPaymentId   : { type: String },

  // Stripe references (from Org)
  stripeCustomerId     : { type: String },
  stripeSubscriptionId : { type: String },

  // GST / billing details
  gstinNumber         : { type: String, trim: true },
  billingAddress      : { type: String, trim: true },
  billingState        : { type: String, trim: true },

  // Auto-incrementing invoice sequence
  invoiceSequence     : { type: Number, default: 0 },

  // Admin / Ownership
  adminId  : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: String },

  settings: {
    maxJobs           : { type: Number, default: 10 },
    maxRecruiters     : { type: Number, default: 5 },
    maxCandidates     : { type: Number, default: 1000 },
    features          : [{ type: String }],
    pipelineStages: {
      type   : [String],
      default: [
        'Applied',
        'Screening',
        'Shortlisted',
        'Interview Round 1',
        'Interview Round 2',
        'Offer',
        'Hired',
        'Rejected',
      ],
    },
    emailTemplate: { type: String },
    brandColors  : {
      primary  : { type: String, default: '#0176D3' },
      secondary: { type: String },
    },
  },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

tenantSchema.index({ domain: 1 });
tenantSchema.index({ parentId: 1 });
tenantSchema.index({ slug: 1 });

// Compatibility Virtuals
tenantSchema.virtual('id').get(function() { return this._id.toHexString(); });

tenantSchema.set('toJSON', { virtuals: true });
tenantSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Tenant', tenantSchema);
