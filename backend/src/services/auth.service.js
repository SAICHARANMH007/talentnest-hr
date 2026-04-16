const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const UserSession = require('../models/UserSession');
const Otp = require('../models/Otp');
const Organization = require('../models/Organization');
const Tenant       = require('../models/Tenant');
const AppError = require('../utils/AppError');
const normalize = require('../utils/normalize');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

/**
 * AuthService — Enterprise Business Logic for IAM
 */
class AuthService {
  /**
   * Helper: verify organization access (Suspension/Trial checks)
   */
  checkOrgAccess(org) {
    if (!org) return;
    const o = (org.toObject && org.toObject()) || (org.toJSON && org.toJSON()) || org;
    if (o.status === 'suspended' || o.isActive === false) throw new AppError('Your organization account is suspended.', 403);
    if (o.status === 'trial' && o.trialEndsAt && new Date(o.trialEndsAt) < new Date())
      throw new AppError('Your organization trial has expired.', 403);
  }

  /**
   * Helper to identify email domain
   */
  emailDomain(email) {
    if (!email || !email.includes('@')) return null;
    return email.split('@')[1].toLowerCase();
  }

  /**
   * Verify if a domain is registered and active.
   * Accepts either a bare domain (e.g. "talentnesthr.com") or an email address.
   */
  async verifyDomain(email) {
    // Accept bare domain (no @) or extract domain from email
    const domain = email?.includes('@') ? this.emailDomain(email) : email?.trim().toLowerCase().replace(/^www\./i, '');
    if (!domain) throw new AppError('Invalid email or domain.', 400);

    const domainRegex = { $regex: `(^|www\\.)${domain.replace(/\./g, '\\.')}$`, $options: 'i' };

    // Check Tenant first (primary collection used by registration + all real tenants)
    const tenant = await Tenant.findOne({
      domain: domainRegex,
      subscriptionStatus: { $ne: 'suspended' },
    }).select('name logoUrl subscriptionStatus').lean();

    if (tenant) {
      return { exists: true, domain, organization: { name: tenant.name, logo: tenant.logoUrl, status: tenant.subscriptionStatus } };
    }

    // Fall back to Organization (super admin-created orgs)
    const org = await Organization.findOne({
      domain: domainRegex,
      status: 'active',
    }).select('name logoUrl status').lean();

    if (!org) return { exists: false, domain };
    return { exists: true, domain, organization: { name: org.name, logo: org.logoUrl, status: org.status } };
  }

  /**
   * Central method to issue dual tokens (Access/Refresh) + create UserSession
   */
  async issueTokens(res, user, req) {
    if (!user) throw new AppError('User not found.', 404);

    // ── Access Token (short-lived) ─────────────────────────────────────────────
    const tenantId = (user.tenantId || user.orgId || '').toString();
    const accessToken = jwt.sign(
      { userId: user._id, tenantId, role: user.role },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    // ── Refresh Token (long-lived) ─────────────────────────────────────────────
    const refreshTokenString = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      await RefreshToken.create({
        token: refreshTokenString,
        userId: user._id,
        expiresAt,
        ip: req?.ip,
        userAgent: req?.headers?.['user-agent'],
      });
    } catch (err) {
      if (err.name === 'ValidationError') {
        console.error('❌ RefreshToken Validation Error:', err.message, err.errors);
      }
      throw err;
    }

    // ── UserSession record ─────────────────────────────────────────────────────
    try {
      const ua = req?.headers?.['user-agent'] || '';
      const { browser, os, deviceName } = UserSession.parseUA(ua);
      await UserSession.create({
        userId:       user._id,
        tenantId:     user.tenantId || user.orgId || null,
        refreshToken: refreshTokenString,
        ip:           req?.ip,
        userAgent:    ua,
        browser,
        os,
        deviceName,
        lastActive:   new Date(),
        expiresAt,
      });
    } catch (_) { /* non-critical — don't block login */ }

    // ── HttpOnly Cookie ────────────────────────────────────────────────────────
    const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.RENDER;
    res.cookie('tn_refresh_token', refreshTokenString, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? 'None' : 'Lax',
      signed: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const ROLE_REDIRECT = {
      super_admin: '/superadmin/dashboard',
      admin:       '/admin/dashboard',
      recruiter:   '/recruiter/dashboard',
      candidate:   '/candidate/dashboard',
      client:      '/client/dashboard',
    };

    const normalizedUser = normalize(user);
    // Ensure orgId is always present as a frontend-compat alias for tenantId
    if (!normalizedUser.orgId && normalizedUser.tenantId) {
      normalizedUser.orgId = normalizedUser.tenantId;
    }

    return {
      token: accessToken,
      user: normalizedUser,
      redirect: ROLE_REDIRECT[user.role] || '/dashboard',
    };
  }

  /**
   * Refresh Token Logic (IAM Standard with Rotation)
   */
  async refresh(req, res) {
    const oldToken = req.signedCookies ? req.signedCookies.tn_refresh_token : null;
    if (!oldToken) throw new AppError('No refresh token provided.', 401);

    const stored = await RefreshToken.findOne({ token: oldToken });
    if (!stored) {
      res.clearCookie('tn_refresh_token');
      throw new AppError('Invalid refresh token session.', 401);
    }

    if (new Date() > stored.expiresAt) {
      await RefreshToken.deleteOne({ _id: stored._id });
      await UserSession.findOneAndUpdate({ refreshToken: oldToken }, { isActive: false }).catch(() => {});
      res.clearCookie('tn_refresh_token');
      throw new AppError('Refresh token expired.', 401);
    }

    const user = await User.findById(stored.userId);
    if (!user || user.isActive === false) {
      await RefreshToken.deleteMany({ userId: stored.userId });
      await UserSession.updateMany({ userId: stored.userId }, { isActive: false }).catch(() => {});
      res.clearCookie('tn_refresh_token');
      throw new AppError('User inactive or not found.', 401);
    }

    // Token rotation — deactivate old session
    await RefreshToken.deleteOne({ _id: stored._id });
    await UserSession.findOneAndUpdate(
      { refreshToken: oldToken },
      { isActive: false }
    ).catch(() => {});

    const { token, user: userData } = await this.issueTokens(res, user, req);
    return { token, user: userData };
  }

  /**
   * Secure OTP Generation — sends via SMS (if phone) or email fallback
   */
  async generateAndSendOtp(user) {
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await Otp.findOneAndUpdate(
      { email: user.email },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    let smsSent = false;

    // Try SMS first if user has a phone number
    if (user.phone) {
      try {
        const { sendSms } = require('../utils/sendSms');
        await sendSms(user.phone, `Your TalentNest HR login OTP is: ${otp}. Valid for 10 minutes. Do not share this with anyone.`);
        smsSent = true;
      } catch (smsErr) {
        console.warn('[2FA] SMS failed, falling back to email:', smsErr.message);
      }
    }

    // Email fallback (or primary if no phone)
    if (!smsSent) {
      const { sendEmailWithRetry, templates } = require('../utils/email');
      const tpl = templates.otp(otp);
      await sendEmailWithRetry(user.email, tpl.subject, tpl.html);
    }

    return { otp, channel: smsSent ? 'sms' : 'email' };
  }

  /**
   * OTP verification
   */
  async verifyOtp(email, code) {
    const otpRecord = await Otp.findOne({ email: email.toLowerCase(), otp: code });
    if (!otpRecord) throw new AppError('Invalid or expired 2FA code.', 401);
    await Otp.deleteOne({ _id: otpRecord._id });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new AppError('User not found.', 404);
    return user;
  }

  /**
   * Google token verification (google-auth-library)
   */
  async verifyGoogleToken(credential) {
    try {
      const { OAuth2Client } = require('google-auth-library');
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      return ticket.getPayload();
    } catch (err) {
      throw new AppError('Invalid Google credential: ' + err.message, 401);
    }
  }

  /**
   * List active sessions for a user
   */
  async getSessions(userId) {
    return UserSession.find({ userId, isActive: true })
      .sort({ lastActive: -1 })
      .select('ip userAgent deviceName browser os lastActive createdAt')
      .lean();
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(userId, sessionId) {
    const session = await UserSession.findOne({ _id: sessionId, userId });
    if (!session) throw new AppError('Session not found.', 404);
    await UserSession.findByIdAndUpdate(sessionId, { isActive: false });
    await RefreshToken.deleteOne({ token: session.refreshToken });
    return true;
  }

  /**
   * Terminate all sessions except the current one
   */
  async terminateOtherSessions(userId, currentToken) {
    const sessions = await UserSession.find({
      userId,
      isActive: true,
      refreshToken: { $ne: currentToken },
    });
    const tokens = sessions.map(s => s.refreshToken);
    await UserSession.updateMany({ userId, isActive: true, refreshToken: { $ne: currentToken } }, { isActive: false });
    await RefreshToken.deleteMany({ token: { $in: tokens } });
    return sessions.length;
  }
}

module.exports = new AuthService();
