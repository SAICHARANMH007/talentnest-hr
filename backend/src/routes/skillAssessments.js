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

// Normalize skill name to the exact casing stored in DB (case-insensitive lookup).
// Prevents "bdm" ≠ "BDM" mismatches when candidates navigate from profile skills.
async function normalizeSkillName(rawSkill) {
  const clean = rawSkill.trim();
  const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const doc = await SkillQuestion.findOne({
    skill: { $regex: new RegExp(`^${escaped}$`, 'i') },
    isActive: true,
  }).select('skill').lean();
  return doc ? doc.skill : clean;
}

// ── Public: list available skills ─────────────────────────────────────────────

router.get('/skills', auth, async (req, res) => {
  try {
    const filter = { isActive: true, ...tenantFilter(req.user.tenantId) };
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';

    if (isAdmin) {
      // Admins see ALL skills that have any active questions (no count threshold).
      // This ensures the filter dropdowns and modal autocomplete show every skill in the bank.
      const allSkills = await SkillQuestion.distinct('skill', filter);
      return res.json({ skills: allSkills.sort() });
    }

    // Candidates: only return skills with enough questions to start an assessment
    // (need HARD_COUNT hard + MEDIUM_COUNT medium). Aggregate counts per skill+difficulty.
    const counts = await SkillQuestion.aggregate([
      { $match: filter },
      { $group: { _id: { skill: '$skill', difficulty: '$difficulty' }, count: { $sum: 1 } } },
    ]);

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
    const { skill: rawSkill } = req.body;
    if (!rawSkill || !rawSkill.trim()) return res.status(400).json({ error: 'skill is required' });

    // Normalize skill casing to match the DB (e.g. "bdm" → "BDM")
    const skill = await normalizeSkillName(rawSkill);
    const candidateId = new mongoose.Types.ObjectId(req.user.id);

    // One active attempt at a time per candidate+skill
    const active = await SkillAttempt.findOne({ candidateId, skill, status: 'in_progress' }).lean();
    if (active) {
      return res.status(409).json({ error: 'You already have an in-progress attempt for this skill. Submit it first.' });
    }

    // 24h cooldown after a failed attempt (passed attempts allow retake freely)
    const lastAttempt = await SkillAttempt.findOne({ candidateId, skill, status: 'submitted' })
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
    const baseFilter = { skill, isActive: true, ...tenantFilter(req.user.tenantId) };

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
    const skill = await normalizeSkillName(decodeURIComponent(req.params.skill));
    const attempt = await SkillAttempt.findOne({
      candidateId,
      skill,
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
    if (skill) {
      const escaped = skill.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.skill = { $regex: new RegExp(`^${escaped}$`, 'i') };
    }
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
    if (skill) {
      const escaped = skill.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.skill = { $regex: new RegExp(`^${escaped}$`, 'i') };
    }
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
    const skill = await normalizeSkillName(decodeURIComponent(req.params.skill));
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
    const skill = await normalizeSkillName(decodeURIComponent(req.params.skill));

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
    // Load the full 30-skill bank from skillQuestions.js (JS, React, Python, BDM, etc.)
    const { SKILL_QUESTIONS } = require('../seeds/skillQuestions');

    function opt(id, text, isCorrect) { return { id, text, isCorrect: !!isCorrect }; }
    function qe(type, text, options, explanation) {
      return { difficulty: 'easy', type, text, options, marks: 1, explanation: explanation || '', isActive: true };
    }

    // Easy questions (3 per skill) layered on top of the hard+medium bank
    const EASY_ADDITIONS = {
      JavaScript: [
        qe('mcq_single','What does `console.log()` do in JavaScript?',[opt('a','Saves a file'),opt('b','Prints a value to the browser/terminal console for debugging',true),opt('c','Creates a variable'),opt('d','Sends data to a server')],'console.log is the most common debugging tool in JavaScript.'),
        qe('mcq_single','Which keyword declares a variable that cannot be reassigned in JavaScript?',[opt('a','var'),opt('b','let'),opt('c','const',true),opt('d','static')],'const creates a binding that cannot be reassigned, though the object it points to can still be mutated.'),
        qe('mcq_single','What is the result of `typeof null` in JavaScript?',[opt('a','"null"'),opt('b','"undefined"'),opt('c','"object"',true),opt('d','"number"')],'typeof null returning "object" is a historical bug in JavaScript that was kept for backward compatibility.'),
      ],
      Python: [
        qe('mcq_single','What symbol starts a comment in Python?',[opt('a','//'),opt('b','/*'),opt('c','#',true),opt('d','--')],'Python uses # for single-line comments; multi-line strings (triple quotes) are used for docstrings.'),
        qe('mcq_single','Which Python data type is immutable and ordered?',[opt('a','list'),opt('b','dict'),opt('c','set'),opt('d','tuple',true)],'Tuples are immutable sequences; lists are mutable sequences of the same type of items.'),
        qe('mcq_single','What does `len()` do in Python?',[opt('a','Deletes an element'),opt('b','Returns the number of items in a sequence or collection',true),opt('c','Sorts a list'),opt('d','Converts to string')],'len() works on strings, lists, tuples, dicts, and other collections.'),
      ],
      SQL: [
        qe('mcq_single','What does SELECT * FROM users do?',[opt('a','Deletes all users'),opt('b','Updates all users'),opt('c','Retrieves all columns and rows from the users table',true),opt('d','Creates a users table')],'SELECT * returns every column; for performance, specify only the columns you need.'),
        qe('mcq_single','Which SQL clause filters rows after grouping?',[opt('a','WHERE'),opt('b','HAVING',true),opt('c','ORDER BY'),opt('d','LIMIT')],'WHERE filters before grouping; HAVING filters after GROUP BY on aggregated values.'),
        qe('mcq_single','What is a PRIMARY KEY in SQL?',[opt('a','The first column of every table'),opt('b','A column (or set of columns) that uniquely identifies each row and cannot be NULL',true),opt('c','The most important index'),opt('d','A foreign key reference')],'Primary keys enforce entity integrity and are the main reference target for foreign keys.'),
      ],
      BDM: [
        qe('mcq_single','What does BDM stand for?',[opt('a','Business Data Management'),opt('b','Business Development Manager',true),opt('c','Budget and Delivery Metrics'),opt('d','Brand Distribution Marketing')],'A BDM focuses on growing business through new clients, markets, and strategic partnerships.'),
        qe('mcq_single','What is a sales pipeline?',[opt('a','A CRM software product'),opt('b','A visual representation of prospects at each stage of the buying process, from initial contact to closed deal',true),opt('c','A team communication channel'),opt('d','A product roadmap')],'Pipelines help managers forecast revenue and identify where deals need attention.'),
        qe('mcq_single','What is a cold call in business development?',[opt('a','A call to an existing customer'),opt('b','An unsolicited call to a potential customer who has not previously expressed interest',true),opt('c','A call with no agenda'),opt('d','A recorded sales pitch')],'Cold calling is a classic outbound prospecting technique requiring strong opening hooks.'),
      ],
      React: [
        qe('mcq_single','What is JSX in React?',[opt('a','A CSS framework'),opt('b','A JavaScript syntax extension that looks like HTML and compiles to React.createElement() calls',true),opt('c','A state manager'),opt('d','A testing library')],'JSX makes React component markup readable; Babel transforms it to JavaScript before the browser runs it.'),
        qe('mcq_single','What hook is used for side effects in React functional components?',[opt('a','useState'),opt('b','useEffect',true),opt('c','useRef'),opt('d','useMemo')],'useEffect handles data fetching, subscriptions, and DOM mutations after render.'),
        qe('mcq_single','What does `useState` return?',[opt('a','A DOM element'),opt('b','An array with the current state value and a setter function',true),opt('c','A Promise'),opt('d','A class component')],'Destructuring: const [count, setCount] = useState(0) — first element is value, second is setter.'),
      ],
      Git: [
        qe('mcq_single','What does `git commit` do?',[opt('a','Uploads changes to GitHub'),opt('b','Saves a snapshot of staged changes to the local repository history',true),opt('c','Creates a new branch'),opt('d','Merges two branches')],'Commits are local until pushed. Each commit has a unique hash (SHA) and an author message.'),
        qe('mcq_single','What is the purpose of `git pull`?',[opt('a','To delete a branch'),opt('b','To fetch and merge changes from the remote repository into the current branch',true),opt('c','To push local commits to remote'),opt('d','To stash uncommitted changes')],'git pull = git fetch + git merge; use git fetch first to review changes before merging.'),
        qe('mcq_single','What does `git branch -a` show?',[opt('a','Only local branches'),opt('b','All local and remote-tracking branches',true),opt('c','Deleted branches'),opt('d','Branch commit history')],'Remote branches are shown with the remotes/ prefix, e.g. remotes/origin/main.'),
      ],
      Sales: [
        qe('mcq_single','What does B2B stand for in sales?',[opt('a','Business-to-Business: selling products or services from one business to another',true),opt('b','Buy-to-Browse'),opt('c','Business-to-Browser'),opt('d','Buyer-to-Buyer')],'B2B contrasts with B2C (Business-to-Consumer) where the end customer is an individual.'),
        qe('mcq_single','What is a "lead" in sales terminology?',[opt('a','The sales manager'),opt('b','A potential customer who has shown some interest in a product or service and may become a buyer',true),opt('c','A signed contract'),opt('d','A marketing budget item')],'Leads are the first stage of the sales funnel; they are qualified before becoming prospects.'),
        qe('mcq_single','What is the primary purpose of a sales pitch?',[opt('a','To request a refund'),opt('b','To introduce a product or service, explain its value, and persuade the listener to take the next step — usually a demo, meeting, or purchase',true),opt('c','To negotiate salary'),opt('d','To write a proposal')],'A good pitch focuses on solving the buyer\'s problem, not just listing features.'),
      ],
      Marketing: [
        qe('mcq_single','What does SEO stand for?',[opt('a','Social Engagement Optimization'),opt('b','Search Engine Optimization: the practice of improving a website\'s visibility in organic (non-paid) search engine results',true),opt('c','Sales Email Outreach'),opt('d','Sponsored Event Operations')],'SEO drives free, sustainable traffic by ranking higher for relevant search queries.'),
        qe('mcq_single','What is a target audience in marketing?',[opt('a','All internet users'),opt('b','The specific group of people most likely to buy a product or service, defined by demographics, interests, or behaviors',true),opt('c','Only existing customers'),opt('d','The marketing team itself')],'Defining a target audience helps allocate marketing spend more efficiently.'),
        qe('mcq_single','What is the main difference between organic and paid social media reach?',[opt('a','No difference'),opt('b','Organic reach is unpaid exposure through normal posts and shares; paid reach is audience exposure bought through advertising spend',true),opt('c','Paid reach is always more effective'),opt('d','Organic reach only applies to email')],'Organic builds long-term brand equity; paid provides faster, scalable reach.'),
      ],
      HR: [
        qe('mcq_single','What does KPI stand for in an HR context?',[opt('a','Key Personnel Index'),opt('b','Key Performance Indicator: a measurable value that tracks how effectively an individual, team, or organization is achieving key objectives',true),opt('c','Known Process Inventory'),opt('d','Knowledge Platform Interface')],'HR KPIs include metrics like time-to-hire, turnover rate, and employee satisfaction scores.'),
        qe('mcq_single','What is an onboarding process?',[opt('a','The resignation procedure'),opt('b','The process of integrating a new employee into an organization — covering orientation, training, paperwork, and culture introduction — to help them become productive quickly',true),opt('c','A payroll system'),opt('d','The annual performance review cycle')],'Effective onboarding improves retention; poor onboarding increases early attrition.'),
        qe('mcq_single','What is the primary purpose of a job description?',[opt('a','To set the salary budget'),opt('b','To clearly outline the responsibilities, required qualifications, and expectations for a role so candidates can self-assess fit and hiring managers can evaluate applicants consistently',true),opt('c','To track employee leave'),opt('d','To create the employment contract')],'Accurate JDs improve application quality and reduce time wasted on unqualified candidates.'),
      ],
      Communication: [
        qe('mcq_single','What is the main purpose of professional email communication?',[opt('a','To send attachments only'),opt('b','To convey information clearly and concisely in a written format, maintaining a professional tone, proper greeting/closing, and a focused message',true),opt('c','To replace phone calls entirely'),opt('d','To share personal updates')],'Email etiquette includes clear subject lines, concise body text, and appropriate tone.'),
        qe('mcq_single','What does "tone" mean in written communication?',[opt('a','The volume of text'),opt('b','The attitude or emotion conveyed through word choice and style — ranging from formal/professional to casual/friendly',true),opt('c','The font size'),opt('d','The number of paragraphs')],'Tone affects how the reader perceives the writer\'s intent; mismatch in tone can create misunderstandings.'),
        qe('mcq_single','What is the most important thing to do before sending a business email?',[opt('a','Add emojis for friendliness'),opt('b','Proofread for spelling, grammar, correct recipient, appropriate tone, and a clear call to action',true),opt('c','CC everyone in the team'),opt('d','Use uppercase for emphasis')],'A single typo or wrong recipient can damage professional credibility or cause data breaches.'),
      ],
    };

    // Merge: base hard+medium from SKILL_QUESTIONS, then layer easy questions on top.
    // SKILL_QUESTIONS has a duplicate "Sales" key — Object.entries gives only one entry (the last).
    // We preserve all unique skills from SKILL_QUESTIONS and merge with EASY_ADDITIONS.
    const ALL_SKILLS = {};
    for (const [skill, questions] of Object.entries(SKILL_QUESTIONS)) {
      ALL_SKILLS[skill] = [...questions];
    }
    for (const [skill, easyQs] of Object.entries(EASY_ADDITIONS)) {
      if (!ALL_SKILLS[skill]) ALL_SKILLS[skill] = [];
      ALL_SKILLS[skill].push(...easyQs);
    }

    const tenantId = req.user.role === 'super_admin' ? null
      : (req.user.tenantId ? new mongoose.Types.ObjectId(req.user.tenantId) : null);

    let totalInserted = 0, totalSkipped = 0;
    const skillsSeeded = [];

    // Process all skills in parallel batches (per-text dedup, never deletes existing questions)
    for (const [skill, questions] of Object.entries(ALL_SKILLS)) {
      const existingTexts = await SkillQuestion.distinct('text', {
        skill,
        ...(tenantId ? { $or: [{ tenantId: null }, { tenantId }] } : { tenantId: null }),
      });
      const existingSet = new Set(existingTexts.map(t => t.trim().toLowerCase()));

      const toInsert = questions
        .filter(qItem => !existingSet.has(qItem.text.trim().toLowerCase()))
        .map(qItem => ({ ...qItem, skill, tenantId: null, isActive: true }));

      const skipped = questions.length - toInsert.length;
      totalSkipped += skipped;

      if (toInsert.length > 0) {
        await SkillQuestion.insertMany(toInsert, { ordered: false });
        totalInserted += toInsert.length;
        skillsSeeded.push({ skill, inserted: toInsert.length, skipped });
      }
    }

    const msg = totalInserted > 0
      ? `Seeded ${totalInserted} new question${totalInserted !== 1 ? 's' : ''} across ${skillsSeeded.length} skill${skillsSeeded.length !== 1 ? 's' : ''}${totalSkipped > 0 ? ` (${totalSkipped} already existed, skipped)` : ''}`
      : `No new questions added — all ${totalSkipped} questions already exist in the bank`;

    res.json({
      success: true,
      message: msg,
      totalInserted,
      totalSkipped,
      skillsSeeded,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
