'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  tenantId   : { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  to         : String,
  subject    : String,
  body       : String,
  status     : { type: String, default: 'sent' }, // 'sent' | 'failed'
  error      : String,
  provider   : String,  // 'resend' | 'smtp' | 'dev'
  jobId      : String,
  candidateId: String,
  sentBy     : String,
  orgId      : String,  // legacy — keep for backward compat
  retryCount : { type: Number, default: 0 },
}, { timestamps: true, toJSON: { virtuals: true } });

// ── Performance indexes ───────────────────────────────────────────────────────
// Most common: list logs for a tenant sorted by date
schema.index({ tenantId: 1, createdAt: -1 });
// Filter by delivery status within a tenant
schema.index({ tenantId: 1, status: 1, createdAt: -1 });
// Platform-admin queries by status across all tenants
schema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('EmailLog', schema);
