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

const guard = [authMiddleware, tenantGuard];

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeOffer(offer) {
  const o = offer.toObject ? offer.toObject() : { ...offer };
  o.id = o.id || o._id?.toString();
  return o;
}

/**
 * Generate a PDF buffer for a signed offer letter using pdfkit.
 */
async function generateOfferPDF(offer, candidate, job) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 60, size: 'A4' });

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const d = offer.templateData || {};
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    // ── Header ────────────────────────────────────────────────────────────────
    doc.fontSize(20).fillColor('#0176D3').text('TalentNest HR', { align: 'left' });
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
      .text(`Subject: Offer of Employment — ${d.designation || job?.title || 'Position'}`, { underline: true });
    doc.moveDown(1);

    // ── Body ──────────────────────────────────────────────────────────────────
    const firstName = (d.candidateName || candidate?.name || 'Candidate').split(' ')[0];
    doc.fontSize(11).fillColor('#000').text(`Dear ${firstName},`, { lineGap: 4 });
    doc.moveDown(0.5);
    doc.text(
      `We are delighted to extend this offer of employment to you for the position of ${d.designation || job?.title || 'the position'} ` +
      `at ${d.companyName || 'TalentNest HR'}. This offer is conditional upon the satisfactory completion of all pre-employment checks.`,
      { lineGap: 4 }
    );

    doc.moveDown(1);
    doc.fontSize(12).fillColor('#032D60').text('Employment Details', { underline: true });
    doc.moveDown(0.3);
    const details = [
      ['Designation', d.designation || job?.title || '—'],
      ['CTC (Annual)', d.ctc ? `₹ ${d.ctc}` : '—'],
      ['Date of Joining', d.joiningDate || '—'],
      ['Company', d.companyName || '—'],
    ];
    doc.fontSize(10).fillColor('#000');
    details.forEach(([label, value]) => {
      doc.text(`${label}: `, { continued: true }).fillColor('#0176D3').text(value).fillColor('#000');
    });

    if (d.customClauses) {
      doc.moveDown(1);
      doc.fontSize(12).fillColor('#032D60').text('Special Terms & Conditions', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#000').text(d.customClauses, { lineGap: 4 });
    }

    doc.moveDown(1.5);
    doc.fontSize(11).text('Yours sincerely,');
    doc.moveDown(1);
    doc.text(`${d.signatoryName || 'HR Manager'}`);
    doc.fontSize(9).fillColor('#706E6B').text(`${d.signatoryDesignation || 'Human Resources'} | TalentNest HR`);

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

// ── GET /api/offers/application/:appId — get or auto-create offer ──────────
router.get('/application/:appId', ...guard, asyncHandler(async (req, res) => {
  const app = await Application.findOne({ _id: req.params.appId, tenantId: req.user.tenantId, deletedAt: null });
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
router.get('/:id', ...guard, asyncHandler(async (req, res) => {
  const offer = await OfferLetter.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!offer) throw new AppError('Offer not found.', 404);

  res.json({ success: true, data: normalizeOffer(offer) });
}));

// ── PATCH /api/offers/:id — update template data ──────────────────────────────
router.patch('/:id', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const offer = await OfferLetter.findById(req.params.id);
    if (!offer) throw new AppError('Offer not found.', 404);

    const app = await Application.findOne({ _id: offer.applicationId, tenantId: req.user.tenantId });
    if (!app) throw new AppError('Access denied.', 403);

    if (offer.status === 'signed') throw new AppError('Cannot edit a signed offer letter.', 400);

    // Merge templateData
    const { templateData, status } = req.body;
    if (templateData) {
      offer.templateData = { ...offer.templateData, ...templateData };
    }
    if (status && ['draft', 'sent', 'declined'].includes(status)) {
      offer.status = status;
      if (status === 'sent') offer.sentAt = new Date();
    }
    await offer.save();

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

    const app = await Application.findOne({ _id: offer.applicationId, tenantId: req.user.tenantId });
    if (!app) throw new AppError('Access denied.', 403);

    if (offer.status === 'signed') throw new AppError('Offer already signed.', 400);

    const [candidate, job] = await Promise.all([
      Candidate.findById(offer.candidateId).select('name email').lean(),
      Job.findById(app.jobId).select('title').lean(),
    ]);

    const frontendUrl = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
    const offerLink = `${frontendUrl}/offer/${offer._id}`;
    const d = offer.templateData || {};

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#0176D3">📨 Your Offer Letter — ${job?.title || d.designation}</h2>
        <p>Dear ${candidate?.name || 'Candidate'},</p>
        <p>We are pleased to extend you an offer of employment for the role of <strong>${d.designation || job?.title}</strong> at <strong>${d.companyName || 'TalentNest HR'}</strong>.</p>
        ${d.ctc ? `<p>💰 <strong>CTC: ₹ ${d.ctc} per annum</strong></p>` : ''}
        ${d.joiningDate ? `<p>📅 <strong>Joining Date: ${d.joiningDate}</strong></p>` : ''}
        <p>Please review and sign your offer letter using the link below:</p>
        <a href="${offerLink}" style="display:inline-block;padding:12px 28px;background:#0176D3;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">View & Sign Offer Letter →</a>
        <p style="margin-top:16px;color:#706E6B;font-size:12px">This link is for your use only. Do not share it.</p>
        <p>Best regards,<br>${d.signatoryName || 'HR Team'}<br>${d.companyName || 'TalentNest HR'}</p>
      </div>`;

    if (candidate?.email) {
      await email.sendEmailWithRetry(candidate.email, `Offer Letter — ${job?.title || 'Position'} | ${d.companyName || 'TalentNest HR'}`, html).catch(() => {});
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
  if (!signerCandidate || signerCandidate.email !== req.user.email) {
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
  const [candidate, job, app] = await Promise.all([
    Candidate.findById(offer.candidateId).select('name email phone').lean(),
    Application.findById(offer.applicationId).then(a => a ? Job.findById(a.jobId).select('title').lean() : null),
    Application.findById(offer.applicationId).lean(),
  ]);

  const pdfBuffer = await generateOfferPDF(offer, candidate, job);

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
    email.sendEmailWithRetry(candidate.email, `Signed Offer Letter — ${offer.templateData?.designation || 'Your Position'}`, html).catch(() => {});
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

  logger.audit('Offer signed', req.user.id, null, { offerId: offer._id, typedName: typedName.trim() });
  res.json({ success: true, message: 'Offer signed successfully.', data: normalizeOffer(offer) });
}));

// ── GET /api/offers/:id/pdf — stream signed PDF ───────────────────────────────
router.get('/:id/pdf', authMiddleware, asyncHandler(async (req, res) => {
  const offer = await OfferLetter.findById(req.params.id);
  if (!offer) throw new AppError('Offer not found.', 404);

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
  const pdfBuffer = await generateOfferPDF(offer, candidate, job);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': pdfBuffer.length,
  });
  res.send(pdfBuffer);
}));

module.exports = router;
