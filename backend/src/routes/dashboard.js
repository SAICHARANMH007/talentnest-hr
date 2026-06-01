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
const PaymentRecord   = require('../models/PaymentRecord');
const { cacheRoute }  = require('../middleware/cache');


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
    'name email phone title currentCompany location preferredLocation skills experience relevantExperience',
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

  // Exact ID or Email tracking for unified candidate pipeline
  const { candidateId, email } = req.query;
  if (email) {
    const matchedCands = await Candidate.find({ email: email.toLowerCase().trim(), deletedAt: null }).select('_id').lean();
    const cIds = matchedCands.map(c => c._id);
    filter.candidateId = { $in: cIds };
  } else if (candidateId) {
    filter.candidateId = candidateId;
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
    name: candidate?.name || user?.name || '',
    candidateName: candidate?.name || user?.name || '',
    email: candidate?.email || user?.email || '',
    phone: candidate?.phone || user?.phone || '',
    title: candidate?.title || user?.title || user?.jobRole || '',
    currentCompany: candidate?.currentCompany || user?.currentCompany || '',
    location: candidate?.location || user?.location || '',
    preferredLocation: candidate?.preferredLocation || user?.preferredLocation || '',
    skills: csv(candidate?.skills?.length ? candidate.skills : user?.skills),
    experience: candidate?.experience ?? user?.experience ?? parsed.totalExperienceYears ?? '',
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
    recent: recentApps,
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
    recent,
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
    pipeline.unshift({
      $match: {
        $or: [
          { name: searchRe },
          { email: searchRe },
          { phone: searchRe },
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
  const candFilter = { ...tenantFilter(req), deletedAt: null };
  candFilter.$or = [{ name: searchRe }, { email: searchRe }, { phone: searchRe }];
  const matchingCandidates = await Candidate.find(candFilter).select('_id').lean();
  filter.$or = [
    { candidateId: { $in: matchingCandidates.map(c => c._id) } },
    { candidateName: searchRe }, { candidateEmail: searchRe },
    { candidatePhone: searchRe }, { email: searchRe },
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

  // Fallback: for any app where candidateId wasn't populated (legacy data), look up by email
  const appsNeedingFallback = apps.filter(a => !a.candidateId?._id);
  const fallbackEmails = [...new Set(appsNeedingFallback.map(a => a.email).filter(Boolean).map(e => e.toLowerCase()))];
  const fallbackUsers  = fallbackEmails.length
    ? await User.find({ role: 'candidate', email: { $in: fallbackEmails } }).select('name email phone tenantId').lean()
    : [];
  const usersByEmail = new Map(fallbackUsers.map(u => [u.email.toLowerCase(), u]));

  const rows = apps.map(app => {
    const candidate = app.candidateId && typeof app.candidateId === 'object' ? app.candidateId : {};
    const job       = app.jobId       && typeof app.jobId       === 'object' ? app.jobId       : {};
    return profileRow({
      candidate,
      user   : usersByEmail.get((candidate.email || app.email || '').toLowerCase()) || {},
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

  const emails = [...new Set(apps.map(a => a.candidateId?.email).filter(Boolean).map(e => e.toLowerCase()))];
  const users = emails.length
    ? await User.find({ role: 'candidate', email: { $in: emails } }).select('-password -passwordHash').lean()
    : [];
  const usersByEmail = new Map(users.map(u => [u.email.toLowerCase(), u]));

  let rows = apps.map(app => {
    const candidate = app.candidateId && typeof app.candidateId === 'object' ? app.candidateId : {};
    const job = app.jobId && typeof app.jobId === 'object' ? app.jobId : {};
    return profileRow({
      candidate,
      user: usersByEmail.get((candidate.email || '').toLowerCase()) || {},
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

/* GET /api/dashboard/recruiter-stats */
router.get('/recruiter-stats', authenticate, allowRoles('recruiter'), asyncHandler(async (req, res) => {
  const myJobs = await Job.find({ assignedRecruiters: req.user._id }).select('_id').lean();
  const ids    = myJobs.map(j => j._id);
  const [total, inInterview, offerExtended, hired] = await Promise.all([
    Application.countDocuments({ jobId: { $in: ids }, deletedAt: null }),
    Application.countDocuments({ jobId: { $in: ids }, currentStage: 'Interview Round 1', deletedAt: null }),
    Application.countDocuments({ jobId: { $in: ids }, currentStage: 'Offer', deletedAt: null }),
    Application.countDocuments({ jobId: { $in: ids }, currentStage: 'Hired', deletedAt: null }),
  ]);
  const active = await Application.countDocuments({ jobId: { $in: ids }, currentStage: { $in: STAGES_ACTIVE }, deletedAt: null });
  res.json({ success: true, data: {
    jobsPosted: myJobs.length, totalApplicants: total,
    inInterview, offerExtended, hired,
    conversionRate: total > 0 ? Math.round((hired / total) * 100) : 0,
    activePipeline: active,
    subtitle: `${active} active candidates in pipeline`,
    changes: await (async () => {
      const ago30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const [appsNew, appsOld, jobsNew] = await Promise.all([
        Application.countDocuments({ jobId: { $in: ids }, createdAt: { $gte: ago30 } }),
        Application.countDocuments({ jobId: { $in: ids }, createdAt: { $lt: ago30 } }),
        Job.countDocuments({ assignedRecruiters: req.user._id, createdAt: { $gte: ago30 } }),
      ]);
      const pct = (n, o) => o > 0 ? Math.round(((n - o) / o) * 100) : (n > 0 ? 100 : 0);
      return { jobsPosted: jobsNew, totalApplicants: pct(appsNew, appsOld) };
    })(),
  }});
}));

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

/* GET /api/dashboard/candidate-upcoming-interviews */
router.get('/candidate-upcoming-interviews', authenticate, allowRoles('candidate'), asyncHandler(async (req, res) => {
  const now = new Date(), weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const Candidate = require('../models/Candidate');
  const cDocs = await Candidate.find({ email: req.user.email, deletedAt: null }).select('_id').lean();
  const cIds = cDocs.map(c => c._id);
  const apps = await Application.find({
    candidateId: { $in: cIds },
    'interviewRounds.scheduledAt': { $gte: now, $lte: weekEnd },
  }).populate('jobId', 'title').lean();

  const list = [];
  apps.forEach(app => {
    (app.interviewRounds || []).forEach(iv => {
      if (iv.scheduledAt && new Date(iv.scheduledAt) >= now && new Date(iv.scheduledAt) <= weekEnd) {
        list.push({ jobTitle: app.jobId?.title, scheduledAt: iv.scheduledAt, format: iv.format, videoLink: iv.videoLink });
      }
    });
  });
  res.json({ success: true, data: { upcoming: list, count: list.length } });
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
   For each recruiter in this tenant, compute key metrics.
*/
router.get('/recruiter-performance', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);
  const { startDate, endDate, recruiterId } = req.query;
  const dateRange = buildDateRange(startDate, endDate);

  const recruiterQuery = { ...tf, role: 'recruiter', isActive: true };
  if (recruiterId) recruiterQuery._id = new mongoose.Types.ObjectId(recruiterId);
  const recruiters = await User.find(recruiterQuery).lean();

  const data = await Promise.all(recruiters.map(async (r) => {
    const myJobIds = (await Job.find({ assignedRecruiters: r._id, ...tf }).select('_id').lean()).map(j => j._id);

    const [jobsAssigned, candidatesAdded, shortlisted, offers, hired] = await Promise.all([
      myJobIds.length,
      Application.countDocuments({ jobId: { $in: myJobIds }, createdAt: dateRange, deletedAt: null }),
      Application.countDocuments({ jobId: { $in: myJobIds }, createdAt: dateRange, 'stageHistory.stage': 'Shortlisted', deletedAt: null }),
      Application.countDocuments({ jobId: { $in: myJobIds }, createdAt: dateRange, 'stageHistory.stage': 'Offer', deletedAt: null }),
      Application.countDocuments({ jobId: { $in: myJobIds }, createdAt: dateRange, currentStage: 'Hired', deletedAt: null }),
    ]);

    // Avg days Applied → Shortlisted
    let avgDaysToShortlist = 0;
    if (shortlisted > 0) {
      const slApps = await Application.find({
        jobId: { $in: myJobIds },
        createdAt: dateRange,
        'stageHistory.stage': 'Shortlisted',
      }).select('createdAt stageHistory').lean();

      const daysList = slApps.map(app => {
        const slEntry = (app.stageHistory || []).find(h => h.stage === 'Shortlisted');
        if (!slEntry) return null;
        return (new Date(slEntry.movedAt) - new Date(app.createdAt)) / 86400000;
      }).filter(d => d !== null && d >= 0);

      if (daysList.length > 0) {
        avgDaysToShortlist = parseFloat((daysList.reduce((s, d) => s + d, 0) / daysList.length).toFixed(1));
      }
    }

    return {
      recruiterId       : r._id,
      recruiterName     : r.name,
      jobsAssigned      : myJobIds.length,
      candidatesAdded,
      shortlisted,
      offers,
      hired,
      avgDaysToShortlist,
    };
  }));

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
    matchStage.$and = [
      { $or: [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
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

  const tid = req.user.tenantId;
  const { startDate, endDate } = req.query;

  // Date filter for applications
  const dateMatch = {};
  if (startDate) dateMatch.$gte = new Date(startDate);
  if (endDate)   dateMatch.$lte = new Date(endDate);
  const appFilter = { tenantId: tid, deletedAt: null };
  if (Object.keys(dateMatch).length) appFilter.createdAt = dateMatch;

  // Gender breakdown from applications → candidates
  const [genderRows, stageByGender, hiresByGender] = await Promise.all([
    // Overall gender breakdown of all candidates in pool
    Candidate.aggregate([
      { $match: { tenantId: tid, deletedAt: null } },
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

// ── Time-to-Fill Tracker ─────────────────────────────────────────────────────
// Per-job: time from job.createdAt to first Hired application movedAt
router.get('/time-to-fill', ...guard, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
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
      status  : 'hired',
      deletedAt: null,
    }).sort({ createdAt: 1 }).lean();

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
router.get('/pipeline-heatmap', ...guard, asyncHandler(async (req, res) => {
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
