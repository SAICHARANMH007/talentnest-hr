'use strict';
const express      = require('express');
const router       = express.Router();
const CandidateRequest = require('../models/CandidateRequest');
const User         = require('../models/User');
const { authMiddleware }  = require('../middleware/auth');
const { tenantGuard }     = require('../middleware/tenantGuard');
const { allowRoles }      = require('../middleware/rbac');
const { getPagination, paginatedResponse } = require('../middleware/paginate');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../utils/AppError');
const logger       = require('../middleware/logger');
const { sendEmailWithRetry: sendEmail } = require('../utils/email');

const guard = [authMiddleware, tenantGuard];

function normalize(r) {
  const o = r.toObject ? r.toObject() : { ...r };
  o.id = o.id || o._id?.toString();
  return o;
}

// GET /api/candidate-requests — list (superadmin=all, admin=own tenant)
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = {};
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    CandidateRequest.find(filter)
      .populate('tenantId', 'name')
      .populate('requestedBy', 'name email')
      .populate('submittedCandidates', 'name email phone title skills location experience currentCompany noticePeriod')
      .populate('jobId', 'title location jobType companyName')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CandidateRequest.countDocuments(filter),
  ]);
  res.json(paginatedResponse(items.map(r => ({ ...r, id: r._id?.toString() })), total, limit, page));
}));

// GET /api/candidate-requests/:id
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const r = await CandidateRequest.findById(req.params.id)
    .populate('tenantId', 'name').populate('requestedBy', 'name email').lean();
  if (!r) throw new AppError('Request not found.', 404);
  res.json({ success: true, data: { ...r, id: r._id?.toString() } });
}));

// POST /api/candidate-requests — admin or recruiter submits request
router.post('/', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const { roleTitle, requirements, urgency, budget, jobId } = req.body;
    if (!roleTitle) throw new AppError('roleTitle is required.', 400);

    const r = await CandidateRequest.create({
      tenantId:    req.user.tenantId,
      requestedBy: req.user.id,
      roleTitle: roleTitle.trim(),
      requirements: requirements || '',
      urgency: urgency || 'medium',
      budget: budget || '',
      status: 'pending',
      ...(jobId ? { jobId } : {}),
    });

    logger.audit('Candidate request submitted', req.user.id, req.user.tenantId, { requestId: r._id });

    // Notify centralized support/admin instead of spamming all super_admins
    const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@talentnesthr.com';
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';

    await sendEmail(
      SUPPORT_EMAIL,
      `🚨 New Candidate Request — ${roleTitle} [${(urgency || 'medium').toUpperCase()}]`,
      `<h2>New Candidate Request</h2>
      <p><b>Tenant:</b> ${req.user.tenantId}</p>
      <p><b>Role:</b> ${roleTitle}</p>
      <p><b>Urgency:</b> ${urgency || 'medium'}</p>
      <p><b>Budget:</b> ${budget || 'Not specified'}</p>
      <p><b>Requirements:</b></p><pre style="background:#f4f4f4;padding:12px;border-radius:6px">${requirements || 'None'}</pre>
      <p><b>Submitted by:</b> ${req.user.name || req.user.email}</p>
      <hr/>
      <p><a href="${FRONTEND_URL}/app/superadmin/candidate-requests">View in TalentNest Dashboard →</a></p>`
    ).catch(err => logger.error('Failed to send candidate request email', err));

    res.status(201).json({ success: true, data: normalize(r) });
  })
);

// PATCH /api/candidate-requests/:id — superadmin manages
router.patch('/:id', authMiddleware,
  allowRoles('super_admin', 'admin'),
  asyncHandler(async (req, res) => {
    const Notification = require('../models/Notification');
    const Candidate    = require('../models/Candidate');
    const allowed = ['status', 'adminNotes', 'chargeAmount', 'submittedCandidates'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

    const prevRequest = await CandidateRequest.findById(req.params.id).lean();
    if (!prevRequest) throw new AppError('Request not found.', 404);

    if (updates.status === 'fulfilled') updates.fulfilledAt = new Date();

    const r = await CandidateRequest.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true })
      .populate('submittedCandidates', 'name email phone title');
    if (!r) throw new AppError('Request not found.', 404);

    // Notify the requesting admin when super_admin submits candidates or fulfills the request
    const candidatesSubmitted = updates.submittedCandidates?.length > 0;
    const statusChanged       = updates.status && updates.status !== prevRequest.status;

    if ((candidatesSubmitted || statusChanged) && prevRequest.requestedBy) {
      try {
        let notifTitle, notifMsg;
        if (updates.status === 'fulfilled') {
          notifTitle = '✅ Staffing Request Fulfilled';
          notifMsg   = `Your request for "${prevRequest.roleTitle}" has been fulfilled. ${r.submittedCandidates?.length || 0} candidate(s) have been assigned.`;
        } else if (candidatesSubmitted) {
          const names = (r.submittedCandidates || []).slice(0, 3).map(c => c.name).join(', ');
          notifTitle = `👥 Candidates Submitted — ${prevRequest.roleTitle}`;
          notifMsg   = `TalentNest has submitted ${r.submittedCandidates?.length || 0} candidate(s) for your request: ${names}${r.submittedCandidates?.length > 3 ? ' and more…' : ''}.`;
        } else if (updates.status === 'in_progress') {
          notifTitle = '🔄 Request In Progress';
          notifMsg   = `Your staffing request for "${prevRequest.roleTitle}" is now being processed by the TalentNest team.`;
        }

        if (notifTitle) {
          await Notification.create({
            userId   : prevRequest.requestedBy,
            tenantId : prevRequest.tenantId,
            type     : 'candidate_request',
            title    : notifTitle,
            message  : notifMsg,
            link     : '/app/candidate-requests',
          });

          // Also send email to the requesting admin
          const requester = await User.findById(prevRequest.requestedBy).select('email name').lean();
          if (requester?.email && candidatesSubmitted) {
            const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
            const candidateRows = (r.submittedCandidates || []).map(c =>
              `<tr><td style="padding:8px 12px;border-bottom:1px solid #F1F5F9"><b>${c.name}</b></td><td style="padding:8px 12px;border-bottom:1px solid #F1F5F9">${c.email||'—'}</td><td style="padding:8px 12px;border-bottom:1px solid #F1F5F9">${c.phone||'—'}</td><td style="padding:8px 12px;border-bottom:1px solid #F1F5F9">${c.title||'—'}</td></tr>`
            ).join('');
            sendEmail(requester.email,
              `👥 Candidates Submitted for Your Request — ${prevRequest.roleTitle}`,
              `<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto">
                <div style="background:linear-gradient(135deg,#032D60,#0176D3);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
                  <div style="font-size:36px;margin-bottom:8px">👥</div>
                  <h1 style="color:#fff;margin:0;font-size:20px">Candidates Submitted!</h1>
                  <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">${prevRequest.roleTitle}</p>
                </div>
                <div style="background:#F8FAFC;padding:24px 32px;border-radius:0 0 12px 12px">
                  <p>Hi ${requester.name || 'there'},</p>
                  <p>The TalentNest team has submitted <b>${r.submittedCandidates?.length || 0} candidate(s)</b> for your staffing request:</p>
                  <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;margin:16px 0">
                    <thead><tr style="background:#F1F5F9">
                      <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151">Name</th>
                      <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151">Email</th>
                      <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151">Phone</th>
                      <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151">Title</th>
                    </tr></thead>
                    <tbody>${candidateRows}</tbody>
                  </table>
                  <div style="text-align:center;margin:24px 0">
                    <a href="${FRONTEND_URL}/app/candidate-requests" style="display:inline-block;background:#0176D3;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700">
                      View in Dashboard →
                    </a>
                  </div>
                </div>
              </div>`
            ).catch(() => {});
          }
        }
      } catch (notifErr) {
        console.warn('[CandidateRequest] Notification failed (non-critical):', notifErr.message);
      }
    }

    logger.audit('Candidate request updated', req.user.id, null, { requestId: r._id, status: updates.status });
    res.json({ success: true, data: normalize(r) });
  })
);

// POST /api/candidate-requests/:id/attach-candidates — super_admin attaches candidates
router.post('/:id/attach-candidates', ...guard, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const Notification = require('../models/Notification');
  const { candidateIds, note } = req.body;
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) throw new AppError('candidateIds array required.', 400);

  const cr = await CandidateRequest.findById(req.params.id);
  if (!cr) throw new AppError('Request not found.', 404);

  // Merge new candidates (avoid duplicates)
  const existing = new Set(cr.submittedCandidates.map(String));
  candidateIds.forEach(id => existing.add(String(id)));
  cr.submittedCandidates = [...existing];
  cr.status = 'in_progress';
  if (note) cr.adminNotes = note;
  await cr.save();

  // Notify requesting admin
  if (cr.requestedBy) {
    await Notification.create({
      userId  : cr.requestedBy,
      tenantId: cr.tenantId,
      type    : 'candidate_request',
      title   : '👥 Candidates Attached to Your Request',
      message : `TalentNest HR has attached ${candidateIds.length} candidate(s) to your request "${cr.roleTitle}".`,
      link    : '/app/candidate-requests',
    }).catch(() => {});
  }

  const populated = await CandidateRequest.findById(cr._id)
    .populate('submittedCandidates', 'name email phone title skills location experience').lean();
  res.json({ success: true, data: { ...populated, id: populated._id?.toString() } });
}));

// GET /api/candidate-requests/:id/suggested-candidates — matching engine suggestions
router.get('/:id/suggested-candidates', ...guard, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const { findSuggestedCandidates } = require('../utils/candidateMatchingEngine');
  const cr = await CandidateRequest.findById(req.params.id).lean();
  if (!cr) throw new AppError('Request not found.', 404);

  const jobSnapshot = {
    title          : cr.roleTitle || '',
    skills         : Array.isArray(cr.skills) ? cr.skills : [],
    experienceLevel: cr.experienceLevel || '',
    location       : cr.location || '',
    jobType        : cr.jobType || '',
  };

  const candidates = await findSuggestedCandidates(jobSnapshot, cr.tenantId);
  res.json({ success: true, data: candidates });
}));

// DELETE /api/candidate-requests/:id — cancel
router.delete('/:id', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const r = await CandidateRequest.findByIdAndUpdate(
      req.params.id, { $set: { status: 'cancelled' } }, { new: true }
    );
    if (!r) throw new AppError('Request not found.', 404);
    res.json({ success: true, message: 'Request cancelled.' });
  })
);

module.exports = router;
