import { describe, it, expect, vi } from 'vitest';
import { allowRoles } from '../src/middleware/rbac.js';

function mockRes() {
  const res = {};
  res.statusCode = null;
  res.body = null;
  res.status = vi.fn((code) => { res.statusCode = code; return res; });
  res.json = vi.fn((body) => { res.body = body; return res; });
  return res;
}

describe('allowRoles middleware', () => {
  it('rejects unauthenticated requests with 401', () => {
    const req = { user: null };
    const res = mockRes();
    const next = vi.fn();

    allowRoles('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects users whose role is not in the allow-list with 403', () => {
    const req = { user: { role: 'candidate' } };
    const res = mockRes();
    const next = vi.fn();

    allowRoles('admin', 'super_admin', 'recruiter')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.body.success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() for users whose role is in the allow-list', () => {
    const req = { user: { role: 'recruiter' } };
    const res = mockRes();
    const next = vi.fn();

    allowRoles('admin', 'super_admin', 'recruiter')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('is strict about role names — "hiring_manager" is not "admin"', () => {
    const req = { user: { role: 'hiring_manager' } };
    const res = mockRes();
    const next = vi.fn();

    allowRoles('admin', 'super_admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  // Regression guard for the Job Requirements + Hiring Manager work:
  // TRIAGE_ROLES must include hiring_manager so HMs can triage client requirements.
  it('TRIAGE_ROLES-style allow-list admits hiring_manager', () => {
    const TRIAGE_ROLES = ['admin', 'super_admin', 'recruiter', 'hiring_manager'];
    const req = { user: { role: 'hiring_manager' } };
    const res = mockRes();
    const next = vi.fn();

    allowRoles(...TRIAGE_ROLES)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
