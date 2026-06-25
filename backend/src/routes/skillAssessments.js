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

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// Strip isCorrect from options before serving to candidate
function sanitizeForCandidate(questions) {
  return questions.map(q => ({
    questionId: String(q._id),
    skill:      q.skill,
    type:       q.type,
    difficulty: q.difficulty,
    text:       q.text,
    marks:      q.marks,
    options:    (q.options || []).map(({ id, text }) => ({ id, text })),
  }));
}

// Grade answers against full question docs (with isCorrect)
function gradeAttempt(fullQuestions, answers) {
  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let hardCorrect = 0;

  for (const q of fullQuestions) {
    const marks = Number(q.marks) || 1;
    maxScore += marks;

    const ans = answers.find(a => a.questionId === String(q._id));
    if (!ans) continue;

    const correctIds = (q.options || []).filter(o => o.isCorrect).map(o => o.id);
    let isCorrect = false;

    if (q.type === 'mcq_single' || q.type === 'truefalse') {
      isCorrect = correctIds.includes(String(ans.value));
    } else if (q.type === 'mcq_multi') {
      const selected = Array.isArray(ans.value) ? ans.value.map(String) : [];
      isCorrect = correctIds.length > 0 &&
                  correctIds.length === selected.length &&
                  correctIds.every(id => selected.includes(id));
    }

    if (isCorrect) {
      score += marks;
      correctCount++;
      if (q.difficulty === 'hard') hardCorrect++;
    }
  }

  const passed = correctCount >= PASS_MIN_CORRECT && hardCorrect >= PASS_MIN_HARD_CORRECT;
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return { score, maxScore, percentage, correctCount, hardCorrect, passed };
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
    const skills = await SkillQuestion.distinct('skill', filter);
    res.json({ skills: skills.sort() });
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

    const { answers = [] } = req.body;

    // Fetch original full questions (with isCorrect) for grading
    const questionIds = attempt.questionsServed.map(q => q.questionId);
    const fullQuestions = await SkillQuestion.find({ _id: { $in: questionIds } }).lean();

    const { score, maxScore, percentage, correctCount, hardCorrect, passed } = gradeAttempt(fullQuestions, answers);

    attempt.answers      = answers;
    attempt.status       = 'submitted';
    attempt.submittedAt  = new Date();
    attempt.score        = score;
    attempt.maxScore     = maxScore;
    attempt.percentage   = percentage;
    attempt.correctCount = correctCount;
    attempt.hardCorrect  = hardCorrect;
    attempt.passed       = passed;
    await attempt.save();

    res.json({
      attemptId:    String(attempt._id),
      skill:        attempt.skill,
      score,
      maxScore,
      percentage,
      correctCount,
      hardCorrect,
      passed,
      submittedAt:  attempt.submittedAt,
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

module.exports = router;
