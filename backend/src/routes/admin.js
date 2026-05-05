'use strict';
const express        = require('express');
const router         = express.Router();
const bcrypt         = require('bcryptjs');
const User           = require('../models/User');
const Job            = require('../models/Job');
const Application    = require('../models/Application');
const Organization   = require('../models/Organization');
const WorkflowRule   = require('../models/WorkflowRule');
const { authenticate }                      = require('../middleware/auth');
const { allowRoles }                       = require('../middleware/rbac');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard }    = require('../middleware/tenantGuard');
const { evaluateWorkflows } = require('../services/workflowEngine');
const { generateInviteToken, hashToken, getInviteExpiry } = require('../utils/inviteToken');
const templates                             = require('../utils/emailTemplates');
const { sendEmailWithRetry }                = require('../utils/email');
const asyncHandler                          = require('../utils/asyncHandler');
const AppError                              = require('../utils/AppError');
const logger                                = require('../middleware/logger');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';

/** Build a set-password invite link */
function buildInviteLink(token, email) {
  return `${FRONTEND_URL}/set-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

/** Shared logic: create an invited user and send the right email */
async function createAndInviteUser({ name, email, phone, jobTitle, role, orgId, invitedBy, useTemporaryPassword }) {
  const cleanEmail = email.toLowerCase().trim();

  const existing = await User.findOne({ email: cleanEmail });
  if (existing) throw new AppError('A user with this email already exists.', 409);

  const TEMP_PWD  = 'TalentNest@2024';
  const rawToken  = generateInviteToken();
  const tokenHash = hashToken(rawToken);
  const expiry    = getInviteExpiry(7);

  const user = await User.create({
    name: name.trim(),
    email: cleanEmail,
    phone: phone || '',
    jobTitle: jobTitle || '',
    role,
    orgId,
    password: bcrypt.hashSync(TEMP_PWD, 12),
    resetPasswordToken: tokenHash,
    resetPasswordExpires: expiry,
    isActive: false,
    inviteStatus: 'pending',
    mustChangePassword: true,
    invitedBy,
    invitedAt: new Date(),
    temporaryPassword: useTemporaryPassword ? TEMP_PWD : null,
  });

  const org = await Organization.findById(orgId).select('name').lean();
  const orgName = org?.name || 'TalentNest HR';
  const emailOpts = { orgId: orgId?.toString(), orgName };

  if (useTemporaryPassword) {
    const tpl = templates.tempPassword(name.trim(), cleanEmail, TEMP_PWD, emailOpts);
    sendEmailWithRetry(cleanEmail, tpl.subject, tpl.html).catch(err =>
      logger.error('Temp-password email failed', { to: cleanEmail, err: err.message })
    );
  } else {
    const inviterUser = await User.findById(invitedBy).select('name').lean();
    const link = buildInviteLink(rawToken, cleanEmail);
    const tpl  = templates.invite(name.trim(), role, orgName, link, inviterUser?.name || 'TalentNest Admin', emailOpts);
    sendEmailWithRetry(cleanEmail, tpl.subject, tpl.html).catch(err =>
      logger.error('Invite email failed', { to: cleanEmail, err: err.message })
    );
  }

  return user;
}

// POST /api/admin/invite-admin — super_admin invites a new admin
router.post('/invite-admin', authenticate, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const { name, email, phone, jobTitle, orgId, useTemporaryPassword = false } = req.body;
  if (!name || !email || !orgId) throw new AppError('name, email and orgId are required.', 400);

  const user = await createAndInviteUser({
    name, email, phone, jobTitle, role: 'admin', orgId,
    invitedBy: req.user._id, useTemporaryPassword
  });

  logger.audit(`Super Admin invited ${email} as admin`, req.user._id, orgId, { userId: user._id });
  res.status(201).json({ success: true, message: `Invitation sent to ${email}`, userId: user._id });
}));

// POST /api/admin/invite-recruiter — super_admin or admin invites a recruiter
router.post('/invite-recruiter', authenticate, allowRoles('super_admin', 'admin'), asyncHandler(async (req, res) => {
  const { name, email, phone, jobTitle, orgId, useTemporaryPassword = false } = req.body;
  if (!name || !email || !orgId) throw new AppError('name, email and orgId are required.', 400);

  const effectiveOrgId = req.user.role === 'super_admin' ? orgId : req.user.orgId;

  const user = await createAndInviteUser({
    name, email, phone, jobTitle, role: 'recruiter', orgId: effectiveOrgId,
    invitedBy: req.user._id, useTemporaryPassword
  });

  logger.audit(`Invited ${email} as recruiter`, req.user._id, effectiveOrgId, { userId: user._id });
  res.status(201).json({ success: true, message: `Invitation sent to ${email}`, userId: user._id });
}));

// POST /api/admin/resend-invite — regenerate token and resend invite email
router.post('/resend-invite', authenticate, allowRoles('super_admin', 'admin'), asyncHandler(async (req, res) => {
  const { userId } = req.body;
  if (!userId) throw new AppError('userId is required.', 400);

  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found.', 404);
  if (user.inviteStatus === 'accepted') throw new AppError('User has already accepted the invite.', 400);

  const rawToken  = generateInviteToken();
  user.resetPasswordToken   = hashToken(rawToken);
  user.resetPasswordExpires = getInviteExpiry(7);
  user.inviteStatus = 'pending';
  await user.save();

  const org         = await Organization.findById(user.orgId).select('name').lean();
  const inviterUser = await User.findById(req.user._id).select('name').lean();
  const link        = buildInviteLink(rawToken, user.email);
  const tpl         = templates.invite(user.name, user.role, org?.name || 'TalentNest HR', link, inviterUser?.name || 'TalentNest Admin', { orgId: user.orgId?.toString(), orgName: org?.name });

  sendEmailWithRetry(user.email, tpl.subject, tpl.html).catch(err =>
    logger.error('Resend invite email failed', { to: user.email, err: err.message })
  );

  logger.audit(`Resent invite to ${user.email}`, req.user._id, user.orgId, { userId });
  res.json({ success: true, message: `Invite resent to ${user.email}` });
}));

// DELETE /api/admin/revoke-invite/:userId — revoke a pending invite (hard-deletes the unactivated user)
router.delete('/revoke-invite/:userId', authenticate, allowRoles('super_admin', 'admin'), asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) throw new AppError('User not found.', 404);
  if (user.inviteStatus === 'accepted') throw new AppError('Cannot revoke — user has already accepted.', 400);

  await User.findByIdAndDelete(req.params.userId);
  logger.audit(`Revoked invite for ${user.email}`, req.user._id, user.orgId, { userId: req.params.userId });
  res.json({ success: true, message: `Invite revoked for ${user.email}` });
}));

// GET /api/admin/pending-invites — list pending invites for this org
router.get('/pending-invites', authenticate, allowRoles('super_admin', 'admin'), asyncHandler(async (req, res) => {
  const filter = { inviteStatus: 'pending', isActive: false };
  if (req.user.role === 'admin') filter.tenantId = req.user.tenantId;

  const users = await User.find(filter)
    .select('name email role inviteStatus invitedBy invitedAt resetPasswordExpires tenantId')
    .populate('invitedBy', 'name')
    .sort({ invitedAt: -1 })
    .lean();

  const now    = new Date();
  const result = users.map(u => ({
    ...u,
    id: u._id.toString(),
    isExpired: u.resetPasswordExpires ? u.resetPasswordExpires < now : false,
  }));

  res.json({ success: true, data: result });
}));

// ── Workflow Rules CRUD ────────────────────────────────────────────────────────
const wfGuard = [authMiddleware, tenantGuard, allowRoles('admin', 'super_admin')];

// GET /api/admin/workflow-rules
router.get('/workflow-rules', ...wfGuard, asyncHandler(async (req, res) => {
  const rules = await WorkflowRule.find({ tenantId: req.user.tenantId })
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .lean();
  const data = rules.map(r => ({ ...r, id: r._id.toString() }));
  res.json({ success: true, data, total: data.length });
}));

// POST /api/admin/workflow-rules
router.post('/workflow-rules', ...wfGuard, asyncHandler(async (req, res) => {
  const { name, trigger, actions, isActive } = req.body;
  if (!name || !trigger?.event) throw new AppError('name and trigger.event are required.', 400);
  const rule = await WorkflowRule.create({
    tenantId : req.user.tenantId,
    name, trigger, actions: actions || [],
    isActive : isActive !== false,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: { ...rule.toObject(), id: rule._id.toString() } });
}));

// PATCH /api/admin/workflow-rules/:id
router.patch('/workflow-rules/:id', ...wfGuard, asyncHandler(async (req, res) => {
  const rule = await WorkflowRule.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!rule) throw new AppError('Workflow rule not found.', 404);
  const allowed = ['name', 'trigger', 'actions', 'isActive'];
  allowed.forEach(k => { if (req.body[k] !== undefined) rule[k] = req.body[k]; });
  await rule.save();
  res.json({ success: true, data: { ...rule.toObject(), id: rule._id.toString() } });
}));

// DELETE /api/admin/workflow-rules/:id
router.delete('/workflow-rules/:id', ...wfGuard, asyncHandler(async (req, res) => {
  const rule = await WorkflowRule.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!rule) throw new AppError('Workflow rule not found.', 404);
  res.json({ success: true, message: 'Workflow rule deleted.' });
}));

// POST /api/admin/workflow-rules/:id/test — dry-run, returns which rules matched without executing
router.post('/workflow-rules/:id/test', ...wfGuard, asyncHandler(async (req, res) => {
  const rule = await WorkflowRule.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).lean();
  if (!rule) throw new AppError('Workflow rule not found.', 404);
  const sampleEventData = {
    event          : rule.trigger.event,
    tenantId       : req.user.tenantId,
    stage          : 'Shortlisted',
    candidateName  : 'Sample Candidate',
    candidateEmail : 'sample@example.com',
    candidatePhone : '9999999999',
    candidateSource: 'career_page',
    jobTitle       : 'Sample Role',
    assessmentScore: 75,
    ...(req.body.eventData || {}),
  };
  const result = await evaluateWorkflows(req.user.tenantId, sampleEventData, true);
  res.json({ success: true, matched: result.triggered > 0, ruleIds: result.ruleIds || [], sampleEventData });
}));

// Stage priority — higher = further in pipeline (never downgrade a candidate)
const STAGE_PRIORITY = {
  'Applied': 1, 'Screening': 2, 'Shortlisted': 3,
  'Interview Round 1': 4, 'Interview Round 2': 5,
  'Offer': 6, 'Hired': 7, 'Rejected': 0,
};

/**
 * Merge two applications for the same candidate into one, preserving all data.
 * Keeps the application with the better pipeline stage.
 * Never downgrades a candidate or loses interview/offer history.
 */
async function mergeApplications(winnerId, loserId) {
  const [winnerApp, loserApp] = await Promise.all([
    Application.findById(winnerId),
    Application.findById(loserId),
  ]);
  if (!winnerApp || !loserApp) return;

  const winStage  = STAGE_PRIORITY[winnerApp.currentStage] ?? 0;
  const losStage  = STAGE_PRIORITY[loserApp.currentStage]  ?? 0;

  // Merge stage history (deduplicate by stage+timestamp)
  const allHistory = [...(winnerApp.stageHistory || []), ...(loserApp.stageHistory || [])];
  const seenStages = new Set();
  const mergedHistory = allHistory
    .sort((a, b) => new Date(a.movedAt) - new Date(b.movedAt))
    .filter(h => {
      const key = `${h.stage}_${new Date(h.movedAt).getTime()}`;
      if (seenStages.has(key)) return false;
      seenStages.add(key);
      return true;
    });

  // Merge interview rounds (deduplicate by scheduledAt)
  const allInterviews = [...(winnerApp.interviewRounds || []), ...(loserApp.interviewRounds || [])];
  const seenInterviews = new Set();
  const mergedInterviews = allInterviews.filter(r => {
    const key = new Date(r.scheduledAt).getTime();
    if (seenInterviews.has(key)) return false;
    seenInterviews.add(key);
    return true;
  });

  // Build merged update — use better stage, prefer non-null fields from either app
  const update = {
    stageHistory   : mergedHistory,
    interviewRounds: mergedInterviews,
    // Use better stage
    currentStage   : losStage > winStage ? loserApp.currentStage : winnerApp.currentStage,
    // Prefer offer details from whichever app has them
    offerDetails   : winnerApp.offerDetails || loserApp.offerDetails,
    // Merge notes
    notes          : [winnerApp.notes, loserApp.notes].filter(Boolean).join(' | ') || undefined,
    // Keep best AI score
    aiMatchScore   : Math.max(winnerApp.aiMatchScore || 0, loserApp.aiMatchScore || 0) || undefined,
    // Keep rejection reason if either was rejected
    rejectionReason: winnerApp.rejectionReason || loserApp.rejectionReason,
  };

  await Application.findByIdAndUpdate(winnerId, { $set: update });
  // Soft-delete the loser (data is now merged into winner)
  await Application.findByIdAndUpdate(loserId, { $set: { deletedAt: new Date() } });
}

// POST /api/admin/deduplicate-jobs — safe FAST merge using bulkWrite (no N+1 queries)
router.post('/deduplicate-jobs', authenticate, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const orgs = await Organization.find({}).select('_id name').lean();
  const summary = [];
  let totalMergedApps = 0;
  const now = new Date();

  for (const org of orgs) {
    const jobs = await Job.find({ tenantId: org._id, deletedAt: null }).lean();
    const groups = {};
    for (const j of jobs) {
      if (!j.title) continue;
      const key = `${j.title.toLowerCase().trim().replace(/\s+/g,' ')}__${(j.location||'').toLowerCase().trim().replace(/,.*$/,'').trim()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(j);
    }

    // Collect all loser job IDs across this org for bulk close
    const loserJobIds = [];
    let merged = 0;

    for (const key in groups) {
      const list = groups[key];
      if (list.length <= 1) continue;

      // Pick winner: careerPageSlug > active > most apps > oldest
      const counts = await Promise.all(list.map(j => Application.countDocuments({ jobId: j._id, deletedAt: null })));
      list.forEach((j, i) => { j._c = counts[i]; });
      list.sort((a, b) => {
        if (a.careerPageSlug && !b.careerPageSlug) return -1;
        if (!a.careerPageSlug && b.careerPageSlug) return 1;
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        return b._c - a._c || new Date(a.createdAt) - new Date(b.createdAt);
      });

      const winner  = list[0];
      const losers  = list.slice(1);
      const loserIds = losers.map(l => l._id);
      loserJobIds.push(...loserIds);

      // BATCH: get ALL applications for all loser jobs in one query
      const loserApps = await Application.find({ jobId: { $in: loserIds }, deletedAt: null })
        .select('_id candidateId jobId currentStage stageHistory interviewRounds offerDetails notes aiMatchScore rejectionReason').lean();

      if (loserApps.length === 0) { merged += losers.length; continue; }

      // BATCH: get ALL existing winner applications in one query
      const loserCandidateIds = [...new Set(loserApps.map(a => String(a.candidateId)))];
      const existingWinnerApps = await Application.find({
        jobId: winner._id,
        candidateId: { $in: loserCandidateIds },
      }).select('_id candidateId currentStage stageHistory interviewRounds').lean();

      const winnerByCandidateId = new Map(existingWinnerApps.map(a => [String(a.candidateId), a]));

      // Separate conflicts from clean re-points
      const rePointOps    = [];  // no conflict — just change jobId
      const softDeleteIds = [];  // conflicts — soft-delete loser

      for (const loserApp of loserApps) {
        const cidStr = String(loserApp.candidateId);
        const winnerApp = winnerByCandidateId.get(cidStr);

        if (winnerApp) {
          // Conflict — merge data, soft-delete loser (no jobId change)
          const winStage = STAGE_PRIORITY[winnerApp.currentStage] ?? 0;
          const losStage = STAGE_PRIORITY[loserApp.currentStage]  ?? 0;
          const mergedHistory = [...(winnerApp.stageHistory||[]), ...(loserApp.stageHistory||[])]
            .sort((a,b) => new Date(a.movedAt) - new Date(b.movedAt))
            .filter((h, idx, arr) => idx === arr.findIndex(x => x.stage === h.stage && String(x.movedAt) === String(h.movedAt)));
          rePointOps.push({ updateOne: { filter: { _id: winnerApp._id }, update: { $set: {
            currentStage: losStage > winStage ? loserApp.currentStage : winnerApp.currentStage,
            stageHistory: mergedHistory,
          }}}});
          softDeleteIds.push(loserApp._id);
        } else {
          // No conflict — re-point to winner job
          rePointOps.push({ updateOne: { filter: { _id: loserApp._id }, update: { $set: { jobId: winner._id }}}});
        }
        totalMergedApps++;
      }

      // Execute all app updates in one bulkWrite (fast!)
      if (rePointOps.length > 0) await Application.bulkWrite(rePointOps, { ordered: false });
      if (softDeleteIds.length > 0) await Application.updateMany({ _id: { $in: softDeleteIds } }, { $set: { deletedAt: now }});

      merged += losers.length;
    }

    // Bulk close all loser jobs at once
    if (loserJobIds.length > 0) {
      await Job.updateMany({ _id: { $in: loserJobIds } }, { $set: { deletedAt: now, status: 'closed' }});
    }

    if (merged > 0) summary.push(`${org.name}: ${merged} duplicate jobs merged, ${totalMergedApps} applications consolidated`);
  }

  res.json({
    success: true,
    summary,
    totalMergedApps,
    message: summary.length ? summary.join(' | ') : 'No duplicate jobs found',
  });
}));

module.exports = router;
