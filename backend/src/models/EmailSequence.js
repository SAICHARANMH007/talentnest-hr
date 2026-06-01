'use strict';
const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  delayDays: { type: Number, default: 1, min: 0 },
  subject  : { type: String, required: true },
  body     : { type: String, required: true },
}, { _id: true });

const enrollmentSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  email      : { type: String },
  enrolledAt : { type: Date, default: Date.now },
  currentStep: { type: Number, default: 0 },
  nextSendAt : { type: Date },
  completed  : { type: Boolean, default: false },
  stepsLog   : [{
    step     : Number,
    sentAt   : Date,
    subject  : String,
  }],
}, { _id: true });

const emailSequenceSchema = new mongoose.Schema({
  tenantId : { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name     : { type: String, required: true, trim: true },
  isActive : { type: Boolean, default: true },
  steps    : [stepSchema],
  enrollments: [enrollmentSchema],
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

emailSequenceSchema.index({ tenantId: 1, deletedAt: 1 });
emailSequenceSchema.index({ 'enrollments.nextSendAt': 1, 'enrollments.completed': 1 });

module.exports = mongoose.model('EmailSequence', emailSequenceSchema);
