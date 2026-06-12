'use strict';
const mongoose = require('mongoose');

// A hiring requirement raised by a Client (external company) for the staffing
// org to work on. Lives independently of Job until a recruiter/admin converts
// it into an actual job posting.
const jobRequirementSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true,
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  title              : { type: String, required: true, trim: true },
  department         : { type: String, default: '' },
  location           : { type: String, default: '' },
  employmentType     : { type: String, default: 'full_time' },
  openings           : { type: Number, default: 1, min: 1 },
  experienceRequired : { type: String, default: '' },
  skillsRequired     : [{ type: String }],
  budgetRange        : { type: String, default: '' },
  priority           : { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  description        : { type: String, default: '' },

  status: {
    type: String,
    enum: ['new', 'in_progress', 'converted', 'closed'],
    default: 'new',
  },
  assignedRecruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  convertedJobId   : { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  internalNotes    : { type: String, default: '' },

  deletedAt: { type: Date, default: null },
}, { timestamps: true });

jobRequirementSchema.index({ tenantId: 1, status: 1 });
jobRequirementSchema.index({ tenantId: 1, clientId: 1 });
jobRequirementSchema.index({ assignedRecruiter: 1 });

jobRequirementSchema.set('toJSON', { virtuals: true });
jobRequirementSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('JobRequirement', jobRequirementSchema);
