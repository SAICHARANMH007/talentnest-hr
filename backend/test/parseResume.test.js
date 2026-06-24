/**
 * Module audit: parseResume.js route
 *
 * Behaviors proven:
 *   PR-A  POST / — 400 no file; 200 parsed fields.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express  from 'express';
import request  from 'supertest';

vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}));

vi.mock('../src/utils/resumeParser', () => ({
  parseResume: vi.fn().mockReturnValue({
    fields: { name: 'John Doe', email: 'john@example.com', phone: '1234567890', skills: [] },
    confidence: { name: 0.9, email: 0.8 },
  }),
}));

import parseResumeRouter from '../src/routes/parseResume.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/parse-resume', parseResumeRouter);
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ success: false, error: err.message });
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── PR-A: POST / ─────────────────────────────────────────────────────────────
describe('POST /api/parse-resume — parse resume (PR-A)', () => {
  it('returns 400 when no file uploaded', async () => {
    const res = await request(buildApp())
      .post('/api/parse-resume')
      .send();
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No resume file/i);
  });

  it('returns 200 with parsed fields from plain-text resume', async () => {
    const resumeText = 'John Doe\njohn@example.com\n+91 9876543210\nSkills: JavaScript, Node.js\nExperience: 5 years';

    const res = await request(buildApp())
      .post('/api/parse-resume')
      .attach('file', Buffer.from(resumeText), { filename: 'resume.txt', contentType: 'text/plain' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('text');
  });
});
