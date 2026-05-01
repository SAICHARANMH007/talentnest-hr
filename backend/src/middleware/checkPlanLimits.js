'use strict';
/**
 * checkPlanLimits — enforce tenant plan quotas before creating resources.
 * Usage: router.post('/', authenticate, checkPlanLimits('jobs'), ...)
 */
const Tenant = require('../models/Tenant');
const Job = require('../models/Job');
const User = require('../models/User');
const Candidate = require('../models/Candidate');
const { getPlanLimits } = require('../config/plans');
const AppError = require('../utils/AppError');

/**
 * @param {'jobs' | 'recruiters' | 'candidates'} resource - which quota to check
 */
function checkPlanLimits(resource) {
  return async (req, res, next) => {
    try {
      // Super admin has no tenant constraints — skip
      if (req.user.role === 'super_admin' || !req.user.tenantId) return next();

      const tenant = await Tenant.findById(req.user.tenantId).lean();
      if (!tenant) return next(); // tenant not found — let route handle it

      const planKey = tenant.plan || 'trial';
      const limits = getPlanLimits(planKey);

      // Map resource to limit key in plans config
      const resourceMap = {
        jobs: 'maxActiveJobs',
        recruiters: 'maxRecruiterSeats',
        candidates: 'maxCandidateRecords',
        storage: 'maxStorageGB',
      };

      const limitKey = resourceMap[resource];
      const limit = limits[limitKey];

      // If limit is -1, it means unlimited
      if (limit === -1) return next();

      let current = 0;
      if (resource === 'jobs') {
        current = await Job.countDocuments({
          tenantId: req.user.tenantId,
          status: { $in: ['active', 'draft'] },
          deletedAt: null,
        });
      } else if (resource === 'recruiters') {
        // Only count active users with 'recruiter' role for this tenant
        current = await User.countDocuments({
          tenantId: req.user.tenantId,
          role: 'recruiter',
          isActive: true,
        });
      } else if (resource === 'candidates') {
        current = await Candidate.countDocuments({
          tenantId: req.user.tenantId,
        });
      } else if (resource === 'storage') {
        // Current storage used in GB (convert bytes from tenant record)
        current = (tenant.stats?.storageUsed || 0) / (1024 * 1024 * 1024);
      }

      if (current >= limit) {
        const errorMsg = resource === 'storage'
          ? `Your storage limit of ${limit}GB has been reached. Please upgrade to continue uploading documents.`
          : `Your ${planKey.charAt(0).toUpperCase() + planKey.slice(1)} plan allows a maximum of ${limit} ${resource}. You have currently used ${current}. Please upgrade your plan to increase your limits.`;
        
        throw new AppError(errorMsg, 403, { upgradeUrl: '/billing' });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = checkPlanLimits;
