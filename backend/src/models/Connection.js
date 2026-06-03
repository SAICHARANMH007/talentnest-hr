'use strict';
const mongoose = require('mongoose');

const { Schema } = mongoose;

const connectionSchema = new Schema({
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
    enum   : ['pending', 'accepted', 'rejected'],
    default: 'pending',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Unique compound index — prevents duplicate connection requests
connectionSchema.index(
  { tenantId: 1, fromUserId: 1, toUserId: 1 },
  { unique: true }
);

// Efficient lookup for incoming requests
connectionSchema.index({ tenantId: 1, toUserId: 1, status: 1 });

// Efficient lookup for outgoing requests
connectionSchema.index({ tenantId: 1, fromUserId: 1, status: 1 });

module.exports = mongoose.model('Connection', connectionSchema);
