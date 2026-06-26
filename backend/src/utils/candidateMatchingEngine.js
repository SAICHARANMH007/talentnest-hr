'use strict';

const mongoose = require('mongoose');
const { calculateTalentMatchScore } = require('./matchScore');
const { expandSkills, extractSeniorityRank, locationMatch } = require('./techOntology');

/**
 * candidateMatchingEngine.js — Two-Way Deep Matching Engine.
 *
 * STEP 1 (Discovery) — fast MongoDB query using expanded UTO skill list + title/seniority hints.
 * STEP 2 (Scoring)   — full multi-dimension match score per candidate.
 * STEP 3 (Rank)      — filter by minScore, sort by matchScore desc.
 */

/**
 * findSuggestedCandidates
 * Best talent for a job across the entire platform.
 *
 * @param {object} jobSnapshot — { title, description, skills[], location, salaryMin, salaryMax, tenantId }
 * @param {object} options     — { limit: 50, minScore: 30 }
 * @returns {Promise<Array>}
 */
async function findSuggestedCandidates(jobSnapshot, options = {}) {
  const { limit = 50, minScore = 30 } = options;
  const Candidate = require('../models/Candidate');

  const jobSkills    = Array.isArray(jobSnapshot.skills) ? jobSnapshot.skills : [];
  const expandedSkills = expandSkills(jobSkills);
  const titleKeyword  = (jobSnapshot.title || '').split(' ')[0];
  const jobSeniority  = extractSeniorityRank(`${jobSnapshot.title || ''} ${jobSnapshot.description || ''}`);

  // ── Discovery: broad OR query to pull candidates worth scoring ───────────────
  const orClauses = [];

  if (expandedSkills.length > 0) {
    orClauses.push({
      skills: { $in: expandedSkills.map(s => new RegExp(`^${escapeRe(s)}$`, 'i')) }
    });
    // Also match skills inside parsedProfile.skills
    orClauses.push({
      'parsedProfile.skills': { $in: expandedSkills.map(s => new RegExp(`^${escapeRe(s)}$`, 'i')) }
    });
  }

  if (titleKeyword) {
    orClauses.push({ title: { $regex: escapeRe(titleKeyword), $options: 'i' } });
  }

  // Include seniority-matched candidates if job has a seniority signal
  if (jobSeniority !== null) {
    orClauses.push({ title: { $regex: buildSeniorityRegex(jobSeniority), $options: 'i' } });
  }

  const discoveryQuery = {
    deletedAt: null,
    ...(orClauses.length > 0 ? { $or: orClauses } : {}),
  };

  const candidates = await Candidate.find(discoveryQuery)
    .select('name email skills experience location noticePeriodDays willingToRelocate expectedCTC parsedProfile currentCompany title')
    .limit(600)
    .lean();

  // ── Scoring phase ─────────────────────────────────────────────────────────────
  const scored = candidates.map(candidate => {
    const { score, breakdown } = calculateTalentMatchScore(jobSnapshot, candidate);
    return {
      ...candidate,
      id: candidate._id.toString(),
      matchScore: score,
      matchBreakdown: breakdown,
      source: 'uto_engine',
    };
  });

  return scored
    .filter(c => c.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

/**
 * findSuggestedJobs
 * Best jobs for a specific candidate.
 *
 * @param {object} candidate — Candidate document
 * @param {object} options   — { limit: 20, minScore: 0 }
 * @returns {Promise<Array>}
 */
async function findSuggestedJobs(candidate, options = {}) {
  const { limit = 20, minScore = 0 } = options;
  const Job = require('../models/Job');

  const cSkills   = Array.isArray(candidate.skills) ? candidate.skills : (candidate.parsedProfile?.skills || []);
  const expandedSkills = expandSkills(cSkills);
  const titleKeyword  = (candidate.title || candidate.parsedProfile?.title || '').split(' ')[0];
  const candSeniority = extractSeniorityRank(`${candidate.title || ''} ${candidate.parsedProfile?.title || ''}`);

  const orClauses = [];

  if (expandedSkills.length > 0) {
    orClauses.push({
      skills: { $in: expandedSkills.map(s => new RegExp(`^${escapeRe(s)}$`, 'i')) }
    });
  }

  if (titleKeyword) {
    orClauses.push({ title: { $regex: escapeRe(titleKeyword), $options: 'i' } });
  }

  if (candSeniority !== null) {
    orClauses.push({ title: { $regex: buildSeniorityRegex(candSeniority), $options: 'i' } });
  }

  const discoveryQuery = {
    status: 'active',
    deletedAt: null,
    ...(orClauses.length > 0 ? { $or: orClauses } : {}),
  };

  const jobs = await Job.find(discoveryQuery)
    .limit(300)
    .lean();

  const scored = jobs.map(job => {
    const { score, breakdown } = calculateTalentMatchScore(job, candidate);
    return {
      ...job,
      id: job._id.toString(),
      matchScore: score,
      matchBreakdown: breakdown,
    };
  });

  return scored
    .filter(j => j.matchScore >= minScore)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Build a regex that matches common seniority words near the given rank (±1). */
function buildSeniorityRegex(rank) {
  const { SENIORITY_LEVELS } = require('./techOntology');
  const words = [];
  for (const tier of Object.values(SENIORITY_LEVELS)) {
    if (Math.abs(tier.rank - rank) <= 1) words.push(...tier.words);
  }
  return words.map(escapeRe).join('|');
}

module.exports = {
  findSuggestedCandidates,
  findSuggestedJobs,
};
