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

module.exports = mongoose.model('EmailLog', schema);
