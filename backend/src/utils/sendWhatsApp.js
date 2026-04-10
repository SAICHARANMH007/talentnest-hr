'use strict';
/**
 * Send WhatsApp message via Twilio REST API (raw fetch — no SDK)
 */
const WhatsAppLog = require('../models/WhatsAppLog');

/**
 * @param {string} to - phone number, digits only or E.164
 * @param {string} body - message text
 * @param {object} opts - { tenantId, candidateId }
 */
async function sendWhatsApp(to, body, opts = {}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

  if (!accountSid || !authToken) {
    console.warn('[sendWhatsApp] TWILIO credentials not set — skipping');
    return { ok: false, reason: 'not_configured' };
  }

  // Normalise recipient number to E.164 whatsapp: format
  const normalised = normalisePhone(to);
  const toWA = `whatsapp:${normalised}`;

  const params = new URLSearchParams({ From: from, To: toWA, Body: body });

  let messageSid, status, error;
  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      }
    );
    const data = await res.json();
    messageSid = data.sid;
    status = res.ok ? 'sent' : 'failed';
    if (!res.ok) error = data.message || JSON.stringify(data);
  } catch (err) {
    status = 'failed';
    error = err.message;
  }

  // Log every message
  try {
    await WhatsAppLog.create({
      tenantId:    opts.tenantId || null,
      candidateId: opts.candidateId || null,
      direction:   'outbound',
      from,
      to:          toWA,
      message:     body,
      messageSid,
      status,
      error,
    });
  } catch { /* log failure is non-fatal */ }

  return { ok: status === 'sent', messageSid };
}

function normalisePhone(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `+91${digits.slice(1)}`;
  return `+${digits}`;
}

module.exports = { sendWhatsApp, normalisePhone };
