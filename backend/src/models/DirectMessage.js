'use strict';
const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  name : { type: String, required: true },
  type : { type: String, required: true },
  size : { type: Number },
  data : { type: String, required: true },
}, { _id: false });

const directMessageSchema = new mongoose.Schema({
  tenantId  : { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  toUserId  : { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  fromName  : { type: String },
  fromRole  : { type: String },
  message   : { type: String, default: '', maxlength: 5000 },
  jobId     : { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  jobTitle  : { type: String, default: null },
  attachment: { type: attachmentSchema, default: null },
  readAt    : { type: Date, default: null },
}, { timestamps: true });

directMessageSchema.index({ tenantId: 1, toUserId: 1, createdAt: -1 });
directMessageSchema.index({ tenantId: 1, fromUserId: 1, createdAt: -1 });

module.exports = mongoose.model('DirectMessage', directMessageSchema);
