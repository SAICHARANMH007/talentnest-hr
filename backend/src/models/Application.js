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
    notes  : { type: String, maxlength: 1000 },
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

  // Recruiter notes (private, auto-saved from pipeline card)
  recruiterNotes: { type: String, default: '' },

  // Pipeline tags
  tags: [{ type: String }],

  // Interview feedback (from FeedbackModal in pipeline)
  feedback: {
    rating        : { type: Number },
    strengths     : { type: String },
    weaknesses    : { type: String },
    recommendation: { type: Boolean },
    comment       : { type: String },
  },

  // Application source (career_page | platform | invite)
  source: { type: String, default: 'platform' },

  // Cover letter text
  coverLetter: { type: String, default: '' },

  // Who created this application (recruiter/admin userId)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Whether an invite email was sent during interview scheduling
  emailSent: { type: Boolean, default: false },

  // Invite message body (saved when recruiter sends an invite)
  inviteMessage: { type: String, default: '' },

  // Screening question answers (submitted at apply time)
  screeningAnswers: [{
    question: { type: String },
    answer  : { type: String },
  }],

  // SLA tracking
  lastSlaAlertAt: { type: Date, default: null },

  // Soft-delete
  deletedAt: { type: Date, default: null },

  // Invite flow — enum extended to cover all invite lifecycle states
  inviteToken  : { type: String, default: null },
  inviteStatus : {
    type   : String,
    enum   : ['pending', 'sent', 'opened', 'interested', 'accepted', 'declined'],
    default: null,
  },
}, { timestamps: true });

applicationSchema.index({ tenantId: 1 });
applicationSchema.index({ jobId: 1 });
applicationSchema.index({ candidateId: 1 });
applicationSchema.index({ tenantId: 1, currentStage: 1 });
applicationSchema.index({ tenantId: 1, status: 1 });
// Performance: /mine endpoint and duplicate-check query
applicationSchema.index({ candidateId: 1, deletedAt: 1 });
applicationSchema.index({ jobId: 1, candidateId: 1, deletedAt: 1 });

applicationSchema.set('toJSON', { virtuals: true });
applicationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Application', applicationSchema);
