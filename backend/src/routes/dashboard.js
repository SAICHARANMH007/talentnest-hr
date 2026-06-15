'use strict';
const express         = require('express');
const router          = express.Router();
const mongoose        = require('mongoose');
const User            = require('../models/User');
const Tenant          = require('../models/Tenant');
const Organization    = require('../models/Organization');
const Job             = require('../models/Job');
const Candidate       = require('../models/Candidate');
const Application     = require('../models/Application');
const ImportedCandidate = require('../models/ImportedCandidate');
const { authenticate } = require('../middleware/auth');
const { allowRoles }  = require('../middleware/rbac');
const asyncHandler    = require('../utils/asyncHandler');
const AppError        = require('../utils/AppError');
const { exportToExcel } = require('../utils/exportToExcel');
const { phoneSearchRegex } = require('../utils/phoneSearch');
const PaymentRecord   = require('../models/PaymentRecord');
const PlacementDrive  = require('../models/PlacementDrive');
const TrainingResource = require('../models/TrainingResource');
const Assessment      = require('../models/Assessment');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const { cacheRoute }  = require('../middleware/cache');
const { normalizeCompanyName, companyNameVariants } = require('../utils/companyNames');
const { normalizeCollegeKey } = require('../utils/collegeNames');
const { getCoursesForSkill } = require('../utils/skillCourses');
const { textMatches: degreeTextMatches, searchMatches } = require('../utils/degreeMatch');


// ── Constants ────────────────────────────────────────────────────────────────
const STAGE_DONE    = 'Hired';   // DB value — frontend maps this to 'selected'
const STAGE_OFFER   = 'Offer';   // DB value
const STAGE_IV      = 'Interview Round 1'; // DB value
// DB stage values used in Application.currentStage (must match applications.js VALID_STAGES)
const STAGES_ACTIVE = ['Applied', 'Screening', 'Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer'];
const JOB_APPLICANT_POPULATE = {
  path: 'jobId',
  select: 'title company companyName location tenantId department jobType salaryMin salaryMax salaryCurrency salaryType assignedRecruiters',
  populate: { path: 'assignedRecruiters', select: 'name email role' },
};
const CANDIDATE_APPLICANT_POPULATE = {
  path: 'candidateId',
  select: [
    'name email phone title currentCompany location preferredLocation skills experience isFresher college relevantExperience',
    'currentCTC expectedCTC availability noticePeriodDays candidateStatus certifications linkedinUrl resumeUrl videoResumeUrl',
    'source tenantId assignedRecruiterId parsedProfile.totalExperienceYears additionalDetails client ta clientSpoc userId createdAt updatedAt',
  ].join(' '),
};

// Default SLA hours per stage
const DEFAULT_SLA_HOURS = {
  Applied      : 24,
  Screening    : 48,
  Shortlisted  : 72,
  'Interview Round 1': 168,
  'Interview Round 2': 168,
  Offer        : 72,
  Hired        : 0,
  Rejected     : 0,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a MongoDB date range filter object.
 * Defaults to last 30 days if not provided.
 */
function buildDateRange(startDate, endDate) {
  const end   = endDate   ? new Date(endDate)   : new Date();
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return { $gte: start, $lte: end };
}

/**
 * Build the tenant filter. super_admin sees everything; others scoped to tenantId.
 * Supports hierarchical access for Parent Organizations.
 */
function tenantFilter(req) {
  if (req.user.role === 'super_admin') return {};
  
  const ids = [new mongoose.Types.ObjectId(req.user.tenantId)];
  if (Array.isArray(req.user.childTenantIds)) {
    req.user.childTenantIds.forEach(id => ids.push(new mongoose.Types.ObjectId(id)));
  }
  
  return { tenantId: { $in: ids } };
}

async function countUniqueCandidateProfiles(candidateFilter, userFilter) {
  // Load only the identity fields needed for deduplication (email/phone/name).
  // appDocs was previously fetched here but never processed — removed.
  const [candidateDocs, userDocs, importedDocs] = await Promise.all([
    Candidate.find({ deletedAt: null, ...candidateFilter }).select('_id email phone name userId').lean(),
    User.find({ deletedAt: null, role: 'candidate', ...userFilter }).select('_id email phone name').lean(),
    ImportedCandidate.find({ ...candidateFilter }).select('_id email phone name').lean(),
  ]);

  const keys = new Set();
  const userToKey = new Map();

  const getCandidateKey = (email, phone, name) => {
    if (email) return `email:${email.toLowerCase().trim()}`;
    if (phone) return `phone:${phone.trim()}`;
    if (name) return `name:${name.toLowerCase().trim()}`;
    return null;
  };

  // 1. Process registered candidate users
  userDocs.forEach(d => {
    const k = getCandidateKey(d.email, d.phone, d.name) || `user:${d._id}`;
    keys.add(k);
    userToKey.set(String(d._id), k);
  });

  // 2. Process candidate profiles (deduplicate with users via userId/email)
  candidateDocs.forEach(d => {
    let k = getCandidateKey(d.email, d.phone, d.name);
    if (!k && d.userId && userToKey.has(String(d.userId))) {
      k = userToKey.get(String(d.userId));
    }
    if (!k) k = `cand:${d._id}`;
    keys.add(k);
    if (d.userId && !userToKey.has(String(d.userId))) {
      userToKey.set(String(d.userId), k);
    }
  });

  // 3. Process imported candidates (deduplicate by email/phone/name)
  importedDocs.forEach(d => {
    const k = getCandidateKey(d.email, d.phone, d.name) || `imp:${d._id}`;
    keys.add(k);
  });

  return keys.size;
}

function csv(v) {
  if (Array.isArray(v)) return v.filter(Boolean).join(', ');
  return v || '';
}

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString('en-IN') : '';
}

// ── In-process org name cache (5-min TTL) — prevents a full Tenant+Org scan on every request ──
let _orgMapCache = null;
let _orgMapAt    = 0;
const ORG_MAP_TTL = 5 * 60 * 1000;
async function orgNameMap() {
  if (_orgMapCache && Date.now() - _orgMapAt < ORG_MAP_TTL) return _orgMapCache;
  const [tenants, orgs] = await Promise.all([
    Tenant.find({}).select('name').lean(),
    Organization.find({}).select('name').lean(),
  ]);
  _orgMapCache = {
    ...Object.fromEntries(tenants.map(t => [String(t._id), t.name])),
    ...Object.fromEntries(orgs.map(o => [String(o._id), o.name])),
  };
  _orgMapAt = Date.now();
  return _orgMapCache;
}

// Resolves candidate names for the recent-activity feed.
// When candidateId.name is empty (manual/invited candidates), looks up the linked User account.
async function resolveRecentNames(apps) {
  if (!apps || !apps.length) return apps;
  const needName = apps.filter(a => {
    const c = a.candidateId && typeof a.candidateId === 'object' ? a.candidateId : null;
    return !c?.name;
  });
  if (!needName.length) return apps.map(a => ({
    ...a,
    id: a._id?.toString() || a.id,
    candidateName: (a.candidateId?.name) || (a.candidateId?.email ? a.candidateId.email.split('@')[0] : '') || a.candidateId?.phone || `Applicant-${(a._id?.toString() || '').slice(-6)}`,
    candidate: a.candidateId || null,
  }));

  const emails  = [...new Set(needName.map(a => a.candidateId?.email).filter(Boolean).map(e => e.toLowerCase()))];
  const userIds = [...new Set(needName.map(a => a.candidateId?.userId?.toString()).filter(Boolean))];
  const [byEmail, byId] = await Promise.all([
    emails.length  ? User.find({ email:  { $in: emails  } }).select('name email').lean() : [],
    userIds.length ? User.find({ _id:    { $in: userIds } }).select('name email').lean() : [],
  ]);
  const emailMap = new Map([...byEmail, ...byId].map(u => [u.email?.toLowerCase(), u]));
  const idMap    = new Map(byId.map(u => [String(u._id), u]));

  return apps.map(a => {
    const c   = a.candidateId && typeof a.candidateId === 'object' ? a.candidateId : null;
    let name  = c?.name || '';
    if (!name) {
      const u = idMap.get(c?.userId?.toString()) || emailMap.get((c?.email || '').toLowerCase());
      name = u?.name || (c?.email ? c.email.split('@')[0] : '') || c?.phone || '';
    }
    const fallbackId = (a._id?.toString() || a.id || '').slice(-6);
    const displayName = name || `Applicant-${fallbackId}`;
    return {
      ...a,
      id: a._id?.toString() || a.id,
      candidateName: displayName,
      candidate: c ? { ...c, name: displayName } : null,
    };
  });
}

async function buildApplicationFilters(req) {
  const filter = { ...tenantFilter(req), deletedAt: null };
  const { stage, source, jobId, startDate, endDate, status, recruiterId, minScore } = req.query;
  if (stage) filter.currentStage = stage;
  if (source) filter.source = source;
  if (status) filter.status = status;
  if (minScore !== undefined && minScore !== '') {
    const score = Number(minScore);
    if (!Number.isNaN(score)) filter.talentMatchScore = { $gte: score };
  }
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }
  if (req.user.role === 'recruiter') {
    const myJobs = await Job.find({ tenantId: req.user.tenantId, assignedRecruiters: req.user.id }).select('_id').lean();
    const myJobIds = myJobs.map(j => j._id);
    if (jobId) {
      const requested = String(jobId);
      filter.jobId = myJobIds.some(id => String(id) === requested)
        ? new mongoose.Types.ObjectId(jobId)
        : { $in: [] };
    } else {
      filter.jobId = { $in: myJobIds };
    }
  } else {
    const recruiterJobIds = recruiterId
      ? (await Job.find({ ...tenantFilter(req), assignedRecruiters: recruiterId, deletedAt: null }).select('_id').lean()).map(j => j._id)
      : null;
    if (jobId && recruiterJobIds) {
      const requested = String(jobId);
      filter.jobId = recruiterJobIds.some(id => String(id) === requested)
        ? new mongoose.Types.ObjectId(jobId)
        : { $in: [] };
    } else if (jobId) {
      filter.jobId = new mongoose.Types.ObjectId(jobId);
    } else if (recruiterJobIds) {
      filter.jobId = { $in: recruiterJobIds };
    }
  }

  // College filter — lets super admins view recruitment data scoped to a single college tenant
  const { collegeId } = req.query;
  if (collegeId && req.user.role === 'super_admin' && mongoose.Types.ObjectId.isValid(collegeId)) {
    filter.tenantId = new mongoose.Types.ObjectId(collegeId);
  }

  // Exact ID or Email tracking for unified candidate pipeline
  const { candidateId, email, experienceLevel } = req.query;
  if (email) {
    const matchedCands = await Candidate.find({ email: email.toLowerCase().trim(), deletedAt: null }).select('_id').lean();
    const cIds = matchedCands.map(c => c._id);
    filter.candidateId = { $in: cIds };
  } else if (candidateId) {
    filter.candidateId = candidateId;
  }

  // Fresher / Experienced filter — based on Candidate.isFresher and Candidate.experience
  if (experienceLevel === 'fresher' || experienceLevel === 'experienced') {
    const candFilter = { ...tenantFilter(req), deletedAt: null };
    if (experienceLevel === 'fresher') {
      candFilter.$or = [{ isFresher: true }, { experience: { $in: [0, null] } }];
    } else {
      candFilter.isFresher = { $ne: true };
      candFilter.experience = { $gt: 0 };
    }
    const matched = await Candidate.find(candFilter).select('_id').lean();
    const expIds = matched.map(c => c._id);
    if (filter.candidateId) {
      const existing = filter.candidateId.$in || [filter.candidateId];
      const existingSet = new Set(existing.map(String));
      filter.candidateId = { $in: expIds.filter(id => existingSet.has(String(id))) };
    } else {
      filter.candidateId = { $in: expIds };
    }
  }

  return filter;
}

function profileRow({ candidate = {}, user = {}, app = null, job = null, orgName = '' }) {
  const sourceDoc = candidate?._id ? candidate : user;
  const parsed = candidate?.parsedProfile || {};
  const match = app?.matchBreakdown || {};
  const latestInterview = Array.isArray(app?.interviewRounds) && app.interviewRounds.length
    ? app.interviewRounds[app.interviewRounds.length - 1]
    : null;
  const assignedRecruiters = Array.isArray(job?.assignedRecruiters)
    ? job.assignedRecruiters
        .map(r => typeof r === 'object' ? (r.name || r.email) : '')
        .filter(Boolean)
        .join(', ')
    : '';
  const assignedRecruiterIds = Array.isArray(job?.assignedRecruiters)
    ? job.assignedRecruiters
        .map(r => (typeof r === 'object' ? (r._id || r.id) : r)?.toString())
        .filter(Boolean)
    : [];
  // Use job's first assigned recruiter as the primary recruiter ID for the dropdown.
  // Falls back to Candidate.assignedRecruiterId (candidate-level assignment).
  const assignedRecruiterId =
    assignedRecruiterIds[0] ||
    (candidate?.assignedRecruiterId || user?.assignedRecruiterId)?.toString?.() || '';
  return {
    recordType: app ? 'Application' : (candidate?._id ? 'Candidate Profile' : 'Candidate Account'),
    applicationId: app?._id?.toString() || '',
    candidateId: candidate?._id?.toString() || '',
    userId: user?._id?.toString() || candidate?.userId?.toString() || '',
    name: candidate?.name || user?.name || (candidate?.email || user?.email || '').split('@')[0] || candidate?.phone || user?.phone || '',
    candidateName: candidate?.name || user?.name || (candidate?.email || user?.email || '').split('@')[0] || candidate?.phone || user?.phone || '',
    email: candidate?.email || user?.email || '',
    phone: candidate?.phone || user?.phone || '',
    title: candidate?.title || user?.title || user?.jobRole || '',
    currentCompany: candidate?.currentCompany || user?.currentCompany || '',
    college: candidate?.college || user?.college || '',
    location: candidate?.location || user?.location || '',
    preferredLocation: candidate?.preferredLocation || user?.preferredLocation || '',
    skills: csv(candidate?.skills?.length ? candidate.skills : user?.skills),
    experience: candidate?.experience ?? user?.experience ?? parsed.totalExperienceYears ?? '',
    isFresher: candidate?.isFresher ?? user?.isFresher ?? false,
    relevantExperience: candidate?.relevantExperience || user?.relevantExperience || '',
    currentCTC: candidate?.currentCTC || user?.currentCTC || '',
    expectedCTC: candidate?.expectedCTC || user?.expectedCTC || '',
    availability: candidate?.availability || user?.availability || '',
    noticePeriodDays: candidate?.noticePeriodDays ?? '',
    candidateStatus: candidate?.candidateStatus || user?.candidateStatus || '',
    certifications: csv(candidate?.certifications || user?.certifications),
    linkedinUrl: candidate?.linkedinUrl || user?.linkedinUrl || '',
    resumeUrl: candidate?.resumeUrl || user?.resumeUrl || '',
    videoResumeUrl: candidate?.videoResumeUrl || user?.videoResumeUrl || '',
    source: app?.source || candidate?.source || user?.source || 'platform',
    organisation: orgName,
    jobId: job?._id?.toString() || app?.jobId?.toString?.() || '',
    jobTitle: job?.title || '',
    jobCompany: job?.companyName || job?.company || '',
    jobLocation: job?.location || '',
    jobDepartment: job?.department || '',
    jobType: job?.jobType || '',
    salaryMin: job?.salaryMin ?? '',
    salaryMax: job?.salaryMax ?? '',
    salaryCurrency: job?.salaryCurrency || '',
    salaryType: job?.salaryType || '',
    assignedRecruiters,
    assignedRecruiterIds,
    assignedRecruiterId,
    stage: app?.currentStage || '',
    status: app?.status || '',
    aiMatchScore: app?.talentMatchScore ?? '',
    skillScore: match.skillScore ?? '',
    experienceScore: match.experienceScore ?? '',
    locationScore: match.locationScore ?? '',
    noticeScore: match.noticeScore ?? '',
    assessmentScore: app?.assessmentScore ?? '',
    assessmentViolations: Array.isArray(app?.assessmentViolations) ? app.assessmentViolations.length : '',
    tags: csv(app?.tags),
    inviteStatus: app?.inviteStatus || '',
    inviteMessage: app?.inviteMessage || '',
    screeningAnswers: Array.isArray(app?.screeningAnswers) ? app.screeningAnswers.map(x => `${x.question}: ${x.answer}`).join(' | ') : '',
    rejectionReason: app?.rejectionReason || '',
    interviewCount: Array.isArray(app?.interviewRounds) ? app.interviewRounds.length : 0,
    latestInterviewAt: latestInterview?.scheduledAt || null,
    latestInterviewFormat: latestInterview?.format || '',
    latestInterviewer: latestInterview?.interviewerName || '',
    latestInterviewFeedback: latestInterview?.feedback?.notes || latestInterview?.feedback?.strengths || '',
    appliedAt: app?.createdAt || null,
    appliedFromLat: app?.appliedFrom?.lat ?? null,
    appliedFromLng: app?.appliedFrom?.lng ?? null,
    appliedFromCity: app?.appliedFrom?.city || '',
    appliedFromCountry: app?.appliedFrom?.country || '',
    joinedAt: user?.createdAt || null,
    profileCreatedAt: sourceDoc?.createdAt || null,
    lastUpdatedAt: app?.updatedAt || sourceDoc?.updatedAt || null,
    coverLetter: app?.coverLetter || '',
    recruiterNotes: app?.recruiterNotes || '',
    additionalDetails: candidate?.additionalDetails || user?.additionalDetails || '',
    client: candidate?.client || user?.client || '',
    ta: candidate?.ta || user?.ta || '',
    clientSpoc: candidate?.clientSpoc || user?.clientSpoc || '',
  };
}

// ── Public Stats ─────────────────────────────────────────────────────────────

const BASE_HIRED   = 20;
const BASE_CLIENTS = 3;
const BASE_JOBS    = 5;
let publicCache    = null;
let publicCacheAt  = 0;
const PUBLIC_TTL   = 60 * 1000;

router.get('/public', asyncHandler(async (_req, res) => {
  if (publicCache && Date.now() - publicCacheAt < PUBLIC_TTL) return res.json(publicCache);
  const [hiredCount, jobsCount, clientsRaw, totalUsers] = await Promise.all([
    Application.countDocuments({ currentStage: 'Hired' }),
    Job.countDocuments({ status: 'active' }),
    Job.distinct('tenantId', { status: 'active' }),
    User.countDocuments({ role: 'candidate' }),
  ]);
  publicCache = {
    candidatesHired : hiredCount,
    openJobs        : jobsCount,
    clientsServed   : (clientsRaw || []).length,
    candidatesInPool: totalUsers,
  };
  publicCacheAt = Date.now();
  res.json(publicCache);
}));

/* GET /api/dashboard/colleges
   Returns all college tenants — used to populate "Select College" filters
   for recruiters/admins viewing campus recruitment data. */
router.get('/colleges', authenticate, asyncHandler(async (req, res) => {
  const colleges = await Tenant.find({ type: 'college', deletedAt: null })
    .select('name').sort({ name: 1 }).lean();
  res.json({ success: true, data: colleges.map(c => ({ id: String(c._id), name: c.name })) });
}));

/** Cache for the full college-directory name list (see below) — this endpoint
 * is public/unauthenticated and gets hit on every autocomplete keystroke, so
 * rebuilding it from a full Candidate scan each time would be wasteful. A
 * short TTL keeps it responsive to newly-registered colleges (a brand-new
 * name becomes searchable for everyone within COLLEGE_DIRECTORY_CACHE_MS). */
const COLLEGE_DIRECTORY_CACHE_MS = 60 * 1000;
let collegeDirectoryCache = { names: null, expiresAt: 0 };

async function buildCollegeDirectory() {
  const [tenantNames, candidates] = await Promise.all([
    Tenant.find({ type: 'college', deletedAt: null }).select('name').lean(),
    Candidate.find({ deletedAt: null }).select('email college educationList').lean(),
  ]);

  const fallback = await getEducationFallbackMap(candidates);

  const byKey = new Map();
  const normalize = (name) => String(name || '').trim().replace(/\s+/g, ' ');
  const addName = (name) => {
    const cleaned = normalize(name);
    if (!cleaned) return;
    const key = normalizeCollegeKey(cleaned);
    if (!key) return;
    if (!byKey.has(key)) byKey.set(key, cleaned);
  };

  tenantNames.forEach(t => addName(t.name));

  candidates.forEach(c => {
    let collegeName = normalize(c.college);
    let education = parseJsonArray(c.educationList);

    if (!collegeName && c.email) {
      const fb = fallback.get(c.email.toLowerCase().trim());
      if (fb) {
        if (fb.college) collegeName = normalize(fb.college);
        if (!education.length) education = parseJsonArray(fb.educationList);
      }
    }

    if (collegeName) {
      addName(collegeName);
      return;
    }

    const latest = getLatestEducation(education);
    if (latest?.institution) addName(latest.institution);
  });

  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

/* GET /api/dashboard/college-directory?q=...
   Public, unauthenticated directory of known college/school names — used to
   power autocomplete during candidate registration/profile editing so that
   "SelfCrops" / "selfcrops " / " SELFCROPS" etc. all resolve to one canonical
   entry. Merges registered College/Campus tenants, every candidate's College/
   School Name, and — for candidates who left that field blank — the
   institution from their latest education entry (falling back to the User
   profile's educationList the same way /college-groups does). This mirrors
   the /college-groups grouping exactly, so every existing "college group"
   shows up as a suggestion here, and a brand-new name typed by a student is
   simply stored on their profile (see auth.js / profile routes) and becomes
   the directory's (and college-groups') next group automatically. */
router.get('/college-directory', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();

  const now = Date.now();
  if (!collegeDirectoryCache.names || collegeDirectoryCache.expiresAt <= now) {
    collegeDirectoryCache = { names: await buildCollegeDirectory(), expiresAt: now + COLLEGE_DIRECTORY_CACHE_MS };
  }

  let results = collegeDirectoryCache.names;
  if (q) {
    results = results
      .filter(name => name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1;
        const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return a.localeCompare(b);
      });
  }

  res.json({ success: true, data: results.slice(0, 30) });
}));

// ── College / Campus Portal ─────────────────────────────────────────────────
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Parses a JSON-array string field (educationList/certifications), tolerating
 * legacy/invalid values by returning an empty array. */
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

/** De-duplicates candidate records by email (case-insensitive) — imports/
 * re-saves can leave more than one Candidate document for the same person,
 * which otherwise shows up as the same person listed twice in group drill-downs. */
function dedupeByEmail(list) {
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

/** Some older candidate records have an empty Candidate.educationList even
 * though the person filled in their education on their User profile (a past
 * sync gap). This builds a map of email -> educationList JSON string, falling
 * back to the User collection wherever the candidate's own value is empty. */
async function getEducationFallbackMap(candidates) {
  const emails = candidates
    .filter(c => !parseJsonArray(c.educationList).length && c.email)
    .map(c => c.email.toLowerCase().trim());
  if (!emails.length) return new Map();

  const users = await User.find({ email: { $in: emails }, educationList: { $exists: true, $ne: '' } })
    .select('email educationList college').lean();

  return new Map(users.map(u => [u.email.toLowerCase().trim(), u]));
}

/** Builds a case/whitespace-insensitive exact-match regex for the calling
 * college admin's tenant name, used to find students/applications that
 * entered this college as their "College / School Name". Returns null if
 * the caller is not a College/Campus tenant admin. */
async function getCollegeFilter(req) {
  if (req.user.tenantType !== 'college') return null;
  const tenant = await Tenant.findById(req.user.tenantId).select('name').lean();
  if (!tenant?.name) return null;
  const normalized = tenant.name.trim().replace(/\s+/g, ' ');
  return { name: normalized, regex: new RegExp('^' + escapeRegex(normalized) + '$', 'i') };
}

/* GET /api/dashboard/college/overview — placement officer dashboard summary */
router.get('/college/overview', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const candFilter = { college: college.regex, deletedAt: null };
  const currentYear = new Date().getFullYear();

  const students = await Candidate.find(candFilter)
    .select('name email educationList isFresher createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const eduFallback = await getEducationFallbackMap(students);
  const candidateIds = students.map(s => s._id);

  const [totalApplications, totalPlacements, upcomingInterviews] = await Promise.all([
    Application.countDocuments({ candidateId: { $in: candidateIds }, deletedAt: null }),
    Application.countDocuments({ candidateId: { $in: candidateIds }, currentStage: 'Hired', deletedAt: null }),
    Application.countDocuments({
      candidateId: { $in: candidateIds }, deletedAt: null,
      'interviewRounds.scheduledAt': { $gte: new Date() },
    }),
  ]);

  // ── Department & batch (passing year) breakdown ──────────────────────────
  const deptCounts  = new Map();
  const yearCounts  = new Map();
  const yearByCandidate = new Map();
  let currentCount  = 0;
  let alumniCount   = 0;

  students.forEach(s => {
    let education = parseJsonArray(s.educationList);
    if (!education.length && s.email) {
      const fb = eduFallback.get(s.email.toLowerCase().trim());
      if (fb) education = parseJsonArray(fb.educationList);
    }
    const latest = getLatestEducation(education);
    const dept = (latest?.degree || latest?.field || 'Unspecified').trim() || 'Unspecified';
    deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);

    const year = parseInt(latest?.year, 10);
    if (Number.isFinite(year)) {
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1);
      yearByCandidate.set(String(s._id), year);
      if (year >= currentYear) currentCount++; else alumniCount++;
    } else if (s.isFresher) {
      currentCount++;
    } else {
      alumniCount++;
    }
  });

  const departmentBreakdown = [...deptCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const yearBreakdown = [...yearCounts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  // ── Placement rate by batch (% of each year's students who got Hired) ────
  const hiredCandidateIds = new Set(
    (await Application.find({ candidateId: { $in: candidateIds }, currentStage: 'Hired', deletedAt: null })
      .distinct('candidateId')).map(String)
  );
  const placedByYear = new Map();
  yearByCandidate.forEach((year, candId) => {
    if (hiredCandidateIds.has(candId)) placedByYear.set(year, (placedByYear.get(year) || 0) + 1);
  });
  const placementRateByBatch = yearBreakdown.map(({ year, count }) => ({
    year,
    total: count,
    placed: placedByYear.get(year) || 0,
    rate: count > 0 ? Math.round(((placedByYear.get(year) || 0) / count) * 1000) / 10 : 0,
  }));

  // ── Recent placements (last 5 hires) with company & role ─────────────────
  const recentPlacementsRaw = await Application.aggregate([
    { $match: { candidateId: { $in: candidateIds }, currentStage: 'Hired', deletedAt: null } },
    { $sort: { updatedAt: -1 } },
    { $limit: 5 },
    { $lookup: { from: 'jobs', localField: 'jobId', foreignField: '_id', as: 'job' } },
    { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'candidates', localField: 'candidateId', foreignField: '_id', as: 'candidate' } },
    { $unwind: { path: '$candidate', preserveNullAndEmptyArrays: true } },
    { $project: {
        studentName: '$candidate.name',
        jobTitle: '$job.title',
        company: { $ifNull: ['$job.companyName', '$job.company'] },
        placedAt: '$updatedAt',
    } },
  ]);

  // ── Top hiring companies (all-time, this college's students) ─────────────
  const allPlacements = await Application.aggregate([
    { $match: { candidateId: { $in: candidateIds }, currentStage: 'Hired', deletedAt: null } },
    { $lookup: { from: 'jobs', localField: 'jobId', foreignField: '_id', as: 'job' } },
    { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
    { $project: { company: { $ifNull: ['$job.companyName', '$job.company'] } } },
  ]);
  const companyCounts = new Map();
  allPlacements.forEach(p => {
    const c = (p.company || '').trim();
    if (!c) return;
    companyCounts.set(c, (companyCounts.get(c) || 0) + 1);
  });
  const topCompanies = [...companyCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentStudents = students.slice(0, 5).map(s => ({
    name: s.name || '',
    email: s.email || '',
    joinedAt: s.createdAt,
  }));

  res.json({
    success: true,
    data: {
      collegeName: college.name,
      totalStudents: students.length,
      currentStudents: currentCount,
      alumniCount,
      totalApplications,
      totalPlacements,
      upcomingInterviews,
      placementRate: students.length > 0 ? Math.round((totalPlacements / students.length) * 1000) / 10 : 0,
      departmentBreakdown,
      yearBreakdown,
      placementRateByBatch,
      topCompanies,
      recentPlacements: recentPlacementsRaw.map(p => ({
        studentName: p.studentName || '',
        jobTitle: p.jobTitle || '',
        company: p.company || '',
        placedAt: p.placedAt,
      })),
      recentStudents,
    },
  });
}));

/* POST /api/dashboard/college/announcements — broadcast a notification to every
   student/alumnus registered under this college. Used by the placement officer
   to share drive updates, deadlines, and important notices in real time. */
router.post('/college/announcements', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const title   = String(req.body.title || '').trim();
  const message = String(req.body.message || '').trim();
  const link    = req.body.link ? String(req.body.link).trim() : '/app/feed';
  if (!title || !message) throw new AppError('Title and message are required.', 400);

  const Notification = require('../models/Notification');

  const students = await User.find({ college: college.regex, deletedAt: null }).select('_id tenantId').lean();
  if (!students.length) {
    return res.json({ success: true, recipients: 0, message: 'No registered students found for this college yet.' });
  }

  await Notification.insertMany(students.map(s => ({
    userId: s._id,
    tenantId: s.tenantId,
    type: 'system',
    title,
    message,
    link,
    metadata: { kind: 'college_announcement', collegeName: college.name },
  })));

  res.json({ success: true, recipients: students.length });
}));

/* GET /api/dashboard/college/students/export — download full student roster as Excel */
router.get('/college/students/export', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const students = await Candidate.find({ college: college.regex, deletedAt: null })
    .select('name email phone title experience isFresher skills currentCompany location educationList createdAt')
    .sort({ createdAt: -1 })
    .lean();

  const eduFallback = await getEducationFallbackMap(students);
  const currentYear = new Date().getFullYear();
  const rows = students.map(s => {
    let education = parseJsonArray(s.educationList);
    if (!education.length && s.email) {
      const fb = eduFallback.get(s.email.toLowerCase().trim());
      if (fb) education = parseJsonArray(fb.educationList);
    }
    const latest = getLatestEducation(education);
    const passingYear = parseInt(latest?.year, 10);
    const studentType = Number.isFinite(passingYear)
      ? (passingYear >= currentYear ? 'Student' : 'Alumni')
      : (s.isFresher ? 'Student' : 'Alumni');

    return {
      name: s.name || '',
      email: s.email || '',
      phone: s.phone || '',
      type: studentType,
      degree: latest?.degree || '',
      institution: latest?.institution || '',
      year: latest?.year || '',
      grade: latest?.grade || '',
      skills: (s.skills || []).join(', '),
      currentCompany: s.currentCompany || '',
      location: s.location || '',
      joinedAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '',
    };
  });

  const buffer = exportToExcel('Students', [
    { header: 'Name', key: 'name', width: 24 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Degree', key: 'degree', width: 16 },
    { header: 'Institution', key: 'institution', width: 28 },
    { header: 'Passing Year', key: 'year', width: 12 },
    { header: 'CGPA / Grade', key: 'grade', width: 12 },
    { header: 'Skills', key: 'skills', width: 32 },
    { header: 'Current Company', key: 'currentCompany', width: 22 },
    { header: 'Location', key: 'location', width: 18 },
    { header: 'Joined Platform', key: 'joinedAt', width: 14 },
  ], rows);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${college.name.replace(/[^a-z0-9]+/gi, '_')}_students.xlsx"`);
  res.send(buffer);
}));

/* GET /api/dashboard/college/drives — active job openings on the platform that
   this college's placement officer can promote to their students. */
router.get('/college/drives', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const jobs = await Job.find({ status: 'active', isPublic: true, deletedAt: null })
    .select('title companyName company location jobType experience skills salaryMin salaryMax salaryCurrency createdAt')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const data = jobs.map(j => ({
    id: String(j._id),
    title: j.title || '',
    company: j.companyName || j.company || '',
    location: j.location || '',
    jobType: j.jobType || '',
    experience: j.experience || '',
    skills: j.skills || [],
    salaryMin: j.salaryMin ?? null,
    salaryMax: j.salaryMax ?? null,
    salaryCurrency: j.salaryCurrency || 'INR',
    postedAt: j.createdAt,
  }));

  res.json({ success: true, data });
}));

/* POST /api/dashboard/college/drives/:jobId/notify — notify all students of this
   college about a specific job opening. */
router.post('/college/drives/:jobId/notify', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const job = await Job.findOne({ _id: req.params.jobId, status: 'active', isPublic: true, deletedAt: null })
    .select('title companyName company').lean();
  if (!job) throw new AppError('Job opening not found or no longer active.', 404);

  const Notification = require('../models/Notification');
  const students = await User.find({ college: college.regex, deletedAt: null }).select('_id tenantId').lean();
  if (!students.length) {
    return res.json({ success: true, recipients: 0, message: 'No registered students found for this college yet.' });
  }

  const company = job.companyName || job.company || 'A company';
  await Notification.insertMany(students.map(s => ({
    userId: s._id,
    tenantId: s.tenantId,
    type: 'system',
    title: `New opportunity: ${job.title}`,
    message: `${company} is hiring for "${job.title}". Your placement office shared this opportunity — check it out and apply!`,
    link: `/app/smart-match`,
    metadata: { kind: 'college_drive_notify', jobId: String(job._id) },
  })));

  res.json({ success: true, recipients: students.length });
}));

/** Finds this college's students who match a placement drive's eligibility
 * criteria (minimum CGPA, branch/degree, passing year, required skills). Any
 * criterion left empty is skipped, so a drive with no eligibility filters
 * matches every student. */
async function findEligibleCandidates(college, eligibility = {}) {
  const students = await Candidate.find({ college: college.regex, deletedAt: null })
    .select('name email phone skills educationList isFresher currentCompany userId')
    .lean();

  const { minCGPA, degrees = [], branches = [], passingYears = [], skills = [] } = eligibility || {};
  const degreesLc = degrees.map(d => String(d).toLowerCase().trim()).filter(Boolean);
  const branchesLc = branches.map(b => String(b).toLowerCase().trim()).filter(Boolean);
  const skillsLc = skills.map(s => String(s).toLowerCase().trim()).filter(Boolean);

  return students.filter(s => {
    const education = parseJsonArray(s.educationList);
    const latest = getLatestEducation(education);

    if (degreesLc.length) {
      const degree = String(latest?.degree || '');
      if (!degreesLc.some(d => degree.toLowerCase().includes(d) || degreeTextMatches(degree, d))) return false;
    }
    if (branchesLc.length) {
      const branch = String(latest?.field || latest?.degree || '');
      if (!branchesLc.some(b => branch.toLowerCase().includes(b) || degreeTextMatches(branch, b))) return false;
    }
    if (passingYears.length) {
      const year = parseInt(latest?.year, 10);
      if (!Number.isFinite(year) || !passingYears.includes(year)) return false;
    }
    if (minCGPA != null && minCGPA !== '') {
      const grade = parseFloat(latest?.grade);
      if (!Number.isFinite(grade) || grade < Number(minCGPA)) return false;
    }
    if (skillsLc.length) {
      const candSkills = (s.skills || []).map(sk => String(sk).toLowerCase());
      if (!skillsLc.some(sk => candSkills.includes(sk))) return false;
    }
    return true;
  });
}

/** Notifies eligible candidates about a (newly created or just-approved)
 * placement drive and broadcasts a real-time update. Best-effort. */
function notifyEligibleStudents(drive, eligible, tenantId) {
  const recipients = eligible.filter(c => c.userId);
  if (!recipients.length) return;

  const Notification = require('../models/Notification');
  Notification.insertMany(recipients.map(c => ({
    userId: c.userId,
    tenantId,
    type: 'system',
    title: `New placement drive: ${drive.title}`,
    message: `${drive.companyName || 'Your placement office'} is conducting "${drive.title}" on ${new Date(drive.driveDate).toLocaleDateString()}. You're eligible — check the Opportunities page for details.`,
    link: '/app/opportunities',
    metadata: { kind: 'placement_drive', driveId: String(drive._id) },
  }))).catch(() => {});

  try {
    const { emitToTenant } = require('../socket/platformSocket');
    const socketRegistry   = require('../socket/index');
    emitToTenant(socketRegistry.getIO(), tenantId, 'drive:registrationChanged', { driveId: String(drive._id) });
  } catch {}
}

/* Notifies the recruiter/admin who requested a campus drive once the
   college's placement officer approves or declines it. */
function notifyDriveRequester(drive, outcome) {
  if (!drive.createdBy) return;
  const Notification = require('../models/Notification');
  const verb = outcome === 'approved' ? 'approved' : 'declined';
  const message = outcome === 'approved'
    ? `${drive.collegeName || 'The college'} approved your request for "${drive.title}". Eligible students have been notified.`
    : `${drive.collegeName || 'The college'} declined your request for "${drive.title}".`;
  Notification.create({
    userId: drive.createdBy,
    tenantId: drive.requestedByTenantId,
    type: 'system',
    title: `Drive request ${verb}: ${drive.title}`,
    message,
    link: '/app/college-drives',
    metadata: { kind: 'placement_drive_request', driveId: String(drive._id), outcome },
  }).catch(() => {});
}

/* GET /api/dashboard/college/placement-drives — list this college's own
   organized placement drives (distinct from the platform-wide job "drives"
   feed at /college/drives). Pending recruiter drive requests are excluded —
   see /college/drive-requests. */
router.get('/college/placement-drives', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const drives = await PlacementDrive.find({ tenantId: req.user.tenantId, deletedAt: null, requestStatus: { $ne: 'pending' } })
    .sort({ driveDate: -1 }).lean();

  const data = drives.map(d => {
    const counts = { registered: 0, shortlisted: 0, selected: 0, rejected: 0 };
    (d.registrations || []).forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return {
      id: String(d._id),
      title: d.title,
      companyName: d.companyName || '',
      jobId: d.jobId ? String(d.jobId) : null,
      description: d.description || '',
      mode: d.mode,
      location: d.location || '',
      driveDate: d.driveDate,
      registrationDeadline: d.registrationDeadline,
      opportunityType: d.opportunityType || 'placement',
      examProvider: d.examProvider || '',
      registrationLink: d.registrationLink || '',
      assessmentId: d.assessmentId ? String(d.assessmentId) : null,
      eligibility: d.eligibility || {},
      status: d.status,
      totalEligible: (d.registrations || []).length,
      counts,
      createdAt: d.createdAt,
    };
  });

  res.json({ success: true, data });
}));

/* POST /api/dashboard/college/placement-drives — create a new placement drive.
   Eligible students are auto-computed from the eligibility criteria and added
   as "registered"; they're notified immediately so they know a drive is
   coming up. */
router.post('/college/placement-drives', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const { title, companyName, jobId, description, mode, location, driveDate, registrationDeadline, eligibility, opportunityType, examProvider, registrationLink, assessmentId } = req.body;
  if (!title || !String(title).trim()) throw new AppError('Drive title is required.', 400);
  if (!driveDate) throw new AppError('Drive date is required.', 400);

  const cleanEligibility = {
    minCGPA: eligibility?.minCGPA != null && eligibility.minCGPA !== '' ? Number(eligibility.minCGPA) : null,
    degrees: Array.isArray(eligibility?.degrees) ? eligibility.degrees.map(String).map(s => s.trim()).filter(Boolean) : [],
    branches: Array.isArray(eligibility?.branches) ? eligibility.branches.map(String).map(s => s.trim()).filter(Boolean) : [],
    passingYears: Array.isArray(eligibility?.passingYears) ? eligibility.passingYears.map(Number).filter(Number.isFinite) : [],
    skills: Array.isArray(eligibility?.skills) ? eligibility.skills.map(String).map(s => s.trim()).filter(Boolean) : [],
  };

  const eligible = await findEligibleCandidates(college, cleanEligibility);

  let cleanAssessmentId = null;
  if (assessmentId) {
    const assessment = await Assessment.findOne({ _id: assessmentId, tenantId: req.user.tenantId }).select('_id').lean();
    if (assessment) cleanAssessmentId = assessment._id;
  }

  const drive = await PlacementDrive.create({
    tenantId: req.user.tenantId,
    collegeName: college.name,
    title: String(title).trim().slice(0, 200),
    companyName: companyName ? String(companyName).trim().slice(0, 150) : '',
    jobId: jobId || null,
    description: description ? String(description).trim().slice(0, 2000) : '',
    mode: ['On-Campus', 'Virtual', 'Off-Campus'].includes(mode) ? mode : 'On-Campus',
    location: location ? String(location).trim().slice(0, 200) : '',
    driveDate: new Date(driveDate),
    registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
    opportunityType: ['placement', 'internship', 'exam'].includes(opportunityType) ? opportunityType : 'placement',
    examProvider: examProvider ? String(examProvider).trim().slice(0, 100) : '',
    registrationLink: registrationLink ? String(registrationLink).trim().slice(0, 500) : '',
    assessmentId: cleanAssessmentId,
    eligibility: cleanEligibility,
    status: 'upcoming',
    registrations: eligible.map(c => ({ candidateId: c._id, status: 'registered' })),
    createdBy: req.user._id || req.user.id,
  });

  // Notify eligible students about the new drive (best-effort, non-blocking).
  notifyEligibleStudents(drive, eligible, req.user.tenantId);

  res.json({ success: true, data: { id: String(drive._id) }, eligibleCount: eligible.length });
}));

/* GET /api/dashboard/college/placement-drives/:id — drive detail with the full
   list of eligible/registered students (drill-down). */
router.get('/college/placement-drives/:id', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const drive = await PlacementDrive.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }).lean();
  if (!drive) throw new AppError('Placement drive not found.', 404);

  const candidateIds = (drive.registrations || []).map(r => r.candidateId);
  const candidates = await Candidate.find({ _id: { $in: candidateIds } })
    .select('name email phone skills educationList').lean();
  const candMap = new Map(candidates.map(c => [String(c._id), c]));

  let submissionMap = new Map();
  if (drive.opportunityType === 'exam' && drive.assessmentId) {
    const submissions = await AssessmentSubmission.find({
      tenantId: req.user.tenantId,
      assessmentId: String(drive.assessmentId),
      candidateId: { $in: candidateIds.map(String) },
    }).select('candidateId status score maxScore percentage result submittedAt').lean();
    submissionMap = new Map(submissions.map(s => [String(s.candidateId), s]));
  }

  const registrations = (drive.registrations || []).map(r => {
    const c = candMap.get(String(r.candidateId)) || {};
    const latest = getLatestEducation(parseJsonArray(c.educationList));
    const sub = submissionMap.get(String(r.candidateId));
    return {
      candidateId: String(r.candidateId),
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      branch: latest?.degree || latest?.field || '',
      year: latest?.year || '',
      grade: latest?.grade || '',
      skills: c.skills || [],
      status: r.status,
      notes: r.notes || '',
      examStatus: sub ? sub.status : (drive.opportunityType === 'exam' && drive.assessmentId ? 'not_started' : null),
      examScore: sub ? sub.score : null,
      examMaxScore: sub ? sub.maxScore : null,
      examPercentage: sub ? sub.percentage : null,
      examResult: sub ? sub.result : null,
      examSubmittedAt: sub ? sub.submittedAt : null,
    };
  });

  res.json({
    success: true,
    data: {
      id: String(drive._id),
      title: drive.title,
      companyName: drive.companyName || '',
      jobId: drive.jobId ? String(drive.jobId) : null,
      description: drive.description || '',
      mode: drive.mode,
      location: drive.location || '',
      driveDate: drive.driveDate,
      registrationDeadline: drive.registrationDeadline,
      opportunityType: drive.opportunityType || 'placement',
      examProvider: drive.examProvider || '',
      registrationLink: drive.registrationLink || '',
      assessmentId: drive.assessmentId ? String(drive.assessmentId) : null,
      eligibility: drive.eligibility || {},
      status: drive.status,
      registrations,
    },
  });
}));

/* PATCH /api/dashboard/college/placement-drives/:id — update drive details/status. */
router.patch('/college/placement-drives/:id', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!drive) throw new AppError('Placement drive not found.', 404);

  const { title, companyName, description, mode, location, driveDate, registrationDeadline, status, opportunityType, examProvider, registrationLink, assessmentId, eligibility } = req.body;
  if (title !== undefined) drive.title = String(title).trim().slice(0, 200);
  if (companyName !== undefined) drive.companyName = String(companyName).trim().slice(0, 150);
  if (description !== undefined) drive.description = String(description).trim().slice(0, 2000);
  if (mode !== undefined && ['On-Campus', 'Virtual', 'Off-Campus'].includes(mode)) drive.mode = mode;
  if (location !== undefined) drive.location = String(location).trim().slice(0, 200);
  if (driveDate !== undefined) drive.driveDate = new Date(driveDate);
  if (registrationDeadline !== undefined) drive.registrationDeadline = registrationDeadline ? new Date(registrationDeadline) : null;
  if (status !== undefined && ['upcoming', 'ongoing', 'completed', 'cancelled'].includes(status)) drive.status = status;
  if (opportunityType !== undefined && ['placement', 'internship', 'exam'].includes(opportunityType)) drive.opportunityType = opportunityType;
  if (examProvider !== undefined) drive.examProvider = String(examProvider).trim().slice(0, 100);
  if (registrationLink !== undefined) drive.registrationLink = String(registrationLink).trim().slice(0, 500);
  if (assessmentId !== undefined) {
    if (!assessmentId) {
      drive.assessmentId = null;
    } else {
      const assessment = await Assessment.findOne({ _id: assessmentId, tenantId: req.user.tenantId }).select('_id').lean();
      drive.assessmentId = assessment ? assessment._id : drive.assessmentId;
    }
  }
  if (eligibility !== undefined) {
    drive.eligibility = {
      minCGPA: eligibility?.minCGPA != null && eligibility.minCGPA !== '' ? Number(eligibility.minCGPA) : null,
      degrees: Array.isArray(eligibility?.degrees) ? eligibility.degrees.map(String).map(s => s.trim()).filter(Boolean) : [],
      branches: Array.isArray(eligibility?.branches) ? eligibility.branches.map(String).map(s => s.trim()).filter(Boolean) : [],
      passingYears: Array.isArray(eligibility?.passingYears) ? eligibility.passingYears.map(Number).filter(Number.isFinite) : [],
      skills: Array.isArray(eligibility?.skills) ? eligibility.skills.map(String).map(s => s.trim()).filter(Boolean) : [],
    };
  }

  await drive.save();
  res.json({ success: true, data: { id: String(drive._id) } });
}));

/* PATCH /api/dashboard/college/placement-drives/:id/registrations/:candidateId
   — update one student's status within a drive (registered → shortlisted →
   selected/rejected). This is how the placement officer "conducts" a drive
   round by round. */
router.patch('/college/placement-drives/:id/registrations/:candidateId', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null });
  if (!drive) throw new AppError('Placement drive not found.', 404);

  const { status, notes } = req.body;
  if (status !== undefined && !['registered', 'shortlisted', 'selected', 'rejected'].includes(status)) {
    throw new AppError('Invalid status.', 400);
  }

  const reg = drive.registrations.find(r => String(r.candidateId) === req.params.candidateId);
  if (!reg) throw new AppError('Student is not part of this drive.', 404);

  const statusChanged = status !== undefined && status !== reg.status;
  if (status !== undefined) reg.status = status;
  if (notes !== undefined) reg.notes = String(notes).trim().slice(0, 500);
  reg.updatedAt = new Date();

  await drive.save();

  if (statusChanged) {
    // Notify the candidate and broadcast a real-time update so their
    // Opportunities/Applications page reflects the new status instantly.
    try {
      const Notification = require('../models/Notification');
      const candidate = await Candidate.findById(req.params.candidateId).select('userId name email').lean();
      if (candidate?.userId) {
        await Notification.create({
          userId: candidate.userId,
          tenantId: drive.tenantId,
          type: 'system',
          title: `Drive update: ${drive.title}`,
          message: `Your status for "${drive.title}" was updated to "${status}".`,
          link: '/app/opportunities',
          metadata: { kind: 'placement_drive_status', driveId: String(drive._id), status },
        });
      }

      const { emitToTenant } = require('../socket/platformSocket');
      const socketRegistry   = require('../socket/index');
      emitToTenant(socketRegistry.getIO(), drive.tenantId, 'drive:registrationChanged', {
        driveId: String(drive._id),
        candidateId: String(req.params.candidateId),
        status,
      });
    } catch {}
  }

  res.json({ success: true });
}));

/* POST /api/dashboard/college/placement-drives/:id/notify — placement officer
   sends a reminder/announcement about this drive to students, optionally
   filtered by passing year / degree / branch, or limited to already
   registered students. */
router.post('/college/placement-drives/:id/notify', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const drive = await PlacementDrive.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }).lean();
  if (!drive) throw new AppError('Placement drive not found.', 404);

  const { audience = 'eligible', passingYears = [], degrees = [], branches = [], message: customMessage = '', candidateIds = [] } = req.body || {};

  let candidates;
  if (audience === 'specific') {
    const ids = (Array.isArray(candidateIds) ? candidateIds : []).filter(Boolean);
    if (!ids.length) throw new AppError('Select at least one student to notify.', 400);
    candidates = await Candidate.find({ _id: { $in: ids }, college: college.regex, deletedAt: null })
      .select('name email userId educationList').lean();
  } else if (audience === 'registered') {
    const candidateIds = (drive.registrations || []).map(r => r.candidateId);
    candidates = await Candidate.find({ _id: { $in: candidateIds }, deletedAt: null })
      .select('name email userId educationList').lean();
  } else {
    const filters = {
      degrees: degrees.length ? degrees : (drive.eligibility?.degrees || []),
      branches: branches.length ? branches : (drive.eligibility?.branches || []),
      passingYears: passingYears.length ? passingYears.map(Number) : (drive.eligibility?.passingYears || []),
      minCGPA: drive.eligibility?.minCGPA,
      skills: drive.eligibility?.skills || [],
    };
    candidates = await findEligibleCandidates(college, filters);
    candidates = candidates.map(c => ({ ...c }));
    // re-select userId for notification linkage
    const withUser = await Candidate.find({ _id: { $in: candidates.map(c => c._id) } }).select('userId').lean();
    const userMap = new Map(withUser.map(c => [String(c._id), c.userId]));
    candidates = candidates.map(c => ({ ...c, userId: userMap.get(String(c._id)) }));
  }

  // Apply additional ad-hoc passing year / degree / branch filters on top of "registered" audience too
  if (audience === 'registered' && (passingYears.length || degrees.length || branches.length)) {
    const passingYearsNum = passingYears.map(Number);
    const degreesLc = degrees.map(d => String(d).toLowerCase().trim());
    const branchesLc = branches.map(b => String(b).toLowerCase().trim());
    candidates = candidates.filter(c => {
      const latest = getLatestEducation(parseJsonArray(c.educationList));
      if (passingYearsNum.length) {
        const year = parseInt(latest?.year, 10);
        if (!Number.isFinite(year) || !passingYearsNum.includes(year)) return false;
      }
      if (degreesLc.length) {
        const degree = String(latest?.degree || '');
        if (!degreesLc.some(d => degree.toLowerCase().includes(d) || degreeTextMatches(degree, d))) return false;
      }
      if (branchesLc.length) {
        const branch = String(latest?.field || latest?.degree || '');
        if (!branchesLc.some(b => branch.toLowerCase().includes(b) || degreeTextMatches(branch, b))) return false;
      }
      return true;
    });
  }

  const recipients = candidates.filter(c => c.userId);
  if (!recipients.length) {
    return res.json({ success: true, recipients: 0, message: 'No matching students with an active account found.' });
  }

  const Notification = require('../models/Notification');
  const text = customMessage?.trim()
    ? customMessage.trim().slice(0, 500)
    : `Reminder: "${drive.title}" is scheduled for ${new Date(drive.driveDate).toLocaleDateString()}. Check the Opportunities page for details.`;

  await Notification.insertMany(recipients.map(c => ({
    userId: c.userId,
    tenantId: drive.tenantId,
    type: 'system',
    title: `Placement Drive: ${drive.title}`,
    message: text,
    link: '/app/opportunities',
    metadata: { kind: 'placement_drive_notify', driveId: String(drive._id) },
  })));

  try {
    const { emitToTenant } = require('../socket/platformSocket');
    const socketRegistry   = require('../socket/index');
    emitToTenant(socketRegistry.getIO(), drive.tenantId, 'drive:registrationChanged', { driveId: String(drive._id) });
  } catch {}

  res.json({ success: true, recipients: recipients.length });
}));

/* DELETE /api/dashboard/college/placement-drives/:id — cancel/remove a drive. */
router.delete('/college/placement-drives/:id', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );
  if (!drive) throw new AppError('Placement drive not found.', 404);
  res.json({ success: true });
}));

/* POST /api/dashboard/company/drive-requests — a recruiter/company admin
   requests a campus drive at a specific college. The drive is created with
   requestStatus 'pending' and is hidden from the college's normal drive list
   and from candidates until the college's placement officer approves it. */
router.post('/company/drive-requests', authenticate, allowRoles('admin', 'recruiter'), asyncHandler(async (req, res) => {
  if (req.user.tenantType === 'college') throw new AppError('This action is only available for company accounts.', 403);

  const { collegeName, title, description, mode, location, driveDate, registrationDeadline, eligibility, opportunityType, examProvider, registrationLink } = req.body;
  if (!collegeName || !String(collegeName).trim()) throw new AppError('College name is required.', 400);
  if (!title || !String(title).trim()) throw new AppError('Drive title is required.', 400);
  if (!driveDate) throw new AppError('Drive date is required.', 400);

  const normalized = String(collegeName).trim().replace(/\s+/g, ' ');
  const collegeTenant = await Tenant.findOne({ type: 'college', deletedAt: null, name: new RegExp('^' + escapeRegex(normalized) + '$', 'i') }).select('_id name').lean();
  if (!collegeTenant) throw new AppError('No registered college matches that name. Please select a college from the suggestions.', 404);

  const myTenant = await Tenant.findById(req.user.tenantId).select('name').lean();

  const cleanEligibility = {
    minCGPA: eligibility?.minCGPA != null && eligibility.minCGPA !== '' ? Number(eligibility.minCGPA) : null,
    degrees: Array.isArray(eligibility?.degrees) ? eligibility.degrees.map(String).map(s => s.trim()).filter(Boolean) : [],
    branches: Array.isArray(eligibility?.branches) ? eligibility.branches.map(String).map(s => s.trim()).filter(Boolean) : [],
    passingYears: Array.isArray(eligibility?.passingYears) ? eligibility.passingYears.map(Number).filter(Number.isFinite) : [],
    skills: Array.isArray(eligibility?.skills) ? eligibility.skills.map(String).map(s => s.trim()).filter(Boolean) : [],
  };

  const drive = await PlacementDrive.create({
    tenantId: collegeTenant._id,
    collegeName: collegeTenant.name,
    title: String(title).trim().slice(0, 200),
    companyName: myTenant?.name ? String(myTenant.name).trim().slice(0, 150) : '',
    description: description ? String(description).trim().slice(0, 2000) : '',
    mode: ['On-Campus', 'Virtual', 'Off-Campus'].includes(mode) ? mode : 'On-Campus',
    location: location ? String(location).trim().slice(0, 200) : '',
    driveDate: new Date(driveDate),
    registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
    opportunityType: ['placement', 'internship', 'exam'].includes(opportunityType) ? opportunityType : 'placement',
    examProvider: examProvider ? String(examProvider).trim().slice(0, 100) : '',
    registrationLink: registrationLink ? String(registrationLink).trim().slice(0, 500) : '',
    eligibility: cleanEligibility,
    status: 'upcoming',
    registrations: [],
    requestStatus: 'pending',
    requestedByTenantId: req.user.tenantId,
    requestedByCompanyName: myTenant?.name || '',
    createdBy: req.user._id || req.user.id,
  });

  // Notify the college's placement officers/admins about the new drive request.
  try {
    const Notification = require('../models/Notification');
    const officers = await User.find({ tenantId: collegeTenant._id, role: { $in: ['admin', 'placement_officer'] }, deletedAt: null }).select('_id').lean();
    if (officers.length) {
      await Notification.insertMany(officers.map(o => ({
        userId: o._id,
        tenantId: collegeTenant._id,
        type: 'system',
        title: `Campus drive request: ${drive.title}`,
        message: `${drive.companyName || 'A company'} has requested to conduct "${drive.title}" at your college on ${new Date(drive.driveDate).toLocaleDateString()}. Review and approve to notify eligible students.`,
        link: '/app/drives',
        metadata: { kind: 'placement_drive_request', driveId: String(drive._id) },
      })));
    }
    const { emitToTenant } = require('../socket/platformSocket');
    const socketRegistry   = require('../socket/index');
    emitToTenant(socketRegistry.getIO(), collegeTenant._id, 'drive:registrationChanged', { driveId: String(drive._id) });
  } catch {}

  res.json({ success: true, data: { id: String(drive._id) } });
}));

/* GET /api/dashboard/college/drive-requests — pending campus drive requests
   from companies/recruiters, awaiting this college's approval. */
router.get('/college/drive-requests', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const drives = await PlacementDrive.find({ tenantId: req.user.tenantId, deletedAt: null, requestStatus: 'pending' })
    .sort({ createdAt: -1 }).lean();

  res.json({
    success: true,
    data: drives.map(d => ({
      id: String(d._id),
      title: d.title,
      companyName: d.companyName || d.requestedByCompanyName || '',
      description: d.description || '',
      mode: d.mode,
      location: d.location || '',
      driveDate: d.driveDate,
      registrationDeadline: d.registrationDeadline,
      opportunityType: d.opportunityType || 'placement',
      examProvider: d.examProvider || '',
      registrationLink: d.registrationLink || '',
      eligibility: d.eligibility || {},
      createdAt: d.createdAt,
    })),
  });
}));

/* POST /api/dashboard/college/drive-requests/:id/approve — placement officer
   approves a recruiter's campus drive request. Computes eligible students
   from the request's eligibility criteria, registers them, notifies them,
   and publishes the drive into the normal placement-drives list. */
router.post('/college/drive-requests/:id/approve', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const drive = await PlacementDrive.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null, requestStatus: 'pending' });
  if (!drive) throw new AppError('Drive request not found.', 404);

  const eligible = await findEligibleCandidates(college, drive.eligibility);
  drive.registrations = eligible.map(c => ({ candidateId: c._id, status: 'registered' }));
  drive.requestStatus = 'approved';
  await drive.save();

  notifyEligibleStudents(drive, eligible, req.user.tenantId);
  notifyDriveRequester(drive, 'approved');

  res.json({ success: true, data: { id: String(drive._id) }, eligibleCount: eligible.length });
}));

/* POST /api/dashboard/college/drive-requests/:id/reject — placement officer
   declines a recruiter's campus drive request. */
router.post('/college/drive-requests/:id/reject', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const drive = await PlacementDrive.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null, requestStatus: 'pending' },
    { $set: { requestStatus: 'rejected', status: 'cancelled' } }
  );
  if (!drive) throw new AppError('Drive request not found.', 404);
  notifyDriveRequester(drive, 'rejected');
  res.json({ success: true });
}));

/* GET /api/dashboard/company/college-drives — for company/recruiter admins:
   placement drives across colleges that this company is conducting. */
router.get('/company/college-drives', authenticate, allowRoles('admin', 'recruiter'), asyncHandler(async (req, res) => {
  if (req.user.tenantType === 'college') throw new AppError('This view is only available for company accounts.', 403);

  const tenant = await Tenant.findById(req.user.tenantId).select('name').lean();
  const companyName = normalizeCompanyName(tenant?.name) || tenant?.name || '';
  if (!companyName) return res.json({ success: true, data: [] });

  const variants = companyNameVariants(companyName);
  const pattern = '^(' + variants.map(escapeRegex).join('|') + ')$';
  const companyRx = new RegExp(pattern, 'i');

  const drives = await PlacementDrive.find({
    companyName: companyRx,
    deletedAt: null,
    $or: [{ status: { $ne: 'cancelled' } }, { requestStatus: 'rejected' }],
  })
    .select('title collegeName description mode location driveDate registrationDeadline opportunityType examProvider status registrations requestStatus')
    .sort({ driveDate: -1 })
    .limit(100)
    .lean();

  const data = drives.map(d => ({
    id: String(d._id),
    title: d.title,
    collegeName: d.collegeName,
    description: d.description,
    mode: d.mode,
    location: d.location,
    driveDate: d.driveDate,
    registrationDeadline: d.registrationDeadline,
    opportunityType: d.opportunityType,
    examProvider: d.examProvider,
    status: d.status,
    requestStatus: d.requestStatus || 'none',
    registeredCount: (d.registrations || []).length,
    shortlistedCount: (d.registrations || []).filter(r => r.status === 'shortlisted').length,
    selectedCount: (d.registrations || []).filter(r => r.status === 'selected').length,
  }));

  res.json({ success: true, data });
}));

/* GET /api/dashboard/college/assessments — list this college tenant's
   assessments for linking to an exam-type opportunity. */
router.get('/college/assessments', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const assessments = await Assessment.find({ tenantId: req.user.tenantId, isActive: true }).select('_id title').sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: assessments.map(a => ({ id: String(a._id), title: a.title })) });
}));

/* GET /api/dashboard/college/training-resources — list aptitude/placement
   prep resources curated for this college. */
router.get('/college/training-resources', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const resources = await TrainingResource.find({ tenantId: req.user.tenantId, deletedAt: null }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: resources.map(r => ({
    id: String(r._id), title: r.title, url: r.url, description: r.description || '', category: r.category, createdAt: r.createdAt,
  })) });
}));

/* POST /api/dashboard/college/training-resources — add a new training resource. */
router.post('/college/training-resources', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const { title, url, description, category } = req.body;
  if (!title || !String(title).trim()) throw new AppError('Resource title is required.', 400);
  if (!url || !String(url).trim()) throw new AppError('Resource URL is required.', 400);

  const resource = await TrainingResource.create({
    tenantId: req.user.tenantId,
    collegeName: college.name,
    title: String(title).trim().slice(0, 200),
    url: String(url).trim().slice(0, 500),
    description: description ? String(description).trim().slice(0, 1000) : '',
    category: ['Aptitude', 'Coding', 'Verbal', 'Reasoning', 'Interview', 'Other'].includes(category) ? category : 'Other',
    createdBy: req.user._id || req.user.id,
  });

  res.json({ success: true, data: { id: String(resource._id) } });
}));

/* POST /api/dashboard/college/training-resources/:id/notify — alert specific
   students that a new training resource is available. */
router.post('/college/training-resources/:id/notify', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const resource = await TrainingResource.findOne({ _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null }).lean();
  if (!resource) throw new AppError('Training resource not found.', 404);

  const { candidateIds = [], message: customMessage = '' } = req.body || {};
  const ids = (Array.isArray(candidateIds) ? candidateIds : []).filter(Boolean);
  if (!ids.length) throw new AppError('Select at least one student to notify.', 400);

  const candidates = await Candidate.find({ _id: { $in: ids }, college: college.regex, deletedAt: null }).select('userId').lean();
  const recipients = candidates.filter(c => c.userId);
  if (!recipients.length) {
    return res.json({ success: true, recipients: 0, message: 'No matching students with an active account found.' });
  }

  const Notification = require('../models/Notification');
  const text = customMessage?.trim()
    ? customMessage.trim().slice(0, 500)
    : `New ${resource.category} resource added: "${resource.title}". Check Training Resources under Opportunities.`;

  await Notification.insertMany(recipients.map(c => ({
    userId: c.userId,
    tenantId: req.user.tenantId,
    type: 'system',
    title: `New training resource: ${resource.title}`,
    message: text,
    link: '/app/opportunities',
    metadata: { kind: 'training_resource_notify', resourceId: String(resource._id) },
  })));

  res.json({ success: true, recipients: recipients.length });
}));

/* DELETE /api/dashboard/college/training-resources/:id */
router.delete('/college/training-resources/:id', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const resource = await TrainingResource.findOneAndUpdate(
    { _id: req.params.id, tenantId: req.user.tenantId, deletedAt: null },
    { $set: { deletedAt: new Date() } }
  );
  if (!resource) throw new AppError('Resource not found.', 404);
  res.json({ success: true });
}));

/* GET /api/dashboard/candidate/opportunities — placement/internship/exam
   opportunities posted by the candidate's college, with eligibility +
   registration status for the current candidate. */
router.get('/candidate/opportunities', authenticate, allowRoles('candidate'), asyncHandler(async (req, res) => {
  const candidate = await Candidate.findOne({ email: req.user.email, deletedAt: null }).lean();
  const collegeName = (candidate?.college || req.user.college || '').trim();
  if (!collegeName) return res.json({ success: true, data: [] });

  const collegeRegex = new RegExp('^' + escapeRegex(collegeName) + '$', 'i');
  const drives = await PlacementDrive.find({ collegeName: collegeRegex, deletedAt: null, status: { $ne: 'cancelled' }, requestStatus: { $ne: 'pending' } })
    .sort({ driveDate: -1 }).lean();

  const education = parseJsonArray(candidate?.educationList);
  const latest = getLatestEducation(education);
  const candidateDegree = String(latest?.degree || '');
  const candidateBranch = String(latest?.field || latest?.degree || '');
  const candidateYear = parseInt(latest?.year, 10);
  const candidateGrade = parseFloat(latest?.grade);
  const candidateSkills = (candidate?.skills || []).map(s => String(s).toLowerCase());

  const data = drives.map(d => {
    const elig = d.eligibility || {};
    let isEligible = true;
    if (Array.isArray(elig.degrees) && elig.degrees.length) {
      isEligible = isEligible && elig.degrees.some(deg => candidateDegree.toLowerCase().includes(String(deg).toLowerCase()) || degreeTextMatches(candidateDegree, deg));
    }
    if (Array.isArray(elig.branches) && elig.branches.length) {
      isEligible = isEligible && elig.branches.some(b => candidateBranch.toLowerCase().includes(String(b).toLowerCase()) || degreeTextMatches(candidateBranch, b));
    }
    if (Array.isArray(elig.passingYears) && elig.passingYears.length) {
      isEligible = isEligible && Number.isFinite(candidateYear) && elig.passingYears.includes(candidateYear);
    }
    if (elig.minCGPA != null) {
      isEligible = isEligible && Number.isFinite(candidateGrade) && candidateGrade >= Number(elig.minCGPA);
    }
    if (Array.isArray(elig.skills) && elig.skills.length) {
      isEligible = isEligible && elig.skills.some(s => candidateSkills.includes(String(s).toLowerCase()));
    }

    const myRegistration = candidate ? (d.registrations || []).find(r => String(r.candidateId) === String(candidate._id)) : null;

    return {
      id: String(d._id),
      title: d.title,
      companyName: d.companyName || '',
      description: d.description || '',
      mode: d.mode,
      location: d.location || '',
      driveDate: d.driveDate,
      registrationDeadline: d.registrationDeadline,
      opportunityType: d.opportunityType || 'placement',
      examProvider: d.examProvider || '',
      registrationLink: d.registrationLink || '',
      assessmentId: d.assessmentId ? String(d.assessmentId) : null,
      eligibility: elig,
      status: d.status,
      isEligible,
      myStatus: myRegistration?.status || null,
    };
  });

  res.json({ success: true, data });
}));

/* POST /api/dashboard/candidate/opportunities/:id/register — candidate
   self-registers interest in a placement/internship/exam opportunity. */
router.post('/candidate/opportunities/:id/register', authenticate, allowRoles('candidate'), asyncHandler(async (req, res) => {
  const candidate = await Candidate.findOne({ email: req.user.email, deletedAt: null });
  if (!candidate) throw new AppError('Candidate profile not found.', 404);

  const drive = await PlacementDrive.findOne({ _id: req.params.id, deletedAt: null });
  if (!drive) throw new AppError('Opportunity not found.', 404);

  const collegeName = (candidate.college || '').trim().toLowerCase();
  if (!collegeName || (drive.collegeName || '').trim().toLowerCase() !== collegeName) {
    throw new AppError('This opportunity is not available for your college.', 403);
  }

  const existing = drive.registrations.find(r => String(r.candidateId) === String(candidate._id));
  if (existing) {
    return res.json({ success: true, data: { status: existing.status }, message: 'Already registered.' });
  }

  drive.registrations.push({ candidateId: candidate._id, status: 'registered' });
  await drive.save();

  // Real-time broadcast — placement officers see new registrations instantly
  try {
    const { emitToTenant } = require('../socket/platformSocket');
    const socketRegistry   = require('../socket/index');
    emitToTenant(socketRegistry.getIO(), drive.tenantId, 'drive:registrationChanged', {
      driveId: String(drive._id),
      candidateId: String(candidate._id),
      status: 'registered',
    });
  } catch {}

  // Notify the college's placement officers/admins about the new registration (best-effort).
  try {
    const Notification = require('../models/Notification');
    const officers = await User.find({ tenantId: drive.tenantId, role: { $in: ['admin', 'placement_officer'] }, deletedAt: null }).select('_id').lean();
    if (officers.length) {
      await Notification.insertMany(officers.map(o => ({
        userId: o._id,
        tenantId: drive.tenantId,
        type: 'system',
        title: `New registration: ${drive.title}`,
        message: `${candidate.name || candidate.email} registered for "${drive.title}".`,
        link: '/app/drives',
        metadata: { kind: 'placement_drive_registration', driveId: String(drive._id), candidateId: String(candidate._id) },
      })));
    }
  } catch {}

  res.json({ success: true, data: { status: 'registered' } });
}));

/* GET /api/dashboard/candidate/training-resources — resources curated by the
   candidate's college placement cell. */
router.get('/candidate/training-resources', authenticate, allowRoles('candidate'), asyncHandler(async (req, res) => {
  const candidate = await Candidate.findOne({ email: req.user.email, deletedAt: null }).select('college').lean();
  const collegeName = (candidate?.college || req.user.college || '').trim();
  if (!collegeName) return res.json({ success: true, data: [] });

  const tenant = await Tenant.findOne({ name: new RegExp('^' + escapeRegex(collegeName) + '$', 'i'), type: 'college' }).select('_id').lean();
  if (!tenant) return res.json({ success: true, data: [] });

  const resources = await TrainingResource.find({ tenantId: tenant._id, deletedAt: null }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: resources.map(r => ({
    id: String(r._id), title: r.title, url: r.url, description: r.description || '', category: r.category,
  })) });
}));

/* GET /api/dashboard/candidate/skill-recommendations — for the logged-in
   candidate, lists in-demand skills (from active jobs platform-wide) they
   don't yet have, with suggested courses to close the gap and how many
   active jobs want each skill. */
router.get('/candidate/skill-recommendations', authenticate, allowRoles('candidate'), asyncHandler(async (req, res) => {
  const candidate = await Candidate.findOne({ email: req.user.email, deletedAt: null }).select('skills').lean();

  const activeJobs = await Job.find({ status: 'active', isPublic: true, deletedAt: null }).select('skills').limit(200).lean();
  const demandCounts = new Map();
  activeJobs.forEach(j => (j.skills || []).forEach(s => {
    const key = String(s).trim();
    if (!key) return;
    demandCounts.set(key, (demandCounts.get(key) || 0) + 1);
  }));

  const candidateSkills = new Set((candidate?.skills || []).map(s => String(s).trim().toLowerCase()));
  const recommendations = [...demandCounts.entries()]
    .filter(([skill]) => !candidateSkills.has(skill.toLowerCase()))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([skill, demandCount]) => ({ skill, demandCount, courses: getCoursesForSkill(skill) }));

  res.json({ success: true, data: { currentSkills: candidate?.skills || [], recommendations } });
}));

/* GET /api/dashboard/college/students — students who registered with this college name */
router.get('/college/students', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const { q = '', type = '', dept = '', year = '' } = req.query;
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  const filter = { college: college.regex, deletedAt: null };

  const allStudents = await Candidate.find(filter)
    .select('name email phone title experience isFresher skills createdAt currentCompany location educationList certifications projects achievements')
    .sort({ createdAt: -1 }).lean();

  const currentYear = new Date().getFullYear();

  let mapped = allStudents.map(s => {
    const education = parseJsonArray(s.educationList);
    const certifications = parseJsonArray(s.certifications);
    const latestEducation = getLatestEducation(education);

    const passingYear = parseInt(latestEducation?.year, 10);
    const studentType = Number.isFinite(passingYear)
      ? (passingYear >= currentYear ? 'student' : 'alumni')
      : (s.isFresher ? 'student' : 'alumni');

    return {
      id: String(s._id),
      name: s.name || '',
      email: s.email || '',
      phone: s.phone || '',
      title: s.title || '',
      experience: s.experience ?? null,
      isFresher: !!s.isFresher,
      currentCompany: s.currentCompany || '',
      location: s.location || '',
      skills: s.skills || [],
      education,
      latestEducation: latestEducation ? {
        degree: latestEducation.degree || '',
        field: latestEducation.field || '',
        institution: latestEducation.institution || '',
        university: latestEducation.university || '',
        year: latestEducation.year || '',
        grade: latestEducation.grade || '',
      } : null,
      certifications: certifications.map(c => ({
        name: c?.name || '',
        issuer: c?.issuer || '',
        year: c?.year || '',
        url: c?.url || '',
      })),
      projects: s.projects || '',
      achievements: s.achievements || '',
      studentType,
      joinedAt: s.createdAt,
      _idObj: s._id,
    };
  });

  if (q.trim()) {
    const query = q.trim();
    mapped = mapped.filter(s =>
      searchMatches(s.name, query) ||
      searchMatches(s.email, query) ||
      searchMatches(s.phone, query) ||
      searchMatches(s.title, query) ||
      searchMatches(s.latestEducation?.degree || '', query) ||
      searchMatches(s.latestEducation?.field || '', query)
    );
  }

  if (type === 'student' || type === 'alumni') {
    mapped = mapped.filter(s => s.studentType === type);
  }

  if (dept.trim()) {
    const deptLower = dept.trim().toLowerCase();
    mapped = mapped.filter(s => {
      const name = ((s.latestEducation?.degree || s.latestEducation?.field || 'Unspecified').trim() || 'Unspecified').toLowerCase();
      return name === deptLower;
    });
  }

  if (year.trim()) {
    mapped = mapped.filter(s => String(s.latestEducation?.year || '') === year.trim());
  }

  const totalFiltered = mapped.length;
  const pageItems = mapped.slice((page - 1) * limit, (page - 1) * limit + limit);

  const ids = pageItems.map(s => s._idObj);
  const appCounts = await Application.aggregate([
    { $match: { candidateId: { $in: ids }, deletedAt: null } },
    { $group: { _id: '$candidateId', count: { $sum: 1 }, hired: { $sum: { $cond: [{ $eq: ['$currentStage', 'Hired'] }, 1, 0] } } } },
  ]);
  const countMap = new Map(appCounts.map(a => [String(a._id), a]));

  const data = pageItems.map(s => {
    const { _idObj, ...rest } = s;
    return {
      ...rest,
      applications: countMap.get(String(_idObj))?.count || 0,
      placed: (countMap.get(String(_idObj))?.hired || 0) > 0,
    };
  });

  res.json({ success: true, data, total: totalFiltered, page, pages: Math.ceil(totalFiltered / limit) || 1 });
}));

/* GET /api/dashboard/college/placements — application/placement records for this college's students */
router.get('/college/placements', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const { q = '', stage = '', company = '' } = req.query;
  const page  = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

  const candFilter = { college: college.regex, deletedAt: null };
  if (q.trim()) {
    const esc = escapeRegex(q.trim());
    candFilter.$or = [{ name: new RegExp(esc, 'i') }, { email: new RegExp(esc, 'i') }];
  }
  const candidates = await Candidate.find(candFilter).select('name email').lean();
  const candMap = new Map(candidates.map(c => [String(c._id), c]));
  const ids = candidates.map(c => c._id);

  const appFilter = { candidateId: { $in: ids }, deletedAt: null };
  if (stage) appFilter.currentStage = stage;
  if (company.trim()) {
    const esc = escapeRegex(company.trim());
    const companyJobIds = await Job.find({
      $or: [{ companyName: new RegExp(esc, 'i') }, { company: new RegExp(esc, 'i') }],
    }).distinct('_id');
    appFilter.jobId = { $in: companyJobIds };
  }

  const [apps, total] = await Promise.all([
    Application.find(appFilter)
      .populate({ path: 'jobId', select: 'title companyName' })
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Application.countDocuments(appFilter),
  ]);

  const data = apps.map(a => {
    const cand = candMap.get(String(a.candidateId)) || {};
    return {
      id: String(a._id),
      studentName: cand.name || '',
      studentEmail: cand.email || '',
      jobTitle: a.jobId?.title || '',
      company: a.jobId?.companyName || '',
      stage: a.currentStage || '',
      status: a.status || '',
      appliedAt: a.createdAt,
      collegeNotes: a.collegePlacementNotes || '',
    };
  });

  res.json({ success: true, data, total, page, pages: Math.ceil(total / limit) || 1 });
}));

/* PATCH /api/dashboard/college/placements/:id/notes — placement officer's private
   follow-up notes on one of their students' applications. Scoped to applications
   belonging to candidates registered under this college; never touches the
   employer's own pipeline (currentStage, recruiterNotes, etc.). */
router.patch('/college/placements/:id/notes', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const { notes } = req.body;
  const app = await Application.findOne({ _id: req.params.id, deletedAt: null });
  if (!app) throw new AppError('Placement record not found.', 404);

  const candidate = await Candidate.findOne({ _id: app.candidateId, college: college.regex, deletedAt: null }).select('_id').lean();
  if (!candidate) throw new AppError('Placement record not found.', 404);

  app.collegePlacementNotes = String(notes || '').slice(0, 1000);
  await app.save();

  res.json({ success: true, data: { id: String(app._id), collegeNotes: app.collegePlacementNotes } });
}));

/* POST /api/dashboard/college/students/import — bulk-create real Candidate records
   for this college from a spreadsheet, after the placement officer has manually
   mapped spreadsheet columns to candidate fields on the frontend. Each row in
   `req.body.candidates` is already a mapped object, e.g.
   { name, email, phone, title, currentCompany, location, skills, experience,
     isFresher, educationList: [{institution,degree,field,year,grade}], certifications }
   The college's own name is always used as `college` so the new candidates are
   immediately visible in this placement officer's portal and college community. */
router.post('/college/students/import', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const rows = Array.isArray(req.body.candidates) ? req.body.candidates : [];
  if (!rows.length) throw new AppError('No candidate rows provided.', 400);
  if (rows.length > 1000) throw new AppError('A maximum of 1000 candidates can be imported at once.', 400);

  const emails = rows.map(r => String(r.email || '').toLowerCase().trim()).filter(Boolean);
  const existing = await Candidate.find({ email: { $in: emails }, deletedAt: null }).select('email').lean();
  const existingEmails = new Set(existing.map(c => c.email));

  let created = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name  = String(row.name || '').trim();
    const email = String(row.email || '').toLowerCase().trim();

    if (!name || !email) {
      skipped++;
      errors.push({ row: i + 1, reason: 'Missing name or email.' });
      continue;
    }
    if (existingEmails.has(email)) {
      skipped++;
      errors.push({ row: i + 1, reason: `Candidate with email ${email} already exists.` });
      continue;
    }

    const educationList = Array.isArray(row.educationList) && row.educationList.length
      ? JSON.stringify(row.educationList.filter(e => e && (e.institution || e.degree || e.year)))
      : undefined;

    await Candidate.create({
      tenantId: req.user.tenantId,
      name,
      email,
      phone: row.phone ? String(row.phone).trim() : undefined,
      college: college.name,
      title: row.title ? String(row.title).trim() : undefined,
      skills: Array.isArray(row.skills) ? row.skills.filter(Boolean) : (row.skills ? String(row.skills).split(',').map(s => s.trim()).filter(Boolean) : []),
      experience: row.experience !== undefined && row.experience !== '' ? Number(row.experience) || 0 : undefined,
      isFresher: row.isFresher !== undefined ? !!row.isFresher : true,
      location: row.location ? String(row.location).trim() : undefined,
      currentCompany: row.currentCompany ? String(row.currentCompany).trim() : undefined,
      certifications: row.certifications ? String(row.certifications).trim() : undefined,
      ...(educationList ? { educationList } : {}),
      source: 'bulk_import',
      addedBy: req.user._id || req.user.id,
    });
    existingEmails.add(email);
    created++;
  }

  res.json({ success: true, created, skipped, errors });
}));

/* GET /api/dashboard/college/skill-gaps — compares the skills most requested
   by active job postings (platform-wide) against how many of this college's
   students currently list that skill, surfacing the biggest gaps with
   suggested courses so the placement officer can run targeted upskilling
   sessions. */
router.get('/college/skill-gaps', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const [students, activeJobs] = await Promise.all([
    Candidate.find({ college: college.regex, deletedAt: null }).select('skills').lean(),
    Job.find({ status: 'active', isPublic: true, deletedAt: null }).select('skills').limit(200).lean(),
  ]);

  const demandCounts = new Map();
  activeJobs.forEach(j => (j.skills || []).forEach(s => {
    const key = String(s).trim();
    if (!key) return;
    demandCounts.set(key, (demandCounts.get(key) || 0) + 1);
  }));

  const studentSkillCounts = new Map();
  students.forEach(s => {
    const seen = new Set((s.skills || []).map(sk => String(sk).trim().toLowerCase()));
    seen.forEach(sk => studentSkillCounts.set(sk, (studentSkillCounts.get(sk) || 0) + 1));
  });

  const totalStudents = students.length || 1;
  const gaps = [...demandCounts.entries()]
    .map(([skill, demand]) => {
      const haveCount = studentSkillCounts.get(skill.toLowerCase()) || 0;
      return {
        skill,
        demandCount: demand,
        studentsWithSkill: haveCount,
        coveragePct: Math.round((haveCount / totalStudents) * 1000) / 10,
        courses: getCoursesForSkill(skill),
      };
    })
    .sort((a, b) => (b.demandCount - b.studentsWithSkill) - (a.demandCount - a.studentsWithSkill))
    .slice(0, 12);

  res.json({ success: true, data: gaps, totalStudents: students.length });
}));

/* GET /api/dashboard/college/students/:id/skill-recommendations — for one
   student, lists in-demand skills (from active jobs platform-wide) they don't
   yet have, with suggested courses to close the gap. */
router.get('/college/students/:id/skill-recommendations', authenticate, allowRoles('admin', 'placement_officer'), asyncHandler(async (req, res) => {
  const college = await getCollegeFilter(req);
  if (!college) throw new AppError('This dashboard is only available for College/Campus accounts.', 403);

  const student = await Candidate.findOne({ _id: req.params.id, college: college.regex, deletedAt: null }).select('name skills').lean();
  if (!student) throw new AppError('Student not found.', 404);

  const activeJobs = await Job.find({ status: 'active', isPublic: true, deletedAt: null }).select('skills').limit(200).lean();
  const demandCounts = new Map();
  activeJobs.forEach(j => (j.skills || []).forEach(s => {
    const key = String(s).trim();
    if (!key) return;
    demandCounts.set(key, (demandCounts.get(key) || 0) + 1);
  }));

  const studentSkills = new Set((student.skills || []).map(s => String(s).trim().toLowerCase()));
  const recommendations = [...demandCounts.entries()]
    .filter(([skill]) => !studentSkills.has(skill.toLowerCase()))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([skill, demandCount]) => ({ skill, demandCount, courses: getCoursesForSkill(skill) }));

  res.json({ success: true, data: { studentName: student.name || '', currentSkills: student.skills || [], recommendations } });
}));

/* GET /api/dashboard/college-groups — super admin view of all "college groups".
   Every candidate is grouped by their College/School Name (or, if that's blank,
   by the institution from their latest education entry) so the platform admin
   can see which colleges/communities exist, how many students/alumni each has,
   and whether a Campus Portal (placement officer) account exists for them. */
router.get('/college-groups', authenticate, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const currentYear = new Date().getFullYear();

  const [rawCandidates, tenants] = await Promise.all([
    Candidate.find({ deletedAt: null }).select('email college educationList isFresher').lean(),
    Tenant.find({ type: 'college', deletedAt: null }).select('name').lean(),
  ]);
  const candidates = dedupeByEmail(rawCandidates);

  const tenantKeys = new Set(
    tenants.map(t => normalizeCollegeKey(t.name))
  );

  const fallback = await getEducationFallbackMap(candidates);

  const groups = new Map();
  let incompleteProfiles = 0;

  for (const c of candidates) {
    let education = parseJsonArray(c.educationList);
    let collegeName = String(c.college || '').trim().replace(/\s+/g, ' ');
    let derivedFromEducation = false;

    const fb = !collegeName && c.email ? fallback.get(c.email.toLowerCase().trim()) : null;
    if (fb) {
      if (!collegeName && fb.college) collegeName = String(fb.college).trim().replace(/\s+/g, ' ');
      if (!education.length) education = parseJsonArray(fb.educationList);
    }

    if (!collegeName) {
      const latest = getLatestEducation(education);
      if (latest?.institution) {
        collegeName = String(latest.institution).trim().replace(/\s+/g, ' ');
        derivedFromEducation = true;
      }
    }

    if (!collegeName) {
      incompleteProfiles++;
      continue;
    }

    const key = normalizeCollegeKey(collegeName);
    if (!groups.has(key)) {
      groups.set(key, {
        name: collegeName,
        totalStudents: 0,
        currentStudents: 0,
        alumni: 0,
        derivedFromEducationOnly: 0,
        hasPlacementOfficer: tenantKeys.has(key),
      });
    }
    const g = groups.get(key);
    g.totalStudents++;
    if (derivedFromEducation) g.derivedFromEducationOnly++;

    const latest = getLatestEducation(education);
    const passingYear = parseInt(latest?.year, 10);
    const isCurrentStudent = Number.isFinite(passingYear) ? passingYear >= currentYear : !!c.isFresher;
    if (isCurrentStudent) g.currentStudents++; else g.alumni++;
  }

  const data = [...groups.values()].sort((a, b) => b.totalStudents - a.totalStudents);

  res.json({ success: true, data, incompleteProfiles });
}));

/* GET /api/dashboard/college-groups/:name/candidates — super admin drill-down:
   list every candidate grouped under a given college/school name (matched the
   same way as the college-groups aggregation above — by College/School Name
   field, falling back to education history). */
router.get('/college-groups/:name/candidates', authenticate, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const name = String(req.params.name || '').trim().replace(/\s+/g, ' ');
  if (!name) throw new AppError('College name is required.', 400);

  const rawCandidates = await Candidate.find({ deletedAt: null })
    .select('name email phone college educationList isFresher currentCompany title experience location')
    .lean();
  const candidates = dedupeByEmail(rawCandidates);

  const fallback = await getEducationFallbackMap(candidates);
  const key = normalizeCollegeKey(name);
  const currentYear = new Date().getFullYear();

  const matches = candidates.filter(c => {
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

    return normalizeCollegeKey(collegeName) === key;
  }).map(c => {
    const education = parseJsonArray(c.educationList);
    const latest = getLatestEducation(education);
    const passingYear = parseInt(latest?.year, 10);
    const isCurrentStudent = Number.isFinite(passingYear) ? passingYear >= currentYear : !!c.isFresher;
    return {
      id: String(c._id),
      name: c.name,
      email: c.email,
      phone: c.phone,
      isFresher: !!c.isFresher,
      isCurrentStudent,
      title: c.title || '',
      currentCompany: c.currentCompany || '',
      experience: c.experience || 0,
      location: c.location || '',
      degree: latest?.degree || '',
      year: latest?.year || '',
    };
  });

  const total = matches.length;
  const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const skip  = (page - 1) * limit;
  const data  = matches.slice(skip, skip + limit);

  res.json({ success: true, data, total, hasMore: skip + data.length < total });
}));

/* GET /api/dashboard/company-directory?q=...
   Public, unauthenticated directory of known company names — used to power
   autocomplete for "Current Company" / "Company / Employer" fields so that
   "Acme Corp" / "acme corp " / " ACME CORP" etc. all resolve to one canonical
   entry. New names typed by candidates are simply stored on their profile and
   become part of this directory automatically. */
router.get('/company-directory', asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const companyNames = await Candidate.distinct('currentCompany', { currentCompany: { $exists: true, $ne: '' } });

  const byKey = new Map();
  companyNames.forEach(name => {
    const cleaned = normalizeCompanyName(name);
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, cleaned);
  });

  let results = [...byKey.values()];
  if (q) results = results.filter(name => name.toLowerCase().includes(q));
  results.sort((a, b) => a.localeCompare(b));

  res.json({ success: true, data: results.slice(0, 20) });
}));

/* GET /api/dashboard/company-groups — super admin view of all "company groups".
   Every candidate with a "Current Company" set is grouped by that company
   (case/whitespace-insensitive) so the platform admin can see which companies
   exist on the platform and how many candidates are currently there. */
router.get('/company-groups', authenticate, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const rawCandidates = await Candidate.find({ deletedAt: null, currentCompany: { $exists: true, $ne: '' } })
    .select('email currentCompany isFresher').lean();
  const candidates = dedupeByEmail(rawCandidates);

  const groups = new Map();
  for (const c of candidates) {
    const name = normalizeCompanyName(c.currentCompany);
    if (!name) continue;
    const key = name.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, { name, totalEmployees: 0 });
    }
    groups.get(key).totalEmployees++;
  }

  const data = [...groups.values()].sort((a, b) => b.totalEmployees - a.totalEmployees);

  res.json({ success: true, data });
}));

/* GET /api/dashboard/company-groups/:name/candidates — super admin drill-down:
   list every candidate whose "Current Company" matches the given name. */
router.get('/company-groups/:name/candidates', authenticate, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const name = String(req.params.name || '').trim().replace(/\s+/g, ' ');
  if (!name) throw new AppError('Company name is required.', 400);
  const key = name.toLowerCase();

  const rawCandidates = await Candidate.find({ deletedAt: null, currentCompany: { $exists: true, $ne: '' } })
    .select('name email phone college title experience location currentCTC expectedCTC currentCompany')
    .lean();

  const matches = dedupeByEmail(rawCandidates.filter(c => {
    const norm = normalizeCompanyName(c.currentCompany);
    return norm && norm.toLowerCase() === key;
  }));

  const allData = matches.map(c => ({
    id: String(c._id),
    name: c.name,
    email: c.email,
    phone: c.phone,
    college: c.college || '',
    title: c.title || '',
    experience: c.experience || 0,
    location: c.location || '',
    currentCTC: c.currentCTC || '',
    expectedCTC: c.expectedCTC || '',
  }));

  const total = allData.length;
  const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const skip  = (page - 1) * limit;
  const data  = allData.slice(skip, skip + limit);

  res.json({ success: true, data, total, hasMore: skip + data.length < total });
}));


// ── Admin/SuperAdmin Stats ───────────────────────────────────────────────────

/* GET /api/dashboard/stats */
router.get('/stats', authenticate, allowRoles('admin', 'super_admin'), cacheRoute(15), asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin';
  const platformWide = isSuperAdmin && req.query.platform === 'true';
  const tenantScope  = { tenantId: req.user.tenantId };
  const orgF  = platformWide ? {} : tenantScope;
  const candF = platformWide ? { role: 'candidate' } : { role: 'candidate', ...tenantScope };
  // aggF uses ObjectId for aggregation pipelines — Mongoose .find()/.countDocuments() auto-cast
  // strings, but raw .aggregate() does NOT. Without this, $match returns 0 docs for non-super_admin.
  const aggF  = platformWide ? {} : tenantFilter(req);

  const del = { deletedAt: null };
  const [candidates, recruiters, openJobs, applications, hired, pipelineAgg, recentApps, revenueAgg] = await Promise.all([
    Candidate.aggregate([
      { $match: { ...aggF, deletedAt: null } },
      { $group: { _id: { $ifNull: ['$userId', { $ifNull: [{ $toLower: '$email' }, '$_id'] }] } } },
      { $count: 'total' },
    ]).then(r => r[0]?.total || 0),
    User.countDocuments({ ...orgF, role: 'recruiter', isActive: true }),
    Job.countDocuments({ ...orgF, status: 'active', ...del }),
    (async () => {
      const [apps, imps] = await Promise.all([
        Application.countDocuments({ ...orgF, ...del }),
        ImportedCandidate.countDocuments({ ...orgF })
      ]);
      return apps + imps;
    })(),
    Application.countDocuments({ ...orgF, currentStage: 'Hired', ...del }),
    Application.aggregate([
      { $match: { ...aggF, ...del } },
      { $group: { _id: '$currentStage', count: { $sum: 1 } } }
    ]),
    Application.find({ ...orgF, ...del })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate(JOB_APPLICANT_POPULATE)
      .populate(CANDIDATE_APPLICANT_POPULATE)
      .lean(),
    PaymentRecord.aggregate([
      { $match: { ...aggF, status: 'captured' } },
      { $group: { _id: null, total: { $sum: '$amountINR' } } }
    ])
  ]);

  const pipeline = {};
  pipelineAgg.forEach(r => { pipeline[r._id || 'Applied'] = r.count; });

  const avgPerJob = openJobs > 0 ? parseFloat((applications / openJobs).toFixed(1)) : 0;
  const active    = await Application.countDocuments({ ...orgF, ...del, currentStage: { $in: STAGES_ACTIVE } });

  const ago30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [candNew, recNew, appsLast30, hiredLast30, candOld, appsOld, hiredOld, jobsOld, totalJobs] = await Promise.all([
    User.countDocuments({ ...candF, isActive: true, createdAt: { $gte: ago30 } }),
    User.countDocuments({ ...orgF, role: 'recruiter', isActive: true, createdAt: { $gte: ago30 } }),
    Application.countDocuments({ ...orgF, ...del, createdAt: { $gte: ago30 } }),
    Application.countDocuments({ ...orgF, ...del, currentStage: 'Hired', updatedAt: { $gte: ago30 } }),
    User.countDocuments({ ...candF, isActive: true, createdAt: { $lt: ago30 } }),
    Application.countDocuments({ ...orgF, ...del, createdAt: { $lt: ago30 } }),
    Application.countDocuments({ ...orgF, ...del, currentStage: 'Hired', updatedAt: { $lt: ago30 } }),
    Job.countDocuments({ ...orgF, ...del, status: 'active', createdAt: { $lt: ago30 } }),
    Job.countDocuments({ ...orgF, ...del, status: { $in: ['active', 'closed'] } }),
  ]);

  // Fill rate = % of active/closed jobs that have at least one hire
  // Use distinct jobIds from hired apps vs total jobs
  const hiredJobIds = hired > 0
    ? await Application.distinct('jobId', { ...orgF, currentStage: 'Hired', ...del })
    : [];
  const fillRate = totalJobs > 0 ? parseFloat(((hiredJobIds.length / totalJobs) * 100).toFixed(1)) : 0;

  const pct = (n, o) => o > 0 ? Math.round(((n - o) / o) * 100) : (n > 0 ? 100 : 0);

  res.json({ success: true, data: {
    candidates, recruiters, openJobs, totalJobs, applications,
    placements: hired, fillRate, avgPerJob,
    activePipeline: active,
    appsLast30,
    placementsLast30: hiredLast30,
    platformWide,
    pipeline,
    revenue: revenueAgg[0]?.total || 0,
    recent: await resolveRecentNames(recentApps),
    subtitle: `${active} candidates actively in pipeline`,
    changes: {
      candidates : pct(candNew, candOld),
      recruiters : recNew,
      openJobs   : openJobs - jobsOld,
      applications: appsLast30,   // actual count, not percentage
      placements : hiredLast30,
      fillRate   : fillRate,
    },
  }});
}));

/* GET /api/dashboard/recruiter-stats
 * Lightweight stats endpoint for recruiter dashboard.
 * Returns KPIs and recent activity via aggregation — no raw record dumps.
 * Replaces limit:10000000 job + application fetches on RecruiterDashboard.
 */
router.get('/recruiter-stats', authenticate, allowRoles('recruiter'), cacheRoute(30), asyncHandler(async (req, res) => {
  const tid  = req.user.tenantId;
  const uid  = req.user._id || req.user.id;
  const del  = { deletedAt: null };
  const ago30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Step 1: Get recruiter's assigned jobs (fast — indexed on tenantId+assignedRecruiters)
  // Select applicationCount (real field name on model; normalizeJob maps it to applicantsCount)
  const myJobs = await Job.find({ tenantId: tid, assignedRecruiters: uid, ...del })
    .select('_id title company companyName location status applicationCount urgency')
    .lean();

  const jobIds = myJobs.map(j => j._id);

  // No jobs yet — return zeroed stats immediately
  if (jobIds.length === 0) {
    return res.json({ success: true, data: {
      totalApplicants: 0, inInterview: 0, hired: 0, offerOut: 0, rejected: 0,
      openJobs: 0, appsLast30: 0, hiredLast30: 0, conversionRate: 0,
      pipeline: {}, recent: [], jobs: [],
    }});
  }

  const appFilter = { jobId: { $in: jobIds }, ...del };

  // 14-day window for application velocity trend (in IST)
  const TZ14 = 'Asia/Kolkata';
  const cutoff14 = new Date();
  cutoff14.setDate(cutoff14.getDate() - 14);
  cutoff14.setHours(0, 0, 0, 0);

  // Step 2: All counts in parallel — pipeline, per-job, trends, recent activity
  // Daily queue time windows
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);
  const in3days    = new Date(Date.now() + 3 * 86400000);

  const [pipelineAgg, perJobAgg, appsLast30, hiredLast30, recent, interestedInvites, trendAgg,
    todayInterviewCount, newAppsCount, offersOutCount, expiringJobsCount] = await Promise.all([
    // Stage breakdown (pipeline funnel)
    Application.aggregate([
      { $match: appFilter },
      { $group: { _id: '$currentStage', count: { $sum: 1 } } },
    ]),
    // Per-job application counts (accurate from Application collection, not stale Job.applicationCount)
    Application.aggregate([
      { $match: { ...appFilter, status: { $ne: 'withdrawn' } } },
      { $group: { _id: '$jobId', count: { $sum: 1 } } },
    ]),
    Application.countDocuments({ ...appFilter, createdAt: { $gte: ago30 } }),
    Application.countDocuments({ ...appFilter, currentStage: 'Hired', updatedAt: { $gte: ago30 } }),
    Application.find(appFilter)
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate('jobId', 'title company companyName')
      .populate('candidateId', 'name email title')
      .lean(),
    Application.countDocuments({ jobId: { $in: jobIds }, inviteStatus: 'interested', ...del }),
    // 14-day application velocity trend scoped to recruiter's jobs
    Application.aggregate([
      { $match: { ...appFilter, createdAt: { $gte: cutoff14 } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ14 } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    // Daily queue: interviews scheduled today
    Application.countDocuments({
      ...appFilter,
      currentStage: { $in: ['Interview Round 1', 'Interview Round 2', 'Technical Interview'] },
      'interviewRounds.scheduledAt': { $gte: todayStart, $lte: todayEnd },
    }),
    // Daily queue: new unreviewed applications (still in Applied stage)
    Application.countDocuments({ ...appFilter, currentStage: 'Applied' }),
    // Daily queue: offers waiting for candidate response
    Application.countDocuments({ ...appFilter, currentStage: 'Offer' }),
    // Daily queue: jobs with application deadline in next 3 days
    Job.countDocuments({
      _id: { $in: jobIds },
      status: 'active',
      applicationDeadline: { $gte: todayStart, $lte: in3days },
      ...del,
    }),
  ]);

  // Build per-job count map
  const perJobMap = {};
  perJobAgg.forEach(r => { perJobMap[String(r._id)] = r.count; });

  // Build pipeline map
  const pipeline = {};
  let total = 0;
  pipelineAgg.forEach(p => { pipeline[p._id || 'Applied'] = p.count; total += p.count; });

  const hired    = pipeline['Hired']    || 0;
  const offerOut = pipeline['Offer']    || 0;
  const rejected = pipeline['Rejected'] || 0;
  const inInterview = (pipeline['Interview Round 1'] || 0) + (pipeline['Interview Round 2'] || 0);
  const conversionRate = total > 0 ? Math.round((hired / total) * 100) : 0;

  // Build 14-day trend array (same format as /dashboard/trends)
  const trendMap = {};
  trendAgg.forEach(r => { trendMap[r._id] = r.count; });
  const trendData = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key   = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });
    trendData.push({ date: key, label, value: trendMap[key] || 0 });
  }

  res.json({ success: true, data: {
    totalApplicants : total,
    inInterview,
    hired,
    offerOut,
    rejected,
    openJobs        : myJobs.filter(j => j.status === 'active').length,
    appsLast30,
    hiredLast30,
    conversionRate,
    interestedInvites,
    pipeline,
    recent: await resolveRecentNames(recent),
    trendData, // 14-day application velocity scoped to recruiter's jobs
    // Normalise job objects: add applicantsCount (frontend name) from real aggregation
    jobs: myJobs.map(j => ({
      ...j,
      id            : j._id.toString(),
      applicantsCount: perJobMap[j._id.toString()] ?? j.applicationCount ?? 0,
    })),
    // Daily action queue — shown as a top-of-dashboard "what to do today" widget
    dailyQueue: {
      todayInterviews : todayInterviewCount,
      newApplications : newAppsCount,
      offersOut       : offersOutCount,
      expiringJobs    : expiringJobsCount,
    },
  }});
}));

/* GET /api/dashboard/pipeline-health */
router.get('/pipeline-health', authenticate, allowRoles('admin', 'super_admin'), cacheRoute(15), asyncHandler(async (req, res) => {
  const orgF  = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };
  const stages = ['Applied', 'Screening', 'Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired'];

  // Compute stage counts AND avg time-to-hire in one aggregation
  const [stageAgg, timeAgg] = await Promise.all([
    Application.aggregate([
      { $match: { ...orgF, deletedAt: null } },
      { $group: { _id: '$currentStage', count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { ...orgF, currentStage: 'Hired', deletedAt: null } },
      {
        $project: {
          daysToHire: {
            $divide: [
              { $subtract: [
                { $ifNull: [{ $arrayElemAt: [{ $filter: { input: '$stageHistory', as: 'h', cond: { $eq: ['$$h.stage', 'selected'] } } }, -1] }, '$updatedAt'] },
                '$createdAt',
              ]},
              86400000,
            ],
          },
        },
      },
      { $group: { _id: null, avg: { $avg: '$daysToHire' }, count: { $sum: 1 } } },
    ]),
  ]);

  const m = {};
  stageAgg.forEach(r => { m[r._id] = r.count; });

  const stageData = stages.map((s, i) => {
    const count = m[s] || 0;
    const prev  = i > 0 ? (m[stages[i - 1]] || 0) : null;
    return {
      key: s, stage: s, count,
      conversionFromPrev: (prev && prev > 0) ? `${Math.round((count / prev) * 100)}%` : null,
    };
  });

  const rejected  = m['Rejected'] || 0;
  const avgDays   = timeAgg[0]?.count > 0 ? Math.round(timeAgg[0].avg || 0) : 0;
  const offerApps = m['Offer'] || 0;
  const offerRate = offerApps > 0 ? Math.round(((m['Hired'] || 0) / offerApps) * 100) : 82;

  res.json({ success: true, data: {
    stages: stageData,
    summary: { rejected, avgTimeToHire: avgDays || 12, offerAcceptRate: offerRate },
  }});
}));

/* GET /api/dashboard/recruiter-leaderboard
   Shows ONLY active, non-deleted recruiters (not admins).
   Uses per-recruiter job lookup — same pattern as recruiter-performance which is accurate.
*/
router.get('/recruiter-leaderboard', authenticate, allowRoles('admin', 'super_admin'), cacheRoute(15), asyncHandler(async (req, res) => {
  const tf   = tenantFilter(req); // ObjectId-safe filter for aggregations
  const orgF = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };

  // Only active, non-deleted recruiters (excludes admins — they are not recruiters)
  const recruiters = await User.find({
    ...orgF,
    role: 'recruiter',
    isActive: true,
    deletedAt: null,
  }).select('_id name photoUrl').lean();

  if (!recruiters.length) return res.json({ success: true, data: [] });

  // Per-recruiter stats — same approach as /recruiter-performance (proven accurate)
  // Only count active/closed jobs (not draft/pending_approval seeded jobs with no applicants)
  const board = await Promise.all(recruiters.map(async (r) => {
    const myJobIds = (await Job.find({
      assignedRecruiters: r._id,
      ...(req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId }),
      status: { $in: ['active', 'closed'] },
      deletedAt: null,
    }).select('_id').lean()).map(j => j._id);

    const [candidates, hired] = await Promise.all([
      Application.countDocuments({ jobId: { $in: myJobIds }, deletedAt: null }),
      Application.countDocuments({ jobId: { $in: myJobIds }, deletedAt: null, currentStage: 'Hired' }),
    ]);

    return {
      rank       : 0,
      recruiterId: r._id,
      name       : r.name,
      photoUrl   : r.photoUrl,
      jobs       : myJobIds.length,
      candidates,
      hired,
      conversion : candidates > 0 ? `${Math.round((hired / candidates) * 100)}%` : '0%',
    };
  }));

  board.sort((a, b) => b.hired - a.hired || b.candidates - a.candidates);
  board.forEach((r, i) => r.rank = i + 1);
  res.json({ success: true, data: board });
}));

/* GET /api/dashboard/top-skills */
router.get('/top-skills', authenticate, allowRoles('admin', 'super_admin'), cacheRoute(30), asyncHandler(async (req, res) => {
  const match = req.user.role === 'super_admin'
    ? { role: 'candidate', skills: { $exists: true, $ne: [] } }
    : { role: 'candidate', tenantId: req.user.tenantId, skills: { $exists: true, $ne: [] } };
  const result = await User.aggregate([
    { $match: match }, { $unwind: '$skills' },
    { $group: { _id: '$skills', count: { $sum: 1 } } },
    { $sort: { count: -1 } }, { $limit: 10 },
    { $project: { _id: 0, skill: '$_id', count: 1 } },
  ]);
  res.json({ success: true, data: result });
}));

/* GET /api/dashboard/availability-pool */
router.get('/availability-pool', authenticate, allowRoles('admin', 'super_admin'), cacheRoute(30), asyncHandler(async (req, res) => {
  const base = req.user.role === 'super_admin' ? { role: 'candidate' } : { role: 'candidate', tenantId: req.user.tenantId };
  const [total, raw] = await Promise.all([
    User.countDocuments(base),
    User.aggregate([{ $match: base }, { $group: { _id: '$availability', count: { $sum: 1 } } }]),
  ]);
  const p = { immediate: 0, two_weeks: 0, one_month: 0, not_looking: 0 };
  raw.forEach(r => { if (r._id && p[r._id] !== undefined) p[r._id] = r.count; });
  const pct = n => total > 0 ? Math.round((n / total) * 100) : 0;
  res.json({ success: true, data: {
    immediate  : { count: p.immediate,   percentage: pct(p.immediate),   label: 'Now' },
    two_weeks  : { count: p.two_weeks,   percentage: pct(p.two_weeks),   label: '2 weeks' },
    one_month  : { count: p.one_month,   percentage: pct(p.one_month),   label: '1 month' },
    not_looking: { count: p.not_looking, percentage: pct(p.not_looking), label: 'Not looking' },
    total,
  }});
}));

/* GET /api/dashboard/jobs-breakdown */
router.get('/jobs-breakdown', authenticate, allowRoles('admin', 'super_admin'), cacheRoute(15), asyncHandler(async (req, res) => {
  const match = req.user.role === 'super_admin' ? { status: 'active' } : { tenantId: req.user.tenantId, status: 'active' };
  const raw = await Job.aggregate([{ $match: match }, { $group: { _id: '$urgency', count: { $sum: 1 } } }]);
  const map = { high: 0, medium: 0, low: 0 };
  raw.forEach(r => { if (r._id && map[r._id] !== undefined) map[r._id] = r.count; });
  res.json({ success: true, data: { byUrgency: Object.entries(map).map(([urgency, count]) => ({ urgency, count })) } });
}));

/* GET /api/dashboard/analytics */
router.get('/analytics', authenticate, allowRoles('admin', 'super_admin'), cacheRoute(15), asyncHandler(async (req, res) => {
  const platformWide = req.user.role === 'super_admin' && req.query.platform === 'true';
  const orgF  = platformWide ? {} : { tenantId: req.user.tenantId };
  // aggF uses ObjectId for aggregation — raw $match does not auto-cast strings to ObjectId
  const aggF  = platformWide ? {} : tenantFilter(req);
  const { startDate, endDate } = req.query;
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate)   dateFilter.$lte = new Date(endDate);
  const dateF = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

  const del = { deletedAt: null };
  const [totalApps, hiredApps, rejectedApps, byStage, bySource, topJobs, timeAgg, revenueAgg] = await Promise.all([
    Application.countDocuments({ ...orgF, ...dateF, ...del }),
    Application.countDocuments({ ...orgF, ...dateF, ...del, currentStage: 'Hired' }),
    Application.countDocuments({ ...orgF, ...dateF, ...del, currentStage: 'Rejected' }),
    Application.aggregate([
      { $match: { ...aggF, ...dateF, ...del } },
      { $group: { _id: '$currentStage', count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { ...aggF, ...dateF, ...del } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Application.aggregate([
      { $match: { ...aggF, ...dateF, ...del } },
      { $group: { _id: '$jobId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 10 },
      { $lookup: { from: 'jobs', localField: '_id', foreignField: '_id', as: 'job' } },
      { $unwind: '$job' },
      { $project: { title: '$job.title', count: 1 } },
    ]),
    Application.aggregate([
      { $match: { ...aggF, ...del, currentStage: 'Hired' } },
      { $project: {
          daysToHire: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 86400000] },
        },
      },
      { $group: { _id: null, avg: { $avg: '$daysToHire' }, count: { $sum: 1 } } },
    ]),
    PaymentRecord.aggregate([
      { $match: { ...aggF, ...dateF, status: 'captured' } },
      { $group: { _id: null, total: { $sum: '$amountINR' } } }
    ]),
  ]);

  const avgTimeToHire = timeAgg[0]?.count > 0 ? Math.round(timeAgg[0].avg || 0) : 0;
  const revenue       = revenueAgg[0]?.total || 0;

  res.json({ success: true, data: {
    overview: {
      totalApplications: totalApps,
      hired: hiredApps,
      rejected: rejectedApps,
      inProgress: totalApps - hiredApps - rejectedApps,
      conversionRate: totalApps > 0 ? Math.round((hiredApps / totalApps) * 100) : 0,
      avgTimeToHire,
      revenue,
    },
    byStage: byStage.map(s => ({ stage: s._id, count: s.count })),
    bySource: bySource.map(s => ({ source: s._id || 'direct', count: s.count })),
    topJobs: topJobs.map(j => ({ jobId: j._id, title: j.title, applications: j.count })),
  }});
}));

/* GET /api/dashboard/trends
   Application counts per day — 30-day window in IST so seeded/older orgs show data.
   Falls back to all-time if the last 30 days are all zero (demo/seeded orgs).
*/
router.get('/trends', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const orgF = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };
  // aggF uses ObjectId for aggregation — raw $match does not auto-cast strings to ObjectId
  const aggF = req.user.role === 'super_admin' ? {} : tenantFilter(req);
  const WINDOW = 30;
  const TZ = 'Asia/Kolkata';

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - WINDOW);
  cutoff.setHours(0, 0, 0, 0);

  const raw = await Application.aggregate([
    { $match: { ...aggF, createdAt: { $gte: cutoff }, deletedAt: null } },
    { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } },
        count: { $sum: 1 },
    }},
    { $sort: { _id: 1 } },
  ]);

  const map = {};
  raw.forEach(r => { map[r._id] = r.count; });

  // If all 30 days are zero, fall back to the last 30 days with actual data
  const hasData = raw.length > 0;
  let data = [];

  if (!hasData) {
    // Find the most recent applications and show their week
    const recent = await Application.find({ ...orgF }).sort({ createdAt: -1 }).limit(200).lean();
    if (recent.length > 0) {
      // Group by day across the available data
      const dayMap = {};
      recent.forEach(a => {
        const istDate = new Date(a.createdAt).toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-MM-DD
        dayMap[istDate] = (dayMap[istDate] || 0) + 1;
      });
      const sortedDays = Object.keys(dayMap).sort();
      data = sortedDays.slice(-WINDOW).map(key => ({
        date: key,
        label: new Date(key + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: dayMap[key] || 0,
      }));
    }
  }

  if (!data.length) {
    // Build the standard 30-day window (will show zeros if no data)
    for (let i = WINDOW - 1; i >= 0; i--) {
      const istNow = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
      istNow.setDate(istNow.getDate() - i);
      const key = `${istNow.getFullYear()}-${String(istNow.getMonth() + 1).padStart(2, '0')}-${String(istNow.getDate()).padStart(2, '0')}`;
      data.push({
        date: key,
        label: istNow.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: map[key] || 0,
      });
    }
  }

  res.json({ success: true, data });
}));

/* GET /api/dashboard/candidate-records
   Joined super-admin/admin view of every candidate account/profile/application.
*/
router.get('/candidate-records', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const rawLimit = parseInt(req.query.limit, 10);
  const maxPageSize = 10000000;
  const limit = Math.min(maxPageSize, Math.max(1, rawLimit || 50));
  const skip = (page - 1) * limit;
  const search = String(req.query.search || '').trim();
  const appliedOnly    = req.query.appliedOnly === 'true';
  const registeredOnly = req.query.registeredOnly === 'true'; // only candidates with a linked platform account

  // For appliedOnly, pre-fetch candidate IDs that have at least one application
  let appliedCandidateIds = null;
  if (appliedOnly) {
    appliedCandidateIds = await Application.distinct('candidateId', { deletedAt: null, ...tf });
  }

  const baseMatch = { ...tf, deletedAt: null };
  if (req.query.collegeId && req.user.role === 'super_admin' && mongoose.Types.ObjectId.isValid(req.query.collegeId)) {
    baseMatch.tenantId = new mongoose.Types.ObjectId(req.query.collegeId);
  }
  if (appliedCandidateIds) baseMatch._id = { $in: appliedCandidateIds };
  if (registeredOnly) {
    // Match candidates that are linked to a platform User — either via userId field
    // OR via email match (for existing candidates created before userId backfill was added).
    const candidateUserEmails = await User.find({ role: 'candidate', ...tf })
      .select('email _id').lean();
    const registeredEmails = candidateUserEmails.map(u => u.email.toLowerCase());
    const registeredUserIds = candidateUserEmails.map(u => u._id);
    if (registeredEmails.length === 0) {
      baseMatch._id = { $in: [] }; // no registered candidates
    } else {
      baseMatch.$or = [
        { userId: { $in: registeredUserIds } },
        { email: { $in: registeredEmails } },
      ];
    }
  }

  const pipeline = [
    { $match: baseMatch },
    { $sort: { updatedAt: -1 } },
    {
      $group: {
        _id: { $ifNull: ["$userId", { $ifNull: [{ $toLower: "$email" }, "$_id"] }] },
        primary: { $first: "$$ROOT" },
        allCandidateIds: { $push: "$_id" }
      }
    },
    { $replaceRoot: { newRoot: { $mergeObjects: ["$primary", { allCandidateIds: "$allCandidateIds" }] } } },
    { $sort: { createdAt: -1 } },
    {
      $facet: {
        metadata: [{ $count: "total" }],
        data: [
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: 'users',
              localField: 'userId',
              foreignField: '_id',
              as: 'userDetails'
            }
          },
          {
            $lookup: {
              from: 'applications',
              let: { candEmail: '$email', candIds: '$allCandidateIds' },
              pipeline: [
                {
                  $lookup: {
                    from: 'candidates',
                    localField: 'candidateId',
                    foreignField: '_id',
                    as: 'candInfo'
                  }
                },
                { $unwind: { path: '$candInfo', preserveNullAndEmptyArrays: true } },
                {
                  $match: {
                    $expr: {
                      $or: [
                        { $in: ['$candidateId', '$$candIds'] },
                        { $and: [
                          { $ne: ['$$candEmail', null] },
                          { $eq: ['$candInfo.email', '$$candEmail'] }
                        ]}
                      ]
                    },
                    deletedAt: null
                  }
                },
                { $sort: { createdAt: -1 } },
                { $lookup: { from: 'jobs', localField: 'jobId', foreignField: '_id', as: 'job' } },
                { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } }
              ],
              as: 'apps'
            }
          }
        ]
      }
    }
  ];

  if (search) {
    const searchRe = { $regex: search, $options: 'i' };
    const phoneRe = phoneSearchRegex(search);
    pipeline.unshift({
      $match: {
        $or: [
          { name: searchRe },
          { email: searchRe },
          { phone: searchRe },
          ...(phoneRe ? [{ phone: phoneRe }] : []),
          { title: searchRe }
        ]
      }
    });
  }

  const [result, tenantMap] = await Promise.all([
    Candidate.aggregate(pipeline),
    orgNameMap()
  ]);

  const total = result[0].metadata[0]?.total || 0;
  const candidates = result[0].data;

  const rows = candidates.map(cand => {
    const user = cand.userDetails?.[0] || {};
    const latestApp = cand.apps?.[0] || null;
    
    const row = profileRow({
      candidate: cand,
      user,
      app: latestApp,
      job: latestApp?.job || null,
      orgName: tenantMap[String(cand.tenantId)] || tenantMap[String(latestApp?.tenantId)] || '',
    });

    row.applicationCount = cand.apps.length;
    row.allApplications = cand.apps.map(a => ({
      id: a._id?.toString(),
      jobId: a.jobId?.toString(),
      jobTitle: a.job?.title || 'Unknown Job',
      stage: a.currentStage,
      status: a.status,
      appliedAt: a.createdAt,
      updatedAt: a.updatedAt,
      rejectionReason: a.rejectionReason,
      stageHistory: a.stageHistory,
    }));
    
    return row;
  });

  res.json({ 
    success: true, 
    data: rows, 
    pagination: { page, limit, total, pages: Math.ceil(total / limit) } 
  });
}));

/* GET /api/dashboard/applicants/summary
   Fast aggregation — stage counts + total for current filters. No row data returned.
   Called once per filter change; page navigation reuses these counts.
*/
async function buildSearchFilter(req, filter) {
  const search = String(req.query.search || '').trim().toLowerCase();
  if (!search) return filter;
  const searchRe = { $regex: search, $options: 'i' };
  const phoneRe = phoneSearchRegex(search);
  const candFilter = { ...tenantFilter(req), deletedAt: null };
  candFilter.$or = [{ name: searchRe }, { email: searchRe }, { phone: searchRe }, ...(phoneRe ? [{ phone: phoneRe }] : [])];
  const matchingCandidates = await Candidate.find(candFilter).select('_id').lean();
  filter.$or = [
    { candidateId: { $in: matchingCandidates.map(c => c._id) } },
    { candidateName: searchRe }, { candidateEmail: searchRe },
    { candidatePhone: searchRe }, { email: searchRe },
    ...(phoneRe ? [{ candidatePhone: phoneRe }] : []),
  ];
  return filter;
}

router.get('/applicants/summary', authenticate, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const filter = await buildApplicationFilters(req);
  await buildSearchFilter(req, filter);
  const [total, stageBuckets] = await Promise.all([
    Application.countDocuments(filter),
    Application.aggregate([
      { $match: filter },
      { $group: { _id: '$currentStage', count: { $sum: 1 } } },
    ]),
  ]);
  const stageCounts = Object.fromEntries(stageBuckets.map(b => [b._id || '', b.count]));
  res.json({ success: true, total, stageCounts });
}));

/* GET /api/dashboard/applicants
   Returns one page of applicant rows (default 100/page). All records reachable via pagination.
*/
router.get('/applicants', authenticate, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const PAGE_SIZE = 100;
  const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || PAGE_SIZE, 500); // max 500/page — prevents OOM
  const skip  = (page - 1) * limit;

  const filter = await buildApplicationFilters(req);
  await buildSearchFilter(req, filter);

  const [apps, total, tenantMap] = await Promise.all([
    Application.find(filter)
      .populate({
        path    : 'jobId',
        select  : 'title company companyName location tenantId department jobType salaryMin salaryMax salaryCurrency salaryType assignedRecruiters',
        populate: { path: 'assignedRecruiters', select: 'name email' },
      })
      .populate(CANDIDATE_APPLICANT_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Application.countDocuments(filter),
    orgNameMap(),
  ]);

  // Fallback: look up User account for apps where candidateId wasn't populated OR
  // where the populated Candidate record has no name (e.g. manually-added/invited candidates)
  const appsNeedingFallback = apps.filter(a => !a.candidateId?._id || !a.candidateId?.name);
  const fallbackEmails  = [...new Set(appsNeedingFallback.map(a => (a.candidateId?.email || a.email)).filter(Boolean).map(e => e.toLowerCase()))];
  const fallbackUserIds = [...new Set(appsNeedingFallback.map(a => a.candidateId?.userId?.toString()).filter(Boolean))];
  const [fallbackByEmail, fallbackById] = await Promise.all([
    fallbackEmails.length  ? User.find({ email: { $in: fallbackEmails } }).select('name email phone tenantId').lean()  : [],
    fallbackUserIds.length ? User.find({ _id:   { $in: fallbackUserIds } }).select('name email phone tenantId').lean() : [],
  ]);
  const usersByEmail  = new Map([...fallbackByEmail, ...fallbackById].map(u => [u.email?.toLowerCase(), u]));
  const usersById     = new Map(fallbackById.map(u => [String(u._id), u]));

  const rows = apps.map(app => {
    const candidate = app.candidateId && typeof app.candidateId === 'object' ? app.candidateId : {};
    const job       = app.jobId       && typeof app.jobId       === 'object' ? app.jobId       : {};
    const user =
      usersById.get(candidate.userId?.toString()) ||
      usersByEmail.get((candidate.email || app.email || '').toLowerCase()) ||
      {};
    return profileRow({
      candidate,
      user,
      app,
      job,
      orgName: tenantMap[String(app.tenantId)] || tenantMap[String(job.tenantId)] || '',
    });
  });

  res.json({
    success   : true,
    data      : rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}));

/* GET /api/dashboard/applicants/export */
router.get('/applicants/export', authenticate, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const filter = await buildApplicationFilters(req);
  const search = String(req.query.search || '').trim().toLowerCase();
  const [apps, tenantMap] = await Promise.all([
    Application.find(filter)
      .populate(CANDIDATE_APPLICANT_POPULATE)
      .populate(JOB_APPLICANT_POPULATE)
      .sort({ createdAt: -1 })
      .lean(),
    orgNameMap(),
  ]);

  const appsNeedingFallbackExp = apps.filter(a => !a.candidateId?._id || !a.candidateId?.name);
  const fallbackEmailsExp  = [...new Set(appsNeedingFallbackExp.map(a => (a.candidateId?.email || a.email)).filter(Boolean).map(e => e.toLowerCase()))];
  const fallbackUserIdsExp = [...new Set(appsNeedingFallbackExp.map(a => a.candidateId?.userId?.toString()).filter(Boolean))];
  const [fallbackByEmailExp, fallbackByIdExp] = await Promise.all([
    fallbackEmailsExp.length  ? User.find({ email: { $in: fallbackEmailsExp  } }).select('-password -passwordHash').lean() : [],
    fallbackUserIdsExp.length ? User.find({ _id:   { $in: fallbackUserIdsExp } }).select('-password -passwordHash').lean() : [],
  ]);
  const usersByEmailExp = new Map([...fallbackByEmailExp, ...fallbackByIdExp].map(u => [u.email?.toLowerCase(), u]));
  const usersByIdExp    = new Map(fallbackByIdExp.map(u => [String(u._id), u]));

  let rows = apps.map(app => {
    const candidate = app.candidateId && typeof app.candidateId === 'object' ? app.candidateId : {};
    const job = app.jobId && typeof app.jobId === 'object' ? app.jobId : {};
    const user =
      usersByIdExp.get(candidate.userId?.toString()) ||
      usersByEmailExp.get((candidate.email || app.email || '').toLowerCase()) ||
      {};
    return profileRow({
      candidate,
      user,
      app,
      job,
      orgName: tenantMap[String(app.tenantId)] || tenantMap[String(job.tenantId)] || '',
    });
  });

  if (search) {
    rows = rows.filter(r => [r.candidateName, r.email, r.phone, r.jobTitle, r.jobCompany, r.organisation, r.stage, r.source, r.skills, r.currentCompany].some(v => String(v || '').toLowerCase().includes(search)));
  }

  rows = rows.map(r => ({
    ...r,
    appliedAt: fmtDate(r.appliedAt),
    joinedAt: fmtDate(r.joinedAt),
    profileCreatedAt: fmtDate(r.profileCreatedAt),
    lastUpdatedAt: fmtDate(r.lastUpdatedAt),
    latestInterviewAt: fmtDate(r.latestInterviewAt),
  }));

  const columns = [
    { header: 'Application ID', key: 'applicationId', width: 28 },
    { header: 'Candidate ID', key: 'candidateId', width: 28 },
    { header: 'User ID', key: 'userId', width: 28 },
    { header: 'Applicant Name', key: 'candidateName', width: 24 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Mobile Number', key: 'phone', width: 18 },
    { header: 'Applied Organisation', key: 'organisation', width: 24 },
    { header: 'Job Applied For', key: 'jobTitle', width: 32 },
    { header: 'Hiring Company', key: 'jobCompany', width: 24 },
    { header: 'Job Location', key: 'jobLocation', width: 20 },
    { header: 'Job Department', key: 'jobDepartment', width: 20 },
    { header: 'Job Type', key: 'jobType', width: 16 },
    { header: 'Salary Min', key: 'salaryMin', width: 14 },
    { header: 'Salary Max', key: 'salaryMax', width: 14 },
    { header: 'Salary Currency', key: 'salaryCurrency', width: 16 },
    { header: 'Salary Type', key: 'salaryType', width: 16 },
    { header: 'Assigned Recruiters', key: 'assignedRecruiters', width: 32 },
    { header: 'Current Stage', key: 'stage', width: 18 },
    { header: 'Application Status', key: 'status', width: 18 },
    { header: 'Application Source', key: 'source', width: 18 },
    { header: 'AI Match Score', key: 'aiMatchScore', width: 15 },
    { header: 'Skill Score', key: 'skillScore', width: 14 },
    { header: 'Experience Score', key: 'experienceScore', width: 18 },
    { header: 'Location Score', key: 'locationScore', width: 16 },
    { header: 'Notice Score', key: 'noticeScore', width: 14 },
    { header: 'Assessment Score', key: 'assessmentScore', width: 18 },
    { header: 'Assessment Violations', key: 'assessmentViolations', width: 22 },
    { header: 'Tags', key: 'tags', width: 24 },
    { header: 'Invite Status', key: 'inviteStatus', width: 16 },
    { header: 'Applied Date', key: 'appliedAt', width: 16 },
    { header: 'Candidate Title', key: 'title', width: 24 },
    { header: 'Current Company', key: 'currentCompany', width: 24 },
    { header: 'Candidate Location', key: 'location', width: 22 },
    { header: 'Preferred Location', key: 'preferredLocation', width: 22 },
    { header: 'Skills', key: 'skills', width: 42 },
    { header: 'Experience Years', key: 'experience', width: 16 },
    { header: 'Relevant Experience', key: 'relevantExperience', width: 22 },
    { header: 'Current CTC', key: 'currentCTC', width: 16 },
    { header: 'Expected CTC', key: 'expectedCTC', width: 16 },
    { header: 'Availability', key: 'availability', width: 18 },
    { header: 'Notice Period Days', key: 'noticePeriodDays', width: 18 },
    { header: 'Candidate Status', key: 'candidateStatus', width: 18 },
    { header: 'Certifications', key: 'certifications', width: 30 },
    { header: 'LinkedIn', key: 'linkedinUrl', width: 34 },
    { header: 'Resume URL', key: 'resumeUrl', width: 34 },
    { header: 'Video Resume URL', key: 'videoResumeUrl', width: 34 },
    { header: 'Joined Account Date', key: 'joinedAt', width: 18 },
    { header: 'Candidate Profile Created', key: 'profileCreatedAt', width: 22 },
    { header: 'Last Updated', key: 'lastUpdatedAt', width: 18 },
    { header: 'Client', key: 'client', width: 20 },
    { header: 'TA', key: 'ta', width: 18 },
    { header: 'Client SPOC', key: 'clientSpoc', width: 20 },
    { header: 'Screening Answers', key: 'screeningAnswers', width: 50 },
    { header: 'Invite Message', key: 'inviteMessage', width: 45 },
    { header: 'Rejection Reason', key: 'rejectionReason', width: 32 },
    { header: 'Interview Count', key: 'interviewCount', width: 16 },
    { header: 'Latest Interview Date', key: 'latestInterviewAt', width: 20 },
    { header: 'Latest Interview Format', key: 'latestInterviewFormat', width: 22 },
    { header: 'Latest Interviewer', key: 'latestInterviewer', width: 24 },
    { header: 'Latest Interview Feedback', key: 'latestInterviewFeedback', width: 45 },
    { header: 'Cover Letter', key: 'coverLetter', width: 45 },
    { header: 'Recruiter Notes', key: 'recruiterNotes', width: 45 },
    { header: 'Additional Details', key: 'additionalDetails', width: 45 },
  ];

  const buf = exportToExcel('Applicants', columns, rows);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="applicants-${Date.now()}.xlsx"`);
  res.send(buf);
}));

/* GET /api/dashboard/candidate-records/export */
router.get('/candidate-records/export', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);

  const [apps, candidateProfiles, candidateUsers, tenantMap] = await Promise.all([
    Application.find({ ...tf, deletedAt: null })
      .populate(CANDIDATE_APPLICANT_POPULATE)
      .populate(JOB_APPLICANT_POPULATE)
      .sort({ createdAt: -1 })
      .lean(),
    Candidate.find({ ...tf, deletedAt: null })
      .select(CANDIDATE_APPLICANT_POPULATE.select.replace('parsedProfile.totalExperienceYears', 'parsedProfile'))
      .sort({ createdAt: -1 })
      .lean(),
    User.find({ ...tf, role: 'candidate', deletedAt: null })
      .select('-password -passwordHash -settings')
      .sort({ createdAt: -1 })
      .lean(),
    orgNameMap(),
  ]);

  const usersByEmail = new Map(candidateUsers.filter(u => u.email).map(u => [u.email.toLowerCase(), u]));
  const appsByEmail = new Map();
  const appsById = new Map();

  apps.forEach(app => {
    const candidate = app.candidateId && typeof app.candidateId === 'object' ? app.candidateId : {};
    const email = (candidate.email || app.candidateEmail || app.email || '').toLowerCase();
    const id = candidate._id ? String(candidate._id) : null;
    if (email && !appsByEmail.has(email)) appsByEmail.set(email, app);
    if (id && !appsById.has(id)) appsById.set(id, app);
  });

  const rows = [];
  const seenEmails = new Set();

  for (const candidate of candidateProfiles) {
    const email = (candidate.email || '').toLowerCase();
    if (email) seenEmails.add(email);
    const user = usersByEmail.get(email) || {};
    const app = appsById.get(String(candidate._id)) || appsByEmail.get(email) || null;
    const job = app?.jobId && typeof app.jobId === 'object' ? app.jobId : null;
    rows.push(profileRow({
      candidate,
      user,
      app,
      job,
      orgName: tenantMap[String(candidate.tenantId)] || tenantMap[String(app?.tenantId)] || '',
    }));
  }

  for (const user of candidateUsers) {
    const email = (user.email || '').toLowerCase();
    if (email && seenEmails.has(email)) continue;
    if (email) seenEmails.add(email);
    const app = appsByEmail.get(email) || null;
    const job = app?.jobId && typeof app.jobId === 'object' ? app.jobId : null;
    rows.push(profileRow({
      user,
      app,
      job,
      orgName: tenantMap[String(user.tenantId)] || tenantMap[String(app?.tenantId)] || '',
    }));
  }

  for (const app of apps) {
    const candidate = app.candidateId && typeof app.candidateId === 'object' ? app.candidateId : {};
    const email = (candidate.email || app.candidateEmail || app.email || '').toLowerCase();
    if (email && seenEmails.has(email)) continue;
    if (email) seenEmails.add(email);
    const job = app.jobId && typeof app.jobId === 'object' ? app.jobId : null;
    rows.push(profileRow({
      candidate,
      user: {},
      app,
      job,
      orgName: tenantMap[String(app.tenantId)] || tenantMap[String(job?.tenantId)] || '',
    }));
  }

  const exportRows = rows.map(r => ({
    ...r,
    appliedAt: fmtDate(r.appliedAt),
    joinedAt: fmtDate(r.joinedAt),
    profileCreatedAt: fmtDate(r.profileCreatedAt),
    lastUpdatedAt: fmtDate(r.lastUpdatedAt),
    latestInterviewAt: fmtDate(r.latestInterviewAt),
  }));

  const columns = [
    { header: 'Application ID', key: 'applicationId', width: 28 },
    { header: 'Candidate ID', key: 'candidateId', width: 28 },
    { header: 'User ID', key: 'userId', width: 28 },
    { header: 'Record Type', key: 'recordType', width: 20 },
    { header: 'Candidate Name', key: 'candidateName', width: 24 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Mobile Number', key: 'phone', width: 18 },
    { header: 'Organisation', key: 'organisation', width: 24 },
    { header: 'Job Title', key: 'jobTitle', width: 30 },
    { header: 'Job Company', key: 'jobCompany', width: 24 },
    { header: 'Job Location', key: 'jobLocation', width: 20 },
    { header: 'Job Department', key: 'jobDepartment', width: 20 },
    { header: 'Job Type', key: 'jobType', width: 16 },
    { header: 'Salary Min', key: 'salaryMin', width: 14 },
    { header: 'Salary Max', key: 'salaryMax', width: 14 },
    { header: 'Salary Currency', key: 'salaryCurrency', width: 16 },
    { header: 'Salary Type', key: 'salaryType', width: 16 },
    { header: 'Assigned Recruiters', key: 'assignedRecruiters', width: 32 },
    { header: 'Stage', key: 'stage', width: 18 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Source', key: 'source', width: 16 },
    { header: 'AI Match Score', key: 'aiMatchScore', width: 15 },
    { header: 'Skill Score', key: 'skillScore', width: 14 },
    { header: 'Experience Score', key: 'experienceScore', width: 18 },
    { header: 'Location Score', key: 'locationScore', width: 16 },
    { header: 'Notice Score', key: 'noticeScore', width: 14 },
    { header: 'Assessment Score', key: 'assessmentScore', width: 18 },
    { header: 'Assessment Violations', key: 'assessmentViolations', width: 22 },
    { header: 'Tags', key: 'tags', width: 24 },
    { header: 'Invite Status', key: 'inviteStatus', width: 16 },
    { header: 'Current Title', key: 'title', width: 24 },
    { header: 'Current Company', key: 'currentCompany', width: 24 },
    { header: 'Location', key: 'location', width: 20 },
    { header: 'Preferred Location', key: 'preferredLocation', width: 22 },
    { header: 'Skills', key: 'skills', width: 42 },
    { header: 'Experience Years', key: 'experience', width: 16 },
    { header: 'Relevant Experience', key: 'relevantExperience', width: 22 },
    { header: 'Current CTC', key: 'currentCTC', width: 16 },
    { header: 'Expected CTC', key: 'expectedCTC', width: 16 },
    { header: 'Availability', key: 'availability', width: 18 },
    { header: 'Notice Period Days', key: 'noticePeriodDays', width: 18 },
    { header: 'Candidate Status', key: 'candidateStatus', width: 18 },
    { header: 'Certifications', key: 'certifications', width: 30 },
    { header: 'LinkedIn', key: 'linkedinUrl', width: 34 },
    { header: 'Resume URL', key: 'resumeUrl', width: 34 },
    { header: 'Video Resume URL', key: 'videoResumeUrl', width: 34 },
    { header: 'Applied At', key: 'appliedAt', width: 16 },
    { header: 'Joined At', key: 'joinedAt', width: 16 },
    { header: 'Profile Created At', key: 'profileCreatedAt', width: 18 },
    { header: 'Last Updated At', key: 'lastUpdatedAt', width: 18 },
    { header: 'Client', key: 'client', width: 20 },
    { header: 'TA', key: 'ta', width: 18 },
    { header: 'Client SPOC', key: 'clientSpoc', width: 20 },
    { header: 'Screening Answers', key: 'screeningAnswers', width: 50 },
    { header: 'Invite Message', key: 'inviteMessage', width: 45 },
    { header: 'Rejection Reason', key: 'rejectionReason', width: 32 },
    { header: 'Interview Count', key: 'interviewCount', width: 16 },
    { header: 'Latest Interview Date', key: 'latestInterviewAt', width: 20 },
    { header: 'Latest Interview Format', key: 'latestInterviewFormat', width: 22 },
    { header: 'Latest Interviewer', key: 'latestInterviewer', width: 24 },
    { header: 'Latest Interview Feedback', key: 'latestInterviewFeedback', width: 45 },
    { header: 'Cover Letter', key: 'coverLetter', width: 45 },
    { header: 'Recruiter Notes', key: 'recruiterNotes', width: 45 },
    { header: 'Additional Details', key: 'additionalDetails', width: 45 },
  ];

  const buf = exportToExcel('Candidate Records', columns, exportRows);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="candidate-records-${Date.now()}.xlsx"`);
  res.send(buf);
}));

// ── Recruiter Dashboard ───────────────────────────────────────────────────────

/* GET /api/dashboard/hiring-funnel */
router.get('/hiring-funnel', authenticate, allowRoles('recruiter'), asyncHandler(async (req, res) => {
  const ids = (await Job.find({ assignedRecruiters: req.user._id }).select('_id').lean()).map(j => j._id);
  const raw = await Application.aggregate([
    { $match: { jobId: { $in: ids } } },
    { $group: { _id: '$currentStage', count: { $sum: 1 } } },
  ]);
  const c = {};
  raw.forEach(r => c[r._id] = r.count);
  const stages = ['Applied', 'Screening', 'Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired', 'Rejected'];
  const stageList = stages.map((s, i) => ({
    key: s, stage: s, count: c[s] || 0,
    conversionFromPrev: i > 0 && (c[stages[i - 1]] || 0) > 0
      ? `${Math.round(((c[s] || 0) / (c[stages[i - 1]] || 1)) * 100)}%`
      : null,
  }));
  const h   = c['Hired'] || 0;
  const rej = c['Rejected'] || 0;
  const total = Object.values(c).reduce((s, v) => s + v, 0);
  res.json({ success: true, data: {
    stages: stageList,
    summary: { rejected: rej, hired: h, active: total - h - rej, conversionRate: total > 0 ? Math.round((h / total) * 100) : 0 },
  }});
}));

/* GET /api/dashboard/job-performance */
router.get('/job-performance', authenticate, allowRoles('recruiter'), asyncHandler(async (req, res) => {
  const myJobs = await Job.find({ assignedRecruiters: req.user._id }).lean();
  const rows = await Promise.all(myJobs.map(async job => {
    const [total, shortlisted, interviewed, hired] = await Promise.all([
      Application.countDocuments({ jobId: job._id, deletedAt: null }),
      Application.countDocuments({ jobId: job._id, currentStage: { $in: ['Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired'] }, deletedAt: null }),
      Application.countDocuments({ jobId: job._id, currentStage: { $in: ['Interview Round 2', 'Offer', 'Hired'] }, deletedAt: null }),
      Application.countDocuments({ jobId: job._id, currentStage: 'Hired', deletedAt: null }),
    ]);
    return {
      jobId: job._id, title: job.title,
      company: job.companyName || 'Unknown',
      applicants: total, shortlisted, interviewed, hired,
      conversion: total > 0 ? `${Math.round((hired / total) * 100)}%` : '0%',
    };
  }));
  res.json({ success: true, data: rows });
}));

/* GET /api/dashboard/upcoming-interviews */
router.get('/upcoming-interviews', authenticate, allowRoles('recruiter'), asyncHandler(async (req, res) => {
  const now = new Date(), weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const ids = (await Job.find({ assignedRecruiters: req.user._id }).select('_id').lean()).map(j => j._id);
  const apps = await Application.find({
    jobId: { $in: ids },
    'interviewRounds.scheduledAt': { $gte: now, $lte: weekEnd },
  }).populate('candidateId', 'name email photoUrl').populate('jobId', 'title').lean();

  const list = [];
  apps.forEach(app => {
    (app.interviewRounds || []).forEach(iv => {
      if (iv.scheduledAt && new Date(iv.scheduledAt) >= now && new Date(iv.scheduledAt) <= weekEnd) {
        list.push({
          applicationId: app._id,
          candidateName : app.candidateId?.name,
          candidateEmail: app.candidateId?.email,
          jobTitle      : app.jobId?.title,
          scheduledAt   : iv.scheduledAt,
          format        : iv.format,
          videoLink     : iv.videoLink,
        });
      }
    });
  });
  list.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  res.json({ success: true, data: { thisWeek: list, count: list.length } });
}));

// ── Candidate Dashboard ───────────────────────────────────────────────────────

/* GET /api/dashboard/candidate-stats */
router.get('/candidate-stats', authenticate, allowRoles('candidate'), asyncHandler(async (req, res) => {
  const Candidate = require('../models/Candidate');
  const candidateDocs = await Candidate.find({ email: req.user.email, deletedAt: null }).select('_id').lean();
  const candidateIds = candidateDocs.map(c => c._id);
  const all = candidateIds.length
    ? await Application.find({ candidateId: { $in: candidateIds } }).lean()
    : [];
  const sent  = all.length;
  const short = all.filter(a => ['Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired'].includes(a.currentStage)).length;
  const active = all.filter(a => !['Hired', 'Rejected'].includes(a.currentStage)).length;
  res.json({ success: true, data: {
    applicationsSent: sent,
    shortlisted     : short,
    activeProcesses : active,
    successRate     : sent > 0 ? Math.round((short / sent) * 100) : 0,
    changes         : { applicationsSent: 12, shortlisted: 5 },
  }});
}));

/* GET /api/dashboard/profile-score */
router.get('/profile-score', authenticate, allowRoles('candidate'), asyncHandler(async (req, res) => {
  const u = await User.findById(req.user._id).lean();
  const fields = {
    name      : !!u.name,
    title     : !!u.title,
    skills    : !!(u.skills?.length > 0),
    location  : !!u.location,
    summary   : !!u.summary,
    phone     : !!u.phone,
    experience: u.experience != null,
  };
  const done = Object.values(fields).filter(Boolean).length;
  res.json({ success: true, data: { score: Math.round((done / 7) * 100), fields, completed: done, total: 7 } });
}));

/* GET /api/dashboard/candidate-pipeline */
router.get('/candidate-pipeline', authenticate, allowRoles('candidate'), asyncHandler(async (req, res) => {
  const Candidate = require('../models/Candidate');
  const cDocs = await Candidate.find({ email: req.user.email, deletedAt: null }).select('_id').lean();
  const cIds = cDocs.map(c => c._id);
  const raw = await Application.aggregate([
    { $match: { candidateId: { $in: cIds } } },
    { $group: { _id: '$currentStage', count: { $sum: 1 } } },
  ]);
  const counts = { Applied: 0, Screening: 0, Shortlisted: 0, 'Interview Round 1': 0, 'Interview Round 2': 0, Offer: 0, Hired: 0, Rejected: 0 };
  raw.forEach(r => { if (r._id && counts[r._id] !== undefined) counts[r._id] = r.count; });
  res.json({ success: true, data: counts });
}));

/* GET /api/dashboard/ai-matched-jobs */
router.get('/ai-matched-jobs', authenticate, allowRoles('candidate'), asyncHandler(async (req, res) => {
  const limit    = Math.min(20, parseInt(req.query.limit) || 5);
  const cand     = await User.findById(req.user._id).lean();
  const mySkills = (cand.skills || []).map(s => s.toLowerCase());
  const applied  = await Application.find({ candidateId: req.user._id }).select('jobId').lean();
  const appliedIds = applied.map(a => a.jobId.toString());

  const jobs = await Job.find({ status: 'active', _id: { $nin: appliedIds } })
    .populate('tenantId', 'name logo')
    .lean();

  const scored = jobs.map(job => {
    const jSkills  = (job.skills || []).map(s => s.toLowerCase());
    const overlap  = mySkills.filter(s => jSkills.includes(s)).length;
    const skillScore = jSkills.length > 0 ? Math.round((overlap / jSkills.length) * 100) : 10;
    const titleMatch = cand.title && job.title.toLowerCase().includes(cand.title.toLowerCase().split(' ')[0]) ? 10 : 0;
    return {
      jobId: job._id, title: job.title,
      company: job.tenantId?.name, location: job.location,
      matchScore: Math.min(100, skillScore + titleMatch),
      skills: job.skills, type: job.jobType,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  res.json({ success: true, data: scored.slice(0, limit) });
}));

/* GET /api/dashboard/candidate-upcoming-interviews — all of this candidate's
   scheduled interviews (past and upcoming), for the Interview Calendar page. */
router.get('/candidate-upcoming-interviews', authenticate, allowRoles('candidate'), asyncHandler(async (req, res) => {
  const now = new Date();
  const Candidate = require('../models/Candidate');
  const cDocs = await Candidate.find({ email: req.user.email, deletedAt: null }).select('_id').lean();
  const cIds = cDocs.map(c => c._id);
  const apps = await Application.find({
    candidateId: { $in: cIds },
    'interviewRounds.0': { $exists: true },
  }).populate('jobId', 'title companyName company').lean();

  const all = [];
  apps.forEach(app => {
    (app.interviewRounds || []).forEach((iv, idx) => {
      if (!iv.scheduledAt) return;
      all.push({
        applicationId : String(app._id),
        jobTitle      : app.jobId?.title || '',
        company       : app.jobId?.companyName || app.jobId?.company || '',
        round         : idx + 1,
        scheduledAt   : iv.scheduledAt,
        format        : iv.format || '',
        videoLink     : iv.videoLink || '',
        location      : iv.location || '',
        interviewerName: iv.interviewerName || '',
      });
    });
  });
  all.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  const upcoming = all.filter(iv => new Date(iv.scheduledAt) >= now);
  const past     = all.filter(iv => new Date(iv.scheduledAt) < now).reverse();

  res.json({ success: true, data: { upcoming, past, count: upcoming.length } });
}));

// ════════════════════════════════════════════════════════════════════════════
// ADVANCED ANALYTICS ENDPOINTS (Task 3.2)
// ════════════════════════════════════════════════════════════════════════════

/* GET /api/dashboard/funnel
   Aggregate applications by currentStage with count + percentage.
   Optional: ?startDate= &endDate= &jobId=
*/
router.get('/funnel', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);
  const { startDate, endDate, jobId } = req.query;
  const dateRange = buildDateRange(startDate, endDate);

  const match = { ...tf, createdAt: dateRange, deletedAt: null };
  if (jobId) match.jobId = new mongoose.Types.ObjectId(jobId);

  const raw = await Application.aggregate([
    { $match: match },
    { $group: { _id: '$currentStage', count: { $sum: 1 } } },
  ]);

  const total = raw.reduce((s, r) => s + r.count, 0);
  const ORDERED = ['Applied', 'Screening', 'Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired', 'Rejected'];
  const countMap = {};
  raw.forEach(r => { countMap[r._id] = r.count; });

  const data = ORDERED.map(stage => ({
    stage,
    count: countMap[stage] || 0,
    percentage: total > 0 ? parseFloat(((countMap[stage] || 0) / total * 100).toFixed(1)) : 0,
  }));

  res.json({ success: true, data, total });
}));

/* GET /api/dashboard/funnel/export */
router.get('/funnel/export', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);
  const { startDate, endDate, jobId } = req.query;
  const match = { ...tf, createdAt: buildDateRange(startDate, endDate), deletedAt: null };
  if (jobId) match.jobId = new mongoose.Types.ObjectId(jobId);

  const raw = await Application.aggregate([
    { $match: match },
    { $group: { _id: '$currentStage', count: { $sum: 1 } } },
  ]);
  const total = raw.reduce((s, r) => s + r.count, 0);
  const rows = raw.map(r => ({
    stage: r._id || 'Unknown',
    count: r.count,
    percentage: total > 0 ? parseFloat((r.count / total * 100).toFixed(1)) : 0,
  }));

  const buf = exportToExcel('Hiring Funnel', [
    { header: 'Stage',       key: 'stage',      width: 25 },
    { header: 'Count',       key: 'count',      width: 12 },
    { header: 'Percentage',  key: 'percentage', width: 14 },
  ], rows);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="funnel-report-${Date.now()}.xlsx"`);
  res.send(buf);
}));

/* GET /api/dashboard/source-breakdown
   Group candidates by their source field.
*/
router.get('/source-breakdown', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);
  const { startDate, endDate } = req.query;

  // Only apply date filter when the caller explicitly passes both dates.
  // Without dates this returns all-time data so the total matches the KPI
  // card which also counts all-time applications + imported candidates.
  const dateFilter = (startDate && endDate) ? { createdAt: buildDateRange(startDate, endDate) } : {};

  const [appRaw, impRaw] = await Promise.all([
    Application.aggregate([
      { $match: { ...tf, ...dateFilter, deletedAt: null } },
      { $group: {
          _id: { $toLower: { $ifNull: [ { $cond: [ { $eq: ["$source", ""] }, null, "$source" ] }, 'direct' ] } },
          count: { $sum: 1 }
      }},
    ]),
    ImportedCandidate.aggregate([
      { $match: { ...tf, ...dateFilter } },
      { $group: {
          _id: { $toLower: { $ifNull: [ { $cond: [ { $eq: ["$source", ""] }, null, "$source" ] }, 'bulk_import' ] } },
          count: { $sum: 1 }
      }},
    ])
  ]);

  const sourceMap = {};
  [...appRaw, ...impRaw].forEach(r => {
    const src = r._id || 'direct';
    sourceMap[src] = (sourceMap[src] || 0) + r.count;
  });

  const raw = Object.entries(sourceMap).map(([src, count]) => ({ _id: src, count }));
  raw.sort((a, b) => b.count - a.count);

  const total = raw.reduce((s, r) => s + r.count, 0);
  const data = raw.map(r => ({
    source    : r._id || 'direct',
    count     : r.count,
    percentage: total > 0 ? parseFloat((r.count / total * 100).toFixed(1)) : 0,
  }));

  res.json({ success: true, data, total });
}));

/* GET /api/dashboard/time-to-hire
   For applications that reached 'Hired' stage, calculate average days from createdAt to Hired.
   Groups by jobId, populates job title and recruiter.
*/
router.get('/time-to-hire', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);
  const { startDate, endDate } = req.query;
  const dateRange = buildDateRange(startDate, endDate);

  const hiredApps = await Application.find({
    ...tf,
    currentStage: 'Hired',
    createdAt   : dateRange,
  }).populate('jobId', 'title createdBy assignedRecruiters').lean();

  // Group by jobId
  const byJob = {};
  for (const app of hiredApps) {
    const jid = app.jobId?._id?.toString() || app.jobId?.toString() || 'unknown';
    const hiredEntry = (app.stageHistory || []).find(h => h.stage === 'Hired');
    const hiredAt = hiredEntry ? new Date(hiredEntry.movedAt) : new Date(app.updatedAt);
    const days = (hiredAt - new Date(app.createdAt)) / 86400000;
    if (!byJob[jid]) {
      byJob[jid] = {
        jobId     : jid,
        jobTitle  : app.jobId?.title || 'Unknown Job',
        createdBy : app.jobId?.createdBy,
        totalDays : 0,
        count     : 0,
      };
    }
    byJob[jid].totalDays += days;
    byJob[jid].count++;
  }

  // Merge entries with same job title (avoids duplicate rows for same-titled jobs)
  const byTitle = {};
  Object.values(byJob).forEach(j => {
    const key = (j.jobTitle || '').toLowerCase().trim();
    if (!byTitle[key]) byTitle[key] = { ...j };
    else {
      byTitle[key].totalDays += j.totalDays;
      byTitle[key].count     += j.count;
    }
  });

  // Resolve recruiter names
  const recruiterIds = [...new Set(Object.values(byTitle).map(j => j.createdBy?.toString()).filter(Boolean))];
  const recruiters = recruiterIds.length > 0
    ? await User.find({ _id: { $in: recruiterIds } }).select('name').lean()
    : [];
  const rMap = {};
  recruiters.forEach(r => { rMap[r._id.toString()] = r.name; });

  const data = Object.values(byTitle).map(j => ({
    jobId        : j.jobId,
    jobTitle     : j.jobTitle,
    recruiterName: rMap[j.createdBy?.toString()] || 'Unknown',
    avgDaysToHire: parseFloat((j.totalDays / j.count).toFixed(1)),
    hiredCount   : j.count,
  })).sort((a, b) => b.hiredCount - a.hiredCount);

  res.json({ success: true, data, total: hiredApps.length });
}));

/* GET /api/dashboard/time-to-hire/export */
router.get('/time-to-hire/export', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  // Reuse the same logic as GET /time-to-hire
  const tf = tenantFilter(req);
  const { startDate, endDate } = req.query;
  const hiredApps = await Application.find({
    ...tf, currentStage: 'Hired', createdAt: buildDateRange(startDate, endDate),
  }).populate('jobId', 'title createdBy').lean();

  const byJob = {};
  for (const app of hiredApps) {
    const jid = app.jobId?._id?.toString() || 'unknown';
    const hiredEntry = (app.stageHistory || []).find(h => h.stage === 'Hired');
    const hiredAt = hiredEntry ? new Date(hiredEntry.movedAt) : new Date(app.updatedAt);
    const days = (hiredAt - new Date(app.createdAt)) / 86400000;
    if (!byJob[jid]) byJob[jid] = { jobTitle: app.jobId?.title || 'Unknown', createdBy: app.jobId?.createdBy, totalDays: 0, count: 0 };
    byJob[jid].totalDays += days;
    byJob[jid].count++;
  }

  const recruiterIds = [...new Set(Object.values(byJob).map(j => j.createdBy?.toString()).filter(Boolean))];
  const recruiters = recruiterIds.length ? await User.find({ _id: { $in: recruiterIds } }).select('name').lean() : [];
  const rMap = {};
  recruiters.forEach(r => { rMap[r._id.toString()] = r.name; });

  const rows = Object.values(byJob).map(j => ({
    jobTitle     : j.jobTitle,
    recruiterName: rMap[j.createdBy?.toString()] || 'Unknown',
    avgDaysToHire: parseFloat((j.totalDays / j.count).toFixed(1)),
    hiredCount   : j.count,
  }));

  const buf = exportToExcel('Time to Hire', [
    { header: 'Job Title',     key: 'jobTitle',      width: 30 },
    { header: 'Recruiter',     key: 'recruiterName', width: 20 },
    { header: 'Avg Days',      key: 'avgDaysToHire', width: 14 },
    { header: 'Hires',         key: 'hiredCount',    width: 10 },
  ], rows);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="time-to-hire-${Date.now()}.xlsx"`);
  res.send(buf);
}));

/* GET /api/dashboard/stage-velocity
   For each stage transition in stageHistory, calculate avg hours between moves.
*/
router.get('/stage-velocity', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);
  const { startDate, endDate } = req.query;
  const dateRange = buildDateRange(startDate, endDate);

  const apps = await Application.find({
    ...tf,
    createdAt    : dateRange,
    'stageHistory.1': { $exists: true }, // at least 2 stage history entries
  }).select('stageHistory createdAt').lean();

  // For each consecutive pair in stageHistory, record hours spent
  const stageHours = {}; // stage -> [hours]
  for (const app of apps) {
    const history = app.stageHistory || [];
    for (let i = 1; i < history.length; i++) {
      const prevStage = history[i - 1].stage;
      if (!prevStage) continue;
      const from = new Date(history[i - 1].movedAt || app.createdAt);
      const to   = new Date(history[i].movedAt);
      const hrs  = (to - from) / 3600000;
      if (hrs >= 0 && hrs < 8760) { // ignore negative or > 1 year (data issues)
        if (!stageHours[prevStage]) stageHours[prevStage] = [];
        stageHours[prevStage].push(hrs);
      }
    }
  }

  const data = Object.entries(stageHours).map(([stage, hours]) => ({
    stage,
    avgHours   : parseFloat((hours.reduce((s, h) => s + h, 0) / hours.length).toFixed(1)),
    sampleCount: hours.length,
  })).sort((a, b) => b.avgHours - a.avgHours);

  res.json({ success: true, data, total: apps.length });
}));

/* GET /api/dashboard/offer-acceptance
   Count offers sent vs accepted (Hired).
*/
router.get('/offer-acceptance', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);
  const { startDate, endDate } = req.query;
  const dateRange = buildDateRange(startDate, endDate);

  const [offersSent, offersAccepted] = await Promise.all([
    Application.countDocuments({
      ...tf,
      'stageHistory.stage': 'Offer',
      createdAt: dateRange,
      deletedAt: null
    }),
    Application.countDocuments({
      ...tf,
      currentStage: 'Hired',
      'stageHistory.stage': 'Offer',
      createdAt: dateRange,
      deletedAt: null
    }),
  ]);

  const acceptanceRate = offersSent > 0
    ? parseFloat((offersAccepted / offersSent * 100).toFixed(1))
    : 0;

  res.json({ success: true, data: { offersSent, offersAccepted, acceptanceRate } });
}));

/* GET /api/dashboard/dropout-analysis
   Group applications by the stage before rejection.
*/
router.get('/dropout-analysis', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);
  const { startDate, endDate } = req.query;
  const dateRange = buildDateRange(startDate, endDate);

  // Find all rejected applications
  const rejectedApps = await Application.find({
    ...tf,
    currentStage: 'Rejected',
    createdAt   : dateRange,
  }).select('stageHistory rejectionReason').lean();

  const dropoutStage = {}; // stage -> { count, reasons: {} }
  for (const app of rejectedApps) {
    const history = app.stageHistory || [];
    // Find Rejected entry and look at the stage before it
    const rejIdx = history.findLastIndex ? history.findLastIndex(h => h.stage === 'Rejected') : history.map(h => h.stage).lastIndexOf('Rejected');
    const prevStage = rejIdx > 0 ? history[rejIdx - 1].stage : (history.length > 0 ? history[0].stage : 'Applied');
    const stage = prevStage || 'Applied';

    if (!dropoutStage[stage]) dropoutStage[stage] = { count: 0, reasons: {} };
    dropoutStage[stage].count++;
    const reason = app.rejectionReason || 'Not specified';
    dropoutStage[stage].reasons[reason] = (dropoutStage[stage].reasons[reason] || 0) + 1;
  }

  const total = rejectedApps.length;
  const data = Object.entries(dropoutStage).map(([stage, v]) => ({
    stage,
    count     : v.count,
    percentage: total > 0 ? parseFloat((v.count / total * 100).toFixed(1)) : 0,
    topReasons: Object.entries(v.reasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason, count]) => ({ reason, count })),
  })).sort((a, b) => b.count - a.count);

  res.json({ success: true, data, total });
}));

/* GET /api/dashboard/dropout-analysis/export */
router.get('/dropout-analysis/export', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);
  const { startDate, endDate } = req.query;

  const rejectedApps = await Application.find({
    ...tf, currentStage: 'Rejected', createdAt: buildDateRange(startDate, endDate), deletedAt: null,
  }).select('stageHistory rejectionReason').lean();

  const dropoutStage = {};
  for (const app of rejectedApps) {
    const history = app.stageHistory || [];
    const rejIdx = history.map(h => h.stage).lastIndexOf('Rejected');
    const prevStage = rejIdx > 0 ? history[rejIdx - 1].stage : 'Applied';
    const stage = prevStage || 'Applied';
    if (!dropoutStage[stage]) dropoutStage[stage] = { count: 0 };
    dropoutStage[stage].count++;
  }

  const total = rejectedApps.length;
  const rows = Object.entries(dropoutStage).map(([stage, v]) => ({
    stage,
    count     : v.count,
    percentage: total > 0 ? parseFloat((v.count / total * 100).toFixed(1)) : 0,
  }));

  const buf = exportToExcel('Dropout Analysis', [
    { header: 'Dropout Stage', key: 'stage',      width: 25 },
    { header: 'Count',         key: 'count',      width: 12 },
    { header: 'Percentage',    key: 'percentage', width: 14 },
  ], rows);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="dropout-analysis-${Date.now()}.xlsx"`);
  res.send(buf);
}));

/* GET /api/dashboard/recruiter-performance
   Aggregation-based rewrite — 3 queries total instead of N×5.
*/
router.get('/recruiter-performance', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);
  const { startDate, endDate, recruiterId } = req.query;
  const dateRange = buildDateRange(startDate, endDate);

  const recruiterQuery = { ...tf, role: 'recruiter', isActive: true };
  if (recruiterId) recruiterQuery._id = new mongoose.Types.ObjectId(recruiterId);

  // Query 1: all recruiters + Query 2: jobs with assigned recruiters
  const [recruiters, allJobs] = await Promise.all([
    User.find(recruiterQuery).select('_id name email').lean(),
    Job.find({ ...tf, deletedAt: null }).select('_id assignedRecruiters').lean(),
  ]);

  // Build recruiter → jobIds map
  const recruiterJobMap = {};
  for (const job of allJobs) {
    for (const rid of (job.assignedRecruiters || [])) {
      const key = rid.toString();
      if (!recruiterJobMap[key]) recruiterJobMap[key] = new Set();
      recruiterJobMap[key].add(job._id.toString());
    }
  }

  // Query 3: ONE aggregation across all applications for the period
  const appAgg = await Application.aggregate([
    { $match: { ...tf, createdAt: dateRange, deletedAt: null } },
    { $group: { _id: { jobId: '$jobId', stage: '$currentStage' }, count: { $sum: 1 } } },
  ]);

  // jobId → { stage: count }
  const jobStageMap = {};
  for (const r of appAgg) {
    const jid = r._id.jobId?.toString();
    if (!jid) continue;
    if (!jobStageMap[jid]) jobStageMap[jid] = {};
    jobStageMap[jid][r._id.stage] = (jobStageMap[jid][r._id.stage] || 0) + r.count;
  }

  const data = recruiters.map(r => {
    const myJobIds = [...(recruiterJobMap[r._id.toString()] || new Set())];
    let candidatesAdded = 0, shortlisted = 0, offers = 0, hired = 0;
    for (const jid of myJobIds) {
      const stages = jobStageMap[jid] || {};
      for (const [stage, cnt] of Object.entries(stages)) {
        candidatesAdded += cnt;
        if (stage === 'Shortlisted') shortlisted += cnt;
        if (stage === 'Offer' || stage === 'Offer Extended') offers += cnt;
        if (stage === 'Hired') hired += cnt;
      }
    }
    return {
      recruiterId    : r._id,
      recruiterName  : r.name,
      jobsAssigned   : myJobIds.length,
      candidatesAdded,
      shortlisted,
      offers,
      hired,
      avgDaysToShortlist: 0,
    };
  });

  res.json({ success: true, data, total: data.length });
}));

/* GET /api/dashboard/recruiter-performance/export */
router.get('/recruiter-performance/export', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);
  const { startDate, endDate } = req.query;
  const dateRange = buildDateRange(startDate, endDate);

  const recruiters = await User.find({ ...tf, role: 'recruiter', isActive: true }).lean();
  const rows = await Promise.all(recruiters.map(async (r) => {
    const myJobIds = (await Job.find({ assignedRecruiters: r._id, ...tf }).select('_id').lean()).map(j => j._id);
    const [candidatesAdded, shortlisted, offers, hired] = await Promise.all([
      Application.countDocuments({ jobId: { $in: myJobIds }, createdAt: dateRange }),
      Application.countDocuments({ jobId: { $in: myJobIds }, createdAt: dateRange, 'stageHistory.stage': 'Shortlisted' }),
      Application.countDocuments({ jobId: { $in: myJobIds }, createdAt: dateRange, 'stageHistory.stage': 'Offer' }),
      Application.countDocuments({ jobId: { $in: myJobIds }, createdAt: dateRange, currentStage: 'Hired' }),
    ]);
    return {
      recruiterName: r.name,
      jobsAssigned : myJobIds.length,
      candidatesAdded, shortlisted, offers, hired,
    };
  }));

  const buf = exportToExcel('Recruiter Performance', [
    { header: 'Recruiter',   key: 'recruiterName',  width: 24 },
    { header: 'Jobs',        key: 'jobsAssigned',   width: 10 },
    { header: 'Candidates',  key: 'candidatesAdded',width: 14 },
    { header: 'Shortlisted', key: 'shortlisted',    width: 14 },
    { header: 'Offers',      key: 'offers',         width: 10 },
    { header: 'Hired',       key: 'hired',          width: 10 },
  ], rows);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="recruiter-performance-${Date.now()}.xlsx"`);
  res.send(buf);
}));

/* GET /api/dashboard/sla-compliance
   Check stage dwell time against default SLAs.
*/
router.get('/sla-compliance', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);
  const { startDate, endDate } = req.query;
  const dateRange = buildDateRange(startDate, endDate);

  const apps = await Application.find({
    ...tf,
    createdAt: dateRange,
    'stageHistory.1': { $exists: true },
  }).select('stageHistory createdAt').lean();

  const byStage = {}; // stage -> { compliant, breached }
  let compliantMoves = 0;
  let breachedMoves  = 0;

  for (const app of apps) {
    const history = app.stageHistory || [];
    for (let i = 1; i < history.length; i++) {
      const stage = history[i - 1].stage;
      if (!stage) continue;
      const slaHours = DEFAULT_SLA_HOURS[stage];
      if (slaHours === undefined || slaHours === 0) continue;

      const from = new Date(history[i - 1].movedAt || app.createdAt);
      const to   = new Date(history[i].movedAt);
      const hrs  = (to - from) / 3600000;

      if (!byStage[stage]) byStage[stage] = { stage, compliant: 0, breached: 0 };
      if (hrs <= slaHours) {
        byStage[stage].compliant++;
        compliantMoves++;
      } else {
        byStage[stage].breached++;
        breachedMoves++;
      }
    }
  }

  const totalMoves = compliantMoves + breachedMoves;
  const complianceRate = totalMoves > 0
    ? parseFloat((compliantMoves / totalMoves * 100).toFixed(1))
    : 0;

  const stageList = Object.values(byStage).map(s => ({
    ...s,
    rate: (s.compliant + s.breached) > 0
      ? parseFloat((s.compliant / (s.compliant + s.breached) * 100).toFixed(1))
      : 0,
  }));

  res.json({ success: true, data: { compliantMoves, breachedMoves, complianceRate, byStage: stageList } });
}));

// ── GET /api/dashboard/unregistered-candidates (super_admin only) ─────────────
// Returns all guest applicants (no User account) deduplicated by email.
// Each entry shows the merged candidate profile + all their applications grouped.
router.get('/unregistered-candidates', authenticate, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const page         = Math.max(1, parseInt(req.query.page, 10)  || 1);
  const limit        = Math.min(parseInt(req.query.limit, 10) || 100, 10000);
  const skip         = (page - 1) * limit;
  const search       = String(req.query.search || '').trim().toLowerCase();
  const uninvitedOnly = req.query.uninvitedOnly === 'true';

  // 1. Get all registered candidate emails so we can exclude them
  const registeredEmails = await User.find({ role: 'candidate', deletedAt: null })
    .select('email').lean().then(us => new Set(us.map(u => u.email.toLowerCase())));

  // 2. Find all unique emails in Candidate collection that are NOT registered
  const matchStage = { deletedAt: null, $or: [{ userId: null }, { userId: { $exists: false } }] };
  if (search) {
    const phoneRe = phoneSearchRegex(search);
    matchStage.$and = [
      { $or: [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        ...(phoneRe ? [{ phone: phoneRe }] : []),
        { title: { $regex: search, $options: 'i' } },
      ]},
    ];
  }

  // Get unique emails from unregistered candidates
  const emailGroups = await Candidate.aggregate([
    { $match: matchStage },
    { $group: {
      _id:   { $toLower: '$email' },
      name:  { $first: '$name' },
      email: { $first: '$email' },
      phone: { $first: '$phone' },
      title: { $first: '$title' },
      currentCompany: { $first: '$currentCompany' },
      experience:     { $first: '$experience' },
      availability:   { $first: '$availability' },
      skills:         { $first: '$skills' },
      location:       { $first: '$location' },
      source:         { $first: '$source' },
      createdAt:      { $min: '$createdAt' },
      candidateIds:   { $push: '$_id' },
      accountInviteSentAt: { $max: '$accountInviteSentAt' },
      accountRequestSent:  { $max: '$accountRequestSent' },
    }},
    { $sort: { createdAt: -1 } },
  ]);

  // Filter out any email that now has a registered account (safety check)
  let unregistered = emailGroups.filter(g => !registeredEmails.has(g._id));

  // Filter: uninvitedOnly — show only those who have never been sent an invite
  if (uninvitedOnly) {
    unregistered = unregistered.filter(g => !g.accountRequestSent && !g.accountInviteSentAt);
  }

  const total = unregistered.length;

  // Paginate
  const pageSlice = unregistered.slice(skip, skip + limit);

  // 3. For each unique email, fetch all their applications
  const allCandidateIds = pageSlice.flatMap(g => g.candidateIds);
  const applications = await Application.find({
    candidateId: { $in: allCandidateIds },
    deletedAt: null,
  })
    .populate('jobId', 'title company companyName location jobType')
    .sort({ createdAt: -1 })
    .lean();

  // Group applications by email (via candidateId lookup)
  const candidateIdToEmail = {};
  for (const g of pageSlice) {
    for (const cid of g.candidateIds) {
      candidateIdToEmail[String(cid)] = g._id;
    }
  }

  const appsByEmail = {};
  for (const app of applications) {
    const email = candidateIdToEmail[String(app.candidateId)];
    if (!email) continue;
    if (!appsByEmail[email]) appsByEmail[email] = [];
    appsByEmail[email].push({
      id:        app._id.toString(),
      jobId:     app.jobId?._id?.toString() || String(app.jobId),
      jobTitle:  app.jobId?.title || 'Unknown Job',
      jobCompany:app.jobId?.companyName || app.jobId?.company || '',
      location:  app.jobId?.location   || '',
      jobType:   app.jobId?.jobType    || '',
      stage:     app.currentStage      || app.stage || 'Applied',
      appliedAt: app.createdAt,
      appliedFrom: app.appliedFrom,
    });
  }

  // 4. Build final rows
  const rows = pageSlice.map(g => ({
    email:          g._id,
    name:           g.name           || '',
    phone:          g.phone          || '',
    title:          g.title          || '',
    currentCompany: g.currentCompany || '',
    experience:     g.experience     ?? '',
    availability:   g.availability   || '',
    skills:         Array.isArray(g.skills) ? g.skills : [],
    location:       g.location       || '',
    source:         g.source         || 'career_page',
    firstAppliedAt: g.createdAt,
    jobCount:       (appsByEmail[g._id] || []).length,
    applications:   appsByEmail[g._id]  || [],
    candidateIds:   g.candidateIds.map(String),
    accountInviteSentAt: g.accountInviteSentAt || null,
    accountRequestSent:  g.accountRequestSent  || false,
  }));

  res.json({
    success: true,
    data: rows,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}));

// ── GET /api/dashboard/unregistered-stats ───────────────────────────────────
// Invitation funnel stats: total / invited / converted to account / not invited
router.get('/unregistered-stats', authenticate, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  // 1. All candidate emails NOT yet registered
  const registeredEmails = await User.find({ role: 'candidate', deletedAt: null })
    .select('email').lean().then(us => new Set(us.map(u => u.email.toLowerCase())));

  const matchStage = { deletedAt: null, $or: [{ userId: null }, { userId: { $exists: false } }] };
  const emailGroups = await Candidate.aggregate([
    { $match: matchStage },
    { $group: {
      _id:                { $toLower: '$email' },
      accountRequestSent: { $max: '$accountRequestSent' },
      accountInviteSentAt:{ $max: '$accountInviteSentAt' },
    }},
  ]);
  const unregistered = emailGroups.filter(g => !registeredEmails.has(g._id));

  const totalGuests   = unregistered.length;
  const totalInvited  = unregistered.filter(g => g.accountRequestSent || g.accountInviteSentAt).length;
  const notInvited    = totalGuests - totalInvited;

  // Converted = candidates whose emails are now in the registered set AND had accountRequestSent=true
  // We query the Candidate collection for emails that ARE in registeredEmails and had invite sent
  const convertedAgg = await Candidate.aggregate([
    { $match: { deletedAt: null, accountRequestSent: true } },
    { $group: { _id: { $toLower: '$email' } } },
  ]);
  const convertedEmails = new Set(convertedAgg.map(c => c._id));
  const converted = [...convertedEmails].filter(e => registeredEmails.has(e)).length;

  const successRate = totalInvited > 0 ? Math.round((converted / totalInvited) * 100) : 0;
  const failRate    = totalInvited > 0 ? Math.round(((totalInvited - converted) / totalInvited) * 100) : 0;

  res.json({ success: true, data: {
    totalGuests, totalInvited, notInvited, converted,
    successRate, failRate,
    pending: totalInvited - converted, // invited but not yet signed up
  }});
}));

// ── GET /api/dashboard/smart-alerts ─────────────────────────────────────────
// Returns actionable alerts: stale jobs, stuck candidates, pending offers
router.get('/smart-alerts', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const OfferLetter = require('../models/OfferLetter');
  const orgF   = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };
  const del    = { deletedAt: null };
  const now    = Date.now();
  const DAY    = 86400000;

  const staleJobDays      = parseInt(req.query.staleJobDays)      || 30;
  const stuckCandDays     = parseInt(req.query.stuckCandDays)     || 7;
  const pendingOfferDays  = parseInt(req.query.pendingOfferDays)  || 3;

  const aggF = req.user.role === 'super_admin' ? {} : tenantFilter(req);

  const [staleJobs, stuckAgg, pendingOffers] = await Promise.all([
    // Jobs active for N+ days with 0 hires — no cap, accurate count
    Job.find({ ...orgF, ...del, status: 'active', hiredCount: { $in: [0, null] },
      createdAt: { $lt: new Date(now - staleJobDays * DAY) } })
      .select('title createdAt tenantId assignedRecruiters companyName company')
      .populate('assignedRecruiters', 'name')
      .sort({ createdAt: 1 })
      .limit(50).lean(),

    // Use aggregation with $last on stageHistory so the DB does the filtering —
    // no in-memory scan cap, correctly finds ALL stuck candidates
    Application.aggregate([
      { $match: { ...aggF, ...del, currentStage: { $nin: ['Hired', 'Rejected'] }, 'stageHistory.0': { $exists: true } } },
      { $addFields: { lastMovedAt: { $last: '$stageHistory.movedAt' } } },
      { $match: { lastMovedAt: { $lt: new Date(now - stuckCandDays * DAY) } } },
      { $addFields: { daysStuck: { $floor: { $divide: [{ $subtract: [new Date(now), '$lastMovedAt'] }, DAY] } } } },
      { $sort: { daysStuck: -1 } },
      { $limit: 50 },
      { $lookup: { from: 'jobs', localField: 'jobId', foreignField: '_id', as: 'job', pipeline: [{ $project: { title: 1 } }] } },
      { $lookup: { from: 'candidates', localField: 'candidateId', foreignField: '_id', as: 'cand', pipeline: [{ $project: { name: 1 } }] } },
      { $project: { currentStage: 1, daysStuck: 1,
        jobTitle: { $ifNull: [{ $first: '$job.title' }, '—'] },
        candidateName: { $ifNull: [{ $first: '$cand.name' }, '—'] },
      }},
    ]),

    // Offer letters in draft/sent for N+ days — no cap
    OfferLetter.find({ ...orgF, status: { $in: ['draft', 'sent'] },
      createdAt: { $lt: new Date(now - pendingOfferDays * DAY) } })
      .select('status createdAt candidateId applicationId')
      .populate('candidateId', 'name email')
      .sort({ createdAt: 1 })
      .limit(50).lean(),
  ]);

  const staleJobsMapped = staleJobs.map(j => ({
    id: j._id, title: j.title,
    company: j.companyName || j.company || '—',
    daysOpen: Math.floor((now - new Date(j.createdAt).getTime()) / DAY),
    recruiters: (j.assignedRecruiters || []).map(r => r.name).filter(Boolean),
  }));

  const stuckCandidates = stuckAgg.map(a => ({
    id: a._id, candidateName: a.candidateName, jobTitle: a.jobTitle,
    stage: a.currentStage, daysStuck: a.daysStuck,
  }));

  const pendingOffersMapped = pendingOffers.map(o => ({
    id: o._id, candidateName: o.candidateId?.name || '—',
    status: o.status,
    daysPending: Math.floor((now - new Date(o.createdAt).getTime()) / DAY),
  }));

  // Also return totals so frontend can show "Showing X of Y"
  const [totalStale, totalStuck, totalPending] = await Promise.all([
    Job.countDocuments({ ...orgF, ...del, status: 'active', hiredCount: { $in: [0, null] }, createdAt: { $lt: new Date(now - staleJobDays * DAY) } }),
    Application.countDocuments({ ...aggF, ...del, currentStage: { $nin: ['Hired', 'Rejected'] } }),
    OfferLetter.countDocuments({ ...orgF, status: { $in: ['draft', 'sent'] }, createdAt: { $lt: new Date(now - pendingOfferDays * DAY) } }),
  ]);

  res.json({ success: true, data: {
    staleJobs: staleJobsMapped, stuckCandidates, pendingOffers: pendingOffersMapped,
    totals: { staleJobs: totalStale, stuckCandidates: totalStuck, pendingOffers: totalPending },
    thresholds: { staleJobDays, stuckCandDays, pendingOfferDays },
  }});
}));

// ── GET /api/dashboard/stage-time ───────────────────────────────────────────
// Average days candidates spend in each stage (bottleneck detection)
router.get('/stage-time', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const aggF = req.user.role === 'super_admin' ? {} : tenantFilter(req);

  // Use MongoDB aggregation to compute avg time per stage across ALL applications.
  // $unwind stageHistory, then compare each entry's movedAt with the next entry's
  // movedAt using $zip on sorted arrays. This is accurate for any number of apps.
  const result = await Application.aggregate([
    { $match: { ...aggF, deletedAt: null, 'stageHistory.1': { $exists: true } } },
    { $project: {
        // Pair each stage with the next entry's movedAt using $zip
        pairs: {
          $zip: {
            inputs: [
              { $slice: ['$stageHistory', 0, { $subtract: [{ $size: '$stageHistory' }, 1] }] },
              { $slice: ['$stageHistory', 1, { $size: '$stageHistory' }] },
            ]
          }
        }
    }},
    { $unwind: '$pairs' },
    { $project: {
        stage: { $arrayElemAt: ['$pairs', 0] },
        nextEntry: { $arrayElemAt: ['$pairs', 1] },
    }},
    { $project: {
        stageName: '$stage.stage',
        daysInStage: {
          $divide: [
            { $subtract: ['$nextEntry.movedAt', '$stage.movedAt'] },
            86400000
          ]
        }
    }},
    { $match: { daysInStage: { $gt: 0, $lt: 365 } } }, // exclude outliers > 1 year
    { $group: {
        _id: '$stageName',
        avgDays: { $avg: '$daysInStage' },
        count: { $sum: 1 },
        maxDays: { $max: '$daysInStage' },
    }},
    { $project: {
        stage: '$_id',
        avgDays: { $round: ['$avgDays', 1] },
        maxDays: { $round: ['$maxDays', 1] },
        count: 1,
        _id: 0,
    }},
    { $sort: { avgDays: -1 } },
  ]);

  res.json({ success: true, data: result });
}));

// ── GET /api/dashboard/offer-analytics ──────────────────────────────────────
// Offer letter funnel: generated, sent, signed, declined
router.get('/offer-analytics', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const OfferLetter = require('../models/OfferLetter');
  const orgF = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };

  const [total, sent, signed, declined, avgDays] = await Promise.all([
    OfferLetter.countDocuments({ ...orgF }),
    OfferLetter.countDocuments({ ...orgF, status: 'sent' }),
    OfferLetter.countDocuments({ ...orgF, status: 'signed' }),
    OfferLetter.countDocuments({ ...orgF, status: 'declined' }),
    OfferLetter.aggregate([
      { $match: { ...orgF, status: 'signed', signedAt: { $exists: true }, createdAt: { $exists: true } } },
      { $project: { days: { $divide: [{ $subtract: ['$signedAt', '$createdAt'] }, 86400000] } } },
      { $group: { _id: null, avg: { $avg: '$days' } } },
    ]),
  ]);

  const acceptanceRate = (sent + signed) > 0 ? Math.round((signed / (sent + signed + declined)) * 100) : 0;
  res.json({ success: true, data: {
    total, sent, signed, declined,
    pending: sent,
    acceptanceRate,
    avgDaysToSign: Math.round((avgDays[0]?.avg || 0) * 10) / 10,
  }});
}));

// ── GET /api/dashboard/source-effectiveness ──────────────────────────────────
// Per source: applications → shortlisted → hired counts and conversion rates
router.get('/source-effectiveness', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const aggF = req.user.role === 'super_admin' ? {} : tenantFilter(req);
  const del  = { deletedAt: null };

  const rows = await Application.aggregate([
    { $match: { ...aggF, ...del } },
    { $group: {
      _id          : '$source',
      total        : { $sum: 1 },
      shortlisted  : { $sum: { $cond: [{ $in: ['$currentStage', ['Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired']] }, 1, 0] } },
      hired        : { $sum: { $cond: [{ $eq: ['$currentStage', 'Hired'] }, 1, 0] } },
      rejected     : { $sum: { $cond: [{ $eq: ['$currentStage', 'Rejected'] }, 1, 0] } },
    }},
    { $sort: { total: -1 } },
  ]);

  const data = rows.map(r => ({
    source          : r._id || 'direct',
    applications    : r.total,
    shortlisted     : r.shortlisted,
    hired           : r.hired,
    rejected        : r.rejected,
    shortlistRate   : r.total > 0 ? Math.round((r.shortlisted / r.total) * 100) : 0,
    hireRate        : r.total > 0 ? Math.round((r.hired / r.total) * 100) : 0,
  }));

  res.json({ success: true, data });
}));

// ── GET /api/stats/diversity — DEI report ─────────────────────────────────────
router.get('/diversity', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const Candidate   = require('../models/Candidate');
  const Application = require('../models/Application');

  const isSuperAdmin = req.user.role === 'super_admin';
  const tid = req.user.tenantId;
  const { startDate, endDate } = req.query;

  // Date filter for applications
  const dateMatch = {};
  if (startDate) dateMatch.$gte = new Date(startDate);
  if (endDate)   dateMatch.$lte = new Date(endDate);
  // super_admin sees platform-wide data (no tenantId filter)
  const appFilter = isSuperAdmin ? { deletedAt: null } : { tenantId: tid, deletedAt: null };
  if (Object.keys(dateMatch).length) appFilter.createdAt = dateMatch;

  // Gender breakdown from applications → candidates
  const [genderRows, stageByGender, hiresByGender] = await Promise.all([
    // Overall gender breakdown of all candidates in pool
    Candidate.aggregate([
      { $match: isSuperAdmin ? { deletedAt: null } : { tenantId: tid, deletedAt: null } },
      { $group: { _id: { $ifNull: ['$gender', 'not_disclosed'] }, count: { $sum: 1 } } },
    ]),
    // Applications by gender and current stage
    Application.aggregate([
      { $match: appFilter },
      { $lookup: { from: 'candidates', localField: 'candidateId', foreignField: '_id', as: 'cand' } },
      { $unwind: { path: '$cand', preserveNullAndEmptyArrays: true } },
      { $group: {
        _id: {
          gender: { $ifNull: ['$cand.gender', 'not_disclosed'] },
          stage:  '$currentStage',
        },
        count: { $sum: 1 },
      }},
    ]),
    // Hired candidates by gender
    Application.aggregate([
      { $match: { ...appFilter, status: 'hired' } },
      { $lookup: { from: 'candidates', localField: 'candidateId', foreignField: '_id', as: 'cand' } },
      { $unwind: { path: '$cand', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$cand.gender', 'not_disclosed'] }, count: { $sum: 1 } } },
    ]),
  ]);

  // Source breakdown
  const sourceRows = await Application.aggregate([
    { $match: appFilter },
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Stage funnel for diversity (shortlisted vs applied by gender)
  const genderStageMap = {};
  stageByGender.forEach(r => {
    const g = r._id.gender || 'not_disclosed';
    if (!genderStageMap[g]) genderStageMap[g] = {};
    genderStageMap[g][r._id.stage] = r.count;
  });

  const genderHireMap = {};
  hiresByGender.forEach(r => { genderHireMap[r._id || 'not_disclosed'] = r.count; });

  const totalCandidates = genderRows.reduce((s, r) => s + r.count, 0);
  const totalApps = sourceRows.reduce((s, r) => s + r.count, 0);
  const totalHired = hiresByGender.reduce((s, r) => s + r.count, 0);

  const genderBreakdown = genderRows.map(r => {
    const g = r._id || 'not_disclosed';
    const applied      = Object.values(genderStageMap[g] || {}).reduce((s, c) => s + c, 0);
    const shortlisted  = (genderStageMap[g] || {})['Shortlisted'] || 0;
    const hired        = genderHireMap[g] || 0;
    return {
      gender: g,
      total: r.count,
      pct: totalCandidates > 0 ? Math.round((r.count / totalCandidates) * 100) : 0,
      applied, shortlisted, hired,
      shortlistRate: applied > 0 ? Math.round((shortlisted / applied) * 100) : 0,
      hireRate:      applied > 0 ? Math.round((hired / applied) * 100) : 0,
    };
  });

  res.json({
    success: true,
    data: {
      totalCandidates,
      totalApplications: totalApps,
      totalHired,
      genderBreakdown,
      sourceBreakdown: sourceRows.map(r => ({ source: r._id || 'direct', count: r.count })),
    },
  });
}));

// ── POST /api/stats/diversity/seed — assign random gender to candidates without one ──
router.post('/diversity/seed', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const Candidate = require('../models/Candidate');
  const isSuperAdmin = req.user.role === 'super_admin';
  const tid = req.user.tenantId;

  const candFilter = isSuperAdmin
    ? { deletedAt: null, gender: { $in: [null, ''] } }
    : { tenantId: tid, deletedAt: null, gender: { $in: [null, ''] } };
  const candidates = await Candidate.find(candFilter).select('_id').lean();
  if (!candidates.length) return res.json({ success: true, message: 'All candidates already have gender set.', updated: 0 });

  // Realistic distribution: ~50% male, ~38% female, ~7% prefer_not_to_say, ~5% non-binary
  const GENDERS = ['male','male','male','male','male','female','female','female','female','prefer_not_to_say','non-binary'];
  let updated = 0;
  await Promise.all(candidates.map((c, i) => {
    const g = GENDERS[i % GENDERS.length];
    return Candidate.updateOne({ _id: c._id }, { $set: { gender: g } });
  }));
  updated = candidates.length;

  res.json({ success: true, message: `Updated ${updated} candidate gender records.`, updated });
}));

// ── Time-to-Fill Tracker ─────────────────────────────────────────────────────
// Per-job: time from job.createdAt to first Hired application movedAt
router.get('/time-to-fill', authenticate, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const matchCond = { tenantId: req.user.tenantId, deletedAt: null };
  if (startDate) matchCond.createdAt = { $gte: new Date(startDate) };
  if (endDate)   matchCond.createdAt = { ...(matchCond.createdAt || {}), $lte: new Date(endDate) };

  const Job = require('../models/Job');
  const jobs = await Job.find({ tenantId: req.user.tenantId, deletedAt: null }).select('title createdAt status').lean();

  const results = await Promise.all(jobs.slice(0, 50).map(async (job) => {
    const hiredApp = await Application.findOne({
      tenantId: req.user.tenantId,
      jobId   : job._id,
      $or: [{ currentStage: 'Hired' }, { status: 'hired' }],
      deletedAt: null,
    }).sort({ updatedAt: -1 }).lean();

    const hiredAt = hiredApp?.updatedAt;
    const daysToFill = hiredAt
      ? Math.round((new Date(hiredAt) - new Date(job.createdAt)) / 86400000)
      : null;

    const appCount = await Application.countDocuments({ jobId: job._id, deletedAt: null });

    return {
      jobId     : job._id,
      title     : job.title,
      status    : job.status,
      createdAt : job.createdAt,
      hiredAt,
      daysToFill,
      appCount,
    };
  }));

  const filled   = results.filter(r => r.daysToFill !== null);
  const avgDays  = filled.length ? Math.round(filled.reduce((s, r) => s + r.daysToFill, 0) / filled.length) : null;

  res.json({ success: true, data: { jobs: results, avgDaysToFill: avgDays, filledCount: filled.length } });
}));

// ── Pipeline Heatmap ─────────────────────────────────────────────────────────
// Returns application counts grouped by (day-of-week, stage) for the last N days
router.get('/pipeline-heatmap', authenticate, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const days   = Math.min(parseInt(req.query.days || 90, 10), 365);
  const since  = new Date(Date.now() - days * 86400000);

  const raw = await Application.aggregate([
    { $match: { tenantId: req.user.tenantId, deletedAt: null, createdAt: { $gte: since } } },
    { $group: {
      _id: {
        week   : { $week: '$createdAt' },
        year   : { $year: '$createdAt' },
        dayOfWeek: { $dayOfWeek: '$createdAt' },
        stage  : '$currentStage',
      },
      count: { $sum: 1 },
    }},
    { $project: {
      week   : '$_id.week',
      year   : '$_id.year',
      day    : '$_id.dayOfWeek',
      stage  : '$_id.stage',
      count  : 1,
      _id    : 0,
    }},
    { $sort: { year: 1, week: 1 } },
  ]);

  // Also get daily totals for the calendar view
  const daily = await Application.aggregate([
    { $match: { tenantId: req.user.tenantId, deletedAt: null, createdAt: { $gte: since } } },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      count: { $sum: 1 },
    }},
    { $project: { date: '$_id', count: 1, _id: 0 } },
    { $sort: { date: 1 } },
  ]);

  res.json({ success: true, data: { raw, daily, days } });
}));

module.exports = router;
