'use strict';
const express      = require('express');
const router       = express.Router();

/** Escape regex special chars to prevent ReDoS on user-supplied search strings */
function escRe(s) { return String(s).slice(0, 200).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
const User         = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { allowRoles } = require('../middleware/rbac');
const { getPagination, paginatedResponse } = require('../middleware/paginate');
const { v, runValidations } = require('../middleware/validate');
const { sendEmailWithRetry, templates } = require('../utils/email');
const Organization = require('../models/Organization');
const asyncHandler        = require('../utils/asyncHandler');
const AppError            = require('../utils/AppError');
const checkPlanLimits     = require('../middleware/checkPlanLimits');
const userService = require('../services/user.service');
const logger       = require('../middleware/logger');
const bcrypt       = require('bcryptjs');
const crypto       = require('crypto');

// POST /api/users — Create/Invite Recruiter or Candidate
router.post('/', authenticate, allowRoles('admin','super_admin','recruiter'), checkPlanLimits('recruiters'), asyncHandler(async (req, res) => {
  const { name, email, role = 'recruiter', ...metadata } = req.body;
  if (req.user.role !== 'super_admin' && role === 'admin') throw new AppError('Forbidden: Only Super Admin can invite an Admin.', 403);
  if (req.user.role === 'recruiter' && role !== 'candidate') throw new AppError('Forbidden: Recruiter can only create candidates.', 403);
  if (req.user.role === 'admin' && !['recruiter', 'candidate'].includes(role)) throw new AppError('Forbidden: Admin can only invite Recruiters or Candidates.', 403);

  const checks = runValidations({ name: v.name(name), email: v.email(email) });
  if (checks.hasErrors) throw new AppError(checks.errors[0].message, 400);

  let tenantId = req.user.role === 'super_admin' ? req.body.tenantId : req.user.tenantId;
  if (!tenantId) throw new AppError('tenantId is required.', 400);

  const newUser = await userService.inviteUser({
    name: checks.values.name,
    email: checks.values.email,
    role, tenantId,
    addedBy: req.user._id,
    ...metadata
  });

  logger.audit('User invited', req.user._id, tenantId, { email: newUser.email, role });
  res.status(201).json({ success: true, data: userService.normalize(newUser) });
}));

// GET /api/users — Paginated List
router.get('/', authenticate, allowRoles('admin','super_admin'), asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const tid = req.query.tenantId || req.query.orgId;
  const filter = req.user.role === 'super_admin'
    ? (tid ? { $or: [{ tenantId: tid }, { orgId: tid }] } : {})
    : { tenantId: req.user.tenantId };
  if (req.query.role) filter.role = req.query.role;
  if (req.query.search) {
    const _s = escRe(req.query.search);
    const searchOr = [
      { name: { $regex: _s, $options: 'i' } },
      { email: { $regex: _s, $options: 'i' } }
    ];
    // Combine with existing $or (tenantId/orgId) using $and to avoid overwriting
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchOr }];
      delete filter.$or;
    } else {
      filter.$or = searchOr;
    }
  }

  const [users, total] = await Promise.all([
    User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter)
  ]);

  res.json(paginatedResponse(users.map(userService.normalize), total, limit, page));
}));

// GET /api/users/candidates — Candidate listing (recruiter/admin)
router.get('/candidates', authenticate, allowRoles('admin','super_admin','recruiter'), asyncHandler(async (req, res) => {
  const filter = req.user.role === 'super_admin'
    ? { role: 'candidate', ...(req.query.tenantId ? { tenantId: req.query.tenantId } : {}) }
    : { role: 'candidate', tenantId: req.user.tenantId };
  const limit = Math.min(parseInt(req.query.limit) || 500, 1000); // cap at 1000
  const candidates = await User.find(filter).select('-password').sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ success: true, candidates: candidates.map(userService.normalize) });
}));

// GET /api/users/count — Statistics helper
router.get('/count', authenticate, allowRoles('admin','super_admin','recruiter'), asyncHandler(async (req, res) => {
  const filter = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };
  if (req.query.role) filter.role = req.query.role;
  const count = await User.countDocuments(filter);
  res.json({ success: true, count });
}));

// GET /api/users/me — Profile shortcut
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id || req.user.id).select('-password').lean();
  if (!user) throw new AppError('User not found.', 404);
  res.json({ success: true, data: userService.normalize(user) });
}));

// PATCH /api/users/me — Self profile update
router.patch('/me', authenticate, asyncHandler(async (req, res) => {
  const forbidden = ['password','role','orgId','email'];
  const update = Object.fromEntries(Object.entries(req.body).filter(([k]) => !forbidden.includes(k)));
  const updated = await User.findByIdAndUpdate(req.user._id || req.user.id, { $set: update }, { new: true }).select('-password');
  if (!updated) throw new AppError('User not found.', 404);
  res.json({ success: true, data: userService.normalize(updated) });
}));

// GET /api/users/pending — Unified Pending Invites List (must be BEFORE /:id)
router.get('/pending', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const filter = { inviteStatus: 'pending', isActive: false };
  if (req.user.role === 'admin') filter.tenantId = req.user.tenantId;

  const users = await User.find(filter)
    .select('name email role inviteStatus invitedBy invitedAt resetPasswordExpires tenantId')
    .populate('invitedBy', 'name email')
    .sort({ invitedAt: -1 })
    .lean();

  const now = new Date();
  const result = users.map(u => ({
    ...userService.normalize(u),
    isExpired: u.resetPasswordExpires ? u.resetPasswordExpires < now : false,
  }));

  res.json({ success: true, data: result });
}));

// GET /api/users/:id — Detailed user
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const isOwn = req.params.id === (req.user._id || req.user.id).toString();
  if (!isOwn && !['admin','super_admin'].includes(req.user.role)) throw new AppError('Access denied.', 403);

  const user = await User.findById(req.params.id).select('-password').lean();
  if (!user) throw new AppError('User not found.', 404);
  res.json({ success: true, data: userService.normalize(user) });
}));

// DELETE /api/users/:id — User removal (Soft Delete)
router.delete('/:id', authenticate, allowRoles('admin','super_admin'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found.', 404);
  
  if (req.user.role === 'admin' && user.orgId?.toString() !== req.user.orgId?.toString()) {
    throw new AppError('Unauthorized: Different Org.', 403);
  }

  await userService.softDelete(req.params.id);
  logger.audit('User archived', req.user._id, req.user.orgId, { deletedUserId: req.params.id });
  res.json({ success: true, message: 'User moved to archive successfully.' });
}));

// PATCH /api/users/:id — Generic User Update (e.g., Role)
router.patch('/:id', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const forbidden = req.user.role === 'super_admin' ? ['password'] : ['password','orgId','email','role'];
  const update = Object.fromEntries(Object.entries(req.body).filter(([k]) => !forbidden.includes(k)));
  
  const userToUpdate = await User.findById(req.params.id);
  if (!userToUpdate) throw new AppError('User not found.', 404);

  // Super admins are protected — their isActive and role can never be changed via this endpoint
  if (userToUpdate.role === 'super_admin' && ('isActive' in update || 'role' in update)) {
    throw new AppError('Super Admin accounts are protected and cannot be deactivated or have their role changed.', 403);
  }

  // Authorization: Admin can only update users in their organization
  if (req.user.role === 'admin' && userToUpdate.orgId?.toString() !== req.user.orgId?.toString()) {
    throw new AppError('Forbidden: Different Organization.', 403);
  }

  // Sanitize phone (remove spaces/dashes that break SMS validation)
  if (typeof update.phone === 'string') update.phone = update.phone.replace(/\s+/g, '');

  // Enforce linkedin.com/in/ prefix if a LinkedIn URL is provided
  if (update.linkedinUrl && !/^https?:\/\/(www\.)?linkedin\.com\/in\//i.test(update.linkedinUrl)) {
    throw new AppError('LinkedIn URL must start with https://linkedin.com/in/', 400);
  }

  const updated = await User.findByIdAndUpdate(req.params.id, { $set: update }, { new: true }).select('-password');
  logger.audit('User updated', req.user._id, req.user.orgId, { targetUserId: req.params.id, updates: Object.keys(update) });
  res.json({ success: true, data: userService.normalize(updated) });
}));

// POST /api/users/bulk-import — Fast Candidate Ingestion
router.post('/bulk-import', authenticate, allowRoles('admin','super_admin','recruiter'), asyncHandler(async (req, res) => {
  const { candidates, jobId = null } = req.body;
  if (!candidates) throw new AppError('No candidates provided.', 400);

  const stats = await userService.bulkImport(candidates, req.user.tenantId, req.user._id || req.user.id, jobId);

  logger.audit('Bulk import completed', req.user._id, req.user.tenantId, { ...stats, jobId });
  res.json({ success: true, ...stats, message: `Import complete — ${stats.created} created, ${stats.updated} restored, ${stats.skipped} skipped.` });
}));

// PATCH /api/users/:id/change-password — Self or Super Admin change
router.patch('/:id/change-password', authenticate, asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin' && String(req.user._id || req.user.id) !== req.params.id) {
    throw new AppError('Unauthorized', 403);
  }
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) throw new AppError('New password must be at least 8 chars', 400);
  
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);

  user.password = bcrypt.hashSync(newPassword, 10);
  await user.save();
  res.json({ success: true, message: 'Password updated.' });
}));

// POST /api/users/resend-invite — Professional Invitation Refresh
router.post('/resend-invite', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) throw new AppError('userId is required.', 400);

  const user = await userService.resendInvite(userId, req.user._id);
  
  logger.audit('Invitation resent', req.user._id, user.orgId, { targetUserId: userId });
  res.json({ success: true, message: `Invitation refreshed for ${user.email}` });
}));

// DELETE /api/users/revoke-invite/:id — Revoke/Cancel invitation
router.delete('/revoke-invite/:id', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  await userService.revokeInvite(req.params.id);
  
  logger.audit('Invitation revoked', req.user._id, req.user.orgId, { targetUserId: req.params.id });
  res.json({ success: true, message: 'Invitation revoked successfully.' });
}));

// POST /api/users/:id/resend-invite — Resend invite for a specific user by ID
router.post('/:id/resend-invite', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const user = await userService.resendInvite(req.params.id, req.user._id);
  logger.audit('Invitation resent', req.user._id, user.orgId, { targetUserId: req.params.id });
  res.json({ success: true, message: `Invitation refreshed for ${user.email}` });
}));

// PATCH /api/users/bulk-ta — Bulk update TA/recruiter assignment
router.patch('/bulk-ta', authenticate, allowRoles('admin','super_admin','recruiter'), asyncHandler(async (req, res) => {
  const { userIds, recruiterId, action } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) throw new AppError('userIds array required.', 400);
  const update = action === 'unassign' ? { $unset: { assignedRecruiter: 1 } } : { $set: { assignedRecruiter: recruiterId } };
  await User.updateMany({ _id: { $in: userIds }, tenantId: req.user.tenantId }, update);
  logger.audit('Bulk TA assignment', req.user._id, req.user.orgId, { count: userIds.length, recruiterId });
  res.json({ success: true, message: `Updated ${userIds.length} users.` });
}));

// PATCH /api/users/:id/reach-out — Log contact/outreach attempt
router.patch('/:id/reach-out', authenticate, allowRoles('admin','super_admin','recruiter'), asyncHandler(async (req, res) => {
  const { note } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $push: { contactLog: { note: note || 'Reached out', date: new Date(), by: req.user._id } }, $set: { lastContactedAt: new Date() } },
    { new: true }
  ).select('-password').lean();
  if (!user) throw new AppError('User not found.', 404);
  logger.audit('Candidate reach-out logged', req.user._id, req.user.orgId, { targetUserId: req.params.id });
  res.json({ success: true, data: userService.normalize(user) });
}));

// PATCH /api/users/:id/assign — Assign recruiter to candidate
router.patch('/:id/assign', authenticate, allowRoles('admin','super_admin','recruiter'), asyncHandler(async (req, res) => {
  const { recruiterId } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: { assignedRecruiter: recruiterId || null } },
    { new: true }
  ).select('-password').lean();
  if (!user) throw new AppError('User not found.', 404);
  logger.audit('Recruiter assigned to candidate', req.user._id, req.user.orgId, { targetUserId: req.params.id, recruiterId });
  res.json({ success: true, data: userService.normalize(user) });
}));

// POST /api/users/bulk-whatsapp — send personalised WhatsApp to multiple candidates
router.post('/bulk-whatsapp', authenticate, allowRoles('admin','super_admin','recruiter'), asyncHandler(async (req, res) => {
  const { userIds = [], messageTemplate = '', recruiterName = '', jobTitle = '', companyName = '' } = req.body;
  if (!userIds.length)         throw new AppError('No candidates selected.', 400);
  if (!messageTemplate.trim()) throw new AppError('Message template required.', 400);

  const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
  const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TWILIO_FROM  = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
  const DEV_MODE     = !TWILIO_SID || !TWILIO_TOKEN;

  const users = await User.find({ _id: { $in: userIds } }).select('name phone').lean();
  const results = [];

  for (const u of users) {
    const phone = (u.phone || '').replace(/\D/g, '');
    const personalised = messageTemplate
      .replace(/\{candidateName\}/gi, u.name || 'Candidate')
      .replace(/\{jobTitle\}/gi,      jobTitle    || 'this role')
      .replace(/\{companyName\}/gi,   companyName || 'our company')
      .replace(/\{recruiterName\}/gi, recruiterName || 'Recruiter');

    if (phone.length < 10) {
      results.push({ name: u.name, status: 'skipped', reason: 'No phone number' });
      continue;
    }

    if (DEV_MODE) {
      console.log(`[WhatsApp BULK DEV] To: +${phone} | ${personalised.slice(0, 80)}`);
      results.push({ name: u.name, status: 'sent_dev' });
    } else {
      try {
        const params = new URLSearchParams({ From: TWILIO_FROM, To: `whatsapp:+${phone}`, Body: personalised });
        const resp = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
          { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() }
        );
        results.push({ name: u.name, status: resp.ok ? 'sent' : 'failed' });
      } catch (err) {
        results.push({ name: u.name, status: 'failed', reason: err.message });
      }
    }
  }
  res.json({ success: true, results });
}));

// POST /api/users/check-duplicate — duplicate detection before add
router.post('/check-duplicate', authenticate, allowRoles('admin','super_admin','recruiter'), asyncHandler(async (req, res) => {
  const { name = '', email = '', phone = '' } = req.body;
  const orgId = req.user.orgId || req.user.tenantId;
  const matches = [];

  if (email) {
    const byEmail = await User.findOne({ orgId, email: email.toLowerCase().trim() }).select('name email phone _id').lean();
    if (byEmail) matches.push({ ...byEmail, id: byEmail._id?.toString(), matchType: 'email' });
  }
  if (phone) {
    const clean = phone.replace(/\D/g, '');
    const byPhone = await User.findOne({ orgId, phone: { $regex: clean.slice(-8) } }).select('name email phone _id').lean();
    if (byPhone && !matches.find(m => String(m._id) === String(byPhone._id))) {
      matches.push({ ...byPhone, id: byPhone._id?.toString(), matchType: 'phone' });
    }
  }
  if (name && !matches.length) {
    function lev(a, b) {
      const dp = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0));
      for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
        dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      return dp[a.length][b.length];
    }
    const pool = await User.find({ orgId, role: 'candidate' }).select('name email phone _id').lean();
    const nl = name.toLowerCase().trim();
    for (const u of pool) {
      const d = lev(nl, (u.name || '').toLowerCase().trim());
      if (d > 0 && d <= 2) { matches.push({ ...u, id: u._id?.toString(), matchType: 'name_similar', distance: d }); if (matches.length >= 3) break; }
    }
  }
  res.json({ success: true, duplicates: matches });
}));

// POST /api/users/merge — Consolidate duplicate profiles (Super Admin Only)
router.post('/merge', authenticate, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const { primaryId, duplicateId } = req.body;
  if (!primaryId || !duplicateId) throw new AppError('primaryId and duplicateId are required', 400);
  
  const merged = await userService.mergeUsers(primaryId, duplicateId, req.user._id);
  res.json({ success: true, message: 'Users merged successfully', data: userService.normalize(merged) });
}));

// GET /api/users/export — export candidates/users to Excel
router.get('/export', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const { exportToExcel } = require('../utils/exportToExcel');
  const tid = req.query.tenantId || (req.user.role !== 'super_admin' ? req.user.tenantId : undefined);
  const filter = { deletedAt: null };
  if (tid) filter.$or = [{ tenantId: tid }, { orgId: tid }];
  if (req.query.role) filter.role = req.query.role;

  const users = await User.find(filter).select('-password -passwordHash').sort({ createdAt: -1 }).limit(5000).lean();

  const columns = [
    { header: 'Name',       key: 'name',      width: 22 },
    { header: 'Email',      key: 'email',      width: 28 },
    { header: 'Role',       key: 'role',       width: 16 },
    { header: 'Phone',      key: 'phone',      width: 16 },
    { header: 'Location',   key: 'location',   width: 20 },
    { header: 'Skills',     key: 'skillsStr',  width: 35 },
    { header: 'Status',     key: 'status',     width: 12 },
    { header: 'Joined',     key: 'joined',     width: 16 },
  ];

  const rows = users.map(u => ({
    name:      u.name || '',
    email:     u.email || '',
    role:      u.role || '',
    phone:     u.phone || '',
    location:  u.location || '',
    skillsStr: Array.isArray(u.skills) ? u.skills.join(', ') : (u.skills || ''),
    status:    u.isActive ? 'Active' : 'Inactive',
    joined:    u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '',
  }));

  const buf = exportToExcel('Users', columns, rows);
  const role = req.query.role || 'users';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${role}-export-${Date.now()}.xlsx"`);
  res.send(buf);
}));

module.exports = router;
