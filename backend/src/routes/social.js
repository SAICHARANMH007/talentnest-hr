'use strict';
const express      = require('express');
const { authenticate: auth } = require('../middleware/auth');
const { allowRoles } = require('../middleware/rbac');
const asyncHandler     = require('../utils/asyncHandler');
const AppError         = require('../utils/AppError');
const socialService    = require('../services/social.service');
const router           = express.Router();

/**
 * POST /api/social/post-job — Manual trigger, admin only
 */
router.post('/post-job', auth, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  const { job } = req.body;
  if (!job) throw new AppError('Job object required.', 400);

  const result = await socialService.autoPostJob(job);
  res.json({ success: true, data: result });
}));

/**
 * GET /api/social/config — Check what's configured
 */
router.get('/config', auth, allowRoles('admin', 'super_admin'), asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      facebook:  { configured: !!(process.env.FB_PAGE_ID && process.env.FB_PAGE_ACCESS_TOKEN) },
      instagram: { configured: !!(process.env.IG_ACCOUNT_ID && process.env.FB_PAGE_ACCESS_TOKEN) }
    }
  });
}));

module.exports = router;
