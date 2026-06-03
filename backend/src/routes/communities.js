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
  // ── Technology ──────────────────────────────────────────────────────────────
  { name: 'Java Community',          slug: 'java',               icon: '☕', category: 'tech',     coverColor: '#F59E0B', description: 'Java developers, architects, and learners. Share tips, code, and career advice.' },
  { name: 'Cyber Security',          slug: 'cybersecurity',      icon: '🔐', category: 'tech',     coverColor: '#DC2626', description: 'Security professionals sharing threats, tools, certifications, and career insights.' },
  { name: 'Data Science & AI',       slug: 'datascience',        icon: '📊', category: 'tech',     coverColor: '#7C3AED', description: 'Data scientists, ML engineers, and AI enthusiasts discussing the future of data.' },
  { name: 'Full Stack Developers',   slug: 'fullstack',          icon: '💻', category: 'tech',     coverColor: '#0891B2', description: 'Frontend, backend, and full stack devs — frameworks, projects, and career growth.' },
  { name: 'Python Developers',       slug: 'python',             icon: '🐍', category: 'tech',     coverColor: '#2563EB', description: 'Python enthusiasts sharing scripts, libraries, automation tools, and best practices.' },
  { name: 'JavaScript & Node.js',    slug: 'javascript',         icon: '⚡', category: 'tech',     coverColor: '#CA8A04', description: 'JS developers discussing frameworks, Node.js, APIs, and the modern web ecosystem.' },
  { name: 'React & Frontend',        slug: 'react-frontend',     icon: '⚛', category: 'tech',     coverColor: '#06B6D4', description: 'React, Vue, Angular — frontend engineers sharing UI patterns, tools, and performance tips.' },
  { name: 'DevOps & Cloud',          slug: 'devops',             icon: '☁', category: 'tech',     coverColor: '#1E3A5F', description: 'DevOps engineers and SREs discussing CI/CD, Kubernetes, Docker, and cloud operations.' },
  { name: 'Mobile Development',      slug: 'mobile',             icon: '📱', category: 'tech',     coverColor: '#10B981', description: 'iOS, Android, Flutter, and React Native developers sharing mobile dev insights.' },
  { name: 'Machine Learning & LLMs', slug: 'machine-learning',   icon: '🤖', category: 'tech',     coverColor: '#6D28D9', description: 'Explore deep learning, transformers, large language models, and applied ML research.' },
  { name: 'Blockchain & Web3',       slug: 'web3',               icon: '🔗', category: 'tech',     coverColor: '#F97316', description: 'Web3 builders discussing crypto, smart contracts, DeFi, and decentralized applications.' },
  { name: 'Cloud Architecture',      slug: 'cloud',              icon: '🏗', category: 'tech',     coverColor: '#1E40AF', description: 'Architects designing scalable, resilient cloud solutions on AWS, Azure, and GCP.' },
  { name: 'QA & Testing',            slug: 'qa-testing',         icon: '🧪', category: 'tech',     coverColor: '#7C3AED', description: 'QA engineers sharing automation frameworks, test strategies, and quality tools.' },
  { name: 'Open Source',             slug: 'open-source',        icon: '🌐', category: 'tech',     coverColor: '#059669', description: 'Open source contributors collaborating on projects, PRs, and community governance.' },
  { name: 'Database & Backend',      slug: 'database',           icon: '🗄', category: 'tech',     coverColor: '#374151', description: 'Backend devs and DBAs discussing SQL, NoSQL, ORMs, APIs, and system design.' },
  { name: 'Software Architecture',   slug: 'architecture',       icon: '📐', category: 'tech',     coverColor: '#0F766E', description: 'Engineers discussing design patterns, microservices, event-driven systems, and scalability.' },
  { name: '.NET & C# Developers',    slug: 'dotnet',             icon: '🔷', category: 'tech',     coverColor: '#512BD4', description: '.NET and C# developers sharing frameworks, Azure integrations, and enterprise patterns.' },
  // ── HR & Recruiting ─────────────────────────────────────────────────────────
  { name: 'Recruiter Hub',           slug: 'recruiters',         icon: '🎯', category: 'hr',       coverColor: '#0176D3', description: 'Recruiters sharing sourcing strategies, hiring tips, and industry news.' },
  { name: 'HR Professionals',        slug: 'hr-pros',            icon: '👔', category: 'hr',       coverColor: '#059669', description: 'HR leaders sharing policies, culture building, and employee experience insights.' },
  { name: 'Talent Acquisition',      slug: 'talent-acquisition', icon: '🔍', category: 'hr',       coverColor: '#7C3AED', description: 'TA specialists discussing sourcing, interviews, employer branding, and ATS tools.' },
  { name: 'Learning & Development',  slug: 'learning',           icon: '📚', category: 'hr',       coverColor: '#0891B2', description: 'L&D professionals sharing training strategies, e-learning tools, and skill frameworks.' },
  { name: 'Compensation & Benefits', slug: 'comp-benefits',      icon: '💰', category: 'hr',       coverColor: '#D97706', description: 'Comp and benefits pros sharing salary benchmarks, equity structures, and perks design.' },
  { name: 'DEI & Inclusion',         slug: 'dei',                icon: '🌈', category: 'hr',       coverColor: '#EC4899', description: 'Diversity, equity, and inclusion leaders sharing programs, data, and best practices.' },
  { name: 'People Analytics',        slug: 'people-analytics',   icon: '📉', category: 'hr',       coverColor: '#1E40AF', description: 'Data-driven HR professionals discussing workforce analytics and people metrics.' },
  { name: 'Employee Experience',     slug: 'employee-experience',icon: '⭐', category: 'hr',       coverColor: '#F59E0B', description: 'HR and culture champions building great workplace experiences and engagement programs.' },
  // ── Business ────────────────────────────────────────────────────────────────
  { name: 'Sales & Business Dev',    slug: 'sales',              icon: '📈', category: 'business', coverColor: '#D97706', description: 'Sales professionals sharing strategies, playbooks, and career growth tips.' },
  { name: 'Marketing & Growth',      slug: 'marketing',          icon: '📣', category: 'business', coverColor: '#DC2626', description: 'Marketers sharing campaigns, SEO, content marketing, and growth strategies.' },
  { name: 'Finance & Accounting',    slug: 'finance',            icon: '💼', category: 'business', coverColor: '#065F46', description: 'Finance professionals discussing accounting, FP&A, auditing, and financial modeling.' },
  { name: 'Operations & Strategy',   slug: 'operations',         icon: '⚙', category: 'business', coverColor: '#374151', description: 'Operations managers and strategists discussing process optimization and execution.' },
  { name: 'Entrepreneurship',        slug: 'entrepreneurship',   icon: '🚀', category: 'business', coverColor: '#7C3AED', description: 'Founders and aspiring entrepreneurs sharing startup journeys, fundraising, and lessons.' },
  { name: 'Leadership & Management', slug: 'leadership',         icon: '👑', category: 'business', coverColor: '#0176D3', description: 'Leaders and managers sharing people skills, frameworks, and executive career paths.' },
  { name: 'Customer Success',        slug: 'customer-success',   icon: '🌟', category: 'business', coverColor: '#059669', description: 'CS professionals sharing retention strategies, onboarding playbooks, and success tools.' },
  { name: 'Project Management',      slug: 'project-management', icon: '📋', category: 'business', coverColor: '#0891B2', description: 'PMs discussing agile, scrum, stakeholder management, and delivery frameworks.' },
  { name: 'Supply Chain & Logistics',slug: 'supply-chain',       icon: '🚚', category: 'business', coverColor: '#B45309', description: 'Supply chain professionals discussing procurement, logistics, and global operations.' },
  // ── Design ──────────────────────────────────────────────────────────────────
  { name: 'Product & Design',        slug: 'product',            icon: '🎨', category: 'design',   coverColor: '#EC4899', description: 'Product managers and designers discussing UX, strategy, and roadmaps.' },
  { name: 'UX Research',             slug: 'ux-research',        icon: '🔬', category: 'design',   coverColor: '#7C3AED', description: 'UX researchers sharing methodologies, user interview tips, and usability insights.' },
  { name: 'Graphic Design',          slug: 'graphic-design',     icon: '✏', category: 'design',   coverColor: '#DC2626', description: 'Visual designers sharing typography, illustration, branding, and creative tools.' },
  { name: 'Brand Strategy',          slug: 'brand',              icon: '🏷', category: 'design',   coverColor: '#D97706', description: 'Brand strategists discussing identity, positioning, visual systems, and storytelling.' },
  { name: 'Motion & Animation',      slug: 'motion',             icon: '🎬', category: 'design',   coverColor: '#0891B2', description: 'Motion designers and animators sharing techniques, tools, and creative inspiration.' },
  // ── Other ───────────────────────────────────────────────────────────────────
  { name: 'Healthcare & Biotech',    slug: 'healthcare',         icon: '🏥', category: 'other',    coverColor: '#059669', description: 'Healthcare and biotech professionals discussing innovation, careers, and industry trends.' },
  { name: 'Education & EdTech',      slug: 'edtech',             icon: '🎓', category: 'other',    coverColor: '#0176D3', description: 'Educators and edtech professionals sharing teaching innovations and learning tools.' },
  { name: 'Media & Content',         slug: 'media-content',      icon: '📝', category: 'other',    coverColor: '#7C3AED', description: 'Content creators, journalists, and media professionals sharing stories and strategies.' },
  { name: 'Remote Work',             slug: 'remote-work',        icon: '🏠', category: 'other',    coverColor: '#0891B2', description: 'Remote workers sharing productivity tips, async tools, and work-from-anywhere insights.' },
  { name: 'Freshers & Early Careers',slug: 'early-careers',      icon: '🌱', category: 'other',    coverColor: '#059669', description: 'Students and recent grads navigating first jobs, internships, and career beginnings.' },
  { name: 'Legal & Compliance',      slug: 'legal',              icon: '⚖', category: 'other',    coverColor: '#374151', description: 'Legal professionals sharing compliance updates, contract tips, and industry regulations.' },
  { name: 'Women in Tech',           slug: 'women-in-tech',      icon: '👩', category: 'other',    coverColor: '#EC4899', description: 'Supporting and celebrating women in technology, engineering, and product roles.' },
];

// ─── GET /api/communities — list all communities for the tenant ───────────────
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const uid      = String(req.user._id || req.user.id);

  // Upsert each default by slug — adds new ones without overwriting existing data
  const createdBy = req.user._id || req.user.id;
  await Promise.all(
    DEFAULTS.map(d =>
      Community.findOneAndUpdate(
        { tenantId, slug: d.slug },
        { $setOnInsert: { ...d, tenantId, createdBy, memberIds: [], memberCount: 0 } },
        { upsert: true }
      )
    )
  );

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
