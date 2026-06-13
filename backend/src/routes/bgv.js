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
    const filter = { userId: req.params.userId, deletedAt: null };
    if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
    const docs = await BgvDocument.find(filter)
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: docs.map(norm) });
  }));

// ── GET /api/bgv/:id/file — fetch single doc with fileUrl (for preview) ───────
router.get('/:id/file', authMiddleware, asyncHandler(async (req, res) => {
  const doc = await BgvDocument.findOne({ _id: req.params.id, deletedAt: null }).lean();
  if (!doc) throw new AppError('Document not found.', 404);
  const isOwner = String(doc.userId) === String(req.user.id);
  const isStaff = ['admin', 'super_admin', 'recruiter'].includes(req.user.role)
    && (req.user.role === 'super_admin' || String(doc.tenantId) === String(req.user.tenantId));
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

  if (doc.tenantId) {
    const { fireWebhooks } = require('../services/webhookService');
    fireWebhooks(doc.tenantId, 'bgv.submitted', { userId: String(req.user.id), docType, docName: doc.docName }).catch(() => {});
  }

  res.status(201).json({ success: true, data: norm(doc) });
}));

// ── PATCH /api/bgv/:id/verify — admin marks a document verified/rejected ─────
router.patch('/:id/verify', authMiddleware, allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const { status, rejectNote } = req.body;
    if (!['verified', 'rejected', 'under_review'].includes(status)) throw new AppError('Invalid status.', 400);
    const docFilter = { _id: req.params.id };
    if (req.user.role !== 'super_admin') docFilter.tenantId = req.user.tenantId;
    const doc = await BgvDocument.findOneAndUpdate(
      docFilter,
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

// ── GET /api/bgv/admin/all — super_admin: all docs grouped by user ────────────
router.get('/admin/all', authMiddleware, allowRoles('super_admin'),
  asyncHandler(async (req, res) => {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const skip  = (page - 1) * limit;
    const statusFilter = req.query.status; // optional: uploaded|under_review|verified|rejected

    const match = { deletedAt: null };
    if (statusFilter) match.status = statusFilter;

    // Aggregate: group docs by userId, pull user profile
    const [rows, total] = await Promise.all([
      BgvDocument.aggregate([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $group: {
          _id: '$userId',
          docs: { $push: {
            id: { $toString: '$_id' },
            docType: '$docType', docName: '$docName',
            status: '$status', mimeType: '$mimeType',
            fileSize: '$fileSize', rejectNote: '$rejectNote',
            createdAt: '$createdAt', updatedAt: '$updatedAt',
          }},
          totalDocs:   { $sum: 1 },
          verifiedDocs:{ $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] } },
          pendingDocs: { $sum: { $cond: [{ $in: ['$status', ['uploaded', 'under_review']] }, 1, 0] } },
          rejectedDocs:{ $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
          latestUpload:{ $max: '$createdAt' },
        }},
        { $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        }},
        { $unwind: { path: '$user', preserveNullAndEmpty: true } },
        { $project: {
          userId:      '$_id',
          name:        { $ifNull: ['$user.name', 'Unknown'] },
          email:       { $ifNull: ['$user.email', ''] },
          phone:       { $ifNull: ['$user.phone', ''] },
          bgvVerified: { $ifNull: ['$user.bgvVerified', false] },
          bgvVerifiedAt:'$user.bgvVerifiedAt',
          totalDocs:   1,
          verifiedDocs:1,
          pendingDocs: 1,
          rejectedDocs:1,
          latestUpload:1,
          docs:        1,
        }},
        { $sort: { latestUpload: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      BgvDocument.aggregate([
        { $match: match },
        { $group: { _id: '$userId' } },
        { $count: 'n' },
      ]).then(r => r[0]?.n || 0),
    ]);

    // Add docTypeLabel to each doc
    rows.forEach(row => {
      row.docs = row.docs.map(d => ({ ...d, docTypeLabel: DOC_TYPE_LABELS[d.docType] || d.docType }));
    });

    res.json({ success: true, data: rows, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
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
