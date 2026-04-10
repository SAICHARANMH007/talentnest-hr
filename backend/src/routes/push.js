'use strict';
const express  = require('express');
const router   = express.Router();
const { authMiddleware: auth } = require('../middleware/auth');
const PushSubscription = require('../models/PushSubscription');

// GET /api/push/vapid-public-key — return VAPID public key for frontend subscription
router.get('/vapid-public-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY || '';
  res.json({ success: true, data: { publicKey: key } });
});

// POST /api/push/subscribe — save browser subscription for this user
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid subscription object' });
    }

    // Upsert by endpoint to avoid duplicates
    await PushSubscription.findOneAndUpdate(
      { userId: req.user.id, 'subscription.endpoint': subscription.endpoint },
      { userId: req.user.id, tenantId: req.user.tenantId, subscription, isActive: true },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Subscribed to push notifications' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/push/unsubscribe — deactivate all subscriptions for this user
router.delete('/unsubscribe', auth, async (req, res) => {
  try {
    await PushSubscription.updateMany({ userId: req.user.id }, { isActive: false });
    res.json({ success: true, message: 'Unsubscribed from push notifications' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
