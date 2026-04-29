'use strict';
const Organization = require('../models/Organization');
const Tenant       = require('../models/Tenant');

/**
 * tenantGuard — ensures every non-super_admin request has a valid, active tenant.
 *
 * The platform historically has two org models:
 *   • Organization — used by seed.js, admin invite, and most existing data
 *   • Tenant       — used by the register flow for new self-service sign-ups
 *
 * We look in Organization first (covers ~100% of existing data), then fall back
 * to Tenant so new self-service registrations also work.
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

    // ── Look up the organisation record ──────────────────────────────────────
    let org    = await Organization.findById(tenantId).lean();
    let model  = 'org';   // which model we found it in
    if (!org) {
      org   = await Tenant.findById(tenantId).lean();
      model = 'tenant';
    }

    if (!org) {
      return res.status(403).json({
        success: false,
        error: 'Organisation not found. Please contact support.',
      });
    }

    // ── Status checks (field name differs between the two models) ─────────────
    // Organization uses:  status ('active'|'suspended'|'trial'|'pending')
    // Tenant uses:        subscriptionStatus ('active'|'expired'|'suspended'|'cancelled')
    //                     subscriptionExpiry (Date)
    const isSuspended = model === 'org'
      ? org.status === 'suspended'
      : org.subscriptionStatus === 'suspended';

    const isExpired = model === 'tenant' && (
      org.subscriptionStatus === 'expired' ||
      (org.subscriptionExpiry && new Date(org.subscriptionExpiry) < new Date())
    );

    if (isSuspended) {
      return res.status(403).json({
        success: false,
        error: 'Your organisation account is suspended. Please contact support.',
      });
    }

    if (isExpired) {
      return res.status(403).json({
        success: false,
        error: 'Your subscription has expired. Please renew to continue.',
      });
    }

    // Attach to request for downstream use (billing, limits, etc.)
    req.tenant = org;
    req.org    = org; // alias — some routes use req.org
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { tenantGuard };
