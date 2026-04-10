'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant' },
  candidateId: { type: mongoose.Schema.Types.ObjectId },
  direction:   { type: String, enum: ['outbound', 'inbound'], required: true },
  from:        { type: String },
  to:          { type: String },
  message:     { type: String },
  messageSid:  { type: String },  // Twilio SID for deduplication
  status:      { type: String, default: 'sent' }, // sent | delivered | failed | received
  error:       { type: String },
}, { timestamps: true });

schema.index({ tenantId: 1, createdAt: -1 });
schema.index({ candidateId: 1 });
schema.index({ messageSid: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('WhatsAppLog', schema);
