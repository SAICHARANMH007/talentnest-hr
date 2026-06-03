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

// ─── Hashtag & keyword maps per community slug ────────────────────────────────
const SLUG_HASHTAGS = {
  'java':               ['#java','#springboot','#spring','#jvm','#maven'],
  'cybersecurity':      ['#security','#cybersecurity','#infosec','#hacking','#vulnerability'],
  'datascience':        ['#datascience','#machinelearning','#ml','#analytics','#ai','#data'],
  'fullstack':          ['#fullstack','#webdev','#developer','#engineering','#backend','#frontend'],
  'python':             ['#python','#django','#flask','#automation','#scripting'],
  'javascript':         ['#javascript','#nodejs','#typescript','#reactjs','#webdev'],
  'react-frontend':     ['#react','#reactjs','#frontend','#ui','#ux','#css'],
  'devops':             ['#devops','#kubernetes','#docker','#cicd','#cloud','#aws'],
  'mobile':             ['#mobile','#ios','#android','#flutter','#reactnative'],
  'machine-learning':   ['#machinelearning','#ml','#deeplearning','#nlp','#ai'],
  'web3':               ['#web3','#blockchain','#crypto','#defi'],
  'cloud':              ['#cloud','#aws','#azure','#gcp','#devops','#terraform'],
  'qa-testing':         ['#testing','#qa','#automation','#selenium'],
  'open-source':        ['#opensource','#github','#contribution'],
  'database':           ['#database','#sql','#nosql','#mongodb','#postgresql'],
  'architecture':       ['#architecture','#microservices','#systemdesign','#scalability'],
  'dotnet':             ['#dotnet','#csharp','#aspnet','#microsoft'],
  'recruiters':         ['#recruiting','#hiring','#sourcing','#talentacquisition','#hiringdoneright','#recruitment'],
  'hr-pros':            ['#hr','#humanresources','#hrmanagement','#hrmetrics','#hiringops','#interviewkit'],
  'talent-acquisition': ['#talentacquisition','#hiring','#recruiting','#sourcing'],
  'learning':           ['#learning','#training','#upskilling','#career','#development'],
  'comp-benefits':      ['#compensation','#benefits','#salary','#equity'],
  'dei':                ['#dei','#diversity','#inclusion','#inclusivehiring'],
  'people-analytics':   ['#hranalytics','#peopleanalytics','#data','#metrics'],
  'employee-experience':['#candidateexperience','#interviewexperience','#engagement','#culture'],
  'sales':              ['#sales','#businessdev','#b2b','#revenue'],
  'marketing':          ['#marketing','#growth','#seo','#content','#digital'],
  'finance':            ['#finance','#accounting','#revenue','#budget'],
  'operations':         ['#operations','#strategy','#process','#efficiency'],
  'entrepreneurship':   ['#startup','#entrepreneurship','#founder','#fundraising'],
  'leadership':         ['#leadership','#management','#mentoring'],
  'customer-success':   ['#customersuccess','#retention','#onboarding','#candidateexperience'],
  'project-management': ['#projectmanagement','#agile','#scrum','#pmp'],
  'supply-chain':       ['#supplychain','#logistics','#procurement'],
  'product':            ['#product','#productmanagement','#ux','#design','#roadmap'],
  'ux-research':        ['#ux','#userresearch','#usability','#design'],
  'graphic-design':     ['#design','#graphicdesign','#branding','#figma'],
  'brand':              ['#brand','#branding','#identity','#marketing'],
  'motion':             ['#motion','#animation','#design','#creative'],
  'healthcare':         ['#healthcare','#biotech','#medtech','#pharma'],
  'edtech':             ['#edtech','#education','#elearning','#teaching'],
  'media-content':      ['#content','#media','#journalism','#writing'],
  'remote-work':        ['#remotework','#remote','#wfh','#async'],
  'early-careers':      ['#earlycareer','#freshers','#internship','#graduate','#newjob','#nextchapter'],
  'legal':              ['#legal','#compliance','#law'],
  'women-in-tech':      ['#womenintech','#diversity','#inclusion','#stem'],
};

const CATEGORY_HASHTAGS = {
  tech:     ['#coding','#software','#tech','#developer','#engineering','#openrole'],
  hr:       ['#hr','#hiring','#recruiting','#talentmanagement','#hrquestion'],
  business: ['#business','#management','#strategy'],
  design:   ['#design','#creative','#ui','#ux'],
  other:    ['#career','#networking','#talentnest'],
};

function getCommunityHashtags(community) {
  const bySlug     = SLUG_HASHTAGS[community.slug]     || [];
  const byCategory = CATEGORY_HASHTAGS[community.category] || [];
  return [...new Set([...bySlug, ...byCategory])];
}

function roleTitle(role) {
  return { admin: 'HR Administrator', recruiter: 'Talent Acquisition Specialist', candidate: 'Job Seeker', super_admin: 'Platform Admin', superadmin: 'Platform Admin' }[role] || 'TalentNest Member';
}

function extractHashtags(text) {
  const m = (text || '').match(/#[a-zA-Z0-9_]+/g);
  return m ? [...new Set(m.map(h => h.toLowerCase()))] : [];
}

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

// ─── POST /api/communities — create a new community (admin/recruiter/superadmin) ──
router.post('/', asyncHandler(async (req, res) => {
  const role = req.user.role;
  if (!['admin', 'super_admin', 'superadmin', 'recruiter'].includes(role)) {
    throw new AppError('Only admins and recruiters can create communities.', 403);
  }
  const tenantId = req.user.tenantId;
  const { name, description, icon, category, coverColor } = req.body;
  if (!name?.trim()) throw new AppError('Community name is required.', 400);

  // Generate slug from name
  const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  let slug = baseSlug;
  let attempt = 0;
  while (await Community.exists({ tenantId, slug })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const community = await Community.create({
    tenantId,
    name: name.trim(),
    slug,
    description: description?.trim() || '',
    icon: icon || '💬',
    category: ['tech','hr','business','design','other'].includes(category) ? category : 'other',
    coverColor: coverColor || '#0176D3',
    memberIds: [req.user._id || req.user.id],
    memberCount: 1,
    createdBy: req.user._id || req.user.id,
  });

  res.status(201).json({ success: true, data: community });
}));

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

  // Top 10 members (cross-tenant visible — any user who joined is shown)
  const memberIds = (community.memberIds || []).slice(0, 10);
  const members   = await User.find({
    _id: { $in: memberIds }, deletedAt: null,
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
  const userName = req.user.name || 'A member';

  const community = await Community.findOne({ tenantId, slug: req.params.slug });
  if (!community) throw new AppError('Community not found.', 404);

  const alreadyMember = community.memberIds.some(id => String(id) === String(userId));
  if (!alreadyMember) {
    community.memberIds.push(userId);
    community.memberCount = community.memberIds.length;
    await community.save();

    // Notify community creator (if different from joiner)
    const creatorId = community.createdBy;
    if (creatorId && String(creatorId) !== String(userId)) {
      const Notification = require('../models/Notification');
      Notification.create({
        userId  : creatorId,
        tenantId,
        type    : 'system',
        title   : `New member joined ${community.name}`,
        message : `${userName} joined the "${community.name}" community you manage.`,
        link    : `/app/communities/${community.slug}`,
        read    : false,
      }).catch(() => {});
    }
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

// ─── GET /api/communities/:slug/feed — smart-filtered posts for community ────
router.get('/:slug/feed', asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const { page = 1, limit = 20 } = req.query;
  const lim  = Math.min(50, parseInt(limit));
  const skip = (Math.max(1, parseInt(page)) - 1) * lim;

  const community = await Community.findOne({ tenantId, slug: req.params.slug }).lean();
  if (!community) throw new AppError('Community not found.', 404);

  const hashtags = getCommunityHashtags(community);

  // Show posts explicitly tagged to this community OR posts with matching hashtags
  const filter = {
    tenantId,
    isDeleted: false,
    $or: [
      { communityId: community._id },
      { hashtags: { $in: hashtags } },
    ],
  };

  const [posts, total] = await Promise.all([
    FeedPost.find(filter).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(lim).lean(),
    FeedPost.countDocuments(filter),
  ]);

  res.json({ success: true, data: posts, total, page: parseInt(page), hasMore: skip + posts.length < total, community });
}));

// ─── GET /api/communities/:slug/members — paginated community members ─────────
router.get('/:slug/members', asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const { page = 1, limit = 20 } = req.query;
  const lim  = Math.min(50, parseInt(limit));
  const skip = (Math.max(1, parseInt(page)) - 1) * lim;

  const community = await Community.findOne({ tenantId, slug: req.params.slug }).lean();
  if (!community) throw new AppError('Community not found.', 404);

  const memberIds = (community.memberIds || []);
  const paginated = memberIds.slice(skip, skip + lim);

  const members = await User.find({
    _id: { $in: paginated },
    deletedAt: null,  // cross-tenant: any user who joined is visible
  }).select('name role title avatarUrl photoUrl location department').lean();

  res.json({ success: true, data: members, total: memberIds.length, hasMore: skip + members.length < memberIds.length });
}));

// ─── GET /api/communities/:slug/jobs — relevant jobs for community ─────────
router.get('/:slug/jobs', asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const community = await Community.findOne({ tenantId, slug: req.params.slug }).lean();
  if (!community) throw new AppError('Community not found.', 404);

  const Job = require('../models/Job');

  // Build keyword regex from community slug + name words
  const hashtags = getCommunityHashtags(community);
  const rawWords = hashtags.map(h => h.replace('#', ''));
  // Also add words from community name
  const nameWords = community.name.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const keywords  = [...new Set([...rawWords, ...nameWords])];
  const regexStr  = keywords.join('|');
  const rx        = new RegExp(regexStr, 'i');

  const jobs = await Job.find({
    tenantId,
    status: 'active',
    deletedAt: null,
    $or: [
      { title:       rx },
      { department:  rx },
      { description: rx },
      { skills:      { $elemMatch: { $regex: regexStr, $options: 'i' } } },
    ],
  })
    .select('title companyName company location jobType department skills salaryMin salaryMax salaryCurrency experience updatedAt')
    .sort({ updatedAt: -1 })
    .limit(15)
    .lean();

  res.json({ success: true, data: jobs });
}));

// ─── POST /api/communities/:slug/seed-posts — seed sample posts for community ─
router.post('/:slug/seed-posts', asyncHandler(async (req, res) => {
  const tenantId  = req.user.tenantId;
  const community = await Community.findOne({ tenantId, slug: req.params.slug });
  if (!community) throw new AppError('Community not found.', 404);

  // Only seed if fewer than 3 community-specific posts exist
  const existing = await FeedPost.countDocuments({ tenantId, communityId: community._id, isDeleted: false });
  if (existing >= 3) return res.json({ success: true, message: 'Posts already seeded.', count: existing });

  const users = await User.find({ tenantId, deletedAt: null }).select('name role title avatarUrl').limit(6).lean();
  if (!users.length) return res.json({ success: false, message: 'No users found.' });

  // Build community-specific seed posts
  const hashtags = (getCommunityHashtags(community).slice(0, 3)).join(' ');
  const name = community.name;
  const POSTS = [
    {
      content: `Welcome to ${name}! 🎉 This is your space to share insights, ask questions, and connect with professionals in this space. Drop an introduction below!\n\n${hashtags} #Community`,
      postType: 'announcement',
    },
    {
      content: `What's the one skill or tool in ${name} that changed how you work? Share below — this community learns best when we share real experience! 💡\n\n${hashtags} #CareerAdvice`,
      postType: 'question',
    },
    {
      content: `Pro tip for anyone in ${name}: the best way to grow is to teach what you know. Start small — a post, a thread, a comment. Knowledge compounds. 🚀\n\n${hashtags} #ProTip #Learning`,
      postType: 'tip',
    },
    {
      content: `Excited to see this ${name} community growing! The conversations here are exactly what professionals in this field need. Let's build something great together. 🤝\n\n${hashtags} #Networking`,
      postType: 'update',
    },
    {
      content: `Resource alert 📎: Looking for great resources related to ${name}? Drop your top links, books, or courses in the comments. Let's build a community resource list!\n\n${hashtags} #FreeResource #Learning`,
      postType: 'resource',
    },
  ];

  const REACTION_TYPES = ['like', 'celebrate', 'support', 'insightful'];
  const created = [];
  for (let i = 0; i < Math.min(5, POSTS.length); i++) {
    const author = users[i % users.length];
    const hoursAgo = (i + 1) * 6;
    const createdAt = new Date(Date.now() - hoursAgo * 3600000);
    const post = await FeedPost.create({
      tenantId,
      authorId    : author._id,
      authorName  : author.name || 'TalentNest Member',
      authorRole  : author.role || 'candidate',
      authorAvatar: author.avatarUrl || '',
      authorTitle : author.title || roleTitle(author.role),
      content     : POSTS[i].content,
      postType    : POSTS[i].postType,
      hashtags    : extractHashtags(POSTS[i].content),
      communityId  : community._id,
      communitySlug: community.slug,
      createdAt,
      updatedAt   : createdAt,
    });
    // Add a couple of reactions
    for (const reactor of users.filter(u => String(u._id) !== String(author._id)).slice(0, 2)) {
      post.reactions.push({ userId: reactor._id, type: REACTION_TYPES[i % REACTION_TYPES.length] });
    }
    await post.save();
    created.push(post._id);
  }

  res.json({ success: true, message: `${created.length} posts seeded for ${name}.`, count: created.length });
}));

module.exports = router;
