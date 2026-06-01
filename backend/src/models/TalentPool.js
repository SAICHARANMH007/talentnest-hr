'use strict';
const mongoose = require('mongoose');

const talentPoolSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name    : { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  tags    : { type: [String], default: [] },
  members : [{
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
    addedAt    : { type: Date, default: Date.now },
    addedBy    : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes      : { type: String, default: '' },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

talentPoolSchema.index({ tenantId: 1, deletedAt: 1 });
talentPoolSchema.index({ tenantId: 1, 'members.candidateId': 1 });

module.exports = mongoose.model('TalentPool', talentPoolSchema);
