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
  // Set for auto-generated company communities (matches a candidate's
  // Current Company / employer name). Users whose currentCompany matches
  // this (case/whitespace-insensitive) are automatically members.
  companyName : { type: String, trim: true, default: '' },
  memberIds   : [{ type: Types.ObjectId, ref: 'User' }],
  memberCount : { type: Number, default: 0 },
  isGlobal    : { type: Boolean, default: false }, // visible to all tenants
  createdBy   : { type: Types.ObjectId, ref: 'User' },
}, { timestamps: true });

communitySchema.index({ tenantId: 1, slug: 1 }, { unique: true });
// ── Performance indexes ───────────────────────────────────────────────────────
// Global slug lookup (shareable links, cross-tenant discovery)
communitySchema.index({ slug: 1 });
// Auto-membership matching: find communities for a given college/company name
communitySchema.index({ collegeName: 1 });
communitySchema.index({ companyName: 1 });
// Default list ordering: popular communities first
communitySchema.index({ memberCount: -1, name: 1 });

module.exports = mongoose.model('Community', communitySchema);
