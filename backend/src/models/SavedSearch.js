'use strict';
const mongoose = require('mongoose');

const savedSearchSchema = new mongoose.Schema({
  tenantId : { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  userId   : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name     : { type: String, required: true, trim: true },
  context  : { type: String, enum: ['candidates', 'applications', 'jobs'], default: 'candidates' },
  filters  : { type: mongoose.Schema.Types.Mixed, default: {} }, // arbitrary query params
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

savedSearchSchema.index({ userId: 1, deletedAt: 1 });
savedSearchSchema.index({ tenantId: 1, deletedAt: 1 });

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
