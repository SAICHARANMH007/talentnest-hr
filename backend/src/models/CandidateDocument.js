'use strict';
const mongoose = require('mongoose');

const candidateDocumentSchema = new mongoose.Schema({
  tenantId    : { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant',    required: true },
  candidateId : { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate', required: true },

  documentType: {
    type    : String,
    required: true,
    enum    : [
      'aadhaar', 'pan', 'salary_slip_1', 'salary_slip_2', 'salary_slip_3',
      'experience_letter', 'relieving_letter', 'marksheet_10',
      'marksheet_12', 'degree_certificate', 'passport_photo',
      'bank_details', 'cancelled_cheque', 'other',
    ],
  },

  label       : { type: String },   // custom display name
  fileUrl     : { type: String, required: true },
  uploadedAt  : { type: Date, default: Date.now },

  verificationStatus: {
    type   : String,
    enum   : ['pending', 'verified', 'needs_resubmission'],
    default: 'pending',
  },
  verificationNote : { type: String },
  verifiedBy       : { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt       : { type: Date },
}, { timestamps: true });

candidateDocumentSchema.index({ tenantId: 1, candidateId: 1 });

candidateDocumentSchema.virtual('id').get(function () { return this._id.toHexString(); });
candidateDocumentSchema.set('toJSON', { virtuals: true });
candidateDocumentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CandidateDocument', candidateDocumentSchema);
