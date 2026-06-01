'use strict';
const mongoose = require('mongoose');

const schedulingLinkSchema = new mongoose.Schema({
  token       : { type: String, required: true, unique: true, index: true },
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
  tenantId    : { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  jobTitle    : { type: String, default: '' },
  candidateName : { type: String, default: '' },
  candidateEmail: { type: String, default: '' },
  recruiterName : { type: String, default: '' },
  availableSlots: [{ type: Date }],
  selectedSlot  : { type: Date, default: null },
  format        : { type: String, default: 'video' },
  videoLink     : { type: String, default: '' },
  location      : { type: String, default: '' },
  notes         : { type: String, default: '' },
  status        : { type: String, enum: ['pending', 'confirmed', 'expired'], default: 'pending' },
  expiresAt     : { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('SchedulingLink', schedulingLinkSchema);
