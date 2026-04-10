'use strict';

/**
 * agencyOnly — restricts a route to tenants that are recruitment agencies.
 *
 * Requires tenantGuard to have run first (req.tenant must be populated).
 * Returns 403 if the tenant does not have isRecruitmentAgency: true.
 *
 * Usage:
 *   router.get('/candidates', authMiddleware, tenantGuard, agencyOnly, handler)
 */
const agencyOnly = (req, res, next) => {
  const tenant = req.tenant;

  if (!tenant) {
    return res.status(403).json({
      success: false,
      error: 'Tenant context missing. Ensure tenantGuard runs before agencyOnly.',
    });
  }

  if (!tenant.isRecruitmentAgency) {
    return res.status(403).json({
      success: false,
      error: 'This feature is for recruitment agencies only.',
    });
  }

  next();
};

module.exports = { agencyOnly };
