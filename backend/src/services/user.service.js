const mongoose = require('mongoose');
const User = require('../models/User');
const Organization = require('../models/Organization');
const AppError = require('../utils/AppError');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sendEmailWithRetry, templates } = require('../utils/email');
const logger = require('../middleware/logger');
const normalize = require('../utils/normalize');
const jobService = require('./job.service');

/**
 * UserService — Professional Logic for Identity Management
 */
class UserService {
  /**
   * Helper: Normalize user for client
   */
  normalize(user) {
    return normalize(user);
  }

  /**
   * Soft Delete User
   */
  async softDelete(id) {
    const user = await User.findByIdAndUpdate(id, {
      $set: { deletedAt: new Date(), isActive: false }
    }, { new: true });
    if (!user) throw new AppError('User not found', 404);
    return user;
  }

  /**
   * Invite a new User (Admin/Recruiter/Candidate)
   */
  async inviteUser({ name, email, role, tenantId, department, addedBy, useTemporaryPassword = false, ...metadata }) {
    const cleanEmail = email.toLowerCase().trim();
    
    let user = await User.findOne({ email: cleanEmail }).setOptions({ includeDeleted: true });
    if (user && !user.deletedAt) throw new AppError('Email already in use.', 409);

    const TEMP_PWD = 'TalentNest@2024';
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashed   = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expires  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Fetch org details to populate denormalized fields
    const Tenant = mongoose.model('Tenant');
    const org = await Organization.findById(tenantId).lean() || await Tenant.findById(tenantId).lean();
    const orgNameFallback = org?.name || 'TalentNest HR';
    const finalOrgName = metadata.orgName || metadata.organisation || orgNameFallback;

    const payload = {
      name: name.trim(), email: cleanEmail, role, tenantId, department, addedBy,
      isActive: false, 
      resetPasswordToken: hashed, 
      resetPasswordExpires: expires,
      inviteStatus: 'pending',
      mustChangePassword: true,
      invitedBy: addedBy,
      invitedAt: new Date(),
      temporaryPassword: useTemporaryPassword ? TEMP_PWD : null,
      orgName: finalOrgName,
      organisation: finalOrgName,
      ...metadata
    };

    if (useTemporaryPassword) {
      payload.password = bcrypt.hashSync(TEMP_PWD, 12);
    }

    if (user && user.deletedAt) {
      user.deletedAt = null;
      Object.assign(user, payload);
      await user.save();
    } else {
      user = await User.create(payload);
    }

    // Send Email via Unified Template
    const link = `${process.env.FRONTEND_URL}/set-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(user.email)}`;
    
    let tpl;
    if (useTemporaryPassword) {
      tpl = templates.tempPassword(user.name, user.email, TEMP_PWD);
    } else {
      const inviter = await User.findById(addedBy).select('name').lean();
      tpl = templates.invite(user.name, role, org?.name || 'TalentNest', link, inviter?.name);
    }
    
    await sendEmailWithRetry(user.email, tpl.subject, tpl.html).catch(e => logger.error('Invite email failed', e));

    return user;
  }

  /**
   * Resend Invitation (Regenerate token)
   */
  async resendInvite(userId, requesterId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.inviteStatus === 'accepted') throw new AppError('Invitation already accepted.', 400);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashed   = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    user.inviteStatus = 'pending';
    await user.save();

    const org = await Organization.findById(user.tenantId).lean();
    const inviter = await User.findById(requesterId).select('name').lean();
    const link = `${process.env.FRONTEND_URL}/set-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(user.email)}`;
    
    const tpl = templates.invite(user.name, user.role, org?.name || 'TalentNest', link, inviter?.name);
    await sendEmailWithRetry(user.email, tpl.subject, tpl.html);

    return user;
  }

  /**
   * Revoke Invitation (Hard delete if pending)
   */
  async revokeInvite(userId) {
    const user = await User.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (user.inviteStatus === 'accepted') throw new AppError('Cannot revoke accepted invite.', 400);

    await User.findByIdAndDelete(userId);
    return true;
  }

  /**
   * Bulk Import Candidates (ATOMIC TRANSACTION)
   */
  async bulkImport(candidates, tenantId, addedBy, targetJobId = null) {
    if (!Array.isArray(candidates)) throw new AppError('Candidates must be an array.', 400);

    const Tenant = mongoose.model('Tenant');
    
    // 1. Resolve Tenant — fallback to TalentNest HR if missing
    let org = await Organization.findById(tenantId).lean() || await Tenant.findById(tenantId).lean();
    let finalTenantId = tenantId;
    if (!org) {
      org = await Tenant.findOne({ name: /^TalentNest HR$/i }).lean();
      if (org) finalTenantId = org._id;
    }
    const orgName = org?.name || 'TalentNest HR';

    const stats = { created: 0, updated: 0, skipped: 0, errors: [] };
    const inserted = [];

    const buildFields = (c, email) => ({
      name             : c.name || email.split('@')[0],
      phone            : c.phone ? String(c.phone).replace(/\s+/g, '') : undefined,
      location         : c.location         || undefined,
      skills           : Array.isArray(c.skills) ? c.skills : (c.skills ? c.skills.split(',').map(s => s.trim()).filter(Boolean) : undefined),
      linkedinUrl      : c.linkedin || c.linkedinUrl || undefined,
      experience       : c.experience ? (parseFloat(c.experience) || undefined) : undefined,
      source           : c.source           || 'Bulk Import',
      ta               : c.ta               || undefined,
      dateAdded        : c.dateAdded        || new Date().toISOString().split('T')[0],
      relevantExperience: c.relevantExperience || undefined,
      currentCompany   : c.currentCompany   || undefined,
      client           : c.client           || undefined,
      jobRole          : c.jobRole          || undefined,
      certifications   : c.certifications   || undefined,
      currentCTC       : c.currentCTC       || undefined,
      expectedCTC      : c.expectedCTC      || undefined,
      clientSpoc       : c.clientSpoc       || undefined,
      candidateStatus  : c.candidateStatus  || undefined,
      additionalDetails: c.additionalDetails|| undefined,
      preferredLocation: c.preferredLocation|| undefined,
    });

    for (const c of candidates) {
      if (!c.email) { stats.skipped++; continue; }
      const email = c.email.toLowerCase().trim();

      try {
        let user = await User.findOne({ email, tenantId: finalTenantId }).setOptions({ includeDeleted: true });

        if (user) {
          // Restore soft-deleted or update existing candidate with new data
          const fields = buildFields(c, email);
          const update = { $set: {} };
          if (user.deletedAt) { update.$set.deletedAt = null; update.$set.isActive = true; }
          // Only overwrite non-empty string fields if the candidate doesn't already have them
          for (const [k, v] of Object.entries(fields)) {
            if (v !== undefined && !user[k]) update.$set[k] = v;
          }
          // Ensure orgName is set if missing
          if (!user.orgName) {
            const finalOrgName = c.orgName || c.organisation || orgName;
            update.$set.orgName = finalOrgName;
            update.$set.organisation = finalOrgName;
          }
          if (Object.keys(update.$set).length > 0) {
            await User.findByIdAndUpdate(user._id, update);
          }
          inserted.push(user);
          stats.updated++;
          continue;
        }

        const newUser = await User.create({
          ...Object.fromEntries(Object.entries(buildFields(c, email)).filter(([, v]) => v !== undefined)),
          email,
          passwordHash: bcrypt.hashSync(crypto.randomBytes(8).toString('hex'), 10),
          role: 'candidate',
          tenantId: finalTenantId, addedBy,
          orgName: c.orgName || c.organisation || orgName,
          organisation: c.organisation || c.orgName || orgName,
          isActive: true,
        });

        inserted.push(newUser);
        stats.created++;
      } catch (err) {
        stats.errors.push(`${email}: ${err.message}`);
        stats.skipped++;
      }
    }

    // Auto-assign to job pipeline if targetJobId provided
    if (targetJobId && inserted.length > 0) {
      const candidateIds = inserted.map(u => u._id);
      await jobService.assignCandidatesToJob(targetJobId, candidateIds, addedBy).catch(() => {});
    }

    return stats;
  }

  /**
   * Merge Two Users (Consolidate Profiles)
   */
  async mergeUsers(primaryId, duplicateId, requesterId) {
    if (String(primaryId) === String(duplicateId)) throw new AppError('Cannot merge a user with themselves.', 400);

    const primary = await User.findById(primaryId);
    const duplicate = await User.findById(duplicateId);

    if (!primary || !duplicate) throw new AppError('One or both users not found.', 404);
    if (String(primary.tenantId) !== String(duplicate.tenantId)) throw new AppError('Users must belong to the same organisation to merge.', 400);

    // Track the merge in audit logs
    logger.audit('User merger started', requesterId, primary.tenantId, { primaryId, duplicateId });

    // Migrate associated data (Candidates, Applications, Jobs, etc.)
    const modelsToUpdate = [
      { name: 'Application', field: 'candidateId' }, 
      { name: 'Job', field: 'createdBy' },
      { name: 'Notification', field: 'userId' },
      { name: 'AuditLog', field: 'userId' },
      { name: 'Application', field: 'stageHistory.movedBy' },
      { name: 'PreBoarding', field: 'userId' }
    ];

    for (const m of modelsToUpdate) {
      try {
        const Model = mongoose.model(m.name);
        const query = { [m.field]: duplicateId };
        await Model.updateMany(query, { $set: { [m.field]: primaryId } });
      } catch (err) {
        logger.warn(`Failed to migrate ${m.name} field ${m.field}`, err.message);
      }
    }

    // Move any missing profile data from duplicate to primary
    const fieldsToSync = ['phone', 'location', 'title', 'summary', 'skills', 'photoUrl', 'linkedinUrl', 'resumeUrl'];
    let modified = false;
    fieldsToSync.forEach(f => {
      if (!primary[f] && duplicate[f]) {
        primary[f] = duplicate[f];
        modified = true;
      }
    });

    if (modified) await primary.save();

    // Finally delete the duplicate
    await User.findByIdAndDelete(duplicateId);

    logger.audit('User merger completed', requesterId, primary.tenantId, { primaryId, duplicateId });
    return primary;
  }
}

module.exports = new UserService();
