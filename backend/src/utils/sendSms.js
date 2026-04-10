'use strict';
/**
 * SMS utility — Fast2SMS REST API (no SDK)
 * Env vars: FAST2SMS_API_KEY
 * Falls back to console.log in dev if key not set.
 */
async function sendSms(phone, message) {
  const apiKey = process.env.FAST2SMS_API_KEY;

  // Normalize Indian phone — strip country code, keep 10 digits
  const digits = String(phone).replace(/\D/g, '');
  const mobile = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits.slice(-10);

  if (!apiKey) {
    console.log(`[SMS DEV] To: ${mobile} | Msg: ${message}`);
    return { success: true, dev: true };
  }

  const body = {
    authorization: apiKey,
    message,
    language: 'english',
    route: 'q',  // quick transactional
    numbers: mobile,
  };

  const resp = await fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'cache-control': 'no-cache',
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (!resp.ok || data.return === false) {
    throw new Error(data.message || 'SMS delivery failed');
  }
  return { success: true, requestId: data.request_id };
}

module.exports = { sendSms };
