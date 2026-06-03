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

// POST /api/company-reviews/seed — admin: create 20 demo reviews
router.post('/seed', ...guard, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const existing = await CompanyReview.countDocuments({ tenantId: req.tenantId, deletedAt: null });
  if (existing >= 10) return res.json({ success: true, message: 'Seed data already exists.', count: existing });

  const DEMO = [
    { rating: 5, title: 'Incredible workplace culture', pros: 'Amazing team, transparent leadership, flexible work hours, strong learning culture and great career growth opportunities.', cons: 'Fast-paced environment can be overwhelming at times, but manageable with good time management.', role: 'Software Engineer', isAnonymous: false, reviewerName: 'Arjun M.' },
    { rating: 4, title: 'Great place to grow your career', pros: 'Strong mentoring programs, regular feedback cycles, competitive salary and amazing tech stack.', cons: 'Onboarding process could be better structured. Took a few weeks to get fully up to speed.', role: 'Product Manager', isAnonymous: true, reviewerName: 'Anonymous' },
    { rating: 5, title: 'Best company I have worked for', pros: 'Genuinely cares about employees. Generous leave policy, health benefits, and fun team activities.', cons: 'Would love more remote flexibility for certain roles.', role: 'UX Designer', isAnonymous: false, reviewerName: 'Priya S.' },
    { rating: 3, title: 'Decent company with room to improve', pros: 'Good work-life balance and supportive manager. Interesting projects.', cons: 'Salary is slightly below market rate. Internal communication can be better.', role: 'Data Analyst', isAnonymous: true, reviewerName: 'Anonymous' },
    { rating: 5, title: 'Highly recommend for fresh graduates', pros: 'Excellent training programs, good exposure to real projects from day one. Very collaborative team.', cons: 'Growth can be slow in the first year, but it picks up after that.', role: 'Software Trainee', isAnonymous: false, reviewerName: 'Kavya R.' },
    { rating: 4, title: 'Positive interview and joining experience', pros: 'Fast recruitment process, transparent about role expectations, warm welcome from the team.', cons: 'Office commute is a bit far from the city center.', role: 'HR Executive', isAnonymous: true, reviewerName: 'Anonymous' },
    { rating: 2, title: 'High expectations but low support', pros: 'Good product and vision. The tech team is strong.', cons: 'Work-life balance is poor. Long hours are expected. Management could be more empathetic.', role: 'Backend Developer', isAnonymous: true, reviewerName: 'Anonymous' },
    { rating: 5, title: 'Transparent and employee-first culture', pros: 'Leadership is accessible, town halls are regular, and feedback is genuinely acted upon. Great health insurance.', cons: 'Could benefit from a better knowledge management system.', role: 'Talent Acquisition Specialist', isAnonymous: false, reviewerName: 'Siddharth P.' },
    { rating: 4, title: 'Solid company with modern tech', pros: 'Modern tech stack, agile processes, good code review culture. Engineers are respected.', cons: 'Lack of dedicated design resources sometimes puts extra work on developers.', role: 'Full Stack Developer', isAnonymous: true, reviewerName: 'Anonymous' },
    { rating: 3, title: 'Mixed experience overall', pros: 'Good pay, nice office space, some interesting projects.', cons: 'Management decisions are not always transparent. Some politics at senior levels.', role: 'Project Manager', isAnonymous: true, reviewerName: 'Anonymous' },
    { rating: 5, title: 'Great for learning and growth', pros: 'Cross-functional exposure, hackathons, certifications sponsored. Leadership actively mentors junior employees.', cons: 'Benefits package could include more options.', role: 'Cloud Engineer', isAnonymous: false, reviewerName: 'Meera T.' },
    { rating: 4, title: 'Excellent hiring process experience', pros: 'The interview process was fair, structured, and respectful. Got feedback within 24 hours.', cons: 'Salary negotiation was a bit rigid. Not much flexibility.', role: 'DevOps Engineer', isAnonymous: true, reviewerName: 'Anonymous' },
    { rating: 5, title: 'Proud to be part of this company', pros: 'Mission-driven company, great benefits, diverse team. The work genuinely matters.', cons: 'High performance bar can be stressful during appraisal cycles.', role: 'Marketing Manager', isAnonymous: false, reviewerName: 'Rohan K.' },
    { rating: 4, title: 'Good team and helpful management', pros: 'My manager was very supportive. Regular 1-on-1s, clear OKRs, and realistic deadlines.', cons: 'Cross-team coordination could be smoother.', role: 'Business Analyst', isAnonymous: true, reviewerName: 'Anonymous' },
    { rating: 3, title: 'Average company, good people', pros: 'Very friendly colleagues. Good office location.', cons: 'Career growth seems limited unless you are in engineering. HR processes need improvement.', role: 'Sales Executive', isAnonymous: true, reviewerName: 'Anonymous' },
    { rating: 5, title: 'Exceptional onboarding and support', pros: 'Very well-organized onboarding. Got a buddy and a manager who was always available. Felt valued from day one.', cons: 'Nothing significant to complain about.', role: 'Recruiter', isAnonymous: false, reviewerName: 'Anjali G.' },
    { rating: 4, title: 'Remote-friendly and flexible', pros: 'Fully remote option available. Great tools and infrastructure. Regular team meets.', cons: 'Time zone differences can make collaboration hard for distributed teams.', role: 'Content Strategist', isAnonymous: true, reviewerName: 'Anonymous' },
    { rating: 2, title: 'Needs to improve leadership communication', pros: 'Good product. Technical team is solid.', cons: 'Leadership does not communicate changes well. Decisions seem top-down without employee input.', role: 'QA Engineer', isAnonymous: true, reviewerName: 'Anonymous' },
    { rating: 5, title: 'Best decision to join this team', pros: 'Work-life balance is genuinely respected. Flexible hours, no micromanagement, talented colleagues.', cons: 'Would love more public recognition for team achievements.', role: 'Data Scientist', isAnonymous: false, reviewerName: 'Aditya N.' },
    { rating: 4, title: 'Good company for mid-level professionals', pros: 'Challenging projects, ownership culture, good salary benchmarking process.', cons: 'Entry-level positions have less visibility. Growth is faster at senior levels.', role: 'Product Designer', isAnonymous: true, reviewerName: 'Anonymous' },
  ];

  const now = Date.now();
  const toCreate = DEMO.map((d, i) => ({
    ...d,
    tenantId: req.tenantId,
    isApproved: i < 14, // first 14 are pre-approved, last 6 are pending
    deletedAt: null,
    createdAt: new Date(now - (DEMO.length - i) * 3 * 24 * 3600000),
  }));

  await CompanyReview.insertMany(toCreate);
  res.json({ success: true, message: `Seeded ${toCreate.length} demo reviews.`, count: toCreate.length });
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
