'use strict';

const { expandSkills, extractSeniorityRank, locationMatch } = require('./techOntology');

/**
 * calculateTalentMatchScore — Deep two-way matching engine.
 *
 * Dimensions scored:
 *   skills (40%) — UTO semantic + exact match
 *   experience (20%) — Gaussian curve with min/max bounds
 *   location (12%) — exact / alias (Indian cities) / relocation intent
 *   seniority (10%) — rank extracted from title/description
 *   notice (10%) — days until available
 *   salary (8%) — expected vs budget overlap
 *
 * Missing data → weight redistributed to active dimensions.
 *
 * @param {object} job
 * @param {object} candidate
 * @param {object} [opts] — { maxNoticeDays }
 * @returns {{ score: number, breakdown: object }}
 */
function calculateTalentMatchScore(job, candidate, opts = {}) {
  const profile = candidate.parsedProfile || {};
  const cSkills = Array.isArray(candidate.skills) && candidate.skills.length > 0
    ? candidate.skills
    : (profile.skills || []);

  // ── 1. Base weights ──────────────────────────────────────────────────────────
  const weights = {
    skills:     0.40,
    experience: 0.20,
    location:   0.12,
    seniority:  0.10,
    notice:     0.10,
    salary:     0.08,
  };
  const scores = { skills: 0, experience: 0, location: 0, seniority: 0, notice: 0, salary: 0 };

  // ── 2. Skills ────────────────────────────────────────────────────────────────
  const jobSkills  = normaliseSkills(job.skills);
  const candSkills = normaliseSkills(cSkills);

  if (jobSkills.length > 0) {
    const expandedCand = expandSkills(candSkills);
    let matched = 0;
    for (const js of jobSkills) {
      const esc  = js.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${esc}\\b`, 'i');
      if (expandedCand.some(cs => regex.test(cs))) matched++;
    }
    scores.skills = Math.round((matched / jobSkills.length) * 100);
  } else {
    weights.skills = 0;
  }

  // ── 3. Experience (Gaussian curve) ──────────────────────────────────────────
  const { minYears, maxYears } = parseRequiredYearsRange(job.description || '');
  const candYears = candidate.experience ?? profile.totalExperienceYears ?? null;

  if (minYears > 0 && candYears !== null) {
    scores.experience = expScoreGaussian(candYears, minYears, maxYears);
  } else if (candYears === null || minYears === 0) {
    weights.experience = 0;
  }

  // ── 4. Location (alias-aware) ────────────────────────────────────────────────
  const jobLoc  = (job.location || '').toLowerCase().trim();
  const candLoc = (candidate.location || '').toLowerCase().trim();
  const isRemote = jobLoc === 'remote' || (job.jobType || '').toLowerCase().includes('remote');

  if (isRemote) {
    scores.location = 100;
  } else if (!jobLoc) {
    // Job location not specified — don't score this dimension
    weights.location = 0;
  } else if (candLoc) {
    const match = locationMatch(jobLoc, candLoc);
    if      (match === 'exact') scores.location = 100;
    else if (match === 'alias') scores.location = 90;
    else if (candidate.willingToRelocate) scores.location = 65;
    else scores.location = 20;
  } else {
    weights.location = 0;
  }

  // ── 5. Seniority ─────────────────────────────────────────────────────────────
  const jobSeniority  = extractSeniorityRank(`${job.title || ''} ${job.description || ''}`);
  const candSeniority = extractSeniorityRank(`${candidate.title || ''} ${profile.title || ''}`);

  if (jobSeniority !== null && candSeniority !== null) {
    const diff = Math.abs(jobSeniority - candSeniority);
    scores.seniority = diff === 0 ? 100 : diff === 1 ? 75 : diff === 2 ? 45 : 15;
  } else {
    weights.seniority = 0;
  }

  // ── 6. Notice period ─────────────────────────────────────────────────────────
  const maxNoticeDays  = opts.maxNoticeDays ?? 90;
  const candNoticeDays = candidate.noticePeriodDays ?? null;

  if (candNoticeDays !== null) {
    if (candNoticeDays <= 0)              scores.notice = 100; // Immediately available
    else if (candNoticeDays <= maxNoticeDays) scores.notice = Math.round((1 - candNoticeDays / maxNoticeDays) * 50 + 50);
    else                                  scores.notice = 30;
  } else {
    weights.notice = 0;
  }

  // ── 7. Salary fit ─────────────────────────────────────────────────────────────
  const salaryMin   = job.salaryMin ?? null;
  const salaryMax   = job.salaryMax ?? null;
  const expectedCTC = candidate.expectedCTC ?? profile.expectedCTC ?? null;

  if (salaryMin !== null && salaryMax !== null && expectedCTC !== null && salaryMax > 0) {
    if (expectedCTC >= salaryMin && expectedCTC <= salaryMax) {
      scores.salary = 100;                                        // in budget
    } else if (expectedCTC < salaryMin) {
      const gap = (salaryMin - expectedCTC) / salaryMin;
      scores.salary = Math.round(Math.max(0, 100 - gap * 150));  // under-ask → partial credit
    } else {
      const overshoot = (expectedCTC - salaryMax) / salaryMax;
      scores.salary = Math.round(Math.max(0, 100 - overshoot * 200)); // over-ask → harder penalty
    }
  } else {
    weights.salary = 0;
  }

  // ── 8. Dynamic weight redistribution ─────────────────────────────────────────
  const activeSum = Object.values(weights).reduce((a, b) => a + b, 0);
  let finalScore = 50;

  if (activeSum > 0) {
    let weighted = 0;
    for (const k of Object.keys(weights)) {
      if (weights[k] > 0) weighted += scores[k] * (weights[k] / activeSum);
    }
    finalScore = Math.round(weighted);
  }

  return {
    score: Math.min(100, Math.max(0, finalScore)),
    breakdown: {
      skillScore:      scores.skills,
      experienceScore: scores.experience,
      locationScore:   scores.location,
      seniorityScore:  scores.seniority,
      noticeScore:     scores.notice,
      salaryScore:     scores.salary,
      weightsUsed:     weights,
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normaliseSkills(skills) {
  if (!Array.isArray(skills)) return [];
  return skills.map(s => String(s).toLowerCase().trim()).filter(Boolean);
}

/**
 * Parse required experience from a job description.
 * Returns { minYears, maxYears } — maxYears is null if not stated.
 */
function parseRequiredYearsRange(text) {
  if (!text) return { minYears: 0, maxYears: null };

  // "3 - 5 years" / "3-5 yrs"
  const rangeMatch = text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)/i);
  if (rangeMatch) return { minYears: parseInt(rangeMatch[1], 10), maxYears: parseInt(rangeMatch[2], 10) };

  // "5+ years" / "minimum 5 years"
  const minMatch = text.match(/(\d+)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/i)
    || text.match(/(?:experience|exp)\s*[:\-]?\s*(\d+)\s*\+?\s*(?:years?|yrs?)/i)
    || text.match(/(?:minimum|atleast|at least)\s*(\d+)\s*(?:years?|yrs?)/i);
  if (minMatch) return { minYears: parseInt(minMatch[1], 10), maxYears: null };

  return { minYears: 0, maxYears: null };
}

/**
 * Gaussian experience score.
 * - Fully penalizes under-experience (k=0.12 → steep drop below min).
 * - Gently penalizes over-experience when maxYears set (k=0.04 → soft drop above max).
 * - If no maxYears, saturation plateau above minYears.
 */
function expScoreGaussian(candYears, minYears, maxYears) {
  if (candYears >= minYears) {
    if (!maxYears || candYears <= maxYears) return 100; // within range
    const overshot = candYears - maxYears;
    return Math.round(100 * Math.exp(-0.04 * overshot * overshot));
  }
  const shortfall = minYears - candYears;
  return Math.round(100 * Math.exp(-0.12 * shortfall * shortfall));
}

module.exports = {
  calculateTalentMatchScore,
  parseRequiredYearsRange,
  expScoreGaussian,
};
