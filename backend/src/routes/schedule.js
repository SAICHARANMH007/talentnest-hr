'use strict';
const express         = require('express');
const router          = express.Router();
const crypto          = require('crypto');
const SchedulingLink  = require('../models/SchedulingLink');
const Application     = require('../models/Application');
const Candidate       = require('../models/Candidate');
const Job             = require('../models/Job');
const Notification    = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard }    = require('../middleware/tenantGuard');
const { allowRoles }     = require('../middleware/rbac');
const asyncHandler       = require('../utils/asyncHandler');
const AppError           = require('../utils/AppError');
const { sendEmailWithRetry } = require('../utils/email');

const guard = [authMiddleware, tenantGuard];

// POST /api/schedule — recruiter creates a scheduling link for a candidate
router.post('/', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { applicationId, slots, format, videoLink, location, notes } = req.body;
  if (!applicationId) throw new AppError('applicationId is required', 400);
  if (!Array.isArray(slots) || slots.length === 0) throw new AppError('At least one slot is required', 400);
  if (slots.length > 10) throw new AppError('Maximum 10 slots allowed', 400);

  const app = await Application.findOne({ _id: applicationId, tenantId: req.user.tenantId, deletedAt: null }).lean();
  if (!app) throw new AppError('Application not found', 404);

  const [candidate, job] = await Promise.all([
    Candidate.findById(app.candidateId).select('name email').lean(),
    Job.findById(app.jobId).select('title').lean(),
  ]);

  const token     = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const link = await SchedulingLink.create({
    token,
    applicationId,
    tenantId     : req.user.tenantId,
    jobTitle     : job?.title || '',
    candidateName : candidate?.name || '',
    candidateEmail: candidate?.email || '',
    recruiterName : req.user.name || '',
    availableSlots: slots.map(s => new Date(s)),
    format        : format || 'video',
    videoLink     : videoLink || '',
    location      : location || '',
    notes         : notes || '',
    expiresAt,
  });

  const baseUrl    = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
  const scheduleUrl = `${baseUrl}/schedule/${token}`;

  // Email the candidate
  if (candidate?.email) {
    const slotList = slots.slice(0, 5).map(s => {
      const d = new Date(s);
      return `<li style="margin:6px 0;color:#374151;font-size:14px;">${d.toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})} at ${d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})}</li>`;
    }).join('');
    const html = `<div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px 20px;">
      <div style="background:linear-gradient(135deg,#7C3AED,#4F46E5);padding:28px 32px;border-radius:16px 16px 0 0;">
        <div style="font-size:32px;margin-bottom:8px;">📅</div>
        <h1 style="color:#fff;font-size:20px;margin:0;">Schedule Your Interview</h1>
        <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">${job?.title || 'Position'}</p>
      </div>
      <div style="background:#fff;padding:28px 32px;border-radius:0 0 16px 16px;border:1px solid #e2e8f0;border-top:none;">
        <p style="color:#374151;font-size:15px;">Hi <strong>${candidate.name}</strong>,</p>
        <p style="color:#374151;font-size:14px;line-height:1.7;">${req.user.name || 'Your recruiter'} has offered the following interview slots for the <strong>${job?.title || 'position'}</strong>. Please click the button below to choose your preferred time.</p>
        <div style="background:#F8FAFC;border-radius:12px;padding:16px 20px;margin:16px 0;border:1px solid #E2E8F0;">
          <div style="font-size:12px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Available Slots</div>
          <ul style="margin:0;padding:0 0 0 16px;">${slotList}${slots.length > 5 ? `<li style="color:#6B7280;font-size:13px;">+ ${slots.length - 5} more slots</li>` : ''}</ul>
        </div>
        <a href="${scheduleUrl}" style="display:inline-block;background:linear-gradient(135deg,#7C3AED,#4F46E5);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;margin:8px 0;">Pick Your Slot →</a>
        <p style="color:#9CA3AF;font-size:11px;margin-top:20px;">This link expires in 7 days. You are receiving this because you applied through TalentNest HR.</p>
      </div>
    </div>`;
    sendEmailWithRetry(candidate.email, `📅 Schedule Your Interview — ${job?.title || 'Position'}`, html).catch(() => {});
  }

  // In-app notification to candidate
  try {
    const User = require('../models/User');
    const candUser = candidate?.email ? await User.findOne({ email: candidate.email.toLowerCase(), deletedAt: null }).select('_id').lean() : null;
    if (candUser) {
      await Notification.create({
        userId: candUser._id, tenantId: req.user.tenantId, type: 'stage_change',
        title: '📅 Pick your interview slot!',
        message: `${req.user.name || 'Your recruiter'} shared interview slots for ${job?.title || 'the role'}. Click to choose your preferred time.`,
        link: `/schedule/${token}`,
      }).catch(() => {});
    }
  } catch { /* non-fatal */ }

  res.status(201).json({ success: true, data: { token, scheduleUrl, expiresAt } });
}));

// GET /api/schedule/:token — public, no auth — return link details for candidate
router.get('/:token', asyncHandler(async (req, res) => {
  const link = await SchedulingLink.findOne({ token: req.params.token }).lean();
  if (!link) return res.status(404).json({ success: false, error: 'Scheduling link not found' });
  if (link.expiresAt < new Date()) {
    await SchedulingLink.findByIdAndUpdate(link._id, { status: 'expired' }).catch(() => {});
    return res.status(410).json({ success: false, error: 'This scheduling link has expired' });
  }
  res.json({ success: true, data: {
    jobTitle     : link.jobTitle,
    recruiterName: link.recruiterName,
    candidateName: link.candidateName,
    availableSlots: link.availableSlots,
    selectedSlot  : link.selectedSlot,
    status        : link.status,
    format        : link.format,
    notes         : link.notes,
  }});
}));

// POST /api/schedule/:token/confirm — candidate confirms a slot (no auth)
router.post('/:token/confirm', asyncHandler(async (req, res) => {
  const { selectedSlot } = req.body;
  if (!selectedSlot) throw new AppError('selectedSlot is required', 400);

  const link = await SchedulingLink.findOne({ token: req.params.token, status: 'pending' });
  if (!link) return res.status(404).json({ success: false, error: 'Link not found or already confirmed' });
  if (link.expiresAt < new Date()) return res.status(410).json({ success: false, error: 'This link has expired' });

  const chosen = new Date(selectedSlot);
  const isValid = link.availableSlots.some(s => Math.abs(new Date(s) - chosen) < 60000);
  if (!isValid) throw new AppError('Selected slot is not in the available list', 400);

  link.selectedSlot = chosen;
  link.status       = 'confirmed';
  await link.save();

  // Auto-schedule the interview on the application
  try {
    const app = await Application.findById(link.applicationId);
    if (app) {
      const roundIndex  = app.interviewRounds.length;
      const newStage    = roundIndex === 0 ? 'Interview Round 1' : 'Interview Round 2';
      app.interviewRounds.push({
        scheduledAt     : chosen,
        format          : link.format || 'video',
        interviewerName : link.recruiterName,
        videoLink       : link.videoLink || '',
        location        : link.location || '',
        feedback        : {},
      });
      if (!['Interview Round 1', 'Interview Round 2'].includes(app.currentStage)) {
        app.currentStage = newStage;
        app.stageHistory.push({ stage: newStage, movedAt: new Date(), notes: 'Interview self-scheduled by candidate' });
      }
      await app.save();

      // Notify recruiter
      const User = require('../models/User');
      const tenantAdmins = await User.find({
        tenantId: link.tenantId,
        role    : { $in: ['admin', 'super_admin', 'recruiter'] },
        isActive: true,
        deletedAt: null,
      }).select('_id').lean();
      const dateStr = chosen.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = chosen.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      await Promise.all(tenantAdmins.map(u =>
        Notification.create({
          userId: u._id, tenantId: link.tenantId, type: 'stage_change',
          title: '📅 Interview Confirmed',
          message: `${link.candidateName || 'Candidate'} selected a slot: ${dateStr} at ${timeStr} for ${link.jobTitle}`,
          link: '/app/pipeline',
        }).catch(() => {})
      ));
    }
  } catch (e) {
    console.error('[schedule confirm] failed to update application:', e.message);
  }

  res.json({ success: true, message: 'Interview slot confirmed!', data: { selectedSlot: chosen } });
}));

module.exports = router;
