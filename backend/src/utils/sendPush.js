'use strict';
const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// Configure VAPID only if keys are set
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'hello@talentnesthr.com'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/**
 * Send a push notification to a user
 * @param {string|ObjectId} userId
 * @param {{ title: string, body: string, url?: string }} notification
 */
async function sendPush(userId, notification) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  try {
    const subs = await PushSubscription.find({ userId, isActive: true }).lean();
    const payload = JSON.stringify(notification);

    for (const doc of subs) {
      try {
        await webpush.sendNotification(doc.subscription, payload);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription expired — deactivate
          await PushSubscription.findByIdAndUpdate(doc._id, { isActive: false });
        } else {
          console.error('[sendPush] error for sub', doc._id, err.message);
        }
      }
    }
  } catch (err) {
    console.error('[sendPush] failed:', err.message);
  }
}

module.exports = { sendPush };
