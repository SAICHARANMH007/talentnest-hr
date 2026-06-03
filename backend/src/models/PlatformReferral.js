'use strict';
const mongoose = require('mongoose');

const platformReferralSchema = new mongoose.Schema({
  referrerId    : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referrerName  : { type: String },
  referrerEmail : { type: String, lowercase: true, trim: true },
  referredUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  referredName  : { type: String },
  referredEmail : { type: String, lowercase: true, trim: true },
  status        : { type: String, enum: ['invited', 'signed_up', 'active'], default: 'invited' },
  coinsAwarded  : { type: Number, default: 25 },
  convertedAt   : { type: Date },
}, { timestamps: true });

platformReferralSchema.index({ referrerId: 1 });
platformReferralSchema.index({ referredUserId: 1 }, { unique: true, sparse: true });

platformReferralSchema.virtual('id').get(function () { return this._id.toHexString(); });
platformReferralSchema.set('toJSON', { virtuals: true });
platformReferralSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PlatformReferral', platformReferralSchema);
