'use strict';
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['login_2fa', 'password_reset'],
    default: 'login_2fa',
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    index: { expires: 0 } // TTL index handles automatic deletion
  },
}, { timestamps: true });

// Ensure we find the latest OTP by email
otpSchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model('Otp', otpSchema);
