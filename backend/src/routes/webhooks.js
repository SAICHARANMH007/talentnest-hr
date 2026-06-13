'use strict';
const express    = require('express');
const crypto     = require('crypto');
const { authenticate: authMiddleware } = require('../middleware/auth');
const { tenantGuard }  = require('../middleware/tenantGuard');
const { allowRoles }   = require('../middleware/rbac');
const asyncHandler     = require('../utils/asyncHandler');
const AppError         = require('../utils/AppError');
const Webhook          = require('../models/Webhook');
const { SUPPORTED_EVENTS } = require('../services/webhookService');

const router = express.Router();
const guard  = [authMiddleware, tenantGuard];

// GET /api/webhooks — list webhooks for org (super_admin sees all orgs, with org name attached)
router.get('/', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user?.role === 'super_admin';
  const filter = isSuperAdmin ? { deletedAt: null } : { tenantId: req.tenantId, deletedAt: null };
  let hooks = await Webhook.find(filter).sort({ createdAt: -1 }).lean();

  if (isSuperAdmin && hooks.length) {
    const Organization = require('../models/Organization');
    const orgIds = [...new Set(hooks.map(h => String(h.tenantId)))];
    const orgs = await Organization.find({ _id: { $in: orgIds } }).select('name').lean();
    const orgNameById = new Map(orgs.map(o => [String(o._id), o.name]));
    hooks = hooks.map(h => ({ ...h, orgName: orgNameById.get(String(h.tenantId)) || 'Unknown Organization' }));
  }

  res.json({ success: true, data: hooks, supportedEvents: SUPPORTED_EVENTS });
}));

// POST /api/webhooks — create
router.post('/', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const { name, url, events, secret } = req.body;
  if (!name?.trim()) throw new AppError('name is required.', 400);
  if (!url?.trim())  throw new AppError('url is required.', 400);

  // Basic URL validation
  try { new URL(url); } catch { throw new AppError('url must be a valid URL.', 400); }

  const invalidEvents = (events || []).filter(e => !SUPPORTED_EVENTS.includes(e));
  if (invalidEvents.length) throw new AppError(`Invalid events: ${invalidEvents.join(', ')}`, 400);

  const hook = await Webhook.create({
    tenantId: req.tenantId,
    name: name.trim(),
    url:  url.trim(),
    events: events || [],
    secret: secret?.trim() || '',
  });
  res.status(201).json({ success: true, data: hook });
}));

// GET /api/webhooks/events — return supported event list
router.get('/events', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  res.json({ success: true, data: SUPPORTED_EVENTS });
}));

// GET /api/webhooks/:id — single hook
router.get('/:id', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const hook = await Webhook.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null }).lean();
  if (!hook) throw new AppError('Webhook not found.', 404);
  res.json({ success: true, data: hook });
}));

// PUT /api/webhooks/:id — update
router.put('/:id', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const { name, url, events, secret, isActive } = req.body;
  const hook = await Webhook.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null });
  if (!hook) throw new AppError('Webhook not found.', 404);

  if (url) {
    try { new URL(url); } catch { throw new AppError('url must be a valid URL.', 400); }
  }
  if (events) {
    const bad = events.filter(e => !SUPPORTED_EVENTS.includes(e));
    if (bad.length) throw new AppError(`Invalid events: ${bad.join(', ')}`, 400);
  }

  if (name    !== undefined) hook.name     = name.trim();
  if (url     !== undefined) hook.url      = url.trim();
  if (events  !== undefined) hook.events   = events;
  if (secret  !== undefined) hook.secret   = secret.trim();
  if (isActive !== undefined) hook.isActive = Boolean(isActive);

  await hook.save();
  res.json({ success: true, data: hook });
}));

// DELETE /api/webhooks/:id — soft delete
router.delete('/:id', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const hook = await Webhook.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null });
  if (!hook) throw new AppError('Webhook not found.', 404);
  hook.deletedAt = new Date();
  await hook.save();
  res.json({ success: true });
}));

// POST /api/webhooks/:id/test — fire a test ping
router.post('/:id/test', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const hook = await Webhook.findOne({ _id: req.params.id, tenantId: req.tenantId, deletedAt: null }).lean();
  if (!hook) throw new AppError('Webhook not found.', 404);

  const testPayload = { event: 'test', payload: { message: 'TalentNest webhook test ping' }, timestamp: new Date().toISOString() };
  const body = JSON.stringify(testPayload);

  const headers = { 'Content-Type': 'application/json', 'X-TalentNest-Event': 'test', 'X-TalentNest-Delivery': crypto.randomBytes(8).toString('hex') };
  if (hook.secret) {
    headers['X-TalentNest-Signature'] = `sha256=${crypto.createHmac('sha256', hook.secret).update(body).digest('hex')}`;
  }

  let responseCode = 0, success = false, error = '';
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(hook.url, { method: 'POST', headers, body, signal: controller.signal });
    clearTimeout(timer);
    responseCode = r.status;
    success = r.status >= 200 && r.status < 300;
  } catch (err) {
    error = err.message;
  }

  const durationMs = Date.now() - start;
  const delivery = { event: 'test', sentAt: new Date(), responseCode, success, error, durationMs };

  await Webhook.findByIdAndUpdate(hook._id, {
    $set: { lastTriggeredAt: new Date() },
    $push: { recentDeliveries: { $each: [delivery], $slice: -20, $position: 0 } },
  });

  res.json({ success: true, data: { responseCode, success, error, durationMs } });
}));

// POST /api/webhooks/seed — admin: add a few sample webhooks so the page isn't empty
router.post('/seed', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  if (!tenantId) return res.json({ success: false, message: 'Not available for super_admin.' });

  const existing = await Webhook.countDocuments({ tenantId, deletedAt: null });
  if (existing >= 3) return res.json({ success: true, message: 'Webhooks already exist.', count: existing });

  const now = Date.now();
  const samples = [
    {
      tenantId,
      name: 'Slack — Hiring Alerts',
      url: 'https://hooks.slack.example.com/services/T00000000/B00000000/sample-token',
      events: ['application.created', 'application.hired', 'interview.scheduled'],
      secret: crypto.randomBytes(24).toString('hex'),
      isActive: true,
      lastTriggeredAt: new Date(now - 2 * 3600000),
      failureCount: 0,
      recentDeliveries: [
        { event: 'application.hired',     sentAt: new Date(now - 2 * 3600000),  responseCode: 200, success: true,  error: '', durationMs: 312 },
        { event: 'interview.scheduled',   sentAt: new Date(now - 6 * 3600000),  responseCode: 200, success: true,  error: '', durationMs: 248 },
        { event: 'application.created',   sentAt: new Date(now - 26 * 3600000), responseCode: 200, success: true,  error: '', durationMs: 401 },
      ],
    },
    {
      tenantId,
      name: 'Zapier — HR System Sync',
      url: 'https://hooks.zapier.com/hooks/catch/123456/abcdef/',
      events: ['offer.accepted', 'application.stage_changed'],
      secret: crypto.randomBytes(24).toString('hex'),
      isActive: true,
      lastTriggeredAt: new Date(now - 5 * 3600000),
      failureCount: 1,
      recentDeliveries: [
        { event: 'application.stage_changed', sentAt: new Date(now - 5 * 3600000),  responseCode: 200, success: true,  error: '', durationMs: 189 },
        { event: 'offer.accepted',            sentAt: new Date(now - 30 * 3600000), responseCode: 500, success: false, error: 'Internal Server Error', durationMs: 5021 },
        { event: 'application.stage_changed', sentAt: new Date(now - 48 * 3600000), responseCode: 200, success: true,  error: '', durationMs: 215 },
      ],
    },
    {
      tenantId,
      name: 'Internal Analytics Endpoint',
      url: 'https://api.example.com/webhooks/talentnest',
      events: ['job.created', 'job.closed', 'application.rejected'],
      secret: '',
      isActive: false,
      lastTriggeredAt: new Date(now - 4 * 24 * 3600000),
      failureCount: 3,
      recentDeliveries: [
        { event: 'job.closed',           sentAt: new Date(now - 4 * 24 * 3600000), responseCode: 0,   success: false, error: 'Connection timed out', durationMs: 8000 },
        { event: 'application.rejected', sentAt: new Date(now - 5 * 24 * 3600000), responseCode: 404, success: false, error: 'Not Found', durationMs: 152 },
        { event: 'job.created',          sentAt: new Date(now - 6 * 24 * 3600000), responseCode: 200, success: true,  error: '', durationMs: 233 },
      ],
    },
  ];

  const toCreate = samples.slice(0, Math.max(0, 3 - existing));
  const created = await Webhook.insertMany(toCreate);
  res.json({ success: true, message: `${created.length} sample webhooks added.`, count: created.length });
}));

module.exports = router;
