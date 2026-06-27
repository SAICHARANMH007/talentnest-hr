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
    enum    : ['super_admin', 'admin', 'recruiter', 'hiring_manager', 'client', 'candidate', 'placement_officer'],
    required: true,
  },

  // Mirrors Tenant.type so the UI can tailor navigation (e.g. 'college' admins get a Campus Portal nav)
  tenantType: { type: String, trim: true, default: '' },

  // For role === 'client': scopes this login to a single Client company's jobs/applications.
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },

  isActive          : { type: Boolean, default: true },
  mustChangePassword: { type: Boolean, default: false },

  inviteToken      : { type: String, default: null },
  inviteTokenExpiry: { type: Date,   default: null },

  lastLogin: { type: Date },

  // Last known login location (captured on candidate login via browser geolocation)
  lastLoginLocation: {
    lat      : { type: Number, default: null },
    lng      : { type: Number, default: null },
    city     : { type: String, default: '' },
    country  : { type: String, default: '' },
    ip       : { type: String, default: '' },
    recordedAt: { type: Date, default: null },
  },

  // ── BGV (Background Verification) ────────────────────────
  bgvVerified         : { type: Boolean, default: false },
  bgvVerifiedAt       : { type: Date,    default: null },

  // ── Platform Referral Verified Badge ─────────────────────────
  platformVerified    : { type: Boolean, default: false },
  platformVerifiedAt  : { type: Date,    default: null },

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

  // ── Facial Recognition System (FRS) ─────────────────────
  faceEnrolled         : { type: Boolean, default: false },
  faceConsentGiven     : { type: Boolean, default: false },
  faceConsentAt        : { type: Date,    default: null },
  faceEnrolledAt       : { type: Date,    default: null },
  faceDescriptor       : { type: [Number], default: undefined }, // averaged 128-d embedding (backward compat)
  faceDescriptors      : { type: mongoose.Schema.Types.Mixed, default: null }, // gallery: Array<number[]> — up to 5 individual 128-d embeddings for k-NN matching
  faceLandmarks        : { type: [Number], default: undefined }, // 136 values (68 landmarks × x,y)
  faceEnrollmentPhotos : { type: [String], default: undefined }, // up to 5 Cloudinary URLs
  // Granular biometric consent (DPDP Act / GDPR requirement — unbundled per purpose)
  faceConsentLogin      : { type: Boolean, default: false }, // consent for identity verification and face login
  faceConsentProctoring : { type: Boolean, default: false }, // separate consent for assessment monitoring

  phone       : { type: String, trim: true },
  title       : { type: String, trim: true },
  location    : { type: String, trim: true },
  // Org branch/location this member belongs to (matches a name in org.settings.branches).
  // Optional — empty for orgs that haven't set up branches.
  branch      : { type: String, trim: true, default: '' },
  summary     : { type: String },
  experience  : { type: Number, min: 0, max: 60 },
  isFresher   : { type: Boolean, default: false },
  college     : { type: String, trim: true, default: '' },
  skills      : [{ type: String, lowercase: true, trim: true }],
  resumeUrl   : { type: String },
  linkedinUrl : { type: String },

  // ── Candidate extended profile ────────────────────────────
  github           : { type: String, trim: true },
  portfolio        : { type: String, trim: true },
  availability     : { type: String, trim: true },
  languages        : [{ type: String, trim: true }],
  industry         : { type: String, trim: true },
  department       : { type: String, trim: true },

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
  organisation       : { type: String, trim: true },
  orgName            : { type: String, trim: true },
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
// ── Performance indexes ───────────────────────────────────────────────────
// userSchema.index({ email: 1 }, { unique: true });                         // login / dedup (Already handled in schema definition)
userSchema.index({ tenantId: 1, role: 1, isActive: 1 });                  // stats queries
userSchema.index({ tenantId: 1, deletedAt: 1 });                          // soft-delete scans
userSchema.index({ assignedRecruiterId: 1, tenantId: 1 });                // pipeline assignment
userSchema.index({ createdAt: -1 });                                      // list ordering

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash || '');
};

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
