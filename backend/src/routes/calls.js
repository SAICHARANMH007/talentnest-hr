'use strict';
const express    = require('express');
const router     = express.Router();
const CallRecord = require('../models/CallRecord');
const { authenticate } = require('../middleware/auth');
const asyncHandler     = require('../utils/asyncHandler');

// GET /api/calls/thread/:userId — call records between two users (for chat thread)
router.get('/thread/:userId', authenticate, asyncHandler(async (req, res) => {
  const myId     = String(req.user._id || req.user.id);
  const otherId  = req.params.userId;
  const records  = await CallRecord.find({
    $or: [
      { fromUserId: myId,    toUserId: otherId },
      { fromUserId: otherId, toUserId: myId    },
    ],
  }).sort({ startedAt: -1 }).limit(50).lean();
  res.json({ success: true, data: records });
}));

module.exports = router;
