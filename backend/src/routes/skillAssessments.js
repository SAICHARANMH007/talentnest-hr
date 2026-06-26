'use strict';
const express            = require('express');
const mongoose           = require('mongoose');
const SkillQuestion      = require('../models/SkillQuestion');
const SkillAttempt       = require('../models/SkillAttempt');
const { authMiddleware } = require('../middleware/auth');
const { allowRoles }     = require('../middleware/rbac');

const router = express.Router();
const auth   = authMiddleware;

const QUESTIONS_PER_ATTEMPT = 6;   // 3 hard + 3 medium
const HARD_COUNT            = 3;
const MEDIUM_COUNT          = 3;
const TIME_LIMIT_MINS       = 30;
const PASS_MIN_CORRECT      = 4;   // out of 6
const PASS_MIN_HARD_CORRECT = 1;   // at least 1 hard question correct
const TIMER_GRACE_MS        = 30_000;
const COOLDOWN_MS           = 24 * 60 * 60 * 1000;  // 24h cooldown after failing

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

/** Shuffle array in-place using Fisher-Yates */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Strip isCorrect from options before serving to candidate.
// Options are shuffled per-question to prevent pattern-learning anti-cheat.
function sanitizeForCandidate(questions) {
  return questions.map(q => ({
    questionId: String(q._id || q.questionId),
    skill:      q.skill,
    type:       q.type,
    difficulty: q.difficulty,
    text:       q.text,
    marks:      q.marks,
    options:    shuffleArray((q.options || []).map(({ id, text }) => ({ id, text }))),
  }));
}

/**
 * Compute badge level from grading result.
 * bronze: passed
 * silver: passed + percentage ≥ 80%
 * gold:   passed + percentage ≥ 90% + all hard questions correct
 */
function computeBadgeLevel({ passed, percentage, hardCorrect }) {
  if (!passed) return null;
  if (percentage >= 90 && hardCorrect >= HARD_COUNT) return 'gold';
  if (percentage >= 80) return 'silver';
  return 'bronze';
}

/**
 * Compute percentile rank for this attempt's percentage among all submitted attempts for the skill.
 * Returns 0-100 (e.g. 75 means scored better than 75% of attempts).
 */
async function computePercentile(skill, percentage) {
  try {
    const [total, below] = await Promise.all([
      SkillAttempt.countDocuments({ skill, status: 'submitted' }),
      SkillAttempt.countDocuments({ skill, status: 'submitted', percentage: { $lte: percentage } }),
    ]);
    if (total === 0) return 100;
    return Math.round((below / total) * 100);
  } catch {
    return null;
  }
}

/**
 * Anti-cheat timing analysis.
 * Returns array of suspicious flag strings (empty = clean).
 */
function analyzeTimings(timingsMs = {}, questionsServed = []) {
  const flags = [];
  const values = Object.values(timingsMs).filter(t => typeof t === 'number' && t > 0);
  if (values.length === 0) return flags;

  const totalMs   = values.reduce((a, b) => a + b, 0);
  const avgMs     = totalMs / values.length;
  const n         = questionsServed.length;

  // Total time too short: < 8 seconds per question on average
  if (n > 0 && totalMs / n < 8_000) {
    flags.push(`speed: avg ${Math.round(totalMs / n / 1000)}s/question (min 8s expected)`);
  }

  // Any single question answered in < 3 seconds
  for (const [qId, ms] of Object.entries(timingsMs)) {
    if (ms > 0 && ms < 3_000) {
      flags.push(`fast_answer:${qId} (${Math.round(ms / 1000)}s)`);
    }
  }

  // All answers submitted at once (all timings identical or near-zero variance)
  if (values.length >= 3) {
    const variance = values.reduce((s, t) => s + Math.pow(t - avgMs, 2), 0) / values.length;
    if (variance < 100) { // extremely low variance → bot-like
      flags.push('uniform_timings: possible automated submission');
    }
  }

  return flags;
}

// Grade answers against full question docs (with isCorrect)
// Also returns questionReview for post-submission display
function gradeAttempt(fullQuestions, answers) {
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let hardCorrect = 0;
  const questionReview = [];

  for (const q of fullQuestions) {
    const marks = Number(q.marks) || 1;
    maxScore += marks;

    const ans = answers.find(a => a.questionId === String(q._id));
    const correctIds = (q.options || []).filter(o => o.isCorrect).map(o => o.id);
    let isCorrect = false;

    if (ans) {
      if (q.type === 'mcq_single' || q.type === 'truefalse') {
        isCorrect = correctIds.includes(String(ans.value));
      } else if (q.type === 'mcq_multi') {
        const selected = Array.isArray(ans.value) ? ans.value.map(String) : [];
        isCorrect = correctIds.length > 0 &&
                    correctIds.length === selected.length &&
                    correctIds.every(id => selected.includes(id));
      }
    }

    if (isCorrect) {
      score += marks;
      correctCount++;
      if (q.difficulty === 'hard') hardCorrect++;
    }

    questionReview.push({
      questionId:  String(q._id),
      text:        q.text,
      type:        q.type,
      difficulty:  q.difficulty,
      marks,
      options:     (q.options || []).map(o => ({ id: o.id, text: o.text, isCorrect: !!o.isCorrect })),
      yourAnswer:  ans?.value ?? null,
      wasCorrect:  isCorrect,
      explanation: q.explanation || '',
    });
  }

  const passed = correctCount >= PASS_MIN_CORRECT && hardCorrect >= PASS_MIN_HARD_CORRECT;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return { score, maxScore, percentage, correctCount, hardCorrect, passed, questionReview };
}

// Build tenant filter: null-tenantId questions are always visible; org-specific ones only for that org
function tenantFilter(tenantId) {
  if (!tenantId) return { tenantId: null };
  return { $or: [{ tenantId: null }, { tenantId: new mongoose.Types.ObjectId(tenantId) }] };
}

// ── Public: list available skills ─────────────────────────────────────────────

router.get('/skills', auth, async (req, res) => {
  try {
    const filter = { isActive: true, ...tenantFilter(req.user.tenantId) };

    // Only return skills that actually have enough questions to start an assessment
    // (need HARD_COUNT hard + MEDIUM_COUNT medium). Aggregate counts per skill+difficulty.
    const counts = await SkillQuestion.aggregate([
      { $match: filter },
      { $group: { _id: { skill: '$skill', difficulty: '$difficulty' }, count: { $sum: 1 } } },
    ]);

    // Build map: skill → { hard: N, medium: N }
    const skillMap = {};
    for (const { _id: { skill, difficulty }, count } of counts) {
      if (!skillMap[skill]) skillMap[skill] = {};
      skillMap[skill][difficulty] = (skillMap[skill][difficulty] || 0) + count;
    }

    const skills = Object.entries(skillMap)
      .filter(([, d]) => (d.hard || 0) >= HARD_COUNT && (d.medium || 0) >= MEDIUM_COUNT)
      .map(([skill]) => skill)
      .sort();

    res.json({ skills });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Candidate: start an attempt ───────────────────────────────────────────────

router.post('/attempt/start', auth, allowRoles('candidate'), async (req, res) => {
  try {
    const { skill } = req.body;
    if (!skill || !skill.trim()) return res.status(400).json({ error: 'skill is required' });

    const candidateId = new mongoose.Types.ObjectId(req.user.id);

    // One active attempt at a time per candidate+skill
    const active = await SkillAttempt.findOne({ candidateId, skill: skill.trim(), status: 'in_progress' }).lean();
    if (active) {
      return res.status(409).json({ error: 'You already have an in-progress attempt for this skill. Submit it first.' });
    }

    // 24h cooldown after a failed attempt (passed attempts allow retake freely)
    const lastAttempt = await SkillAttempt.findOne({ candidateId, skill: skill.trim(), status: 'submitted' })
      .sort({ submittedAt: -1 }).lean();
    if (lastAttempt && lastAttempt.passed === false) {
      const elapsed = Date.now() - new Date(lastAttempt.submittedAt).getTime();
      if (elapsed < COOLDOWN_MS) {
        const remainMs = COOLDOWN_MS - elapsed;
        return res.status(429).json({
          error: 'Cooldown active. Please wait 24 hours after a failed attempt before retaking.',
          cooldownRemainingMs: remainMs,
          cooldownEndsAt: new Date(new Date(lastAttempt.submittedAt).getTime() + COOLDOWN_MS),
        });
      }
    }

    // Fetch question pool
    const baseFilter = { skill: skill.trim(), isActive: true, ...tenantFilter(req.user.tenantId) };

    const [hardPool, mediumPool] = await Promise.all([
      SkillQuestion.find({ ...baseFilter, difficulty: 'hard' }).lean(),
      SkillQuestion.find({ ...baseFilter, difficulty: 'medium' }).lean(),
    ]);

    if (hardPool.length < HARD_COUNT || mediumPool.length < MEDIUM_COUNT) {
      return res.status(422).json({
        error: `Not enough questions to start this assessment. Need ${HARD_COUNT} hard and ${MEDIUM_COUNT} medium questions.`,
      });
    }

    const selected = [
      ...pickN(hardPool, HARD_COUNT),
      ...pickN(mediumPool, MEDIUM_COUNT),
    ].sort(() => Math.random() - 0.5);   // shuffle combined set

    const now      = new Date();
    const expiresAt= new Date(now.getTime() + TIME_LIMIT_MINS * 60 * 1000);

    const attempt = await SkillAttempt.create({
      tenantId:    req.user.tenantId ? new mongoose.Types.ObjectId(req.user.tenantId) : null,
      candidateId,
      skill:       skill.trim(),
      status:      'in_progress',
      startedAt:   now,
      expiresAt,
      questionsServed: selected.map(q => ({
        questionId: String(q._id),
        skill:      q.skill,
        type:       q.type,
        difficulty: q.difficulty,
        text:       q.text,
        marks:      q.marks,
        options:    (q.options || []).map(({ id, text }) => ({ id, text })),
      })),
    });

    res.status(201).json({
      attemptId:   String(attempt._id),
      skill:       attempt.skill,
      expiresAt:   attempt.expiresAt,
      timeLimitMins: TIME_LIMIT_MINS,
      questions:   sanitizeForCandidate(selected),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Candidate: submit answers ─────────────────────────────────────────────────

router.post('/attempt/:id/submit', auth, allowRoles('candidate'), async (req, res) => {
  try {
    const attempt = await SkillAttempt.findById(req.params.id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (String(attempt.candidateId) !== String(req.user.id)) return res.status(403).json({ error: 'Forbidden' });
    if (attempt.status !== 'in_progress') return res.status(409).json({ error: 'Attempt already submitted or expired' });

    // Check timer (with grace)
    if (Date.now() > attempt.expiresAt.getTime() + TIMER_GRACE_MS) {
      attempt.status = 'expired';
      await attempt.save();
      return res.status(410).json({ error: 'Time limit exceeded' });
    }

    const { answers = [], timingsMs = {} } = req.body;

    // Fetch original full questions (with isCorrect) for grading
    const questionIds = attempt.questionsServed.map(q => q.questionId);
    const fullQuestions = await SkillQuestion.find({ _id: { $in: questionIds } }).lean();

    const { score, maxScore, percentage, correctCount, hardCorrect, passed, questionReview } = gradeAttempt(fullQuestions, answers);

    const badgeLevel      = computeBadgeLevel({ passed, percentage, hardCorrect });
    const suspiciousFlags = analyzeTimings(timingsMs, attempt.questionsServed);
    const percentile      = await computePercentile(attempt.skill, percentage);

    attempt.answers         = answers;
    attempt.status          = 'submitted';
    attempt.submittedAt     = new Date();
    attempt.score           = score;
    attempt.maxScore        = maxScore;
    attempt.percentage      = percentage;
    attempt.correctCount    = correctCount;
    attempt.hardCorrect     = hardCorrect;
    attempt.passed          = passed;
    attempt.badgeLevel      = badgeLevel;
    attempt.percentile      = percentile;
    attempt.timingsMs       = timingsMs;
    attempt.suspiciousFlags = suspiciousFlags;
    await attempt.save();

    res.json({
      attemptId:       String(attempt._id),
      skill:           attempt.skill,
      score,
      maxScore,
      percentage,
      correctCount,
      hardCorrect,
      passed,
      badgeLevel,
      percentile,
      suspiciousFlags: suspiciousFlags.length > 0 ? ['Review flagged'] : [], // don't expose detail to candidate
      submittedAt:     attempt.submittedAt,
      questionReview,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Candidate: my results ─────────────────────────────────────────────────────

router.get('/my-results', auth, allowRoles('candidate'), async (req, res) => {
  try {
    const candidateId = new mongoose.Types.ObjectId(req.user.id);
    const attempts = await SkillAttempt.find({ candidateId, status: { $in: ['submitted', 'expired'] } })
      .sort({ submittedAt: -1 })
      .select('-questionsServed -answers')
      .lean();
    res.json({ results: attempts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Candidate: get active attempt (resume) ────────────────────────────────────

router.get('/attempt/active/:skill', auth, allowRoles('candidate'), async (req, res) => {
  try {
    const candidateId = new mongoose.Types.ObjectId(req.user.id);
    const attempt = await SkillAttempt.findOne({
      candidateId,
      skill:  decodeURIComponent(req.params.skill),
      status: 'in_progress',
    }).lean();

    if (!attempt) return res.json({ attempt: null });

    // Auto-expire if past timer
    if (Date.now() > new Date(attempt.expiresAt).getTime() + TIMER_GRACE_MS) {
      await SkillAttempt.findByIdAndUpdate(attempt._id, { status: 'expired' });
      return res.json({ attempt: null, expired: true });
    }

    res.json({
      attempt: {
        attemptId:    String(attempt._id),
        skill:        attempt.skill,
        expiresAt:    attempt.expiresAt,
        timeLimitMins: TIME_LIMIT_MINS,
        questions:    attempt.questionsServed,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: list questions ─────────────────────────────────────────────────────

router.get('/admin/questions', auth, allowRoles('admin', 'super_admin'), async (req, res) => {
  try {
    const { skill, difficulty, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (skill) filter.skill = skill;
    if (difficulty) filter.difficulty = difficulty;

    // Admins see their own org questions + global
    const tFilter = tenantFilter(req.user.tenantId);
    Object.assign(filter, tFilter.$or ? { $or: tFilter.$or } : tFilter);

    const skip   = (Number(page) - 1) * Number(limit);
    const [questions, total] = await Promise.all([
      SkillQuestion.find(filter).sort({ skill: 1, difficulty: 1 }).skip(skip).limit(Number(limit)).lean(),
      SkillQuestion.countDocuments(filter),
    ]);
    res.json({ questions, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: create question ────────────────────────────────────────────────────

router.post('/admin/questions', auth, allowRoles('admin', 'super_admin'), async (req, res) => {
  try {
    const { skill, type, difficulty, text, options, marks, explanation } = req.body;
    if (!skill || !type || !difficulty || !text) {
      return res.status(400).json({ error: 'skill, type, difficulty, and text are required' });
    }
    const validTypes = ['mcq_single', 'mcq_multi', 'truefalse'];
    if (!validTypes.includes(type)) return res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    const validDiffs = ['easy', 'medium', 'hard'];
    if (!validDiffs.includes(difficulty)) return res.status(400).json({ error: `difficulty must be one of: ${validDiffs.join(', ')}` });

    const tenantId = req.user.role === 'super_admin' ? null
      : (req.user.tenantId ? new mongoose.Types.ObjectId(req.user.tenantId) : null);

    const q = await SkillQuestion.create({
      tenantId,
      skill:       skill.trim(),
      type,
      difficulty,
      text:        text.trim(),
      options:     options || [],
      marks:       marks || 1,
      explanation: explanation || '',
      createdBy:   new mongoose.Types.ObjectId(req.user.id),
    });
    res.status(201).json({ question: q });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: update question ────────────────────────────────────────────────────

router.patch('/admin/questions/:id', auth, allowRoles('admin', 'super_admin'), async (req, res) => {
  try {
    const q = await SkillQuestion.findById(req.params.id);
    if (!q) return res.status(404).json({ error: 'Question not found' });

    const allowed = ['skill', 'type', 'difficulty', 'text', 'options', 'marks', 'explanation', 'isActive'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) q[key] = req.body[key];
    }
    await q.save();
    res.json({ question: q });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: delete question ────────────────────────────────────────────────────

router.delete('/admin/questions/:id', auth, allowRoles('admin', 'super_admin'), async (req, res) => {
  try {
    const q = await SkillQuestion.findByIdAndDelete(req.params.id);
    if (!q) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: bulk import questions ──────────────────────────────────────────────

router.post('/admin/questions/bulk', auth, allowRoles('admin', 'super_admin'), async (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'questions array is required' });
    }

    const tenantId = req.user.role === 'super_admin' ? null
      : (req.user.tenantId ? new mongoose.Types.ObjectId(req.user.tenantId) : null);

    const docs = questions.map(q => ({
      tenantId,
      skill:       (q.skill || '').trim(),
      type:        q.type,
      difficulty:  q.difficulty,
      text:        (q.text || '').trim(),
      options:     q.options || [],
      marks:       q.marks || 1,
      explanation: q.explanation || '',
      createdBy:   new mongoose.Types.ObjectId(req.user.id),
    }));

    const inserted = await SkillQuestion.insertMany(docs, { ordered: false });
    res.status(201).json({ inserted: inserted.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: list attempts ──────────────────────────────────────────────────────

router.get('/admin/attempts', auth, allowRoles('admin', 'super_admin'), async (req, res) => {
  try {
    const { skill, candidateId, status, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (skill) filter.skill = skill;
    if (status) filter.status = status;
    if (candidateId) filter.candidateId = new mongoose.Types.ObjectId(candidateId);
    if (req.user.tenantId) {
      filter.$or = [{ tenantId: null }, { tenantId: new mongoose.Types.ObjectId(req.user.tenantId) }];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [attempts, total] = await Promise.all([
      SkillAttempt.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
        .select('-questionsServed -answers').lean(),
      SkillAttempt.countDocuments(filter),
    ]);
    res.json({ attempts, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Public: verified skill badges for any user ────────────────────────────────

router.get('/badges/:userId', auth, async (req, res) => {
  try {
    const candidateId = new mongoose.Types.ObjectId(req.params.userId);
    // Aggregate: one doc per skill, the most recent submitted attempt
    const rows = await SkillAttempt.aggregate([
      { $match: { candidateId, status: 'submitted' } },
      { $sort: { submittedAt: -1 } },
      {
        $group: {
          _id: '$skill',
          passed:      { $first: '$passed' },
          score:       { $first: '$score' },
          maxScore:    { $first: '$maxScore' },
          percentage:  { $first: '$percentage' },
          badgeLevel:  { $first: '$badgeLevel' },
          percentile:  { $first: '$percentile' },
          submittedAt: { $first: '$submittedAt' },
        }
      },
      { $project: { _id: 0, skill: '$_id', passed: 1, score: 1, maxScore: 1, percentage: 1, badgeLevel: 1, percentile: 1, submittedAt: 1 } },
    ]);
    res.json({ badges: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Public: skill leaderboard ─────────────────────────────────────────────────

router.get('/leaderboard/:skill', auth, async (req, res) => {
  try {
    const skill = decodeURIComponent(req.params.skill);
    // Best passing attempt per candidate, sorted by score desc then date asc
    const rows = await SkillAttempt.aggregate([
      { $match: { skill, status: 'submitted', passed: true } },
      { $sort: { score: -1, submittedAt: 1 } },
      { $group: { _id: '$candidateId', score: { $first: '$score' }, maxScore: { $first: '$maxScore' }, percentage: { $first: '$percentage' }, submittedAt: { $first: '$submittedAt' } } },
      { $sort: { score: -1, submittedAt: 1 } },
      { $limit: 10 },
      { $project: { _id: 0, candidateId: '$_id', score: 1, maxScore: 1, percentage: 1, submittedAt: 1 } },
    ]);
    res.json({ skill, leaderboard: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin: skill stats — percentile distribution + flagged attempts ────────────

router.get('/admin/stats/:skill', auth, allowRoles('admin', 'super_admin'), async (req, res) => {
  try {
    const skill = decodeURIComponent(req.params.skill);

    const [distribution, flagged, totalAttempts, passedAttempts] = await Promise.all([
      // Percentile buckets: 0-25, 25-50, 50-75, 75-90, 90-100
      SkillAttempt.aggregate([
        { $match: { skill, status: 'submitted' } },
        {
          $bucket: {
            groupBy: '$percentage',
            boundaries: [0, 25, 50, 75, 90, 101],
            default: 'other',
            output: { count: { $sum: 1 }, avgScore: { $avg: '$percentage' } },
          },
        },
      ]),
      // Flagged / suspicious attempts
      SkillAttempt.find({ skill, 'suspiciousFlags.0': { $exists: true } })
        .select('candidateId percentage submittedAt suspiciousFlags')
        .sort({ submittedAt: -1 })
        .limit(50)
        .lean(),
      SkillAttempt.countDocuments({ skill, status: 'submitted' }),
      SkillAttempt.countDocuments({ skill, status: 'submitted', passed: true }),
    ]);

    const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;

    // Badge level breakdown
    const badgeBreakdown = await SkillAttempt.aggregate([
      { $match: { skill, status: 'submitted', passed: true } },
      { $group: { _id: '$badgeLevel', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        skill,
        totalAttempts,
        passedAttempts,
        passRate,
        distribution,
        badgeBreakdown: badgeBreakdown.reduce((acc, r) => { acc[r._id || 'none'] = r.count; return acc; }, {}),
        flaggedCount: flagged.length,
        flagged,
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
