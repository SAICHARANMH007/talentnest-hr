'use strict';
const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  id:        { type: String, required: true },
  text:      { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
}, { _id: false });

const skillQuestionSchema = new mongoose.Schema({
  // null = global (platform-wide); ObjectId = org-specific
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },

  skill:       { type: String, required: true, trim: true },   // e.g. 'JavaScript'
  type:        { type: String, enum: ['mcq_single', 'mcq_multi', 'truefalse'], required: true },
  difficulty:  { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  text:        { type: String, required: true },
  options:     { type: [optionSchema], default: [] },
  marks:       { type: Number, default: 1 },
  explanation: { type: String, default: '' },   // shown after attempt complete
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

skillQuestionSchema.index({ skill: 1, difficulty: 1, isActive: 1 });
skillQuestionSchema.index({ tenantId: 1 });

module.exports = mongoose.model('SkillQuestion', skillQuestionSchema);
