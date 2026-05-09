'use strict';
const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  originalUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  userAgent: String,
  ip: String,
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index
  },
  revokedAt: Date,
  replacedBy: String,
}, { timestamps: true });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
