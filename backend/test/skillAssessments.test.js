/**
 * Skill Assessments route tests
 *
 * SKILL-A  GET  /skills                   — 401 no token; 200 returns skills list
 * SKILL-B  POST /attempt/start            — 401 no token; 403 non-candidate; 409 active attempt;
 *                                           422 not enough questions; 201 selects 3 hard + 3 medium;
 *                                           answer options NEVER contain isCorrect
 * SKILL-C  POST /attempt/:id/submit       — 401 no token; 403 wrong user; 409 already submitted;
 *                                           200 scores correctly; pass rule enforced
 * SKILL-D  GET  /my-results               — 401 no token; 403 non-candidate; 200 candidate
 * SKILL-E  GET  /admin/questions          — 401 no token; 403 candidate; 200 admin
 * SKILL-F  POST /admin/questions          — 400 missing fields; 201 creates question
 * SKILL-G  PATCH /admin/questions/:id     — 404 not found; 200 updates
 * SKILL-H  DELETE /admin/questions/:id   — 404 not found; 200 deletes
 * SKILL-I  POST /admin/questions/bulk    — 400 empty; 201 bulk inserts
 * SKILL-J  GET  /admin/attempts          — 401 no token; 403 candidate; 200 admin
 */

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

// ── CJS references ────────────────────────────────────────────────────────────
const _r = createRequire(import.meta.url);

const _authModule    = _r('../src/middleware/auth.js');
const User           = _r('../src/models/User.js');
const Organization   = _r('../src/models/Organization.js');
const Tenant         = _r('../src/models/Tenant.js');
const SkillQuestion  = _r('../src/models/SkillQuestion.js');
const SkillAttempt   = _r('../src/models/SkillAttempt.js');
const logger         = _r('../src/middleware/logger.js');

import skillRouter from '../src/routes/skillAssessments.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const JWT_SECRET    = 'test_jwt_secret_for_vitest_only';
const COOKIE_SECRET = 'test_cookie_secret';
const TENANT_ID     = new mongoose.Types.ObjectId().toString();
const ADMIN_ID      = new mongoose.Types.ObjectId().toString();
const CANDIDATE_ID  = new mongoose.Types.ObjectId().toString();
const QUESTION_ID   = new mongoose.Types.ObjectId().toString();
const ATTEMPT_ID    = new mongoose.Types.ObjectId().toString();

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(role = 'admin', opts = {}) {
  let defaultId = ADMIN_ID;
  if (role === 'candidate') defaultId = CANDIDATE_ID;
  return jwt.sign(
    { userId: opts.id ?? defaultId, role, tenantId: opts.tenantId ?? TENANT_ID },
    JWT_SECRET, { expiresIn: '1h' },
  );
}

function chainOf(value) {
  const q = {
    select: vi.fn().mockReturnThis(),
    sort:   vi.fn().mockReturnThis(),
    skip:   vi.fn().mockReturnThis(),
    limit:  vi.fn().mockReturnThis(),
    lean:   vi.fn().mockResolvedValue(value),
    then:   (r, j) => Promise.resolve(value).then(r, j),
    catch:  (j)    => Promise.resolve(value).catch(j),
  };
  return q;
}

function makeQuestion(overrides = {}) {
  return {
    _id:        new mongoose.Types.ObjectId(QUESTION_ID),
    tenantId:   null,
    skill:      'JavaScript',
    type:       'mcq_single',
    difficulty: 'hard',
    text:       'What does typeof null return?',
    options:    [
      { id: 'a', text: '"object"', isCorrect: true },
      { id: 'b', text: '"null"',   isCorrect: false },
    ],
    marks:       2,
    explanation: 'Historical bug.',
    isActive:    true,
    ...overrides,
  };
}

function makeAttempt(overrides = {}) {
  const now      = new Date();
  const expiresAt= new Date(now.getTime() + 30 * 60 * 1000);
  return {
    _id:             new mongoose.Types.ObjectId(ATTEMPT_ID),
    candidateId:     new mongoose.Types.ObjectId(CANDIDATE_ID),
    skill:           'JavaScript',
    status:          'in_progress',
    questionsServed: [],
    answers:         [],
    startedAt:       now,
    expiresAt,
    score:           0,
    maxScore:        0,
    percentage:      0,
    passed:          false,
    hardCorrect:     0,
    correctCount:    0,
    save:            vi.fn().mockResolvedValue(true),
    ...overrides,
  };
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

// ── Per-test setup ────────────────────────────────────────────────────────────
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

  vi.spyOn(User, 'findById').mockImplementation((id) => {
    const s = String(id);
    if (s === CANDIDATE_ID) {
      return chainOf({ _id: CANDIDATE_ID, id: CANDIDATE_ID, role: 'candidate',
        tenantId: TENANT_ID, isActive: true, name: 'Cand', email: 'cand@test.example',
        toObject: () => ({}) });
    }
    return chainOf({ _id: ADMIN_ID, id: ADMIN_ID, role: 'admin',
      tenantId: TENANT_ID, isActive: true, name: 'Admin', email: 'admin@test.example',
      toObject: () => ({}) });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/skill-assessments/skills (SKILL-A)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/skill-assessments/skills');
    expect(res.status).toBe(401);
  });

  it('returns skills list for authenticated user', async () => {
    vi.spyOn(SkillQuestion, 'distinct').mockResolvedValue(['JavaScript', 'Python']);

    const res = await request(buildApp())
      .get('/api/skill-assessments/skills')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.skills).toEqual(['JavaScript', 'Python']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/skill-assessments/attempt/start (SKILL-B)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post('/api/skill-assessments/attempt/start')
      .send({ skill: 'JavaScript' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-candidate role', async () => {
    const res = await request(buildApp())
      .post('/api/skill-assessments/attempt/start')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ skill: 'JavaScript' });
    expect(res.status).toBe(403);
  });

  it('returns 400 when skill is missing', async () => {
    const res = await request(buildApp())
      .post('/api/skill-assessments/attempt/start')
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/skill/i);
  });

  it('returns 409 when candidate has an active in-progress attempt', async () => {
    vi.spyOn(SkillAttempt, 'findOne').mockReturnValue(chainOf(makeAttempt()));

    const res = await request(buildApp())
      .post('/api/skill-assessments/attempt/start')
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ skill: 'JavaScript' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/in-progress/i);
  });

  it('returns 422 when not enough hard questions exist', async () => {
    vi.spyOn(SkillAttempt, 'findOne').mockReturnValue(chainOf(null));
    vi.spyOn(SkillQuestion, 'find').mockImplementation((filter) => {
      if (filter.difficulty === 'hard') return chainOf([]);
      return chainOf([makeQuestion({ difficulty: 'medium' }), makeQuestion({ difficulty: 'medium' }), makeQuestion({ difficulty: 'medium' })]);
    });

    const res = await request(buildApp())
      .post('/api/skill-assessments/attempt/start')
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ skill: 'JavaScript' });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/not enough/i);
  });

  it('returns 201 and serves 6 questions (3 hard + 3 medium) WITHOUT isCorrect', async () => {
    vi.spyOn(SkillAttempt, 'findOne').mockReturnValue(chainOf(null));

    const hardQs   = [1, 2, 3].map(i => makeQuestion({ _id: new mongoose.Types.ObjectId(), difficulty: 'hard', text: `Hard Q${i}` }));
    const mediumQs = [1, 2, 3].map(i => makeQuestion({ _id: new mongoose.Types.ObjectId(), difficulty: 'medium', text: `Med Q${i}` }));

    vi.spyOn(SkillQuestion, 'find').mockImplementation((filter) => {
      if (filter.difficulty === 'hard')   return chainOf(hardQs);
      if (filter.difficulty === 'medium') return chainOf(mediumQs);
      return chainOf([]);
    });

    vi.spyOn(SkillAttempt, 'create').mockResolvedValue({
      _id:       new mongoose.Types.ObjectId(ATTEMPT_ID),
      skill:     'JavaScript',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });

    const res = await request(buildApp())
      .post('/api/skill-assessments/attempt/start')
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ skill: 'JavaScript' });

    expect(res.status).toBe(201);
    expect(res.body.questions).toHaveLength(6);
    expect(res.body.timeLimitMins).toBe(30);
    expect(res.body.attemptId).toBeDefined();

    // CRITICAL: isCorrect must NEVER appear in the served questions
    for (const q of res.body.questions) {
      expect(q).not.toHaveProperty('isCorrect');
      for (const opt of q.options || []) {
        expect(opt).not.toHaveProperty('isCorrect');
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/skill-assessments/attempt/:id/submit (SKILL-C)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .send({ answers: [] });
    expect(res.status).toBe(401);
  });

  it('returns 403 when attempt belongs to a different candidate', async () => {
    const otherId = new mongoose.Types.ObjectId().toString();
    const attempt = makeAttempt({ candidateId: new mongoose.Types.ObjectId(otherId) });
    vi.spyOn(SkillAttempt, 'findById').mockResolvedValue(attempt);

    const res = await request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ answers: [] });

    expect(res.status).toBe(403);
  });

  it('returns 409 when attempt is already submitted', async () => {
    const attempt = makeAttempt({ status: 'submitted' });
    vi.spyOn(SkillAttempt, 'findById').mockResolvedValue(attempt);

    const res = await request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ answers: [] });

    expect(res.status).toBe(409);
  });

  it('returns 404 when attempt not found', async () => {
    vi.spyOn(SkillAttempt, 'findById').mockResolvedValue(null);

    const res = await request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ answers: [] });

    expect(res.status).toBe(404);
  });

  it('scores correctly and marks passed=true when ≥4 correct and ≥1 hard correct', async () => {
    const hardId1 = new mongoose.Types.ObjectId();
    const hardId2 = new mongoose.Types.ObjectId();
    const hardId3 = new mongoose.Types.ObjectId();
    const medId1  = new mongoose.Types.ObjectId();
    const medId2  = new mongoose.Types.ObjectId();
    const medId3  = new mongoose.Types.ObjectId();

    const attempt = makeAttempt({
      candidateId: new mongoose.Types.ObjectId(CANDIDATE_ID),
      questionsServed: [
        { questionId: String(hardId1), difficulty: 'hard' },
        { questionId: String(hardId2), difficulty: 'hard' },
        { questionId: String(hardId3), difficulty: 'hard' },
        { questionId: String(medId1),  difficulty: 'medium' },
        { questionId: String(medId2),  difficulty: 'medium' },
        { questionId: String(medId3),  difficulty: 'medium' },
      ],
    });
    vi.spyOn(SkillAttempt, 'findById').mockResolvedValue(attempt);

    // Full questions with isCorrect for grading
    const makeQ = (id, diff, correctOptId) => ({
      _id: id, difficulty: diff, type: 'mcq_single', marks: 1,
      options: [
        { id: correctOptId, text: 'Correct', isCorrect: true },
        { id: 'wrong',      text: 'Wrong',   isCorrect: false },
      ],
    });
    vi.spyOn(SkillQuestion, 'find').mockReturnValue(chainOf([
      makeQ(hardId1, 'hard',   'h1c'),
      makeQ(hardId2, 'hard',   'h2c'),
      makeQ(hardId3, 'hard',   'h3c'),
      makeQ(medId1,  'medium', 'm1c'),
      makeQ(medId2,  'medium', 'm2c'),
      makeQ(medId3,  'medium', 'm3c'),
    ]));

    // Answer 4 correctly: 2 hard correct + 2 medium correct  (passes: 4 >= 4 && 2 hard >= 1)
    const answers = [
      { questionId: String(hardId1), value: 'h1c' },
      { questionId: String(hardId2), value: 'h2c' },
      { questionId: String(medId1),  value: 'm1c' },
      { questionId: String(medId2),  value: 'm2c' },
      { questionId: String(hardId3), value: 'WRONG' },
      { questionId: String(medId3),  value: 'WRONG' },
    ];

    const res = await request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ answers });

    expect(res.status).toBe(200);
    expect(res.body.correctCount).toBe(4);
    expect(res.body.hardCorrect).toBe(2);
    expect(res.body.passed).toBe(true);
    expect(res.body.score).toBe(4);
    expect(res.body.maxScore).toBe(6);
  });

  it('marks passed=false when fewer than 4 correct', async () => {
    const ids = Array.from({ length: 6 }, () => new mongoose.Types.ObjectId());
    const attempt = makeAttempt({
      candidateId: new mongoose.Types.ObjectId(CANDIDATE_ID),
      questionsServed: ids.map((id, i) => ({ questionId: String(id), difficulty: i < 3 ? 'hard' : 'medium' })),
    });
    vi.spyOn(SkillAttempt, 'findById').mockResolvedValue(attempt);

    vi.spyOn(SkillQuestion, 'find').mockReturnValue(chainOf(
      ids.map((id, i) => ({
        _id: id, difficulty: i < 3 ? 'hard' : 'medium', type: 'mcq_single', marks: 1,
        options: [{ id: 'c', text: 'C', isCorrect: true }, { id: 'w', text: 'W', isCorrect: false }],
      }))
    ));

    // Only 2 correct — fails
    const answers = ids.map((id, i) => ({ questionId: String(id), value: i < 2 ? 'c' : 'w' }));

    const res = await request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ answers });

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(false);
    expect(res.body.correctCount).toBe(2);
  });

  it('marks passed=false when 4 correct but 0 hard correct', async () => {
    const ids = Array.from({ length: 6 }, () => new mongoose.Types.ObjectId());
    const attempt = makeAttempt({
      candidateId: new mongoose.Types.ObjectId(CANDIDATE_ID),
      questionsServed: ids.map((id, i) => ({ questionId: String(id), difficulty: i < 3 ? 'hard' : 'medium' })),
    });
    vi.spyOn(SkillAttempt, 'findById').mockResolvedValue(attempt);

    vi.spyOn(SkillQuestion, 'find').mockReturnValue(chainOf(
      ids.map((id, i) => ({
        _id: id, difficulty: i < 3 ? 'hard' : 'medium', type: 'mcq_single', marks: 1,
        options: [{ id: 'c', text: 'C', isCorrect: true }, { id: 'w', text: 'W', isCorrect: false }],
      }))
    ));

    // Correct on all 3 medium + 1 hard answered wrong = 3 medium correct, 0 hard correct → should fail even though... wait
    // Actually: answer medium 0,1,2 correctly + hard 0 wrongly = 3 correct total = < 4 → FAIL
    // Let me get 4 correct total but 0 hard: answer all 3 medium correct + 1 hard wrong + 2 hard wrong → 3 correct = FAIL
    // To get 4 correct but 0 hard correct: need medium pool >= 4, but we only have 3 medium here
    // Let me restructure: 0 hard, 6 medium questions (to test the hard-correct constraint)
    const attempt2 = makeAttempt({
      candidateId: new mongoose.Types.ObjectId(CANDIDATE_ID),
      questionsServed: ids.map((id) => ({ questionId: String(id), difficulty: 'medium' })),
    });
    vi.spyOn(SkillAttempt, 'findById').mockResolvedValue(attempt2);

    vi.spyOn(SkillQuestion, 'find').mockReturnValue(chainOf(
      ids.map((id) => ({
        _id: id, difficulty: 'medium', type: 'mcq_single', marks: 1,
        options: [{ id: 'c', text: 'C', isCorrect: true }, { id: 'w', text: 'W', isCorrect: false }],
      }))
    ));

    // 4 correct, but all medium → hardCorrect = 0 → passed = false
    const answers = ids.map((id, i) => ({ questionId: String(id), value: i < 4 ? 'c' : 'w' }));

    const res = await request(buildApp())
      .post(`/api/skill-assessments/attempt/${ATTEMPT_ID}/submit`)
      .set('Authorization', `Bearer ${makeToken('candidate')}`)
      .send({ answers });

    expect(res.status).toBe(200);
    expect(res.body.correctCount).toBe(4);
    expect(res.body.hardCorrect).toBe(0);
    expect(res.body.passed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/skill-assessments/my-results (SKILL-D)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/skill-assessments/my-results');
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-candidate', async () => {
    const res = await request(buildApp())
      .get('/api/skill-assessments/my-results')
      .set('Authorization', `Bearer ${makeToken('admin')}`);
    expect(res.status).toBe(403);
  });

  it('returns submitted results for candidate', async () => {
    vi.spyOn(SkillAttempt, 'find').mockReturnValue({
      sort: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: ATTEMPT_ID, skill: 'JavaScript', status: 'submitted', passed: true, score: 5, maxScore: 6 },
      ]),
    });

    const res = await request(buildApp())
      .get('/api/skill-assessments/my-results')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].skill).toBe('JavaScript');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/skill-assessments/admin/questions (SKILL-E)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/skill-assessments/admin/questions');
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate role', async () => {
    const res = await request(buildApp())
      .get('/api/skill-assessments/admin/questions')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);
    expect(res.status).toBe(403);
  });

  it('returns questions for admin', async () => {
    vi.spyOn(SkillQuestion, 'find').mockReturnValue({
      sort:  vi.fn().mockReturnThis(),
      skip:  vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean:  vi.fn().mockResolvedValue([makeQuestion()]),
    });
    vi.spyOn(SkillQuestion, 'countDocuments').mockResolvedValue(1);

    const res = await request(buildApp())
      .get('/api/skill-assessments/admin/questions')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/skill-assessments/admin/questions (SKILL-F)', () => {
  it('returns 400 when required fields missing', async () => {
    const res = await request(buildApp())
      .post('/api/skill-assessments/admin/questions')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ skill: 'JavaScript' });   // missing type, difficulty, text

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 for invalid type', async () => {
    const res = await request(buildApp())
      .post('/api/skill-assessments/admin/questions')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ skill: 'JavaScript', type: 'essay', difficulty: 'hard', text: 'Q?' });

    expect(res.status).toBe(400);
  });

  it('creates a question and returns 201', async () => {
    const created = makeQuestion({ _id: new mongoose.Types.ObjectId() });
    vi.spyOn(SkillQuestion, 'create').mockResolvedValue(created);

    const res = await request(buildApp())
      .post('/api/skill-assessments/admin/questions')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({
        skill: 'JavaScript', type: 'mcq_single', difficulty: 'hard',
        text: 'What does typeof null return?',
        options: [{ id: 'a', text: '"object"', isCorrect: true }],
        marks: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.question).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/skill-assessments/admin/questions/:id (SKILL-G)', () => {
  it('returns 404 when question not found', async () => {
    vi.spyOn(SkillQuestion, 'findById').mockResolvedValue(null);

    const res = await request(buildApp())
      .patch(`/api/skill-assessments/admin/questions/${QUESTION_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ difficulty: 'medium' });

    expect(res.status).toBe(404);
  });

  it('updates question and returns 200', async () => {
    const q = { ...makeQuestion(), save: vi.fn().mockResolvedValue(true) };
    vi.spyOn(SkillQuestion, 'findById').mockResolvedValue(q);

    const res = await request(buildApp())
      .patch(`/api/skill-assessments/admin/questions/${QUESTION_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ difficulty: 'medium', isActive: false });

    expect(res.status).toBe(200);
    expect(q.difficulty).toBe('medium');
    expect(q.isActive).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /api/skill-assessments/admin/questions/:id (SKILL-H)', () => {
  it('returns 404 when question not found', async () => {
    vi.spyOn(SkillQuestion, 'findByIdAndDelete').mockResolvedValue(null);

    const res = await request(buildApp())
      .delete(`/api/skill-assessments/admin/questions/${QUESTION_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(404);
  });

  it('deletes question and returns 200', async () => {
    vi.spyOn(SkillQuestion, 'findByIdAndDelete').mockResolvedValue(makeQuestion());

    const res = await request(buildApp())
      .delete(`/api/skill-assessments/admin/questions/${QUESTION_ID}`)
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/skill-assessments/admin/questions/bulk (SKILL-I)', () => {
  it('returns 400 for empty questions array', async () => {
    const res = await request(buildApp())
      .post('/api/skill-assessments/admin/questions/bulk')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ questions: [] });

    expect(res.status).toBe(400);
  });

  it('bulk inserts and returns 201', async () => {
    vi.spyOn(SkillQuestion, 'insertMany').mockResolvedValue([makeQuestion(), makeQuestion()]);

    const questions = [
      { skill: 'JavaScript', type: 'mcq_single', difficulty: 'hard', text: 'Q1?', options: [] },
      { skill: 'JavaScript', type: 'mcq_single', difficulty: 'medium', text: 'Q2?', options: [] },
    ];

    const res = await request(buildApp())
      .post('/api/skill-assessments/admin/questions/bulk')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ questions });

    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/skill-assessments/admin/attempts (SKILL-J)', () => {
  it('returns 401 with no token', async () => {
    const res = await request(buildApp()).get('/api/skill-assessments/admin/attempts');
    expect(res.status).toBe(401);
  });

  it('returns 403 for candidate', async () => {
    const res = await request(buildApp())
      .get('/api/skill-assessments/admin/attempts')
      .set('Authorization', `Bearer ${makeToken('candidate')}`);
    expect(res.status).toBe(403);
  });

  it('returns attempts list for admin', async () => {
    vi.spyOn(SkillAttempt, 'find').mockReturnValue({
      sort:   vi.fn().mockReturnThis(),
      skip:   vi.fn().mockReturnThis(),
      limit:  vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      lean:   vi.fn().mockResolvedValue([
        { _id: ATTEMPT_ID, skill: 'JavaScript', status: 'submitted', passed: true },
      ]),
    });
    vi.spyOn(SkillAttempt, 'countDocuments').mockResolvedValue(1);

    const res = await request(buildApp())
      .get('/api/skill-assessments/admin/attempts')
      .set('Authorization', `Bearer ${makeToken('admin')}`);

    expect(res.status).toBe(200);
    expect(res.body.attempts).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });
});
