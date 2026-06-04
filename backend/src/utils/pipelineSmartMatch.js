/**
 * Pipeline Smart Match — Talent Mirror Engine
 *
 * Builds an "ideal candidate profile" from benchmark (shortlisted/interviewed)
 * candidates and scores every other applicant against it using a
 * multi-dimensional weighted algorithm:
 *
 *   Skills overlap       40%
 *   Experience fit       25%
 *   Role / title align   20%
 *   Profile keyword bag  15%
 *
 * Bonus: +5 per core skill matched (capped at +15).
 */

const STOP_WORDS = new Set([
  'and','the','for','with','from','this','that','are','has','have',
  'was','were','will','been','being','had','its','their','they',
  'our','you','your','his','her','not','but','can','all','when',
  'who','which','than','also','into','more','over','year','years',
  'work','team','project','projects','company','companies','role',
  'strong','good','well','able','build','built','used','use','new',
  'using','like','including','including','key','must','should','would',
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
    candidate.title        || '',
    candidate.summary      || '',
    candidate.currentCompany || '',
    ...(candidate.skills   || []),
    ...(candidate.parsedProfile?.skills || []),
  ];

  if (Array.isArray(candidate.parsedProfile?.experience)) {
    candidate.parsedProfile.experience.forEach(e => {
      parts.push(e.role || e.title || '');
      parts.push(e.company || '');
      parts.push(e.description || '');
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
      parts.push(e.degree || '');
      parts.push(e.field  || '');
    });
  }
  if (candidate.educationList) {
    try {
      const el = JSON.parse(candidate.educationList);
      if (Array.isArray(el)) {
        el.forEach(e => parts.push(e.degree || e.field || ''));
      }
    } catch {}
  }
  return parts.join(' ');
}

/**
 * Build the ideal-candidate profile from an array of benchmark candidates.
 * Returns a profile descriptor used by scoreCandidate().
 */
function buildIdealProfile(benchmarkCandidates) {
  if (!benchmarkCandidates || benchmarkCandidates.length === 0) return null;

  const skillFreq   = {};   // skill → count among benchmarks
  const titleFreq   = {};   // title token → count
  const textFreq    = {};   // full-profile token → count
  let   totalExp    = 0;
  let   expCount    = 0;

  benchmarkCandidates.forEach(c => {
    getAllSkills(c).forEach(s => {
      skillFreq[s] = (skillFreq[s] || 0) + 1;
    });
    tokenize(c.title || '').forEach(w => {
      titleFreq[w] = (titleFreq[w] || 0) + 1;
    });
    tokenize(getFullProfileText(c)).forEach(w => {
      textFreq[w] = (textFreq[w] || 0) + 1;
    });
    const exp = getExpYears(c);
    if (exp > 0) { totalExp += exp; expCount++; }
  });

  const n       = benchmarkCandidates.length;
  const avgExp  = expCount > 0 ? totalExp / expCount : 0;
  const minExp  = Math.max(0, avgExp - 2);
  const maxExp  = avgExp + 3;

  // Core skills = in ≥50% of benchmarks
  const coreSkills = Object.entries(skillFreq)
    .filter(([, f]) => f >= Math.max(1, Math.ceil(n * 0.5)))
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);

  // Important skills = in ≥25% of benchmarks
  const importantSkills = Object.entries(skillFreq)
    .filter(([, f]) => f >= Math.max(1, Math.ceil(n * 0.25)))
    .map(([s]) => s);

  const allSkills = Object.keys(skillFreq);

  // Skill weight total for normalisation
  const totalSkillWeight = Object.values(skillFreq).reduce((a, b) => a + b, 0) || 1;
  const totalTitleWeight = Object.values(titleFreq).reduce((a, b) => a + b, 0) || 1;
  const totalTextWeight  = Object.values(textFreq).reduce((a, b) => a + b, 0) || 1;

  return {
    skillFreq, titleFreq, textFreq,
    coreSkills, importantSkills, allSkills,
    totalSkillWeight, totalTitleWeight, totalTextWeight,
    avgExp, minExp, maxExp,
    benchmarkCount: n,
  };
}

/**
 * Score a single candidate against the ideal profile.
 * Returns { score, breakdown, matchedSkills, missingCoreSkills, expMatch }
 */
function scoreCandidate(candidate, idealProfile) {
  const {
    skillFreq, titleFreq, textFreq,
    coreSkills, allSkills,
    totalSkillWeight, totalTitleWeight, totalTextWeight,
    avgExp, minExp, maxExp,
  } = idealProfile;

  /* ── 1. Skills Score (40%) ──────────────────────────────────────────── */
  const candSkills     = getAllSkills(candidate);
  const matchedSkills  = [];
  let   skillRaw       = 0;

  candSkills.forEach(s => {
    if (skillFreq[s]) {
      skillRaw += skillFreq[s];
      matchedSkills.push(s);
    }
  });

  // 1.5× multiplier — generous: finding all core skills should hit ~100
  const skillScore = Math.min(100, (skillRaw / totalSkillWeight) * 100 * 1.5);

  /* ── 2. Experience Score (25%) ─────────────────────────────────────── */
  const candExp = getExpYears(candidate);
  let expScore  = 60; // neutral when no data
  if (avgExp > 0 && candExp > 0) {
    const diff = Math.abs(candExp - avgExp);
    if (candExp >= minExp && candExp <= maxExp) {
      expScore = diff <= 0.5 ? 100 : diff <= 1 ? 90 : diff <= 2 ? 75 : 60;
    } else if (candExp < minExp) {
      const gap = minExp - candExp;
      expScore = gap <= 1 ? 45 : gap <= 2 ? 30 : 15;
    } else {
      const gap = candExp - maxExp;
      expScore = gap <= 1 ? 55 : gap <= 3 ? 40 : 25;
    }
  }

  /* ── 3. Role / Title Score (20%) ───────────────────────────────────── */
  const candTitleTokens = tokenize(candidate.title || '');
  let   titleRaw        = 0;
  candTitleTokens.forEach(w => { if (titleFreq[w]) titleRaw += titleFreq[w]; });
  const titleScore = Math.min(100, (titleRaw / totalTitleWeight) * 100 * 2);

  /* ── 4. Profile Keyword Score (15%) ────────────────────────────────── */
  const candTextTokenSet = new Set(tokenize(getFullProfileText(candidate)));
  let   textRaw          = 0;
  candTextTokenSet.forEach(w => { if (textFreq[w]) textRaw += textFreq[w]; });
  const textScore = Math.min(100, (textRaw / totalTextWeight) * 100 * 1.8);

  /* ── Weighted Total ─────────────────────────────────────────────────── */
  const base = skillScore * 0.40 + expScore * 0.25 + titleScore * 0.20 + textScore * 0.15;

  // Core-skill bonus: +5 per core skill matched, cap +15
  const coreMatched  = coreSkills.filter(s => matchedSkills.includes(s));
  const coreBonus    = Math.min(15, coreMatched.length * 5);

  const finalScore = Math.min(100, Math.round(base + coreBonus));

  const missingCoreSkills = coreSkills
    .filter(s => !matchedSkills.includes(s))
    .slice(0, 6);

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
    expMatch: {
      candidate:  Math.round(candExp  * 10) / 10,
      benchmark:  Math.round(avgExp   * 10) / 10,
      inRange:    candExp >= minExp && candExp <= maxExp,
    },
  };
}

module.exports = { buildIdealProfile, scoreCandidate, getAllSkills, getExpYears };
