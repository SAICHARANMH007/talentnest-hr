'use strict';
const mongoose = require('mongoose');

// A placement drive organized by a College/Campus tenant's placement officer.
// Eligible students are auto-computed at creation time (by branch / passing
// year / minimum CGPA / required skills) and tracked individually so the
// officer can move each student through registered → shortlisted → selected
// / rejected as the drive progresses.
const registrationSchema = new mongoose.Schema({
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },
  status: { type: String, enum: ['registered', 'shortlisted', 'selected', 'rejected'], default: 'registered' },
  notes: { type: String, trim: true, default: '' },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const placementDriveSchema = new mongoose.Schema({
  tenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  collegeName: { type: String, trim: true, default: '' },
  title:       { type: String, trim: true, required: true },
  companyName: { type: String, trim: true, default: '' },
  jobId:       { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
  description: { type: String, trim: true, default: '' },
  mode:        { type: String, enum: ['On-Campus', 'Virtual', 'Off-Campus'], default: 'On-Campus' },
  location:    { type: String, trim: true, default: '' },
  driveDate:   { type: Date, required: true },
  registrationDeadline: { type: Date, default: null },
  // Type of opportunity: a regular placement drive, an internship, or an
  // exam/test (e.g. TCS NQT, AMCAT, HackerRank, HackerEarth) — exams may
  // link to an external registration page and/or an in-platform Assessment.
  opportunityType: { type: String, enum: ['placement', 'internship', 'exam'], default: 'placement' },
  examProvider:     { type: String, trim: true, default: '' },
  registrationLink: { type: String, trim: true, default: '' },
  assessmentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Assessment', default: null },
  eligibility: {
    minCGPA:      { type: Number, default: null },
    degrees:      { type: [String], default: [] },
    branches:     { type: [String], default: [] },
    passingYears: { type: [Number], default: [] },
    skills:       { type: [String], default: [] },
  },
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  registrations: { type: [registrationSchema], default: [] },
  // Candidates explicitly notified by PO override eligibility — they can always register
  notifiedCandidateIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' }],
  // Who can see and register for this opportunity
  targetAudience: { type: String, enum: ['students', 'alumni', 'experienced', 'all'], default: 'students' },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Internal approval — when a recruiter (not admin) requests a drive, the
  // company's org admin must approve it before it is forwarded to the college.
  // 'not_required' = created by admin (skips this step).
  // 'pending'      = waiting for org admin to approve.
  // 'approved'     = org admin approved; request has been forwarded to college.
  // 'rejected'     = org admin rejected the request.
  internalApprovalStatus: {
    type: String,
    enum: ['not_required', 'pending', 'approved', 'rejected'],
    default: 'not_required',
  },
  // Recruiter assigned to this drive by an org admin (optional).
  assignedRecruiterId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  assignedRecruiterName: { type: String, trim: true, default: '' },
  // When a recruiter/company requests a campus drive from a college, the
  // drive is created with requestStatus 'pending' and is hidden from the
  // college's main drive list until a placement officer approves it (which
  // computes eligible students + sends notifications) or rejects it.
  requestStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
  requestedByTenantId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
  requestedByCompanyName: { type: String, trim: true, default: '' },
  deletedAt:  { type: Date, default: null },
}, { timestamps: true });

placementDriveSchema.index({ tenantId: 1, deletedAt: 1, driveDate: -1 });

module.exports = mongoose.model('PlacementDrive', placementDriveSchema);
