'use strict';
const mongoose = require('mongoose');

const companyReviewSchema = new mongoose.Schema({
  // Optional: reviews written from a Company Community (e.g. "Wipro
  // Community") describe a company that may not be a TalentNest tenant, so
  // tenantId is only set when the reviewer belongs to a real org/tenant.
  tenantId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  reviewerName:  { type: String, default: 'Anonymous' },
  role:          { type: String, trim: true, default: '' },
  rating:        { type: Number, required: true, min: 1, max: 5 },
  title:         { type: String, trim: true, default: '' },
  pros:          { type: String, trim: true, default: '' },
  cons:          { type: String, trim: true, default: '' },
  companyName:   { type: String, trim: true, default: '' },
  isAnonymous:   { type: Boolean, default: true },
  // No approval gate — reviews are live immediately
  isApproved:    { type: Boolean, default: true },
  // Admin can flag a review for super-admin attention
  isReported:    { type: Boolean, default: false },
  reportReason:  { type: String, trim: true, default: '' },
  reportedByName:{ type: String, trim: true, default: '' },
  reportedAt:    { type: Date,    default: null },
  deletedAt:     { type: Date,    default: null },
}, { timestamps: true });

companyReviewSchema.index({ tenantId: 1, deletedAt: 1 });
companyReviewSchema.index({ isReported: 1, deletedAt: 1 });

module.exports = mongoose.model('CompanyReview', companyReviewSchema);
