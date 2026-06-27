'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true },

  userId1   : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  photoUrl1 : { type: String },
  name1     : { type: String },
  email1    : { type: String },

  userId2   : { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  photoUrl2 : { type: String },
  name2     : { type: String },
  email2    : { type: String },

  similarityScore : { type: Number, required: true }, // 0–1

  status: {
    type   : String,
    enum   : ['pending', 'cleared', 'confirmed_duplicate', 'escalated'],
    default: 'pending',
  },

  reviewedBy     : { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt     : { type: Date, default: null },
  reviewNote     : { type: String, default: '' },
  // escalated: super_admin needs to review (cross-tenant or high-severity)
  escalatedBy    : { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  escalatedAt    : { type: Date, default: null },
  escalationNote : { type: String, default: '' },
}, { timestamps: true });

schema.index({ tenantId: 1, status: 1 });
schema.index({ userId1: 1 });
schema.index({ userId2: 1 });

module.exports = mongoose.model('FaceDuplicateAlert', schema);
