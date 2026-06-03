'use strict';
const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const postReportSchema = new Schema({
  postId    : { type: Types.ObjectId, ref: 'FeedPost', required: true, index: true },
  reportedBy: { type: Types.ObjectId, ref: 'User',     required: true },
  reporterName: { type: String, default: '' },
  reporterRole: { type: String, default: '' },
  tenantId  : { type: Types.ObjectId, ref: 'Tenant', index: true },
  reason    : {
    type: String,
    enum: ['spam', 'harassment', 'misinformation', 'inappropriate', 'hate_speech', 'other'],
    required: true,
  },
  details   : { type: String, default: '', maxlength: 500 },
  status    : { type: String, enum: ['pending', 'reviewed', 'dismissed'], default: 'pending' },
  resolvedBy: { type: Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
}, { timestamps: true });

postReportSchema.index({ postId: 1, reportedBy: 1 }, { unique: true });

module.exports = mongoose.model('PostReport', postReportSchema);
