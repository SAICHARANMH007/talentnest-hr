'use strict';
const Tenant = require('../models/Tenant');

/**
 * tenantGuard — ensures every non-super_admin request has a valid, active tenant.
 *
 * - Skips check for super_admin (they operate across all tenants).
 * - Returns 403 if tenantId is missing from the JWT.
 * - Returns 403 if the tenant does not exist or has a suspended subscription.
 *
 * Must be placed AFTER authMiddleware in the middleware chain.
 */
const tenantGuard = async (req, res, next) => {
  try {
    if (req.user?.role === 'super_admin') return next();

    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({
        success: false,
        error: 'No tenant associated with this account.',
      });
    }

    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      return res.status(403).json({
        success: false,
        error: 'Tenant not found. Please contact support.',
      });
    }

    if (tenant.subscriptionStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Your organisation account is suspended. Please contact support.',
      });
    }

    if (
      tenant.subscriptionStatus === 'expired' ||
      (tenant.subscriptionExpiry && new Date(tenant.subscriptionExpiry) < new Date())
    ) {
      return res.status(403).json({
        success: false,
        error: 'Your subscription has expired. Please renew to continue.',
      });
    }

    // Attach tenant to request for downstream use
    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { tenantGuard };
