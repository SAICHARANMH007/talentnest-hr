'use strict';
const express   = require('express');
const crypto    = require('crypto');
const router    = express.Router();
const { authenticate: auth } = require('../middleware/auth');
const { allowRoles }         = require('../middleware/rbac');
const Application  = require('../models/Application');
const WhatsAppSession = require('../models/WhatsAppSession');
const WhatsAppLog  = require('../models/WhatsAppLog');
const Notification = require('../models/Notification');
const { sendWhatsApp } = require('../utils/sendWhatsApp');
const { sendPush }     = require('../utils/sendPush');

// ── Twilio webhook signature verification ─────────────────────────────────────
function verifyTwilioSignature(req) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return true; // skip in dev
  const twilioSignature = req.headers['x-twilio-signature'] || '';
  const url = `${process.env.BACKEND_URL || 'https://api.talentnesthr.com'}${req.originalUrl}`;
  const params = req.body || {};
  const sortedKeys = Object.keys(params).sort();
  let str = url;
  sortedKeys.forEach(k => { str += k + params[k]; });
  const expected = crypto.createHmac('sha1', authToken).update(str).digest('base64');
  return expected === twilioSignature;
}

// ── GET /api/whatsapp/webhook — Twilio verification ───────────────────────────
router.get('/webhook', (req, res) => res.sendStatus(200));

// ── POST /api/whatsapp/webhook — incoming messages ────────────────────────────
router.post('/webhook',
  express.urlencoded({ extended: false }),   // Twilio sends form-encoded
  async (req, res) => {
    // Respond 200 immediately — process async
    res.sendStatus(200);

    if (!verifyTwilioSignature(req)) {
      console.warn('[WA webhook] invalid signature');
      return;
    }

    const { From, Body, MessageSid } = req.body || {};
    if (!From || !Body) return;

    // Dedup by MessageSid
    try {
      const exists = await WhatsAppLog.findOne({ messageSid: MessageSid });
      if (exists) return;
    } catch { /* continue */ }

    // Normalise sender phone
    const fromPhone = From.replace('whatsapp:', '').replace(/\s/g, '');
    const msgText   = (Body || '').trim();

    // Log inbound
    try {
      await WhatsAppLog.create({
        tenantId: null,  // will be filled after candidate lookup
        direction: 'inbound',
        from: From,
        to: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
        message: msgText,
        messageSid: MessageSid,
        status: 'received',
      });
    } catch { /* non-fatal */ }

    // Look up candidate by phone
    const candidate = await findCandidateByPhone(fromPhone);
    if (!candidate) {
      await sendWhatsApp(fromPhone,
        'This number is not registered in our system. Please contact your recruiter.',
        {}
      );
      return;
    }

    // Check for active WhatsApp session (numbered reply)
    const session = await WhatsAppSession.findOne({
      candidatePhone: fromPhone.replace(/\D/g, '').slice(-10),
      isResolved: false,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (session && /^[123]$/.test(msgText)) {
      await handleNumberedReply(session, candidate, msgText, fromPhone);
      return;
    }

    // Status enquiry bot
    await handleStatusEnquiry(candidate, fromPhone);
  }
);

// ── Candidate lookup by phone ─────────────────────────────────────────────────
async function findCandidateByPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  const last10 = digits.slice(-10);

  // Try User model (candidates are Users with role=candidate)
  const User = require('../models/User');
  const queries = [
    { phone: last10, role: 'candidate' },
    { phone: `+91${last10}`, role: 'candidate' },
    { phone: `91${last10}`, role: 'candidate' },
    { phone: digits, role: 'candidate' },
  ];
  for (const q of queries) {
    const u = await User.findOne(q).lean();
    if (u) return { ...u, id: u._id.toString() };
  }

  // Try Candidate model if it exists
  try {
    const Candidate = require('../models/Candidate');
    for (const q of queries) {
      const { role: _r, ...cq } = q;
      const c = await Candidate.findOne(cq).lean();
      if (c) return { ...c, id: c._id.toString() };
    }
  } catch { /* model may not exist */ }

  return null;
}

// ── Numbered reply handler ────────────────────────────────────────────────────
async function handleNumberedReply(session, candidate, reply, fromPhone) {
  await WhatsAppSession.findByIdAndUpdate(session._id, { isResolved: true, resolvedWith: reply });

  if (session.type === 'interview-confirm') {
    await handleInterviewReply(session, candidate, reply, fromPhone);
  } else if (session.type === 'offer-response') {
    await handleOfferReply(session, candidate, reply, fromPhone);
  }
}

async function handleInterviewReply(session, candidate, reply, fromPhone) {
  const app = await Application.findById(session.applicationId);
  if (!app) return;

  const Job = require('../models/Job');
  const job = await Job.findById(app.jobId).lean();

  const idx = session.interviewRoundIndex;
  const rounds = app.interviewRounds || [];
  if (idx !== undefined && rounds[idx]) {
    if (reply === '1') {
      rounds[idx].status = 'confirmed';
      await sendWhatsApp(fromPhone,
        `Great! Your interview is confirmed. We look forward to speaking with you. Good luck!`,
        { tenantId: session.tenantId, candidateId: candidate._id }
      );
    } else if (reply === '2') {
      rounds[idx].status = 'reschedule-requested';
      await sendWhatsApp(fromPhone,
        `Understood. Please call or email your recruiter to arrange a new time. They will be in touch shortly.`,
        { tenantId: session.tenantId, candidateId: candidate._id }
      );
    } else if (reply === '3') {
      rounds[idx].status = 'declined';
      await sendWhatsApp(fromPhone,
        `We're sorry to hear that. Your recruiter has been notified. Feel free to reach out if anything changes.`,
        { tenantId: session.tenantId, candidateId: candidate._id }
      );
    }
    app.interviewRounds = rounds;
    await app.save();
  }

  // Notify recruiter
  const statusLabel = { '1': 'confirmed', '2': 'reschedule requested', '3': 'declined' }[reply] || reply;
  if (job && (job.createdBy || job.recruiterId)) {
    const recruiterId = job.createdBy || job.recruiterId;
    const msg = `${candidate.name || 'Candidate'} has ${statusLabel} the interview for ${job.title}`;
    await Promise.allSettled([
      sendPush(recruiterId, { title: 'Interview Response', body: msg, url: `/app/pipeline` }),
      Notification.create({ userId: recruiterId, tenantId: session.tenantId, type: 'interview', title: 'Interview Response', message: msg }),
    ]);
  }
}

async function handleOfferReply(session, candidate, reply, fromPhone) {
  let OfferLetter;
  try { OfferLetter = require('../models/OfferLetter'); } catch { return; }
  const offer = await OfferLetter.findById(session.offerId);
  if (!offer) return;

  if (reply === '1') {
    offer.verballyAccepted = true;
    offer.verbalAcceptedAt = new Date();
    await offer.save();
    await sendWhatsApp(fromPhone,
      `Congratulations! Your verbal acceptance has been noted. You will receive the digital signing link shortly.`,
      { tenantId: session.tenantId, candidateId: candidate._id }
    );
  } else if (reply === '2') {
    offer.status = 'discussion-requested';
    await offer.save();
    await sendWhatsApp(fromPhone,
      `Noted! Your recruiter will reach out to discuss the offer details with you.`,
      { tenantId: session.tenantId, candidateId: candidate._id }
    );
  }

  // Notify recruiter
  const recruiterId = offer.createdBy || offer.recruiterId;
  if (recruiterId) {
    const msg = reply === '1'
      ? `${candidate.name} verbally accepted the offer!`
      : `${candidate.name} wants to discuss the offer`;
    await Promise.allSettled([
      sendPush(recruiterId, { title: 'Offer Response', body: msg, url: `/app/pipeline` }),
      Notification.create({ userId: recruiterId, tenantId: session.tenantId, type: 'offer', title: 'Offer Response', message: msg }),
    ]);
  }
}

// ── Status enquiry bot ────────────────────────────────────────────────────────
async function handleStatusEnquiry(candidate, fromPhone) {
  try {
    const app = await Application.findOne({
      candidateId: candidate._id || candidate.id,
      currentStage: { $nin: ['Hired', 'Rejected'] },
    }).sort({ createdAt: -1 }).lean();

    if (!app) {
      await sendWhatsApp(fromPhone,
        `Hi ${candidate.name || 'there'}! We don't have an active application on file for you. Please contact your recruiter for assistance.`,
        {}
      );
      return;
    }

    const Job = require('../models/Job');
    const job = await Job.findById(app.jobId).lean();
    if (!job) return;

    let msg = `Hi ${candidate.name || 'there'}! \n\nYour application status:\nRole: ${job.title}\nCompany: ${job.company || job.orgName || 'TalentNest'}\nStage: ${app.currentStage}`;

    // Check for scheduled interview
    const pendingInterview = (app.interviewRounds || []).find(r => r.status === 'scheduled' || r.status === 'confirmed');
    if (pendingInterview && pendingInterview.scheduledAt) {
      const d = new Date(pendingInterview.scheduledAt);
      msg += `\nInterview: ${d.toLocaleDateString('en-IN')} at ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
    }

    msg += `\n\nFor more details, please contact your recruiter. Good luck!`;

    await sendWhatsApp(fromPhone, msg, { tenantId: app.tenantId, candidateId: app.candidateId });
  } catch (err) {
    console.error('[WA status enquiry]', err.message);
  }
}

// ── POST /api/whatsapp/send — protected, send a single message ────────────────
router.post('/send', auth, allowRoles('recruiter', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { phone, message, candidateId } = req.body;
    if (!phone || !message) return res.status(400).json({ success: false, message: 'phone and message required' });

    const result = await sendWhatsApp(phone, message, {
      tenantId: req.user.tenantId,
      candidateId,
    });
    res.json({ success: result.ok, data: { messageSid: result.messageSid } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/whatsapp/bulk-send — bulk WhatsApp with personalisation + rate limiting ──
router.post('/bulk-send', auth, allowRoles('recruiter', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { recipients, messageTemplate } = req.body;
    // recipients: [{ phone, candidateId, name, jobTitle, companyName, recruiterName, interviewDate }]
    if (!Array.isArray(recipients) || !recipients.length) {
      return res.status(400).json({ success: false, message: 'recipients array required' });
    }
    if (!messageTemplate) {
      return res.status(400).json({ success: false, message: 'messageTemplate required' });
    }

    let sent = 0, failed = 0;
    const results = [];

    for (const r of recipients) {
      const personalised = messageTemplate
        .replace(/\{\{CandidateName\}\}/g,  r.name || 'Candidate')
        .replace(/\{\{JobTitle\}\}/g,       r.jobTitle || '')
        .replace(/\{\{CompanyName\}\}/g,    r.companyName || '')
        .replace(/\{\{RecruiterName\}\}/g,  r.recruiterName || '')
        .replace(/\{\{InterviewDate\}\}/g,  r.interviewDate || '');

      const result = await sendWhatsApp(r.phone, personalised, {
        tenantId:    req.user.tenantId,
        candidateId: r.candidateId,
      });

      if (result.ok) sent++; else failed++;
      results.push({ phone: r.phone, ok: result.ok, sid: result.messageSid });

      // 1 second delay between messages (Twilio rate limiting)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    res.json({
      success: true,
      data: { sent, failed, total: recipients.length, results },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/whatsapp/create-session — create a pending WA session ───────────
router.post('/create-session', auth, allowRoles('recruiter', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { candidatePhone, type, applicationId, interviewRoundIndex, offerId } = req.body;
    if (!candidatePhone || !type) {
      return res.status(400).json({ success: false, message: 'candidatePhone and type required' });
    }

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
    const session = await WhatsAppSession.create({
      candidatePhone: String(candidatePhone).replace(/\D/g, '').slice(-10),
      tenantId: req.user.tenantId,
      type,
      applicationId,
      interviewRoundIndex,
      offerId,
      expiresAt,
    });

    const sessionDoc = { ...session.toJSON(), id: session._id.toString() };
    res.json({ success: true, data: sessionDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/whatsapp/logs — WhatsApp message history for tenant ──────────────
router.get('/logs', auth, allowRoles('recruiter', 'admin', 'super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = { tenantId: req.user.tenantId };

    const [logs, total] = await Promise.all([
      WhatsAppLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      WhatsAppLog.countDocuments(filter),
    ]);

    const data = logs.map(l => ({ ...l, id: l._id.toString() }));
    res.json({ success: true, data, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
