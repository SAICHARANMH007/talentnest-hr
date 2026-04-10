'use strict';
const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  tenantId          : { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  referredByName    : { type: String },
  referredByEmail   : { type: String, lowercase: true, trim: true },
  referredByEmployeeId: { type: String },
  candidateId       : { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
  jobId             : { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  referralLinkToken : { type: String, unique: true, required: true },

  status: {
    type   : String,
    enum   : ['pending', 'applied', 'hired'],
    default: 'pending',
  },

  rewardPaid      : { type: Boolean, default: false },
  rewardAmount    : { type: Number },
  rewardPaidAt    : { type: Date },
}, { timestamps: true });

referralSchema.index({ tenantId: 1 });
referralSchema.index({ referralLinkToken: 1 });
referralSchema.index({ tenantId: 1, status: 1 });

referralSchema.virtual('id').get(function () { return this._id.toHexString(); });
referralSchema.set('toJSON', { virtuals: true });
referralSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Referral', referralSchema);
