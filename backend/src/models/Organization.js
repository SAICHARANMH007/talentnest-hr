const mongoose = require('mongoose');
const softDeletePlugin = require('./plugins/softDeletePlugin');

const orgSchema = new mongoose.Schema({
  // Core
  name     : { type: String, required: true, trim: true },
  slug     : { type: String, lowercase: true, trim: true, unique: true },
  logoUrl        : { type: String },
  logoUpdatedAt  : { type: Date },
  website  : { type: String },
  domain   : { type: String, trim: true }, // For email / SSO auto-mapping
  industry : { type: String },
  size     : { type: String, enum: ['1-10','11-50','51-200','201-500','501-1000','1000+'] },
  location : { type: String },

  // Business / Tier logic
  status   : { type: String, enum: ['active','suspended','trial','pending'], default: 'active' },
  plan     : { type: String, enum: ['free','starter','pro','growth','enterprise','trial'], default: 'free' },
  trialEndsAt: { type: Date },

  // Stripe / Payment Logic
  stripeCustomerId     : { type: String },
  stripeSubscriptionId : { type: String },

  // Feature Gates / Settings
  settings: {
    maxJobs           : { type: Number, default: 10 },
    maxRecruiters     : { type: Number, default: 5 },
    maxAdmins         : { type: Number, default: 2 },
    maxCandidates     : { type: Number, default: 1000 },
    features          : [{ type: String }], // e.g., ['ai_match', 'reports']
    brandColor        : { type: String, default: '#0176D3' },
    allowPublicJobs   : { type: Boolean, default: true },
    customPipelineStages: [String],
    dataVisibility    : { type: String, enum: ['own', 'org'], default: 'org' }
  },

  // Stats / Analytics
  stats: {
    totalHires     : { type: Number, default: 0 },
    avgTimeToHire  : { type: Number, default: 0 },
  },

  // Admin / Ownership
  adminId  : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: String }, // Internal/Legacy tracking

}, { timestamps: true });

// Apply Professional Plugins
orgSchema.plugin(softDeletePlugin);

orgSchema.index({ domain: 1 });

orgSchema.set('toJSON', { virtuals: true });
orgSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Organization', orgSchema);
