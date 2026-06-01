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
  industry   : { type: String, trim: true, default: '' },


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
  experience: { type: String, trim: true, default: '' },
  requirements: { type: String, default: '' },
  externalUrl: { type: String, trim: true, default: '' },
  source: { type: String, trim: true, default: '' },
  contactEmail: { type: String, trim: true, lowercase: true, default: '' },
  alternateContactEmail: { type: String, trim: true, lowercase: true, default: '' },
  contactPhone: { type: String, trim: true, default: '' },

  numberOfOpenings   : { type: Number, default: 1 },
  targetHireDate     : { type: Date },
  applicationDeadline: { type: Date, default: null },
  applicationCount   : { type: Number, default: 0 },
  urgency         : { type: String, default: '' },

  status: {
    type   : String,
    enum   : ['draft', 'active', 'closed'],
    default: 'draft',
  },

  approvalStatus: {
    type   : String,
    enum   : ['pending_approval', 'approved', 'rejected'],
    default: 'pending_approval',
  },
  approvalNote: { type: String, default: '' },
  rejectionReason: { type: String, default: '' }, // kept for backward compat
  approvedBy  : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt  : { type: Date },
  postedBy    : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  screeningQuestions: [{
    question: { type: String, required: true },
    type    : { type: String, enum: ['text', 'yesno', 'multiple'], default: 'text' },
    options : [{ type: String }], // for multiple-choice
    required: { type: Boolean, default: false },
  }],

  careerPageSlug: { type: String },
  isPublic: { type: Boolean, default: false }, // Opt-in to org career listing page

  assignedRecruiters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Full audit trail of every recruiter who has ever worked on this job.
  // Never deleted — provides complete handoff history for admin/super_admin visibility.
  recruiterHistory: [{
    recruiterId   : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recruiterName : { type: String, default: '' },
    recruiterEmail: { type: String, default: '' },
    recruiterPhone: { type: String, default: '' },
    assignedAt    : { type: Date, default: Date.now },
    removedAt     : { type: Date, default: null },   // null = currently active
    assignedBy    : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedByName: { type: String, default: '' },
  }],
}, { timestamps: true });

jobSchema.index({ tenantId: 1 });
jobSchema.index({ tenantId: 1, status: 1 });
jobSchema.index({ assignedRecruiters: 1 });
jobSchema.index({ skills: 1 });
jobSchema.index({ createdAt: -1 });
// ── Additional performance indexes ───────────────────────────────────────────────────
jobSchema.index({ tenantId: 1, status: 1, deletedAt: 1 });        // active job lists
jobSchema.index({ tenantId: 1, deletedAt: 1, createdAt: -1 });    // tenant paginated lists
jobSchema.index({ careerPageSlug: 1 });                           // public career page
jobSchema.index({ tenantId: 1, isPublic: 1, status: 1 });         // org career listing
jobSchema.index({ applicationDeadline: 1, status: 1, deletedAt: 1 }); // expiry cron
jobSchema.index({ assignedRecruiters: 1, status: 1 });            // recruiter job lists
jobSchema.index({ tenantId: 1, assignedRecruiters: 1, deletedAt: 1 }); // recruiter stats endpoint

// Keep company and companyName in sync so both field names always work
jobSchema.pre('save', function (next) {
  if (this.isModified('company') && !this.companyName) this.companyName = this.company;
  if (this.isModified('companyName') && !this.company) this.company = this.companyName;
  next();
});

jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Job', jobSchema);
