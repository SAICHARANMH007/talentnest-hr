const mongoose = require('mongoose');

const headcountEntrySchema = new mongoose.Schema({
  department  : { type: String, required: true, trim: true },
  role        : { type: String, required: true, trim: true },
  currentCount: { type: Number, default: 0 },
  targetCount : { type: Number, required: true },
  priority    : { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
  targetDate  : { type: Date, default: null },
  notes       : { type: String, default: '' },
  jobId       : { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  filled      : { type: Number, default: 0 },
}, { _id: true });

const headcountPlanSchema = new mongoose.Schema({
  tenantId : { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name     : { type: String, required: true, trim: true },
  year     : { type: Number, required: true },
  quarter  : { type: String, enum: ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'], default: 'Annual' },
  entries  : [headcountEntrySchema],
  status   : { type: String, enum: ['draft', 'active', 'closed'], default: 'draft' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

headcountPlanSchema.index({ tenantId: 1, deletedAt: 1 });

module.exports = mongoose.model('HeadcountPlan', headcountPlanSchema);
