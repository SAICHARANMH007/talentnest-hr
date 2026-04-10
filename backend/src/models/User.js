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

  settings: { type: Object, default: {} },
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
