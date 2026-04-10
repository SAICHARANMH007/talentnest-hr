'use strict';
const mongoose = require('mongoose');

const userSessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
  },
  // Same token value as the corresponding RefreshToken (for lookup + revocation)
  refreshToken: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  ip: { type: String },
  userAgent: { type: String },
  // Parsed device info for display
  deviceName: { type: String },
  browser:    { type: String },
  os:         { type: String },
  lastActive: { type: Date, default: Date.now },
  isActive:   { type: Boolean, default: true, index: true },
  expiresAt:  { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

userSessionSchema.index({ userId: 1, isActive: 1 });

/**
 * Parse basic device info from User-Agent string (no external libs).
 */
userSessionSchema.statics.parseUA = function (ua = '') {
  let browser = 'Unknown Browser';
  let os      = 'Unknown OS';
  let device  = 'Desktop';

  if (/Edg\//.test(ua))         browser = 'Edge';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua))browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  else if (/MSIE|Trident/.test(ua)) browser = 'Internet Explorer';

  if (/Windows NT/.test(ua))    os = 'Windows';
  else if (/Macintosh/.test(ua))os = 'macOS';
  else if (/Linux/.test(ua))    os = 'Linux';
  else if (/Android/.test(ua))  os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';

  if (/Mobi|Android|iPhone/.test(ua)) device = 'Mobile';
  else if (/iPad|Tablet/.test(ua))    device = 'Tablet';

  return { browser, os, deviceName: `${device} · ${browser} on ${os}` };
};

module.exports = mongoose.model('UserSession', userSessionSchema);
