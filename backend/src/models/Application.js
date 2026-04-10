'use strict';
const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  tenantId: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'Tenant',
    required: true,
  },

  jobId: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'Job',
    required: true,
  },

  candidateId: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'Candidate',
    required: true,
  },

  currentStage: { type: String, default: 'Applied' },

  stageHistory: [{
    stage  : { type: String },
    movedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    movedAt: { type: Date, default: () => new Date() },
    notes  : { type: String },
  }],

  // AI matching
  aiMatchScore: { type: Number, min: 0, max: 100 },
  matchBreakdown: {
    skillScore     : { type: Number },
    experienceScore: { type: Number },
    locationScore  : { type: Number },
    noticeScore    : { type: Number },
  },

  // Assessment
  assessmentScore: { type: Number },
  assessmentViolations: [{
    type     : { type: String },
    timestamp: { type: Date },
  }],

  // Interview rounds
  interviewRounds: [{
    scheduledAt    : { type: Date },
    format         : { type: String },
    interviewerName : { type: String },
    interviewerEmail: { type: String },
    videoLink       : { type: String },
    location        : { type: String },
    feedback: {
      // Original fields
      communication   : { type: Number },
      technical       : { type: Number },
      cultureFit      : { type: Number },
      overall         : { type: Number },
      recommendation  : { type: String, enum: ['hire', 'no_hire', 'maybe', 'next_round', 'hold'] },
      notes           : { type: String },
      // Scorecard route fields
      rating              : { type: Number },
      technicalScore      : { type: Number },
      communicationScore  : { type: Number },
      problemSolvingScore : { type: Number },
      cultureFitScore     : { type: Number },
      strengths           : { type: String },
      weaknesses          : { type: String },
      submittedBy         : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      submittedAt         : { type: Date },
    },
    calendarEventId: { type: String },
  }],

  offerLetterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref : 'OfferLetter',
  },

  status: {
    type   : String,
    enum   : ['active', 'rejected', 'hired', 'withdrawn', 'parked'],
    default: 'active',
  },

  rejectionReason: { type: String },

  // Screening question answers (submitted at apply time)
  screeningAnswers: [{
    question: { type: String },
    answer  : { type: String },
  }],

  // SLA tracking
  lastSlaAlertAt: { type: Date, default: null },

  // Soft-delete
  deletedAt: { type: Date, default: null },

  // Invite flow
  inviteToken  : { type: String, default: null },
  inviteStatus : { type: String, enum: ['pending', 'accepted', 'declined'], default: null },
}, { timestamps: true });

applicationSchema.index({ tenantId: 1 });
applicationSchema.index({ jobId: 1 });
applicationSchema.index({ candidateId: 1 });
applicationSchema.index({ tenantId: 1, currentStage: 1 });
applicationSchema.index({ tenantId: 1, status: 1 });

applicationSchema.set('toJSON', { virtuals: true });
applicationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Application', applicationSchema);
