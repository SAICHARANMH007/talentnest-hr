'use strict';
const logger = require('../middleware/logger');

// attachments: [{ filename: string, content: string (base64) }]
async function sendViaResend(to, subject, html, attachments) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'hr@talentnesthr.com';
  if (!apiKey) {
    console.log(`[Email DEV] To: ${to} | Subject: ${subject}`);
    return { id: 'dev-mode' };
  }
  const body = { from: `TalentNest HR <${from}>`, to: Array.isArray(to) ? to : [to], subject, html };
  if (attachments && attachments.length) body.attachments = attachments;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || JSON.stringify(d));
  return { id: d.id };
}

// attachments: [{ filename: string, content: string (base64) }]
const sendEmailWithRetry = async (to, subject, html, attachments, maxRetries = 3) => {
  // Support legacy callers that pass (to, subject, html, maxRetries)
  if (typeof attachments === 'number') { maxRetries = attachments; attachments = undefined; }
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendViaResend(to, subject, html, attachments);
      logger.info(`Email sent to ${to}`, { subject, attempt });
      return result;
    } catch (err) {
      logger.warn(`Email attempt ${attempt} failed: ${err.message}`, { to, subject });
      if (attempt === maxRetries) {
        logger.error(`Email delivery failed after ${maxRetries} attempts`, { to, subject, error: err.message });
        throw err;
      }
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
};

const templates = require('./emailTemplates');

module.exports = { sendEmailWithRetry, templates };
