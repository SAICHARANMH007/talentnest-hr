'use strict';
const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  userId  : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  userName: { type: String },
  userRole: { type: String },
  action  : { type: String },
  entity  : { type: String },
  entityId: { type: String },

  details  : { type: mongoose.Schema.Types.Mixed },
  ip       : { type: String },
  userAgent: { type: String },

  createdAt: { type: Date, default: () => new Date() },
}, { versionKey: false });

// Read-only: audit logs must not be modified after creation
auditSchema.pre('save', function (next) {
  if (!this.isNew) return next(new Error('Audit logs are immutable.'));
  next();
});

auditSchema.index({ tenantId: 1, createdAt: -1 });
auditSchema.index({ userId: 1, createdAt: -1 });
auditSchema.index({ action: 1 });
auditSchema.index({ entity: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditSchema);
