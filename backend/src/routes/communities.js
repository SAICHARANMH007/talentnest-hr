'use strict';
const express      = require('express');
const router       = express.Router();
const Community    = require('../models/Community');
const User         = require('../models/User');
const FeedPost     = require('../models/FeedPost');
const { authMiddleware: auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../utils/AppError');

router.use(auth);

// ─── Default community definitions ───────────────────────────────────────────
const DEFAULTS = [
  { name: 'Java Community',         slug: 'java',          icon: '☕', category: 'tech',     coverColor: '#F59E0B', description: 'Java developers, architects, and learners. Share tips, code, and career advice.' },
  { name: 'Cyber Security',         slug: 'cybersecurity', icon: '🔐', category: 'tech',     coverColor: '#DC2626', description: 'Security professionals sharing threats, tools, certifications, and career insights.' },
  { name: 'Data Science & AI',      slug: 'datascience',   icon: '📊', category: 'tech',     coverColor: '#7C3AED', description: 'Data scientists, ML engineers, and AI enthusiasts discussing the future of data.' },
  { name: 'Recruiter Hub',          slug: 'recruiters',    icon: '🎯', category: 'hr',       coverColor: '#0176D3', description: 'Recruiters sharing sourcing strategies, hiring tips, and industry news.' },
  { name: 'HR Professionals',       slug: 'hr-pros',       icon: '👔', category: 'hr',       coverColor: '#059669', description: 'HR leaders sharing policies, culture building, and employee experience insights.' },
  { name: 'Product & Design',       slug: 'product',       icon: '🎨', category: 'design',   coverColor: '#EC4899', description: 'Product managers and designers discussing UX, strategy, and roadmaps.' },
  { name: 'Full Stack Developers',  slug: 'fullstack',     icon: '💻', category: 'tech',     coverColor: '#0891B2', description: 'Frontend, backend, and full stack devs — frameworks, projects, and career growth.' },
  { name: 'Sales & Business Dev',   slug: 'sales',         icon: '📈', category: 'business', coverColor: '#D97706', description: 'Sales professionals sharing strategies, playbooks, and career growth tips.' },
];

// ─── GET /api/communities — list all communities for the tenant ───────────────
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const uid      = String(req.user._id || req.user.id);

  // Auto-seed default communities if none exist for this tenant
  let count = await Community.countDocuments({ tenantId });
  if (count === 0) {
    await Community.insertMany(
      DEFAULTS.map(d => ({ ...d, tenantId, createdBy: req.user._id || req.user.id }))
    );
  }

  const communities = await Community.find({ tenantId }).sort({ memberCount: -1, name: 1 }).lean();

  const data = communities.map(c => ({
    ...c,
    isMember: c.memberIds.some(id => String(id) === uid),
    memberIds: undefined, // don't expose full list on listing
  }));

  res.json({ success: true, data, total: data.length });
}));

// ─── GET /api/communities/:slug — single community detail ────────────────────
router.get('/:slug', asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const uid      = String(req.user._id || req.user.id);

  const community = await Community.findOne({ tenantId, slug: req.params.slug }).lean();
  if (!community) throw new AppError('Community not found.', 404);

  // Top 10 members
  const memberIds = (community.memberIds || []).slice(0, 10);
  const members   = await User.find({
    _id: { $in: memberIds }, tenantId, deletedAt: null,
  }).select('name role title avatarUrl photoUrl').lean();

  // Recent posts count (last 30 days)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentPostCount = await FeedPost.countDocuments({
    tenantId, communityId: community._id, isDeleted: false, createdAt: { $gte: since },
  });

  res.json({
    success: true,
    data: {
      ...community,
      isMember: (community.memberIds || []).some(id => String(id) === uid),
      topMembers: members,
      recentPostCount,
    },
  });
}));

// ─── POST /api/communities/:slug/join — join a community ────────────────────
router.post('/:slug/join', asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const userId   = req.user._id || req.user.id;

  const community = await Community.findOne({ tenantId, slug: req.params.slug });
  if (!community) throw new AppError('Community not found.', 404);

  const alreadyMember = community.memberIds.some(id => String(id) === String(userId));
  if (!alreadyMember) {
    community.memberIds.push(userId);
    community.memberCount = community.memberIds.length;
    await community.save();
  }

  res.json({ success: true, memberCount: community.memberCount, isMember: true });
}));

// ─── POST /api/communities/:slug/leave — leave a community ──────────────────
router.post('/:slug/leave', asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const userId   = String(req.user._id || req.user.id);

  const community = await Community.findOne({ tenantId, slug: req.params.slug });
  if (!community) throw new AppError('Community not found.', 404);

  const idx = community.memberIds.findIndex(id => String(id) === userId);
  if (idx >= 0) {
    community.memberIds.splice(idx, 1);
    community.memberCount = community.memberIds.length;
    await community.save();
  }

  res.json({ success: true, memberCount: community.memberCount, isMember: false });
}));

// ─── GET /api/communities/:slug/feed — paginated posts for community ─────────
router.get('/:slug/feed', asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const { page = 1, limit = 20 } = req.query;
  const skip = (Math.max(1, parseInt(page)) - 1) * Math.min(50, parseInt(limit));

  const community = await Community.findOne({ tenantId, slug: req.params.slug }).lean();
  if (!community) throw new AppError('Community not found.', 404);

  const filter = { tenantId, communityId: community._id, isDeleted: false };

  const [posts, total] = await Promise.all([
    FeedPost.find(filter).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(Math.min(50, parseInt(limit))).lean(),
    FeedPost.countDocuments(filter),
  ]);

  res.json({ success: true, data: posts, total, page: parseInt(page), hasMore: skip + posts.length < total });
}));

module.exports = router;
