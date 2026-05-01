'use strict';
const express      = require('express');
const { randomUUID } = require('crypto');
const jwt          = require('jsonwebtoken');
const nodemailer   = require('nodemailer');
const router = express.Router();
const Invite      = require('../models/Invite');
const User        = require('../models/User');
const Job         = require('../models/Job');
const Application = require('../models/Application');
const EmailLog    = require('../models/EmailLog');

const JWT_SECRET = process.env.JWT_SECRET || 'talent_nest_dev_secret_key_2024_do_not_use_in_prod';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
const BACKEND_URL  = process.env.BACKEND_URL  || 'https://api.talentnesthr.com';

const { authenticate: auth } = require('../middleware/auth');
const { allowRoles } = require('../middleware/rbac');

// ── Email sender ──────────────────────────────────────────────────────────────
// Returns a descriptor object; actual sending handled in sendInviteEmail()
function buildSender(senderConfig) {
  // Per-user Resend API key
  if (senderConfig?.provider === 'resend' && senderConfig?.apiKey)
    return { type: 'resend', apiKey: senderConfig.apiKey, fromEmail: senderConfig.user };
  // System Resend API key (Railway-safe — HTTPS, no blocked ports)
  if (process.env.RESEND_API_KEY)
    return { type: 'resend', apiKey: process.env.RESEND_API_KEY, fromEmail: process.env.RESEND_FROM || process.env.ZOHO_EMAIL || 'hr@talentnesthr.com' };
  // Per-user SMTP (local dev only — SMTP ports blocked on Railway)
  if (senderConfig?.host && senderConfig?.user && senderConfig?.pass)
    return { type: 'smtp', config: senderConfig };
  // System Zoho SMTP (local dev fallback)
  if (process.env.ZOHO_EMAIL && process.env.ZOHO_PASSWORD)
    return { type: 'smtp', config: { host: 'smtppro.zoho.in', port: 587, secure: false, user: process.env.ZOHO_EMAIL, pass: process.env.ZOHO_PASSWORD } };
  return null;
}

async function sendInviteEmail(sender, to, from, subject, html) {
  if (!sender) { console.log(`📧 [DEV] To: ${to} Subject: ${subject}`); return; }
  if (sender.type === 'resend') {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${sender.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || JSON.stringify(d));
  } else {
    const transport = nodemailer.createTransport({
      host: sender.config.host, port: Number(sender.config.port) || 587,
      secure: Number(sender.config.port) === 465,
      auth: { user: sender.config.user, pass: sender.config.pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 8000,
    });
    await transport.sendMail({ from, to, subject, html });
  }
}

// ── Invite email HTML template ────────────────────────────────────────────────
function buildInviteHtml({ candidate, job, message, token, fromName, fromOrg }) {
  const acceptUrl  = `${FRONTEND_URL}/invite/${token}?response=interested`;
  const declineUrl = `${FRONTEND_URL}/invite/${token}?response=declined`;
  const viewUrl    = `${FRONTEND_URL}/invite/${token}`;
  const pixelUrl   = `${BACKEND_URL}/api/invites/${token}/open`;
  const skills     = (Array.isArray(job.skills) ? job.skills : (job.skills || '').split(',')).map(s => String(s).trim()).filter(Boolean).slice(0, 6);

  // Replace [tokens] in the message body with actual values
  const resolvedMessage = (message || '')
    .replace(/\[name\]/gi,    candidate.name    || 'there')
    .replace(/\[title\]/gi,   job.title         || 'this role')
    .replace(/\[company\]/gi, job.company       || 'our client')
    .replace(/\[sender\]/gi,  fromName          || 'TalentNest HR')
    .replace(/\[location\]/gi, job.location     || '')
    .replace(/\[skills\]/gi,  skills.join(', ') || '');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Job Invitation from TalentNest HR</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:'Segoe UI',Arial,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#032D60 0%,#0176D3 100%);padding:32px 40px;text-align:center">
    <div style="font-size:36px;margin-bottom:8px">🪺</div>
    <div style="color:#fff;font-size:22px;font-weight:800">TalentNest HR</div>
    <div style="color:rgba(255,255,255,0.65);font-size:11px;margin-top:4px;letter-spacing:1.5px">EXCLUSIVE OPPORTUNITY INVITE</div>
  </div>

  <!-- Body -->
  <div style="padding:36px 40px 0">
    <h2 style="color:#032D60;font-size:22px;margin:0 0 18px;font-weight:800">Hi ${candidate.name || 'there'} 👋</h2>
    ${resolvedMessage ? `<div style="background:#f0f7ff;border-left:4px solid #0176D3;border-radius:6px;padding:16px 20px;margin-bottom:22px">
      <p style="color:#1e40af;font-size:13px;line-height:1.7;margin:0;white-space:pre-line">${resolvedMessage}</p>
      <div style="color:#6b7280;font-size:11px;margin-top:10px">— ${fromName}${fromOrg ? `, ${fromOrg}` : ''}</div>
    </div>` : `<p style="color:#374151;font-size:14px;line-height:1.75;margin:0 0 18px">
      <strong>${fromName}</strong>${fromOrg ? ` from <strong>${fromOrg}</strong>` : ''} has personally selected you for an exciting opportunity.
    </p>`}
  </div>

  <!-- Job Card -->
  <div style="margin:0 40px 28px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
    <div style="background:#0176D3;padding:20px 24px">
      <div style="color:#fff;font-size:20px;font-weight:800;margin-bottom:4px">${job.title}</div>
      <div style="color:rgba(255,255,255,0.8);font-size:13px">${job.company || 'Our Client'}</div>
    </div>
    <div style="padding:22px 24px;background:#f8fafc">
      <div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:16px">
        ${job.location ? `<span style="color:#374151;font-size:13px">📍 ${job.location}</span>` : ''}
        ${job.salary  ? `<span style="color:#374151;font-size:13px">💰 ${job.salary}</span>`  : ''}
        ${job.type    ? `<span style="color:#374151;font-size:13px">⏱ ${job.type}</span>`    : ''}
        ${job.experience ? `<span style="color:#374151;font-size:13px">🎓 ${job.experience} yrs</span>` : ''}
      </div>
      ${job.description ? `<p style="color:#374151;font-size:13px;line-height:1.65;margin:0 0 16px">${(job.description||'').slice(0,320)}${(job.description||'').length>320?'…':''}</p>` : ''}
      ${skills.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px">
        ${skills.map(s=>`<span style="background:#dbeafe;color:#1d4ed8;padding:4px 11px;border-radius:20px;font-size:11px;font-weight:600">${s}</span>`).join('')}
      </div>` : ''}
    </div>
  </div>

  <!-- CTA -->
  <div style="padding:0 40px 36px;text-align:center">
    <p style="color:#374151;font-size:14px;margin:0 0 22px">Are you interested in this opportunity?</p>
    <a href="${acceptUrl}" style="display:inline-block;background:linear-gradient(135deg,#0176D3,#0154A4);color:#fff;text-decoration:none;padding:15px 40px;border-radius:50px;font-size:15px;font-weight:700;box-shadow:0 4px 14px rgba(1,118,211,0.35);margin-bottom:14px">
      ✅ Yes, I'm Interested!
    </a>
    <br>
    <a href="${declineUrl}" style="color:#9ca3af;font-size:12px;text-decoration:none;padding:8px 20px;display:inline-block">Not looking right now →</a>
    <br><br>
    <a href="${viewUrl}" style="color:#0176D3;font-size:12px;text-decoration:underline">View full job details</a>
  </div>

  <!-- Tracking pixel -->
  <img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">

  <!-- Footer -->
  <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center">
    <p style="color:#9ca3af;font-size:11px;line-height:1.6;margin:0">
      You received this invitation because your profile matched this role.<br>
      <a href="mailto:hr@talentnesthr.com" style="color:#0176D3">hr@talentnesthr.com</a>
      &nbsp;·&nbsp;
      <a href="https://www.talentnesthr.com" style="color:#0176D3">talentnesthr.com</a>
    </p>
  </div>
</div>
</body></html>`;
}

// ── POST /api/invites ─── send invites to candidates ─────────────────────────
router.post('/', auth, allowRoles('admin', 'super_admin', 'recruiter'), async (req, res) => {
  try {
    const { candidateIds, jobId, message } = req.body;
    if (!Array.isArray(candidateIds) || !candidateIds.length || !jobId)
      return res.status(400).json({ error: 'candidateIds (array) and jobId required.' });

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    const j = job.toJSON ? job.toJSON() : job;

    const senderUser = await User.findById(req.user.id);
    const s          = senderUser ? (senderUser.toJSON ? senderUser.toJSON() : senderUser) : {};
    const senderCfg  = s.emailConfig || null;
    const fromName   = senderCfg?.name || s.name  || 'TalentNest HR';
    const fromOrg    = s.orgName || '';
    const fromEmail  = senderCfg?.user || process.env.RESEND_FROM || process.env.ZOHO_EMAIL || 'hr@talentnesthr.com';

    const sender = buildSender(senderCfg);

    const results = [];
    for (const rawId of candidateIds) {
      const cid = String(rawId);
      const candidate = await User.findById(cid);
      if (!candidate) continue;
      const c = candidate.toJSON ? candidate.toJSON() : candidate;

      // Upsert invite
      let existing = await Invite.findOne({ candidateId: cid, jobId: String(jobId) });
      let token, inviteId;

      if (existing) {
        token    = existing.token;
        inviteId = existing.id;
        await Invite.findByIdAndUpdate(existing.id, {
          status: 'sent', sentAt: new Date().toISOString(),
          sentBy: req.user._id, sentByName: req.user.name || '', message: message || '',
          tenantId: job.tenantId,
        });
      } else {
        token = randomUUID();
        const inv = await Invite.create({
          candidateId: cid, jobId: String(jobId), token,
          tenantId: job.tenantId,
          status: 'sent', sentAt: new Date().toISOString(),
          sentBy: req.user._id, sentByName: req.user.name || '', message: message || '',
          candidateName: c.name || '', candidateEmail: c.email || '',
          jobTitle: j.title || '',
        });
        inviteId = inv.id;
      }

      // Send email
      const html = buildInviteHtml({ candidate: c, job: j, message, token, fromName, fromOrg });
      const subject = `You're invited! ${j.title} — ${fromName} thinks you're a great fit`;

      try {
        await sendInviteEmail(sender, c.email, `"${fromName}" <${fromEmail}>`, subject, html);
        EmailLog.create({ to: c.email, subject, body: html, status: 'sent', provider: sender?.type || 'dev', jobId: String(jobId), candidateId: cid, sentBy: req.user._id, retryCount: 0 }).catch(() => {});
      } catch (err) {
        console.error('Invite email error:', c.email, err.message);
        // Mark the invite record as failed so OutreachTracker shows it
        await Invite.findByIdAndUpdate(inviteId, { status: 'failed', emailError: err.message }).catch(() => {});
        EmailLog.create({ to: c.email, subject, body: html, status: 'failed', error: err.message, provider: sender?.type || 'dev', jobId: String(jobId), candidateId: cid, sentBy: req.user._id, retryCount: 0 }).catch(() => {});
      }

      results.push({ candidateId: cid, inviteId, token });
    }

    res.json({ sent: results.length, results });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/invites/mine ─── candidate sees their own invites ────────────────
router.get('/mine', auth, async (req, res) => {
  try {
    let all = await Invite.find({ candidateId: req.user._id });
    all.sort((a, b) => new Date(b.sentAt || 0) - new Date(a.sentAt || 0));
    // Attach job details
    const withJobs = await Promise.all(all.map(async (inv) => {
      const i = inv.toJSON ? inv.toJSON() : inv;
      try {
        const job = await Job.findById(i.jobId);
        return { ...i, job: job ? (job.toJSON ? job.toJSON() : job) : null };
      } catch { return i; }
    }));
    res.json(withJobs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/invites/log-share ─── log a job-share email as outreach ─────────
router.post('/log-share', auth, allowRoles('admin', 'super_admin', 'recruiter'), async (req, res) => {
  try {
    const { jobId, jobTitle, recipientEmail, candidateName, sentByName, type, platform } = req.body;
    // For social shares, email might be empty initially
    const record = await Invite.create({
      jobId:          jobId || undefined,
      jobTitle:       jobTitle || '',
      tenantId:       req.user.tenantId || undefined,
      token:          randomUUID(),
      status:         'sent',
      sentAt:         new Date().toISOString(),
      sentBy:         req.user._id,
      sentByName:     sentByName || req.user.name || '',
      candidateName:  candidateName || (platform ? `Social Reach (${platform})` : 'Social Reach'),
      candidateEmail: recipientEmail || '',
      type:           type || 'job_share',
    });
    res.json({ success: true, data: record });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/invites ─── list (admin/recruiter) ───────────────────────────────
router.get('/', auth, allowRoles('admin', 'super_admin', 'recruiter'), async (req, res) => {
  try {
    const { jobId, status } = req.query;
    let query = {};
    if (jobId) query.jobId = jobId;
    if (status) query.status = status;
    if (req.user.role !== 'super_admin') query.tenantId = req.user.tenantId;
    if (req.user.role === 'recruiter') query.sentBy = req.user._id;

    const all = await Invite.find(query)
      .populate('candidateId', 'name email')
      .populate('jobId', 'title company location')
      .populate('sentBy', 'name')
      .sort({ sentAt: -1 })
      .lean();

    // Normalize: merge populated refs with stored string fallbacks so UI never shows blank/Unknown
    const normalized = all.map(inv => ({
      ...inv,
      id: inv._id?.toString(),
      sentByName:      inv.sentBy?.name    || inv.sentByName      || 'System',
      candidateName:   inv.candidateId?.name  || inv.candidateName  || inv.candidateEmail?.split('@')[0] || '—',
      candidateEmail:  inv.candidateId?.email || inv.candidateEmail || '—',
      jobTitle:        inv.jobId?.title    || inv.jobTitle        || 'General Opening',
    }));

    res.json({ success: true, data: normalized });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/invites/:token/interested ─── candidate clicked "I'm Interested" ─
router.get('/:token/interested', async (req, res) => {
  try {
    const inv = await Invite.findOne({ token: req.params.token });
    if (inv) {
      await Invite.findByIdAndUpdate(inv.id, { status: 'interested', respondedAt: new Date().toISOString() });
      const jobId = inv.jobId;
      const redirectUrl = `${FRONTEND_URL}/careers${jobId ? `?job=${jobId}` : ''}`;
      return res.redirect(redirectUrl);
    }
    res.redirect(FRONTEND_URL);
  } catch (e) { res.redirect(FRONTEND_URL); }
});

// ── GET /api/invites/:token/open ─── tracking pixel ──────────────────────────
router.get('/:token/open', async (req, res) => {
  try {
    const inv = await Invite.findOne({ token: req.params.token });
    if (inv && inv.status === 'sent')
      await Invite.findByIdAndUpdate(inv.id, { status: 'opened', openedAt: new Date().toISOString() });
  } catch {}
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.set({ 'Content-Type': 'image/gif', 'Content-Length': pixel.length, 'Cache-Control': 'no-cache, no-store, must-revalidate' });
  res.send(pixel);
});

// ── GET /api/invites/:token ─── public invite detail ─────────────────────────
router.get('/:token', async (req, res) => {
  try {
    const inv = await Invite.findOne({ token: req.params.token });
    if (!inv) return res.status(404).json({ error: 'Invitation not found or has expired.' });
    const job = await Job.findById(inv.jobId);
    res.json({ invite: inv, job: job ? (job.toJSON ? job.toJSON() : job) : null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/invites/:token/respond ─── candidate responds (no auth) ────────
router.patch('/:token/respond', async (req, res) => {
  try {
    const { response } = req.body;
    if (!['interested', 'declined'].includes(response))
      return res.status(400).json({ error: 'response must be "interested" or "declined".' });

    const inv = await Invite.findOne({ token: req.params.token });
    if (!inv) return res.status(404).json({ error: 'Invitation not found.' });

    if (['interested', 'declined'].includes(inv.status))
      return res.json({ already: true, status: inv.status });

    await Invite.findByIdAndUpdate(inv.id, {
      status: response,
      respondedAt: new Date().toISOString(),
    });

    // Interested → auto-create pipeline application + notify recruiter
    if (response === 'interested') {
      const inviteJob = await Job.findById(inv.jobId).lean();
      const existing = await Application.findOne({ jobId: inv.jobId, candidateId: inv.candidateId });
      if (!existing && inviteJob) {
        await Application.create({
          jobId: inviteJob._id,
          candidateId: inv.candidateId,
          tenantId: inviteJob.tenantId || inv.tenantId,
          currentStage: 'Applied',
          source: 'invite',
          stageHistory: [{ stage: 'Applied', movedAt: new Date(), notes: 'Applied via invite.' }],
        }).catch(err => console.error('Invite application create error:', err.message));
      }

      // Notify recruiter in-app + email
      try {
        const candidate = await User.findById(inv.candidateId);
        const job       = inviteJob ? inviteJob : await Job.findById(inv.jobId);
        const recruiter = await User.findById(inv.sentBy);
        const c = candidate ? (candidate.toJSON ? candidate.toJSON() : candidate) : {};
        const j = job       ? (job.toJSON       ? job.toJSON()       : job)       : {};
        const r = recruiter ? (recruiter.toJSON  ? recruiter.toJSON() : recruiter) : {};

        // In-app notification
        const Notification = require('../models/Notification');
        await Notification.create({
          userId: String(inv.sentBy), tenantId: r.tenantId || '',
          type: 'invite_interested',
          title: `${c.name || 'A candidate'} is Interested! 🎉`,
          body:  `${c.name || 'Candidate'} responded to your invite for ${j.title || 'the role'} and is interested.`,
          link:  '/app/pipeline',
          read: false,
        });

        // Email notification to recruiter
        if (r.email) {
          const { sendEmailWithRetry } = require('../utils/email');
          await sendEmailWithRetry(r.email,
            `🎉 ${c.name || 'A candidate'} is Interested — ${j.title || 'Your invite'}`,
            `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px;border-radius:12px">
              <h2 style="color:#0d2150;margin:0 0 8px">Great news! 🎉</h2>
              <p style="color:#374151">Hi <strong>${r.name || 'Recruiter'}</strong>,</p>
              <p style="color:#374151"><strong>${c.name || 'A candidate'}</strong> has responded <strong style="color:#2E844A">Interested</strong> to your invite for <strong>${j.title || 'the role'}</strong>.</p>
              <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:20px 0">
                <p style="margin:4px 0;color:#374151"><strong>Candidate:</strong> ${c.name || 'N/A'}</p>
                <p style="margin:4px 0;color:#374151"><strong>Email:</strong> ${c.email || 'N/A'}</p>
                <p style="margin:4px 0;color:#374151"><strong>Phone:</strong> ${c.phone || 'N/A'}</p>
                <p style="margin:4px 0;color:#374151"><strong>Role:</strong> ${j.title || 'N/A'}</p>
                <p style="margin:4px 0;color:#374151"><strong>Experience:</strong> ${c.experience ? c.experience + ' years' : 'N/A'}</p>
                <p style="margin:4px 0;color:#374151"><strong>Location:</strong> ${c.location || 'N/A'}</p>
              </div>
              <a href="https://www.talentnesthr.com/app/pipeline" style="display:inline-block;background:#0176D3;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px">
                View in Pipeline →
              </a>
              <p style="color:#6b7280;font-size:12px;margin-top:24px">TalentNest HR — hr@talentnesthr.com</p>
            </div>`
          ).catch(() => {});
        }
      } catch (notifErr) { console.error('[invite notify error]', notifErr.message); }
    }

    res.json({ success: true, status: response });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/invites/:id/status ─── recruiter manually updates invite status ─
router.patch('/:id/status', auth, allowRoles('admin', 'super_admin', 'recruiter'), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['interested', 'declined', 'sent', 'opened'].includes(status))
      return res.status(400).json({ error: 'Invalid status.' });

    const invite = await Invite.findById(req.params.id);
    if (!invite) return res.status(404).json({ error: 'Invite not found.' });

    const updates = { status, respondedAt: ['interested','declined'].includes(status) ? new Date().toISOString() : undefined };
    await Invite.findByIdAndUpdate(req.params.id, updates);

    // If manually marked interested, auto-create application
    if (status === 'interested' && invite.jobId && invite.candidateId) {
      const existing = await Application.findOne({ jobId: invite.jobId, candidateId: invite.candidateId });
      if (!existing) {
        await Application.create({
          jobId: invite.jobId,
          candidateId: invite.candidateId,
          tenantId: invite.tenantId || req.user.tenantId,
          currentStage: 'Applied',
          source: 'invite',
          stageHistory: [{ stage: 'Applied', movedBy: req.user._id, movedAt: new Date(), notes: 'Marked interested by recruiter.' }],
        });
      }
    }

    res.json({ success: true, status });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/invites/:id/resend ─── retry a failed invite ───────────────────
router.post('/:id/resend', auth, allowRoles('admin', 'super_admin', 'recruiter'), async (req, res) => {
  try {
    const invite = await Invite.findById(req.params.id);
    if (!invite) return res.status(404).json({ error: 'Invite not found.' });
    const inv = invite.toJSON ? invite.toJSON() : invite;

    const candidateDoc = await User.findById(inv.candidateId);
    const jobDoc       = await Job.findById(inv.jobId);
    if (!candidateDoc || !jobDoc) return res.status(404).json({ error: 'Candidate or job not found.' });

    const c = candidateDoc.toJSON ? candidateDoc.toJSON() : candidateDoc;
    const j = jobDoc.toJSON ? jobDoc.toJSON() : jobDoc;

    const senderUserDoc = await User.findById(req.user._id);
    const s    = senderUserDoc ? (senderUserDoc.toJSON ? senderUserDoc.toJSON() : senderUserDoc) : {};
    const cfg  = s.emailConfig || null;
    const fromName  = cfg?.name || s.name || 'TalentNest HR';
    const fromOrg   = s.orgName || '';
    const fromEmail = cfg?.user || process.env.RESEND_FROM || process.env.ZOHO_EMAIL || 'hr@talentnesthr.com';
    const sender    = buildSender(cfg);

    const subject = `You're invited! ${j.title} — ${fromName} thinks you're a great fit`;
    const html    = buildInviteHtml({ candidate: c, job: j, message: inv.message, token: inv.token, fromName, fromOrg });

    await sendInviteEmail(sender, c.email, `"${fromName}" <${fromEmail}>`, subject, html);
    await Invite.findByIdAndUpdate(inv.id, { status: 'sent', sentAt: new Date().toISOString(), emailError: null });
    EmailLog.create({ to: c.email, subject, body: html, status: 'sent', provider: sender?.type || 'dev', jobId: String(inv.jobId), candidateId: String(inv.candidateId), sentBy: req.user._id, retryCount: 1 }).catch(() => {});
    res.json({ success: true, message: `Invite resent to ${c.email}` });
  } catch (e) {
    await Invite.findByIdAndUpdate(req.params.id, { status: 'failed', emailError: e.message }).catch(() => {});
    res.status(500).json({ error: e.message });
  }
});

// ── DELETE /api/invites/:id ─── admin delete ──────────────────────────────────
router.delete('/:id', auth, allowRoles('admin', 'super_admin'), async (req, res) => {
  try {
    await Invite.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
