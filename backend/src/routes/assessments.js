'use strict';
const express            = require('express');
const Assessment         = require('../models/Assessment');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const Application        = require('../models/Application');
const Job                = require('../models/Job');
const User               = require('../models/User');
const Notification       = require('../models/Notification');
const { authMiddleware } = require('../middleware/auth');
const { allowRoles }     = require('../middleware/rbac');
// unified auth alias used throughout this file
const auth = authMiddleware;
const router             = express.Router();

const TIMER_GRACE_MS = 30_000; // 30s grace period for network latency on submit
const MAX_QUESTIONS  = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function notify(userId, tenantId, type, title, body) {
  try {
    if (!userId) return;
    await Notification.create({ userId: String(userId), tenantId: tenantId || undefined, type, title, body, link: '', read: false });
  } catch {}
}

function parseQ(doc) {
  const d = doc.toJSON ? doc.toJSON() : { ...doc };
  try { if (typeof d.questions === 'string') d.questions = JSON.parse(d.questions); } catch { d.questions = []; }
  if (!Array.isArray(d.questions)) d.questions = [];
  return d;
}

function parseS(doc) {
  const d = doc.toJSON ? doc.toJSON() : { ...doc };
  try { if (typeof d.answers === 'string') d.answers = JSON.parse(d.answers); } catch { d.answers = []; }
  if (!Array.isArray(d.answers)) d.answers = [];
  return d;
}

// Strip isCorrect from options so candidates can't see answers
function sanitizeQuestions(questions) {
  return questions.map(q => ({
    ...q,
    options: (q.options || []).map(({ isCorrect, ...opt }) => opt),
  }));
}

// Auto-grade MCQ questions, return { score, maxScore }
function autoGrade(questions, answers) {
  let score = 0;
  let maxScore = 0;
  for (const q of questions) {
    const marks = Number(q.marks) || 1;
    maxScore += marks;
    if (q.type !== 'mcq_single' && q.type !== 'mcq_multi') continue; // text/code graded manually
    const ans = answers.find(a => a.questionId === q.id);
    if (!ans) continue;
    const correctIds = (q.options || []).filter(o => o.isCorrect).map(o => o.id);
    if (q.type === 'mcq_single') {
      if (correctIds.includes(ans.value)) score += marks;
    } else {
      // mcq_multi: value is array of selected option IDs; must match exactly
      const selected = Array.isArray(ans.value) ? ans.value : [];
      const matches = correctIds.length === selected.length &&
        correctIds.every(id => selected.includes(id));
      if (matches) score += marks;
    }
  }
  return { score, maxScore };
}

// Check if assessment owner or admin
async function canManage(user, assessment) {
  if (user.role === 'super_admin') return true;
  if (user.role === 'recruiter') return String(assessment.recruiterId) === String(user.id);
  if (user.role === 'admin') {
    const job = await Job.findById(assessment.jobId).lean();
    return job && String(job.tenantId) === String(user.tenantId);
  }
  return false;
}

// Auto-expire in-progress submissions past time limit
async function checkExpiry(submission, assessment) {
  if (submission.status !== 'in_progress') return submission;
  if (!assessment.timeLimitMins || assessment.timeLimitMins <= 0) return submission;
  const elapsed = Date.now() - new Date(submission.startedAt).getTime();
  if (elapsed > assessment.timeLimitMins * 60_000 + TIMER_GRACE_MS) {
    const updated = await AssessmentSubmission.findByIdAndUpdate(
      submission.id, { status: 'expired' }, { new: true }
    );
    return updated ? parseS(updated) : { ...submission, status: 'expired' };
  }
  return submission;
}

// ── POST /api/assessments ─────────────────────────────────────────────────────
router.post('/', auth, allowRoles('recruiter','admin','super_admin'), async (req, res) => {
  try {
    const { jobId, title, instructions, timeLimitMins, passingScore, isActive, autoAdvance, questions } = req.body;
    if (!jobId) return res.status(400).json({ error: 'jobId is required.' });

    const job = await Job.findById(jobId).lean();
    if (!job) return res.status(404).json({ error: 'Job not found.' });

    // Ownership check
    if (req.user.role === 'recruiter' && String(job.recruiterId) !== String(req.user.id))
      return res.status(403).json({ error: 'You can only create assessments for your own jobs.' });
    if (req.user.role === 'admin' && String(job.tenantId) !== String(req.user.tenantId))
      return res.status(403).json({ error: 'Job does not belong to your organisation.' });

    // One assessment per job
    const existing = await Assessment.findOne({ jobId: String(jobId) });
    if (existing) return res.status(400).json({ error: 'An assessment already exists for this job. Update it instead.' });

    const qs = Array.isArray(questions) ? questions.slice(0, MAX_QUESTIONS) : [];
    const assessment = await Assessment.create({
      tenantId: req.user.tenantId,
      jobId: String(jobId),
      recruiterId: String(req.user.id),
      createdBy: req.user.id,
      title: title || 'Screening Assessment',
      instructions: instructions || '',
      timeLimitMins: Number(timeLimitMins) || 0,
      passingScore: Number(passingScore) || 0,
      isActive: isActive !== false,
      autoAdvance: autoAdvance === true,
      questions: qs,
    });

    // Notify all existing applicants for this job
    const apps = await Application.find({ jobId: String(jobId) });
    for (const app of (Array.isArray(apps) ? apps : [])) {
      const a = app.toJSON ? app.toJSON() : app;
      await notify(a.candidateId, req.user.tenantId, 'assessment',
        `Assessment available — ${job.title}`,
        'An assessment has been added to your application. Complete it to advance your candidacy.'
      );
    }

    res.json(parseQ(assessment));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/assessments/job/:jobId ──────────────────────────────────────────
router.get('/job/:jobId', auth, async (req, res) => {
  try {
    const assessment = await Assessment.findOne({ jobId: String(req.params.jobId) });
    if (!assessment) return res.status(200).json(null);
    const parsed = parseQ(assessment);
    // Candidates see sanitized questions (no isCorrect)
    if (req.user.role === 'candidate') {
      parsed.questions = sanitizeQuestions(parsed.questions);
    }
    res.json(parsed);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/assessments/:id ────────────────────────────────────────────────
router.patch('/:id', auth, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });
    const a = parseQ(assessment);
    if (!(await canManage(req.user, a))) return res.status(403).json({ error: 'Access denied.' });

    const updates = {};
    const fields = ['title','instructions','timeLimitMins','passingScore','isActive','autoAdvance'];
    fields.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });
    if (req.body.questions !== undefined) {
      const qs = Array.isArray(req.body.questions) ? req.body.questions.slice(0, MAX_QUESTIONS) : [];
      updates.questions = qs;
    }

    const updated = await Assessment.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(parseQ(updated));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/assessments/:id ───────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });
    if (!(await canManage(req.user, parseQ(assessment)))) return res.status(403).json({ error: 'Access denied.' });

    // Also delete all submissions
    const subs = await AssessmentSubmission.find({ assessmentId: String(req.params.id) });
    for (const s of (Array.isArray(subs) ? subs : [])) {
      const sd = s.toJSON ? s.toJSON() : s;
      await AssessmentSubmission.findByIdAndDelete(sd.id);
    }
    await Assessment.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/assessments/:id/start ──────────────────────────────────────────
router.post('/:id/start', auth, allowRoles('candidate'), async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });
    const a = parseQ(assessment);
    if (!a.isActive) return res.status(403).json({ error: 'This assessment is no longer active.' });

    // Must have applied to the job
    const app = await Application.findOne({ jobId: a.jobId, candidateId: String(req.user.id) });
    if (!app) return res.status(403).json({ error: 'You must apply to this job before taking the assessment.' });
    const appData = app.toJSON ? app.toJSON() : app;

    // One-attempt enforcement: no existing non-expired submission
    const allSubs = await AssessmentSubmission.find({ assessmentId: String(req.params.id), candidateId: String(req.user.id) });
    const active = (Array.isArray(allSubs) ? allSubs : [])
      .map(s => s.toJSON ? s.toJSON() : s)
      .filter(s => s.status !== 'expired');
    if (active.length > 0) {
      const existing = active[0];
      if (existing.status === 'submitted') return res.status(409).json({ error: 'You have already completed this assessment.' });
      // Resume in-progress — check if expired by time
      const resumed = await checkExpiry(existing, a);
      if (resumed.status === 'expired') return res.status(409).json({ error: 'Your assessment session has expired.' });
      return res.json({ submission: resumed, assessment: { ...a, questions: sanitizeQuestions(a.questions) } });
    }

    const now = new Date().toISOString();
    const submission = await AssessmentSubmission.create({
      tenantId: req.user.tenantId,
      assessmentId: String(req.params.id),
      jobId: a.jobId,
      candidateId: String(req.user.id),
      applicationId: appData.id,
      status: 'in_progress',
      startedAt: now,
      answers: JSON.stringify([]),
    });

    res.json({ submission: parseS(submission), assessment: { ...a, questions: sanitizeQuestions(a.questions) } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/assessments/:id/submit ─────────────────────────────────────────
router.post('/:id/submit', auth, allowRoles('candidate'), async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });
    const a = parseQ(assessment);

    // Find the candidate's in-progress submission
    const allSubs = await AssessmentSubmission.find({ assessmentId: String(req.params.id), candidateId: String(req.user.id) });
    const sub = (Array.isArray(allSubs) ? allSubs : [])
      .map(s => s.toJSON ? s.toJSON() : s)
      .find(s => s.status === 'in_progress');
    if (!sub) return res.status(404).json({ error: 'No active assessment session found. Please start the assessment first.' });

    // Time limit check
    if (a.timeLimitMins > 0) {
      const elapsed = Date.now() - new Date(sub.startedAt).getTime();
      if (elapsed > a.timeLimitMins * 60_000 + TIMER_GRACE_MS) {
        await AssessmentSubmission.findByIdAndUpdate(sub.id, { status: 'expired' });
        return res.status(400).json({ error: 'Time limit exceeded. Your session has expired.' });
      }
    }

    const { answers = [], autoSubmitted = false, violations: submittedViolations } = req.body;
    if (!Array.isArray(answers)) return res.status(400).json({ error: 'answers must be an array.' });

    // Validate answer sizes against question maxChars
    for (const ans of answers) {
      const q = a.questions.find(q => q.id === ans.questionId);
      if (q && (q.type === 'text' || q.type === 'code') && q.maxChars && typeof ans.value === 'string') {
        if (ans.value.length > q.maxChars) {
          return res.status(400).json({ error: `Answer for question exceeds max character limit.` });
        }
      }
    }

    const now = new Date().toISOString();
    const timeSpentSecs = Math.round((Date.now() - new Date(sub.startedAt).getTime()) / 1000);
    const { score, maxScore } = autoGrade(a.questions, answers);
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

    // Determine result
    const hasManualQuestions = a.questions.some(q => q.type === 'text' || q.type === 'code');
    let result = 'pending';
    if (!hasManualQuestions) {
      result = a.passingScore > 0 ? (percentage >= a.passingScore ? 'pass' : 'fail') : 'pass';
    }

    // Merge any violations sent with submission (from anti-cheat frontend)
    const existingViolations = Array.isArray(sub.violations) ? sub.violations : [];
    const newViolations = Array.isArray(submittedViolations) ? submittedViolations : existingViolations;

    const updated = await AssessmentSubmission.findByIdAndUpdate(sub.id, {
      status: 'submitted',
      submittedAt: now,
      timeSpentSecs,
      answers: JSON.stringify(answers),
      score,
      maxScore,
      percentage,
      result,
      autoSubmitted: !!autoSubmitted,
      violations: newViolations,
      violationCount: newViolations.length,
    }, { new: true });

    // Update Application with assessment result
    if (sub.applicationId) {
      const appUpdates = { assessmentScore: percentage, assessmentResult: result, assessmentSubmittedAt: now };
      // Auto-advance to shortlisted if configured and auto-graded pass
      if (a.autoAdvance && result === 'pass') {
        const appDoc = await Application.findById(sub.applicationId);
        if (appDoc) {
          const appData = appDoc.toJSON ? appDoc.toJSON() : appDoc;
          const history = [...(appData.stageHistory || []), { stage: 'Shortlisted', movedAt: now, notes: 'Auto-advanced: assessment passed.' }];
          Object.assign(appUpdates, { currentStage: 'Shortlisted', stageHistory: history });
        }
      }
      await Application.findByIdAndUpdate(sub.applicationId, appUpdates);
    }

    // Notify recruiter (in-app + push)
    const job = await Job.findById(a.jobId).lean();
    const candidate = await User.findById(req.user.id).lean();
    const candName = candidate ? (candidate.name || 'A candidate') : 'A candidate';
    if (a.recruiterId) {
      await notify(a.recruiterId, a.tenantId, 'assessment_submitted',
        `Assessment submitted — ${candName}`,
        `${candName} completed the assessment for ${job?.title || 'the job'}. Score: ${percentage}%.`
      );
      // Push notification
      try {
        const { sendPush } = require('../utils/sendPush');
        if (a.createdBy) {
          await sendPush(a.createdBy, {
            title: 'Assessment Submitted',
            body: `${candName} completed the assessment for ${job?.title || 'a job'}`,
            url: '/app/assessments',
          });
        }
      } catch (e) { /* non-fatal */ }
    }

    const parsedSub = parseS(updated);
    res.json({ ...parsedSub, assessment: { title: a.title, passingScore: a.passingScore } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/assessments/:id/submissions ──────────────────────────────────────
router.get('/:id/submissions', auth, async (req, res) => {
  try {
    if (req.user.role === 'candidate') return res.status(403).json({ error: 'Access denied.' });

    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });
    if (!(await canManage(req.user, parseQ(assessment)))) return res.status(403).json({ error: 'Access denied.' });

    const subs = await AssessmentSubmission.find({ assessmentId: String(req.params.id) });
    const items = Array.isArray(subs) ? subs : [];

    // Enrich with candidate name
    const enriched = await Promise.all(items.map(async s => {
      const sub = parseS(s);
      const cand = await User.findById(sub.candidateId).lean();
      return { ...sub, candidateName: cand?.name || 'Unknown', candidateEmail: cand?.email || '' };
    }));

    res.json(enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/assessments/:id/submissions/:subId ───────────────────────────────
router.get('/:id/submissions/:subId', auth, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });
    const a = parseQ(assessment);

    const subDoc = await AssessmentSubmission.findById(req.params.subId);
    if (!subDoc) return res.status(404).json({ error: 'Submission not found.' });
    let sub = parseS(subDoc);

    // Auth check
    const isOwner = String(sub.candidateId) === String(req.user.id);
    const isManager = await canManage(req.user, a);
    if (!isOwner && !isManager) return res.status(403).json({ error: 'Access denied.' });

    // Auto-expire if needed
    sub = await checkExpiry(sub, a);

    // Questions: candidates get sanitized, recruiters get full (with isCorrect)
    const questions = isManager ? a.questions : sanitizeQuestions(a.questions);

    res.json({ submission: sub, assessment: { ...a, questions } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/assessments/:id/submissions/:subId/review ──────────────────────
router.patch('/:id/submissions/:subId/review', auth, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });
    if (!(await canManage(req.user, parseQ(assessment)))) return res.status(403).json({ error: 'Access denied.' });

    const { result, recruiterReview } = req.body;
    if (result && !['pass','fail','pending'].includes(result))
      return res.status(400).json({ error: 'result must be pass, fail, or pending.' });

    const now = new Date().toISOString();
    const updates = { reviewedAt: now, reviewedBy: String(req.user.id) };
    if (result) updates.result = result;
    if (recruiterReview !== undefined) updates.recruiterReview = String(recruiterReview).slice(0, 5000);

    const updated = await AssessmentSubmission.findByIdAndUpdate(req.params.subId, updates, { new: true });
    if (!updated) return res.status(404).json({ error: 'Submission not found.' });

    const sub = parseS(updated);

    // Notify candidate
    const a = parseQ(assessment);
    const job = await Job.findById(a.jobId).lean();
    if (result && sub.candidateId) {
      await notify(sub.candidateId, a.tenantId, 'assessment_reviewed',
        `Assessment reviewed — ${job?.title || 'Position'}`,
        `Your assessment has been reviewed. Result: ${result === 'pass' ? '✅ Passed' : result === 'fail' ? '❌ Not passed' : '⏳ Pending'}.`
      );
    }

    res.json(sub);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/assessments/candidate/my ────────────────────────────────────────
// Candidate: see all their submissions across all assessments
router.get('/candidate/my', auth, allowRoles('candidate'), async (req, res) => {
  try {
    const subs = await AssessmentSubmission.find({ candidateId: String(req.user.id) });
    const items = Array.isArray(subs) ? subs : [];
    const enriched = await Promise.all(items.map(async s => {
      const sub = parseS(s);
      const assessment = await Assessment.findById(sub.assessmentId);
      const a = assessment ? parseQ(assessment) : null;
      const job = a ? await Job.findById(a.jobId).lean() : null;
      return { ...sub, assessmentTitle: a?.title || '', jobTitle: job?.title || '', jobCompany: job?.company || '' };
    }));
    res.json(enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/assessments/:id/submissions/:subId/violation — anti-cheat violation log
router.post('/:id/submissions/:subId/violation', auth, async (req, res) => {
  try {
    const { type } = req.body;
    const sub = await AssessmentSubmission.findById(req.params.subId);
    if (!sub) return res.status(404).json({ error: 'Submission not found' });
    if (String(sub.candidateId) !== String(req.user._id || req.user.id))
      return res.status(403).json({ error: 'Forbidden' });

    const violations = Array.isArray(sub.violations) ? [...sub.violations] : [];
    violations.push({ type: type || 'unknown', timestamp: new Date() });
    await AssessmentSubmission.findByIdAndUpdate(req.params.subId, { violations, violationCount: violations.length });
    res.json({ success: true, violationCount: violations.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
