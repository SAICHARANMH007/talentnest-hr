'use strict';
/**
 * candidateMatchingEngine.js
 * Pure code/MongoDB matching — no AI/external APIs.
 * Skills is always Array per hard rules.
 */
const mongoose = require('mongoose');

// ── Helpers ───────────────────────────────────────────────────────────────────
function skillOverlap(aSkills, bSkills) {
  if (!aSkills?.length || !bSkills?.length) return 0;
  const aSet = new Set(aSkills.map(s => String(s).toLowerCase().trim()));
  const bSet = new Set(bSkills.map(s => String(s).toLowerCase().trim()));
  let matches = 0;
  for (const s of aSet) if (bSet.has(s)) matches++;
  return aSet.size > 0 ? matches / aSet.size : 0;
}

function extractKeywords(title = '') {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
}

// ── findSuggestedCandidates ───────────────────────────────────────────────────
/**
 * @param {object} jobSnapshot - { title, description, skills[], experienceLevel, location, jobType }
 * @param {string|ObjectId} excludeTenantId - don't suggest candidates already applied to this tenant's jobs
 * @returns {Array} candidates with matchScore, sorted desc
 */
async function findSuggestedCandidates(jobSnapshot, excludeTenantId) {
  const Application = require('../models/Application');
  const Candidate   = require('../models/Candidate');
  const User        = require('../models/User');
  const Job         = require('../models/Job');

  const jobSkills = Array.isArray(jobSnapshot.skills) ? jobSnapshot.skills.map(s => String(s).toLowerCase()) : [];
  const results   = new Map(); // candidateId (str) → { candidate, matchScore }

  // ── STEP A: Similar-job applicants ──────────────────────────────────────────
  if (jobSkills.length > 0) {
    // Find jobs (outside the requesting tenant) with overlapping skills
    const similarJobIds = await Job.find({
      skills: { $in: jobSkills },
      ...(excludeTenantId ? { tenantId: { $ne: excludeTenantId } } : {}),
      deletedAt: null,
    }).select('_id skills').lean();

    if (similarJobIds.length > 0) {
      const apps = await Application.find({
        jobId: { $in: similarJobIds.map(j => j._id) },
        deletedAt: null,
      }).select('candidateId jobId').lean();

      // Build jobSkills lookup
      const jobSkillsMap = {};
      similarJobIds.forEach(j => { jobSkillsMap[String(j._id)] = Array.isArray(j.skills) ? j.skills : []; });

      // Score each unique candidate by best skill overlap
      for (const app of apps) {
        if (!app.candidateId) continue;
        const cidStr = String(app.candidateId);
        const jSkills = jobSkillsMap[String(app.jobId)] || [];
        const overlap = skillOverlap(jobSkills, jSkills);
        if (overlap < 0.3) continue; // skip < 30% overlap
        if (!results.has(cidStr) || results.get(cidStr).matchScore < overlap) {
          results.set(cidStr, { candidateId: cidStr, matchScore: Math.round(overlap * 100), source: 'application_history' });
        }
      }
    }
  }

  // ── STEP B: Profile matching (if < 5 from Step A) ──────────────────────────
  if (results.size < 5) {
    const keywords = extractKeywords(jobSnapshot.title);
    const candidateQuery = { deletedAt: null };

    if (jobSkills.length > 0) {
      candidateQuery.skills = { $in: jobSkills.map(s => new RegExp(s, 'i')) };
    } else if (keywords.length > 0) {
      candidateQuery.$or = keywords.map(kw => ({ skills: new RegExp(kw, 'i') }));
    }

    const profiles = await Candidate.find(candidateQuery)
      .select('_id name email skills experience location jobTypePreference noticePeriod resumeUrl photoUrl')
      .limit(100)
      .lean();

    for (const c of profiles) {
      const cidStr = String(c._id);
      if (results.has(cidStr)) continue; // already scored from Step A

      let score = 0;
      const cSkills = Array.isArray(c.skills) ? c.skills : [];
      const overlap = skillOverlap(jobSkills, cSkills);
      score += overlap * 3;  // +3 per skill match (normalized)
      if (jobSnapshot.experienceLevel && c.experienceLevel === jobSnapshot.experienceLevel) score += 2;
      if (jobSnapshot.location && c.location && String(c.location).toLowerCase().includes(String(jobSnapshot.location).toLowerCase())) score += 1;
      if (jobSnapshot.jobType && c.jobTypePreference && String(c.jobTypePreference).toLowerCase() === String(jobSnapshot.jobType).toLowerCase()) score += 1;

      if (score > 0) {
        results.set(cidStr, { candidateId: cidStr, matchScore: Math.round(score * 10), source: 'profile_match', profile: c });
      }
    }
  }

  if (results.size === 0) return [];

  // Fetch full candidate profiles for Step A results
  const idsToFetch = [...results.entries()].filter(([,v]) => !v.profile).map(([id]) => id);
  if (idsToFetch.length > 0) {
    const fetched = await Candidate.find({ _id: { $in: idsToFetch } })
      .select('_id name email skills experience location jobTypePreference noticePeriod resumeUrl photoUrl')
      .lean();
    fetched.forEach(c => {
      const entry = results.get(String(c._id));
      if (entry) entry.profile = c;
    });
  }

  // Build sorted output, remove entries without profile
  return [...results.values()]
    .filter(r => r.profile)
    .map(r => ({
      ...r.profile,
      id         : String(r.profile._id),
      matchScore : r.matchScore,
      matchSource: r.source,
      skills     : Array.isArray(r.profile.skills) ? r.profile.skills : [],
    }))
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 20);
}

// ── findMatchingJobs ──────────────────────────────────────────────────────────
/**
 * @param {object} candidateProfile - { skills[], experienceLevel, location, jobTypePreference }
 * @returns {Array} jobs with matchScore, sorted desc
 */
async function findMatchingJobs(candidateProfile) {
  const Job = require('../models/Job');
  const cSkills = Array.isArray(candidateProfile.skills) ? candidateProfile.skills.map(s => String(s).toLowerCase()) : [];

  if (cSkills.length === 0) return [];

  const jobs = await Job.find({
    approvalStatus: 'approved',
    status        : 'active',
    skills        : { $in: cSkills.map(s => new RegExp(s, 'i')) },
    deletedAt     : null,
  })
    .select('_id title company companyName location jobType skills experience tenantId careerPageSlug createdAt')
    .limit(100)
    .lean();

  const scored = jobs.map(job => {
    const jSkills = Array.isArray(job.skills) ? job.skills : [];
    const overlap = skillOverlap(cSkills, jSkills);
    let score = overlap * 3;
    if (candidateProfile.experienceLevel && job.experience && String(job.experience).includes(candidateProfile.experienceLevel)) score += 2;
    if (candidateProfile.location && job.location && String(job.location).toLowerCase().includes(String(candidateProfile.location).toLowerCase())) score += 1;
    if (candidateProfile.jobTypePreference && job.jobType && String(job.jobType).toLowerCase() === String(candidateProfile.jobTypePreference).toLowerCase()) score += 1;
    return {
      ...job,
      id         : String(job._id),
      skills     : jSkills,
      matchScore : Math.round(score * 10),
    };
  });

  return scored
    .filter(j => j.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);
}

module.exports = { findSuggestedCandidates, findMatchingJobs, skillOverlap };
