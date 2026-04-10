'use strict';
const mongoose = require('mongoose');

// Question option (MCQ)
const optionSchema = new mongoose.Schema({
  id:        { type: String },
  text:      { type: String },
  isCorrect: { type: Boolean, default: false },
}, { _id: false });

// Question — supports mcq_single, mcq_multi, text, code
const questionSchema = new mongoose.Schema({
  id:        { type: String },
  type:      { type: String, enum: ['mcq_single', 'mcq_multi', 'text', 'code', 'mcq', 'truefalse', 'short', 'coding'] },
  text:      { type: String },
  marks:     { type: Number, default: 1 },
  maxChars:  { type: Number },
  options:   { type: [optionSchema], default: [] },
  // Legacy single correct-answer field (text/code questions)
  correctAnswer: { type: String },
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  // Tenant/org identification — support both legacy orgId and new tenantId
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  orgId:       { type: String },

  jobId:       { type: String, required: true },

  // Creator — support both legacy recruiterId and new createdBy
  recruiterId: { type: String },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  title:          { type: String, default: 'Screening Assessment' },
  instructions:   { type: String, default: '' },
  description:    { type: String, default: '' },

  timeLimitMins:  { type: Number, default: 0 },
  durationMinutes:{ type: Number, default: 0 },   // alias kept for compat
  passingScore:   { type: Number, default: 0 },
  totalMarks:     { type: Number, default: 0 },

  isActive:       { type: Boolean, default: true },
  autoAdvance:    { type: Boolean, default: false },
  antiCheatEnabled: { type: Boolean, default: true },

  // questions — explicit sub-document array for type safety
  questions: { type: [questionSchema], default: [] },

}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

assessmentSchema.index({ jobId: 1 });
assessmentSchema.index({ tenantId: 1 });
assessmentSchema.index({ orgId: 1 });

module.exports = mongoose.model('Assessment', assessmentSchema);
