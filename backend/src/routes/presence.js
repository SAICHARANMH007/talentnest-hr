'use strict';
const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const { authenticate } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const ONLINE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

// POST /api/presence/heartbeat — update lastSeen for the logged-in user
router.post('/heartbeat', authenticate, asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id || req.user.id, { lastSeen: new Date() });
  res.json({ success: true });
}));

// GET /api/presence/online — role-gated list of currently online users
router.get('/online', authenticate, asyncHandler(async (req, res) => {
  const { role, tenantId } = req.user;
  const since = new Date(Date.now() - ONLINE_WINDOW_MS);
  const selfId = (req.user._id || req.user.id)?.toString();

  let filter = { lastSeen: { $gte: since }, isActive: true };

  if (role === 'super_admin') {
    // sees everyone across all orgs
  } else if (role === 'admin') {
    filter.tenantId = tenantId;
  } else if (role === 'recruiter') {
    // recruiters can only see candidates in their org
    filter.tenantId = tenantId;
    filter.role = 'candidate';
  } else if (role === 'candidate') {
    // candidates can only see recruiters in their org
    filter.tenantId = tenantId;
    filter.role = 'recruiter';
  } else {
    return res.json({ success: true, data: [] });
  }

  const users = await User.find(filter)
    .select('name email role title photoUrl lastSeen tenantId')
    .lean();

  const data = users
    .filter(u => u._id?.toString() !== selfId)
    .map(u => ({
      id      : u._id.toString(),
      name    : u.name,
      email   : u.email,
      role    : u.role,
      title   : u.title || '',
      photoUrl: u.photoUrl || null,
      lastSeen: u.lastSeen,
    }));

  res.json({ success: true, data });
}));

module.exports = router;
