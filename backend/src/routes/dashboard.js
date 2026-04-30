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
const { authenticate } = require('../middleware/auth');
const { allowRoles }  = require('../middleware/rbac');
const asyncHandler    = require('../utils/asyncHandler');
const AppError        = require('../utils/AppError');
const { exportToExcel } = require('../utils/exportToExcel');
const { cacheRoute }  = require('../middleware/cache');


// ── Constants ────────────────────────────────────────────────────────────────
const STAGE_DONE    = 'selected';
const STAGE_OFFER   = 'offer_extended';
const STAGE_IV      = 'interview_scheduled';
const STAGES_ACTIVE = ['invited', 'applied', 'screening', 'shortlisted', 'interview_scheduled', 'interview_completed', 'offer_extended'];
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
 */
function tenantFilter(req) {
  if (req.user.role === 'super_admin') return {};
  return { tenantId: new mongoose.Types.ObjectId(req.user.tenantId) };
}

async function countUniqueCandidateProfiles(candidateFilter, userFilter) {
  const [candidateDocs, userDocs, appDocs] = await Promise.all([
    Candidate.find({ deletedAt: null, ...candidateFilter }).select('_id email phone name userId').lean(),
    User.find({ deletedAt: null, role: 'candidate', ...userFilter }).select('_id email phone name').lean(),
    Application.find({ deletedAt: null, ...candidateFilter }).select('candidateId candidateEmail candidatePhone candidateName email').lean(),
  ]);

  const keys = new Set();
  const userToCandidate = new Map(); // userId -> candidateKey
  const getCandidateKey = (email, phone, name) => {
    if (email) return `email:${email.toLowerCase().trim()}`;
    if (phone) return `phone:${phone.trim()}`;
    if (name) return `name:${name.toLowerCase().trim()}`;
    return null;
  };

  // 1. Process users
  userDocs.forEach(d => {
    const k = getCandidateKey(d.email, d.phone, d.name) || `user:${d._id}`;
    keys.add(k);
    userToCandidate.set(String(d._id), k);
  });

  // 2. Process candidates (link to users via userId)
  candidateDocs.forEach(d => {
    let k = getCandidateKey(d.email, d.phone, d.name);
    if (!k && d.userId && userToCandidate.has(String(d.userId))) {
      k = userToCandidate.get(String(d.userId));
    }
    if (!k) k = `cand:${d._id}`;
    keys.add(k);
  });

  // 3. Process applications
  appDocs.forEach(d => {
    const k = getCandidateKey(d.candidateEmail || d.email, d.candidatePhone, d.candidateName) || (d.candidateId ? `cand:${d.candidateId}` : null);
    if (k) keys.add(k);
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

async function orgNameMap() {
  const [tenants, orgs] = await Promise.all([
    Tenant.find({}).select('name').lean(),
    Organization.find({}).select('name').lean(),
  ]);
  return {
    ...Object.fromEntries(tenants.map(t => [String(t._id), t.name])),
    ...Object.fromEntries(orgs.map(o => [String(o._id), o.name])),
  };
}

async function buildApplicationFilters(req) {
  const filter = { ...tenantFilter(req), deletedAt: null };
  const { stage, source, jobId, startDate, endDate, status, recruiterId, minScore } = req.query;
  if (stage) filter.currentStage = stage;
  if (source) filter.source = source;
  if (status) filter.status = status;
  if (minScore !== undefined && minScore !== '') {
    const score = Number(minScore);
    if (!Number.isNaN(score)) filter.aiMatchScore = { $gte: score };
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
  const assignedRecruiterId = (candidate?.assignedRecruiterId || user?.assignedRecruiterId)?.toString?.() || '';
  return {
    recordType: app ? 'Application' : (candidate?._id ? 'Candidate Profile' : 'Candidate Account'),
    applicationId: app?._id?.toString() || '',
    candidateId: candidate?._id?.toString() || '',
    userId: user?._id?.toString() || candidate?.userId?.toString() || '',
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
    aiMatchScore: app?.aiMatchScore ?? '',
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
    candidatesHired : Math.max(BASE_HIRED,   hiredCount),
    openJobs        : Math.max(BASE_JOBS,     jobsCount),
    clientsServed   : Math.max(BASE_CLIENTS,  (clientsRaw || []).length),
    candidatesInPool: Math.max(50,            totalUsers),
  };
  publicCacheAt = Date.now();
  res.json(publicCache);
}));

// ── Admin/SuperAdmin Stats ───────────────────────────────────────────────────

/* GET /api/dashboard/stats */
router.get('/stats', authenticate, allowRoles('admin', 'super_admin'), cacheRoute(60), asyncHandler(async (req, res) => {
  const isSuperAdmin = req.user.role === 'super_admin';
  // platform=true → super_admin sees ALL orgs; default scopes to own org for accurate numbers
  const platformWide = isSuperAdmin && req.query.platform === 'true';
  const tenantScope  = { tenantId: req.user.tenantId };
  const orgF  = platformWide ? {} : tenantScope;
  const candF = platformWide ? { role: 'candidate' } : { role: 'candidate', ...tenantScope };

  const del = { deletedAt: null };
  const [candidates, recruiters, openJobs, applications, hired] = await Promise.all([
    countUniqueCandidateProfiles(platformWide ? {} : tenantScope, platformWide ? { isActive: true } : { ...tenantScope, isActive: true }),
    User.countDocuments({ ...orgF, role: 'recruiter', isActive: true }),
    Job.countDocuments({ ...orgF, status: 'active', ...del }),
    Application.countDocuments({ ...orgF, ...del }),
    Application.countDocuments({ ...orgF, currentStage: 'Hired', ...del }),
  ]);

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

  // Fill rate = jobs with at least one hire / total non-draft jobs
  const fillRate = totalJobs > 0 ? Math.round((hired / totalJobs) * 100) : 0;

  const pct = (n, o) => o > 0 ? Math.round(((n - o) / o) * 100) : (n > 0 ? 100 : 0);

  res.json({ success: true, data: {
    candidates, recruiters, openJobs, applications,
    placements: hired, fillRate, avgPerJob,
    activePipeline: active,
    appsLast30,
    placementsLast30: hiredLast30,
    platformWide,
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

/* GET /api/dashboard/pipeline-health */
router.get('/pipeline-health', authenticate, allowRoles('admin', 'super_admin'), cacheRoute(60), asyncHandler(async (req, res) => {
  const orgF  = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };
  const stages = ['Applied', 'Screening', 'Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired'];

  // Compute stage counts AND avg time-to-hire in one aggregation
  const [stageAgg, timeAgg] = await Promise.all([
    Application.aggregate([
      { $match: orgF },
      { $group: { _id: '$currentStage', count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { ...orgF, currentStage: 'Hired' } },
      {
        $project: {
          daysToHire: {
            $divide: [
              { $subtract: [
                { $ifNull: [{ $arrayElemAt: [{ $filter: { input: '$stageHistory', as: 'h', cond: { $eq: ['$$h.stage', 'Hired'] } } }, -1] }, '$updatedAt'] },
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

/* GET /api/dashboard/recruiter-leaderboard */
router.get('/recruiter-leaderboard', authenticate, allowRoles('admin', 'super_admin'), cacheRoute(120), asyncHandler(async (req, res) => {
  const orgF = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };
  const recruiters = await User.find({ ...orgF, role: { $in: ['recruiter', 'admin'] } }).select('_id name photoUrl').lean();

  if (!recruiters.length) return res.json({ success: true, data: [] });

  // Single aggregation: group applications by (jobId, stage) then join jobs to get assignedRecruiters
  const [jobStats, appStats] = await Promise.all([
    // Per-recruiter: how many active/closed jobs they're assigned to
    Job.aggregate([
      { $match: { ...orgF, status: { $in: ['active', 'closed'] } } },
      { $unwind: '$assignedRecruiters' },
      { $group: { _id: '$assignedRecruiters', jobs: { $sum: 1 } } },
    ]),
    // Per-recruiter: total candidates and hires via their job assignments
    Application.aggregate([
      { $match: orgF },
      { $lookup: { from: 'jobs', localField: 'jobId', foreignField: '_id', as: 'job' } },
      { $unwind: '$job' },
      { $unwind: '$job.assignedRecruiters' },
      { $group: {
          _id: '$job.assignedRecruiters',
          candidates: { $sum: 1 },
          hired: { $sum: { $cond: [{ $eq: ['$currentStage', 'Hired'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const jobMap = {};
  jobStats.forEach(r => { jobMap[String(r._id)] = r.jobs; });
  const appMap = {};
  appStats.forEach(r => { appMap[String(r._id)] = { candidates: r.candidates, hired: r.hired }; });

  const board = recruiters.map(r => {
    const rid = String(r._id);
    const { candidates = 0, hired = 0 } = appMap[rid] || {};
    return {
      rank: 0, recruiterId: r._id, name: r.name, photoUrl: r.photoUrl,
      jobs: jobMap[rid] || 0, candidates, hired,
      conversion: candidates > 0 ? `${Math.round((hired / candidates) * 100)}%` : '0%',
    };
  });

  board.sort((a, b) => b.hired - a.hired || b.candidates - a.candidates);
  board.forEach((r, i) => r.rank = i + 1);
  res.json({ success: true, data: board });
}));

/* GET /api/dashboard/top-skills */
router.get('/top-skills', authenticate, allowRoles('admin', 'super_admin'), cacheRoute(120), asyncHandler(async (req, res) => {
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
router.get('/availability-pool', authenticate, allowRoles('admin', 'super_admin'), cacheRoute(120), asyncHandler(async (req, res) => {
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
router.get('/jobs-breakdown', authenticate, allowRoles('admin', 'super_admin'), cacheRoute(60), asyncHandler(async (req, res) => {
  const match = req.user.role === 'super_admin' ? { status: 'active' } : { tenantId: req.user.tenantId, status: 'active' };
  const raw = await Job.aggregate([{ $match: match }, { $group: { _id: '$urgency', count: { $sum: 1 } } }]);
  const map = { high: 0, medium: 0, low: 0 };
  raw.forEach(r => { if (r._id && map[r._id] !== undefined) map[r._id] = r.count; });
  res.json({ success: true, data: { byUrgency: Object.entries(map).map(([urgency, count]) => ({ urgency, count })) } });
}));

/* GET /api/dashboard/analytics */
router.get('/analytics', authenticate, allowRoles('admin', 'super_admin'), cacheRoute(60), asyncHandler(async (req, res) => {
  const orgF = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };
  const { startDate, endDate } = req.query;
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate)   dateFilter.$lte = new Date(endDate);
  const dateF = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

  // Compute avgTimeToHire via aggregation — avoids fetching all hired docs to Node memory
  const [totalApps, hiredApps, rejectedApps, byStage, bySource, topJobs, timeAgg] = await Promise.all([
    Application.countDocuments({ ...orgF, ...dateF }),
    Application.countDocuments({ ...orgF, ...dateF, currentStage: 'Hired' }),
    Application.countDocuments({ ...orgF, ...dateF, currentStage: 'Rejected' }),
    Application.aggregate([
      { $match: { ...orgF, ...dateF } },
      { $group: { _id: '$currentStage', count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { ...orgF, ...dateF } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Application.aggregate([
      { $match: { ...orgF, ...dateF } },
      { $group: { _id: '$jobId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 5 },
      { $lookup: { from: 'jobs', localField: '_id', foreignField: '_id', as: 'job' } },
      { $unwind: '$job' },
      { $project: { title: '$job.title', count: 1 } },
    ]),
    Application.aggregate([
      { $match: { ...orgF, currentStage: 'Hired' } },
      { $project: {
          daysToHire: { $divide: [{ $subtract: ['$updatedAt', '$createdAt'] }, 86400000] },
        },
      },
      { $group: { _id: null, avg: { $avg: '$daysToHire' }, count: { $sum: 1 } } },
    ]),
  ]);

  const avgTimeToHire = timeAgg[0]?.count > 0 ? Math.round(timeAgg[0].avg || 0) : 0;

  res.json({ success: true, data: {
    overview: {
      totalApplications: totalApps,
      hired: hiredApps,
      rejected: rejectedApps,
      inProgress: totalApps - hiredApps - rejectedApps,
      conversionRate: totalApps > 0 ? Math.round((hiredApps / totalApps) * 100) : 0,
      avgTimeToHire,
    },
    byStage: byStage.map(s => ({ stage: s._id, count: s.count })),
    bySource: bySource.map(s => ({ source: s._id || 'direct', count: s.count })),
    topJobs: topJobs.map(j => ({ jobId: j._id, title: j.title, applications: j.count })),
  }});
}));

/* GET /api/dashboard/trends
   Get application counts per day for the last 14 days.
*/
router.get('/trends', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const orgF = req.user.role === 'super_admin' ? {} : { tenantId: req.user.tenantId };
  const ago14 = new Date();
  ago14.setDate(ago14.getDate() - 14);
  ago14.setHours(0, 0, 0, 0);

  const raw = await Application.aggregate([
    { $match: { ...orgF, createdAt: { $gte: ago14 } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const map = {};
  raw.forEach(r => { map[r._id] = r.count; });

  const data = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    data.push({
      date: key,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: map[key] || 0
    });
  }

  res.json({ success: true, data });
}));

/* GET /api/dashboard/candidate-records
   Joined super-admin/admin view of every candidate account/profile/application.
*/
router.get('/candidate-records', authenticate, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const tf = tenantFilter(req);
  const fetchAll = req.query.limit === 'all' || req.query.limit === '0';
  const limit = Math.min(parseInt(req.query.limit, 10) || 1000, 5000);
  const search = String(req.query.search || '').trim().toLowerCase();

  const [apps, candidateProfiles, candidateUsers, tenantMap] = await Promise.all([
    Application.find({ ...tf, deletedAt: null })
      .select('candidateId jobId currentStage status createdAt updatedAt candidateEmail candidatePhone candidateName email source tenantId stageHistory rejectionReason')
      .populate({ path: 'jobId', select: 'title tenantId' })
      .populate({ path: 'candidateId', select: 'name email phone title currentCompany location skills tenantId createdAt' })
      .sort({ createdAt: -1 })
      .lean(),
    Candidate.find({ ...tf, deletedAt: null })
      .select('name email phone title currentCompany location skills tenantId createdAt userId parsedProfile.totalExperienceYears')
      .lean(),
    User.find({ ...tf, role: 'candidate', isActive: true })
      .select('name email phone role tenantId createdAt currentCompany jobRole location skills')
      .lean(),
    orgNameMap(),
  ]);

  // Map for deduplication and grouping
  const candidateMap = new Map(); // key -> { profile, user, apps: [], latestApp, userId }

  const getCandidateKey = (email, phone, name) => {
    if (email) return `email:${email.toLowerCase().trim()}`;
    if (phone) return `phone:${phone.trim()}`;
    if (name) return `name:${name.toLowerCase().trim()}`;
    return null;
  };

  // 1. Initialize from User accounts
  for (const u of candidateUsers) {
    const key = getCandidateKey(u.email, u.phone, u.name) || `user:${u._id}`;
    if (!candidateMap.has(key)) {
      candidateMap.set(key, { user: u, profile: null, apps: [], latestApp: null, userId: String(u._id) });
    }
  }

  // Map userId to primary key for linking profiles
  const userToKey = new Map();
  for (const [key, val] of candidateMap.entries()) {
    if (val.userId) userToKey.set(val.userId, key);
  }

  // 2. Merge with Candidate profiles
  for (const p of candidateProfiles) {
    let key = getCandidateKey(p.email, p.phone, p.name);
    if (!key && p.userId && userToKey.has(String(p.userId))) {
      key = userToKey.get(String(p.userId));
    }
    if (!key) key = `cand:${p._id}`;

    if (!candidateMap.has(key)) {
      candidateMap.set(key, { user: null, profile: p, apps: [], latestApp: null, userId: p.userId ? String(p.userId) : null });
    } else {
      const entry = candidateMap.get(key);
      if (!entry.profile) entry.profile = p;
      if (!entry.userId && p.userId) entry.userId = String(p.userId);
    }
  }

  // 3. Group all Applications
  for (const app of apps) {
    const cand = app.candidateId && typeof app.candidateId === 'object' ? app.candidateId : {};
    const email = cand.email || app.candidateEmail || app.email || '';
    const phone = cand.phone || app.candidatePhone || '';
    const name = cand.candidateName || cand.name || app.candidateName || '';
    
    let key = getCandidateKey(email, phone, name);
    if (!key && cand._id) {
      // Check if this candidate profile is already mapped
      for (const [k, v] of candidateMap.entries()) {
        if (v.profile && String(v.profile._id) === String(cand._id)) {
          key = k; break;
        }
      }
    }
    if (!key) key = cand._id ? `cand:${cand._id}` : `app:${app._id}`;

    if (!candidateMap.has(key)) {
      candidateMap.set(key, { user: null, profile: cand._id ? cand : null, apps: [app], latestApp: app, userId: cand.userId ? String(cand.userId) : null });
    } else {
      const entry = candidateMap.get(key);
      entry.apps.push(app);
      if (!entry.latestApp || new Date(app.createdAt) > new Date(entry.latestApp.createdAt)) {
        entry.latestApp = app;
      }
    }
  }

  const rows = [];
  for (const entry of candidateMap.values()) {
    const { profile, user, apps: candApps, latestApp } = entry;
    const primary = profile || user || (latestApp?.candidateId && typeof latestApp.candidateId === 'object' ? latestApp.candidateId : {});
    
    const row = profileRow({
      candidate: profile || (latestApp?.candidateId && typeof latestApp.candidateId === 'object' ? latestApp.candidateId : {}),
      user: user || {},
      app: latestApp,
      job: latestApp?.jobId && typeof latestApp.jobId === 'object' ? latestApp.jobId : null,
      orgName: tenantMap[String(primary.tenantId)] || tenantMap[String(latestApp?.tenantId)] || '',
    });

    row.isApplied = candApps.length > 0;
    row.applicationCount = candApps.length;
    row.allApplications = candApps.map(a => ({
      id: a._id?.toString() || a.id,
      jobId: a.jobId?._id?.toString() || a.jobId,
      jobTitle: a.jobId?.title || 'Unknown Job',
      stage: a.currentStage,
      status: a.status,
      appliedAt: a.createdAt,
      updatedAt: a.updatedAt,
      rejectionReason: a.rejectionReason,
      stageHistory: a.stageHistory,
    }));
    
    rows.push(row);
  }

  const filtered = search
    ? rows.filter(r => [r.candidateName, r.email, r.phone, r.jobTitle, r.organisation, r.source, r.stage].some(v => String(v || '').toLowerCase().includes(search)))
    : rows;

  filtered.sort((a, b) => new Date(b.appliedAt || b.profileCreatedAt || b.joinedAt || 0) - new Date(a.appliedAt || a.profileCreatedAt || a.joinedAt || 0));
  res.json({ success: true, data: fetchAll ? filtered : filtered.slice(0, limit), total: filtered.length });
}));

/* GET /api/dashboard/applicants
   Applicants are application rows only: one row per job application.
*/
router.get('/applicants', authenticate, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const fetchAll = req.query.limit === 'all' || req.query.limit === '0';
  const limit = Math.min(parseInt(req.query.limit, 10) || 1000, 5000);
  const search = String(req.query.search || '').trim().toLowerCase();
  const filter = await buildApplicationFilters(req);

  const appQuery = Application.find(filter)
    .select('candidateId jobId currentStage status createdAt updatedAt candidateEmail candidatePhone candidateName email source tenantId stageHistory rejectionReason matchBreakdown assessmentScore assessmentViolations tags inviteStatus inviteMessage screeningAnswers')
    .populate({ path: 'jobId', select: 'title company companyName location tenantId department jobType salaryMin salaryMax salaryCurrency salaryType assignedRecruiters' })
    .populate({ path: 'candidateId', select: 'name email phone title currentCompany location skills tenantId createdAt' })
    .sort({ createdAt: -1 })
    .lean();
  if (!fetchAll) appQuery.limit(limit);

  const [apps, tenantMap] = await Promise.all([
    appQuery,
    orgNameMap(),
  ]);

  const emails = [...new Set(apps.map(a => a.candidateId?.email || a.email).filter(Boolean).map(e => e.toLowerCase()))];
  const users = emails.length
    ? await User.find({ role: 'candidate', email: { $in: emails } }).select('name email phone role tenantId createdAt').lean()
    : [];
  const usersByEmail = new Map(users.map(u => [u.email.toLowerCase(), u]));

  const rows = apps.map(app => {
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

  const filtered = search
    ? rows.filter(r => [r.candidateName, r.email, r.phone, r.jobTitle, r.jobCompany, r.organisation, r.stage, r.source, r.skills, r.currentCompany].some(v => String(v || '').toLowerCase().includes(search)))
    : rows;

  res.json({ success: true, data: filtered, total: filtered.length });
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
    Application.countDocuments({ jobId: { $in: ids } }),
    Application.countDocuments({ jobId: { $in: ids }, currentStage: 'Interview Round 1' }),
    Application.countDocuments({ jobId: { $in: ids }, currentStage: 'Offer' }),
    Application.countDocuments({ jobId: { $in: ids }, currentStage: 'Hired' }),
  ]);
  const active = await Application.countDocuments({ jobId: { $in: ids }, currentStage: { $in: STAGES_ACTIVE } });
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
      Application.countDocuments({ jobId: job._id }),
      Application.countDocuments({ jobId: job._id, currentStage: { $in: ['Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired'] } }),
      Application.countDocuments({ jobId: job._id, currentStage: { $in: ['Interview Round 2', 'Offer', 'Hired'] } }),
      Application.countDocuments({ jobId: job._id, currentStage: 'Hired' }),
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

  const match = { ...tf, createdAt: dateRange };
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
  const match = { ...tf, createdAt: buildDateRange(startDate, endDate) };
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
  const dateRange = buildDateRange(startDate, endDate);

  const raw = await Application.aggregate([
    { $match: { ...tf, createdAt: dateRange } },
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

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
    }),
    Application.countDocuments({
      ...tf,
      currentStage: 'Hired',
      'stageHistory.stage': 'Offer',
      createdAt: dateRange,
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
    ...tf, currentStage: 'Rejected', createdAt: buildDateRange(startDate, endDate),
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
      Application.countDocuments({ jobId: { $in: myJobIds }, createdAt: dateRange }),
      Application.countDocuments({ jobId: { $in: myJobIds }, createdAt: dateRange, 'stageHistory.stage': 'Shortlisted' }),
      Application.countDocuments({ jobId: { $in: myJobIds }, createdAt: dateRange, 'stageHistory.stage': 'Offer' }),
      Application.countDocuments({ jobId: { $in: myJobIds }, createdAt: dateRange, currentStage: 'Hired' }),
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

module.exports = router;
