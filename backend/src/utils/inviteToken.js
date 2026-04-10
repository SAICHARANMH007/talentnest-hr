'use strict';
const crypto = require('crypto');

const generateInviteToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const getInviteExpiry = (days = 7) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

module.exports = { generateInviteToken, hashToken, getInviteExpiry };
