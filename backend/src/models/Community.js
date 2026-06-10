'use strict';
const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const communitySchema = new Schema({
  tenantId    : { type: Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name        : { type: String, required: true, trim: true },
  slug        : { type: String, required: true, lowercase: true, trim: true },
  description : { type: String, default: '' },
  icon        : { type: String, default: '💬' },
  coverColor  : { type: String, default: '#0176D3' },
  category    : { type: String, enum: ['tech', 'hr', 'business', 'design', 'other'], default: 'other' },
  // Set for auto-generated college/campus communities (matches Tenant.name of a
  // type='college' tenant). Students/alumni whose User.college matches this
  // (case/whitespace-insensitive) are automatically members — no join required.
  collegeName : { type: String, trim: true, default: '' },
  memberIds   : [{ type: Types.ObjectId, ref: 'User' }],
  memberCount : { type: Number, default: 0 },
  isGlobal    : { type: Boolean, default: false }, // visible to all tenants
  createdBy   : { type: Types.ObjectId, ref: 'User' },
}, { timestamps: true });

communitySchema.index({ tenantId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Community', communitySchema);
