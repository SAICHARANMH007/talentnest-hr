'use strict';
const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  name  : { type: String, required: true, trim: true },
  slug  : { type: String, required: true, unique: true, lowercase: true, trim: true },
  domain: { type: String, trim: true },
  logoUrl: { type: String },

  isRecruitmentAgency: { type: Boolean, default: false },

  plan: {
    type   : String,
    enum   : ['free', 'trial', 'starter', 'basic', 'growth', 'pro', 'agency', 'enterprise'],
    default: 'trial',
  },

  subscriptionStatus: {
    type   : String,
    enum   : ['active', 'expired', 'suspended', 'cancelled'],
  },

  subscriptionExpiry  : { type: Date },
  currentPeriodStart  : { type: Date },
  currentPeriodEnd    : { type: Date },

  // Razorpay references
  razorpayOrderId     : { type: String },
  razorpayPaymentId   : { type: String },

  // GST / billing details
  gstinNumber         : { type: String, trim: true },
  billingAddress      : { type: String, trim: true },
  billingState        : { type: String, trim: true },

  // Auto-incrementing invoice sequence
  invoiceSequence     : { type: Number, default: 0 },

  settings: {
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
      primary  : { type: String },
      secondary: { type: String },
    },
  },
}, { timestamps: true });

tenantSchema.index({ domain: 1 });

tenantSchema.set('toJSON', { virtuals: true });
tenantSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Tenant', tenantSchema);
