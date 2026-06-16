'use strict';
const Organization = require('../models/Organization');
const Tenant       = require('../models/Tenant');

// Senior Optimization: In-memory cache for Org/Tenant lookups (TTL 10 mins)
// These change rarely, so a longer TTL is highly effective.
const identityCache = new Map();
const ID_CACHE_TTL = 10 * 60 * 1000;

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

    // Candidates access cross-tenant data via email-based lookups — their
    // applications and profile are scoped by email, not by tenantId. Allow
    // candidates through regardless of tenant state (null, not found, suspended,
    // expired) so job seekers are never locked out of their own data.
    if (req.user?.role === 'candidate') {
      req.user.childTenantIds = [];
      // Attempt to attach the tenant record for downstream use, but never block.
      if (tenantId) {
        try {
          const cached = identityCache.get(tenantId.toString());
          let org = cached && (Date.now() - cached.at < ID_CACHE_TTL) ? cached.data : null;
          if (!org) {
            org = await Organization.findById(tenantId).lean()
              || await Tenant.findById(tenantId).lean();
            if (org) identityCache.set(tenantId.toString(), { data: org, model: org.subscriptionStatus ? 'tenant' : 'org', at: Date.now() });
          }
          req.tenant   = org || null;
          req.org      = org || null;
          req.tenantId = tenantId;
        } catch { /* non-blocking — candidate proceeds anyway */ }
      } else {
        req.tenant   = null;
        req.org      = null;
        req.tenantId = null;
      }
      return next();
    }

    if (!tenantId) {
      return res.status(403).json({
        success: false,
        error: 'No tenant associated with this account.',
      });
    }

    // ── Look up the organisation record ──────────────────────────────────────
    let org = null;
    let model = 'org';

    // Check Cache first
    const cached = identityCache.get(tenantId.toString());
    if (cached && (Date.now() - cached.at < ID_CACHE_TTL)) {
      org = cached.data;
      model = cached.model;
    } else {
      org = await Organization.findById(tenantId).lean();
      if (!org) {
        org = await Tenant.findById(tenantId).lean();
        model = 'tenant';
      }
      if (org) {
        identityCache.set(tenantId.toString(), { data: org, model, at: Date.now() });
      }
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
    req.tenant   = org;
    req.org      = org;      // alias — some routes use req.org
    req.tenantId = tenantId; // convenience alias — routes use req.tenantId

    // ── Senior Optimization: Hierarchical Access ─────────────────────────────
    // If this is a Parent Org, find all child Tenants/Vendors.
    // We attach them to req.user so tenantFilter can include them.
    req.user.childTenantIds = [];
    if (org.type === 'org' || org.isStaffingAgency) {
      const cacheKey = `children:${tenantId}`;
      let children = identityCache.get(cacheKey);
      if (children && (Date.now() - children.at < ID_CACHE_TTL)) {
        req.user.childTenantIds = children.data;
      } else {
        const childDocs = await Tenant.find({ parentId: tenantId, deletedAt: null }).select('_id').lean();
        const ids = childDocs.map(c => c._id.toString());
        identityCache.set(cacheKey, { data: ids, at: Date.now() });
        req.user.childTenantIds = ids;
      }
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { tenantGuard };
