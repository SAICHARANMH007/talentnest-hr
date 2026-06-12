import { describe, it, expect } from 'vitest';
import { normalizeStage, VALID_STAGES, STAGE_ALIAS } from '../src/routes/applications.js';

describe('normalizeStage', () => {
  it('returns null for empty/falsy input', () => {
    expect(normalizeStage('')).toBeNull();
    expect(normalizeStage(null)).toBeNull();
    expect(normalizeStage(undefined)).toBeNull();
  });

  it('passes through canonical stage names unchanged', () => {
    for (const stage of VALID_STAGES) {
      expect(normalizeStage(stage)).toBe(stage);
    }
  });

  it('maps known frontend stage IDs to canonical backend stage names', () => {
    for (const [alias, canonical] of Object.entries(STAGE_ALIAS)) {
      expect(normalizeStage(alias)).toBe(canonical);
    }
  });

  it('maps case-insensitive aliases', () => {
    expect(normalizeStage('Applied'.toLowerCase())).toBe('Applied');
    expect(normalizeStage('SHORTLISTED')).toBe('Shortlisted');
  });

  it('returns null for an unknown/garbage stage so the route rejects it (400)', () => {
    expect(normalizeStage('totally_not_a_stage')).toBeNull();
    expect(normalizeStage('Hired ')).toBeNull(); // trailing space — not in VALID_STAGES or alias map
  });

  it('every alias target is itself a valid canonical stage', () => {
    for (const canonical of Object.values(STAGE_ALIAS)) {
      expect(VALID_STAGES).toContain(canonical);
    }
  });
});
