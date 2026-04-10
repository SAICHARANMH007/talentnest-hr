'use strict';
const mongoose = require('mongoose');

const jobAlertSchema = new mongoose.Schema({
  userId   : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email    : { type: String, required: true },
  tenantId : { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null }, // null = cross-tenant

  keywords : { type: [String], default: [] }, // e.g. ['React', 'Node.js']
  location : { type: String, default: '' },
  jobType  : { type: String, default: '' },   // Full-Time, Remote, etc.
  frequency: { type: String, enum: ['daily', 'weekly'], default: 'daily' },

  isActive       : { type: Boolean, default: true },
  lastSentAt     : { type: Date, default: null },
  lastJobIds     : [{ type: mongoose.Schema.Types.ObjectId }], // deduplicate
}, { timestamps: true });

jobAlertSchema.index({ userId: 1 });
jobAlertSchema.index({ isActive: 1, frequency: 1, lastSentAt: 1 });

module.exports = mongoose.model('JobAlert', jobAlertSchema);
