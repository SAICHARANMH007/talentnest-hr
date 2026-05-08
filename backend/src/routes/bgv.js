'use strict';
const express      = require('express');
const router       = express.Router();
const multer       = require('multer');
const BgvDocument  = require('../models/BgvDocument');
const User         = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { allowRoles }     = require('../middleware/rbac');
const asyncHandler       = require('../utils/asyncHandler');
const AppError           = require('../utils/AppError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    cb(null, allowed.includes(file.mimetype));
  },
});

const DOC_TYPE_LABELS = {
  aadhaar         : 'Aadhaar Card',
  pan             : 'PAN Card',
  passport        : 'Passport',
  degree          : 'Educational Certificate / Degree',
  salary_slip     : 'Salary Slip',
  exp_letter      : 'Experience Letter',
  relieving_letter: 'Relieving Letter',
  address_proof   : 'Address Proof',
  bank_details    : 'Bank Details / Cancelled Cheque',
  reference       : 'Reference Contact',
  other           : 'Other Document',
};

function norm(d) {
  const o = d.toObject ? d.toObject() : { ...d };
  o.id = o.id || o._id?.toString();
  o.docTypeLabel = DOC_TYPE_LABELS[o.docType] || o.docType;
  // Never send file content in list responses — only in single-doc fetch
  delete o.fileUrl;
  return o;
}

// ── GET /api/bgv — list my BGV documents (candidate) ─────────────────────────
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  const docs = await BgvDocument.find({ userId: req.user.id, deletedAt: null })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: docs.map(norm) });
}));

// ── GET /api/bgv/user/:userId — admin/recruiter view a candidate's docs ───────
router.get('/user/:userId', authMiddleware, allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const docs = await BgvDocument.find({ userId: req.params.userId, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: docs.map(norm) });
  }));

// ── GET /api/bgv/:id/file — fetch single doc with fileUrl (for preview) ───────
router.get('/:id/file', authMiddleware, asyncHandler(async (req, res) => {
  const doc = await BgvDocument.findOne({ _id: req.params.id, deletedAt: null }).lean();
  if (!doc) throw new AppError('Document not found.', 404);
  const isOwner = String(doc.userId) === String(req.user.id);
  const isStaff = ['admin', 'super_admin', 'recruiter'].includes(req.user.role);
  if (!isOwner && !isStaff) throw new AppError('Access denied.', 403);
  res.json({ success: true, data: { ...norm(doc), fileUrl: doc.fileUrl } });
}));

// ── POST /api/bgv — upload a BGV document ────────────────────────────────────
router.post('/', authMiddleware, upload.single('file'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded.', 400);
  const { docType = 'other', docName } = req.body;
  const mime    = req.file.mimetype;
  const fileUrl = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
  const doc = await BgvDocument.create({
    userId   : req.user.id,
    tenantId : req.user.tenantId || null,
    docType,
    docName  : (docName || req.file.originalname).slice(0, 200),
    fileUrl,
    fileSize : req.file.size,
    mimeType : mime,
  });
  res.status(201).json({ success: true, data: norm(doc) });
}));

// ── PATCH /api/bgv/:id/verify — admin marks a document verified/rejected ─────
router.patch('/:id/verify', authMiddleware, allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const { status, rejectNote } = req.body;
    if (!['verified', 'rejected', 'under_review'].includes(status)) throw new AppError('Invalid status.', 400);
    const doc = await BgvDocument.findByIdAndUpdate(
      req.params.id,
      { $set: { status, rejectNote: rejectNote || '', verifiedBy: req.user.id, verifiedAt: new Date() } },
      { new: true }
    );
    if (!doc) throw new AppError('Document not found.', 404);

    // If ALL docs are verified, mark the user as BGV verified
    if (status === 'verified') {
      const pending = await BgvDocument.countDocuments({
        userId: doc.userId, deletedAt: null, status: { $in: ['uploaded', 'under_review', 'rejected'] }
      });
      if (pending === 0) {
        await User.findByIdAndUpdate(doc.userId, { $set: { bgvVerified: true, bgvVerifiedAt: new Date() } });
      }
    }

    res.json({ success: true, data: norm(doc) });
  }));

// ── DELETE /api/bgv/:id — candidate deletes their own document ────────────────
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const doc = await BgvDocument.findOne({ _id: req.params.id, deletedAt: null });
  if (!doc) throw new AppError('Document not found.', 404);
  const isOwner = String(doc.userId) === String(req.user.id);
  const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
  if (!isOwner && !isAdmin) throw new AppError('Access denied.', 403);
  doc.deletedAt = new Date();
  await doc.save();
  res.json({ success: true });
}));

module.exports = router;
