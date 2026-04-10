'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  subscription: { type: mongoose.Schema.Types.Mixed, required: true }, // full browser push subscription object
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

schema.index({ userId: 1, isActive: 1 });
schema.index({ tenantId: 1 });

module.exports = mongoose.model('PushSubscription', schema);
