'use strict';
const AppError = require('../utils/AppError');

/**
 * ownershipGuard — ensure the logged-in recruiter/admin owns the resource.
 *
 * @param {mongoose.Model} Model - The Mongoose model to check (e.g., Job, Application)
 * @param {string} paramName - The req.params key containing the ID (e.g., 'id', 'jobId')
 * @param {string} ownerField - The field in the document that stores the owner ID (e.g., 'recruiterId', 'assignedRecruiterId')
 */
function ownershipGuard(Model, paramName = 'id', ownerField = 'recruiterId') {
  return async (req, res, next) => {
    try {
      const { user } = req;
      const resourceId = req.params[paramName];

      // Super admins skip ownership checks
      if (user.role === 'super_admin') return next();

      const doc = await Model.findById(resourceId).lean();
      if (!doc) throw new AppError('Resource not found.', 404);

      // 1. Tenant Check (Critical: ensure user belongs to the same tenant)
      if (doc.tenantId && String(doc.tenantId) !== String(user.tenantId)) {
        throw new AppError('Unauthorized: Access denied to this tenant resource.', 403);
      }

      // 2. Role-based Ownership Check
      if (user.role === 'recruiter') {
        const ownerId = doc[ownerField];
        
        // If the resource is unassigned, recruiter can see it if it's within their tenant (checked above)
        // unless you want strict assignment enforcement.
        if (ownerId && String(ownerId) !== String(user._id)) {
          // If it's a job, check if they are in the assignedRecruiters list
          if (doc.assignedRecruiters && doc.assignedRecruiters.some(r => String(r) === String(user._id))) {
            return next();
          }
          throw new AppError('Unauthorized: You do not have permission to access this record.', 403);
        }
      }

      // Admin role (within tenant) passes if tenant check passed.
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = ownershipGuard;
