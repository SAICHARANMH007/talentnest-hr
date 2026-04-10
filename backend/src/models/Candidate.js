'use strict';
const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  tenantId: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'Tenant',
    required: true,
  },

  name : { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },

  resumeUrl      : { type: String },
  videoResumeUrl : { type: String },

  parsedProfile: {
    skills: { type: [String], default: [] },

    experience: [{
      company    : { type: String },
      role       : { type: String },
      startDate  : { type: String },
      endDate    : { type: String },
      description: { type: String },
    }],

    education: [{
      institution: { type: String },
      degree     : { type: String },
      field      : { type: String },
      year       : { type: String },
    }],

    totalExperienceYears: { type: Number },
  },

  tags: { type: [String], default: [] },

  source: {
    type: String,
    enum: ['manual', 'resume_upload', 'bulk_import', 'invite_link', 'career_page', 'referral'],
  },

  interestStatus: {
    type   : String,
    enum   : ['pending', 'interested', 'not_interested'],
    default: 'pending',
  },

  noticePeriodDays: { type: Number },
  currentSalary   : { type: Number },
  expectedSalary  : { type: Number },
  location        : { type: String },

  willingToRelocate: { type: Boolean, default: false },
}, { timestamps: true });

candidateSchema.index({ tenantId: 1 });
candidateSchema.index({ tenantId: 1, source: 1 });
candidateSchema.index({ email: 1 });

candidateSchema.set('toJSON', { virtuals: true });
candidateSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Candidate', candidateSchema);
