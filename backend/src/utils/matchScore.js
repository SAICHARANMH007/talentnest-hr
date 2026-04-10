'use strict';

/**
 * calculateMatchScore — pure JS, no AI API.
 *
 * @param {object} job       — Job document (skills[], location, jobType)
 * @param {object} candidate — Candidate document (parsedProfile, location, noticePeriodDays, willingToRelocate)
 * @param {object} [opts]    — { maxNoticeDays: number } overrides from job
 * @returns {{ score: number, breakdown: object }}
 */
function calculateMatchScore(job, candidate, opts = {}) {
  const profile = candidate.parsedProfile || {};

  // ── 1. Skills Score (45%) ──────────────────────────────────────────────────
  const jobSkills  = normaliseSkills(job.skills);
  const candSkills = normaliseSkills(profile.skills);

  let skillScore = 0;
  if (jobSkills.length > 0) {
    let matched = 0;
    for (const js of jobSkills) {
      // Exact word-boundary match: split each skill into tokens so that
      // "java" matches "java spring boot" but NOT "javascript".
      const jsTokens = js.split(/[\s\-\/\.]+/).filter(Boolean);
      if (candSkills.some(cs => {
        if (cs === js) return true; // exact match shortcut
        const csTokens = cs.split(/[\s\-\/\.]+/).filter(Boolean);
        // Every token of the job skill must appear as a whole token in the candidate skill
        return jsTokens.length > 0 && jsTokens.every(jt => csTokens.includes(jt));
      })) matched++;
    }
    skillScore = Math.round((matched / jobSkills.length) * 100);
  } else {
    skillScore = 50; // No requirements specified → neutral
  }

  // ── 2. Experience Score (30%) ──────────────────────────────────────────────
  const requiredYears  = parseRequiredYears(job.description || '');
  const candidateYears = profile.totalExperienceYears || 0;

  let experienceScore = 50; // neutral default when no requirement found
  if (requiredYears > 0) {
    if (candidateYears >= requiredYears) {
      experienceScore = 100;
    } else {
      experienceScore = Math.round((candidateYears / requiredYears) * 100);
    }
  }

  // ── 3. Location Score (15%) ────────────────────────────────────────────────
  let locationScore = 20; // default: different location, not willing to relocate
  const jobLoc  = (job.location || '').toLowerCase().trim();
  const candLoc = (candidate.location || '').toLowerCase().trim();

  if (!jobLoc || jobLoc === 'remote' || (job.jobType || '').toLowerCase().includes('remote')) {
    locationScore = 100;
  } else if (candLoc && jobLoc && candLoc.includes(jobLoc.split(',')[0])) {
    locationScore = 100;
  } else if (candidate.willingToRelocate) {
    locationScore = 60;
  }

  // ── 4. Notice Period Score (10%) ───────────────────────────────────────────
  const maxNoticeDays  = opts.maxNoticeDays || 90;
  const candNoticeDays = candidate.noticePeriodDays || 0;

  const noticeScore = candNoticeDays <= maxNoticeDays ? 100 : 50;

  // ── Final weighted score ───────────────────────────────────────────────────
  const score = Math.round(
    skillScore * 0.45 +
    experienceScore * 0.30 +
    locationScore * 0.15 +
    noticeScore * 0.10
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: {
      skillScore,
      experienceScore,
      locationScore,
      noticeScore,
    },
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function normaliseSkills(skills) {
  if (!Array.isArray(skills)) return [];
  return skills.map(s => String(s).toLowerCase().trim()).filter(Boolean);
}

function parseRequiredYears(text) {
  if (!text) return 0;
  // e.g. "3+ years", "2-5 years", "minimum 4 years"
  const m = text.match(/(\d+)\s*[-–+]?\s*(?:\d+\s*)?years?/i);
  return m ? parseInt(m[1], 10) : 0;
}

module.exports = { calculateMatchScore };
