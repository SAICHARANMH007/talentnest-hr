const mongoose = require('mongoose');

const notiSchema = new mongoose.Schema({
  userId  : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  orgId   : { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },  // legacy — keep for backward compat
  type    : { type: String, enum: ['application','stage_change','interview','offer','system', 'mention', 'job_approved', 'job_rejected', 'assessment', 'assessment_submitted', 'assessment_reviewed', 'invite_interested'], default: 'system' },
  title   : { type: String, required: true },
  message : { type: String, required: true },
  link    : { type: String },
  read    : { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

// Virtuals for cleaner frontend API
notiSchema.virtual('id').get(function() { return this._id.toHexString(); });
notiSchema.virtual('body').get(function() { return this.message; });

notiSchema.set('toJSON', { virtuals: true });
notiSchema.set('toObject', { virtuals: true });

notiSchema.index({ userId: 1, read: 1 });
notiSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notiSchema);
