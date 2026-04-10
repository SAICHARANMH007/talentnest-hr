'use strict';
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String },
  category:    { type: String, enum: ['document', 'training', 'it_setup', 'policy', 'orientation', 'other'], default: 'other' },
  dueDate:     { type: Date },
  isRequired:  { type: Boolean, default: true },
  completedAt: { type: Date, default: null },
  completedBy: { type: String, enum: ['candidate', 'hr', 'system'], default: null },
  notes:       { type: String },
}, { _id: true });

const preBoardingSchema = new mongoose.Schema({
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true,
    index: true,
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
  },
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
  },
  offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OfferLetter',
    required: true,
    unique: true, // one preboarding per offer
  },

  // Core joining info
  candidateName:  { type: String },
  candidateEmail: { type: String },
  designation:    { type: String },
  joiningDate:    { type: Date },
  department:     { type: String },
  reportingTo:    { type: String },

  // Status
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true,
  },

  // Task checklist
  tasks: [taskSchema],

  // Confirmation tracking
  joiningConfirmed:   { type: Boolean, default: false },
  joiningConfirmedAt: { type: Date },
  joinedOn:           { type: Date }, // actual joining date if different

  // Welcome kit
  welcomeKitSentAt:   { type: Date, default: null },

  // Cron dedup
  lastReminderSentAt: { type: Date, default: null },

  // Assigned HR
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },

  notes: { type: String },
}, { timestamps: true });

preBoardingSchema.index({ tenantId: 1, status: 1 });
preBoardingSchema.index({ joiningDate: 1 });

// Virtual: completion %
preBoardingSchema.virtual('completionPct').get(function () {
  if (!this.tasks.length) return 0;
  const done = this.tasks.filter(t => t.completedAt).length;
  return Math.round((done / this.tasks.length) * 100);
});

preBoardingSchema.set('toJSON', { virtuals: true });
preBoardingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PreBoarding', preBoardingSchema);
