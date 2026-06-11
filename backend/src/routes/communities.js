'use strict';
const express      = require('express');
const router       = express.Router();
const Community    = require('../models/Community');
const User         = require('../models/User');
const Candidate    = require('../models/Candidate');
const Tenant       = require('../models/Tenant');
const FeedPost     = require('../models/FeedPost');
const { authMiddleware: auth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../utils/AppError');

// ─── PUBLIC: GET /api/communities/public/:slug — no auth, for share links ────
// Must be defined BEFORE router.use(auth) so it doesn't require a token.
router.get('/public/:slug', asyncHandler(async (req, res) => {
  const community = await Community.findOne({ slug: req.params.slug }).lean();
  if (!community) return res.status(404).json({ success: false, error: 'Community not found.' });

  // Return 3 recent posts as a preview (no full user data)
  const posts = await FeedPost.find({ communityId: community._id, isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(3)
    .select('content postType authorName authorRole createdAt reactions hashtags')
    .lean();

  res.json({
    success: true,
    data: {
      name:        community.name,
      slug:        community.slug,
      description: community.description,
      icon:        community.icon,
      coverColor:  community.coverColor,
      category:    community.category,
      memberCount: community.memberCount || 0,
    },
    previewPosts: posts,
  });
}));

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

// ─── College auto-community helpers ──────────────────────────────────────────
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeCollegeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function collegeSlug(name) {
  return String(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Matches users belonging to a college community even if they haven't filled
 * in the standalone "College/School Name" field — many existing accounts only
 * have it recorded inside their educationList JSON. */
function collegeMemberFilter(name) {
  const normalized = name.trim().replace(/\s+/g, ' ');
  const exact = { $regex: '^' + escapeRegex(normalized) + '$', $options: 'i' };
  return {
    deletedAt: null,
    $or: [
      { college: exact },
      { college: { $in: [null, ''] }, educationList: { $regex: escapeRegex(normalized), $options: 'i' } },
    ],
  };
}

/** Matches users whose current employer matches the given company name
 * (case/whitespace-insensitive), used for auto-membership in company communities. */
function companyMemberFilter(name) {
  const normalized = name.trim().replace(/\s+/g, ' ');
  const exact = { $regex: '^' + escapeRegex(normalized) + '$', $options: 'i' };
  return {
    deletedAt: null,
    currentCompany: exact,
  };
}

/** Parses a JSON-array string field (educationList), tolerating legacy/invalid
 * values by returning an empty array. */
function parseJsonArray(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Returns the education entry with the highest "year" (most recent), or null. */
function getLatestEducation(education) {
  let latest = null;
  (education || []).forEach(e => {
    const y = parseInt(e?.year, 10);
    if (!latest || (Number.isFinite(y) && y > (parseInt(latest?.year, 10) || -Infinity))) {
      latest = e;
    }
  });
  return latest;
}

/** Ensures every active 'college' Tenant has a matching auto-membership Community.
 * Students/alumni whose User.college matches the tenant's name are automatically
 * members of this community — no explicit join needed. */
async function ensureCollegeCommunities(createdBy) {
  const colleges = await Tenant.find({ type: 'college', deletedAt: null }).select('name').lean();
  await Promise.all(colleges.map(async (t) => {
    const name = String(t.name || '').trim().replace(/\s+/g, ' ');
    if (!name) return;
    const exists = await Community.findOne({ collegeName: { $regex: '^' + escapeRegex(name) + '$', $options: 'i' } }).select('_id').lean();
    if (exists) return;

    const baseSlug = collegeSlug(name);
    let slug = baseSlug;
    let attempt = 0;
    while (await Community.exists({ slug })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    await Community.create({
      tenantId: t._id,
      name: `${name} Community`,
      slug,
      collegeName: name,
      description: `Official community for ${name} students and alumni — placement updates, opportunities, and discussions.`,
      icon: '🎓',
      category: 'other',
      coverColor: '#0176D3',
      isGlobal: true,
      memberIds: [],
      memberCount: 0,
      createdBy,
    }).catch(() => {}); // ignore races (unique slug index)
  }));
}

// Throttle the heavier candidate-derived sync passes below — they scan the
// full Candidate collection, so they only need to run periodically (new
// communities show up within this window) rather than on every request.
let lastCandidateCollegeSync = 0;
let lastCandidateCompanySync = 0;
const CANDIDATE_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/** Creates a community for any college name found in candidates' profiles
 * (College/School Name field, falling back to education history) that doesn't
 * already have one — even if no Campus Portal (Tenant) has been registered for
 * it. This is how "new colleges" discovered from candidate signups/profiles
 * automatically get a community without any manual setup. */
async function ensureCollegeCommunitiesFromCandidates(createdBy, fallbackTenantId) {
  if (!fallbackTenantId) return;
  const now = Date.now();
  if (now - lastCandidateCollegeSync < CANDIDATE_SYNC_INTERVAL_MS) return;
  lastCandidateCollegeSync = now;

  const candidates = await Candidate.find({ deletedAt: null }).select('college educationList').lean();
  const names = new Map();
  for (const c of candidates) {
    let name = String(c.college || '').trim().replace(/\s+/g, ' ');
    if (!name) {
      const latest = getLatestEducation(parseJsonArray(c.educationList));
      if (latest?.institution) name = String(latest.institution).trim().replace(/\s+/g, ' ');
    }
    if (name && name.length >= 3) names.set(name.toLowerCase(), name);
  }

  // Only create communities for names that don't have one yet, in small
  // batches per pass — new colleges fully appear within a few sync windows
  // without a single request having to create dozens of documents at once.
  const missing = [];
  for (const name of names.values()) {
    const exists = await Community.findOne({ collegeName: { $regex: '^' + escapeRegex(name) + '$', $options: 'i' } }).select('_id').lean();
    if (!exists) missing.push(name);
  }

  await Promise.all(missing.slice(0, 25).map(async (name) => {
    const baseSlug = collegeSlug(name);
    let slug = baseSlug;
    let attempt = 0;
    while (await Community.exists({ slug })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    await Community.create({
      tenantId: fallbackTenantId,
      name: `${name} Community`,
      slug,
      collegeName: name,
      description: `Official community for ${name} students and alumni — placement updates, opportunities, and discussions.`,
      icon: '🎓',
      category: 'other',
      coverColor: '#0176D3',
      isGlobal: true,
      memberIds: [],
      memberCount: 0,
      createdBy,
    }).catch(() => {}); // ignore races (unique slug index)
  }));
}

// Placeholder/non-company values that sometimes end up in the free-text
// "Current Company" field — these should never become communities.
const COMPANY_NAME_BLOCKLIST = new Set([
  'n/a', 'na', 'none', 'nil', 'nothing', '-', '--', 'n.a', 'n.a.',
  'self', 'self employed', 'self-employed', 'freelance', 'freelancer',
  'fresher', 'unemployed', 'not applicable', 'not working', 'currently not working',
  'currently unemployed', 'no company', 'tbd', 'na.',
]);

/** Creates a community for any company name found in candidates' "Current
 * Company" field that doesn't already have one. Mirrors the college community
 * auto-creation above — new companies discovered from candidate profiles
 * automatically get a community for reviews/discussions/referrals. */
async function ensureCompanyCommunities(createdBy, fallbackTenantId) {
  if (!fallbackTenantId) return;
  const now = Date.now();
  if (now - lastCandidateCompanySync < CANDIDATE_SYNC_INTERVAL_MS) return;
  lastCandidateCompanySync = now;

  const companyNames = await Candidate.distinct('currentCompany', { deletedAt: null, currentCompany: { $exists: true, $ne: '' } });
  const names = new Map();
  companyNames.forEach(raw => {
    const name = String(raw || '').trim().replace(/\s+/g, ' ');
    if (name.length < 2 || COMPANY_NAME_BLOCKLIST.has(name.toLowerCase())) return;
    names.set(name.toLowerCase(), name);
  });

  const missing = [];
  for (const name of names.values()) {
    const exists = await Community.findOne({ companyName: { $regex: '^' + escapeRegex(name) + '$', $options: 'i' } }).select('_id').lean();
    if (!exists) missing.push(name);
  }

  await Promise.all(missing.slice(0, 25).map(async (name) => {
    const baseSlug = collegeSlug(name);
    let slug = baseSlug;
    let attempt = 0;
    while (await Community.exists({ slug })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    await Community.create({
      tenantId: fallbackTenantId,
      name: `${name} Community`,
      slug,
      companyName: name,
      description: `Official community for ${name} employees and alumni — referrals, opportunities, and discussions.`,
      icon: '🏢',
      category: 'other',
      coverColor: '#0176D3',
      isGlobal: true,
      memberIds: [],
      memberCount: 0,
      createdBy,
    }).catch(() => {}); // ignore races (unique slug index)
  }));
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

// ─── POST /api/communities/merge-duplicates — super_admin: merge duplicate slugs ─
router.post('/merge-duplicates', asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin') throw new AppError('Only super admins can merge communities.', 403);

  const all = await Community.find({}).sort({ createdAt: 1 }).lean();

  // Group by slug
  const bySlug = {};
  all.forEach(c => {
    if (!bySlug[c.slug]) bySlug[c.slug] = [];
    bySlug[c.slug].push(c);
  });

  let mergedGroups = 0;
  let deletedDocs  = 0;

  for (const docs of Object.values(bySlug)) {
    if (docs.length <= 1) continue;

    // Keep the first (oldest by createdAt), merge memberIds from all
    const keeper     = docs[0];
    const rest       = docs.slice(1);
    const allMembers = [...new Set(docs.flatMap(d => d.memberIds.map(id => String(id))))];

    await Community.findByIdAndUpdate(keeper._id, {
      $set: { memberIds: allMembers, memberCount: allMembers.length },
    });

    // Re-assign feed posts from duplicate documents to keeper
    const dupIds = rest.map(d => d._id);
    await FeedPost.updateMany(
      { communityId: { $in: dupIds } },
      { $set: { communityId: keeper._id, communitySlug: keeper.slug } },
    );

    await Community.deleteMany({ _id: { $in: dupIds } });

    mergedGroups++;
    deletedDocs += rest.length;
  }

  res.json({ success: true, message: `Merged ${mergedGroups} duplicate slug group(s), deleted ${deletedDocs} duplicate document(s).`, mergedGroups, deletedDocs });
}));

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

// ─── GET /api/communities — list all communities (global, cross-tenant) ──────
router.get('/', asyncHandler(async (req, res) => {
  const uid      = String(req.user._id || req.user.id);

  // Upsert each default by slug only — one canonical community per slug, shared across all tenants
  const createdBy = req.user._id || req.user.id;
  await Promise.all(
    DEFAULTS.map(d =>
      Community.findOneAndUpdate(
        { slug: d.slug },
        { $setOnInsert: { ...d, createdBy, memberIds: [], memberCount: 0 } },
        { upsert: true }
      )
    )
  );

  // Auto-create one community per College/Campus tenant (e.g. "Sree Vidyanikethan Community")
  await ensureCollegeCommunities(createdBy);
  // Auto-create communities for any other colleges/companies discovered from
  // candidate profiles (College/School Name, education history, Current Company).
  // Run in the background so this request isn't blocked on a full candidate scan.
  ensureCollegeCommunitiesFromCandidates(createdBy, req.user.tenantId).catch(() => {});
  ensureCompanyCommunities(createdBy, req.user.tenantId).catch(() => {});

  const allCommunities = await Community.find({}).sort({ memberCount: -1, name: 1 }).lean();

  // Deduplicate by slug — DB may have stale duplicates from before upsert logic was added
  const seenSlugs = new Set();
  const unique = allCommunities.filter(c => {
    if (seenSlugs.has(c.slug)) return false;
    seenSlugs.add(c.slug);
    return true;
  });

  // Students/alumni whose college matches a community's collegeName are automatically
  // members — no explicit join required. Determine if the requesting user qualifies.
  // College admins/placement officers don't fill in a "college" field on their own
  // profile, so fall back to their tenant's name to find/highlight their college's
  // own community.
  let userCollege = normalizeCollegeName(req.user.college);
  if (!userCollege && req.user.tenantType === 'college' && req.user.tenantId) {
    const myTenant = await Tenant.findById(req.user.tenantId).select('name').lean();
    if (myTenant?.name) userCollege = normalizeCollegeName(myTenant.name);
  }

  // Live headcount for each college community = students whose college matches,
  // regardless of whether they're in memberIds.
  const collegeCommunities = unique.filter(c => c.collegeName);
  const collegeCounts = {};
  if (collegeCommunities.length) {
    await Promise.all(collegeCommunities.map(async (c) => {
      collegeCounts[c.slug] = await User.countDocuments(collegeMemberFilter(c.collegeName));
    }));
  }

  // Same idea for company communities, keyed off the user's "Current Company".
  const userCompany = normalizeCollegeName(req.user.currentCompany);
  const companyCommunities = unique.filter(c => c.companyName);
  const companyCounts = {};
  if (companyCommunities.length) {
    await Promise.all(companyCommunities.map(async (c) => {
      companyCounts[c.slug] = await User.countDocuments(companyMemberFilter(c.companyName));
    }));
  }

  const data = unique.map(c => {
    const isCollegeMember = !!c.collegeName && userCollege && normalizeCollegeName(c.collegeName) === userCollege;
    const isCompanyMember = !!c.companyName && userCompany && normalizeCollegeName(c.companyName) === userCompany;
    return {
      ...c,
      isMember: c.memberIds.some(id => String(id) === uid) || isCollegeMember || isCompanyMember,
      isOwnCollege: isCollegeMember,
      isOwnCompany: isCompanyMember,
      memberCount: c.collegeName ? Math.max(c.memberCount || 0, collegeCounts[c.slug] || 0)
                 : c.companyName ? Math.max(c.memberCount || 0, companyCounts[c.slug] || 0)
                 : c.memberCount,
      memberIds: undefined,
    };
  });

  // Surface the user's own college/company community at the top of the list so
  // it isn't buried among the dozens of default communities.
  data.sort((a, b) => (b.isOwnCollege - a.isOwnCollege) || (b.isOwnCompany - a.isOwnCompany));

  res.json({ success: true, data, total: data.length });
}));

// ─── GET /api/communities/:slug — single community detail (global) ───────────
router.get('/:slug', asyncHandler(async (req, res) => {
  const uid      = String(req.user._id || req.user.id);

  const community = await Community.findOne({ slug: req.params.slug }).lean();
  if (!community) throw new AppError('Community not found.', 404);

  let members;
  let memberCount = community.memberCount || 0;
  if (community.collegeName) {
    // College communities: every student/alumnus whose College/School Name matches
    // is automatically a member, regardless of memberIds.
    const memberFilter = collegeMemberFilter(community.collegeName);
    const [collegeMembers, collegeCount] = await Promise.all([
      User.find(memberFilter).select('name role title avatarUrl photoUrl college').sort({ createdAt: -1 }).limit(10).lean(),
      User.countDocuments(memberFilter),
    ]);
    members = collegeMembers;
    memberCount = Math.max(memberCount, collegeCount);
  } else if (community.companyName) {
    // Company communities: every user whose Current Company matches is
    // automatically a member, regardless of memberIds.
    const memberFilter = companyMemberFilter(community.companyName);
    const [companyMembers, companyCount] = await Promise.all([
      User.find(memberFilter).select('name role title avatarUrl photoUrl currentCompany').sort({ createdAt: -1 }).limit(10).lean(),
      User.countDocuments(memberFilter),
    ]);
    members = companyMembers;
    memberCount = Math.max(memberCount, companyCount);
  } else {
    // Top 10 members (cross-tenant visible — any user who joined is shown)
    const memberIds = (community.memberIds || []).slice(0, 10);
    members = await User.find({
      _id: { $in: memberIds }, deletedAt: null,
    }).select('name role title avatarUrl photoUrl').lean();
  }

  // Recent posts count (last 30 days, across all tenants)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentPostCount = await FeedPost.countDocuments({
    communityId: community._id, isDeleted: false, createdAt: { $gte: since },
  });

  const userCollege = normalizeCollegeName(req.user.college);
  const isCollegeMember = !!community.collegeName && userCollege && normalizeCollegeName(community.collegeName) === userCollege;
  const userCompany = normalizeCollegeName(req.user.currentCompany);
  const isCompanyMember = !!community.companyName && userCompany && normalizeCollegeName(community.companyName) === userCompany;

  res.json({
    success: true,
    data: {
      ...community,
      isMember: (community.memberIds || []).some(id => String(id) === uid) || isCollegeMember || isCompanyMember,
      memberCount,
      topMembers: members,
      recentPostCount,
    },
  });
}));

// ─── POST /api/communities/:slug/join — join a community (global) ───────────
router.post('/:slug/join', asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const userId   = req.user._id || req.user.id;
  const userName = req.user.name || 'A member';

  const community = await Community.findOne({ slug: req.params.slug });
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

    // Broadcast member join to all users watching this community
    try {
      const u = req.user;
      const socketRegistry = require('../socket');
      const { emitToTenant } = require('../socket/platformSocket');
      const memberSnap = { _id: String(userId), name: u.name || '', role: u.role || '', title: u.title || '', avatarUrl: u.avatarUrl || '' };
      emitToTenant(socketRegistry.getIO(), tenantId, 'community:memberJoined', {
        slug: req.params.slug,
        communityId: String(community._id),
        member: memberSnap,
        memberCount: community.memberCount,
      });
    } catch {}
  }

  res.json({ success: true, memberCount: community.memberCount, isMember: true });
}));

// ─── POST /api/communities/:slug/leave — leave a community (global) ─────────
router.post('/:slug/leave', asyncHandler(async (req, res) => {
  const userId   = String(req.user._id || req.user.id);

  const community = await Community.findOne({ slug: req.params.slug });
  if (!community) throw new AppError('Community not found.', 404);

  const idx = community.memberIds.findIndex(id => String(id) === userId);
  if (idx >= 0) {
    community.memberIds.splice(idx, 1);
    community.memberCount = community.memberIds.length;
    await community.save();

    // Broadcast member leave
    try {
      const socketRegistry = require('../socket');
      const { emitToTenant } = require('../socket/platformSocket');
      emitToTenant(socketRegistry.getIO(), req.user.tenantId, 'community:memberLeft', {
        slug: req.params.slug,
        communityId: String(community._id),
        userId,
        memberCount: community.memberCount,
      });
    } catch {}
  }

  res.json({ success: true, memberCount: community.memberCount, isMember: false });
}));

// ─── GET /api/communities/:slug/feed — smart-filtered posts for community ────
router.get('/:slug/feed', asyncHandler(async (req, res) => {
  const tenantId = req.user.tenantId;
  const { page = 1, limit = 200 } = req.query;
  const lim  = Math.min(200, parseInt(limit));
  const skip = (Math.max(1, parseInt(page)) - 1) * lim;

  const community = await Community.findOne({ slug: req.params.slug }).lean();
  if (!community) throw new AppError('Community not found.', 404);

  const hashtags = getCommunityHashtags(community);

  // Show posts explicitly tagged to this community (cross-tenant) OR tenant-specific posts with matching hashtags
  const filter = {
    isDeleted: false,
    $or: [
      { communityId: community._id },
      { tenantId, hashtags: { $in: hashtags } },
    ],
  };

  const [posts, total] = await Promise.all([
    FeedPost.find(filter).sort({ isPinned: -1, createdAt: -1 }).skip(skip).limit(lim).lean(),
    FeedPost.countDocuments(filter),
  ]);

  res.json({ success: true, data: posts, total, page: parseInt(page), hasMore: skip + posts.length < total, community });
}));

// ─── GET /api/communities/:slug/members — paginated community members (global) ─
router.get('/:slug/members', asyncHandler(async (req, res) => {
  const { page = 1, limit = 200 } = req.query;
  const lim  = Math.min(200, parseInt(limit));
  const skip = (Math.max(1, parseInt(page)) - 1) * lim;

  const community = await Community.findOne({ slug: req.params.slug }).lean();
  if (!community) throw new AppError('Community not found.', 404);

  if (community.collegeName) {
    // College communities: membership is automatic — every student/alumnus
    // whose College/School Name matches this community is listed.
    const collegeRegex = { $regex: '^' + escapeRegex(community.collegeName.trim().replace(/\s+/g, ' ')) + '$', $options: 'i' };
    const filter = { college: collegeRegex, deletedAt: null };
    const [members, total] = await Promise.all([
      User.find(filter).select('name role title avatarUrl photoUrl location department college')
        .sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      User.countDocuments(filter),
    ]);
    return res.json({ success: true, data: members, total, hasMore: skip + members.length < total });
  }

  if (community.companyName) {
    // Company communities: membership is automatic — every user whose Current
    // Company matches this community is listed.
    const filter = companyMemberFilter(community.companyName);
    const [members, total] = await Promise.all([
      User.find(filter).select('name role title avatarUrl photoUrl location department currentCompany')
        .sort({ createdAt: -1 }).skip(skip).limit(lim).lean(),
      User.countDocuments(filter),
    ]);
    return res.json({ success: true, data: members, total, hasMore: skip + members.length < total });
  }

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
  const community = await Community.findOne({ slug: req.params.slug }).lean();
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

// ─── POST /api/communities/:slug/seed-posts — seed posts using real platform users ─
router.post('/:slug/seed-posts', asyncHandler(async (req, res) => {
  const tenantId  = req.user.tenantId;
  const community = await Community.findOne({ slug: req.params.slug });
  if (!community) throw new AppError('Community not found.', 404);

  const existing = await FeedPost.countDocuments({ tenantId, communityId: community._id, isDeleted: false });
  if (existing >= 10) return res.json({ success: true, message: 'Posts already seeded.', count: existing });

  // Use real platform users — pull as many as exist
  const users = await User.find({ tenantId, deletedAt: null }).select('name role title avatarUrl department location').limit(20).lean();
  if (!users.length) return res.json({ success: false, message: 'No users found in this organization.' });

  const tags = getCommunityHashtags(community).slice(0, 3).join(' ');
  const name = community.name;

  const TEMPLATES = [
    { t: 'announcement', c: `Welcome to the ${name} community! 🎉 This is your space to share insights, ask questions, and grow together. Start by introducing yourself below — what brings you here and what are you working on?\n\n${tags} #WelcomePost` },
    { t: 'question',     c: `Quick question for the ${name} community: What's one skill that completely changed how you work in this space? Drop your answer below — I'll compile the top answers into a resource post. 💡\n\n${tags} #CareerGrowth` },
    { t: 'tip',          c: `Pro tip 🔥: When you're stuck in ${name}, the fastest way to get unstuck is to write down what you know vs. what you don't know. That clarity alone often reveals the next step.\n\n${tags} #ProductivityHack` },
    { t: 'update',       c: `Loving the quality of conversations in this ${name} community. The collective experience here is genuinely impressive. Keep sharing — it's making a difference for a lot of people. 🙌\n\n${tags} #CommunityUpdate` },
    { t: 'resource',     c: `Resource drop 📎: If you're in ${name}, here are 3 things that have helped me most:\n1️⃣ Building systems before you need them\n2️⃣ Documenting every win, big and small\n3️⃣ Finding a peer group who challenges you\n\n${tags} #FreeResource` },
    { t: 'achievement',  c: `Milestone worth sharing 🏆: Just crossed a major goal in my ${name} journey this quarter. The key? Consistency over intensity. Small daily actions compound into big results. What's your recent win? Share below!\n\n${tags} #CareerWin` },
    { t: 'hiring',       c: `We're actively building our team and looking for people passionate about ${name}. If you or someone you know wants to work in a high-ownership, fast-learning environment — DM me or tag them below! 🚀\n\n${tags} #Hiring #NowHiring` },
    { t: 'question',     c: `Community poll time! 📊 In ${name}, which is harder:\nA) Finding the right strategy\nB) Executing consistently\nC) Measuring what matters\n\nComment your pick and why. Curious to see where people are stuck most.\n\n${tags} #Discussion` },
    { t: 'tip',          c: `If you're new to ${name}, here's what I wish someone told me earlier:\n• Done is better than perfect\n• Your network is your net worth\n• Document everything — your future self will thank you\n\nSave this for when you need a reminder. 📌\n\n${tags} #BeginnerTips` },
    { t: 'update',       c: `Something I've noticed in high-performing ${name} professionals: they spend as much time reflecting on their work as doing it. 10 minutes of honest reflection after any project is worth more than hours of grinding forward blindly. 🔍\n\n${tags} #Mindset #Growth` },
  ];

  const REACTION_TYPES = ['like', 'celebrate', 'support', 'insightful'];
  const COMMENT_POOL = [
    'This is exactly what I needed to hear today, thank you!',
    'Great perspective — completely agree with this.',
    'Saving this post. So relevant to where I am right now.',
    'This community keeps delivering. 🔥',
    'Question: how long did it take you to see results with this approach?',
    'Shared this with my team — they found it really helpful.',
    'Underrated take. More people need to hear this.',
    'Been thinking about this exact thing. Thanks for putting it into words.',
  ];

  const created = [];
  const toCreate = TEMPLATES.slice(0, Math.min(10, TEMPLATES.length));

  for (let i = 0; i < toCreate.length; i++) {
    const author = users[i % users.length];
    const createdAt = new Date(Date.now() - (i + 1) * 4 * 3600000); // 4h apart
    const post = await FeedPost.create({
      tenantId,
      authorId    : author._id,
      authorName  : author.name  || 'TalentNest Member',
      authorRole  : author.role  || 'candidate',
      authorAvatar: author.avatarUrl || '',
      authorTitle : author.title || roleTitle(author.role),
      content     : toCreate[i].c,
      postType    : toCreate[i].t,
      hashtags    : extractHashtags(toCreate[i].c),
      communityId  : community._id,
      communitySlug: community.slug,
      createdAt,
      updatedAt   : createdAt,
    });

    // Reactions from other real users (up to 4)
    const reactors = users.filter(u => String(u._id) !== String(author._id)).slice(0, 4);
    reactors.forEach((r, ri) => post.reactions.push({ userId: r._id, type: REACTION_TYPES[(i + ri) % 4] }));

    // 1-2 comments from other real users
    const commenters = users.filter(u => String(u._id) !== String(author._id)).slice(1, 3);
    commenters.forEach((c, ci) => {
      if (Math.random() > 0.35) {
        post.comments.push({
          userId    : c._id,
          userName  : c.name || 'Member',
          userAvatar: c.avatarUrl || '',
          userRole  : c.role || '',
          userTitle : c.title || '',
          content   : COMMENT_POOL[(i + ci) % COMMENT_POOL.length],
          createdAt : new Date(createdAt.getTime() + (ci + 1) * 30 * 60000),
        });
      }
    });

    await post.save();
    created.push(post._id);
  }

  res.json({ success: true, message: `${created.length} posts created for ${name} using real platform users.`, count: created.length });
}));

// ─── PATCH /api/communities/:slug — super_admin: edit community details ───────
router.patch('/:slug', asyncHandler(async (req, res) => {
  if (req.user.role !== 'super_admin') throw new AppError('Only super admins can edit communities.', 403);

  const allowed = ['name', 'description', 'icon', 'coverColor', 'category', 'isGlobal'];
  const updates = {};
  allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  if (Object.keys(updates).length === 0) throw new AppError('No valid fields to update.', 400);

  const community = await Community.findOneAndUpdate(
    { slug: req.params.slug },
    { $set: updates },
    { new: true },
  ).lean();

  if (!community) throw new AppError('Community not found.', 404);
  res.json({ success: true, data: community });
}));

module.exports = router;
