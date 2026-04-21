'use strict';
const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
  tenantId  : { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  toUserId  : { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  fromName  : { type: String },
  fromRole  : { type: String },
  message   : { type: String, required: true, maxlength: 2000 },
  jobId     : { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  jobTitle  : { type: String, default: null },
  readAt    : { type: Date, default: null },
}, { timestamps: true });

directMessageSchema.index({ tenantId: 1, toUserId: 1 });
directMessageSchema.index({ tenantId: 1, fromUserId: 1 });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
