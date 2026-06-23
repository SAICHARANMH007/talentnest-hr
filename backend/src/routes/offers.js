'use strict';
/**
 * Offer Letter Routes — /api/offers
 *
 * GET  /api/offers/application/:appId  — get (or auto-create) offer for an application
 * PATCH /api/offers/:id                — update template data (recruiters)
 * POST /api/offers/:id/sign            — candidate signs: typed name + IP + user agent + PDF
 * GET  /api/offers/:id/pdf             — download signed PDF
 */
const express      = require('express');
const router       = express.Router();
const PDFDocument  = require('pdfkit');
const OfferLetter  = require('../models/OfferLetter');
const Application  = require('../models/Application');
const Candidate    = require('../models/Candidate');
const Job          = require('../models/Job');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard }    = require('../middleware/tenantGuard');
const { allowRoles }     = require('../middleware/rbac');
const asyncHandler       = require('../utils/asyncHandler');
const AppError           = require('../utils/AppError');
const logger             = require('../middleware/logger');
const email              = require('../utils/email');
const OrgCustomizations  = require('../models/OrgCustomizations');

const guard = [authMiddleware, tenantGuard];

/** Substitute {{VARIABLE}} placeholders in a template string with actual values. */
function fillTemplate(tpl, vars) {
  if (!tpl) return '';
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeOffer(offer) {
  const o = offer.toObject ? offer.toObject() : { ...offer };
  o.id = o.id || o._id?.toString();
  return o;
}

/**
 * Generate a PDF buffer for a signed offer letter using pdfkit.
 * @param {Object} orgTpl - OrgCustomizations.offerLetterTemplate (optional, falls back to defaults)
 */
async function generateOfferPDF(offer, candidate, job, orgTpl = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 60, size: 'A4' });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const d = offer.templateData || {};
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    // Template variable map for {{placeholder}} substitution
    const tplVars = {
      designation: d.designation || job?.title || '',
      companyName: d.companyName || 'TalentNest HR',
      ctc: d.ctc || '',
      joiningDate: d.joiningDate || '',
      signatoryName: d.signatoryName || orgTpl.signatoryTitle || 'HR Manager',
      supportEmail: 'hr@talentnesthr.com',
      candidateName: d.candidateName || candidate?.name || 'Candidate',
    };

    // ── Header ────────────────────────────────────────────────────────────────
    doc.fontSize(20).fillColor('#0176D3').text(tplVars.companyName, { align: 'left' });
    doc.fontSize(9).fillColor('#706E6B').text('Floor 3, Brindavanam Block C, Miyapur, Hyderabad – 502033');
    doc.text('hr@talentnesthr.com  |  +91 79955 35539  |  www.talentnesthr.com');
    doc.moveDown(0.5);
    doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#0176D3').lineWidth(2).stroke();
    doc.moveDown(0.5);

    // ── Reference & Date ──────────────────────────────────────────────────────
    const refNo = `TNH/${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${Math.floor(Math.random() * 9000) + 1000}`;
    doc.fontSize(9).fillColor('#444').text(`Ref No: ${refNo}    Date: ${dateStr}`, { align: 'right' });
    doc.moveDown(1);

    // ── Addressee ─────────────────────────────────────────────────────────────
    doc.fontSize(11).fillColor('#000')
      .text(d.candidateName || candidate?.name || 'Candidate')
      .text(candidate?.email || '')
      .text(candidate?.phone || '');
    doc.moveDown(1);

    // ── Subject ───────────────────────────────────────────────────────────────
    doc.fontSize(12).fillColor('#032D60')
      .text(`Subject: Offer of Employment — ${tplVars.designation || 'Position'}`, { underline: true });
    doc.moveDown(1);

    // ── Greeting & Intro ──────────────────────────────────────────────────────
    const firstName = tplVars.candidateName.split(' ')[0];
    doc.fontSize(11).fillColor('#000').text(`Dear ${firstName},`, { lineGap: 4 });
    doc.moveDown(0.5);
    const introText = orgTpl.introText
      ? fillTemplate(orgTpl.introText, tplVars)
      : `We are delighted to extend this offer of employment to you for the position of ${tplVars.designation || 'the position'} at ${tplVars.companyName}. This offer is conditional upon the satisfactory completion of all pre-employment checks.`;
    doc.text(introText, { lineGap: 4 });

    // ── Employment Details ────────────────────────────────────────────────────
    doc.moveDown(1);
    doc.fontSize(12).fillColor('#032D60').text('Employment Details', { underline: true });
    doc.moveDown(0.3);
    const details = [
      ['Designation', tplVars.designation || '—'],
      ['CTC (Annual)', d.ctc ? `₹ ${d.ctc}` : '—'],
      ['Date of Joining', d.joiningDate || '—'],
      ['Company', tplVars.companyName],
    ];
    doc.fontSize(10).fillColor('#000');
    details.forEach(([label, value]) => {
      doc.text(`${label}: `, { continued: true }).fillColor('#0176D3').text(value).fillColor('#000');
    });

    // ── Compensation Text (from template) ────────────────────────────────────
    if (orgTpl.compensationText) {
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#032D60').text('Compensation', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#000').text(fillTemplate(orgTpl.compensationText, tplVars), { lineGap: 4 });
    }

    // ── Joining Instructions (from template) ─────────────────────────────────
    if (orgTpl.joiningText) {
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#032D60').text('Joining Instructions', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#000').text(fillTemplate(orgTpl.joiningText, tplVars), { lineGap: 4 });
    }

    // ── Terms & Conditions ────────────────────────────────────────────────────
    const termsText = orgTpl.termsAndConditions || d.customClauses;
    if (termsText) {
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#032D60').text('Terms & Conditions', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#000').text(fillTemplate(termsText, tplVars), { lineGap: 4 });
    } else if (d.customClauses) {
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#032D60').text('Special Terms & Conditions', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#000').text(d.customClauses, { lineGap: 4 });
    }

    // ── Custom Additional Clauses (from template) ─────────────────────────────
    if (orgTpl.customClauses) {
      doc.moveDown(1);
      doc.fontSize(10).fillColor('#444').text(fillTemplate(orgTpl.customClauses, tplVars), { lineGap: 4 });
    }

    // ── Closing (from template) ───────────────────────────────────────────────
    doc.moveDown(1.5);
    const closingText = orgTpl.closingText
      ? fillTemplate(orgTpl.closingText, tplVars)
      : null;
    if (closingText) {
      doc.fontSize(10).fillColor('#000').text(closingText, { lineGap: 4 });
      doc.moveDown(1);
    }

    // ── Signatory ─────────────────────────────────────────────────────────────
    doc.fontSize(11).fillColor('#000').text('Yours sincerely,');
    doc.moveDown(1);
    doc.text(`${d.signatoryName || 'HR Manager'}`);
    const sigTitle = orgTpl.signatoryTitle || d.signatoryDesignation || 'Human Resources';
    doc.fontSize(9).fillColor('#706E6B').text(`${sigTitle} | ${tplVars.companyName}`);

    // ── Footer note ───────────────────────────────────────────────────────────
    if (orgTpl.footerNote) {
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#9E9D9B').text(orgTpl.footerNote, { align: 'center' });
    }

    // ── Acceptance block ──────────────────────────────────────────────────────
    if (offer.signatureData?.typedName) {
      doc.moveDown(2);
      doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#CCC').lineWidth(0.5).stroke();
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#032D60').text('ACCEPTANCE', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#000')
        .text(`I, ${offer.signatureData.typedName}, accept this offer of employment on the terms and conditions stated above.`)
        .moveDown(0.5)
        .text(`Signed: ${offer.signatureData.typedName}    Date: ${new Date(offer.signedAt).toLocaleDateString('en-IN')}`)
        .fontSize(8).fillColor('#706E6B')
        .text(`IP: ${offer.signatureData.ip || '—'}  |  Verified electronically via TalentNest HR Platform`);
    }

    doc.end();
  });
}

// ── GET /api/offers/mine — candidate gets own offer letters (across tenants) ──
router.get('/mine', authMiddleware, asyncHandler(async (req, res) => {
  // Find candidate doc(s) matching the logged-in user's email.
  // No deletedAt filter: recruiter-archived profiles must not hide the candidate's own offers.
  const candidateDocs = await Candidate.find({ email: req.user.email }).select('_id').lean();
  if (!candidateDocs.length) return res.json({ success: true, data: [] });

  const candidateIds = candidateDocs.map(c => c._id);
  const offers = await OfferLetter.find({
    candidateId: { $in: candidateIds },
    status: { $in: ['sent', 'signed'] }, // only show offers that have been sent or signed
  }).sort({ createdAt: -1 }).lean();

  res.json({ success: true, data: offers.map(normalizeOffer) });
}));

// ── GET /api/offers/application/:appId — get or auto-create offer ──────────
router.get('/application/:appId', ...guard, asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin';
  const appQuery = isSuperAdmin
    ? { _id: req.params.appId, deletedAt: null }
    : { _id: req.params.appId, tenantId: req.user.tenantId, deletedAt: null };
  const app = await Application.findOne(appQuery);
  if (!app) throw new AppError('Application not found.', 404);

  let offer = await OfferLetter.findOne({ applicationId: req.params.appId });
  if (!offer) {
    // Auto-create blank offer
    const [candidate, job] = await Promise.all([
      Candidate.findById(app.candidateId).select('name email phone location').lean(),
      Job.findById(app.jobId).select('title').lean(),
    ]);
    offer = await OfferLetter.create({
      tenantId: req.user.tenantId,
      applicationId: app._id,
      candidateId: app.candidateId,
      status: 'draft',
      templateData: {
        candidateName: candidate?.name || '',
        designation: job?.title || '',
        companyName: req.tenant?.name || 'TalentNest HR',
        signatoryName: req.user.name || 'HR Manager',
        signatoryDesignation: 'Human Resources',
      },
    });
  }

  res.json({ success: true, data: normalizeOffer(offer) });
}));

// ── GET /api/offers/:id — single offer ────────────────────────────────────────
router.get('/:id', authMiddleware, asyncHandler(async (req, res) => {
  let offer;
  if (req.user.role === 'candidate') {
    // Candidates' offers live under the employer's tenantId — skip tenantId filter,
    // but verify the offer belongs to this candidate by matching their email.
    offer = await OfferLetter.findById(req.params.id).lean();
    if (offer) {
      const cand = await Candidate.findById(offer.candidateId).select('email').lean();
      if (!cand || cand.email.toLowerCase() !== req.user.email.toLowerCase()) {
        throw new AppError('Offer not found.', 404);
      }
    }
  } else if (req.user.role === 'super_admin') {
    offer = await OfferLetter.findById(req.params.id).lean();
  } else {
    offer = await OfferLetter.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).lean();
  }
  if (!offer) throw new AppError('Offer not found.', 404);

  res.json({ success: true, data: normalizeOffer(offer) });
}));

// ── PATCH /api/offers/:id — update template data ──────────────────────────────
router.patch('/:id', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const offer = await OfferLetter.findById(req.params.id);
    if (!offer) throw new AppError('Offer not found.', 404);

    const isSuperAdmin = req.user.role === 'super_admin';
    const app = await Application.findOne(
      isSuperAdmin
        ? { _id: offer.applicationId }
        : { _id: offer.applicationId, tenantId: req.user.tenantId }
    );
    if (!app) throw new AppError('Access denied.', 403);

    if (offer.status === 'signed') throw new AppError('Cannot edit a signed offer letter.', 400);

    // Merge templateData
    const { templateData, status, offerHtml } = req.body;
    if (templateData) {
      offer.templateData = { ...offer.templateData, ...templateData };
    }
    if (offerHtml) {
      offer.offerHtml = offerHtml;
    }
    if (status && ['draft', 'sent', 'declined'].includes(status)) {
      offer.status = status;
      if (status === 'sent') offer.sentAt = new Date();
    }
    await offer.save();

    if (status === 'declined') {
      const { fireWebhooks } = require('../services/webhookService');
      fireWebhooks(app.tenantId, 'offer.declined', {
        offerId: String(offer._id), applicationId: String(offer.applicationId), candidateName: offer.templateData?.candidateName || '',
      }).catch(() => {});
    }

    logger.audit('Offer updated', req.user.id, req.user.tenantId, { offerId: offer._id });
    res.json({ success: true, data: normalizeOffer(offer) });
  })
);

// ── POST /api/offers/:id/send — mark as sent and email to candidate ──────────
router.post('/:id/send', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const offer = await OfferLetter.findById(req.params.id);
    if (!offer) throw new AppError('Offer not found.', 404);

    const isSuperAdmin = req.user.role === 'super_admin';
    const app = await Application.findOne(
      isSuperAdmin
        ? { _id: offer.applicationId }
        : { _id: offer.applicationId, tenantId: req.user.tenantId }
    );
    if (!app) throw new AppError('Access denied.', 403);

    if (offer.status === 'signed') throw new AppError('Offer already signed.', 400);

    const [candidate, job, orgCust] = await Promise.all([
      Candidate.findById(offer.candidateId).select('name email').lean(),
      Job.findById(app.jobId).select('title').lean(),
      OrgCustomizations.getOrCreate(req.user.tenantId || req.user.orgId).catch(() => null),
    ]);

    const frontendUrl = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
    const offerLink = `${frontendUrl}/offer/${offer._id}`;
    const d = offer.templateData || {};
    const orgTpl = orgCust?.offerLetterTemplate || {};
    const tplVars = { designation: d.designation || job?.title || '', companyName: d.companyName || 'TalentNest HR', ctc: d.ctc || '', joiningDate: d.joiningDate || '', candidateName: candidate?.name || 'Candidate', signatoryName: d.signatoryName || orgTpl.signatoryTitle || 'HR Team', supportEmail: 'hr@talentnesthr.com' };
    const introHtml = orgTpl.introText ? `<p>${fillTemplate(orgTpl.introText, tplVars)}</p>` : `<p>We are pleased to extend you an offer of employment for the role of <strong>${tplVars.designation || d.designation || job?.title}</strong> at <strong>${tplVars.companyName}</strong>.</p>`;

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0176D3">📨 Your Offer Letter — ${tplVars.designation || job?.title}</h2>
        <p>Dear ${(candidate?.name || 'Candidate').split(' ')[0]},</p>
        ${introHtml}
        ${d.ctc ? `<p>💰 <strong>CTC: ₹ ${d.ctc} per annum</strong></p>` : ''}
        ${d.joiningDate ? `<p>📅 <strong>Joining Date: ${d.joiningDate}</strong></p>` : ''}
        <p>Please review and sign your offer letter using the link below:</p>
        <a href="${offerLink}" style="display:inline-block;padding:12px 28px;background:#0176D3;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">View & Sign Offer Letter →</a>
        <p style="margin-top:16px;color:#706E6B;font-size:12px">This link is for your use only. Do not share it.</p>
        ${orgTpl.closingText ? `<p>${fillTemplate(orgTpl.closingText, tplVars)}</p>` : ''}
        <p>Best regards,<br>${tplVars.signatoryName}<br>${tplVars.companyName}</p>
        ${orgTpl.footerNote ? `<p style="font-size:10px;color:#9E9D9B">${orgTpl.footerNote}</p>` : ''}
      </div>`;

    if (candidate?.email) {
      await email.sendOrgEmail(candidate.email, `Offer Letter — ${job?.title || 'Position'} | ${d.companyName || 'TalentNest HR'}`, html, req.user.tenantId).catch(() => {});
    }

    offer.status = 'sent';
    offer.sentAt = new Date();
    await offer.save();

    logger.audit('Offer sent', req.user.id, req.user.tenantId, { offerId: offer._id, candidateEmail: candidate?.email });
    res.json({ success: true, data: normalizeOffer(offer) });
  })
);

// ── POST /api/offers/:id/sign — candidate signs the offer ────────────────────
// No tenantGuard needed — candidate may not be in the same org
router.post('/:id/sign', authMiddleware, asyncHandler(async (req, res) => {
  const { typedName } = req.body;
  if (!typedName || typedName.trim().length < 2) throw new AppError('Typed name is required to sign.', 400);

  const offer = await OfferLetter.findById(req.params.id);
  if (!offer) throw new AppError('Offer not found.', 404);

  // Verify the authenticated user is the intended candidate (match by email)
  const signerCandidate = await Candidate.findById(offer.candidateId).select('email').lean();
  if (!signerCandidate || signerCandidate.email.toLowerCase() !== req.user.email.toLowerCase()) {
    throw new AppError('You are not authorized to sign this offer.', 403);
  }

  if (offer.status === 'signed') throw new AppError('This offer has already been signed.', 409);
  if (offer.status !== 'sent') throw new AppError('This offer is not yet ready for signing.', 400);

  // Store signature data
  offer.signatureData = {
    typedName: typedName.trim(),
    ip: req.ip || req.headers['x-forwarded-for'] || '',
    userAgent: req.headers['user-agent'] || '',
  };
  offer.signedAt = new Date();
  offer.status   = 'signed';

  // Generate signed PDF
  const [candidate, job, app, signOrgCust] = await Promise.all([
    Candidate.findById(offer.candidateId).select('name email phone').lean(),
    Application.findById(offer.applicationId).then(a => a ? Job.findById(a.jobId).select('title').lean() : null),
    Application.findById(offer.applicationId).lean(),
    OrgCustomizations.getOrCreate(offer.tenantId).catch(() => null),
  ]);

  const pdfBuffer = await generateOfferPDF(offer, candidate, job, signOrgCust?.offerLetterTemplate || {});

  // Store as base64 data URL (no external file storage needed)
  offer.signedDocUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
  offer.generatedAt  = new Date();
  await offer.save();

  // Move application to Hired stage if not already
  if (app && !['Hired'].includes(app.currentStage)) {
    await Application.findByIdAndUpdate(app._id, {
      $set: { currentStage: 'Hired', status: 'hired' },
      $push: { stageHistory: { stage: 'Hired', movedAt: new Date(), notes: 'Offer signed by candidate' } },
    });
  }

  // Email signed copy to candidate
  if (candidate?.email) {
    const html = `<p>Dear ${candidate.name?.split(' ')[0] || 'there'},</p><p>Your offer letter has been signed successfully. Your signed copy is attached.</p><p>Welcome to the team! 🎉</p>`;
    email.sendOrgEmail(candidate.email, `Signed Offer Letter — ${offer.templateData?.designation || 'Your Position'}`, html, offer.tenantId).catch(() => {});
  }

  // Push notification to recruiter that offer was signed
  try {
    const { sendPush } = require('../utils/sendPush');
    const recruiterId = offer.createdBy || offer.recruiterId;
    if (recruiterId) {
      await sendPush(recruiterId, {
        title: 'Offer Accepted!',
        body: `${candidate?.name || 'A candidate'} has signed the offer for ${job?.title || offer.templateData?.designation || 'a position'}`,
        url: '/app/pipeline',
      });
    }
  } catch (e) { /* non-fatal */ }

  // Auto-create PreBoarding record if not already exists
  try {
    const PreBoarding = require('../models/PreBoarding');
    const exists = await PreBoarding.findOne({ offerId: offer._id });
    if (!exists) {
      const d = offer.templateData || {};
      let joiningDate = null;
      if (d.joiningDate) {
        const parsed = new Date(d.joiningDate);
        if (!isNaN(parsed)) joiningDate = parsed;
      }

      const DEFAULT_TASKS = [
        { title: 'Submit Aadhaar Card',          category: 'document',    isRequired: true },
        { title: 'Submit PAN Card',              category: 'document',    isRequired: true },
        { title: 'Submit Salary Slips (3)',       category: 'document',    isRequired: true },
        { title: 'Submit Experience Letter',      category: 'document',    isRequired: false },
        { title: 'Submit Relieving Letter',       category: 'document',    isRequired: false },
        { title: 'Submit Educational Documents',  category: 'document',    isRequired: true },
        { title: 'Bank Account Details',          category: 'document',    isRequired: true },
        { title: 'IT Asset Request Submitted',    category: 'it_setup',    isRequired: true },
        { title: 'Work Email Created',            category: 'it_setup',    isRequired: true },
        { title: 'Review Employee Handbook',      category: 'policy',      isRequired: true },
        { title: 'Complete Compliance Training',  category: 'training',    isRequired: true },
        { title: 'Orientation Scheduled',         category: 'orientation', isRequired: true },
      ];

      await PreBoarding.create({
        tenantId:       offer.tenantId,
        candidateId:    offer.candidateId,
        applicationId:  offer.applicationId,
        offerId:        offer._id,
        candidateName:  candidate?.name || d.candidateName || '',
        candidateEmail: candidate?.email || '',
        designation:    d.designation || job?.title || '',
        joiningDate,
        tasks: DEFAULT_TASKS,
      });
    }
  } catch (pbErr) {
    console.error('[PreBoarding] auto-create failed:', pbErr.message);
  }

  // ── Update candidate's work history + current company after signing ──────────
  try {
    const fullCandidate = await Candidate.findById(offer.candidateId).lean();
    const fullJob = job || (app ? await Job.findById(app.jobId).select('title company companyName').lean() : null);

    if (fullCandidate && fullJob) {
      const companyName = fullJob.companyName || fullJob.company || offer.templateData?.companyName || '';
      // Use candidate's current title, fall back to job title
      const roleTitle = fullCandidate.title || offer.templateData?.designation || fullJob.title || '';

      // Get joining date from preboarding or offer template
      const PreBoarding = require('../models/PreBoarding');
      const pb = await PreBoarding.findOne({ applicationId: offer.applicationId }).lean();
      const joinDate = pb?.joiningDate || (offer.templateData?.joiningDate ? new Date(offer.templateData.joiningDate) : new Date());

      // Parse existing work history (stored as JSON string)
      let history = [];
      try { history = fullCandidate.workHistory ? JSON.parse(fullCandidate.workHistory) : []; } catch {}
      if (!Array.isArray(history)) history = [];

      // Add new entry (only if not already present for this company+role)
      const alreadyExists = history.some(h => h.company === companyName && h.title === roleTitle);
      if (!alreadyExists && companyName) {
        history.unshift({
          title: roleTitle,
          company: companyName,
          startDate: joinDate instanceof Date ? joinDate.toISOString().split('T')[0] : String(joinDate).split('T')[0],
          endDate: '',
          current: true,
          description: `Hired via TalentNest HR — offer signed ${new Date().toLocaleDateString('en-IN')}`,
        });
      }

      // Update candidate: new work history + current company/title
      const candidateUpdate = { workHistory: JSON.stringify(history) };
      if (companyName) candidateUpdate.currentCompany = companyName;
      // Only update title if candidate didn't have one
      if (!fullCandidate.title && roleTitle) candidateUpdate.title = roleTitle;

      await Candidate.findByIdAndUpdate(offer.candidateId, { $set: candidateUpdate });
    }
  } catch (expErr) {
    console.warn('[Offer] Work history update failed (non-critical):', expErr.message);
  }

  logger.audit('Offer signed', req.user.id, null, { offerId: offer._id, typedName: typedName.trim() });
  res.json({ success: true, message: 'Offer signed successfully.', data: normalizeOffer(offer) });
}));

// ── GET /api/offers/:id/pdf — stream signed PDF ───────────────────────────────
router.get('/:id/pdf', authMiddleware, asyncHandler(async (req, res) => {
  const offer = await OfferLetter.findById(req.params.id);
  if (!offer) throw new AppError('Offer not found.', 404);

  if (req.user.role === 'candidate') {
    const cand = await Candidate.findById(offer.candidateId).select('email').lean();
    if (!cand || cand.email.toLowerCase() !== req.user.email.toLowerCase())
      throw new AppError('Access denied.', 403);
  } else if (req.user.role !== 'super_admin' && String(offer.tenantId) !== String(req.user.tenantId)) {
    throw new AppError('Access denied.', 403);
  }

  // Must have a generated PDF
  if (!offer.signedDocUrl) throw new AppError('Signed PDF not yet generated. The candidate must sign the offer first.', 404);

  const [candidate, job] = await Promise.all([
    Candidate.findById(offer.candidateId).select('name').lean(),
    Application.findById(offer.applicationId).then(a => a ? Job.findById(a.jobId).select('title').lean() : null),
  ]);

  const filename = `offer-letter-${(candidate?.name || 'candidate').replace(/\s+/g, '-').toLowerCase()}.pdf`;

  // If stored as data URL, extract and stream buffer
  if (offer.signedDocUrl.startsWith('data:')) {
    const base64 = offer.signedDocUrl.split(',')[1];
    const buf = Buffer.from(base64, 'base64');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buf.length,
    });
    return res.send(buf);
  }

  // If stored as URL, generate PDF on-the-fly
  const dlOrgCust = await OrgCustomizations.getOrCreate(offer.tenantId).catch(() => null);
  const pdfBuffer = await generateOfferPDF(offer, candidate, job, dlOrgCust?.offerLetterTemplate || {});
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': pdfBuffer.length,
  });
  res.send(pdfBuffer);
}));

// ── GET /api/offers/:id/pdf/preview — download/preview PDF for any offer (draft or signed) ──
router.get('/:id/pdf/preview', ...guard, asyncHandler(async (req, res) => {
  const offer = await OfferLetter.findById(req.params.id);
  if (!offer) throw new AppError('Offer not found.', 404);

  // Tenant check for non-super-admin
  if (req.user.role !== 'super_admin' && String(offer.tenantId) !== String(req.user.tenantId)) {
    throw new AppError('Access denied.', 403);
  }

  const [candidate, job, previewOrgCust] = await Promise.all([
    Candidate.findById(offer.candidateId).select('name').lean(),
    offer.applicationId
      ? Application.findById(offer.applicationId).then(a => a ? Job.findById(a.jobId).select('title').lean() : null)
      : null,
    OrgCustomizations.getOrCreate(offer.tenantId).catch(() => null),
  ]);

  const pdfBuffer = await generateOfferPDF(offer, candidate, job, previewOrgCust?.offerLetterTemplate || {});
  const fname = `offer-${(offer.templateData?.candidateName || 'candidate').replace(/\s+/g, '-').toLowerCase()}.pdf`;
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${fname}"`, 'Content-Length': pdfBuffer.length });
  res.send(pdfBuffer);
}));

// ── GET /api/offers/share/:shareToken — public shareable link (no auth required) ──
router.get('/share/:shareToken', asyncHandler(async (req, res) => {
  const offer = await OfferLetter.findOne({ shareToken: req.params.shareToken });
  if (!offer) throw new AppError('Offer link not found or expired.', 404);

  const [candidate, job] = await Promise.all([
    Candidate.findById(offer.candidateId).select('name email').lean(),
    offer.applicationId
      ? Application.findById(offer.applicationId).then(a => a ? Job.findById(a.jobId).select('title').lean() : null)
      : null,
  ]);

  res.json({ success: true, data: { ...normalizeOffer(offer), candidateName: candidate?.name, jobTitle: job?.title } });
}));

// ── POST /api/offers/:id/generate-share-link — create shareable token ────────
router.post('/:id/generate-share-link', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const shareLinkFilter = { _id: req.params.id };
  if (req.user.role !== 'super_admin') shareLinkFilter.tenantId = req.user.tenantId;
  const offer = await OfferLetter.findOne(shareLinkFilter);
  if (!offer) throw new AppError('Offer not found.', 404);

  // Generate or reuse share token
  if (!offer.shareToken) {
    const crypto = require('crypto');
    offer.shareToken = crypto.randomBytes(24).toString('hex');
    await offer.save();
  }

  const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
  res.json({ success: true, shareLink: `${FRONTEND_URL}/offer/${offer.shareToken}` });
}));

// ── POST /api/offers/standalone — create offer for any candidate (no application required) ──
router.post('/standalone', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { candidateId, designation, joiningDate, salary, companyName, signatoryName, signatoryDesignation } = req.body;
  if (!candidateId) throw new AppError('candidateId required', 400);

  const standaloneFilter = { _id: candidateId, deletedAt: null };
  if (req.user.role !== 'super_admin') standaloneFilter.tenantId = req.user.tenantId;
  const candidate = await Candidate.findOne(standaloneFilter).lean();
  if (!candidate) throw new AppError('Candidate not found', 404);

  const offer = await OfferLetter.create({
    tenantId: req.user.tenantId,
    candidateId,
    applicationId: req.body.applicationId || null,
    status: 'draft',
    templateData: {
      candidateName: candidate.name || '',
      designation: designation || '',
      joiningDate: joiningDate || '',
      salary: salary || '',
      companyName: companyName || req.tenant?.name || 'TalentNest HR',
      signatoryName: signatoryName || req.user.name || 'HR Manager',
      signatoryDesignation: signatoryDesignation || 'Human Resources',
    },
  });

  res.json({ success: true, data: normalizeOffer(offer) });
}));

// ── POST /api/offers/:id/request-approval — recruiter submits offer for approval chain
router.post('/:id/request-approval', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { approvers } = req.body; // [{ userId, name, email, role, order }]
  if (!Array.isArray(approvers) || approvers.length === 0) throw new AppError('approvers array is required', 400);

  const offer = await OfferLetter.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!offer) throw new AppError('Offer not found', 404);
  if (offer.approvalStatus === 'pending') throw new AppError('Approval already in progress', 400);

  const crypto = require('crypto');
  const chain  = approvers.map((a, i) => ({
    userId: a.userId || null,
    name   : a.name || '',
    email  : a.email || '',
    role   : a.role || '',
    order  : a.order || i + 1,
    status : 'pending',
    token  : crypto.randomBytes(20).toString('hex'),
  }));

  offer.approvalChain       = chain;
  offer.approvalStatus      = 'pending';
  offer.approvalRequestedAt = new Date();
  await offer.save();

  // Notify first approver
  const first      = chain.sort((a, b) => a.order - b.order)[0];
  const baseUrl    = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
  const approveUrl = `${baseUrl}/app/offer-approval/${offer._id}?token=${first.token}&action=approve`;
  const rejectUrl  = `${baseUrl}/app/offer-approval/${offer._id}?token=${first.token}&action=reject`;
  const jobTitle   = offer.templateData?.designation || 'the role';
  const candName   = offer.templateData?.candidateName || 'Candidate';

  if (first.email) {
    const html = `<div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:540px;margin:0 auto;background:#f8fafc;padding:28px 16px;">
      <div style="background:linear-gradient(135deg,#7C3AED,#4F46E5);padding:24px 28px;border-radius:14px 14px 0 0;">
        <h2 style="color:#fff;margin:0;font-size:18px;">📋 Offer Approval Required</h2>
        <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px;">Your approval is needed for ${candName} — ${jobTitle}</p>
      </div>
      <div style="background:#fff;padding:24px 28px;border-radius:0 0 14px 14px;border:1px solid #e2e8f0;border-top:none;">
        <p style="color:#374151;font-size:14px;">${req.user.name || 'HR'} has submitted an offer letter for <strong>${candName}</strong> for <strong>${jobTitle}</strong> and needs your approval.</p>
        <div style="display:flex;gap:12px;margin:20px 0;flex-wrap:wrap;">
          <a href="${approveUrl}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;">✓ Approve Offer</a>
          <a href="${rejectUrl}" style="display:inline-block;background:#BA0517;color:#fff;padding:12px 24px;border-radius:10px;font-weight:700;text-decoration:none;font-size:14px;">✕ Reject</a>
        </div>
        <p style="color:#9CA3AF;font-size:11px;">This link is single-use. Please review the offer in TalentNest HR before deciding.</p>
      </div>
    </div>`;
    email.sendEmailWithRetry(first.email, `📋 Offer Approval Required — ${candName}`, html).catch(() => {});
  }

  // In-app notification to first approver
  if (first.userId) {
    const Notification = require('../models/Notification');
    Notification.create({
      userId: first.userId, tenantId: offer.tenantId, type: 'stage_change',
      title: '📋 Offer Approval Needed',
      message: `Review and approve the offer for ${candName} — ${jobTitle}`,
      link: `/app/offer-approval/${offer._id}`,
    }).catch(() => {});
  }

  res.json({ success: true, message: 'Approval chain initiated', data: { approvalStatus: 'pending', chain: offer.approvalChain } });
}));

// ── GET /api/offers/:id/approval-status — get current approval chain status
router.get('/:id/approval-status', ...guard, asyncHandler(async (req, res) => {
  const offer = await OfferLetter.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).select('approvalChain approvalStatus approvalRequestedAt approvalCompletedAt').lean();
  if (!offer) throw new AppError('Offer not found', 404);
  res.json({ success: true, data: { approvalStatus: offer.approvalStatus, chain: offer.approvalChain, requestedAt: offer.approvalRequestedAt, completedAt: offer.approvalCompletedAt } });
}));

// ── POST /api/offers/:id/decide-approval — approver approves or rejects via token
router.post('/:id/decide-approval', asyncHandler(async (req, res) => {
  const { token, action, comment } = req.body; // action: 'approve' | 'reject'
  if (!token || !['approve', 'reject'].includes(action)) throw new AppError('token and action required', 400);

  const offer = await OfferLetter.findById(req.params.id);
  if (!offer) throw new AppError('Offer not found', 404);
  if (offer.approvalStatus !== 'pending') throw new AppError('No pending approval', 400);

  const sorted = offer.approvalChain.sort((a, b) => a.order - b.order);
  const step   = sorted.find(s => s.token === token && s.status === 'pending');
  if (!step) throw new AppError('Token invalid or already used', 400);

  step.status    = action === 'approve' ? 'approved' : 'rejected';
  step.decidedAt = new Date();
  step.comment   = comment || '';
  offer.markModified('approvalChain');

  if (action === 'reject') {
    offer.approvalStatus      = 'rejected';
    offer.approvalCompletedAt = new Date();
    // Notify recruiter/admins of rejection
    const User = require('../models/User');
    const notify = await User.find({ tenantId: offer.tenantId, role: { $in: ['admin', 'super_admin', 'recruiter'] }, deletedAt: null }).select('_id').lean();
    const Notification = require('../models/Notification');
    await Promise.all(notify.map(u => Notification.create({
      userId: u._id, tenantId: offer.tenantId, type: 'stage_change',
      title: '❌ Offer Approval Rejected',
      message: `${step.name || 'An approver'} rejected the offer for ${offer.templateData?.candidateName || 'candidate'}. Reason: ${comment || 'No comment.'}`,
      link: `/app/pipeline`,
    }).catch(() => {})));
  } else {
    // Check if all approved
    const remaining = sorted.filter(s => s.status === 'pending');
    if (remaining.length === 0) {
      offer.approvalStatus      = 'approved';
      offer.approvalCompletedAt = new Date();
      // Notify recruiter
      const User = require('../models/User');
      const notify = await User.find({ tenantId: offer.tenantId, role: { $in: ['admin', 'super_admin', 'recruiter'] }, deletedAt: null }).select('_id').lean();
      const Notification = require('../models/Notification');
      await Promise.all(notify.map(u => Notification.create({
        userId: u._id, tenantId: offer.tenantId, type: 'stage_change',
        title: '✅ Offer Approved — Ready to Send!',
        message: `The offer for ${offer.templateData?.candidateName || 'candidate'} has been fully approved. You can now send it.`,
        link: `/app/pipeline`,
      }).catch(() => {})));
    } else {
      // Notify next approver
      const next  = remaining[0];
      const baseUrl    = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
      const approveUrl = `${baseUrl}/app/offer-approval/${offer._id}?token=${next.token}&action=approve`;
      const rejectUrl  = `${baseUrl}/app/offer-approval/${offer._id}?token=${next.token}&action=reject`;
      const candName   = offer.templateData?.candidateName || 'Candidate';
      const jobTitle   = offer.templateData?.designation || 'the role';
      if (next.email) {
        const html = `<div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:540px;margin:0 auto;background:#f8fafc;padding:28px 16px;"><div style="background:linear-gradient(135deg,#7C3AED,#4F46E5);padding:24px 28px;border-radius:14px 14px 0 0;"><h2 style="color:#fff;margin:0;font-size:18px;">📋 Offer Approval Required</h2></div><div style="background:#fff;padding:24px 28px;border-radius:0 0 14px 14px;border:1px solid #e2e8f0;border-top:none;"><p style="color:#374151;font-size:14px;">Your approval is needed for <strong>${candName}</strong> — <strong>${jobTitle}</strong>.</p><div style="display:flex;gap:12px;margin:20px 0;"><a href="${approveUrl}" style="display:inline-block;background:#059669;color:#fff;padding:12px 24px;border-radius:10px;font-weight:700;text-decoration:none;">✓ Approve</a><a href="${rejectUrl}" style="display:inline-block;background:#BA0517;color:#fff;padding:12px 24px;border-radius:10px;font-weight:700;text-decoration:none;">✕ Reject</a></div></div></div>`;
        email.sendEmailWithRetry(next.email, `📋 Offer Approval Required — ${candName}`, html).catch(() => {});
      }
      if (next.userId) {
        const Notification = require('../models/Notification');
        Notification.create({ userId: next.userId, tenantId: offer.tenantId, type: 'stage_change', title: '📋 Offer Approval Needed', message: `Approve the offer for ${candName}`, link: `/app/offer-approval/${offer._id}` }).catch(() => {});
      }
    }
  }

  await offer.save();
  res.json({ success: true, data: { approvalStatus: offer.approvalStatus, step: { name: step.name, status: step.status } } });
}));

module.exports = router;
