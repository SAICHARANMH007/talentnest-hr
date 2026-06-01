'use strict';
const express      = require('express');
const { authenticate: auth } = require('../middleware/auth');
const { tenantGuard }  = require('../middleware/tenantGuard');
const { allowRoles }   = require('../middleware/rbac');
const asyncHandler     = require('../utils/asyncHandler');
const AppError         = require('../utils/AppError');
const CompanyReview    = require('../models/CompanyReview');

const router = express.Router();
const guard  = [auth, tenantGuard];

// GET /api/company-reviews — public: list approved reviews for an org by slug
router.get('/public/:orgSlug', asyncHandler(async (req, res) => {
  const Organization = require('../models/Organization');
  const org = await Organization.findOne({ slug: req.params.orgSlug, deletedAt: null }).lean();
  if (!org) return res.json({ success: true, data: [] });

  const reviews = await CompanyReview.find({
    tenantId: org._id, isApproved: true, deletedAt: null,
  }).sort({ createdAt: -1 }).limit(20).lean();

  const avg = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  res.json({ success: true, data: reviews, avgRating: avg, total: reviews.length });
}));

// POST /api/company-reviews/public/:orgSlug — public: submit a review
router.post('/public/:orgSlug', asyncHandler(async (req, res) => {
  const Organization = require('../models/Organization');
  const org = await Organization.findOne({ slug: req.params.orgSlug, deletedAt: null }).lean();
  if (!org) throw new AppError('Organisation not found.', 404);

  const { rating, title, pros, cons, role, reviewerName, isAnonymous } = req.body;
  if (!rating || rating < 1 || rating > 5) throw new AppError('Rating 1-5 is required.', 400);

  await CompanyReview.create({
    tenantId: org._id,
    reviewerName: isAnonymous ? 'Anonymous' : (reviewerName?.trim() || 'Anonymous'),
    role: role?.trim() || '',
    rating: Math.round(rating),
    title: title?.trim() || '',
    pros: pros?.trim() || '',
    cons: cons?.trim() || '',
    isAnonymous: isAnonymous !== false,
    isApproved: false, // pending admin approval
  });
  res.json({ success: true, message: 'Review submitted for approval. Thank you!' });
}));

// GET /api/company-reviews — admin: list all reviews (pending + approved)
router.get('/', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const reviews = await CompanyReview.find({ tenantId: req.tenantId, deletedAt: null })
    .sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: reviews });
}));

// PATCH /api/company-reviews/:id/approve — admin approves a review
router.patch('/:id/approve', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const r = await CompanyReview.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: { isApproved: true } }, { new: true }
  );
  if (!r) throw new AppError('Review not found.', 404);
  res.json({ success: true, data: r });
}));

// DELETE /api/company-reviews/:id — admin removes a review
router.delete('/:id', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const r = await CompanyReview.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.tenantId },
    { $set: { deletedAt: new Date() } }
  );
  if (!r) throw new AppError('Review not found.', 404);
  res.json({ success: true });
}));

module.exports = router;
