'use strict';
const express = require('express');
const router = express.Router();
const ImportedCandidate = require('../models/ImportedCandidate');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard } = require('../middleware/tenantGuard');
const { allowRoles } = require('../middleware/rbac');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const logger = require('../middleware/logger');
const { sendEmailWithRetry } = require('../utils/email');

const guard = [authMiddleware, tenantGuard];

/**
 * Deep Scan Logic: Extracts Email and Name from a clumsy row of data
 */
function deepScanRow(rowData) {
  const values = Object.values(rowData);
  let foundEmail = null;
  let foundName = null;

  // 1. Universal Email Extraction (Regex)
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  for (const val of values) {
    if (typeof val === 'string') {
      const match = val.match(emailRegex);
      if (match) {
        foundEmail = match[0].toLowerCase().trim();
        break;
      }
    }
  }

  // 2. Prioritized Name Detection
  const nameHeaders = ['name', 'full name', 'candidate name', 'firstname', 'lastname', 'first name', 'last name', 'candidate'];
  const keys = Object.keys(rowData);
  for (const key of keys) {
    const k = key.toLowerCase().trim();
    if (nameHeaders.some(h => k.includes(h))) {
      foundName = rowData[key];
      break;
    }
  }

  // Fallback: If no name header, find a string with 2+ words that isn't the email
  if (!foundName) {
    for (const val of values) {
      if (typeof val === 'string' && val.trim().split(/\s+/).length >= 2 && !val.includes('@')) {
        foundName = val.trim();
        break;
      }
    }
  }

  return { email: foundEmail, name: foundName };
}

// ── ROUTES ────────────────────────────────────────────────────────────────────

// GET /api/imported-candidates — List raw database (Paginated)
router.get('/', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;
  const status = req.query.status || 'pending';

  const filter = { tenantId: req.user.tenantId, status };
  
  if (req.query.search) {
    const s = req.query.search.trim();
    filter.$or = [
      { email: { $regex: s, $options: 'i' } },
      { name: { $regex: s, $options: 'i' } }
    ];
  }

  const [items, total] = await Promise.all([
    ImportedCandidate.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ImportedCandidate.countDocuments(filter)
  ]);

  res.json({
    success: true,
    data: items.map(i => ({ ...i, id: i._id })),
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  });
}));

// POST /api/imported-candidates/bulk — Fast Raw Ingestion
router.post('/bulk', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) throw new AppError('No data rows provided.', 400);

  const docs = rows.map(row => {
    // Perform a quick scan during ingestion to populate searchable fields
    const { email, name } = deepScanRow(row);
    return {
      tenantId: req.user.tenantId,
      data: row,
      email,
      name,
      status: 'pending'
    };
  });

  await ImportedCandidate.insertMany(docs);
  
  logger.audit('Bulk Import Successful', req.user.id, req.user.tenantId, { count: docs.length });
  res.json({ success: true, message: `Successfully imported ${docs.length} records.` });
}));

// POST /api/imported-candidates/invite — Trigger "Deep Scan" & Send Emails
router.post('/invite', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) throw new AppError('No records selected.', 400);

  const records = await ImportedCandidate.find({ _id: { $in: ids }, tenantId: req.user.tenantId });
  let sentCount = 0;
  let failCount = 0;

  for (const record of records) {
    const { email, name } = deepScanRow(record.data);
    
    if (!email) {
      failCount++;
      continue;
    }

    // Determine Greeting (Fallback to "Dear Candidate")
    const greeting = name ? `Hi ${name.trim()}` : 'Dear Candidate';
    const onboardingLink = `${process.env.FRONTEND_URL || 'https://www.talentnesthr.com'}/register?email=${encodeURIComponent(email)}&role=candidate`;
    
    const subject = `Invitation to join TalentNest HR Platform`;
    const html = `
      <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
        <h2>${greeting},</h2>
        <p>We are excited to invite you to join <strong>TalentNest HR</strong>, our premium recruitment platform.</p>
        <p>We have added your profile to our database. To complete your registration and start receiving personalized job matches, please click the link below:</p>
        <p style="margin: 30px 0;">
          <a href="${onboardingLink}" style="background: #0176D3; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Complete Your Profile</a>
        </p>
        <p>If the button doesn't work, copy and paste this link into your browser:<br/> ${onboardingLink}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="font-size: 12px; color: #777;">Sent via TalentNest HR. If you didn't expect this invitation, please ignore this email.</p>
      </div>
    `;

    try {
      await sendEmailWithRetry(email, subject, html);
      record.status = 'invited';
      record.invitedAt = new Date();
      record.invitedBy = req.user.id;
      record.email = email; // Update found email
      record.name = name;   // Update found name
      await record.save();
      sentCount++;
    } catch (err) {
      logger.error('Imported Invite Failed', { id: record._id, email, err: err.message });
      failCount++;
    }
  }

  res.json({
    success: true,
    message: `Invites processed: ${sentCount} sent, ${failCount} failed (no email found or server error).`
  });
}));

// DELETE /api/imported-candidates — Clear database
router.delete('/', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  await ImportedCandidate.deleteMany({ tenantId: req.user.tenantId });
  res.json({ success: true, message: 'Imported database cleared successfully.' });
}));

module.exports = router;
