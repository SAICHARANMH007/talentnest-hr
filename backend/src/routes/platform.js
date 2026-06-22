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

// GET /api/platform/backup — paginated data export (super_admin only)
// ?since=YYYY-MM-DD  narrows to docs created after that date (recommended for large DBs)
// ?page=N            fetches page N of each collection (default: 1)
// ?limit=N           docs per collection per page (max 10 000, default 1 000)
router.get('/backup', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const { EXPORT_LIMIT, parsePage } = require('../utils/pagination');

  const User         = require('../models/User');
  const Job          = require('../models/Job');
  const Application  = require('../models/Application');
  const Organization = require('../models/Organization');

  // Build an optional date filter from ?since= query param
  const dateFilter = req.query.since ? { createdAt: { $gte: new Date(req.query.since) } } : {};

  // Honour pagination with a hard safety cap of EXPORT_LIMIT (10 000) per collection
  const { page, limit, skip } = parsePage(req.query, 1_000, EXPORT_LIMIT);

  const safeFetch = async (Model, extraFilter = {}, projection = null) => {
    const filter = { ...dateFilter, ...extraFilter };
    let q = Model.find(filter).sort({ _id: 1 }).skip(skip).limit(limit);
    if (projection) q = q.select(projection);
    const [docs, total] = await Promise.all([q.lean(), Model.countDocuments(filter)]);
    return { docs, total, truncated: total > skip + limit };
  };

  let leadRes = { docs: [], total: 0 }, assessRes = { docs: [], total: 0 };
  let logRes  = { docs: [], total: 0 }, notifRes  = { docs: [], total: 0 };

  try { const Lead        = require('../models/Lead');         leadRes   = await safeFetch(Lead); }         catch(e) {}
  try { const Assessment  = require('../models/Assessment');   assessRes = await safeFetch(Assessment); }   catch(e) {}
  try { const EmailLog    = require('../models/EmailLog');     logRes    = await safeFetch(EmailLog); }     catch(e) {}
  try { const Notification= require('../models/Notification'); notifRes  = await safeFetch(Notification); } catch(e) {}

  const userRes = await safeFetch(User, {}, '-passwordHash -resetPasswordToken -resetPasswordExpires -twoFactorSecret -refreshTokens');
  const jobRes  = await safeFetch(Job);
  const appRes  = await safeFetch(Application);
  const orgRes  = await safeFetch(Organization, { slug: { $ne: '__platform__' } });

  const truncated = [userRes, jobRes, appRes, orgRes, leadRes, assessRes, logRes, notifRes].some(r => r.truncated);

  const backup = {
    exportedAt: new Date().toISOString(),
    exportedBy: req.user.email || req.user._id,
    version: '2.1 (Paginated)',
    pagination: { page, limit, note: truncated ? 'Results truncated — use ?page=N to retrieve more' : 'All results fit in this page' },
    data: {
      users:         userRes.docs,
      jobs:          jobRes.docs,
      applications:  appRes.docs,
      orgs:          orgRes.docs,
      leads:         leadRes.docs,
      assessments:   assessRes.docs,
      emailLogs:     logRes.docs,
      notifications: notifRes.docs,
    },
    counts: {
      users: userRes.total, jobs: jobRes.total, applications: appRes.total,
      orgs: orgRes.total, leads: leadRes.total, assessments: assessRes.total,
      emailLogs: logRes.total, notifications: notifRes.total,
    },
  };

  const filename = `talentnest-backup-${new Date().toISOString().split('T')[0]}-p${page}.json`;
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
// Uses MongoDB aggregation for totals; loads at most EXPORT_LIMIT records for
// in-memory trend/plan breakdowns so a large payment history cannot OOM the server.
router.get('/revenue', auth, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const { EXPORT_LIMIT } = require('../utils/pagination');
  const PaymentRecord = require('../models/PaymentRecord');
  const Tenant        = require('../models/Tenant');

  // Aggregate totals + plan breakdown in the DB — no full load required
  const [aggResult, tenants, recent] = await Promise.all([
    PaymentRecord.aggregate([
      { $match: { status: 'captured' } },
      { $group: {
        _id:          '$plan',
        totalRevenue: { $sum: '$amountINR' },
        count:        { $sum: 1 },
      }},
    ]),
    Tenant.find({}).select('name plan subscriptionStatus createdAt').limit(EXPORT_LIMIT).lean(),
    PaymentRecord.find({ status: 'captured' }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const totalRevenue = aggResult.reduce((s, r) => s + r.totalRevenue, 0);
  const totalPayments = aggResult.reduce((s, r) => s + r.count, 0);
  const planRevenue = Object.fromEntries(aggResult.map(r => [r._id || 'unknown', r.totalRevenue]));

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const planDist = {};
  tenants.forEach(t => { planDist[t.plan || 'free'] = (planDist[t.plan || 'free'] || 0) + 1; });

  // Monthly trend — aggregate per calendar month for the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const trendAgg = await PaymentRecord.aggregate([
    { $match: { status: 'captured', createdAt: { $gte: sixMonthsAgo } } },
    { $group: {
      _id:   { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
      value: { $sum: '$amountINR' },
    }},
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  const trendMap = new Map(trendAgg.map(r => [`${r._id.year}-${r._id.month}`, r.value]));
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const key   = `${d.getFullYear()}-${d.getMonth() + 1}`;
    monthlyTrend.push({ label, value: trendMap.get(key) || 0 });
  }

  // MRR = this month's captured payments (from aggregate)
  const mrr = trendAgg.find(r => {
    const now = new Date();
    return r._id.year === now.getFullYear() && r._id.month === now.getMonth() + 1;
  })?.value || 0;

  const recentMapped = recent.map(p => ({
    id: p._id, amount: p.amountINR, plan: p.plan, createdAt: p.createdAt,
    orgId: p.tenantId || p.orgId,
  }));

  res.json({ success: true, data: {
    totalRevenue, mrr, planRevenue, planDist, monthlyTrend,
    recent: recentMapped,
    totalPayments,
    avgPayment: totalPayments > 0 ? Math.round(totalRevenue / totalPayments) : 0,
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
