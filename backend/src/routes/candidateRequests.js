'use strict';
const express      = require('express');
const router       = express.Router();
const CandidateRequest = require('../models/CandidateRequest');
const User         = require('../models/User');
const { authMiddleware }  = require('../middleware/auth');
const { tenantGuard }     = require('../middleware/tenantGuard');
const { allowRoles }      = require('../middleware/rbac');
const { getPagination, paginatedResponse } = require('../middleware/paginate');
const asyncHandler = require('../utils/asyncHandler');
const AppError     = require('../utils/AppError');
const logger       = require('../middleware/logger');
const { sendEmailWithRetry: sendEmail } = require('../utils/email');

const guard = [authMiddleware, tenantGuard];

function normalize(r) {
  const o = r.toObject ? r.toObject() : { ...r };
  o.id = o.id || o._id?.toString();
  return o;
}

// GET /api/candidate-requests — list (superadmin=all, admin=own tenant)
router.get('/', authMiddleware, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req);
  const filter = {};
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
  if (req.query.status) filter.status = req.query.status;

  const [items, total] = await Promise.all([
    CandidateRequest.find(filter)
      .populate('tenantId', 'name')
      .populate('requestedBy', 'name email')
      .populate('submittedCandidates', 'name email phone title skills location experience currentCompany noticePeriod')
      .populate('jobId', 'title location jobType companyName')
      .sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    CandidateRequest.countDocuments(filter),
  ]);
  res.json(paginatedResponse(items.map(r => ({ ...r, id: r._id?.toString() })), total, limit, page));
}));

// GET /api/candidate-requests/:id
router.get('/:id', authMiddleware, allowRoles('admin', 'super_admin', 'recruiter'), asyncHandler(async (req, res) => {
  const filter = { _id: req.params.id };
  if (req.user.role !== 'super_admin') filter.tenantId = req.user.tenantId;
  const r = await CandidateRequest.findOne(filter)
    .populate('tenantId', 'name').populate('requestedBy', 'name email').lean();
  if (!r) throw new AppError('Request not found.', 404);
  res.json({ success: true, data: { ...r, id: r._id?.toString() } });
}));

// POST /api/candidate-requests — admin or recruiter submits request
router.post('/', ...guard,
  allowRoles('admin', 'super_admin', 'recruiter'),
  asyncHandler(async (req, res) => {
    const { roleTitle, requirements, urgency, budget, jobId } = req.body;
    if (!roleTitle) throw new AppError('roleTitle is required.', 400);

    const r = await CandidateRequest.create({
      tenantId:    req.user.tenantId,
      requestedBy: req.user.id,
      roleTitle: roleTitle.trim(),
      requirements: requirements || '',
      urgency: urgency || 'medium',
      budget: budget || '',
      status: 'pending',
      ...(jobId ? { jobId } : {}),
    });

    logger.audit('Candidate request submitted', req.user.id, req.user.tenantId, { requestId: r._id });

    // Notify centralized support/admin instead of spamming all super_admins
    const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@talentnesthr.com';
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';

    await sendEmail(
      SUPPORT_EMAIL,
      `🚨 New Candidate Request — ${roleTitle} [${(urgency || 'medium').toUpperCase()}]`,
      `<h2>New Candidate Request</h2>
      <p><b>Tenant:</b> ${req.user.tenantId}</p>
      <p><b>Role:</b> ${roleTitle}</p>
      <p><b>Urgency:</b> ${urgency || 'medium'}</p>
      <p><b>Budget:</b> ${budget || 'Not specified'}</p>
      <p><b>Requirements:</b></p><pre style="background:#f4f4f4;padding:12px;border-radius:6px">${requirements || 'None'}</pre>
      <p><b>Submitted by:</b> ${req.user.name || req.user.email}</p>
      <hr/>
      <p><a href="${FRONTEND_URL}/app/superadmin/candidate-requests">View in TalentNest Dashboard →</a></p>`
    ).catch(err => logger.error('Failed to send candidate request email', err));

    res.status(201).json({ success: true, data: normalize(r) });
  })
);

// PATCH /api/candidate-requests/:id — superadmin manages
router.patch('/:id', authMiddleware,
  allowRoles('super_admin', 'admin'),
  asyncHandler(async (req, res) => {
    const Notification = require('../models/Notification');
    const Candidate    = require('../models/Candidate');
    const allowed = ['status', 'adminNotes', 'chargeAmount', 'submittedCandidates'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));

    const reqFilter = { _id: req.params.id };
    if (req.user.role !== 'super_admin') reqFilter.tenantId = req.user.tenantId;

    const prevRequest = await CandidateRequest.findOne(reqFilter).lean();
    if (!prevRequest) throw new AppError('Request not found.', 404);

    if (updates.status === 'fulfilled') updates.fulfilledAt = new Date();

    const r = await CandidateRequest.findOneAndUpdate(reqFilter, { $set: updates }, { new: true })
      .populate('submittedCandidates', 'name email phone title');
    if (!r) throw new AppError('Request not found.', 404);

    // Notify the requesting admin when super_admin submits candidates or fulfills the request
    const candidatesSubmitted = updates.submittedCandidates?.length > 0;
    const statusChanged       = updates.status && updates.status !== prevRequest.status;

    if ((candidatesSubmitted || statusChanged) && prevRequest.requestedBy) {
      try {
        let notifTitle, notifMsg;
        if (updates.status === 'fulfilled') {
          notifTitle = '✅ Staffing Request Fulfilled';
          notifMsg   = `Your request for "${prevRequest.roleTitle}" has been fulfilled. ${r.submittedCandidates?.length || 0} candidate(s) have been assigned.`;
        } else if (candidatesSubmitted) {
          const names = (r.submittedCandidates || []).slice(0, 3).map(c => c.name).join(', ');
          notifTitle = `👥 Candidates Submitted — ${prevRequest.roleTitle}`;
          notifMsg   = `TalentNest has submitted ${r.submittedCandidates?.length || 0} candidate(s) for your request: ${names}${r.submittedCandidates?.length > 3 ? ' and more…' : ''}.`;
        } else if (updates.status === 'in_progress') {
          notifTitle = '🔄 Request In Progress';
          notifMsg   = `Your staffing request for "${prevRequest.roleTitle}" is now being processed by the TalentNest team.`;
        }

        if (notifTitle) {
          await Notification.create({
            userId   : prevRequest.requestedBy,
            tenantId : prevRequest.tenantId,
            type     : 'candidate_request',
            title    : notifTitle,
            message  : notifMsg,
            link     : '/app/candidate-requests',
          });

          // Also send email to the requesting admin
          const requester = await User.findById(prevRequest.requestedBy).select('email name').lean();
          if (requester?.email && candidatesSubmitted) {
            const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
            const candidateRows = (r.submittedCandidates || []).map(c =>
              `<tr><td style="padding:8px 12px;border-bottom:1px solid #F1F5F9"><b>${c.name}</b></td><td style="padding:8px 12px;border-bottom:1px solid #F1F5F9">${c.email||'—'}</td><td style="padding:8px 12px;border-bottom:1px solid #F1F5F9">${c.phone||'—'}</td><td style="padding:8px 12px;border-bottom:1px solid #F1F5F9">${c.title||'—'}</td></tr>`
            ).join('');
            sendEmail(requester.email,
              `👥 Candidates Submitted for Your Request — ${prevRequest.roleTitle}`,
              `<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto">
                <div style="background:linear-gradient(135deg,#032D60,#0176D3);padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
                  <div style="font-size:36px;margin-bottom:8px">👥</div>
                  <h1 style="color:#fff;margin:0;font-size:20px">Candidates Submitted!</h1>
                  <p style="color:rgba(255,255,255,0.8);margin:8px 0 0">${prevRequest.roleTitle}</p>
                </div>
                <div style="background:#F8FAFC;padding:24px 32px;border-radius:0 0 12px 12px">
                  <p>Hi ${requester.name || 'there'},</p>
                  <p>The TalentNest team has submitted <b>${r.submittedCandidates?.length || 0} candidate(s)</b> for your staffing request:</p>
                  <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;margin:16px 0">
                    <thead><tr style="background:#F1F5F9">
                      <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151">Name</th>
                      <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151">Email</th>
                      <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151">Phone</th>
                      <th style="padding:10px 12px;text-align:left;font-size:12px;color:#374151">Title</th>
                    </tr></thead>
                    <tbody>${candidateRows}</tbody>
                  </table>
                  <div style="text-align:center;margin:24px 0">
                    <a href="${FRONTEND_URL}/app/candidate-requests" style="display:inline-block;background:#0176D3;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700">
                      View in Dashboard →
                    </a>
                  </div>
                </div>
              </div>`
            ).catch(() => {});
          }
        }
      } catch (notifErr) {
        console.warn('[CandidateRequest] Notification failed (non-critical):', notifErr.message);
      }
    }

    logger.audit('Candidate request updated', req.user.id, null, { requestId: r._id, status: updates.status });
    res.json({ success: true, data: normalize(r) });
  })
);

// POST /api/candidate-requests/:id/attach-candidates — super_admin attaches candidates
router.post('/:id/attach-candidates', ...guard, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const Notification = require('../models/Notification');
  const { candidateIds, note } = req.body;
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) throw new AppError('candidateIds array required.', 400);

  const cr = await CandidateRequest.findById(req.params.id);
  if (!cr) throw new AppError('Request not found.', 404);

  // Merge new candidates (avoid duplicates)
  const existing = new Set(cr.submittedCandidates.map(String));
  candidateIds.forEach(id => existing.add(String(id)));
  cr.submittedCandidates = [...existing];
  cr.status = 'in_progress';
  if (note) cr.adminNotes = note;
  await cr.save();

  // Notify requesting admin
  if (cr.requestedBy) {
    await Notification.create({
      userId  : cr.requestedBy,
      tenantId: cr.tenantId,
      type    : 'candidate_request',
      title   : '👥 Candidates Attached to Your Request',
      message : `TalentNest HR has attached ${candidateIds.length} candidate(s) to your request "${cr.roleTitle}".`,
      link    : '/app/candidate-requests',
    }).catch(() => {});
  }

  const populated = await CandidateRequest.findById(cr._id)
    .populate('submittedCandidates', 'name email phone title skills location experience').lean();
  res.json({ success: true, data: { ...populated, id: populated._id?.toString() } });
}));

// GET /api/candidate-requests/:id/suggested-candidates
// 3-Tier Candidate Suggestion Engine — Industry Standard
//
// Tier 1 — Pipeline Intelligence: candidates similar to those already winning in the pipeline
//           for this specific job (shortlisted / interviewing).
// Tier 2 — Similar Role Applicants: candidates who applied for similar jobs (same title/skills)
//           but NOT this specific job.
// Tier 3 — Full Database Match: entire platform scored against role title + extracted skills.
//
// Every tier excludes:
//   - Candidates already attached to this request (submittedCandidates)
//   - Candidates who already applied to the linked job (cr.jobId)
//   - Duplicates (deduped by _id across all tiers)
router.get('/:id/suggested-candidates', ...guard, allowRoles('super_admin'), asyncHandler(async (req, res) => {
  const Candidate  = require('../models/Candidate');
  const Application = require('../models/Application');
  const Job        = require('../models/Job');
  const { calculateTalentMatchScore } = require('../utils/matchScore');

  // ── Load the request ─────────────────────────────────────────────────────
  const cr = await CandidateRequest.findById(req.params.id)
    .populate('submittedCandidates', '_id')
    .lean();
  if (!cr) throw new AppError('Request not found.', 404);

  const roleTitle   = (cr.roleTitle   || '').trim();
  const reqText     = ((cr.roleTitle || '') + ' ' + (cr.requirements || '')).toLowerCase();

  // ── Extract skills from freetext requirements ────────────────────────────
  const SKILL_KEYWORDS = [
    'react','angular','vue','node','nodejs','python','java','golang','ruby','php','swift','kotlin',
    'typescript','javascript','sql','mysql','postgresql','mongodb','redis','aws','gcp','azure','docker',
    'kubernetes','terraform','ansible','jenkins','git','graphql','machine learning','ai','data science',
    'analytics','excel','powerbi','tableau','sap','salesforce','recruitment','hr','talent acquisition',
    'sourcing','screening','leadership','management','product','design','ux','ui','figma','scrum',
    'agile','jira','testing','qa','devops','linux','networking','c#','dotnet','.net','flutter','dart',
  ];
  const extractedSkills = SKILL_KEYWORDS.filter(s => reqText.includes(s));

  // Build a job-like snapshot for scoring
  const jobSnapshot = {
    title : roleTitle,
    skills: extractedSkills,
  };

  // ── IDs to exclude from all results ─────────────────────────────────────
  const excludeIds = new Set(
    (cr.submittedCandidates || []).map(c => (c._id || c).toString())
  );

  // Also exclude candidates who already applied to the linked job
  let alreadyAppliedIds = new Set();
  if (cr.jobId) {
    const apps = await Application.find({ jobId: cr.jobId, deletedAt: null })
      .select('candidateId').lean();
    apps.forEach(a => { if (a.candidateId) alreadyAppliedIds.add(a.candidateId.toString()); });
    alreadyAppliedIds.forEach(id => excludeIds.add(id));
  }

  // Shared: normalise and deduplicate a candidate list
  const CANDIDATE_SELECT = '_id name email title currentCompany skills experience location noticePeriodDays availability expectedCTC candidateStatus';

  const normCandidate = (c, matchScore = 0, tier = 1) => ({
    ...c,
    id        : c._id?.toString(),
    _id       : c._id?.toString(),
    skills    : Array.isArray(c.skills) ? c.skills : [],
    matchScore: Math.round(matchScore),
    _tier     : tier,
  });

  const seen   = new Set(excludeIds); // track all IDs added so far
  const results = [];

  const addIfNew = (c, matchScore, tier) => {
    const id = c._id?.toString() || c.id?.toString();
    if (!id || seen.has(id)) return;
    seen.add(id);
    results.push(normCandidate(c, matchScore, tier));
  };

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 1 — Pipeline Intelligence
  // Who is winning on the linked job's pipeline? Find candidates like them.
  // ══════════════════════════════════════════════════════════════════════════
  const WINNING_STAGES = ['Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired'];
  let tier1Count = 0;

  if (cr.jobId) {
    // Step 1a: Get winning candidates on the linked job
    const winningApps = await Application.find({
      jobId         : cr.jobId,
      currentStage  : { $in: WINNING_STAGES },
      deletedAt     : null,
    })
      .select('candidateId')
      .limit(20)
      .lean();

    const winnerCandIds = [...new Set(winningApps.map(a => a.candidateId?.toString()).filter(Boolean))];

    if (winnerCandIds.length > 0) {
      const winners = await Candidate.find({ _id: { $in: winnerCandIds }, deletedAt: null })
        .select(CANDIDATE_SELECT)
        .lean();

      // Build a "typical winner" profile by aggregating skills across all winners
      const allWinnerSkills = [...new Set(
        winners.flatMap(w => Array.isArray(w.skills) ? w.skills : [])
      )];
      const winnerTitles = [...new Set(winners.map(w => (w.title || '').split(' ')[0]).filter(Boolean))];
      const avgExp = winners.length > 0
        ? winners.reduce((s, w) => s + (parseFloat(w.experience) || 0), 0) / winners.length
        : null;

      // Enhanced job snapshot incorporating winner traits
      const t1Snapshot = {
        title : winnerTitles[0] || roleTitle,
        skills: [...new Set([...extractedSkills, ...allWinnerSkills.slice(0, 10)])],
        experience: avgExp ? `${Math.max(0, Math.round(avgExp) - 1)}-${Math.round(avgExp) + 2}` : '',
      };

      // Step 1b: Find platform candidates similar to winners (excluding already applied)
      const skillRegexes = t1Snapshot.skills.slice(0, 8).map(s =>
        new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
      );

      const tier1Query = {
        deletedAt: null,
        _id      : { $nin: [...seen].map(id => { try { return new (require('mongoose').Types.ObjectId)(id); } catch { return null; } }).filter(Boolean) },
        $or: [
          ...(skillRegexes.length > 0 ? [{ skills: { $in: skillRegexes } }] : []),
          ...(winnerTitles.length > 0 ? [{ title: { $regex: winnerTitles[0], $options: 'i' } }] : []),
        ],
      };

      if (tier1Query.$or.length === 0) delete tier1Query.$or;

      if (tier1Query.$or) {
        const t1Cands = await Candidate.find(tier1Query)
          .select(CANDIDATE_SELECT)
          .limit(200)
          .lean();

        t1Cands
          .map(c => ({ c, score: calculateTalentMatchScore(t1Snapshot, c).score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 15)
          .forEach(({ c, score }) => { addIfNew(c, score, 1); tier1Count++; });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 2 — Similar Role Applicants
  // Candidates who applied to similar jobs (same title keywords or skills)
  // but NOT to this specific job.
  // ══════════════════════════════════════════════════════════════════════════
  let tier2Count = 0;

  if (roleTitle) {
    const titleWords = roleTitle.split(/\s+/).filter(w => w.length > 3);
    const titleRegexes = titleWords.slice(0, 3).map(w =>
      new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    );

    const similarJobQuery = { deletedAt: null, status: { $in: ['active', 'closed'] } };
    if (titleRegexes.length > 0) {
      similarJobQuery.$or = [
        { title: { $in: titleRegexes } },
        ...(extractedSkills.length > 0 ? [{ skills: { $in: extractedSkills.slice(0, 5) } }] : []),
      ];
    } else if (extractedSkills.length > 0) {
      similarJobQuery.skills = { $in: extractedSkills.slice(0, 5) };
    }

    // Exclude the linked job itself
    if (cr.jobId) similarJobQuery._id = { $ne: cr.jobId };

    const similarJobs = await Job.find(similarJobQuery).select('_id').limit(50).lean();
    const similarJobIds = similarJobs.map(j => j._id);

    if (similarJobIds.length > 0) {
      // Candidates who applied to those similar jobs
      const similarApps = await Application.find({
        jobId    : { $in: similarJobIds },
        deletedAt: null,
        currentStage: { $in: ['Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired', 'Applied', 'Screening'] },
      })
        .select('candidateId')
        .limit(300)
        .lean();

      const similarCandIds = [...new Set(
        similarApps.map(a => a.candidateId?.toString()).filter(id => id && !seen.has(id))
      )];

      if (similarCandIds.length > 0) {
        const t2Cands = await Candidate.find({
          _id      : { $in: similarCandIds.slice(0, 200) },
          deletedAt: null,
        })
          .select(CANDIDATE_SELECT)
          .lean();

        t2Cands
          .map(c => ({ c, score: calculateTalentMatchScore(jobSnapshot, c).score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 15)
          .forEach(({ c, score }) => { addIfNew(c, score, 2); tier2Count++; });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TIER 3 — Full Database Match
  // Score the entire platform against this role. Only runs if we still need
  // more candidates (< 10 total so far).
  // ══════════════════════════════════════════════════════════════════════════
  let tier3Count = 0;

  if (results.length < 10) {
    const t3Query = { deletedAt: null };

    // Focus query using available signals
    if (extractedSkills.length > 0) {
      const skillRe = extractedSkills.slice(0, 6).map(s =>
        new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
      );
      t3Query.$or = [
        { skills: { $in: skillRe } },
      ];
    }
    if (roleTitle) {
      const firstWord = roleTitle.split(' ')[0];
      if (!t3Query.$or) t3Query.$or = [];
      t3Query.$or.push({ title: { $regex: firstWord, $options: 'i' } });
    }
    if (!t3Query.$or || t3Query.$or.length === 0) {
      delete t3Query.$or; // no signals — will match everyone; limit handles it
    }

    const t3Cands = await Candidate.find(t3Query)
      .select(CANDIDATE_SELECT)
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();

    const MIN_SCORE = extractedSkills.length > 0 ? 20 : 0;

    t3Cands
      .filter(c => !seen.has(c._id?.toString()))
      .map(c => ({ c, score: calculateTalentMatchScore(jobSnapshot, c).score }))
      .filter(({ score }) => score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20 - results.length) // fill up to 20 total
      .forEach(({ c, score }) => { addIfNew(c, score, 3); tier3Count++; });
  }

  // Sort final results: tier 1 first, then by score descending within each tier
  results.sort((a, b) => {
    if (a._tier !== b._tier) return a._tier - b._tier;
    return b.matchScore - a.matchScore;
  });

  res.json({
    success: true,
    data   : results,
    meta   : { tier1: tier1Count, tier2: tier2Count, tier3: tier3Count, total: results.length },
  });
}));

// DELETE /api/candidate-requests/:id — cancel
router.delete('/:id', ...guard,
  allowRoles('admin', 'super_admin'),
  asyncHandler(async (req, res) => {
    const reqFilter = { _id: req.params.id };
    if (req.user.role !== 'super_admin') reqFilter.tenantId = req.user.tenantId;
    const r = await CandidateRequest.findOneAndUpdate(
      reqFilter, { $set: { status: 'cancelled' } }, { new: true }
    );
    if (!r) throw new AppError('Request not found.', 404);
    res.json({ success: true, message: 'Request cancelled.' });
  })
);

module.exports = router;
