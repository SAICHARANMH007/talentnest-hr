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
const { sendEmailWithRetry, sendOrgEmail }  = require('../utils/email');
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
    tenantId: orgId,
    passwordHash: bcrypt.hashSync(TEMP_PWD, 12),
    resetPasswordToken: tokenHash,
    resetPasswordExpires: expiry,
    isActive: false,
    inviteStatus: 'pending',
    mustChangePassword: true,
    invitedBy,
    invitedAt: new Date(),
  });

  const org = await Organization.findById(orgId).select('name settings website').lean();
  const orgName   = org?.name || 'TalentNest HR';
  const emailCfg  = org?.settings?.emailSettings || {};
  // Pass branding settings to email templates so colors/footer reflect org config
  const emailOpts = {
    orgId        : orgId?.toString(),
    orgName,
    brandColor   : emailCfg.brandColor    || '#032D60',
    accentColor  : emailCfg.accentColor   || '#0176D3',
    headerSubtitle: emailCfg.headerSubtitle || 'PROFESSIONAL RECRUITMENT CLOUD',
    footerText   : emailCfg.footerText    || '',
    supportEmail : emailCfg.supportEmail  || emailCfg.fromEmail || '',
    website      : emailCfg.website       || org?.website       || '',
  };

  if (useTemporaryPassword) {
    const tpl = templates.tempPassword(name.trim(), cleanEmail, TEMP_PWD, emailOpts);
    // sendOrgEmail uses the org's own Resend/SMTP config if configured, else platform default
    sendOrgEmail(cleanEmail, tpl.subject, tpl.html, orgId).catch(err =>
      logger.error('Temp-password email failed', { to: cleanEmail, err: err.message })
    );
  } else {
    const inviterUser = await User.findById(invitedBy).select('name').lean();
    const link = buildInviteLink(rawToken, cleanEmail);
    const tpl  = templates.invite(name.trim(), role, orgName, link, inviterUser?.name || 'TalentNest Admin', emailOpts);
    sendOrgEmail(cleanEmail, tpl.subject, tpl.html, orgId).catch(err =>
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

  const userFilter = { _id: userId };
  if (req.user.role !== 'super_admin') userFilter.tenantId = req.user.tenantId;
  const user = await User.findOne(userFilter);
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

  sendOrgEmail(user.email, tpl.subject, tpl.html, user.orgId).catch(err =>
    logger.error('Resend invite email failed', { to: user.email, err: err.message })
  );

  logger.audit(`Resent invite to ${user.email}`, req.user._id, user.orgId, { userId });
  res.json({ success: true, message: `Invite resent to ${user.email}` });
}));

// DELETE /api/admin/revoke-invite/:userId — revoke a pending invite (hard-deletes the unactivated user)
router.delete('/revoke-invite/:userId', authenticate, allowRoles('super_admin', 'admin'), asyncHandler(async (req, res) => {
  const userFilter = { _id: req.params.userId };
  if (req.user.role !== 'super_admin') userFilter.tenantId = req.user.tenantId;
  const user = await User.findOne(userFilter);
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
// Returns org's custom rules + system templates with activation status
router.get('/workflow-rules', ...wfGuard, asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const [customRules, systemTemplates, orgCopies] = await Promise.all([
    WorkflowRule.find({ tenantId, isSystemCopy: { $ne: true } })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean(),
    WorkflowRule.find({ isSystem: true })
      .select('name description category trigger actions isActive systemKey triggerCount lastTriggeredAt createdAt')
      .sort({ category: 1, name: 1 })
      .lean(),
    WorkflowRule.find({ tenantId, isSystemCopy: true })
      .select('systemKey isActive triggerCount lastTriggeredAt')
      .lean(),
  ]);
  const orgCopyMap = Object.fromEntries(orgCopies.map(c => [c.systemKey, { ...c, id: c._id.toString() }]));
  const sysWithStatus = systemTemplates.map(t => ({
    ...t, id: t._id.toString(),
    activated: Boolean(orgCopyMap[t.systemKey]),
    orgCopy  : orgCopyMap[t.systemKey] || null,
  }));
  const data = customRules.map(r => ({ ...r, id: r._id.toString() }));
  res.json({ success: true, data, systemTemplates: sysWithStatus, total: data.length });
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

// ── System Automation Templates (super_admin only) ─────────────────────────────
const saGuard = [authMiddleware, allowRoles('super_admin')];

// GET /api/admin/workflow-rules/system — list all system templates
router.get('/workflow-rules/system', ...saGuard, asyncHandler(async (req, res) => {
  const templates = await WorkflowRule.find({ isSystem: true })
    .populate('createdBy', 'name')
    .sort({ category: 1, name: 1 })
    .lean();
  const keys = templates.map(t => t.systemKey).filter(Boolean);
  const stats = await WorkflowRule.aggregate([
    { $match: { isSystemCopy: true, systemKey: { $in: keys } } },
    { $group: { _id: '$systemKey', orgCount: { $sum: 1 }, totalTriggers: { $sum: '$triggerCount' } } },
  ]);
  const statsMap = Object.fromEntries(stats.map(s => [s._id, s]));
  const data = templates.map(t => ({
    ...t, id: t._id.toString(),
    orgCount     : statsMap[t.systemKey]?.orgCount     || 0,
    totalTriggers: statsMap[t.systemKey]?.totalTriggers || 0,
  }));
  res.json({ success: true, data, total: data.length });
}));

// POST /api/admin/workflow-rules/system — create system template
router.post('/workflow-rules/system', ...saGuard, asyncHandler(async (req, res) => {
  const { name, description, category, trigger, actions, systemKey, isActive } = req.body;
  if (!name || !trigger?.event) throw new AppError('name and trigger.event are required.', 400);
  if (!systemKey) throw new AppError('systemKey is required for system templates.', 400);
  const exists = await WorkflowRule.findOne({ isSystem: true, systemKey });
  if (exists) throw new AppError(`System template with key "${systemKey}" already exists.`, 409);
  const rule = await WorkflowRule.create({
    tenantId: null, isSystem: true, isSystemCopy: false,
    systemKey, name, description: description || '',
    category: category || 'General',
    trigger, actions: actions || [],
    isActive: isActive !== false,
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: { ...rule.toObject(), id: rule._id.toString() } });
}));

// PATCH /api/admin/workflow-rules/system/:id — update system template
router.patch('/workflow-rules/system/:id', ...saGuard, asyncHandler(async (req, res) => {
  const rule = await WorkflowRule.findOne({ _id: req.params.id, isSystem: true });
  if (!rule) throw new AppError('System template not found.', 404);
  ['name', 'description', 'category', 'trigger', 'actions', 'isActive'].forEach(k => {
    if (req.body[k] !== undefined) rule[k] = req.body[k];
  });
  await rule.save();
  res.json({ success: true, data: { ...rule.toObject(), id: rule._id.toString() } });
}));

// DELETE /api/admin/workflow-rules/system/:id — delete system template + all org copies
router.delete('/workflow-rules/system/:id', ...saGuard, asyncHandler(async (req, res) => {
  const rule = await WorkflowRule.findOneAndDelete({ _id: req.params.id, isSystem: true });
  if (!rule) throw new AppError('System template not found.', 404);
  if (rule.systemKey) await WorkflowRule.deleteMany({ isSystemCopy: true, systemKey: rule.systemKey });
  res.json({ success: true, message: 'System template and all org copies deleted.' });
}));

// POST /api/admin/workflow-rules/seed-system — seed 10 platform-level automation templates
router.post('/workflow-rules/seed-system', ...saGuard, asyncHandler(async (req, res) => {
  const TEMPLATES = [
    {
      systemKey: 'welcome_on_apply',
      name: 'Welcome Candidate on Application',
      description: 'Automatically send a warm welcome email when a candidate applies for any job.',
      category: 'Communication',
      trigger: { event: 'candidate_applied', conditions: [] },
      actions: [{ type: 'send_email', config: { subject: 'Application Received — {{job_title}}', body: 'Hi {{candidate_name}}, thank you for applying to {{job_title}} at {{company_name}}. We have received your application and will review it shortly.' }, delayMinutes: 0 }],
    },
    {
      systemKey: 'notify_recruiter_new_application',
      name: 'Notify Recruiter on New Application',
      description: 'Alert the assigned recruiter immediately when a candidate applies.',
      category: 'Pipeline',
      trigger: { event: 'candidate_applied', conditions: [] },
      actions: [{ type: 'notify_recruiter', config: { message: 'New application received for {{job_title}} from {{candidate_name}}.' }, delayMinutes: 0 }],
    },
    {
      systemKey: 'interview_scheduled_confirmation',
      name: 'Interview Confirmation to Candidate',
      description: 'Send confirmation email to candidate when an interview is scheduled.',
      category: 'Communication',
      trigger: { event: 'interview_scheduled', conditions: [] },
      actions: [{ type: 'send_email', config: { subject: 'Interview Confirmed — {{job_title}}', body: 'Hi {{candidate_name}}, your interview for {{job_title}} has been confirmed. We look forward to meeting you!' }, delayMinutes: 0 }],
    },
    {
      systemKey: 'candidate_hired_onboarding',
      name: 'Trigger Onboarding on Hire',
      description: 'Automatically notify admin and send a congratulations email when a candidate is marked hired.',
      category: 'Onboarding',
      trigger: { event: 'candidate_hired', conditions: [] },
      actions: [
        { type: 'send_email', config: { subject: 'Welcome to the team, {{candidate_name}}!', body: 'Congratulations on joining {{company_name}}! Your onboarding details will be shared shortly.' }, delayMinutes: 0 },
        { type: 'notify_admin', config: { message: '{{candidate_name}} has been hired for {{job_title}}. Please initiate onboarding.' }, delayMinutes: 0 },
      ],
    },
    {
      systemKey: 'candidate_rejected_feedback',
      name: 'Rejection with Feedback',
      description: 'Send a professional rejection email with feedback when a candidate is rejected.',
      category: 'Communication',
      trigger: { event: 'candidate_rejected', conditions: [] },
      actions: [{ type: 'send_email', config: { subject: 'Update on your application for {{job_title}}', body: 'Hi {{candidate_name}}, thank you for your interest in {{job_title}}. After careful consideration, we have decided to move forward with other candidates. We appreciate the time you invested and encourage you to apply for future openings.' }, delayMinutes: 30 }],
    },
    {
      systemKey: 'offer_followup_unsigned',
      name: 'Follow Up on Unsigned Offer',
      description: 'Remind the candidate to sign their offer letter if it has not been signed within 48 hours.',
      category: 'Offer',
      trigger: { event: 'offer_not_signed', conditions: [] },
      actions: [
        { type: 'send_email', config: { subject: 'Action Required — Your Offer Letter', body: 'Hi {{candidate_name}}, we noticed your offer letter for {{job_title}} is still pending signature. Please sign it at your earliest convenience or contact us if you have any questions.' }, delayMinutes: 0 },
        { type: 'notify_recruiter', config: { message: 'Offer for {{candidate_name}} ({{job_title}}) has not been signed. Please follow up.' }, delayMinutes: 0 },
      ],
    },
    {
      systemKey: 'assessment_completed_notify',
      name: 'Notify on Assessment Completion',
      description: 'Alert recruiter when a candidate completes their assessment.',
      category: 'Assessment',
      trigger: { event: 'assessment_completed', conditions: [] },
      actions: [{ type: 'notify_recruiter', config: { message: '{{candidate_name}} has completed the assessment for {{job_title}}. Review their results in the pipeline.' }, delayMinutes: 0 }],
    },
    {
      systemKey: 'stuck_candidate_alert',
      name: 'Alert on Stuck Candidate',
      description: 'Notify recruiter when a candidate has been in the same stage for too long without progress.',
      category: 'Pipeline',
      trigger: { event: 'candidate_stuck', conditions: [] },
      actions: [
        { type: 'notify_recruiter', config: { message: '{{candidate_name}} has been in {{stage_name}} for over 7 days. Please take action.' }, delayMinutes: 0 },
        { type: 'create_task', config: { title: 'Review stuck candidate', description: '{{candidate_name}} needs attention in {{stage_name}} stage.' }, delayMinutes: 0 },
      ],
    },
    {
      systemKey: 'job_published_announcement',
      name: 'Internal Announcement on Job Publish',
      description: 'Notify the admin team when a new job is published so they can promote it.',
      category: 'Pipeline',
      trigger: { event: 'job_published', conditions: [] },
      actions: [{ type: 'notify_admin', config: { message: 'New job published: {{job_title}}. Share it externally to attract candidates.' }, delayMinutes: 0 }],
    },
    {
      systemKey: 'offer_accepted_congrats',
      name: 'Celebrate Offer Acceptance',
      description: 'Send a celebratory email and notify admin when an offer is accepted.',
      category: 'Offer',
      trigger: { event: 'offer_accepted', conditions: [] },
      actions: [
        { type: 'send_email', config: { subject: '🎉 Offer Accepted — {{job_title}}', body: 'Hi {{candidate_name}}, we are thrilled you have accepted the offer! Welcome to {{company_name}}. Our team will be in touch soon with your next steps.' }, delayMinutes: 0 },
        { type: 'notify_admin', config: { message: '{{candidate_name}} accepted the offer for {{job_title}}. Trigger onboarding.' }, delayMinutes: 0 },
      ],
    },
  ];

  const created = [];
  const skipped = [];
  const createdBy = req.user._id;

  for (const tmpl of TEMPLATES) {
    const exists = await WorkflowRule.findOne({ isSystem: true, systemKey: tmpl.systemKey });
    if (exists) { skipped.push(tmpl.systemKey); continue; }
    await WorkflowRule.create({ tenantId: null, isSystem: true, isSystemCopy: false, isActive: true, createdBy, ...tmpl });
    created.push(tmpl.systemKey);
  }

  res.json({ success: true, created: created.length, skipped: skipped.length, message: `${created.length} templates created, ${skipped.length} already existed.` });
}));

// ── Org activation / deactivation of system automations ────────────────────────

// POST /api/admin/workflow-rules/activate/:systemKey — create org copy from template
router.post('/workflow-rules/activate/:systemKey', ...wfGuard, asyncHandler(async (req, res) => {
  const { systemKey } = req.params;
  const tenantId = req.user.tenantId;
  const template = await WorkflowRule.findOne({ isSystem: true, systemKey }).lean();
  if (!template) throw new AppError('System template not found.', 404);
  const existing = await WorkflowRule.findOne({ isSystemCopy: true, systemKey, tenantId });
  if (existing) return res.json({ success: true, data: { ...existing.toObject(), id: existing._id.toString() }, message: 'Already activated.' });
  const copy = await WorkflowRule.create({
    tenantId, isSystem: false, isSystemCopy: true, systemKey,
    name: template.name, description: template.description,
    category: template.category, trigger: template.trigger, actions: template.actions,
    isActive: true, createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: { ...copy.toObject(), id: copy._id.toString() } });
}));

// DELETE /api/admin/workflow-rules/deactivate/:systemKey — remove org's activated copy
router.delete('/workflow-rules/deactivate/:systemKey', ...wfGuard, asyncHandler(async (req, res) => {
  const { systemKey } = req.params;
  const tenantId = req.user.tenantId;
  const deleted = await WorkflowRule.findOneAndDelete({ isSystemCopy: true, systemKey, tenantId });
  if (!deleted) throw new AppError('No activated copy found for this template.', 404);
  res.json({ success: true, message: 'System automation deactivated.' });
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
