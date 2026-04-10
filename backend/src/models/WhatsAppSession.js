'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  candidatePhone: { type: String, required: true }, // E.164 format, e.g. +919876543210
  tenantId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  type:           { type: String, enum: ['interview-confirm', 'offer-response'], required: true },
  applicationId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  interviewRoundIndex: { type: Number },   // for interview-confirm type
  offerId:        { type: mongoose.Schema.Types.ObjectId },   // for offer-response type
  expiresAt:      { type: Date, required: true },
  isResolved:     { type: Boolean, default: false },
  resolvedWith:   { type: String },  // '1', '2', or '3'
}, { timestamps: true });

schema.index({ candidatePhone: 1, isResolved: 1, expiresAt: 1 });
schema.index({ tenantId: 1 });

module.exports = mongoose.model('WhatsAppSession', schema);
