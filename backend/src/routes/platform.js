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

// GET /api/platform/audit-logs — paginated platform-wide audit logs (super_admin only)
router.get('/audit-logs', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const AuditLog = require('../models/AuditLog');
  const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
  const skip  = (page - 1) * limit;
  const filter = {};
  if (req.query.action) filter.action   = { $regex: req.query.action, $options: 'i' };
  if (req.query.userId) filter.userId   = req.query.userId;
  if (req.query.search) {
    const s = { $regex: req.query.search, $options: 'i' };
    filter.$or = [{ action: s }, { userName: s }, { 'details.detail': s }];
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('userId', 'name email role').lean(),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ success: true, data: logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
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

// ── GET /api/platform/revenue ────────────────────────────────────────────────
router.get('/revenue', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const PaymentRecord = require('../models/PaymentRecord');
  const Tenant        = require('../models/Tenant');

  const [payments, tenants] = await Promise.all([
    PaymentRecord.find({ status: 'captured' }).sort({ createdAt: -1 }).lean(),
    Tenant.find({}).select('name plan subscriptionStatus createdAt').lean(),
  ]);

  const totalRevenue = payments.reduce((s, p) => s + (p.amountINR || 0), 0);
  const now = Date.now();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const mrr = payments
    .filter(p => new Date(p.createdAt) >= monthStart)
    .reduce((s, p) => s + (p.amountINR || 0), 0);

  // Revenue by plan
  const planRevenue = {};
  payments.forEach(p => {
    const key = p.plan || 'unknown';
    planRevenue[key] = (planRevenue[key] || 0) + (p.amountINR || 0);
  });

  // Plan distribution from tenants
  const planDist = {};
  tenants.forEach(t => { planDist[t.plan || 'free'] = (planDist[t.plan || 'free'] || 0) + 1; });

  // Last 6 months revenue trend
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd   = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const val    = payments.filter(p => {
      const cd = new Date(p.createdAt);
      return cd >= mStart && cd <= mEnd;
    }).reduce((s, p) => s + (p.amountINR || 0), 0);
    monthlyTrend.push({ label, value: val });
  }

  // Recent payments
  const recent = payments.slice(0, 10).map(p => ({
    id: p._id, amount: p.amountINR, plan: p.plan, createdAt: p.createdAt,
    orgId: p.tenantId || p.orgId,
  }));

  res.json({ success: true, data: {
    totalRevenue, mrr, planRevenue, planDist, monthlyTrend, recent,
    totalPayments: payments.length,
    avgPayment: payments.length > 0 ? Math.round(totalRevenue / payments.length) : 0,
  }});
}));

// ── GET /api/platform/org-health ─────────────────────────────────────────────
router.get('/org-health', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const Tenant      = require('../models/Tenant');
  const User        = require('../models/User');
  const Job         = require('../models/Job');
  const Application = require('../models/Application');

  const orgs = await Tenant.find({}).select('name plan subscriptionStatus createdAt').lean();
  const DAY  = 86400000;
  const now  = Date.now();

  const healthData = await Promise.all(orgs.map(async org => {
    const tenantId = org._id;
    const [jobs, apps, recentLogin, recruiters] = await Promise.all([
      Job.countDocuments({ tenantId, status: 'active', deletedAt: null }),
      Application.countDocuments({ tenantId, deletedAt: null }),
      User.findOne({ tenantId, role: { $in: ['admin', 'recruiter'] } }).sort({ lastLogin: -1 }).select('lastLogin').lean(),
      User.countDocuments({ tenantId, role: 'recruiter', isActive: true }),
    ]);

    const daysSinceLogin = recentLogin?.lastLogin
      ? Math.floor((now - new Date(recentLogin.lastLogin).getTime()) / DAY)
      : 999;

    // Score: 0-100
    let score = 0;
    if (jobs > 0)       score += 30;
    if (jobs >= 3)      score += 10;
    if (apps > 0)       score += 20;
    if (apps >= 10)     score += 10;
    if (recruiters > 0) score += 15;
    if (daysSinceLogin <= 7)  score += 15;
    else if (daysSinceLogin <= 30) score += 5;

    const risk = score < 30 ? 'high' : score < 60 ? 'medium' : 'healthy';

    return { id: org._id, name: org.name, plan: org.plan || 'free',
      status: org.subscriptionStatus, activeJobs: jobs, totalApps: apps,
      recruiters, daysSinceLogin, score, risk };
  }));

  healthData.sort((a, b) => a.score - b.score); // worst first
  res.json({ success: true, data: healthData });
}));

// ── POST /api/platform/broadcast ─────────────────────────────────────────────
// Send in-platform notification + optional email to targeted users
router.post('/broadcast', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const User         = require('../models/User');
  const Notification = require('../models/Notification');
  const { sendEmailWithRetry } = require('../utils/email');

  const {
    subject, message,
    targetRoles  = ['admin'],          // 'all' or array of roles
    templateStyle = 'announcement',    // announcement|warning|celebration|update|info
    sendEmail    = true,
    expiresInDays = 7,
  } = req.body;

  if (!subject?.trim() || !message?.trim()) throw new AppError('subject and message are required.', 400);

  // Build user filter
  const roles = Array.isArray(targetRoles) ? targetRoles : [targetRoles];
  const roleFilter = roles.includes('all')
    ? { isActive: true, deletedAt: null }
    : { role: { $in: roles }, isActive: true, deletedAt: null };

  const targetUsers = await User.find(roleFilter).select('_id name email role tenantId').lean();
  if (!targetUsers.length) return res.json({ success: true, data: { total: 0, notificationsSent: 0, emailSent: 0 } });

  // Create in-platform Notification for every targeted user
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  const notifDocs = targetUsers.map(u => ({
    userId  : u._id,
    tenantId: u.tenantId || undefined,
    type    : 'system',
    title   : subject.trim(),
    message : message.trim(),
    link    : '/app/dashboard',
    read    : false,
    metadata: { isBroadcast: true, templateStyle, fromAdmin: req.user.name || 'Platform', expiresAt },
  }));

  await Notification.insertMany(notifDocs, { ordered: false }).catch(() => {});

  // Email to admins (optional)
  const STYLES = {
    announcement: { emoji: '📢', bg: 'linear-gradient(135deg,#032D60,#0176D3)', label: 'Platform Announcement' },
    warning      : { emoji: '⚠️',  bg: 'linear-gradient(135deg,#92400E,#B45309)', label: 'Important Notice'      },
    celebration  : { emoji: '🎉', bg: 'linear-gradient(135deg,#065F46,#059669)', label: 'Great News!'            },
    update       : { emoji: '🔄', bg: 'linear-gradient(135deg,#3730A3,#6D28D9)', label: 'Platform Update'        },
    info         : { emoji: 'ℹ️',  bg: 'linear-gradient(135deg,#0E7490,#0284C7)', label: 'Information'           },
  };
  const s = STYLES[templateStyle] || STYLES.announcement;

  let emailSent = 0, emailFailed = 0;
  if (sendEmail) {
    const emailRecipients = roles.includes('all')
      ? targetUsers.filter(u => ['admin','super_admin'].includes(u.role))
      : targetUsers.filter(u => ['admin','super_admin'].includes(u.role));

    const html = `
<div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
  <div style="background:${s.bg};padding:32px;border-radius:12px 12px 0 0">
    <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800">${s.emoji} ${s.label}</h1>
    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px">From TalentNest HR · ${new Date().toLocaleDateString()}</p>
  </div>
  <div style="padding:28px 32px;background:#F8FAFC;border-radius:0 0 12px 12px">
    <h2 style="margin:0 0 12px;font-size:16px;color:#0A1628">${subject.trim()}</h2>
    <div style="white-space:pre-wrap;font-size:14px;color:#374151;line-height:1.7">${message.trim()}</div>
    <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0" />
    <p style="color:#94A3B8;font-size:11px;margin:0">You can also view this announcement inside TalentNest HR after logging in.</p>
  </div>
</div>`;
    for (const u of emailRecipients) {
      try { await sendEmailWithRetry(u.email, subject.trim(), html); emailSent++; }
      catch { emailFailed++; }
    }
  }

  logger.audit('Broadcast sent', req.user._id, null, { subject, targetRoles: roles, templateStyle, total: targetUsers.length, emailSent });
  res.json({ success: true, data: { total: targetUsers.length, notificationsSent: notifDocs.length, emailSent, emailFailed, targetRoles: roles } });
}));

// ── GET /api/platform/interview-kits — all kits across all orgs (super_admin only) ─────
router.get('/interview-kits', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const InterviewKit = require('../models/InterviewKit');

  const kits = await InterviewKit.find({ deletedAt: null })
    .sort({ tenantId: 1, isDefault: -1, createdAt: -1 }).lean();

  // Fetch org names for all unique tenantIds
  const tenantIds = [...new Set(kits.map(k => k.tenantId?.toString()).filter(Boolean))];
  let orgMap = {};
  if (tenantIds.length) {
    const orgs = await Organization.find({ _id: { $in: tenantIds } }).select('name domain').lean();
    orgs.forEach(o => { orgMap[o._id.toString()] = { name: o.name, domain: o.domain }; });
  }

  const kitsWithOrg = kits.map(k => ({
    ...k,
    orgName  : orgMap[k.tenantId?.toString()]?.name   || 'Unknown Org',
    orgDomain: orgMap[k.tenantId?.toString()]?.domain || '',
  }));

  res.json({ success: true, data: kitsWithOrg });
}));

// ── GET /api/platform/broadcasts — unread broadcasts for current user ─────────
router.get('/broadcasts', auth, asyncHandler(async (req, res) => {
  const Notification = require('../models/Notification');
  const items = await Notification.find({
    userId  : req.user._id,
    type    : 'system',
    read    : false,
    'metadata.isBroadcast': true,
  }).sort({ createdAt: -1 }).limit(5).lean();
  res.json({ success: true, data: items });
}));

// ── GET /api/platform/system-health — real-time platform health ─────────────
router.get('/system-health', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  const os       = require('os');
  const start    = Date.now();

  // DB connectivity
  let dbStatus = 'ok', dbLatencyMs = 0;
  try {
    const dbStart = Date.now();
    await mongoose.connection.db.admin().ping();
    dbLatencyMs = Date.now() - dbStart;
  } catch { dbStatus = 'error'; }

  // Count some key collections for sanity
  let dbStats = {};
  try {
    const [orgs, users, jobs, apps] = await Promise.all([
      require('../models/Organization').countDocuments(),
      require('../models/User').countDocuments({ deletedAt: null }),
      require('../models/Job').countDocuments({ deletedAt: null }),
      require('../models/Application').countDocuments({ deletedAt: null }),
    ]);
    dbStats = { orgs, users, jobs, applications: apps };
  } catch {}

  // Memory
  const memTotal = os.totalmem();
  const memFree  = os.freemem();
  const memUsedPct = Math.round(((memTotal - memFree) / memTotal) * 100);

  // Process memory
  const procMem = process.memoryUsage();

  // Uptime
  const uptimeSecs = process.uptime();
  const uptimeStr  = (() => {
    const h = Math.floor(uptimeSecs / 3600);
    const m = Math.floor((uptimeSecs % 3600) / 60);
    const s = Math.floor(uptimeSecs % 60);
    return `${h}h ${m}m ${s}s`;
  })();

  // Environment checks
  const envChecks = {
    mongoUri       : !!process.env.MONGO_URI,
    jwtSecret      : !!process.env.JWT_SECRET,
    frontendUrl    : !!process.env.FRONTEND_URL,
    resendApiKey   : !!process.env.RESEND_API_KEY,
    vapidPublicKey : !!process.env.VAPID_PUBLIC_KEY,
    vapidPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
  };

  // Node version & environment
  const nodeVersion = process.version;
  const nodeEnv     = process.env.NODE_ENV || 'development';

  const responseTime = Date.now() - start;

  res.json({
    success: true,
    data: {
      timestamp  : new Date().toISOString(),
      status     : dbStatus === 'ok' ? 'healthy' : 'degraded',
      responseTime: `${responseTime}ms`,
      uptime     : uptimeStr,
      nodeVersion,
      nodeEnv,
      database: {
        status    : dbStatus,
        latencyMs : dbLatencyMs,
        readyState: mongoose.connection.readyState, // 1 = connected
        stats     : dbStats,
      },
      memory: {
        systemUsedPct: memUsedPct,
        systemTotalMB: Math.round(memTotal / 1024 / 1024),
        heapUsedMB   : Math.round(procMem.heapUsed / 1024 / 1024),
        heapTotalMB  : Math.round(procMem.heapTotal / 1024 / 1024),
        rssM         : Math.round(procMem.rss / 1024 / 1024),
      },
      envChecks,
      services: {
        email : envChecks.resendApiKey ? 'configured' : 'using_shared',
        push  : (envChecks.vapidPublicKey && envChecks.vapidPrivateKey) ? 'configured' : 'not_configured',
        database: dbStatus,
      },
    },
  });
}));

module.exports = router;
