'use strict';
const mongoose = require('mongoose');

// A curated aptitude/placement-prep resource link added by a college's
// placement officer for their students (e.g. aptitude practice sets,
// coding-test prep, mock interview guides).
const trainingResourceSchema = new mongoose.Schema({
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  collegeName: { type: String, trim: true, default: '' },
  title:       { type: String, trim: true, required: true },
  url:         { type: String, trim: true, required: true },
  description: { type: String, trim: true, default: '' },
  category:    { type: String, enum: ['Aptitude', 'Coding', 'Verbal', 'Reasoning', 'Interview', 'Other'], default: 'Other' },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:   { type: Date, default: null },
}, { timestamps: true });

trainingResourceSchema.index({ tenantId: 1, deletedAt: 1, createdAt: -1 });

module.exports = mongoose.model('TrainingResource', trainingResourceSchema);
