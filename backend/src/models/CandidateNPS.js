'use strict';
const mongoose = require('mongoose');

const candidateNPSSchema = new mongoose.Schema({
  tenantId      : { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant',      required: true },
  applicationId : { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  candidateId   : { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate',   required: true },
  jobId         : { type: mongoose.Schema.Types.ObjectId, ref: 'Job',         required: true },

  score          : { type: Number, min: 1, max: 10 },
  wouldRecommend : { type: Boolean },
  feedbackText   : { type: String, trim: true },
  applicationOutcome: { type: String, enum: ['hired', 'rejected'] },

  surveyToken   : { type: String, required: true, unique: true },
  emailSentAt   : { type: Date },
  respondedAt   : { type: Date },
}, { timestamps: true });

candidateNPSSchema.index({ tenantId: 1 });
candidateNPSSchema.index({ applicationId: 1 });
candidateNPSSchema.virtual('id').get(function () { return this._id.toHexString(); });
candidateNPSSchema.set('toJSON', { virtuals: true });
candidateNPSSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CandidateNPS', candidateNPSSchema);
