/**
 * Feature 6 — Skill Verification deepening
 *
 * SF6-A  computeBadgeLevel logic — null, bronze, silver, gold thresholds
 * SF6-B  analyzeTimings anti-cheat flags — speed, fast_answer, uniform_timings
 * SF6-C  Submit response includes badgeLevel + percentile
 * SF6-D  Option shuffling — no isCorrect field in served questions
 * SF6-E  GET /admin/stats/:skill — returns distribution, badgeBreakdown, flaggedCount
 * SF6-F  Percentile mocked correctly — included in submit response
 */

process.env.JWT_SECRET = 'test_jwt_secret_for_vitest_only';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
import express      from 'express';
import cookieParser from 'cookie-parser';
import request      from 'supertest';
import jwt          from 'jsonwebtoken';
import mongoose     from 'mongoose';

vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

const _r = createRequire(import.meta.url);

const _authModule   = _r('../src/middleware/auth.js');
const User          = _r('../src/models/User.js');
const Candidate     = _r('../src/models/Candidate.js');
const Organization  = _r('../src/models/Organization.js');
const Tenant        = _r('../src/models/Tenant.js');
const SkillQuestion = _r('../src/models/SkillQuestion.js');
const SkillAttempt  = _r('../src/models/SkillAttempt.js');
const logger        = _r('../src/middleware/logger.js');

import skillRouter from '../src/routes/skillAssessments.js';

const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const CANDIDATE_ID  = new mongoose.Types.ObjectId().toString();
const ATTEMPT_ID    = new mongoose.Types.ObjectId().toString();

function makeToken(role = 'admin', id = null) {
  const userId = id ?? (role === 'candidate' ? CANDIDATE_ID : ADMIN_ID);
  return jwt.sign({ userId, role, tenantId: TENANT_ID }, JWT_SECRET, { expiresIn: '1h' });
}

function chainOf(value) {
  const q = {
    select:   vi.fn().mockReturnThis(),
    sort:     vi.fn().mockReturnThis(),
    skip:     vi.fn().mockReturnThis(),
    limit:    vi.fn().mockReturnThis(),
    lean:     vi.fn().mockResolvedValue(value),
    then:     (r, j) => Promise.resolve(value).then(r, j),
    catch:    (j)    => Promise.resolve(value).catch(j),
  };
  return q;
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser(COOKIE_SECRET));
  app.use('/api/skill-assessments', skillRouter);
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });
  return app;
}

// 6 questions: 3 hard + 3 medium, all MCQ single
function makeQuestions() {
  const qs = [];
  for (let i = 0; i < 3; i++) {
    qs.push({
      _id: new mongoose.Types.ObjectId(),
      skill: 'Python', type: 'mcq_single', difficulty: 'hard',
      text: `Hard Q${i}`, marks: 2, isActive: true,
      options: [{ id: 'a', text: 'Right', isCorrect: true }, { id: 'b', text: 'Wrong', isCorrect: false }],
    });
  }
  for (let i = 0; i < 3; i++) {
    qs.push({
      _id: new mongoose.Types.ObjectId(),
      skill: 'Python', type: 'mcq_single', difficulty: 'medium',
      text: `Med Q${i}`, marks: 1, isActive: true,
      options: [{ id: 'a', text: 'Right', isCorrect: true }, { id: 'b', text: 'Wrong', isCorrect: false }],
    });
  }
  return qs;
}

function makeServedFromQuestions(qs) {
  return qs.map(q => ({
    questionId: String(q._id),
    skill: q.skill, type: q.type, difficulty: q.difficulty,
    text: q.text, marks: q.marks,
    options: q.options.map(({ id, text }) => ({ id, text })),
  }));
}

function makeAttemptDoc(questionsServed, overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(ATTEMPT_ID),
    candidateId: new mongoose.Types.ObjectId(CANDIDATE_ID),
    skill: 'Python',
    status: 'in_progress',
    questionsServed,
    answers: [],
    startedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    score: 0, maxScore: 0, percentage: 0,
    passed: false, hardCorrect: 0, correctCount: 0,
    save: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  _authModule.clearAllUserAuthCache();

  vi.spyOn(logger, 'info').mockImplementation(() => {});
  vi.spyOn(logger, 'error').mockImplementation(() => {});
  vi.spyOn(logger, 'warn').mockImplementation(() => {});
  vi.spyOn(logger, 'audit').mockImplementation(() => {});

  vi.spyOn(Organization, 'findById').mockReturnValue(chainOf({
    _id: TENANT_ID, name: 'Test Org', status: 'active', type: 'org',
    subscriptionStatus: 'active', isStaffingAgency: false,
  }));
  vi.spyOn(Tenant, 'find').mockReturnValue(chainOf([]));
  vi.spyOn(SkillAttempt, 'countDocuments').mockResolvedValue(10);
  // normalizeSkillName() calls SkillQuestion.findOne — must mock to avoid DB hang
  vi.spyOn(SkillQuestion, 'findOne').mockReturnValue(chainOf({ skill: 'Python' }));
  // badges route does Candidate.findOne to resolve Candidate._id → User._id
  vi.spyOn(Candidate, 'findOne').mockReturnValue(chainOf(null));

  vi.spyOn(User, 'findById').mockImplementation(id => {
    if (String(id) === CANDIDATE_ID) {
      return chainOf({ _id: CANDIDATE_ID, id: CANDIDATE_ID, role: 'candidate',
        tenantId: TENANT_ID, isActive: true, name: 'Cand', email: 'cand@test.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'admin@test.example',
      toObject: () => ({}) });
  });
});

// ── SF6-A: computeBadgeLevel via submit endpoint ──────────────────────────────
describe('Badge levels via submit endpoint (SF6-A)', () => {
  function setupSubmitMocks(qs, answers) {
    const served = makeServedFromQuestions(qs);
    const attempt = makeAttemptDoc(served);
    vi.spyOn(SkillAttempt, 'findById').mockResolvedValue(attempt);
    vi.spyOn(SkillQuestion, 'find').mockReturnValue(chainOf(qs));
    return { served, attempt, answers };
  }

  it('null badge when failing (< 4 correct)', async () => {
    const qs = makeQuestions();
    // Only answer 3 medium questions correctly — fails pass rule (not 4 correct)
    const answers = qs.filter(q => q.difficulty === 'medium').map(q => ({ questionId: String(q._id), value: 'a' }));
    setupSubmitMocks(qs, answers);

    const res = await request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ answers });

    expect(res.status).toBe(200);
    expect(res.body.badgeLevel).toBeNull();
    expect(res.body.passed).toBe(false);
  });

  it('bronze badge when passing exactly (4 correct, ≥1 hard)', async () => {
    const qs = makeQuestions();
    // Answer 1 hard + 3 medium correctly = 4 correct, 1 hard — passes; percentage = (2+1+1+1)/9 ≈ 55%
    const passAnswers = [
      { questionId: String(qs[0]._id), value: 'a' }, // hard Q0 correct
      { questionId: String(qs[3]._id), value: 'a' }, // med Q0 correct
      { questionId: String(qs[4]._id), value: 'a' }, // med Q1 correct
      { questionId: String(qs[5]._id), value: 'a' }, // med Q2 correct
    ];
    setupSubmitMocks(qs, passAnswers);

    const res = await request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ answers: passAnswers });

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(true);
    expect(res.body.badgeLevel).toBe('bronze');
  });

  it('silver badge when percentage ≥ 80 but not all hard correct', async () => {
    const qs = makeQuestions();
    // Answer 2 hard + 3 medium correctly = 5 correct; marks: 2+2+1+1+1=7/9 ≈ 77.7% → round to 78 (bronze)
    // For silver we need ≥80%: answer all 3 hard + 2 medium = 2+2+2+1+1=8/9 ≈ 88.9% → 89% (silver, not gold — not ALL hard correct above HARD_COUNT=3)
    // Actually all 3 hard correct → gold would fire only if percentage ≥ 90
    // Let's do 2 hard + 3 medium = 7/9 = 77% → bronze; need to force 80%
    // 3 hard (6 marks) + 1 medium (1 mark) = 7/9 = 77.7% → 78% → bronze still
    // 3 hard (6) + 2 medium (2) = 8/9 = 88.9% → 89% → silver (not gold since < 90)
    const answers = [
      ...qs.filter(q => q.difficulty === 'hard').map(q => ({ questionId: String(q._id), value: 'a' })),
      { questionId: String(qs[3]._id), value: 'a' },
      { questionId: String(qs[4]._id), value: 'a' },
    ];
    setupSubmitMocks(qs, answers);

    const res = await request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ answers });

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(true);
    expect(res.body.percentage).toBeGreaterThanOrEqual(80);
    expect(res.body.percentage).toBeLessThan(90);
    expect(res.body.badgeLevel).toBe('silver');
  });

  it('gold badge when percentage ≥ 90 and all 3 hard correct', async () => {
    const qs = makeQuestions();
    // All 6 correct: 3 hard (6) + 3 medium (3) = 9/9 = 100% → gold
    const answers = qs.map(q => ({ questionId: String(q._id), value: 'a' }));
    setupSubmitMocks(qs, answers);

    const res = await request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ answers });

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(true);
    expect(res.body.percentage).toBe(100);
    expect(res.body.badgeLevel).toBe('gold');
  });
});

// ── SF6-B: analyzeTimings anti-cheat flags ────────────────────────────────────
describe('Anti-cheat timing flags (SF6-B)', () => {
  function submitWithTimings(qs, timingsMs) {
    const served = makeServedFromQuestions(qs);
    const attempt = makeAttemptDoc(served);
    vi.spyOn(SkillAttempt, 'findById').mockResolvedValue(attempt);
    // All correct answers so pass rule is met
    const answers = qs.map(q => ({ questionId: String(q._id), value: 'a' }));
    vi.spyOn(SkillQuestion, 'find').mockReturnValue(chainOf(qs));
    return request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ answers, timingsMs });
  }

  it('no flags when timings are normal (10s+ per question, varied)', async () => {
    const qs = makeQuestions();
    const timingsMs = {};
    // Vary timings to avoid uniform_timings flag: use spread values well above 8s avg
    const variedMs = [10_000, 12_000, 15_000, 18_000, 20_000, 25_000];
    qs.forEach((q, i) => { timingsMs[String(q._id)] = variedMs[i]; });

    const res = await submitWithTimings(qs, timingsMs);
    expect(res.status).toBe(200);
    expect(res.body.suspiciousFlags).toEqual([]);
  });

  it('flags speed when avg < 8s per question', async () => {
    const qs = makeQuestions();
    const timingsMs = {};
    qs.forEach(q => { timingsMs[String(q._id)] = 5_000; }); // 5s each → avg 5s < 8s

    const res = await submitWithTimings(qs, timingsMs);
    expect(res.status).toBe(200);
    // Candidate sees only redacted flag message
    expect(res.body.suspiciousFlags).toEqual(['Review flagged']);
  });

  it('flags fast_answer when a single question is answered in < 3s', async () => {
    const qs = makeQuestions();
    const timingsMs = {};
    qs.forEach((q, i) => { timingsMs[String(q._id)] = i === 0 ? 1_500 : 15_000; }); // first Q = 1.5s

    const res = await submitWithTimings(qs, timingsMs);
    expect(res.status).toBe(200);
    expect(res.body.suspiciousFlags).toEqual(['Review flagged']);
  });

  it('flags uniform_timings when all answers have near-zero variance', async () => {
    const qs = makeQuestions();
    const timingsMs = {};
    // All exactly the same → variance = 0 (bot-like)
    qs.forEach(q => { timingsMs[String(q._id)] = 12_000; });

    const res = await submitWithTimings(qs, timingsMs);
    expect(res.status).toBe(200);
    expect(res.body.suspiciousFlags).toEqual(['Review flagged']);
  });

  it('returns empty suspiciousFlags array when no timingsMs sent', async () => {
    const qs = makeQuestions();
    const served = makeServedFromQuestions(qs);
    const attempt = makeAttemptDoc(served);
    vi.spyOn(SkillAttempt, 'findById').mockResolvedValue(attempt);
    vi.spyOn(SkillQuestion, 'find').mockReturnValue(chainOf(qs));
    const answers = qs.map(q => ({ questionId: String(q._id), value: 'a' }));

    const res = await request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ answers }); // no timingsMs

    expect(res.status).toBe(200);
    expect(res.body.suspiciousFlags).toEqual([]);
  });
});

// ── SF6-C: Submit response includes percentile ────────────────────────────────
describe('Percentile in submit response (SF6-C)', () => {
  it('includes percentile number in submit response', async () => {
    const qs = makeQuestions();
    const served = makeServedFromQuestions(qs);
    const attempt = makeAttemptDoc(served);
    vi.spyOn(SkillAttempt, 'findById').mockResolvedValue(attempt);
    vi.spyOn(SkillQuestion, 'find').mockReturnValue(chainOf(qs));
    // 10 total, 10 below → 100th percentile
    vi.spyOn(SkillAttempt, 'countDocuments').mockResolvedValue(10);

    const answers = qs.map(q => ({ questionId: String(q._id), value: 'a' }));

    const res = await request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ answers });

    expect(res.status).toBe(200);
    expect(typeof res.body.percentile).toBe('number');
    expect(res.body.percentile).toBeGreaterThanOrEqual(0);
    expect(res.body.percentile).toBeLessThanOrEqual(100);
  });

  it('percentile is 100 when total attempts is 0 (first submission)', async () => {
    const qs = makeQuestions();
    const served = makeServedFromQuestions(qs);
    const attempt = makeAttemptDoc(served);
    vi.spyOn(SkillAttempt, 'findById').mockResolvedValue(attempt);
    vi.spyOn(SkillQuestion, 'find').mockReturnValue(chainOf(qs));
    vi.spyOn(SkillAttempt, 'countDocuments').mockResolvedValue(0);

    const answers = qs.map(q => ({ questionId: String(q._id), value: 'a' }));

    const res = await request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ answers });

    expect(res.status).toBe(200);
    expect(res.body.percentile).toBe(100);
  });
});

// ── SF6-D: Option shuffling (no isCorrect in served options) ──────────────────
describe('Option shuffling — no isCorrect exposed (SF6-D)', () => {
  it('start attempt: served options have no isCorrect field', async () => {
    const hardQs = [];
    const medQs  = [];
    for (let i = 0; i < 3; i++) {
      hardQs.push({
        _id: new mongoose.Types.ObjectId(),
        skill: 'Python', type: 'mcq_single', difficulty: 'hard',
        text: `Hard Q${i}`, marks: 2, isActive: true,
        options: [{ id: 'a', text: 'Right', isCorrect: true }, { id: 'b', text: 'Wrong', isCorrect: false }],
      });
      medQs.push({
        _id: new mongoose.Types.ObjectId(),
        skill: 'Python', type: 'mcq_single', difficulty: 'medium',
        text: `Med Q${i}`, marks: 1, isActive: true,
        options: [{ id: 'a', text: 'Right', isCorrect: true }, { id: 'b', text: 'Wrong', isCorrect: false }],
      });
    }

    // findOne called twice: once for active attempt check, once for cooldown check
    vi.spyOn(SkillAttempt, 'findOne').mockReturnValue(chainOf(null));
    vi.spyOn(SkillQuestion, 'find').mockImplementation(filter => {
      const diff = filter?.difficulty;
      if (diff === 'hard') return chainOf(hardQs);
      if (diff === 'medium') return chainOf(medQs);
      return chainOf([...hardQs, ...medQs]);
    });
    vi.spyOn(SkillAttempt, 'create').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(ATTEMPT_ID),
      skill: 'Python',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    const res = await request(buildApp())
      .post('/api/skill-assessments/attempt/start')
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ skill: 'Python' });

    expect(res.status).toBe(201);
    const questions = res.body.questions;
    expect(Array.isArray(questions)).toBe(true);
    questions.forEach(q => {
      (q.options || []).forEach(opt => {
        expect(opt).not.toHaveProperty('isCorrect');
      });
    });
  });
});

// ── SF6-E: Admin stats endpoint ───────────────────────────────────────────────
describe('GET /admin/stats/:skill (SF6-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/skill-assessments/admin/stats/Python');
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .get('/api/skill-assessments/admin/stats/Python')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);
    expect(res.status).toBe(403);
  });

  it('returns 200 with correct shape for admin', async () => {
    vi.spyOn(SkillAttempt, 'aggregate').mockResolvedValue([
      { _id: 0, count: 2, avgScore: 12 },
      { _id: 50, count: 5, avgScore: 62 },
    ]);
    vi.spyOn(SkillAttempt, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(SkillAttempt, 'countDocuments')
      .mockResolvedValueOnce(20)   // totalAttempts
      .mockResolvedValueOnce(8);   // passedAttempts

    const res = await request(buildApp())
      .get('/api/skill-assessments/admin/stats/Python')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(d.skill).toBe('Python');
    expect(d.totalAttempts).toBe(20);
    expect(d.passedAttempts).toBe(8);
    expect(d.passRate).toBe(40);
    expect(Array.isArray(d.distribution)).toBe(true);
    expect(typeof d.badgeBreakdown).toBe('object');
    expect(typeof d.flaggedCount).toBe('number');
    expect(Array.isArray(d.flagged)).toBe(true);
  });

  it('passRate is 0 when no attempts', async () => {
    vi.spyOn(SkillAttempt, 'aggregate').mockResolvedValue([]);
    vi.spyOn(SkillAttempt, 'find').mockReturnValue(chainOf([]));
    vi.spyOn(SkillAttempt, 'countDocuments').mockResolvedValue(0);

    const res = await request(buildApp())
      .get('/api/skill-assessments/admin/stats/Python')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.passRate).toBe(0);
  });
});

// ── SF6-F: badgeLevel in /badges/:userId ─────────────────────────────────────
describe('GET /badges/:userId includes badgeLevel + percentile (SF6-F)', () => {
  it('returns badges aggregation with badgeLevel and percentile', async () => {
    const userId = new mongoose.Types.ObjectId();
    vi.spyOn(SkillAttempt, 'aggregate').mockResolvedValue([
      {
        skill: 'Python', passed: true, score: 9, maxScore: 9,
        percentage: 100, badgeLevel: 'gold', percentile: 95,
        submittedAt: new Date(),
      },
    ]);

    const res = await request(buildApp())
      .get(`/api/skill-assessments/badges/${userId}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.badges)).toBe(true);
    expect(res.body.badges[0].badgeLevel).toBe('gold');
    expect(res.body.badges[0].percentile).toBe(95);
  });
});
