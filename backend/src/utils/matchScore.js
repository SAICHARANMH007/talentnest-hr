'use strict';

const { expandSkills } = require('./techOntology');

/**
 * calculateTalentMatchScore — Deterministic UTO Engine (Universal Tech Ontology).
 * Handles missing data gracefully through Dynamic Weight Redistribution.
 * 
 * @param {object} job       — Job document (skills[], location, jobType, description)
 * @param {object} candidate — Candidate document (parsedProfile, location, noticePeriodDays, willingToRelocate)
 * @param {object} [opts]    — { maxNoticeDays: number } overrides from job
 * @returns {{ score: number, breakdown: object }}
 */
function calculateTalentMatchScore(job, candidate, opts = {}) {
  const profile = candidate.parsedProfile || {};
  const cSkills = Array.isArray(candidate.skills) && candidate.skills.length > 0 ? candidate.skills : (profile.skills || []);
  
  // ── 1. Define Base Weights ─────────────────────────────────────────────────
  let weights = {
    skills: 0.50,
    experience: 0.25,
    location: 0.15,
    notice: 0.10
  };

  const scores = {
    skills: 0,
    experience: 0,
    location: 0,
    notice: 0
  };

  // ── 2. Skills Vector (Semantic + Exact) ────────────────────────────────────
  const jobSkills = normaliseSkills(job.skills);
  const candSkills = normaliseSkills(cSkills);
  
  if (jobSkills.length > 0) {
    const expandedJob = expandSkills(jobSkills);
    const expandedCand = expandSkills(candSkills);
    
    let matched = 0;
    for (const js of jobSkills) {
      const escaped = js.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const boundaryRegex = new RegExp(`\\b${escaped}\\b`, 'i');
      
      // Check exact or semantic match
      if (expandedCand.some(cs => boundaryRegex.test(cs))) {
        matched++;
      }
    }
    scores.skills = Math.round((matched / jobSkills.length) * 100);
  } else {
    // If job has no skills, we can't score skills fairly.
    // We'll mark it as "not applicable" for redistribution.
    weights.skills = 0;
  }

  // ── 3. Experience Vector ───────────────────────────────────────────────────
  const requiredYears = parseRequiredYears(job.description || '');
  const candidateYears = candidate.experience || profile.totalExperienceYears || 0;

  if (requiredYears > 0) {
    if (candidateYears >= requiredYears) {
      scores.experience = 100;
    } else {
      scores.experience = Math.round((candidateYears / requiredYears) * 100);
    }
  } else {
    // If job has no experience requirement, redistribute weight
    weights.experience = 0;
  }

  // ── 4. Location Vector ─────────────────────────────────────────────────────
  const jobLoc = (job.location || '').toLowerCase().trim();
  const candLoc = (candidate.location || '').toLowerCase().trim();

  if (!jobLoc || jobLoc === 'remote' || (job.jobType || '').toLowerCase().includes('remote')) {
    scores.location = 100;
  } else if (candLoc) {
    if (candLoc.includes(jobLoc.split(',')[0])) {
      scores.location = 100;
    } else if (candidate.willingToRelocate) {
      scores.location = 70; // Boosted for intent
    } else {
      scores.location = 30; // Still some value for "proximity" matches
    }
  } else {
    // Missing candidate location: don't penalize, redistribute
    weights.location = 0;
  }

  // ── 5. Notice Period Vector ────────────────────────────────────────────────
  const maxNoticeDays = opts.maxNoticeDays || 90;
  const candNoticeDays = candidate.noticePeriodDays != null ? candidate.noticePeriodDays : 90;

  if (candidate.noticePeriodDays != null) {
    scores.notice = candNoticeDays <= maxNoticeDays ? 100 : 50;
  } else {
    weights.notice = 0;
  }

  // ── 6. Dynamic Weight Redistribution ───────────────────────────────────────
  // Calculate the sum of weights that are actually being used
  const activeWeightSum = Object.values(weights).reduce((a, b) => a + b, 0);
  
  let finalScore = 0;
  if (activeWeightSum > 0) {
    // Normalize weights so they sum to 1.0 (100%)
    const normalizedWeights = {};
    for (const k in weights) {
      normalizedWeights[k] = weights[k] / activeWeightSum;
    }

    finalScore = Math.round(
      scores.skills * (normalizedWeights.skills || 0) +
      scores.experience * (normalizedWeights.experience || 0) +
      scores.location * (normalizedWeights.location || 0) +
      scores.notice * (normalizedWeights.notice || 0)
    );
  } else {
    finalScore = 50; // Neutral if no data available at all
  }

  return {
    score: Math.min(100, Math.max(0, finalScore)),
    breakdown: {
      skillScore: scores.skills,
      experienceScore: scores.experience,
      locationScore: scores.location,
      noticeScore: scores.notice,
      weightsUsed: weights
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
  const patterns = [
    /(\d+)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/i,
    /(?:experience|exp)\s*[:\-]?\s*(\d+)\s*\+?\s*(?:years?|yrs?)/i,
    /(\d+)\s*-\s*(\d+)\s*(?:years?|yrs?)/i,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseInt(m[1], 10);
  }
  return 0;
}

module.exports = {
  calculateTalentMatchScore
};
