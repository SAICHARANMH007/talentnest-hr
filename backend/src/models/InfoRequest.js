'use strict';
const mongoose = require('mongoose');

const { Schema } = mongoose;

// Tracks requests from one user to view another user's private contact info
// (phone/email) within the Career Community / People network.
const infoRequestSchema = new Schema({
  tenantId: {
    type    : Schema.Types.ObjectId,
    ref     : 'Tenant',
    required: true,
  },
  fromUserId: {
    type    : Schema.Types.ObjectId,
    ref     : 'User',
    required: true,
  },
  toUserId: {
    type    : Schema.Types.ObjectId,
    ref     : 'User',
    required: true,
  },
  status: {
    type   : String,
    enum   : ['pending', 'accepted', 'declined'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// One outstanding request per direction
infoRequestSchema.index(
  { tenantId: 1, fromUserId: 1, toUserId: 1 },
  { unique: true }
);

infoRequestSchema.index({ tenantId: 1, toUserId: 1, status: 1 });
infoRequestSchema.index({ tenantId: 1, fromUserId: 1, status: 1 });

module.exports = mongoose.model('InfoRequest', infoRequestSchema);
