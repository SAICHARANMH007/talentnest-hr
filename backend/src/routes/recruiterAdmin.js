'use strict';
const express     = require('express');
const router      = express.Router();
const bcrypt      = require('bcryptjs');
const User        = require('../models/User');
const Job         = require('../models/Job');
const Application = require('../models/Application');
const { authenticate }                      = require('../middleware/auth');
const { allowRoles }                       = require('../middleware/rbac');
const { generateInviteToken, hashToken, getInviteExpiry } = require('../utils/inviteToken');
const templates                             = require('../utils/emailTemplates');
const { sendEmailWithRetry }                = require('../utils/email');
const asyncHandler                          = require('../utils/asyncHandler');
const AppError                              = require('../utils/AppError');
const logger                                = require('../middleware/logger');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';

// POST /api/recruiter/invite-candidate
router.post('/invite-candidate', authenticate, allowRoles('super_admin', 'admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { name, email, phone, jobId } = req.body;
  if (!name || !email || !jobId) throw new AppError('name, email and jobId are required.', 400);

  const effectiveTenantId = req.user.tenantId;
  if (!effectiveTenantId) throw new AppError('Tenant context missing from token.', 400);

  const job = await Job.findById(jobId).lean();
  if (!job) throw new AppError('Job not found.', 404);

  const cleanEmail = email.toLowerCase().trim();
  let user   = await User.findOne({ email: cleanEmail });
  let isNew  = false;

  if (!user) {
    const rawToken  = generateInviteToken();
    const tokenHash = hashToken(rawToken);

    user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone || '',
      role: 'candidate',
      tenantId: effectiveTenantId,
      passwordHash: bcrypt.hashSync('TalentNest@2024', 12),
      resetPasswordToken: tokenHash,
      resetPasswordExpires: getInviteExpiry(7),
      isActive: false,
      mustChangePassword: true,
    });
    isNew = true;

    // Send branded candidate invite email
    const inviteLink = `${FRONTEND_URL}/set-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(cleanEmail)}`;
    const tpl = templates.candidateInvite
      ? templates.candidateInvite({
          name: name.trim(),
          recruiterName: req.user.name || 'A Recruiter',
          jobTitle: job.title,
          orgName: job.companyName || 'TalentNest Partner',
          location: job.location || 'Flexible',
          type: job.type || 'Full-time',
          link: inviteLink,
          message: '',
          orgId: req.user.orgId?.toString(),
        })
      : templates.invite(name.trim(), 'candidate', 'TalentNest Partner', inviteLink, req.user.name || 'A Recruiter', { orgId: req.user.orgId?.toString() });
    sendEmailWithRetry(cleanEmail, tpl.subject, tpl.html).catch(err =>
      logger.error('Candidate invite email failed', { to: cleanEmail, err: err.message })
    );
  }

  // Create application if one doesn't already exist
  const existingApp = await Application.findOne({ jobId, candidateId: user._id });
  let app = existingApp;
  if (!existingApp) {
    app = await Application.create({
      jobId,
      candidateId: user._id,
      tenantId: effectiveTenantId,
      currentStage: 'Applied',
      stageHistory: [{
        stage: 'Applied',
        movedAt: new Date(),
        movedBy: req.user._id,
        notes: 'Invited by recruiter',
      }],
    });
    await Job.findByIdAndUpdate(jobId, { $inc: { applicationCount: 1 } });
  }

  logger.audit(`Invited candidate ${cleanEmail} to ${job.title}`, req.user._id, effectiveTenantId, { userId: user._id, jobId });
  res.status(201).json({ success: true, message: 'Candidate invited successfully', isNew, applicationId: app._id });
}));

module.exports = router;
