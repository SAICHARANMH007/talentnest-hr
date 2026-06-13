'use strict';
const express      = require('express');
const Notification = require('../models/Notification');
const User         = require('../models/User');
const Organization = require('../models/Organization');
const { authenticate: auth } = require('../middleware/auth');
const router       = express.Router();
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../utils/AppError');

// Notification category groupings for user preferences — controls which
// notification types appear in a user's inbox.
const NOTIFICATION_CATEGORIES = {
  applicationUpdates: { label: 'Application Updates',    types: ['application', 'stage_change', 'offer', 'assessment_reviewed'] },
  interviews:         { label: 'Interview Reminders',    types: ['interview'] },
  jobRecommendations: { label: 'Job Recommendations',    types: ['talent_match', 'job_assignment'] },
  announcements:      { label: 'Announcements & Updates', types: ['system', 'college', 'mention', 'invite_interested', 'invite'] },
};

// GET /api/notifications/preferences — which notification categories the user wants to see
router.get('/preferences', auth, asyncHandler(async (req, res) => {
  const muted = req.user.settings?.mutedNotificationCategories || [];
  res.json({
    categories: Object.entries(NOTIFICATION_CATEGORIES).map(([key, c]) => ({ key, label: c.label, enabled: !muted.includes(key) })),
  });
}));

// PATCH /api/notifications/preferences — update muted categories
router.patch('/preferences', auth, asyncHandler(async (req, res) => {
  const { muted } = req.body;
  const validKeys = Object.keys(NOTIFICATION_CATEGORIES);
  const cleaned = Array.isArray(muted) ? muted.filter(k => validKeys.includes(k)) : [];
  await User.findByIdAndUpdate(req.user.id, { $set: { 'settings.mutedNotificationCategories': cleaned } });
  res.json({
    categories: Object.entries(NOTIFICATION_CATEGORIES).map(([key, c]) => ({ key, label: c.label, enabled: !cleaned.includes(key) })),
  });
}));

// GET /api/notifications — get my notifications (paginated), respecting category preferences
router.get('/', auth, asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const limit  = 100; // return latest 100 notifications — enough for any inbox UI

  const muted = req.user.settings?.mutedNotificationCategories || [];
  const mutedTypes = muted.flatMap(key => NOTIFICATION_CATEGORIES[key]?.types || []);
  const filter = { userId };
  if (mutedTypes.length) filter.type = { $nin: mutedTypes };

  const all = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean();

  const result = all.map(n => ({ ...n, id: n._id.toString(), body: n.body || n.message }));

  res.json(result);
}));

// POST /api/notifications/platform-summary — generate live platform summary for super_admin
router.post('/platform-summary', auth, asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, error: 'Forbidden' });
  }

  const userId = req.user._id || req.user.id;
  const now    = new Date();
  const day    = new Date(now - 24 * 60 * 60 * 1000);
  const week   = new Date(now - 7  * 24 * 60 * 60 * 1000);

  const [
    newUsersToday,
    newUsersWeek,
    totalUsers,
    totalOrgs,
    pendingInvites,
    activeRecruiters,
  ] = await Promise.all([
    User.countDocuments({ createdAt: { $gte: day }, role: { $ne: 'super_admin' } }),
    User.countDocuments({ createdAt: { $gte: week }, role: { $ne: 'super_admin' } }),
    User.countDocuments({ isActive: true, role: { $ne: 'super_admin' } }),
    Organization.countDocuments({ slug: { $ne: '__platform__' } }),
    User.countDocuments({ isActive: false, inviteStatus: 'pending' }),
    User.countDocuments({ isActive: true, role: 'recruiter' }),
  ]);

  // Remove stale auto-generated system summaries before re-inserting
  await Notification.deleteMany({
    userId,
    type: 'system',
    title: { $regex: /^(Platform|Users|Orgs|Pending|Recruiters)/ },
  });

  const docs = [];

  docs.push({
    userId,
    type   : 'system',
    title  : `Platform Overview`,
    message: `${totalUsers} active users · ${totalOrgs} organisation${totalOrgs !== 1 ? 's' : ''} · ${activeRecruiters} recruiter${activeRecruiters !== 1 ? 's' : ''} active`,
    metadata: { totalUsers, totalOrgs, activeRecruiters },
    link   : '/app/organisations',
    read   : false,
  });

  if (newUsersToday > 0) {
    docs.push({
      userId,
      type   : 'system',
      title  : `${newUsersToday} new user${newUsersToday > 1 ? 's' : ''} joined today`,
      message: `${newUsersWeek} new user${newUsersWeek !== 1 ? 's' : ''} joined this week across all organisations.`,
      metadata: { newUsersToday, newUsersWeek },
      link   : '/app/admins?tab=users',
      read   : false,
    });
  }

  if (pendingInvites > 0) {
    docs.push({
      userId,
      type   : 'system',
      title  : `${pendingInvites} pending invite${pendingInvites > 1 ? 's' : ''}`,
      message: `${pendingInvites} user${pendingInvites > 1 ? 's have' : ' has'} not yet accepted their invitation. Consider resending.`,
      metadata: { pendingInvites },
      link   : '/app/admins?tab=pending',
      read   : false,
    });
  }

  if (docs.length) await Notification.insertMany(docs, { ordered: false });

  const fresh = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(200).lean();
  res.json(fresh.map(n => ({ ...n, id: n._id.toString(), body: n.body || n.message })));
}));

// PATCH /api/notifications/read-all — mark all read (Performance optimized)
router.patch('/read-all', auth, asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user.id, read: false },
    { $set: { read: true } }
  );
  res.json({ ok: true, message: 'All notifications marked as read' });
}));

// PATCH /api/notifications/:id/read — mark single read
router.patch('/:id/read', auth, asyncHandler(async (req, res) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { $set: { read: true } },
    { new: true }
  );
  
  if (!notif) throw new AppError('Notification not found or access denied.', 404);
  
  res.json({ ok: true });
}));

// DELETE /api/notifications — clear all notifications for this user
router.delete('/', auth, asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user.id });
  res.json({ ok: true, message: 'All notifications cleared' });
}));

module.exports = router;

