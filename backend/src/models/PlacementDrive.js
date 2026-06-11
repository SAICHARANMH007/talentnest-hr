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
  eligibility: {
    minCGPA:      { type: Number, default: null },
    branches:     { type: [String], default: [] },
    passingYears: { type: [Number], default: [] },
    skills:       { type: [String], default: [] },
  },
  status: { type: String, enum: ['upcoming', 'ongoing', 'completed', 'cancelled'], default: 'upcoming' },
  registrations: { type: [registrationSchema], default: [] },
  createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt:  { type: Date, default: null },
}, { timestamps: true });

placementDriveSchema.index({ tenantId: 1, deletedAt: 1, driveDate: -1 });

module.exports = mongoose.model('PlacementDrive', placementDriveSchema);
