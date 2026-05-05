'use strict';
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const logger = require('../middleware/logger');

/**
 * syncProfile — Enterprise-grade Two-Way Synchronization
 * Ensures that changes to a person's record (Identity or Pipeline) 
 * are reflected across both the User and Candidate collections.
 * 
 * @param {string} email - Primary identity key
 * @param {object} updates - The delta of changes
 * @param {string} tenantId - Organization scoping
 */
async function syncProfile(email, updates, tenantId) {
  if (!email || !updates || !tenantId) return;

  // Fields that represent the professional identity and HR status
  const SYNCABLE_FIELDS = [
    'name', 'phone', 'location', 'title', 'summary', 'skills', 
    'experience', 'linkedinUrl', 'resumeUrl', 'videoResumeUrl',
    'currentCompany', 'currentCTC', 'expectedCTC', 'relevantExperience',
    'preferredLocation', 'availability', 'noticePeriodDays', 
    'candidateStatus', 'certifications', 'client', 'ta', 
    'clientSpoc', 'additionalDetails', 'orgName', 'organisation',
    'assignedRecruiterId'
  ];

  const payload = {};
  for (const f of SYNCABLE_FIELDS) {
    if (updates[f] !== undefined) {
      payload[f] = updates[f];
    }
  }

  // Handle skills normalization if present
  if (payload.skills && Array.isArray(payload.skills)) {
    payload.skills = payload.skills.map(s => String(s).toLowerCase().trim()).filter(Boolean);
    // Also sync to parsedProfile for legacy candidate views
    payload['parsedProfile.skills'] = payload.skills;
  }

  if (Object.keys(payload).length === 0) return;

  const filter = { email: email.toLowerCase().trim(), tenantId, deletedAt: null };

  try {
    // 1. Update User Collection (Identity)
    const userUpdate = await User.updateMany(filter, { $set: payload });

    // 2. Update Candidate Collection (Pipeline)
    const candidateUpdate = await Candidate.updateMany(filter, { $set: payload });

    if (userUpdate.modifiedCount > 0 || candidateUpdate.modifiedCount > 0) {
      logger.audit('Profile Sync Completed', 'system', tenantId, { 
        email, 
        userModified: userUpdate.modifiedCount, 
        candidateModified: candidateUpdate.modifiedCount 
      });
    }
  } catch (err) {
    logger.error('Profile Sync Failed', { email, error: err.message });
  }
}

module.exports = { syncProfile };
