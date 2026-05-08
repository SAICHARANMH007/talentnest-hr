'use strict';
const mongoose = require('mongoose');

const bgvDocumentSchema = new mongoose.Schema({
  userId    : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId  : { type: mongoose.Schema.Types.ObjectId, default: null },

  docType   : {
    type: String,
    enum: ['aadhaar', 'pan', 'passport', 'degree', 'salary_slip', 'exp_letter',
           'relieving_letter', 'address_proof', 'bank_details', 'reference', 'other'],
    default: 'other',
  },
  docName   : { type: String, required: true },  // original filename shown to user
  fileUrl   : { type: String, required: true },  // base64 data URI
  fileSize  : { type: Number, default: 0 },      // bytes
  mimeType  : { type: String, default: '' },

  status    : { type: String, enum: ['uploaded', 'under_review', 'verified', 'rejected'], default: 'uploaded' },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  verifiedAt: { type: Date, default: null },
  rejectNote: { type: String, default: '' },

  deletedAt : { type: Date, default: null },
}, { timestamps: true });

bgvDocumentSchema.index({ userId: 1, deletedAt: 1 });
bgvDocumentSchema.index({ tenantId: 1 });

module.exports = mongoose.model('BgvDocument', bgvDocumentSchema);
