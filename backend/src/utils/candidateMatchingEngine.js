'use strict';

const mongoose = require('mongoose');
const { calculateTalentMatchScore } = require('./matchScore');
const { expandSkills } = require('./techOntology');

/**
 * candidateMatchingEngine.js — World-Class Discovery Engine.
 * Combines high-speed MongoDB indexing with the UTO (Universal Tech Ontology).
 */

/**
 * findSuggestedCandidates
 * Finds the best talent for a specific job across the entire platform.
 * 
 * @param {object} jobSnapshot - { title, description, skills[], location, tenantId }
 * @param {object} options - { limit: 50, minScore: 30 }
 * @returns {Promise<Array>} - Candidates with matchScore, sorted desc
 */
async function findSuggestedCandidates(jobSnapshot, options = { limit: 50, minScore: 30 }) {
  const Candidate = require('../models/Candidate');
  const Application = require('../models/Application');

  const jobSkills = Array.isArray(jobSnapshot.skills) ? jobSnapshot.skills : [];
  const expandedSkills = expandSkills(jobSkills);
  
  // ── STEP 1: Discovery Phase (High-Speed Filtering) ────────────────────────
  // We look for candidates who have at least ONE overlapping skill from our expanded Ontology.
  const discoveryQuery = {
    deletedAt: null,
    $or: [
      { skills: { $in: expandedSkills.map(s => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) } },
      { title: { $regex: jobSnapshot.title.split(' ')[0], $options: 'i' } }
    ]
  };

  // Limit discovery to 500 candidates for performance before deep-scoring
  const candidates = await Candidate.find(discoveryQuery)
    .select('name email skills experience location noticePeriodDays parsedProfile currentCompany title')
    .limit(500)
    .lean();

  // ── STEP 2: Scoring Phase (UTO Logic) ─────────────────────────────────────
  const scored = candidates.map(candidate => {
    const { score, breakdown } = calculateTalentMatchScore(jobSnapshot, candidate);
    return {
      ...candidate,
      id: candidate._id.toString(),
      matchScore: score,
      matchBreakdown: breakdown,
      source: 'uto_engine'
    };
  });

  // ── STEP 3: Filtering & Sorting ───────────────────────────────────────────
  return scored
    .filter(c => c.matchScore >= (options.minScore || 0))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, options.limit || 50);
}

/**
 * findSuggestedJobs
 * Finds the best jobs for a specific candidate.
 * 
 * @param {object} candidate - Candidate document
 * @param {object} options - { limit: 20 }
 * @returns {Promise<Array>} - Jobs with matchScore, sorted desc
 */
async function findSuggestedJobs(candidate, options = { limit: 20 }) {
  const Job = require('../models/Job');
  
  const cSkills = Array.isArray(candidate.skills) ? candidate.skills : (candidate.parsedProfile?.skills || []);
  const expandedSkills = expandSkills(cSkills);

  // Discovery: Jobs with matching skills or title keywords
  const discoveryQuery = {
    status: 'active',
    deletedAt: null,
    $or: [
      { skills: { $in: expandedSkills.map(s => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')) } },
      { title: { $regex: (candidate.title || '').split(' ')[0], $options: 'i' } }
    ]
  };

  const jobs = await Job.find(discoveryQuery)
    .limit(200)
    .lean();

  const scored = jobs.map(job => {
    const { score, breakdown } = calculateTalentMatchScore(job, candidate);
    return {
      ...job,
      id: job._id.toString(),
      matchScore: score,
      matchBreakdown: breakdown
    };
  });

  return scored
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, options.limit || 20);
}

module.exports = {
  findSuggestedCandidates,
  findSuggestedJobs
};
