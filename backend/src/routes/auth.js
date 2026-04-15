'use strict';
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Tenant = require('../models/Tenant');
const RefreshToken = require('../models/RefreshToken');
const { authMiddleware, authenticate } = require('../middleware/auth');
const { sendEmailWithRetry } = require('../utils/email');
const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');
const AppError = require('../utils/AppError');
const logger = require('../middleware/logger');

// ── Rate limiters ────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 20,
  message: { error: 'Too many registrations. Please try again later.' }
});
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { error: 'Too many OTP requests. Please wait before trying again.' }
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
// Creates a Tenant + admin User in one atomic transaction.
router.post('/register', registerLimiter, asyncHandler(async (req, res) => {
  const { name, email, password, domain } = req.body;
  const role = req.body.role === 'candidate' ? 'candidate' : 'admin';
  // For employer/admin signups companyName is required; candidates get a personal tenant
  const companyName = req.body.companyName || (role === 'candidate' ? `${name?.trim()} (Personal)` : null);
  if (!name || !email || !password || !companyName)
    throw new AppError('name, email, password, and companyName are required.', 400);
  if (password.length < 8)
    throw new AppError('Password must be at least 8 characters.', 400);
  if (await User.findOne({ email: email.toLowerCase().trim() }))
    throw new AppError('Email already registered.', 400);

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      // 1. Create tenant
      const slug = slugify(companyName);
      const tenant = await Tenant.create([{
        name: companyName.trim(),
        slug: slug + '-' + crypto.randomBytes(3).toString('hex'),
        domain: domain || authService.emailDomain(email),
        plan: role === 'candidate' ? 'free' : 'trial',
        subscriptionStatus: 'active',
        subscriptionExpiry: role === 'candidate' ? undefined : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      }], { session });

      // 2. Create user
      const user = await User.create([{
        tenantId: tenant[0]._id,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash: bcrypt.hashSync(password, 12),
        phone: req.body.phone || undefined,
        role,
        isActive: true,
      }], { session });

      result = { tenant: tenant[0], user: user[0] };
    });
  } finally {
    await session.endSession();
  }

  // Send welcome email (non-blocking)
  const { templates } = require('../utils/email');
  const tpl = templates.welcome(result.user.name, result.user.role, { orgId: result.user.orgId?.toString() });
  sendEmailWithRetry(result.user.email, tpl.subject, tpl.html).catch(err =>
    logger.error('Welcome email failed', { to: result.user.email, err: err.message })
  );

  const tokens = await authService.issueTokens(res, result.user, req);
  res.status(201).json({ success: true, ...tokens });
}));

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required.', 400);

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Brute-force lock check
  if (user?.lockUntil && user.lockUntil > new Date()) {
    const remaining = Math.ceil((user.lockUntil - new Date()) / 60000);
    throw new AppError(`Account locked. Try again in ${remaining} mins.`, 403);
  }

  const passwordValid = user
    ? await bcrypt.compare(password, user.passwordHash || user.password || '')
    : false;

  if (!user || !passwordValid) {
    if (user) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updates = { failedLoginAttempts: attempts };
      if (attempts >= 5) {
        updates.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        updates.failedLoginAttempts = 0;
        logger.warn(`Account locked: ${user.email}`, { ip: req.ip });
      }
      await User.findByIdAndUpdate(user._id, { $set: updates });
    }
    throw new AppError('Invalid email or password.', 401);
  }

  // Reset failed attempts
  if (user.failedLoginAttempts > 0)
    await User.findByIdAndUpdate(user._id, { $set: { failedLoginAttempts: 0, lockUntil: null } });

  // mustChangePassword flow
  if (user.mustChangePassword) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: new Date(Date.now() + 30 * 60 * 1000),
    });
    return res.json({ mustChangePassword: true, changePasswordToken: rawToken, email: user.email });
  }

  // 2FA flow
  if (user.twoFactorEnabled) {
    await authService.generateAndSendOtp(user);
    return res.json({ requires2FA: true, email: user.email });
  }

  await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
  const result = await authService.issueTokens(res, user, req);
  res.json({ success: true, ...result });
}));

// ── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', asyncHandler(async (req, res) => {
  const tokenStr = req.signedCookies?.tn_refresh_token;
  if (tokenStr) {
    await RefreshToken.deleteOne({ token: tokenStr });
    const UserSession = require('../models/UserSession');
    await UserSession.findOneAndUpdate({ refreshToken: tokenStr }, { isActive: false }).catch(() => {});
  }
  res.clearCookie('tn_refresh_token');
  res.json({ success: true, message: 'Logged out successfully' });
}));

// ── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', asyncHandler(async (req, res) => {
  const result = await authService.refresh(req, res);
  res.json({ success: true, ...result });
}));

// ── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', otpLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError('Email is required.', 400);

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await User.findByIdAndUpdate(user._id, {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    });

    const link = `${process.env.FRONTEND_URL || 'https://talentnesthr.com'}/set-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(user.email)}&mode=reset`;
    const { templates } = require('../utils/email');
    const tpl = templates.forgotPassword(user.name, link, { orgId: user.orgId?.toString() });
    await sendEmailWithRetry(user.email, tpl.subject, tpl.html).catch(() => { });
  }

  // Always return success to prevent user enumeration
  res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
}));

// ── POST /api/auth/reset-password/:token ─────────────────────────────────────
router.post('/reset-password/:token', asyncHandler(async (req, res) => {
  const rawToken = req.params.token || req.body.token;
  const { email, newPassword } = req.body;
  if (!rawToken || !email || !newPassword)
    throw new AppError('token, email and newPassword are required.', 400);
  if (newPassword.length < 8)
    throw new AppError('Password must be at least 8 characters.', 400);

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    resetPasswordToken: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  });
  if (!user) throw new AppError('Reset link is invalid or has expired.', 400);

  user.passwordHash = bcrypt.hashSync(newPassword, 12);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.mustChangePassword = false;
  await user.save();

  res.json({ success: true, message: 'Password updated. You can now log in.' });
}));

// ── POST /api/auth/set-password/:inviteToken ─────────────────────────────────
// Recruiters / invited users set their password from the invite email link.
router.post('/set-password/:inviteToken', asyncHandler(async (req, res) => {
  const rawToken = req.params.inviteToken || req.body.token;
  const { email, newPassword } = req.body;
  if (!rawToken || !email || !newPassword)
    throw new AppError('inviteToken, email and newPassword are required.', 400);
  if (newPassword.length < 8)
    throw new AppError('Password must be at least 8 characters.', 400);

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Support both new inviteToken field and legacy resetPasswordToken
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    $or: [
      { inviteToken: tokenHash },
      { resetPasswordToken: tokenHash, resetPasswordExpires: { $gt: new Date() } },
    ],
  });
  if (!user) throw new AppError('Invite link is invalid or has expired.', 400);

  user.passwordHash = bcrypt.hashSync(newPassword, 12);
  user.inviteToken = null;
  user.inviteTokenExpiry = null;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.mustChangePassword = false;
  user.isActive = true;
  await user.save();

  const result = await authService.issueTokens(res, user, req);
  res.json({ success: true, ...result });
}));

// ── POST /api/auth/set-password (legacy — body token) ────────────────────────
router.post('/set-password', asyncHandler(async (req, res) => {
  const { token, email, newPassword } = req.body;
  if (!token || !email || !newPassword)
    throw new AppError('token, email and newPassword are required.', 400);
  if (newPassword.length < 8)
    throw new AppError('Password must be at least 8 characters.', 400);

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    resetPasswordToken: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  });
  if (!user) throw new AppError('This link is invalid or has expired.', 400);

  user.passwordHash = bcrypt.hashSync(newPassword, 12);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.mustChangePassword = false;
  user.isActive = true;
  await user.save();

  const result = await authService.issueTokens(res, user, req);
  res.json({ success: true, ...result });
}));

// ── POST /api/auth/change-password ───────────────────────────────────────────
// For forced change when mustChangePassword is true, or self-service.
router.post('/change-password', authMiddleware, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    throw new AppError('currentPassword and newPassword are required.', 400);
  if (newPassword.length < 8)
    throw new AppError('Password must be at least 8 characters.', 400);

  const user = await User.findById(req.user._id || req.user.id);
  if (!user) throw new AppError('User not found.', 404);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash || user.password || '');
  if (!valid) throw new AppError('Current password is incorrect.', 401);

  user.passwordHash = bcrypt.hashSync(newPassword, 12);
  user.mustChangePassword = false;
  await user.save();

  // Invalidate all existing refresh tokens so stolen sessions can't persist
  await RefreshToken.deleteMany({ userId: user._id });
  res.clearCookie('tn_refresh', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });

  res.json({ success: true, message: 'Password updated successfully.' });
}));

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id || req.user.id)
    .select('-passwordHash -password -resetPasswordToken -resetPasswordExpires -inviteToken')
    .lean();
  if (!user) throw new AppError('User not found.', 404);
  res.json({ success: true, data: { ...user, id: user._id.toString() } });
}));

// ── POST /api/auth/verify-otp ─────────────────────────────────────────────────
router.post('/verify-otp', otpLimiter, asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new AppError('Email and OTP are required.', 400);
  const user = await authService.verifyOtp(email, otp);
  const result = await authService.issueTokens(res, user, req);
  res.json({ success: true, ...result });
}));

// ── POST /api/auth/impersonate ────────────────────────────────────────────────
router.post('/impersonate', authMiddleware, asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin')
    throw new AppError('Only Super Admins can impersonate.', 403);

  const { targetUserId } = req.body;
  if (!targetUserId) throw new AppError('targetUserId is required.', 400);

  const target = await User.findById(targetUserId);
  if (!target) throw new AppError('Target user not found.', 404);
  if (target.role === 'super_admin') throw new AppError('Cannot impersonate another Super Admin.', 403);

  const result = await authService.issueTokens(res, target, req);
  res.json({ success: true, ...result, impersonating: true, originalUserId: req.user._id });
}));

// ── POST /api/auth/verify-domain (legacy support) ────────────────────────────
router.post('/verify-domain', asyncHandler(async (req, res) => {
  const input = req.body.email || req.body.domain;
  if (!input) throw new AppError('Email or domain is required.', 400);
  const result = await authService.verifyDomain(input);
  res.json({ success: true, data: result });
}));

// ── GET /api/auth/verify-invite (legacy invite flow) ─────────────────────────
router.get('/verify-invite', asyncHandler(async (req, res) => {
  const { token, email } = req.query;
  if (!token || !email) throw new AppError('Token and email are required.', 400);

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    $or: [
      { inviteToken: tokenHash },
      { resetPasswordToken: tokenHash, resetPasswordExpires: { $gt: new Date() } },
    ],
  }).select('name email role').lean();

  if (!user) throw new AppError('Invite link is invalid or has expired.', 400);
  res.json({ success: true, data: { name: user.name, email: user.email, role: user.role } });
}));

// ── POST /api/auth/google (Google OAuth) ─────────────────────────────────────
router.post('/google', loginLimiter, asyncHandler(async (req, res) => {
  const { credential, role: reqRole } = req.body;
  const payload = await authService.verifyGoogleToken(credential);
  const cleanEmail = payload.email.toLowerCase().trim();

  let user = await User.findOne({ email: cleanEmail });

  if (!user) {
    const role = ['candidate', 'recruiter'].includes(reqRole) ? reqRole : 'candidate';
    const domain = authService.emailDomain(cleanEmail);
    const Tenant = require('../models/Tenant');

    // Try to find existing tenant by domain
    let tenant = await Tenant.findOne({ domain: { $regex: domain.replace(/\./g, '\\.'), $options: 'i' } });

    // For candidates: create a solo personal tenant if none found
    if (!tenant && role === 'candidate') {
      tenant = await Tenant.create({
        name: payload.name + ' (Personal)',
        slug: `personal-${crypto.randomBytes(4).toString('hex')}`,
        domain,
        plan: 'free',
        subscriptionStatus: 'active',
      });
    }

    if (!tenant) throw new AppError('No organisation found for this domain. Please contact your HR admin.', 403);

    user = await User.create({
      tenantId: tenant._id,
      name: payload.name,
      email: cleanEmail,
      passwordHash: bcrypt.hashSync(payload.sub + Date.now(), 10),
      googleId: payload.sub,
      photoUrl: payload.picture || undefined,
      role,
      isActive: true,
    });
  }

  await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
  const result = await authService.issueTokens(res, user, req);
  res.json({ success: true, ...result });
}));

// ── POST /api/auth/2fa/toggle ─────────────────────────────────────────────────
// Enable or disable 2FA for the authenticated user.
router.post('/2fa/toggle', authMiddleware, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id || req.user.id);
  if (!user) throw new AppError('User not found.', 404);

  const newState = !user.twoFactorEnabled;
  await User.findByIdAndUpdate(user._id, { twoFactorEnabled: newState });

  // If enabling, send a test OTP so user can verify it works
  if (newState) {
    await authService.generateAndSendOtp(user).catch(() => {});
  }

  res.json({
    success: true,
    twoFactorEnabled: newState,
    message: newState
      ? `2FA enabled. An OTP has been sent to your ${user.phone ? 'phone' : 'email'}.`
      : '2FA disabled.',
  });
}));

// ── GET /api/auth/sessions ────────────────────────────────────────────────────
router.get('/sessions', authMiddleware, asyncHandler(async (req, res) => {
  const sessions = await authService.getSessions(req.user._id || req.user.id);
  const currentToken = req.signedCookies?.tn_refresh_token;
  const result = sessions.map(s => ({
    ...s,
    id: s._id.toString(),
    isCurrent: s.refreshToken === currentToken || false,
  }));
  res.json({ success: true, data: result });
}));

// ── DELETE /api/auth/sessions/others ─────────────────────────────────────────
router.delete('/sessions/others', authMiddleware, asyncHandler(async (req, res) => {
  const currentToken = req.signedCookies?.tn_refresh_token || '';
  const count = await authService.terminateOtherSessions(req.user._id || req.user.id, currentToken);
  res.json({ success: true, message: `${count} other session(s) terminated.` });
}));

// ── DELETE /api/auth/sessions/:id ─────────────────────────────────────────────
router.delete('/sessions/:id', authMiddleware, asyncHandler(async (req, res) => {
  await authService.terminateSession(req.user._id || req.user.id, req.params.id);
  res.json({ success: true, message: 'Session terminated.' });
}));

// ── POST /api/auth/reset-password (legacy body token) ────────────────────────
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, email, newPassword } = req.body;
  if (!token || !email || !newPassword)
    throw new AppError('token, email and newPassword are required.', 400);
  if (newPassword.length < 8)
    throw new AppError('Password must be at least 8 characters.', 400);

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    resetPasswordToken: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  });
  if (!user) throw new AppError('Reset link is invalid or has expired.', 400);

  user.passwordHash = bcrypt.hashSync(newPassword, 12);
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.mustChangePassword = false;
  await user.save();

  res.json({ success: true, message: 'Password updated. You can now log in.' });
}));

module.exports = router;
