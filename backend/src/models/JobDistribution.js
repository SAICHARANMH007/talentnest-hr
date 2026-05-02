'use strict';
const mongoose = require('mongoose');

// Equivalent of job_distribution_log but as a MongoDB collection
const jobDistributionSchema = new mongoose.Schema({
  jobId       : { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true, index: true },
  tenantId    : { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
  platform    : { type: String, required: true, index: true },  // 'google', 'indeed', 'jooble', etc.
  platformJobUrl: { type: String, default: null },
  status      : {
    type: String,
    enum: ['pending', 'success', 'failed', 'skipped', 'expired', 'retry', 'permanently_failed'],
    default: 'pending',
    index: true,
  },
  responseCode    : { type: Number, default: null },
  responseMessage : { type: String, default: null },
  attemptCount    : { type: Number, default: 1 },
  lastAttemptedAt : { type: Date, default: Date.now },
  distributedAt   : { type: Date, default: null },
  expiredAt       : { type: Date, default: null },
}, { timestamps: true });

jobDistributionSchema.index({ jobId: 1, platform: 1 }, { unique: true });
jobDistributionSchema.index({ status: 1, attemptCount: 1 });

module.exports = mongoose.model('JobDistribution', jobDistributionSchema);
