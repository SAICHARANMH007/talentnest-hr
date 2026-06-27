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

// ── Admin: run built-in seed (idempotent) ─────────────────────────────────────
router.post('/admin/seed', auth, allowRoles('admin', 'super_admin'), async (req, res) => {
  try {
    const { SKILL_QUESTIONS } = require('../seeds/skillQuestions');
    let totalInserted = 0;
    const seeded = [];
    const skipped = [];
    for (const [skill, questions] of Object.entries(SKILL_QUESTIONS)) {
      const existing = await SkillQuestion.countDocuments({ skill, tenantId: null });
      if (existing >= questions.length) { skipped.push(skill); continue; }
      await SkillQuestion.deleteMany({ skill, tenantId: null });
      await SkillQuestion.insertMany(questions.map(q => ({ ...q, skill, tenantId: null })));
      seeded.push(skill);
      totalInserted += questions.length;
    }
    res.json({ totalInserted, seeded, skipped });
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

// ── Admin: seed built-in question bank ────────────────────────────────────────
// POST /api/skill-assessments/admin/questions/seed-built-in
// Inserts the platform's built-in skill questions for any skills that don't yet
// have a full question bank (needs HARD_COUNT hard + MEDIUM_COUNT medium).
// Safe to run multiple times — uses per-text dedup so it never inserts duplicates.

router.post('/admin/questions/seed-built-in', auth, allowRoles('admin', 'super_admin'), async (req, res) => {
  try {
    // Inline built-in question data (mirrors backend/src/seeds/skillQuestions.js)
    function opt(id, text, isCorrect) { return { id, text, isCorrect: !!isCorrect }; }
    function q(difficulty, type, text, options, marks, explanation) {
      return { difficulty, type, text, options, marks: marks || (difficulty === 'hard' ? 2 : 1), explanation: explanation || '', isActive: true };
    }
    function tf(text, correctIsTrue, explanation) {
      return q('medium', 'truefalse', text,
        [opt('true', 'True', correctIsTrue), opt('false', 'False', !correctIsTrue)], 1, explanation);
    }

    const BUILT_IN = {
      Sales: [
        q('hard','mcq_single','What is SPIN Selling and what do the letters stand for?',[opt('a','Standard-Price-Incentive-Negotiation'),opt('b','Situation-Problem-Implication-Need-Payoff: a consultative selling framework that guides reps to ask questions revealing the impact of problems and the value of solving them',true),opt('c','Sales-Prospect-Identify-Negotiate'),opt('d','A discount pricing model')],2,'SPIN Selling by Neil Rackham focuses on asking the right questions rather than pitching features.'),
        q('hard','mcq_single','What is the difference between a prospect\'s "pain point" and a "buying trigger"?',[opt('a','They mean the same thing'),opt('b','A pain point is an ongoing problem the prospect experiences; a buying trigger is a specific event that creates urgency to solve it now (e.g. a regulation change, budget release, leadership change)',true),opt('c','A buying trigger is always price-related'),opt('d','Pain points only apply to B2C sales')],2,'Understanding triggers lets you time outreach for maximum relevance and urgency.'),
        q('hard','mcq_single','What is the challenger sale methodology?',[opt('a','Always offering the lowest price'),opt('b','A sales approach where the rep teaches the prospect something new about their business, tailors the pitch to stakeholder priorities, and takes control of the conversation — rather than just building rapport',true),opt('c','Focusing only on relationship-building'),opt('d','Using aggressive cold-calling tactics')],2,'CEB research found Challenger reps outperform relationship builders, especially in complex sales.'),
        q('medium','mcq_single','What is the ideal way to handle a price objection from a qualified prospect?',[opt('a','Immediately offer a discount'),opt('b','Acknowledge the concern, reinforce the value and ROI, explore what specifically feels expensive, and use social proof or a comparison to alternatives — discount only as a last resort with conditions attached',true),opt('c','End the call and move on'),opt('d','Ignore the objection and keep pitching')],1,'Discounting too early devalues your offering; price objections often signal a value gap, not a budget gap.'),
        q('medium','mcq_single','What does a healthy sales funnel conversion rate look like, and how do you improve it?',[opt('a','100% is the only acceptable target'),opt('b','Industry benchmarks vary (5-20% lead-to-close is typical); improve by qualifying leads earlier, shortening follow-up cycles, creating urgency with time-bound offers, and identifying drop-off stages for targeted coaching',true),opt('c','It only depends on pricing'),opt('d','Conversion rate is only tracked at the demo stage')],1,'Funnel analysis pinpoints where deals stall, enabling stage-specific process improvements.'),
        q('medium','mcq_single','What is the purpose of a discovery call in B2B sales?',[opt('a','To pitch the product immediately'),opt('b','To qualify the prospect by understanding their current situation, pain points, decision-making process, budget, and timeline — before investing time in a full demo or proposal',true),opt('c','To negotiate pricing'),opt('d','To close the deal in a single call')],1,'Good discovery prevents wasted effort on poorly-fit prospects and tailors demos to real needs.'),
      ],
      Marketing: [
        q('hard','mcq_single','What is the difference between a lead, an MQL, and an SQL?',[opt('a','They are all the same thing'),opt('b','A lead is any contact; an MQL (Marketing Qualified Lead) meets marketing criteria (e.g., downloaded content, visited pricing) indicating interest; an SQL (Sales Qualified Lead) has been vetted by sales as ready for a sales conversation',true),opt('c','MQL and SQL only apply to email marketing'),opt('d','SQLs are generated by paid ads only')],2,'Aligning MQL/SQL definitions between marketing and sales reduces friction and improves pipeline quality.'),
        q('hard','mcq_single','What is attribution modelling and why does it matter for marketing budgets?',[opt('a','A way to name ad campaigns'),opt('b','A framework to assign credit to each touchpoint in a customer\'s journey (first-touch, last-touch, linear, time-decay, data-driven) so budget can be allocated to the channels that actually drive conversions',true),opt('c','A social media scheduling tool'),opt('d','Only relevant for e-commerce')],2,'Wrong attribution leads to over-investing in the wrong channels; data-driven attribution is most accurate.'),
        q('hard','mcq_single','What is a CAC:LTV ratio, and what does a healthy ratio look like?',[opt('a','Click-Through-Rate versus Landing page views'),opt('b','Customer Acquisition Cost vs Lifetime Value; a healthy ratio is 1:3 or better (spend $1 to acquire a customer who generates $3+ in value) — below 1:3 means marketing may not be profitable',true),opt('c','Cost per Ad Click divided by total revenue'),opt('d','Only applicable to SaaS businesses')],2,'LTV:CAC is the most fundamental profitability metric for growth marketing.'),
        q('medium','mcq_single','What is A/B testing in a marketing context and when should you use it?',[opt('a','Testing two different products'),opt('b','Comparing two versions of an asset (ad, email subject, landing page) with one variable changed; use it when you have enough traffic/volume for statistical significance and a clear hypothesis to test',true),opt('c','Running campaigns in two different countries'),opt('d','Testing marketing on two age groups only')],1,'A/B tests need statistical significance (~95% confidence) to make valid decisions.'),
        q('medium','mcq_single','What is the primary goal of content marketing?',[opt('a','Directly selling products in every piece of content'),opt('b','Attracting and nurturing a target audience by providing genuinely useful, relevant information that builds trust and authority — leading to organic demand and qualified inbound leads over time',true),opt('c','Generating paid ad traffic'),opt('d','Replacing the sales team')],1,'Content marketing earns attention through value; interruptive advertising buys attention.'),
        q('medium','mcq_single','What does "top of funnel" content typically aim to do?',[opt('a','Close deals immediately'),opt('b','Raise awareness and attract a broad audience who may not yet know they have a problem or need — educational blogs, social posts, short videos, and SEO-driven content are common formats',true),opt('c','Convert free trials to paid'),opt('d','Re-engage churned customers')],1,'ToFu content is measured by reach, impressions, and organic traffic, not direct revenue.'),
      ],
      HR: [
        q('hard','mcq_single','What is the difference between structured and unstructured job interviews, and which is more predictive of performance?',[opt('a','No meaningful difference'),opt('b','Structured interviews use predetermined, standardised questions scored with a consistent rubric applied to all candidates — meta-analyses show validity ~0.51 vs ~0.38 for unstructured; structured interviews reduce bias and improve predictive accuracy',true),opt('c','Unstructured interviews are more predictive'),opt('d','Structured interviews are only for technical roles')],2,'The Society for Industrial-Organizational Psychology identifies structured interviewing as a top validity predictor.'),
        q('hard','mcq_single','What is a stay interview and how does it differ from an exit interview?',[opt('a','They are the same'),opt('b','A stay interview is a proactive one-on-one with current employees to understand what keeps them engaged and what might cause them to leave — acting on findings before they quit; an exit interview captures reasons after the decision is already made',true),opt('c','Stay interviews are only for new hires'),opt('d','Exit interviews are only for managers')],2,'Stay interviews are higher ROI — they prevent turnover rather than just documenting it.'),
        q('hard','mcq_single','What is the 9-box grid used for in talent management?',[opt('a','Office seating plans'),opt('b','A performance-potential matrix plotting employees on a 3×3 grid (low/medium/high performance × low/medium/high potential) to guide succession planning, development investments, and retention focus for high-potential talent',true),opt('c','Tracking leave requests'),opt('d','Managing payroll bands')],2,'The 9-box helps HR allocate limited development resources to the people most likely to grow.'),
        q('medium','mcq_single','What is the primary purpose of an employer value proposition (EVP)?',[opt('a','Setting salary grades'),opt('b','Articulating the unique set of benefits, culture, and career opportunities an employer offers in exchange for an employee\'s skills and time — used to attract, engage, and retain the right talent',true),opt('c','Writing job descriptions'),opt('d','Compliance documentation')],1,'A strong EVP differentiates employers in competitive talent markets and improves offer acceptance rates.'),
        q('medium','mcq_single','What does "adverse impact" mean in hiring, and how is it typically measured?',[opt('a','Negative feedback from candidates'),opt('b','When a selection procedure disproportionately screens out a protected group (race, gender, etc.); commonly measured using the 4/5ths (80%) rule — a selection rate less than 80% of the highest-selected group indicates adverse impact',true),opt('c','A poor candidate experience'),opt('d','When more than 50% of applicants are rejected')],1,'Adverse impact analysis is an EEOC requirement; disproportionate rejection rates require job-relatedness justification.'),
        tf('A competency-based interview focuses on what the candidate plans to do in hypothetical future situations.', false, 'Competency-based interviews ask for past examples using frameworks like STAR; situational interviews use hypothetical scenarios.'),
      ],
      Communication: [
        q('hard','mcq_single','What is active listening and how does it differ from passive listening?',[opt('a','No difference'),opt('b','Active listening involves fully concentrating, understanding, and responding — paraphrasing, asking clarifying questions, maintaining eye contact; passive listening is hearing without engaging or processing',true),opt('c','Passive listening involves more questions'),opt('d','Active listening means agreeing with everything said')],2,'Active listening builds trust and ensures accurate understanding.'),
        q('hard','mcq_single','What is the STAR method for answering behavioral interview questions?',[opt('a','A scoring rubric'),opt('b','Situation-Task-Action-Result: a structured framework to give concise, concrete examples — describe the context, your responsibility, specific actions you took, and measurable outcomes',true),opt('c','A conflict resolution model'),opt('d','A presentation framework')],2,'STAR keeps answers focused and evidence-based rather than vague.'),
        q('hard','mcq_single','What is the key difference between assertive and aggressive communication?',[opt('a','No difference'),opt('b','Assertive: expressing needs/opinions clearly while respecting others\' rights; Aggressive: expressing needs in a way that violates others\' rights, dominates, or intimidates',true),opt('c','Aggressive communication is more effective'),opt('d','Assertive communication means never disagreeing')],2,'Assert your needs with "I" statements; aggressive communication damages relationships.'),
        q('medium','mcq_single','What does "reading the room" mean in a professional context?',[opt('a','Reviewing meeting notes'),opt('b','Perceiving and adapting to the group\'s mood, energy, and non-verbal cues to adjust your tone, content, or approach accordingly',true),opt('c','Preparing presentations'),opt('d','Taking attendance')],1,'Emotional intelligence enables accurate reading of group dynamics.'),
        q('medium','mcq_single','What is the most effective way to deliver constructive feedback?',[opt('a','Wait for the annual review'),opt('b','Be specific, timely, and focus on behavior/impact not personality; use "I noticed X which resulted in Y" framing; follow with how to improve',true),opt('c','Start with extensive criticism'),opt('d','Only give positive feedback')],1,'The SBI model: Situation-Behavior-Impact structures feedback clearly.'),
        tf('Non-verbal communication (body language, tone) typically carries less weight than the actual words spoken.', false, 'Studies suggest 55-93% of communication impact comes from non-verbal cues.'),
      ],
    };

    const tenantId = req.user.role === 'super_admin' ? null
      : (req.user.tenantId ? new mongoose.Types.ObjectId(req.user.tenantId) : null);

    let totalInserted = 0;
    const skillsSeeded = [];

    for (const [skill, questions] of Object.entries(BUILT_IN)) {
      // Get existing question texts for this skill (to avoid duplicates)
      const existingTexts = await SkillQuestion.distinct('text', {
        skill,
        ...(tenantId ? { $or: [{ tenantId: null }, { tenantId }] } : { tenantId: null }),
      });
      const existingSet = new Set(existingTexts.map(t => t.trim().toLowerCase()));

      const toInsert = questions
        .filter(q => !existingSet.has(q.text.trim().toLowerCase()))
        .map(q => ({ ...q, skill, tenantId: null, isActive: true }));

      if (toInsert.length > 0) {
        await SkillQuestion.insertMany(toInsert, { ordered: false });
        totalInserted += toInsert.length;
        skillsSeeded.push({ skill, inserted: toInsert.length });
      }
    }

    res.json({
      success: true,
      message: `Seeded ${totalInserted} questions across ${skillsSeeded.length} skill${skillsSeeded.length !== 1 ? 's' : ''}`,
      totalInserted,
      skillsSeeded,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
