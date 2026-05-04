'use strict';
const mongoose = require('mongoose');

const callRecordSchema = new mongoose.Schema({
  callId:      { type: String, required: true, unique: true },
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  fromUserId:  { type: String, required: true },
  toUserId:    { type: String, required: true },
  fromName:    String,
  toName:      String,
  callType:    { type: String, enum: ['audio', 'video'], default: 'audio' },
  callMessage: { type: String, maxlength: 200 }, // optional caller intent message
  startedAt:   { type: Date, default: Date.now },
  answeredAt:  Date,
  endedAt:     Date,
  duration:    { type: Number, default: 0 }, // seconds
  outcome:     { type: String, enum: ['answered', 'declined', 'missed', 'failed', 'cancelled'], default: 'missed' },
}, { timestamps: true });

callRecordSchema.index({ fromUserId: 1, toUserId: 1, startedAt: -1 });
callRecordSchema.index({ toUserId: 1, startedAt: -1 });

module.exports = mongoose.model('CallRecord', callRecordSchema);
