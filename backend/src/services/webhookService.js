'use strict';
const crypto = require('crypto');

const SUPPORTED_EVENTS = [
  'application.created',
  'application.stage_changed',
  'application.hired',
  'application.rejected',
  'interview.scheduled',
  'offer.sent',
  'offer.accepted',
  'job.created',
  'job.closed',
];

async function fireWebhooks(tenantId, event, payload) {
  if (!tenantId || !event) return;
  try {
    const Webhook = require('../models/Webhook');
    const hooks = await Webhook.find({
      tenantId,
      isActive: true,
      deletedAt: null,
      events: event,
    }).lean();

    if (!hooks.length) return;

    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });

    await Promise.all(hooks.map(hook => deliverOne(hook, event, body)));
  } catch (err) {
    // Non-fatal: webhook delivery errors must not crash main request
    console.error('[webhookService] fireWebhooks error:', err.message);
  }
}

async function deliverOne(hook, event, body) {
  const Webhook = require('../models/Webhook');
  const start = Date.now();
  let responseCode = 0;
  let success = false;
  let errorMsg = '';

  try {
    const headers = {
      'Content-Type':  'application/json',
      'X-TalentNest-Event': event,
      'X-TalentNest-Delivery': crypto.randomBytes(8).toString('hex'),
    };

    if (hook.secret) {
      const sig = crypto.createHmac('sha256', hook.secret).update(body).digest('hex');
      headers['X-TalentNest-Signature'] = `sha256=${sig}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(hook.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    responseCode = res.status;
    success = res.status >= 200 && res.status < 300;
  } catch (err) {
    errorMsg = err.message || 'Delivery failed';
  }

  const durationMs = Date.now() - start;

  const delivery = { event, sentAt: new Date(), responseCode, success, error: errorMsg, durationMs };

  await Webhook.findByIdAndUpdate(hook._id, {
    $set:  { lastTriggeredAt: new Date() },
    $inc:  { failureCount: success ? 0 : 1 },
    $push: {
      recentDeliveries: {
        $each: [delivery],
        $slice: -20, // keep last 20 deliveries
        $position: 0,
      },
    },
  });
}

module.exports = { fireWebhooks, SUPPORTED_EVENTS };
