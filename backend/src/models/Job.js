'use strict';
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  tenantId: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'Tenant',
    required: true,
  },

  createdBy: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'User',
    required: true,
  },

  clientId: {
    type   : mongoose.Schema.Types.ObjectId,
    ref    : 'Client',
    default: null,
  },

  title      : { type: String, required: true, trim: true },
  description: { type: String },

  // Company info (set by recruiter/admin at job creation time)
  company    : { type: String, trim: true, default: '' },
  companyName: { type: String, trim: true, default: '' }, // alias kept for older frontend references
  department : { type: String, trim: true, default: '' },

  skills           : { type: [String], default: [] },
  niceToHaveSkills : { type: [String], default: [] },

  salaryMin     : { type: Number },
  salaryMax     : { type: Number },
  salaryCurrency: { type: String, default: 'INR' },
  salaryType    : {
    type   : String,
    enum   : ['monthly', 'annual', 'CTC'],
    default: 'CTC',
  },

  location: { type: String, trim: true },
  jobType : { type: String },

  numberOfOpenings: { type: Number, default: 1 },
  targetHireDate  : { type: Date },
  applicationCount: { type: Number, default: 0 },
  urgency         : { type: String, default: '' },

  status: {
    type   : String,
    enum   : ['draft', 'active', 'closed'],
    default: 'draft',
  },

  approvalStatus: {
    type   : String,
    enum   : ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejectionReason: { type: String, default: '' },

  screeningQuestions: [{
    question: { type: String, required: true },
    type    : { type: String, enum: ['text', 'yesno', 'multiple'], default: 'text' },
    options : [{ type: String }], // for multiple-choice
    required: { type: Boolean, default: false },
  }],

  careerPageSlug: { type: String },

  assignedRecruiters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

jobSchema.index({ tenantId: 1 });
jobSchema.index({ tenantId: 1, status: 1 });
jobSchema.index({ assignedRecruiters: 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ createdAt: -1 });

// Keep company and companyName in sync so both field names always work
jobSchema.pre('save', function (next) {
  if (this.isModified('company') && !this.companyName) this.companyName = this.company;
  if (this.isModified('companyName') && !this.company) this.company = this.companyName;
  next();
});

jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Job', jobSchema);
