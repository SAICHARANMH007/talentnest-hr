'use strict';
const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  competency : { type: String, required: true },
  question   : { type: String, required: true },
  scoringTip : { type: String, default: '' },
  maxScore   : { type: Number, default: 5, min: 1, max: 10 },
}, { _id: true });

const screeningQuestionSchema = new mongoose.Schema({
  question      : { type: String, required: true },
  type          : { type: String, enum: ['text', 'yes_no', 'multiple_choice'], default: 'text' },
  options       : [String],
  required      : { type: Boolean, default: false },
  knockout      : { type: Boolean, default: false },
  knockoutAnswer: { type: String, default: '' },
}, { _id: true });

const interviewKitSchema = new mongoose.Schema({
  tenantId          : { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  name              : { type: String, required: true, trim: true },
  description       : { type: String, default: '' },
  questions         : [questionSchema],
  screeningQuestions: [screeningQuestionSchema],
  linkedJobIds      : [{ type: mongoose.Schema.Types.ObjectId, ref: 'Job' }],
  isDefault         : { type: Boolean, default: false },
  deletedAt         : { type: Date, default: null },
}, { timestamps: true });

interviewKitSchema.index({ tenantId: 1, deletedAt: 1 });

module.exports = mongoose.model('InterviewKit', interviewKitSchema);
