'use strict';
/**
 * Email Sequence Processor — runs every 30 minutes.
 * Finds enrollments where nextSendAt <= now and sends the next step email.
 */
const cron           = require('node-cron');
const EmailSequence  = require('../models/EmailSequence');
const { sendEmailWithRetry } = require('../utils/email');
const logger         = require('../middleware/logger');

async function processDueEmails() {
  const now = new Date();
  const seqs = await EmailSequence.find({
    isActive  : true,
    deletedAt : null,
    'enrollments.completed' : false,
    'enrollments.nextSendAt': { $lte: now },
  });

  for (const seq of seqs) {
    for (const enroll of seq.enrollments) {
      if (enroll.completed || !enroll.nextSendAt || enroll.nextSendAt > now) continue;

      const step = seq.steps[enroll.currentStep];
      if (!step) { enroll.completed = true; continue; }

      try {
        const body = step.body
          .replace(/{{name}}/gi, enroll.email?.split('@')[0] || 'there')
          .replace(/{{email}}/gi, enroll.email || '');

        await sendEmailWithRetry(enroll.email, step.subject, `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px">${body}</div>`);
        enroll.stepsLog.push({ step: enroll.currentStep, sentAt: new Date(), subject: step.subject });
      } catch (err) {
        logger.error('[sequenceProcessor] Failed to send email', { err: err.message, enrollment: enroll._id });
        continue;
      }

      enroll.currentStep += 1;
      if (enroll.currentStep >= seq.steps.length) {
        enroll.completed = true;
      } else {
        const nextStep = seq.steps[enroll.currentStep];
        enroll.nextSendAt = new Date(Date.now() + (nextStep.delayDays || 1) * 86400000);
      }
    }
    await seq.save();
  }
}

// Run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  try { await processDueEmails(); }
  catch (err) { logger.error('[sequenceProcessor] Error', { err: err.message }); }
});

module.exports = { processDueEmails };
