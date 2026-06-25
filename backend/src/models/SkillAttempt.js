'use strict';
const mongoose = require('mongoose');

// Snapshot of one question served (no isCorrect field — never stored here)
const servedQuestionSchema = new mongoose.Schema({
  questionId:  { type: String, required: true },
  skill:       { type: String },
  type:        { type: String },
  difficulty:  { type: String },
  text:        { type: String },
  options:     [{
    id:   { type: String },
    text: { type: String },
    // isCorrect intentionally omitted
  }],
  marks:       { type: Number, default: 1 },
}, { _id: false });

const answerSchema = new mongoose.Schema({
  questionId: { type: String, required: true },
  // mcq_single: string option id; mcq_multi: array of option ids; truefalse: 'true'/'false'
  value:      { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const skillAttemptSchema = new mongoose.Schema({
  tenantId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
  candidateId:{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill:      { type: String, required: true },

  status:     { type: String, enum: ['in_progress', 'submitted', 'expired'], default: 'in_progress' },

  // Questions sent to candidate (snapshot; correct answers NOT included)
  questionsServed: { type: [servedQuestionSchema], default: [] },

  answers:    { type: [answerSchema], default: [] },

  startedAt:  { type: Date, default: Date.now },
  expiresAt:  { type: Date },           // startedAt + 30 min, set on create
  submittedAt:{ type: Date },

  // Scoring (filled on submit)
  score:      { type: Number, default: 0 },
  maxScore:   { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  // Pass rule: ≥4 of 6 correct AND ≥1 hard correct
  passed:     { type: Boolean, default: false },
  hardCorrect:{ type: Number, default: 0 },
  correctCount:{ type: Number, default: 0 },
}, { timestamps: true });

skillAttemptSchema.index({ candidateId: 1, skill: 1, status: 1 });
skillAttemptSchema.index({ tenantId: 1 });

module.exports = mongoose.model('SkillAttempt', skillAttemptSchema);
