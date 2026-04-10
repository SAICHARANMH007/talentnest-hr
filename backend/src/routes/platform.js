'use strict';
const express     = require('express');
const { authenticate: auth } = require('../middleware/auth');
const { allowRoles } = require('../middleware/rbac');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../utils/AppError');
const Organization = require('../models/Organization');
const logger       = require('../middleware/logger');
const router      = express.Router();

async function getPlatformDoc() {
  const doc = await Organization.findOne({ slug: '__platform__' });
  return doc ? (doc.toJSON ? doc.toJSON() : doc) : { slug: '__platform__', settings: {} };
}

async function savePlatformDoc(updates) {
  const existing = await Organization.findOne({ slug: '__platform__' });
  if (existing) {
    const d = existing.toJSON ? existing.toJSON() : existing;
    const merged = { ...(d.settings || {}), ...updates };
    await Organization.findOneAndUpdate({ slug: '__platform__' }, { $set: { settings: merged } }, { new: true });
    return merged;
  } else {
    await Organization.create({ name: '__platform__', slug: '__platform__', settings: updates });
    return updates;
  }
}

// GET /api/platform/config
router.get('/config', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const doc = await getPlatformDoc();
  res.json({ success: true, data: doc.settings || {} });
}));

// PATCH /api/platform/security — save security settings
router.patch('/security', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const allowed = ['sessionTimeout','minPasswordLength','require2FA','requireStrongPassword','ipWhitelist','maxLoginAttempts','lockoutDuration','allowedDomains','ssoEnabled','auditLogRetention'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
  
  if (!Object.keys(updates).length) throw new AppError('No valid fields provided.', 400);
  
  await savePlatformDoc({ security: updates });
  res.json({ success: true, data: { security: updates } });
}));

// GET /api/platform/flags
router.get('/flags', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const doc = await getPlatformDoc();
  res.json({ success: true, data: (doc.settings || {}).featureFlags || {} });
}));

// PATCH /api/platform/flags — save feature flags
router.patch('/flags', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const { flags } = req.body;
  if (!flags || typeof flags !== 'object') throw new AppError('flags object required.', 400);
  await savePlatformDoc({ featureFlags: flags });
  res.json({ success: true });
}));

// GET /api/platform/backup — full data export (super_admin only)
router.get('/backup', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const User        = require('../models/User');
  const Job         = require('../models/Job');
  const Application = require('../models/Application');
  const Organization = require('../models/Organization');

  let leads = [], assessments = [], emailLogs = [], notifications = [];
  try { const Lead        = require('../models/Lead');         leads         = await Lead.find({}).lean(); }         catch(e) {}
  try { const Assessment  = require('../models/Assessment');   assessments   = await Assessment.find({}).lean(); }   catch(e) {}
  try { const EmailLog    = require('../models/EmailLog');     emailLogs     = await EmailLog.find({}).lean(); }     catch(e) {}
  try { const Notification= require('../models/Notification');notifications  = await Notification.find({}).lean(); } catch(e) {}

  const [users, jobs, applications, orgs] = await Promise.all([
    User.find({}).select('-password -resetPasswordToken').lean(),
    Job.find({}).lean(),
    Application.find({}).lean(),
    Organization.find({ slug: { $ne: '__platform__' } }).lean(),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    exportedBy: req.user.email || req.user._id,
    version: '2.0 (Consolidated)',
    data: { users, jobs, applications, orgs, leads, assessments, emailLogs, notifications },
    counts: {
      users: users.length, jobs: jobs.length, applications: applications.length,
      orgs: orgs.length, leads: leads.length, assessments: assessments.length,
    },
  };

  const filename = `talentnest-backup-${new Date().toISOString().split('T')[0]}.json`;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json(backup);
}));

// GET /api/platform/audit-logs — recent activity (super_admin only)
router.get('/audit-logs', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const AuditLog = require('../models/AuditLog');
  const logs = await AuditLog.find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('userId', 'name email role')
    .lean();
  res.json({ success: true, data: logs });
}));

// GET /api/platform/raw/:model/:id — fetch any document exactly as it is (super_admin only)
router.get('/raw/:model/:id', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const { model, id } = req.params;
  const models = {
    user:         require('../models/User'),
    org:          require('../models/Organization'),
    job:          require('../models/Job'),
    application:   require('../models/Application'),
    audit:        require('../models/AuditLog'),
    assessment:   require('../models/Assessment'),
    invite:       require('../models/Invite'),
    notification: require('../models/Notification'),
  };

  const Model = models[model.toLowerCase()];
  if (!Model) throw new AppError('Invalid model specified.', 400);

  const doc = await Model.findById(id).lean();
  if (!doc) throw new AppError('Document not found.', 404);
  res.json({ success: true, data: doc });
}));

// PATCH /api/platform/raw/:model/:id — update any document directly (super_admin only)
router.patch('/raw/:model/:id', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const { model, id } = req.params;
  const models = {
    user:         require('../models/User'),
    org:          require('../models/Organization'),
    job:          require('../models/Job'),
    application:   require('../models/Application'),
    audit:        require('../models/AuditLog'),
    assessment:   require('../models/Assessment'),
    invite:       require('../models/Invite'),
    notification: require('../models/Notification'),
  };

  const Model = models[model.toLowerCase()];
  if (!Model) throw new AppError('Invalid model specified.', 400);

  // We perform a direct update with the provided body.
  // This is a powerful tool for Super Admins.
  const forbidden = ['_id', '__v', 'createdAt', 'updatedAt'];
  const update = { ...req.body };
  forbidden.forEach(k => delete update[k]);

  const doc = await Model.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
  if (!doc) throw new AppError('Document not found.', 404);

  logger.audit('Generic raw update', req.user._id, null, { model, targetId: id, updates: Object.keys(update) });
  res.json({ success: true, data: doc });
}));

module.exports = router;
