'use strict';
/**
 * TalentNest HR — Plan Definitions
 * Single source of truth for all billing limits and plan metadata.
 * Razorpay plan IDs are loaded from env vars and NEVER exposed to the frontend.
 */

const PLANS = {
  starter: {
    name        : 'Starter',
    priceINR    : 2999,
    billingCycle: 'annual',
    features    : [
      'Up to 5 active jobs',
      'Up to 3 recruiter seats',
      'Up to 500 candidate records',
      '1 GB file storage',
      'Email notifications',
      'Career page widget',
      'Basic analytics',
    ],
    limits: {
      maxActiveJobs       : 5,
      maxRecruiterSeats   : 3,
      maxCandidateRecords : 500,
      maxStorageGB        : 1,
    },
    // Razorpay plan ID — read from env, never sent to frontend
    _razorpayPlanId: process.env.RAZORPAY_PLAN_STARTER || '',
  },

  growth: {
    name        : 'Growth',
    priceINR    : 4999,
    billingCycle: 'annual',
    features    : [
      'Up to 25 active jobs',
      'Up to 10 recruiter seats',
      'Up to 5,000 candidate records',
      '10 GB file storage',
      'Email + WhatsApp notifications',
      'Career page widget',
      'Advanced analytics & exports',
      'Assessment builder',
      'Bulk import / invite',
    ],
    limits: {
      maxActiveJobs       : 25,
      maxRecruiterSeats   : 10,
      maxCandidateRecords : 5000,
      maxStorageGB        : 10,
    },
    _razorpayPlanId: process.env.RAZORPAY_PLAN_GROWTH || '',
  },

  agency: {
    name        : 'Agency',
    priceINR    : 9999,
    billingCycle: 'annual',
    features    : [
      'Unlimited active jobs',
      'Unlimited recruiter seats',
      'Unlimited candidate records',
      '50 GB file storage',
      'Email + WhatsApp notifications',
      'White-label career page',
      'Full analytics suite with Excel export',
      'Assessment builder + anti-cheat',
      'Bulk import / invite',
      'Priority support',
      'GST invoice auto-generation',
    ],
    limits: {
      maxActiveJobs       : -1,  // -1 = unlimited
      maxRecruiterSeats   : -1,
      maxCandidateRecords : -1,
      maxStorageGB        : 50,
    },
    _razorpayPlanId: process.env.RAZORPAY_PLAN_AGENCY || '',
  },
};

/**
 * Returns plan data safe for the frontend — strips Razorpay plan IDs.
 */
function getPublicPlans() {
  return Object.entries(PLANS).reduce((acc, [key, plan]) => {
    const { _razorpayPlanId, ...safe } = plan;   // eslint-disable-line no-unused-vars
    acc[key] = safe;
    return acc;
  }, {});
}

/**
 * Returns the full plan object (internal use only).
 * @param {string} planKey - 'starter' | 'growth' | 'agency'
 */
function getPlan(planKey) {
  return PLANS[planKey] || null;
}

/**
 * Returns plan limits for a given plan key, defaulting to starter.
 */
function getPlanLimits(planKey) {
  const plan = PLANS[planKey];
  if (!plan) return PLANS.starter.limits;
  return plan.limits;
}

const VALID_PLAN_KEYS = Object.keys(PLANS);

module.exports = { PLANS, getPublicPlans, getPlan, getPlanLimits, VALID_PLAN_KEYS };
