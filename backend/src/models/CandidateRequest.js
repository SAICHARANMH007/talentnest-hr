'use strict';
const mongoose = require('mongoose');

const candidateRequestSchema = new mongoose.Schema({
  tenantId: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'Tenant',
    required: true,
  },

  requestedBy: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'User',
    required: true,
  },

  roleTitle   : { type: String },
  requirements: { type: String },

  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
  },

  budget    : { type: String },
  adminNotes: { type: String },

  status: {
    type   : String,
    enum   : ['pending', 'in_progress', 'fulfilled', 'cancelled'],
    default: 'pending',
  },

  submittedCandidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' }],

  chargeAmount: { type: Number },
  fulfilledAt : { type: Date },
}, { timestamps: true });

candidateRequestSchema.index({ tenantId: 1 });
candidateRequestSchema.index({ tenantId: 1, status: 1 });
candidateRequestSchema.index({ requestedBy: 1 });

candidateRequestSchema.set('toJSON', { virtuals: true });
candidateRequestSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CandidateRequest', candidateRequestSchema);
