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
const { normalizeCompanyName, companyNameVariants } = require('../utils/companyNames');
const { normalizeCollegeKey } = require('../utils/collegeNames');

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
  return normalizeCollegeKey(name);
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

/** Builds a case-insensitive regex matching the given (canonical) company name
 * or any of its common legal-suffix/abbreviation variants (e.g. "Tcs", "TCS",
 * "Infosys Ltd") — shared by the User and Candidate company-member queries. */
function companyNameRegex(name) {
  const variants = companyNameVariants(name);
  const pattern = '^(' + variants.map(escapeRegex).join('|') + ')$';
  return { $regex: pattern, $options: 'i' };
}

/** Matches users whose current employer matches the given (canonical) company
 * name — including common legal-suffix and abbreviation variants (e.g. "Tcs",
 * "TCS", "Infosys Ltd") — used for auto-membership in company communities. */
function companyMemberFilter(name) {
  return {
    deletedAt: null,
    currentCompany: companyNameRegex(name),
  };
}

/** Maps a Candidate document (no User login account) to the same shape used
 * for community member lists, so candidate-only profiles show up alongside
 * registered users in college/company community member lists. */
function candidateToMember(c) {
  return {
    _id: c._id,
    name: c.name || c.email || 'Candidate',
    role: 'candidate',
    title: 'Candidate',
    avatarUrl: c.avatarUrl || c.photoUrl || '',
    photoUrl: c.photoUrl || c.avatarUrl || '',
    location: c.location || '',
    department: c.department || '',
    college: c.college || '',
    currentCompany: c.currentCompany || '',
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

/** Picks the company name a candidate's company community membership should
 * be based on when "Current Company" is blank — the role marked as their
 * current job in their work-experience history, or else the most recent one
 * by end/start year, or else the last entry added. Used so adding "Accenture"
 * as a work-experience entry is enough to join the Accenture community, even
 * for freshers who never filled the standalone "Current Company" field. */
function getCurrentOrLatestCompany(workHistory) {
  const entries = (workHistory || []).filter(w => w?.company);
  if (!entries.length) return '';
  const current = entries.find(w => w.current);
  if (current) return current.company;
  const parseYear = (s) => {
    const m = String(s || '').match(/(\d{4})/);
    return m ? parseInt(m[1], 10) : -Infinity;
  };
  let best = entries[0];
  let bestYear = Math.max(parseYear(best.to), parseYear(best.from));
  for (const e of entries.slice(1)) {
    const y = Math.max(parseYear(e.to), parseYear(e.from));
    if (y >= bestYear) { best = e; bestYear = y; }
  }
  return best.company;
}

/** De-duplicates candidate records by email (case-insensitive) — imports/
 * re-saves can leave more than one Candidate document for the same person,
 * which otherwise shows up as the same person listed twice in member lists. */
function dedupeCandidatesByEmail(list) {
  const seen = new Set();
  const out = [];
  for (const c of list) {
    const key = c.email ? String(c.email).toLowerCase().trim() : `_id:${c._id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

// Cache for getResolvedCandidates() — it scans the full Candidate collection
// plus a User fallback lookup, so results are reused for a few minutes.
let resolvedCandidatesCache = null;
let resolvedCandidatesCacheAt = 0;
const RESOLVED_CANDIDATES_CACHE_MS = 5 * 60 * 1000; // 5 minutes

/** De-duplicates candidates by email (same as dashboard.js's college/company
 * groups reports) and resolves each one's effective college name — own
 * College/School Name, falling back to the linked User's college/
 * educationList, falling back to the latest institution in education
 * history — and effective (canonical) company name. This single resolved
 * list is the source of truth for college/company communities, so the
 * Communities page shows exactly the same candidates (no duplicates) as the
 * College Groups / Company Groups admin pages. */
async function getResolvedCandidates() {
  const now = Date.now();
  if (resolvedCandidatesCache && now - resolvedCandidatesCacheAt < RESOLVED_CANDIDATES_CACHE_MS) {
    return resolvedCandidatesCache;
  }

  const rawCandidates = await Candidate.find({ deletedAt: null })
    .select('name email avatarUrl photoUrl location department college currentCompany educationList workHistory userId createdAt')
    .lean();
  const candidates = dedupeCandidatesByEmail(rawCandidates);

  const fallbackEmails = candidates
    .filter(c => !parseJsonArray(c.educationList).length && c.email)
    .map(c => c.email.toLowerCase().trim());
  const fallback = fallbackEmails.length
    ? new Map((await User.find({ email: { $in: fallbackEmails }, educationList: { $exists: true, $ne: '' } })
        .select('email educationList college').lean())
        .map(u => [u.email.toLowerCase().trim(), u]))
    : new Map();

  const resolved = candidates.map(c => {
    let education = parseJsonArray(c.educationList);
    let collegeName = String(c.college || '').trim().replace(/\s+/g, ' ');

    const fb = !collegeName && c.email ? fallback.get(c.email.toLowerCase().trim()) : null;
    if (fb) {
      if (!collegeName && fb.college) collegeName = String(fb.college).trim().replace(/\s+/g, ' ');
      if (!education.length) education = parseJsonArray(fb.educationList);
    }

    if (!collegeName) {
      const latest = getLatestEducation(education);
      if (latest?.institution) collegeName = String(latest.institution).trim().replace(/\s+/g, ' ');
    }

    let companyName = normalizeCompanyName(c.currentCompany) || '';
    if (!companyName) {
      const latestCompany = getCurrentOrLatestCompany(parseJsonArray(c.workHistory));
      if (latestCompany) companyName = normalizeCompanyName(latestCompany) || '';
    }

    return {
      candidate: c,
      collegeName: collegeName.length >= 3 ? collegeName : '',
      companyName,
    };
  });

  resolvedCandidatesCache = resolved;
  resolvedCandidatesCacheAt = now;
  return resolved;
}

/** Returns a Map<lowercaseName, { name, count }> of every college discovered
 * across candidate profiles (resolved the same way as the College Groups
 * report) — used to auto-create college communities and to show correct
 * member counts for them. */
async function getCollegeNameCounts() {
  const resolved = await getResolvedCandidates();
  const counts = new Map();
  for (const { collegeName } of resolved) {
    if (!collegeName) continue;
    const key = normalizeCollegeName(collegeName);
    const entry = counts.get(key) || { name: collegeName, count: 0 };
    entry.count++;
    counts.set(key, entry);
  }
  return counts;
}

/** Returns a Map<lowercaseName, { name, count }> of every company discovered
 * across candidate profiles (canonicalized the same way as the Company
 * Groups report) — used to show correct member counts for company
 * communities. */
async function getCompanyNameCounts() {
  const resolved = await getResolvedCandidates();
  const counts = new Map();
  for (const { companyName } of resolved) {
    if (!companyName) continue;
    const key = companyName.toLowerCase();
    const entry = counts.get(key) || { name: companyName, count: 0 };
    entry.count++;
    counts.set(key, entry);
  }
  return counts;
}

/** Returns the deduped Candidate documents belonging to a college/company
 * community, sorted newest-first — the exact same set of people counted in
 * the College Groups / Company Groups admin reports, so a community's
 * member list/count never diverges from (or duplicates) those reports. */
async function getCommunityCandidates(community) {
  const resolved = await getResolvedCandidates();
  let matching;
  if (community.collegeName) {
    const key = normalizeCollegeName(community.collegeName);
    matching = resolved.filter(r => normalizeCollegeName(r.collegeName) === key).map(r => r.candidate);
  } else if (community.companyName) {
    // Older communities may have been created with a raw, un-normalized
    // company name (e.g. "Accenture Pvt Ltd") before canonicalization was
    // introduced — normalize both sides so a candidate resolved to canonical
    // "Accenture" still matches a community literally named "Accenture Pvt Ltd".
    const key = (normalizeCompanyName(community.companyName) || community.companyName).toLowerCase();
    matching = resolved.filter(r => r.companyName.toLowerCase() === key).map(r => r.candidate);
  } else {
    matching = [];
  }
  return [...matching].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

/** Maps deduped Candidate documents to member objects for display, using the
 * linked User's profile (avatar/role/title) where one exists and is active,
 * else falling back to the Candidate's own info. */
async function hydrateCandidateMembers(candidates) {
  const userIds = candidates.filter(c => c.userId).map(c => c.userId);
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds }, deletedAt: null })
        .select('name role title avatarUrl photoUrl college currentCompany location department').lean()
    : [];
  const usersById = new Map(users.map(u => [String(u._id), u]));
  return candidates.map(c => (c.userId && usersById.has(String(c.userId)))
    ? usersById.get(String(c.userId))
    : candidateToMember(c));
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

// Throttle the maintenance work at the top of GET / (upserting default
// communities + ensuring one community per College/Campus tenant) — these
// were previously run (and awaited) on EVERY request, adding 40-100+ extra
// queries to every page load. They're idempotent, so re-running them every
// 10 minutes is more than enough to pick up newly registered colleges.
let lastDefaultsSync = 0;
let lastCollegeTenantSync = 0;
const MAINTENANCE_SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Per-pass cap on how many new communities to create — high enough that a
// full backfill of all colleges/companies discovered in candidate data
// completes in one or two sync passes.
const MAX_NEW_COMMUNITIES_PER_PASS = 200;

// Cached base community list — avoids a full Community.find() on every request.
// Invalidated on create/merge so new communities appear immediately.
let baseListCache = null;
let baseListCacheAt = 0;
const BASE_LIST_CACHE_MS = 30 * 1000; // 30 seconds

// Cached fallback tenant id, used when the triggering user (e.g. a
// super_admin) has no tenantId of their own — auto-created college/company
// communities still need *some* tenantId to satisfy the schema.
let cachedFallbackTenantId = null;
async function resolveFallbackTenantId(fallbackTenantId) {
  if (fallbackTenantId) return fallbackTenantId;
  if (cachedFallbackTenantId) return cachedFallbackTenantId;
  const anyTenant = await Tenant.findOne({}).select('_id').lean();
  cachedFallbackTenantId = anyTenant?._id || null;
  return cachedFallbackTenantId;
}

/** Creates a community for any college name found in candidates' profiles
 * (College/School Name field, falling back to education history) that doesn't
 * already have one — even if no Campus Portal (Tenant) has been registered for
 * it. This is how "new colleges" discovered from candidate signups/profiles
 * automatically get a community without any manual setup. */
async function ensureCollegeCommunitiesFromCandidates(createdBy, fallbackTenantId) {
  const now = Date.now();
  if (now - lastCandidateCollegeSync < CANDIDATE_SYNC_INTERVAL_MS) return;
  lastCandidateCollegeSync = now;

  const tenantId = await resolveFallbackTenantId(fallbackTenantId);
  if (!tenantId) return;

  const counts = await getCollegeNameCounts();

  // Single bulk lookup of existing college communities, instead of one
  // findOne() per candidate-derived name — turns N queries into 1.
  const existing = await Community.find({ collegeName: { $exists: true, $ne: '' } }).select('collegeName').lean();
  const existingKeys = new Set(existing.map(c => normalizeCollegeName(c.collegeName)));

  const missing = [];
  for (const [key, { name }] of counts) {
    if (!existingKeys.has(key)) missing.push(name);
  }

  await Promise.all(missing.slice(0, MAX_NEW_COMMUNITIES_PER_PASS).map(async (name) => {
    const baseSlug = collegeSlug(name);
    let slug = baseSlug;
    let attempt = 0;
    while (await Community.exists({ slug })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    await Community.create({
      tenantId,
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

/** Creates a community for any company name found in candidates' "Current
 * Company" field that doesn't already have one. Mirrors the college community
 * auto-creation above — new companies discovered from candidate profiles
 * automatically get a community for reviews/discussions/referrals. */
async function ensureCompanyCommunities(createdBy, fallbackTenantId) {
  const now = Date.now();
  if (now - lastCandidateCompanySync < CANDIDATE_SYNC_INTERVAL_MS) return;
  lastCandidateCompanySync = now;

  const tenantId = await resolveFallbackTenantId(fallbackTenantId);
  if (!tenantId) return;

  const companyCounts = await getCompanyNameCounts();
  const names = new Map();
  for (const [key, { name }] of companyCounts) {
    names.set(key, name);
  }

  // Single bulk lookup of existing company communities, instead of one
  // findOne() per candidate-derived name — turns N queries into 1.
  const existing = await Community.find({ companyName: { $exists: true, $ne: '' } }).select('companyName').lean();
  const existingKeys = new Set(existing.map(c => (normalizeCompanyName(c.companyName) || '').toLowerCase()));

  const missing = [];
  for (const [key, name] of names) {
    if (!existingKeys.has(key)) missing.push(name);
  }

  await Promise.all(missing.slice(0, MAX_NEW_COMMUNITIES_PER_PASS).map(async (name) => {
    const baseSlug = collegeSlug(name);
    let slug = baseSlug;
    let attempt = 0;
    while (await Community.exists({ slug })) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    await Community.create({
      tenantId,
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

  // Second pass: merge company communities that represent the same company
  // under different name variants (e.g. "Tcs Community" vs "Tata Consultancy
  // Services Community") once normalized to a canonical company name.
  const companyDocs = await Community.find({ companyName: { $exists: true, $ne: '' } }).sort({ createdAt: 1 }).lean();
  const byCompanyKey = {};
  companyDocs.forEach(c => {
    const norm = normalizeCompanyName(c.companyName);
    if (!norm) return;
    const key = norm.toLowerCase();
    (byCompanyKey[key] = byCompanyKey[key] || []).push({ ...c, _canonical: norm });
  });

  // Third pass: merge college communities whose collegeName only differs by
  // case/whitespace.
  const collegeDocs = await Community.find({ collegeName: { $exists: true, $ne: '' } }).sort({ createdAt: 1 }).lean();
  const byCollegeKey = {};
  collegeDocs.forEach(c => {
    const norm = String(c.collegeName || '').trim().replace(/\s+/g, ' ');
    if (!norm) return;
    const key = norm.toLowerCase();
    (byCollegeKey[key] = byCollegeKey[key] || []).push({ ...c, _canonical: norm });
  });

  for (const groups of [Object.values(byCompanyKey), Object.values(byCollegeKey)]) {
    for (const docs of groups) {
      if (docs.length <= 1) continue;

      const keeper     = docs[0];
      const rest       = docs.slice(1);
      const allMembers = [...new Set(docs.flatMap(d => d.memberIds.map(id => String(id))))];
      const field      = keeper.companyName ? 'companyName' : 'collegeName';

      await Community.findByIdAndUpdate(keeper._id, {
        $set: { memberIds: allMembers, memberCount: allMembers.length, [field]: keeper._canonical },
      });

      const dupIds = rest.map(d => d._id);
      await FeedPost.updateMany(
        { communityId: { $in: dupIds } },
        { $set: { communityId: keeper._id, communitySlug: keeper.slug } },
      );
      await Community.deleteMany({ _id: { $in: dupIds } });

      mergedGroups++;
      deletedDocs += rest.length;
    }
  }

  baseListCache = null; // invalidate so next GET reflects merged state
  res.json({ success: true, message: `Merged ${mergedGroups} duplicate group(s), deleted ${deletedDocs} duplicate document(s).`, mergedGroups, deletedDocs });
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

  baseListCache = null; // invalidate so the new community appears immediately
  res.status(201).json({ success: true, data: community });
}));

// ─── GET /api/communities — list all communities (global, cross-tenant) ──────
router.get('/', asyncHandler(async (req, res) => {
  const uid      = String(req.user._id || req.user.id);

  // Upsert each default by slug only — one canonical community per slug, shared across all tenants
  const createdBy = req.user._id || req.user.id;
  const now = Date.now();
  // All maintenance is background — never block the user request.
  if (now - lastDefaultsSync >= MAINTENANCE_SYNC_INTERVAL_MS) {
    lastDefaultsSync = now;
    Promise.all(
      DEFAULTS.map(d =>
        Community.findOneAndUpdate(
          { slug: d.slug },
          { $setOnInsert: { ...d, createdBy, memberIds: [], memberCount: 0 } },
          { upsert: true }
        )
      )
    ).then(() => { baseListCache = null; }).catch(() => {}); // invalidate cache after upserts
  }
  if (now - lastCollegeTenantSync >= MAINTENANCE_SYNC_INTERVAL_MS) {
    lastCollegeTenantSync = now;
    ensureCollegeCommunities(createdBy).then(() => { baseListCache = null; }).catch(() => {});
  }
  ensureCollegeCommunitiesFromCandidates(createdBy, req.user.tenantId).catch(() => {});
  ensureCompanyCommunities(createdBy, req.user.tenantId).catch(() => {});

  // Serve from cache when fresh; otherwise fetch and cache the full list.
  let unique;
  if (baseListCache && Date.now() - baseListCacheAt < BASE_LIST_CACHE_MS) {
    unique = baseListCache;
  } else {
    const allCommunities = await Community.find({}).sort({ memberCount: -1, name: 1 }).lean();
    const seenSlugs = new Set();
    unique = allCommunities.filter(c => {
      if (seenSlugs.has(c.slug)) return false;
      seenSlugs.add(c.slug);
      return true;
    });
    baseListCache = unique;
    baseListCacheAt = Date.now();
  }

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

  // Live headcount for college/company communities = users whose college/company
  // matches, regardless of whether they're in memberIds. Computing this for every
  // college/company community on every request (N regex-based countDocuments
  // queries) doesn't scale as more colleges/companies are auto-discovered, so we
  // only compute it for the requesting user's own college/company — enough to
  // power the "auto-added to your college/company community" experience — and
  // fall back to the stored memberCount for everything else.
  // Fresher candidates who've only added work experience (no "Current Company"
  // on their account) wouldn't otherwise show as a member of their company's
  // community — fall back to the same resolved company name (current/most
  // recent work-experience entry) used for company-community member lists.
  let userCompany = normalizeCompanyName(req.user.currentCompany);
  // Only read candidate-derived company from cache — never trigger a cold scan here.
  if (!userCompany && req.user.email && resolvedCandidatesCache && Date.now() - resolvedCandidatesCacheAt < RESOLVED_CANDIDATES_CACHE_MS) {
    try {
      const resolved = await getResolvedCandidates();
      const mine = resolved.find(r => (r.candidate.email || '').toLowerCase().trim() === req.user.email.toLowerCase().trim());
      if (mine?.companyName) userCompany = mine.companyName;
    } catch {}
  }
  const collegeCounts = {};
  const companyCounts = {};
  try {
    const ownCollege = userCollege && unique.find(c => c.collegeName && normalizeCollegeName(c.collegeName) === userCollege);
    if (ownCollege) {
      collegeCounts[ownCollege.slug] = await User.countDocuments(collegeMemberFilter(ownCollege.collegeName));
    }
    const ownCompany = userCompany && unique.find(c => c.companyName && normalizeCompanyName(c.companyName) === userCompany);
    if (ownCompany) {
      companyCounts[ownCompany.slug] = await User.countDocuments(companyMemberFilter(ownCompany.companyName));
    }
  } catch {}

  // Most candidates (bulk-imported students, resume uploads) have no User
  // login account, so College/Company communities computed from User counts
  // alone show "0 members" even when Company Groups shows real headcounts.
  // Resolved candidate counts (deduped by email, same resolution as the
  // College Groups / Company Groups admin reports), keyed by normalized
  // college/company name, to fold into the member counts below.
  const candidateCollegeCounts = new Map();
  const candidateCompanyCounts = new Map();
  if (resolvedCandidatesCache && Date.now() - resolvedCandidatesCacheAt < RESOLVED_CANDIDATES_CACHE_MS) {
    // Cache warm — fetch live candidate counts without delay
    try {
      const [collegeNameCounts, companyNameCounts] = await Promise.all([
        getCollegeNameCounts(),
        getCompanyNameCounts(),
      ]);
      collegeNameCounts.forEach((v, key) => candidateCollegeCounts.set(key, v.count));
      companyNameCounts.forEach((v, key) => candidateCompanyCounts.set(key, v.count));
    } catch {}
  } else {
    // Cache cold — respond immediately with stored memberCount; warm cache in background
    // so the NEXT request gets live counts without waiting.
    getResolvedCandidates().catch(() => {});
  }

  const data = unique.map(c => {
    const isCollegeMember = !!c.collegeName && userCollege && normalizeCollegeName(c.collegeName) === userCollege;
    const isCompanyMember = !!c.companyName && userCompany && normalizeCompanyName(c.companyName) === userCompany;
    return {
      ...c,
      isMember: c.memberIds.some(id => String(id) === uid) || isCollegeMember || isCompanyMember,
      isOwnCollege: isCollegeMember,
      isOwnCompany: isCompanyMember,
      memberCount: c.collegeName ? Math.max(c.memberCount || 0, collegeCounts[c.slug] || 0, candidateCollegeCounts.get(normalizeCollegeName(c.collegeName)) || 0)
                 : c.companyName ? Math.max(c.memberCount || 0, companyCounts[c.slug] || 0, candidateCompanyCounts.get((normalizeCompanyName(c.companyName) || '').toLowerCase()) || 0)
                 : c.memberCount,
      memberIds: undefined,
    };
  });

  // Surface the user's own college/company community at the top of the list,
  // then rank college/company communities by their live member count so the
  // most popular ones appear first (the "🎓 Colleges" / "🏢 Companies" filters
  // simply filter this same ordered list).
  data.sort((a, b) => (b.isOwnCollege - a.isOwnCollege)
    || (b.isOwnCompany - a.isOwnCompany)
    || (b.memberCount - a.memberCount)
    || a.name.localeCompare(b.name));

  res.json({ success: true, data, total: data.length });
}));

// ─── GET /api/communities/:slug — single community detail (global) ───────────
router.get('/:slug', asyncHandler(async (req, res) => {
  const uid      = String(req.user._id || req.user.id);

  const community = await Community.findOne({ slug: req.params.slug }).lean();
  if (!community) throw new AppError('Community not found.', 404);

  let members;
  let memberCount = community.memberCount || 0;
  if (community.collegeName || community.companyName) {
    // College/Company communities: membership is the same deduped candidate
    // set shown in the College Groups / Company Groups admin reports — no
    // duplicates, and counts always match those reports.
    const matching = await getCommunityCandidates(community);
    members = await hydrateCandidateMembers(matching.slice(0, 10));
    memberCount = Math.max(memberCount, matching.length);
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
  let userCompany = normalizeCompanyName(req.user.currentCompany);
  if (!userCompany && community.companyName && req.user.email) {
    try {
      const resolved = await getResolvedCandidates();
      const mine = resolved.find(r => (r.candidate.email || '').toLowerCase().trim() === req.user.email.toLowerCase().trim());
      if (mine?.companyName) userCompany = mine.companyName;
    } catch {}
  }
  const isCompanyMember = !!community.companyName && userCompany && normalizeCompanyName(community.companyName) === userCompany;

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

  if (community.collegeName || community.companyName) {
    // College/Company communities: membership is the same deduped candidate
    // set shown in the College Groups / Company Groups admin reports — no
    // duplicates, and counts always match those reports.
    const matching = await getCommunityCandidates(community);
    const total = matching.length;
    const members = await hydrateCandidateMembers(matching.slice(skip, skip + lim));
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

  // Company communities: only show jobs posted by that specific company.
  if (community.companyName) {
    const companyRx = companyNameRegex(community.companyName);
    const jobs = await Job.find({
      tenantId,
      status: 'active',
      deletedAt: null,
      $or: [{ company: companyRx }, { companyName: companyRx }],
    })
      .select('title companyName company location jobType department skills salaryMin salaryMax salaryCurrency experience updatedAt')
      .sort({ updatedAt: -1 })
      .limit(15)
      .lean();

    return res.json({ success: true, data: jobs });
  }

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

// ─── GET /api/communities/:slug/drives — placement drives for college community ─
router.get('/:slug/drives', asyncHandler(async (req, res) => {
  const community = await Community.findOne({ slug: req.params.slug }).lean();
  if (!community) throw new AppError('Community not found.', 404);
  if (!community.collegeName) return res.json({ success: true, data: [] });

  const PlacementDrive = require('../models/PlacementDrive');
  const communityKey = normalizeCollegeKey(community.collegeName);

  const candidates = await PlacementDrive.find({
    deletedAt: null,
    status: { $ne: 'cancelled' },
  })
    .select('title companyName description mode location driveDate registrationDeadline opportunityType examProvider status collegeName')
    .sort({ driveDate: -1 })
    .limit(200)
    .lean();

  const drives = candidates
    .filter(d => normalizeCollegeKey(d.collegeName) === communityKey)
    .slice(0, 20)
    .map(({ collegeName, ...rest }) => rest);

  res.json({ success: true, data: drives });
}));

// ─── POST /api/communities/:slug/seed-posts — seed posts using real platform users ─
router.post('/:slug/seed-posts', asyncHandler(async (req, res) => {
  if (!['admin', 'super_admin', 'recruiter'].includes(req.user.role)) {
    throw new AppError('Only admins and recruiters can seed community posts.', 403);
  }
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
