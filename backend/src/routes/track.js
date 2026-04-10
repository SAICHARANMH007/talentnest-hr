'use strict';
/**
 * Email Open Tracking
 * Embeds a 1x1 transparent GIF in outreach emails.
 * Each email gets a unique trackingId (UUID stored in AuditLog).
 */
const express      = require('express');
const router       = express.Router();
const AuditLog     = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');

// 1x1 transparent GIF, base64-encoded
const PIXEL_B64 = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const PIXEL_BUF = Buffer.from(PIXEL_B64, 'base64');

// GET /api/track/open/:trackingId
router.get('/open/:trackingId', asyncHandler(async (req, res) => {
  const { trackingId } = req.params;

  // Fire-and-forget — never delay the pixel response
  AuditLog.create({
    action: 'email_opened',
    entity: 'EmailTracking',
    entityId: trackingId,
    details: {
      trackingId,
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip,
    },
  }).catch(() => {});

  res.set({
    'Content-Type':   'image/gif',
    'Content-Length': PIXEL_BUF.length,
    'Cache-Control':  'no-cache, no-store, must-revalidate',
    'Pragma':         'no-cache',
    'Expires':        '0',
  });
  res.send(PIXEL_BUF);
}));

module.exports = router;
