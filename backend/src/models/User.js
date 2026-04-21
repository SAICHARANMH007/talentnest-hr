'use strict';
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  tenantId: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'Tenant',
    required: true,
  },

  name : { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },

  passwordHash: { type: String },

  role: {
    type    : String,
    enum    : ['super_admin', 'admin', 'recruiter', 'hiring_manager', 'client', 'candidate'],
    required: true,
  },

  isActive          : { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },

  inviteToken      : { type: String, default: null },
  inviteTokenExpiry: { type: Date,   default: null },

  lastLogin: { type: Date },

  // ── Auth helpers ──────────────────────────────────────────
  googleId            : { type: String },
  twoFactorEnabled    : { type: Boolean, default: false },
  twoFactorSecret     : { type: String,  default: null },
  failedLoginAttempts : { type: Number,  default: 0 },
  lockUntil           : { type: Date,    default: null },
  resetPasswordToken  : { type: String,  default: null },
  resetPasswordExpires: { type: Date,    default: null },

  // ── Profile ───────────────────────────────────────────────
  photoUrl    : { type: String },
  phone       : { type: String, trim: true },
  title       : { type: String, trim: true },
  location    : { type: String, trim: true },
  summary     : { type: String },
  experience  : { type: Number, min: 0, max: 60 },
  skills      : [{ type: String, lowercase: true, trim: true }],
  resumeUrl   : { type: String },
  linkedinUrl : { type: String },

  // ── Candidate extended profile ────────────────────────────
  github           : { type: String, trim: true },
  portfolio        : { type: String, trim: true },
  availability     : { type: String, trim: true },
  languages        : [{ type: String, trim: true }],
  industry         : { type: String, trim: true },
  currentCompany   : { type: String, trim: true },
  culture          : { type: String },
  projects         : { type: String },
  achievements     : { type: String },
  volunteering     : { type: String },
  workHistory      : { type: String }, // JSON string array
  educationList    : { type: String }, // JSON string array
  certifications   : { type: String }, // JSON string array / CSV
  videoResumeUrl   : { type: String },

  // ── HR placement fields ───────────────────────────────────
  relevantExperience : { type: String, trim: true },
  preferredLocation  : { type: String, trim: true },
  currentCTC         : { type: String, trim: true },
  expectedCTC        : { type: String, trim: true },
  source             : { type: String, trim: true },
  dateAdded          : { type: String, trim: true },
  candidateStatus    : { type: String, trim: true },
  additionalDetails  : { type: String },
  client             : { type: String, trim: true },
  ta                 : { type: String, trim: true },
  jobRole            : { type: String, trim: true },
  clientSpoc         : { type: String, trim: true },
  addedBy            : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // ── Recruiter assignment & outreach ──────────────────────
  assignedRecruiterId : { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  lastReachedOutAt    : { type: Date, default: null },
  reachOutNote        : { type: String },
  contactLog          : [{ note: String, date: Date, by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }],

  // ── Invite tracking ───────────────────────────────────────
  inviteStatus : { type: String, enum: ['pending', 'accepted', null], default: null },
  invitedBy    : { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  invitedAt    : { type: Date, default: null },
  deletedAt    : { type: Date, default: null },

  settings: { type: Object, default: {} },

  // ── Presence ──────────────────────────────────────────────
  lastSeen: { type: Date, default: null },
}, { timestamps: true });

userSchema.index({ tenantId: 1 });
userSchema.index({ tenantId: 1, role: 1 });
userSchema.index({ role: 1 });

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash || '');
};

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
