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

  // ── Core profile ────────────────────────────────────────────────────────────
  title          : { type: String, trim: true },     // current job title / designation
  summary        : { type: String },                 // professional summary / bio
  skills         : { type: [String], default: [] },  // always an array
  experience     : { type: Number, min: 0, max: 60 }, // total experience in years
  location       : { type: String, trim: true },
  linkedinUrl    : { type: String, trim: true },
  resumeUrl      : { type: String },
  videoResumeUrl : { type: String },

  // ── HR placement fields ─────────────────────────────────────────────────────
  currentCompany     : { type: String, trim: true },
  currentCTC         : { type: String, trim: true },   // e.g. "12 LPA"
  expectedCTC        : { type: String, trim: true },
  relevantExperience : { type: String, trim: true },   // e.g. "3y Java"
  preferredLocation  : { type: String, trim: true },
  availability       : { type: String, trim: true },   // e.g. "immediate", "30 days"
  noticePeriodDays   : { type: Number },
  candidateStatus    : { type: String, trim: true },   // active / passive / placed
  certifications     : { type: String },               // CSV or freetext
  client             : { type: String, trim: true },   // client company name
  ta                 : { type: String, trim: true },   // TA / source owner
  clientSpoc         : { type: String, trim: true },
  additionalDetails  : { type: String },

  // ── Structured history (JSON strings kept for backward compat) ─────────────
  workHistory  : { type: String },   // JSON array of work entries
  educationList: { type: String },   // JSON array of education entries
  parsedProfile: {
    skills: { type: [String], default: [] },
    experience: [{
      company: String, role: String, startDate: String, endDate: String, description: String,
    }],
    education: [{
      institution: String, degree: String, field: String, year: String,
    }],
    totalExperienceYears: { type: Number },
  },

  // ── Legacy salary fields (kept for existing data) ──────────────────────────
  currentSalary  : { type: Number },
  expectedSalary : { type: Number },
  willingToRelocate: { type: Boolean, default: false },

  // ── Classification ──────────────────────────────────────────────────────────
  tags: { type: [String], default: [] },
  source: {
    type: String,
    enum: ['manual', 'resume_upload', 'bulk_import', 'invite_link', 'career_page', 'referral', 'platform'],
    default: 'platform',
  },
  interestStatus: {
    type: String,
    enum: ['pending', 'interested', 'not_interested'],
    default: 'pending',
  },

  // ── Recruiter tracking ──────────────────────────────────────────────────────
  assignedRecruiterId : { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  addedBy             : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lastReachedOutAt    : { type: Date, default: null },
  reachOutNote        : { type: String },
  contactLog          : [{ note: String, date: Date, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],

  // ── Account link ───────────────────────────────────────────────────────────
  // When a career-page applicant creates an account, this links to their User doc
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // ── Soft delete ─────────────────────────────────────────────────────────────
  // Attribution (VMS Support)
  submittedByTenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },

  deletedAt: { type: Date, default: null },
}, { timestamps: true });

candidateSchema.index({ tenantId: 1 });
candidateSchema.index({ tenantId: 1, source: 1 });
candidateSchema.index({ email: 1 });
candidateSchema.index({ email: 1, tenantId: 1, deletedAt: 1 });
// ── Additional performance indexes ───────────────────────────────────────────────
candidateSchema.index({ assignedRecruiterId: 1, tenantId: 1 }); // recruiter assignment queries
candidateSchema.index({ tenantId: 1, deletedAt: 1, createdAt: -1 }); // paginated list views
candidateSchema.index({ skills: 1 });                           // AI match scoring


candidateSchema.set('toJSON', { virtuals: true });
candidateSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Candidate', candidateSchema);
