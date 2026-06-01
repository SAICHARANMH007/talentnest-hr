'use strict';
const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  event:        { type: String },
  sentAt:       { type: Date, default: Date.now },
  responseCode: { type: Number },
  success:      { type: Boolean, default: false },
  error:        { type: String, default: '' },
  durationMs:   { type: Number, default: 0 },
}, { _id: true });

const webhookSchema = new mongoose.Schema({
  tenantId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  name:            { type: String, required: true, trim: true },
  url:             { type: String, required: true, trim: true },
  events:          { type: [String], default: [] },
  secret:          { type: String, default: '' },
  isActive:        { type: Boolean, default: true },
  lastTriggeredAt: { type: Date, default: null },
  failureCount:    { type: Number, default: 0 },
  recentDeliveries: { type: [deliverySchema], default: [] },
  deletedAt:       { type: Date, default: null },
}, { timestamps: true });

webhookSchema.index({ tenantId: 1, isActive: 1, deletedAt: 1 });

module.exports = mongoose.model('Webhook', webhookSchema);
