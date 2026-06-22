'use strict';
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tenantId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },
  assessmentId:   { type: String, required: true },
  jobId:          String,
  candidateId:    { type: String, required: true },
  applicationId:  String,
  status:         { type: String, default: 'in_progress' }, // in_progress | submitted | expired
  startedAt:      String,
  submittedAt:    String,
  timeSpentSecs:  { type: Number, default: 0 },
  answers:        { type: mongoose.Schema.Types.Mixed, default: [] },
  score:          { type: Number, default: null },
  maxScore:       { type: Number, default: 0 },
  percentage:     { type: Number, default: null },
  result:         { type: String, default: 'pending' }, // pass | fail | pending
  recruiterReview:{ type: String, default: '' },
  reviewedAt:     String,
  reviewedBy:     String,
  violations:     { type: mongoose.Schema.Types.Mixed, default: [] },
  violationCount: { type: Number, default: 0 },
  autoSubmitted:  { type: Boolean, default: false },

  // FRS proctoring — snapshots taken during the assessment
  faceVerifications: [{
    ts         : { type: Date },
    matchScore : { type: Number },   // 0–1 cosine similarity
    passed     : { type: Boolean },
    snapshot   : { type: String },   // Cloudinary URL
    anomaly    : { type: String },   // no_face | face_mismatch | multiple_faces | liveness_fail
  }],
  faceVerificationSummary: {
    totalChecks  : { type: Number, default: 0 },
    passedChecks : { type: Number, default: 0 },
    passRate     : { type: Number, default: null },
    flagged      : { type: Boolean, default: false },
  },
}, { timestamps: true, toJSON: { virtuals: true } });

schema.index({ candidateId: 1, jobId: 1 });
schema.index({ assessmentId: 1 });
schema.index({ applicationId: 1 });
schema.index({ tenantId: 1, candidateId: 1 });

module.exports = mongoose.model('AssessmentSubmission', schema);
