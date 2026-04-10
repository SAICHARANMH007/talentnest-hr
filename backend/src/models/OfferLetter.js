'use strict';
const mongoose = require('mongoose');

const offerLetterSchema = new mongoose.Schema({
  tenantId: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'Tenant',
    required: true,
  },

  applicationId: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'Application',
    required: true,
  },

  candidateId: {
    type    : mongoose.Schema.Types.ObjectId,
    ref     : 'Candidate',
    required: true,
  },

  templateData: {
    candidateName       : { type: String },
    designation         : { type: String },
    ctc                 : { type: String },
    joiningDate         : { type: String },
    companyName         : { type: String },
    signatoryName       : { type: String },
    signatoryDesignation: { type: String },
    customClauses       : { type: String },
  },

  generatedAt : { type: Date },
  sentAt      : { type: Date },
  signedAt    : { type: Date },
  signedDocUrl: { type: String },

  signatureData: {
    typedName: { type: String },
    ip       : { type: String },
    userAgent: { type: String },
  },

  status: {
    type   : String,
    enum   : ['draft', 'sent', 'signed', 'declined'],
    default: 'draft',
  },
}, { timestamps: true });

offerLetterSchema.index({ tenantId: 1 });
offerLetterSchema.index({ applicationId: 1 });
offerLetterSchema.index({ candidateId: 1 });

offerLetterSchema.set('toJSON', { virtuals: true });
offerLetterSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('OfferLetter', offerLetterSchema);
