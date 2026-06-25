'use strict';
/**
 * Pipeline Smart Match — Talent Mirror Engine v2
 *
 * Six improvements over v1:
 *   1. Stage-weighted benchmarks  — Hired(3×) > Offer(2.5×) > IR2(2×) > IR1(1.5×) > Shortlisted(1×)
 *   2. Plain-English "why" per match — one sentence the recruiter can read
 *   3. Small-benchmark confidence  — flags low/medium/high + widens core threshold when thin
 *   4. Missing core skills penalty — up to −10 pts proportional to how many core skills are absent
 *   5. Smooth experience curve     — Gaussian decay instead of hard step-buckets
 *   6. Configurable weights        — caller passes { skills, exp, title, keywords } summing to 100
 *
 * Default weights: skills=40 exp=25 title=20 keywords=15
 */

// ── Stage weights (higher stage = stronger signal) ────────────────────────────
const STAGE_WEIGHTS = {
  Hired:              3.0,
  Offer:              2.5,
  'Interview Round 2': 2.0,
  'Interview Round 1': 1.5,
  Shortlisted:        1.0,
};
function stageWeight(stage) {
  return STAGE_WEIGHTS[stage] || 1.0;
}

// ── Confidence tier based on total effective benchmark weight ─────────────────
// effectiveN = sum of stage weights across all benchmarks
// < 2   → low    (e.g. 1 shortlisted candidate)
// 2–4   → medium
// > 4   → high
function confidenceTier(effectiveN) {
  if (effectiveN < 2)  return 'low';
  if (effectiveN <= 4) return 'medium';
  return 'high';
}

// Core skill threshold: how many effective benchmarks must share a skill
// We widen the net when confidence is low so we don't over-fit to 1 person.
function coreThreshold(effectiveN, confidence) {
  if (confidence === 'low')    return Math.max(0.5, effectiveN * 0.33); // ≥33%
  if (confidence === 'medium') return effectiveN * 0.40;                // ≥40%
  return effectiveN * 0.50;                                              // ≥50%
}
function importantThreshold(effectiveN) {
  return Math.max(0.5, effectiveN * 0.25); // ≥25%, at least 1
}

// ── Stop words (common words that carry no signal) ────────────────────────────
const STOP_WORDS = new Set([
  'and','the','for','with','from','this','that','are','has','have',
  'was','were','will','been','being','had','its','their','they',
  'our','you','your','his','her','not','but','can','all','when',
  'who','which','than','also','into','more','over','year','years',
  'work','team','project','projects','company','companies','role',
  'strong','good','well','able','build','built','used','use','new',
  'using','like','including','key','must','should','would',
  'experience','experienced','knowledge','skills','ability','across',
  'within','between','multiple','various','both','through','without',
  'develop','developed','developer','development','management','managing',
  'working','provide','providing','ensure','ensuring','support','supporting',
]);

function tokenize(text) {
  if (!text) return [];
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9#+\-\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function getAllSkills(candidate) {
  const skills = new Set();
  (candidate.skills || []).forEach(s => {
    if (s) skills.add(String(s).toLowerCase().trim());
  });
  (candidate.parsedProfile?.skills || []).forEach(s => {
    if (s) skills.add(String(s).toLowerCase().trim());
  });
  return [...skills].filter(Boolean);
}

function getExpYears(candidate) {
  return candidate.parsedProfile?.totalExperienceYears
    || candidate.experience
    || 0;
}

function getFullProfileText(candidate) {
  const parts = [
    candidate.title          || '',
    candidate.summary        || '',
    candidate.currentCompany || '',
    ...(candidate.skills     || []),
    ...(candidate.parsedProfile?.skills || []),
  ];
  if (Array.isArray(candidate.parsedProfile?.experience)) {
    candidate.parsedProfile.experience.forEach(e => {
      parts.push(e.role || e.title || '', e.company || '', e.description || '');
    });
  }
  if (candidate.workHistory) {
    try {
      const wh = JSON.parse(candidate.workHistory);
      if (Array.isArray(wh)) {
        wh.forEach(w => {
          parts.push(w.title || w.role || w.designation || '');
          parts.push(w.company || w.employer || '');
          parts.push(w.description || w.responsibilities || '');
        });
      }
    } catch {}
  }
  if (Array.isArray(candidate.parsedProfile?.education)) {
    candidate.parsedProfile.education.forEach(e => {
      parts.push(e.degree || '', e.field || '');
    });
  }
  if (candidate.educationList) {
    try {
      const el = JSON.parse(candidate.educationList);
      if (Array.isArray(el)) el.forEach(e => parts.push(e.degree || e.field || ''));
    } catch {}
  }
  return parts.join(' ');
}

// ── Smooth experience curve ───────────────────────────────────────────────────
// Returns 0–100. Uses a Gaussian decay: score = 100 × exp(−k × deviation²)
// Peaked at the benchmark average; k tuned so ±2 years → ~60, ±5 years → ~13.
// When no experience data is available from either side → neutral 60.
function expScoreGaussian(candExp, avgExp) {
  if (avgExp <= 0 || candExp <= 0) return 60; // neutral — no data
  const deviation = candExp - avgExp;
  // Asymmetric: being over-experienced is penalised less than being under-experienced
  const k = deviation < 0 ? 0.10 : 0.06;
  return Math.round(100 * Math.exp(-k * deviation * deviation));
}

// ── Plain-English "why this match" explanation ────────────────────────────────
function explainMatch({ matchedSkills, coreSkillsMatched, missingCoreSkills, expMatch, breakdown, score, confidence }) {
  const parts = [];

  // Skills
  if (coreSkillsMatched.length > 0) {
    const shown = coreSkillsMatched.slice(0, 3).join(', ');
    const more  = coreSkillsMatched.length > 3 ? ` +${coreSkillsMatched.length - 3} more` : '';
    parts.push(`Matches ${coreSkillsMatched.length} core skill${coreSkillsMatched.length > 1 ? 's' : ''}: ${shown}${more}`);
  } else if (matchedSkills.length > 0) {
    parts.push(`${matchedSkills.length} supporting skill${matchedSkills.length > 1 ? 's' : ''} match`);
  } else {
    parts.push('No direct skill overlap with benchmarks');
  }

  // Experience
  if (expMatch.benchmark > 0 && expMatch.candidate > 0) {
    if (expMatch.inRange) {
      parts.push(`experience in range (${expMatch.candidate}y vs ~${expMatch.benchmark}y benchmark)`);
    } else if (expMatch.candidate < expMatch.benchmark) {
      const gap = Math.round((expMatch.benchmark - expMatch.candidate) * 10) / 10;
      parts.push(`${gap}y under experience benchmark`);
    } else {
      const over = Math.round((expMatch.candidate - expMatch.benchmark) * 10) / 10;
      parts.push(`${over}y over experience benchmark`);
    }
  }

  // Missing critical skills
  if (missingCoreSkills.length > 0) {
    const shown = missingCoreSkills.slice(0, 2).join(', ');
    const more  = missingCoreSkills.length > 2 ? ` +${missingCoreSkills.length - 2}` : '';
    parts.push(`missing core: ${shown}${more}`);
  }

  // Low confidence caveat
  if (confidence === 'low') {
    parts.push('⚠ based on 1 benchmark — treat as directional');
  }

  return parts.join(' · ');
}

// ── buildIdealProfile ─────────────────────────────────────────────────────────
/**
 * Build the ideal-candidate profile from an array of benchmark objects.
 * Each benchmark: { candidate: CandidateDoc, stage: string }
 *
 * Returns a profile descriptor used by scoreCandidate().
 */
function buildIdealProfile(benchmarks) {
  if (!benchmarks || benchmarks.length === 0) return null;

  const skillFreq   = {};   // skill → weighted frequency (sum of stage weights)
  const titleFreq   = {};   // title token → weighted count
  const textFreq    = {};   // full-profile token → weighted count
  let   weightedExp = 0;
  let   totalWeight = 0;

  // Also track which stages are represented for the summary
  const stagesPresent = new Set();

  benchmarks.forEach(({ candidate: c, stage }) => {
    const w = stageWeight(stage);
    stagesPresent.add(stage);

    getAllSkills(c).forEach(s => {
      skillFreq[s] = (skillFreq[s] || 0) + w;
    });
    tokenize(c.title || '').forEach(tok => {
      titleFreq[tok] = (titleFreq[tok] || 0) + w;
    });
    tokenize(getFullProfileText(c)).forEach(tok => {
      textFreq[tok] = (textFreq[tok] || 0) + w;
    });

    const exp = getExpYears(c);
    if (exp > 0) {
      weightedExp += exp * w;
      totalWeight += w;
    }
  });

  // Total effective weight = sum of all stage weights
  const effectiveN  = benchmarks.reduce((sum, b) => sum + stageWeight(b.stage), 0);
  const confidence  = confidenceTier(effectiveN);
  const coreThresh  = coreThreshold(effectiveN, confidence);
  const impThresh   = importantThreshold(effectiveN);

  const coreSkills = Object.entries(skillFreq)
    .filter(([, f]) => f >= coreThresh)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);

  const importantSkills = Object.entries(skillFreq)
    .filter(([, f]) => f >= impThresh)
    .map(([s]) => s);

  const allSkills = Object.keys(skillFreq);

  const totalSkillWeight = Object.values(skillFreq).reduce((a, b) => a + b, 0) || 1;
  const totalTitleWeight = Object.values(titleFreq).reduce((a, b) => a + b, 0) || 1;
  const totalTextWeight  = Object.values(textFreq).reduce((a, b) => a + b, 0)  || 1;

  const avgExp = totalWeight > 0 ? weightedExp / totalWeight : 0;
  const minExp = Math.max(0, avgExp - 2);
  const maxExp = avgExp + 3;

  return {
    skillFreq, titleFreq, textFreq,
    coreSkills, importantSkills, allSkills,
    totalSkillWeight, totalTitleWeight, totalTextWeight,
    avgExp, minExp, maxExp,
    effectiveN, confidence,
    benchmarkCount: benchmarks.length,
    stagesPresent: [...stagesPresent],
  };
}

// ── scoreCandidate ─────────────────────────────────────────────────────────────
/**
 * Score a single candidate against the ideal profile.
 *
 * @param {object} candidate  — Mongoose candidate doc
 * @param {object} idealProfile — from buildIdealProfile()
 * @param {object} [weights]  — optional { skills, exp, title, keywords } summing to 100
 * @returns {{ score, breakdown, matchedSkills, coreSkillsMatched,
 *             missingCoreSkills, expMatch, explanation, confidence }}
 */
function scoreCandidate(candidate, idealProfile, weights) {
  const {
    skillFreq, titleFreq, textFreq,
    coreSkills, allSkills,
    totalSkillWeight, totalTitleWeight, totalTextWeight,
    avgExp, minExp, maxExp,
    confidence,
  } = idealProfile;

  // Resolve weights (must sum to ~100; default 40/25/20/15)
  const W = normaliseWeights(weights);

  /* ── 1. Skills Score ─────────────────────────────────────────────────── */
  const candSkills    = getAllSkills(candidate);
  const matchedSkills = [];
  let   skillRaw      = 0;

  candSkills.forEach(s => {
    if (skillFreq[s]) {
      skillRaw += skillFreq[s];
      matchedSkills.push(s);
    }
  });

  // Normalise against benchmark total; 1.5× generous multiplier retained
  const skillScore = Math.min(100, (skillRaw / totalSkillWeight) * 100 * 1.5);

  /* ── 2. Experience Score (smooth Gaussian) ───────────────────────────── */
  const candExp = getExpYears(candidate);
  const expScore = expScoreGaussian(candExp, avgExp);

  /* ── 3. Role / Title Score ───────────────────────────────────────────── */
  const candTitleTokens = tokenize(candidate.title || '');
  let   titleRaw        = 0;
  candTitleTokens.forEach(w => { if (titleFreq[w]) titleRaw += titleFreq[w]; });
  const titleScore = Math.min(100, (titleRaw / totalTitleWeight) * 100 * 2);

  /* ── 4. Profile Keyword Score ────────────────────────────────────────── */
  const candTextTokenSet = new Set(tokenize(getFullProfileText(candidate)));
  let   textRaw          = 0;
  candTextTokenSet.forEach(w => { if (textFreq[w]) textRaw += textFreq[w]; });
  const textScore = Math.min(100, (textRaw / totalTextWeight) * 100 * 1.8);

  /* ── Weighted Base ───────────────────────────────────────────────────── */
  const base = (
    skillScore * (W.skills / 100) +
    expScore   * (W.exp    / 100) +
    titleScore * (W.title  / 100) +
    textScore  * (W.keywords / 100)
  );

  /* ── Core-skill bonus & penalty ──────────────────────────────────────── */
  const coreMatched      = coreSkills.filter(s => matchedSkills.includes(s));
  const missingCoreCount = coreSkills.length - coreMatched.length;

  // Bonus: +5 per core skill matched, cap +15
  const coreBonus = Math.min(15, coreMatched.length * 5);

  // Penalty: missing core skills subtract proportionally (max −10 for missing ALL core)
  const corePenalty = coreSkills.length > 0
    ? Math.round((missingCoreCount / coreSkills.length) * 10)
    : 0;

  const finalScore = Math.min(100, Math.max(0, Math.round(base + coreBonus - corePenalty)));

  const missingCoreSkills = coreSkills
    .filter(s => !matchedSkills.includes(s))
    .slice(0, 6);

  const expMatch = {
    candidate: Math.round(candExp * 10) / 10,
    benchmark: Math.round(avgExp  * 10) / 10,
    inRange:   candExp >= minExp && candExp <= maxExp,
  };

  const explanation = explainMatch({
    matchedSkills,
    coreSkillsMatched: coreMatched,
    missingCoreSkills,
    expMatch,
    breakdown: { skillScore, expScore, titleScore, textScore },
    score: finalScore,
    confidence,
  });

  return {
    score: finalScore,
    breakdown: {
      skillScore:  Math.round(skillScore),
      expScore:    Math.round(expScore),
      titleScore:  Math.round(titleScore),
      textScore:   Math.round(textScore),
    },
    matchedSkills,
    coreSkillsMatched: coreMatched,
    missingCoreSkills,
    expMatch,
    explanation,
    confidence,
  };
}

// ── Weight normalisation ──────────────────────────────────────────────────────
function normaliseWeights(raw) {
  const defaults = { skills: 40, exp: 25, title: 20, keywords: 15 };
  if (!raw) return defaults;
  const w = {
    skills:   Number(raw.skills)   || defaults.skills,
    exp:      Number(raw.exp)      || defaults.exp,
    title:    Number(raw.title)    || defaults.title,
    keywords: Number(raw.keywords) || defaults.keywords,
  };
  const sum = w.skills + w.exp + w.title + w.keywords;
  if (sum <= 0) return defaults;
  // Rescale so they always sum to 100
  const scale = 100 / sum;
  return {
    skills:   w.skills   * scale,
    exp:      w.exp      * scale,
    title:    w.title    * scale,
    keywords: w.keywords * scale,
  };
}

module.exports = {
  buildIdealProfile,
  scoreCandidate,
  getAllSkills,
  getExpYears,
  expScoreGaussian,
  explainMatch,
  normaliseWeights,
  stageWeight,
  confidenceTier,
  // exported for tests
  _coreThreshold: coreThreshold,
};
