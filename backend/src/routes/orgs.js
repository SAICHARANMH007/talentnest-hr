'use strict';
const express     = require('express');
const Organization = require('../models/Organization');
const User        = require('../models/User');
const { authenticate: auth } = require('../middleware/auth');
const { allowRoles } = require('../middleware/rbac');
const { safeError }         = require('../middleware/safeError');
const normalize             = require('../utils/normalize');
const logger                = require('../middleware/logger');
const Org = Organization; // Alias for cleaner code
const router      = express.Router();

// GET /api/orgs — super_admin gets all, admin gets own org
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role === 'super_admin') {
      const orgs = await Org.find({ slug: { $ne: '__platform__' } }).sort({ createdAt: -1 });
      const enriched = await Promise.all((Array.isArray(orgs) ? orgs : []).map(async (org) => {
        // Count both Users and Candidates assigned to this organization (standardized on tenantId)
        // Highly resilient query (checks both tenantId and legacy orgId to ensure accurate headcount)
        const userCount = await User.countDocuments({ 
          $or: [
            { tenantId: org._id },
            { orgId: String(org._id) },
            { orgId: org._id }
          ]
        });
        return { ...normalize(org), userCount };
      }));
      return res.json(enriched);
    }
    if (req.user.role === 'admin') {
      // Prefer orgId from JWT (fast); fall back to DB lookup
      const orgId = req.user.orgId || (() => {
        return null; // will be resolved below if null
      })();
      if (orgId) {
        const org = await Organization.findById(orgId);
        return res.json(org ? [normalize(org)] : []);
      }
      // orgId not in JWT — look it up from the user document
      const user = await User.findById(req.user.id);
      const u = user ? (user.toJSON ? user.toJSON() : user) : {};
      if (!u.orgId) return res.json([]);
      const org = await Organization.findById(u.orgId);
      return res.json(org ? [normalize(org)] : []);
    }
    return res.status(403).json({ error: 'Access denied' });
  } catch (e) { res.status(500).json({ error: safeError(e) }); }
});

// POST /api/orgs — super_admin creates org
router.post('/', auth, allowRoles('super_admin'), async (req, res) => {
  try {
    const { name, domain, industry, size, plan = 'trial' } = req.body;
    if (!name) return res.status(400).json({ error: 'Organisation name is required.' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const org = await Organization.create({
      name, slug, domain: domain || '', industry: industry || '',
      size: size || '1-10', plan: plan || 'trial',
      status: 'trial', trialEndsAt,
      settings: {
        pipelineStages: ['applied','screening','shortlisted','interview_scheduled','interview_completed','offer_extended','selected','rejected'],
        brandColor: '#06b6d4',
      },
      createdBy: req.user.id,
    });
    
    logger.audit('Organization created', req.user.id, org._id, { name: org.name, slug: org.slug, plan: org.plan });
    res.json(normalize(org));
  } catch (e) { res.status(500).json({ error: safeError(e) }); }
});

// GET /api/orgs/logo/public — no-auth endpoint for marketing site (returns TalentNest org logo)
router.get('/logo/public', async (req, res) => {
  try {
    const org = await Organization.findOne({ name: 'TalentNest HR' }).select('logoUrl').lean()
      || await Organization.findOne({}).select('logoUrl').lean();
    res.json({ success: true, logoUrl: org?.logoUrl || null });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/orgs/logo/image — serves the logo as actual image bytes (used in email templates)
router.get('/logo/image', async (req, res) => {
  try {
    const org = await Organization.findOne({ name: 'TalentNest HR' }).select('logoUrl').lean()
      || await Organization.findOne({}).select('logoUrl').lean();
    const logoUrl = org?.logoUrl;
    if (!logoUrl || !logoUrl.startsWith('data:')) {
      return res.status(404).send('No logo');
    }
    const [header, base64Data] = logoUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const buffer = Buffer.from(base64Data, 'base64');
    res.set('Content-Type', mime);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  } catch (e) { res.status(500).send('Error'); }
});

// GET /api/orgs/:orgId/logo/image — serves a specific org logo as image bytes
router.get('/:orgId/logo/image', async (req, res) => {
  try {
    const org = await Organization.findById(req.params.orgId).select('logoUrl').lean();
    const logoUrl = org?.logoUrl;
    if (!logoUrl || !logoUrl.startsWith('data:')) {
      return res.status(404).send('No logo');
    }
    const [header, base64Data] = logoUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const buffer = Buffer.from(base64Data, 'base64');
    res.set('Content-Type', mime);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  } catch (e) { res.status(500).send('Error'); }
});

// GET /api/orgs/logo — get current org's logo
router.get('/logo', auth, async (req, res) => {
  try {
    const org = await Organization.findById(req.user.orgId).select('logoUrl name').lean();
    res.json({ success: true, logoUrl: org?.logoUrl || null, orgName: org?.name || 'TalentNest HR' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/orgs/logo/upload — upload new logo (admin/super_admin)
router.post('/logo/upload', auth, allowRoles('admin', 'super_admin'), async (req, res) => {
  try {
    const { logoUrl } = req.body; // base64 data URL sent from frontend
    if (!logoUrl) return res.status(400).json({ success: false, error: 'logoUrl required' });
    if (logoUrl.length > 3 * 1024 * 1024) return res.status(400).json({ success: false, error: 'Logo too large (max 2MB)' });
    await Organization.findByIdAndUpdate(req.user.orgId, { logoUrl, logoUpdatedAt: new Date() });
    res.json({ success: true, logoUrl });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE /api/orgs/logo — reset to default logo (admin/super_admin)
router.delete('/logo', auth, allowRoles('admin', 'super_admin'), async (req, res) => {
  try {
    await Organization.findByIdAndUpdate(req.user.orgId, { logoUrl: null });
    res.json({ success: true, message: 'Logo reset to default' });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/orgs/logo/download — download default SVG logo
router.get('/logo/download', (req, res) => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="240" height="60" viewBox="0 0 240 60" xmlns="http://www.w3.org/2000/svg" fill="none">
  <polygon points="30,4 50,16 50,40 30,52 10,40 10,16" fill="#1B4FD8" opacity="0.15"/>
  <polygon points="30,4 50,16 50,40 30,52 10,40 10,16" stroke="#1B4FD8" stroke-width="2"/>
  <circle cx="30" cy="28" r="5.5" fill="#1B4FD8"/>
  <circle cx="30" cy="7"  r="3.2" fill="#1B4FD8" opacity="0.9"/>
  <circle cx="47" cy="17" r="3.2" fill="#1B4FD8" opacity="0.9"/>
  <circle cx="47" cy="39" r="3.2" fill="#1B4FD8" opacity="0.9"/>
  <circle cx="30" cy="49" r="3.2" fill="#1B4FD8" opacity="0.9"/>
  <circle cx="13" cy="39" r="3.2" fill="#1B4FD8" opacity="0.9"/>
  <circle cx="13" cy="17" r="3.2" fill="#1B4FD8" opacity="0.9"/>
  <line x1="30" y1="23" x2="30" y2="9" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
  <path d="M27 14 L30 8 L33 14" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="66" y="33" font-family="Arial,sans-serif" font-size="22" font-weight="800" fill="#0F2B6B" letter-spacing="-1">TalentNest</text>
  <text x="68" y="49" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#1B4FD8" letter-spacing="5">HR</text>
</svg>`;
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Content-Disposition', 'attachment; filename="talentnesthr-logo.svg"');
  res.send(svg);
});

// GET /api/orgs/brand/:slug — public brand info for career pages (MUST be before /:id)
router.get('/brand/:slug', async (req, res) => {
  try {
    const org = await Organization.findOne({ slug: req.params.slug })
      .select('name logoUrl brandColor industry website').lean();
    if (!org) return res.status(404).json({ success: false, error: 'Company not found' });
    res.json({ success: true, data: org });
  } catch (e) { res.status(500).json({ success: false, error: 'Server error' }); }
});

// GET /api/orgs/:id — own admin or super_admin
router.get('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin' && String(req.user.orgId) !== String(req.params.id))
      return res.status(403).json({ error: 'Access denied.' });
    if (!['admin','super_admin'].includes(req.user.role))
      return res.status(403).json({ error: 'Access denied.' });
    const org = await Org.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organisation not found.' });
    res.json(normalize(org));
  } catch (e) { res.status(500).json({ error: safeError(e) }); }
});

// PATCH /api/orgs/:id — super_admin or the org's own admin
router.patch('/:id', auth, async (req, res) => {
  try {
    // Only super_admin can change plan/status; admin can only update their own org's name/settings
    if (req.user.role === 'admin') {
      if (String(req.user.orgId) !== String(req.params.id))
        return res.status(403).json({ error: 'You can only update your own organisation.' });
    } else if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Admins cannot change plan or status — only super_admin can change billing/permissions
    const allowed = req.user.role === 'super_admin'
      ? ['name','domain','logo','industry','size','status','settings','plan','trialEndsAt']
      : ['name','domain','logo','industry','size','settings'];

    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'No valid fields.' });

    // Deep-merge settings so partial updates (e.g. featureFlags only) don't wipe other settings fields
    if (updates.settings) {
      const existing = await Org.findById(req.params.id);
      if (existing) {
        const existingData = existing.toJSON ? existing.toJSON() : existing;
        updates.settings = { ...(existingData.settings || {}), ...updates.settings };
      }
    }

    const org = await Org.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!org) return res.status(404).json({ error: 'Organisation not found.' });

    logger.audit('Organization updated', req.user.id, org._id, { updates: Object.keys(updates) });
    res.json(normalize(org));
  } catch (e) { res.status(500).json({ error: safeError(e) }); }
});

// PATCH /api/orgs/:id/plan — super_admin updates org plan + limits
router.patch('/:id/plan', auth, allowRoles('super_admin'), async (req, res) => {
  try {
    const { plan, status, maxCandidates, maxJobs, maxRecruiters, maxAdmins, features, dataVisibility, candidateExportEnabled, aiScoringEnabled, trialEndsAt } = req.body;
    const org = await Org.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organisation not found.' });
    const existing = org.toJSON ? org.toJSON() : org;
    const currentSettings = existing.settings || {};

    const planDefaults = {
      free:       { maxCandidates: 100,   maxJobs: 5,   maxRecruiters: 1, maxAdmins: 1, features: ['jobs','candidates','pipeline'], dataVisibility: 'own', candidateExportEnabled: false, aiScoringEnabled: false },
      starter:    { maxCandidates: 500,   maxJobs: 20,  maxRecruiters: 3, maxAdmins: 1, features: ['jobs','candidates','pipeline','ai_match','reports'], dataVisibility: 'own', candidateExportEnabled: true, aiScoringEnabled: true },
      growth:     { maxCandidates: 2000,  maxJobs: 100, maxRecruiters: 10, maxAdmins: 3, features: ['jobs','candidates','pipeline','ai_match','bulk_import','reports','assessments'], dataVisibility: 'org', candidateExportEnabled: true, aiScoringEnabled: true },
      enterprise: { maxCandidates: 99999, maxJobs: 999, maxRecruiters: 99, maxAdmins: 10, features: ['jobs','candidates','pipeline','ai_match','bulk_import','reports','assessments','api_access'], dataVisibility: 'org', candidateExportEnabled: true, aiScoringEnabled: true },
      trial:      { maxCandidates: 200,   maxJobs: 10,  maxRecruiters: 2, maxAdmins: 1, features: ['jobs','candidates','pipeline','ai_match'], dataVisibility: 'own', candidateExportEnabled: false, aiScoringEnabled: true },
    };

    const base = plan && planDefaults[plan] ? planDefaults[plan] : {};
    const newSettings = {
      ...currentSettings,
      ...base,
      // Allow per-org overrides on top of plan defaults
      ...(maxCandidates !== undefined && { maxCandidates }),
      ...(maxJobs !== undefined && { maxJobs }),
      ...(maxRecruiters !== undefined && { maxRecruiters }),
      ...(maxAdmins !== undefined && { maxAdmins }),
      ...(features !== undefined && { features }),
      ...(dataVisibility !== undefined && { dataVisibility }),
      ...(candidateExportEnabled !== undefined && { candidateExportEnabled }),
      ...(aiScoringEnabled !== undefined && { aiScoringEnabled }),
    };

    const updates = { settings: newSettings };
    if (plan) updates.plan = plan;
    if (status) updates.status = status;
    if (trialEndsAt) updates.trialEndsAt = trialEndsAt;

    const updated = await Org.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    
    logger.audit('Organization plan updated', req.user.id, updated._id, { plan: updates.plan, status: updates.status });
    res.json(normalize(updated));
  } catch (e) { res.status(500).json({ error: safeError(e) }); }
});

// POST /api/orgs/:id/invite-admin — super_admin invites admin to org (secure token flow)
router.post('/:id/invite-admin', auth, allowRoles('super_admin'), async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email)
      return res.status(400).json({ error: 'Name and email are required.' });
    const org = await Org.findById(req.params.id);
    if (!org) return res.status(404).json({ error: 'Organisation not found.' });
    const orgData = org.toJSON ? org.toJSON() : org;
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(400).json({ error: 'Email already registered.' });

    const crypto = require('crypto');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashed   = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires  = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      name: name.trim(), email: email.toLowerCase().trim(),
      role: 'admin', orgId: orgData.id, orgName: orgData.name,
      isActive: false,
      resetPasswordToken: hashed, resetPasswordExpires: expires,
    });
    const u = user.toJSON ? user.toJSON() : { ...user };
    delete u.password;

    const link = `${process.env.FRONTEND_URL || 'https://www.talentnesthr.com'}/set-password?token=${rawToken}&email=${email.toLowerCase().trim()}`;
    try {
      const { sendEmailWithRetry, templates } = require('../utils/email');
      const tpl = templates.invite(name.trim(), 'admin', orgData.name, link, 'TalentNest Admin', { orgId: orgData._id?.toString(), orgName: orgData.name });
      await sendEmailWithRetry(email.toLowerCase().trim(), tpl.subject, tpl.html);
    } catch (mailErr) { console.error('[invite-admin email failed]', mailErr.message); }

    res.json({ ...u, message: 'Invitation email sent. Admin must set their password via the link.' });
  } catch (e) { res.status(500).json({ error: safeError(e) }); }
});

// DELETE /api/orgs/:id — super_admin only; warns if org has active data
router.delete('/:id', auth, allowRoles('super_admin'), async (req, res) => {
  try {
    const userCount = await User.countDocuments({ orgId: req.params.id });
    const Job = require('../models/Job');
    const jobCount = await Job.countDocuments({ orgId: req.params.id });
    if (userCount > 0 || jobCount > 0) {
      return res.status(400).json({
        error: `Cannot delete: org has ${userCount} user(s) and ${jobCount} job(s). Reassign or archive them first.`,
        userCount, jobCount,
      });
    }
    await Org.findByIdAndDelete(req.params.id);
    logger.audit('Organization deleted', req.user.id, req.params.id, { orgId: req.params.id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: safeError(e) }); }
});

module.exports = router;
