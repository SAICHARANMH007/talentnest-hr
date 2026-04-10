'use strict';
/**
 * Candidate Document Locker
 * POST /api/candidates/:id/documents         — upload a document (Cloudinary)
 * GET  /api/candidates/:id/documents         — list all docs for this candidate
 * PATCH /api/candidates/:id/documents/:docId — verify / needs-resubmission
 */
const express  = require('express');
const router   = express.Router({ mergeParams: true });
const multer   = require('multer');
const cloudinary = require('cloudinary').v2;
const CandidateDocument = require('../models/CandidateDocument');
const Candidate  = require('../models/Candidate');
const { authMiddleware } = require('../middleware/auth');
const { tenantGuard }    = require('../middleware/tenantGuard');
const { allowRoles }     = require('../middleware/rbac');
const asyncHandler       = require('../utils/asyncHandler');
const AppError           = require('../utils/AppError');
const { sendEmailWithRetry } = require('../utils/email');
const logger = require('../middleware/logger');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key   : process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const DOCUMENT_LABELS = {
  aadhaar           : 'Aadhaar Card',
  pan               : 'PAN Card',
  salary_slip_1     : 'Salary Slip (Month 1)',
  salary_slip_2     : 'Salary Slip (Month 2)',
  salary_slip_3     : 'Salary Slip (Month 3)',
  experience_letter : 'Experience Letter',
  relieving_letter  : 'Relieving Letter',
  marksheet_10      : '10th Marksheet',
  marksheet_12      : '12th Marksheet',
  degree_certificate: 'Degree Certificate',
  passport_photo    : 'Passport Photo',
  bank_details      : 'Bank Details',
  cancelled_cheque  : 'Cancelled Cheque',
  other             : 'Other Document',
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits : { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const guard = [authMiddleware, tenantGuard];

// POST /api/candidates/:id/documents
router.post('/', ...guard, upload.single('document'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Document file is required.', 400);
  const { documentType } = req.body;
  if (!documentType) throw new AppError('documentType is required.', 400);

  const candidate = await Candidate.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }).lean();
  if (!candidate) throw new AppError('Candidate not found.', 404);

  // Upload to Cloudinary
  const uploadResult = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'candidate-documents', resource_type: 'auto' },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(req.file.buffer);
  });

  const doc = await CandidateDocument.create({
    tenantId    : req.user.tenantId,
    candidateId : req.params.id,
    documentType,
    label       : DOCUMENT_LABELS[documentType] || documentType,
    fileUrl     : uploadResult.secure_url,
  });

  logger.audit('Document uploaded', req.user.id, req.user.tenantId, { candidateId: req.params.id, documentType });
  res.status(201).json({ success: true, data: { ...doc.toObject(), id: doc._id.toString() } });
}));

// GET /api/candidates/:id/documents
router.get('/', ...guard, asyncHandler(async (req, res) => {
  const candidate = await Candidate.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).lean();
  if (!candidate) throw new AppError('Candidate not found.', 404);

  const docs = await CandidateDocument.find({ candidateId: req.params.id, tenantId: req.user.tenantId })
    .populate('verifiedBy', 'name')
    .sort({ uploadedAt: -1 })
    .lean();

  const result = docs.map(d => ({ ...d, id: d._id.toString() }));
  res.json({ success: true, data: result, total: result.length });
}));

// PATCH /api/candidates/:id/documents/:docId — verify or flag for resubmission
router.patch('/:docId', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const { verificationStatus, verificationNote } = req.body;
    if (!['verified', 'needs_resubmission'].includes(verificationStatus)) {
      throw new AppError('verificationStatus must be verified or needs_resubmission.', 400);
    }

    const doc = await CandidateDocument.findOne({
      _id        : req.params.docId,
      candidateId: req.params.id,
      tenantId   : req.user.tenantId,
    });
    if (!doc) throw new AppError('Document not found.', 404);

    doc.verificationStatus = verificationStatus;
    doc.verificationNote   = verificationNote || '';
    doc.verifiedBy         = req.user._id;
    doc.verifiedAt         = new Date();
    await doc.save();

    // If needs-resubmission, email the candidate
    if (verificationStatus === 'needs_resubmission') {
      const candidate = await Candidate.findById(req.params.id).select('name email').lean();
      if (candidate?.email) {
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px">
            <h3 style="color:#e11d48">📄 Document Resubmission Required</h3>
            <p>Hi ${candidate.name?.split(' ')[0] || 'there'},</p>
            <p>We need you to re-upload your <strong>${doc.label || doc.documentType}</strong>.</p>
            ${verificationNote ? `<p><strong>Reason:</strong> ${verificationNote}</p>` : ''}
            <p>Please log in to your TalentNest portal and re-upload the document at your earliest convenience.</p>
          </div>`;
        sendEmailWithRetry(candidate.email, `Action Required: Resubmit ${doc.label || doc.documentType}`, html).catch(() => {});
      }
    }

    res.json({ success: true, data: { ...doc.toObject(), id: doc._id.toString() } });
  })
);

module.exports = router;
