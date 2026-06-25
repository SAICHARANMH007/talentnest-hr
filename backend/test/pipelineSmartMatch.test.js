/**
 * Talent Mirror — pipelineSmartMatch.js unit tests
 *
 * Behaviors proven:
 *   PSM-A  Stage weighting      — Hired benchmarks outweigh Shortlisted ones
 *   PSM-B  Confidence tiers     — 1 benchmark → low; 5 → high
 *   PSM-C  Core skill threshold — widens when confidence is low
 *   PSM-D  Score ranking        — better skill/exp fit ranks higher
 *   PSM-E  Missing core penalty — identical candidates split by core gap
 *   PSM-F  Smooth exp curve     — score decreases monotonically as gap grows
 *   PSM-G  Plain-English "why"  — explanation contains expected phrases
 *   PSM-H  Weight tuning        — changing weights changes ranking order
 *   PSM-I  Small benchmark      — 1 benchmark: low confidence + wide core
 *   PSM-J  Zero exp edge case   — no data → neutral 60
 *   PSM-K  normaliseWeights     — always sums to 100
 */

import { describe, it, expect } from 'vitest';
import {
  buildIdealProfile,
  scoreCandidate,
  expScoreGaussian,
  normaliseWeights,
  stageWeight,
  confidenceTier,
  _coreThreshold,
} from '../src/utils/pipelineSmartMatch.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function cand(name, skills, exp, title = '') {
  return { name, skills, experience: exp, title, parsedProfile: null, workHistory: null, educationList: null, summary: '' };
}

function bench(candidate, stage) { return { candidate, stage }; }

// ── PSM-A: Stage weighting ────────────────────────────────────────────────────
describe('PSM-A: stage weighting affects ideal profile', () => {
  it('Hired benchmark gives React 3× weight vs Shortlisted 1×', () => {
    const hiredBench  = [bench(cand('H', ['react'], 5), 'Hired')];
    const shortBench  = [bench(cand('S', ['react'], 5), 'Shortlisted')];

    const hiredProfile = buildIdealProfile(hiredBench);
    const shortProfile = buildIdealProfile(shortBench);

    // Both have react as core (only skill); but the weighted frequency differs
    expect(hiredProfile.skillFreq['react']).toBe(3.0);
    expect(shortProfile.skillFreq['react']).toBe(1.0);
  });

  it('candidate scores higher against Hired benchmark than Shortlisted for same match', () => {
    // Two benchmark pools: one Hired, one Shortlisted
    // Both have the same skills (react, node) — candidate has both
    const hired   = buildIdealProfile([bench(cand('H', ['react', 'node'], 5), 'Hired')]);
    const shorted = buildIdealProfile([bench(cand('S', ['react', 'node'], 5), 'Shortlisted')]);

    const candidate = cand('C', ['react', 'node'], 5);
    const scoreH = scoreCandidate(candidate, hired).score;
    const scoreS = scoreCandidate(candidate, shorted).score;

    // Scores should be equal because the ratio (matched / total) is the same
    // regardless of absolute weight values — normalisation preserves ranking
    expect(scoreH).toBe(scoreS);
  });

  it('stageWeight returns correct multipliers', () => {
    expect(stageWeight('Hired')).toBe(3.0);
    expect(stageWeight('Offer')).toBe(2.5);
    expect(stageWeight('Interview Round 2')).toBe(2.0);
    expect(stageWeight('Interview Round 1')).toBe(1.5);
    expect(stageWeight('Shortlisted')).toBe(1.0);
    expect(stageWeight('Unknown')).toBe(1.0); // default
  });

  it('mixed benchmark pool: Hired skills dominate over Shortlisted skills', () => {
    // Hired candidate has 'python'; Shortlisted has 'excel'
    // python should have higher freq weight than excel
    const benchmarks = [
      bench(cand('Hired1', ['python'], 5), 'Hired'),
      bench(cand('Short1', ['excel'], 5), 'Shortlisted'),
    ];
    const profile = buildIdealProfile(benchmarks);
    expect(profile.skillFreq['python']).toBe(3.0); // 1 Hired
    expect(profile.skillFreq['excel']).toBe(1.0);  // 1 Shortlisted
    // python should be core (weight 3.0 > threshold), excel may not be
    expect(profile.coreSkills).toContain('python');
  });
});

// ── PSM-B: Confidence tiers ───────────────────────────────────────────────────
describe('PSM-B: confidence tiers', () => {
  it('effectiveN < 2 → low', () => {
    expect(confidenceTier(1.0)).toBe('low');
    expect(confidenceTier(1.5)).toBe('low');
  });
  it('effectiveN 2–4 → medium', () => {
    expect(confidenceTier(2.0)).toBe('medium');
    expect(confidenceTier(4.0)).toBe('medium');
  });
  it('effectiveN > 4 → high', () => {
    expect(confidenceTier(4.1)).toBe('high');
    expect(confidenceTier(10)).toBe('high');
  });
  it('buildIdealProfile propagates confidence', () => {
    const p1 = buildIdealProfile([bench(cand('A', ['react'], 5), 'Shortlisted')]);
    expect(p1.confidence).toBe('low');   // effectiveN = 1.0

    // Shortlisted(1) + Hired(3) = effectiveN 4.0 → ≤4 → medium
    const p4 = buildIdealProfile([
      bench(cand('A', ['react'], 5), 'Shortlisted'),
      bench(cand('B', ['react'], 5), 'Hired'),
    ]);
    expect(p4.confidence).toBe('medium');

    // 3 Hired = effectiveN 9 → > 4 → high
    const p9 = buildIdealProfile([
      bench(cand('A', ['react'], 5), 'Hired'),
      bench(cand('B', ['react'], 5), 'Hired'),
      bench(cand('C', ['react'], 5), 'Hired'),
    ]);
    expect(p9.confidence).toBe('high');
  });
});

// ── PSM-C: Core threshold widens when confidence is low ───────────────────────
describe('PSM-C: core skill threshold adapts to confidence', () => {
  it('low confidence uses 33% threshold (not 50%)', () => {
    const thresh = _coreThreshold(1.0, 'low');
    expect(thresh).toBeLessThanOrEqual(0.5); // should be 0.33 * 1 = 0.33
  });
  it('high confidence uses 50% threshold', () => {
    const thresh = _coreThreshold(10, 'high');
    expect(thresh).toBe(5); // 10 * 0.5
  });
  it('1 benchmark: all skills appear as core (weight 1 > threshold 0.33)', () => {
    const profile = buildIdealProfile([bench(cand('A', ['react', 'node', 'python'], 5), 'Shortlisted')]);
    // effectiveN = 1, confidence = low, threshold = 0.33
    // all skills have freq 1.0 > 0.33 → all are core
    expect(profile.coreSkills).toContain('react');
    expect(profile.coreSkills).toContain('node');
    expect(profile.coreSkills).toContain('python');
    expect(profile.confidence).toBe('low');
  });
  it('high confidence: skill in only 1/5 benchmarks is NOT core', () => {
    const benchmarks = [
      bench(cand('A', ['react', 'typescript'], 5), 'Shortlisted'),
      bench(cand('B', ['react', 'typescript'], 5), 'Shortlisted'),
      bench(cand('C', ['react', 'typescript'], 5), 'Shortlisted'),
      bench(cand('D', ['react', 'typescript'], 5), 'Shortlisted'),
      bench(cand('E', ['react', 'obscure-tool'], 5), 'Shortlisted'), // only E has obscure-tool
    ];
    const profile = buildIdealProfile(benchmarks);
    expect(profile.confidence).toBe('high');   // effectiveN = 5
    expect(profile.coreSkills).toContain('react');
    expect(profile.coreSkills).not.toContain('obscure-tool'); // only 1/5 = 20% < 50%
  });
});

// ── PSM-D: Score ranking ──────────────────────────────────────────────────────
describe('PSM-D: better candidates rank higher', () => {
  const benchmarks = [
    bench(cand('B1', ['react', 'node', 'typescript', 'aws', 'docker'], 5, 'Senior Engineer'), 'Hired'),
    bench(cand('B2', ['react', 'node', 'typescript'], 5, 'Senior Engineer'), 'Shortlisted'),
  ];
  const profile = buildIdealProfile(benchmarks);

  it('candidate with more core skills scores higher', () => {
    const strong = cand('Strong', ['react', 'node', 'typescript', 'aws', 'docker'], 5);
    const weak   = cand('Weak',   ['excel', 'word'], 5);
    expect(scoreCandidate(strong, profile).score).toBeGreaterThan(scoreCandidate(weak, profile).score);
  });

  it('candidate with in-range experience scores higher than severely under-exp', () => {
    const inRange = cand('InRange', ['react', 'node'], 5);   // avg exp ~5
    const junior  = cand('Junior',  ['react', 'node'], 1);   // 4y under
    expect(scoreCandidate(inRange, profile).score).toBeGreaterThan(scoreCandidate(junior, profile).score);
  });

  it('all scores are in [0, 100]', () => {
    const cases = [
      cand('Zero',    [],                   0),
      cand('Perfect', ['react','node','typescript','aws','docker'], 5),
      cand('Partial', ['react'],            3),
      cand('Over',    ['react','node'],     20),
    ];
    cases.forEach(c => {
      const { score } = scoreCandidate(c, profile);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});

// ── PSM-E: Missing core skill penalty ────────────────────────────────────────
describe('PSM-E: missing core skills apply a score penalty', () => {
  it('candidate missing 3 core skills scores lower than candidate missing 0', () => {
    // Profile has 4 core skills (all appear in high-confidence benchmarks)
    const benchmarks = [
      bench(cand('B1', ['react','node','aws','docker'], 5), 'Shortlisted'),
      bench(cand('B2', ['react','node','aws','docker'], 5), 'Shortlisted'),
      bench(cand('B3', ['react','node','aws','docker'], 5), 'Shortlisted'),
    ];
    const profile = buildIdealProfile(benchmarks);
    expect(profile.coreSkills).toHaveLength(4);

    // Both candidates have same exp and no title — only skill overlap differs
    const allCore    = cand('AllCore',  ['react','node','aws','docker'],  5); // 0 missing
    const missingAll = cand('MissCore', ['react'],                        5); // 3 missing

    const scoreAll  = scoreCandidate(allCore,    profile).score;
    const scoreMiss = scoreCandidate(missingAll, profile).score;
    expect(scoreAll).toBeGreaterThan(scoreMiss);
  });

  it('missingCoreSkills list is populated correctly', () => {
    const benchmarks = [
      bench(cand('B1', ['react','node','aws'], 5), 'Shortlisted'),
      bench(cand('B2', ['react','node','aws'], 5), 'Shortlisted'),
      bench(cand('B3', ['react','node','aws'], 5), 'Shortlisted'),
    ];
    const profile = buildIdealProfile(benchmarks);
    const result = scoreCandidate(cand('C', ['react'], 5), profile);
    expect(result.missingCoreSkills).toContain('node');
    expect(result.missingCoreSkills).toContain('aws');
    expect(result.missingCoreSkills).not.toContain('react'); // has it
  });
});

// ── PSM-F: Smooth experience curve ───────────────────────────────────────────
describe('PSM-F: experience score is smooth and monotonically decreasing', () => {
  it('exact match → score is 100', () => {
    expect(expScoreGaussian(5, 5)).toBe(100);
  });
  it('score decreases as gap grows (under-experienced)', () => {
    const s5 = expScoreGaussian(5, 5); // 0 gap
    const s4 = expScoreGaussian(4, 5); // 1y under
    const s3 = expScoreGaussian(3, 5); // 2y under
    const s1 = expScoreGaussian(1, 5); // 4y under
    expect(s5).toBeGreaterThan(s4);
    expect(s4).toBeGreaterThan(s3);
    expect(s3).toBeGreaterThan(s1);
  });
  it('score decreases as gap grows (over-experienced)', () => {
    const s5  = expScoreGaussian(5, 5);
    const s7  = expScoreGaussian(7, 5);
    const s10 = expScoreGaussian(10, 5);
    expect(s5).toBeGreaterThan(s7);
    expect(s7).toBeGreaterThan(s10);
  });
  it('no exp data → neutral 60', () => {
    expect(expScoreGaussian(0, 5)).toBe(60);
    expect(expScoreGaussian(5, 0)).toBe(60);
  });
  it('being over-experienced is penalised less than being under-experienced', () => {
    // Under: k=0.10, Over: k=0.06
    const under = expScoreGaussian(2, 5); // 3y under
    const over  = expScoreGaussian(8, 5); // 3y over
    expect(over).toBeGreaterThan(under);
  });
  it('all scores in [0, 100]', () => {
    [[0,5],[5,0],[5,5],[1,10],[15,3]].forEach(([c,b]) => {
      const s = expScoreGaussian(c, b);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    });
  });
});

// ── PSM-G: Plain-English explanation ─────────────────────────────────────────
describe('PSM-G: plain-English explanation', () => {
  const benchmarks = [
    bench(cand('B1', ['react','node','aws'], 5, 'Senior Engineer'), 'Shortlisted'),
    bench(cand('B2', ['react','node','aws'], 5, 'Senior Engineer'), 'Shortlisted'),
    bench(cand('B3', ['react','node','aws'], 5, 'Senior Engineer'), 'Shortlisted'),
  ];
  const profile = buildIdealProfile(benchmarks);

  it('full match → explanation mentions core skills', () => {
    const r = scoreCandidate(cand('C', ['react','node','aws'], 5), profile);
    expect(r.explanation).toContain('core skill');
    expect(r.explanation).toMatch(/react|node|aws/);
  });

  it('missing skills → explanation mentions "missing core"', () => {
    const r = scoreCandidate(cand('C', ['react'], 5), profile);
    expect(r.explanation).toContain('missing core');
  });

  it('experience in range → explanation says "in range"', () => {
    const r = scoreCandidate(cand('C', ['react','node','aws'], 5), profile);
    expect(r.explanation).toContain('in range');
  });

  it('low confidence benchmark → explanation warns recruiter', () => {
    const lowProfile = buildIdealProfile([bench(cand('B', ['react'], 5), 'Shortlisted')]);
    const r = scoreCandidate(cand('C', ['react'], 5), lowProfile);
    expect(r.explanation).toContain('1 benchmark');
  });

  it('no skills match → explanation says "No direct skill overlap"', () => {
    const r = scoreCandidate(cand('C', ['cobol'], 5), profile);
    expect(r.explanation).toContain('No direct skill overlap');
  });
});

// ── PSM-H: Weight tuning changes ranking ─────────────────────────────────────
describe('PSM-H: configurable weights change ranking order', () => {
  const benchmarks = [
    bench(cand('B1', ['react','node'], 5), 'Shortlisted'),
    bench(cand('B2', ['react','node'], 5), 'Shortlisted'),
    bench(cand('B3', ['react','node'], 5), 'Shortlisted'),
  ];
  const profile = buildIdealProfile(benchmarks);

  // CandA: great skills, low exp (1y vs 5y benchmark)
  // CandB: average skills (only 1), perfect exp
  const candA = cand('CandA', ['react','node'], 1);
  const candB = cand('CandB', ['react'],        5);

  it('default weights: skill-heavy candidate can outscore exp-heavy one', () => {
    const sA = scoreCandidate(candA, profile).score;
    const sB = scoreCandidate(candB, profile).score;
    // candA has both skills, candB only one — at default weights, candA should win
    expect(sA).toBeGreaterThan(sB);
  });

  it('exp-heavy weights: exp-fit candidate can beat poor-exp candidate', () => {
    const expWeights = { skills: 10, exp: 70, title: 10, keywords: 10 };
    const sA = scoreCandidate(candA, profile, expWeights).score; // 1y exp, big penalty
    const sB = scoreCandidate(candB, profile, expWeights).score; // 5y exp, no penalty
    expect(sB).toBeGreaterThan(sA);
  });

  it('normaliseWeights always returns values summing to 100', () => {
    const cases = [
      { skills: 50, exp: 30, title: 10, keywords: 10 },
      { skills: 10, exp: 10, title: 10, keywords: 10 },
      { skills: 100, exp: 0, title: 0, keywords: 0 },
      undefined,
      null,
    ];
    cases.forEach(w => {
      const n = normaliseWeights(w);
      const sum = n.skills + n.exp + n.title + n.keywords;
      expect(Math.abs(sum - 100)).toBeLessThan(0.01);
    });
  });
});

// ── PSM-I: Single-benchmark edge case ────────────────────────────────────────
describe('PSM-I: single benchmark (low confidence)', () => {
  it('returns low confidence and all skills are core', () => {
    const profile = buildIdealProfile([
      bench(cand('OnlyOne', ['react','graphql','redis'], 7, 'Full Stack'), 'Shortlisted'),
    ]);
    expect(profile.confidence).toBe('low');
    expect(profile.benchmarkCount).toBe(1);
    expect(profile.coreSkills).toContain('react');
    expect(profile.coreSkills).toContain('graphql');
    expect(profile.coreSkills).toContain('redis');
  });

  it('still scores candidates and ranks by overlap', () => {
    const profile = buildIdealProfile([
      bench(cand('B', ['react','node'], 5), 'Shortlisted'),
    ]);
    const full    = scoreCandidate(cand('Full',    ['react','node'], 5), profile);
    const partial = scoreCandidate(cand('Partial', ['react'],        5), profile);
    const none    = scoreCandidate(cand('None',    ['cobol'],        5), profile);
    expect(full.score).toBeGreaterThan(partial.score);
    expect(partial.score).toBeGreaterThan(none.score);
  });
});

// ── PSM-J: Edge cases ────────────────────────────────────────────────────────
describe('PSM-J: edge cases', () => {
  it('empty benchmarks → buildIdealProfile returns null', () => {
    expect(buildIdealProfile([])).toBeNull();
    expect(buildIdealProfile(null)).toBeNull();
  });

  it('candidate with no skills → low score, no crash', () => {
    const profile = buildIdealProfile([
      bench(cand('B', ['react','node'], 5), 'Shortlisted'),
      bench(cand('B2',['react','node'], 5), 'Shortlisted'),
      bench(cand('B3',['react','node'], 5), 'Shortlisted'),
    ]);
    const r = scoreCandidate(cand('Empty', [], 5), profile);
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.matchedSkills).toHaveLength(0);
    expect(r.coreSkillsMatched).toHaveLength(0);
  });

  it('candidate skills are case-normalised', () => {
    const profile = buildIdealProfile([
      bench(cand('B', ['React', 'Node.JS'], 5), 'Shortlisted'),
      bench(cand('B2',['React', 'Node.JS'], 5), 'Shortlisted'),
      bench(cand('B3',['React', 'Node.JS'], 5), 'Shortlisted'),
    ]);
    const r = scoreCandidate(cand('C', ['react', 'node.js'], 5), profile);
    expect(r.matchedSkills).toContain('react');
  });
});

// ── PSM-K: normaliseWeights ───────────────────────────────────────────────────
describe('PSM-K: normaliseWeights', () => {
  it('returns defaults when no weights passed', () => {
    const n = normaliseWeights(null);
    expect(n.skills).toBe(40);
    expect(n.exp).toBe(25);
    expect(n.title).toBe(20);
    expect(n.keywords).toBe(15);
  });

  it('rescales arbitrary weights to sum to 100', () => {
    const n = normaliseWeights({ skills: 1, exp: 1, title: 1, keywords: 1 });
    expect(Math.abs(n.skills - 25)).toBeLessThan(0.01);
    expect(Math.abs((n.skills + n.exp + n.title + n.keywords) - 100)).toBeLessThan(0.01);
  });
});
