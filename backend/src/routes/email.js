'use strict';
const express          = require('express');
const rateLimit        = require('express-rate-limit');
const nodemailer       = require('nodemailer');
const { authenticate: authMiddleware } = require('../middleware/auth');
const { allowRoles } = require('../middleware/rbac');
const Notification     = require('../models/Notification');
const EmailLog         = require('../models/EmailLog');

const router = express.Router();

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many emails sent. Please wait 15 minutes.' },
});

const FROM_EMAIL = process.env.RESEND_FROM || process.env.ZOHO_EMAIL || 'hr@talentnesthr.com';

// Send via Resend REST API (HTTPS — works on Railway, no SMTP ports needed)
async function sendViaResend(to, subject, html, apiKey, fromEmail) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `TalentNest HR <${fromEmail}>`, to: Array.isArray(to) ? to : [to], subject, html }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || JSON.stringify(d));
  return { id: d.id };
}

/**
 * Send email — tries Resend first (cloud-safe), falls back to SMTP for local dev.
 */
async function sendEmail(to, subject, body) {
  if (process.env.RESEND_API_KEY) {
    const result = await sendViaResend(to, subject, body, process.env.RESEND_API_KEY, FROM_EMAIL);
    return { id: result.id, message: 'Email sent via Resend' };
  }
  if (process.env.ZOHO_EMAIL && process.env.ZOHO_PASSWORD) {
    const transporter = nodemailer.createTransport({
      host: 'smtppro.zoho.in', port: 587, secure: false,
      auth: { user: process.env.ZOHO_EMAIL, pass: process.env.ZOHO_PASSWORD },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 8000,
    });
    const result = await transporter.sendMail({ from: `TalentNest HR <${FROM_EMAIL}>`, to, subject, html: body });
    return { id: result.messageId, message: 'Email sent via Zoho' };
  }
  console.log(`[Email DEV] To: ${to} | Subject: ${subject}`);
  return { id: 'dev-mode', message: 'Email logged to console (no credentials set)' };
}

/**
 * Create an in-app notification for a user.
 * Exported so other routes can use it.
 */
async function createNotification(userId, orgId, type, title, body, link) {
  try {
    return await Notification.create({ userId, orgId: orgId || null, type, title, body, link: link || null, read: false });
  } catch (e) {
    console.error('[Notification] Failed to create notification:', e.message);
    return null;
  }
}

// POST /api/email/test-smtp — test Resend API key or SMTP credentials
router.post('/test-smtp', authMiddleware, emailLimiter, async (req, res) => {
  try {
    const { host, port, user, pass, provider, apiKey } = req.body;

    // ── Resend API test ───────────────────────────────────────────────────────
    if (provider === 'resend' || apiKey) {
      // Fall back to system RESEND_API_KEY if no per-user key provided
      const resolvedKey = apiKey || process.env.RESEND_API_KEY;
      if (!resolvedKey) return res.status(400).json({ success: false, error: 'No Resend API key configured. Add RESEND_API_KEY to server env or enter your own key.' });
      const fromEmail = user || FROM_EMAIL;
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resolvedKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `TalentNest HR <${fromEmail}>`,
          to: [fromEmail],
          subject: 'TalentNest HR — Email Connection Test',
          html: '<p>Your Resend connection is working! Invite emails will now send reliably.</p>',
        }),
      });
      const d = await r.json();
      if (!r.ok) return res.status(400).json({ success: false, error: d.message || JSON.stringify(d) });
      return res.json({ success: true, message: 'Test email sent via Resend!' });
    }

    // ── SMTP test ─────────────────────────────────────────────────────────────
    if (!host || !port || !user || !pass)
      return res.status(400).json({ success: false, error: 'host, port, user, and pass are required.' });
    const transporter = nodemailer.createTransport({
      host, port: Number(port), secure: Number(port) === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 8000,
    });
    await transporter.sendMail({
      from: `"TalentNest HR" <${user}>`, to: user,
      subject: 'TalentNest HR — Email Connection Test',
      html: '<p>Your email connection is working correctly!</p>',
    });
    res.json({ success: true, message: 'Test email sent successfully.' });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// POST /api/email/send
router.post('/send', authMiddleware, emailLimiter, async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    if (!to || !subject) return res.status(400).json({ success: false, error: 'to and subject are required.' });
    const result = await sendEmail(to, subject, body || '');
    try {
      EmailLog.create({ to, subject, body: body || '', status: 'sent', provider: process.env.RESEND_API_KEY ? 'resend' : 'smtp', sentBy: req.user?.id || 'system', retryCount: 0 }).catch(() => {});
    } catch {}
    res.json({ success: true, ...result });
  } catch (e) {
    try { EmailLog.create({ to: req.body.to, subject: req.body.subject, body: req.body.body || '', status: 'failed', error: e.message, provider: process.env.RESEND_API_KEY ? 'resend' : 'smtp', sentBy: req.user?.id || 'system', retryCount: 0 }).catch(() => {}); } catch {}
    res.status(500).json({ success: false, error: e.message });
  }
});

const resendLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { error: 'Too many resend attempts. Try again in a minute.' } });

// GET /api/email/logs — list email logs (admin/super_admin/recruiter)
router.get('/logs', authMiddleware, allowRoles('admin', 'super_admin', 'recruiter'), async (req, res) => {
  try {
    const { status, search } = req.query;
    let logs = await EmailLog.find({});
    if (status && status !== 'all') logs = logs.filter(l => l.status === status);
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(l =>
        (l.to      || '').toLowerCase().includes(q) ||
        (l.subject || '').toLowerCase().includes(q) ||
        (l.error   || '').toLowerCase().includes(q)
      );
    }
    // Recruiters only see their own sends
    if (req.user.role === 'recruiter') logs = logs.filter(l => l.sentBy === String(req.user.id));
    logs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    res.json(logs.slice(0, 500));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/email/logs/:id/resend — retry a failed email
router.post('/logs/:id/resend', authMiddleware, allowRoles('admin', 'super_admin', 'recruiter'), resendLimiter, async (req, res) => {
  try {
    const log = await EmailLog.findById(req.params.id);
    if (!log) return res.status(404).json({ error: 'Log entry not found.' });
    if (!log.body) return res.status(400).json({ error: 'No stored email body — cannot resend.' });
    await sendEmail(log.to, log.subject, log.body);
    await EmailLog.findByIdAndUpdate(log.id, { status: 'sent', error: null, retryCount: (log.retryCount || 0) + 1 });
    res.json({ success: true, message: `Email resent to ${log.to}` });
  } catch (e) {
    try { const l = await EmailLog.findById(req.params.id); await EmailLog.findByIdAndUpdate(req.params.id, { retryCount: (l?.retryCount || 0) + 1, error: e.message }); } catch {}
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
module.exports.sendEmail          = sendEmail;
module.exports.createNotification = createNotification;
