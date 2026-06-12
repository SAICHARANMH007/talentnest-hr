import { describe, it, expect } from 'vitest';
import { expandSearch, esc } from '../src/utils/search.js';

describe('esc', () => {
  it('escapes regex special characters', () => {
    expect(esc('C++')).toBe('C\\+\\+');
    expect(esc('.net')).toBe('\\.net');
    expect(esc('a(b)')).toBe('a\\(b\\)');
  });
});

describe('expandSearch', () => {
  it('returns empty string for empty query', () => {
    expect(expandSearch('')).toBe('');
    expect(expandSearch(null)).toBe('');
  });

  it('expands a direct synonym match into an alternation', () => {
    const result = expandSearch('dotnet');
    expect(result).toContain('|');
    expect(result).toMatch(/dotnet/);
  });

  it('expands synonyms within a multi-word query', () => {
    const result = expandSearch('react developer');
    expect(result).toContain('developer');
    expect(result).toMatch(/react/);
  });

  it('produces a valid regex for any expanded query', () => {
    const queries = ['dotnet developer', 'react', 'aws engineer', 'random unmatched text'];
    for (const q of queries) {
      const pattern = expandSearch(q);
      expect(() => new RegExp(pattern, 'i')).not.toThrow();
    }
  });

  it('falls back to escaped per-word matching for unrecognized terms', () => {
    const result = expandSearch('quantum widget');
    expect(() => new RegExp(result, 'i')).not.toThrow();
    expect(new RegExp(result, 'i').test('Quantum Widget Specialist')).toBe(true);
  });
});
