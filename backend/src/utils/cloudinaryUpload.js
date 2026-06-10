'use strict';
const cloudinary = require('cloudinary').v2;

// Pasting credentials into hosting dashboards (e.g. Render) often introduces
// invisible trailing whitespace/newlines or wrapping quotes, which silently
// changes the secret used to compute the signature and causes Cloudinary to
// reject every request with "Invalid Signature" regardless of algorithm.
function sanitizeEnv(value) {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/^['"]|['"]$/g, '');
}

function configure(signatureAlgorithm) {
  cloudinary.config({
    cloud_name: sanitizeEnv(process.env.CLOUDINARY_CLOUD_NAME),
    api_key: sanitizeEnv(process.env.CLOUDINARY_API_KEY),
    api_secret: sanitizeEnv(process.env.CLOUDINARY_API_SECRET),
    signature_algorithm: signatureAlgorithm,
  });
}

/** Uploads a buffer to Cloudinary. Cloudinary accounts can be configured to
 * sign requests with either SHA-1 or SHA-256 — if the account doesn't match
 * the algorithm we tried, Cloudinary responds with "Invalid Signature".
 * In that case, retry once with the other algorithm before giving up. */
function uploadBuffer(buffer, options = {}) {
  const tryUpload = (signatureAlgorithm) => {
    configure(signatureAlgorithm);
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (err, result) => err ? reject(err) : resolve(result));
      stream.end(buffer);
    });
  };

  return tryUpload('sha256').catch((err) => {
    if (!/invalid signature/i.test(err?.message || '')) throw err;
    return tryUpload('sha1').catch((err2) => {
      if (!/invalid signature/i.test(err2?.message || '')) throw err2;
      const cfg = cloudinary.config();
      const mask = (s) => s ? `${s.slice(0, 2)}***${s.slice(-2)} (len ${s.length})` : '(missing)';
      console.error('[cloudinaryUpload] Both SHA-256 and SHA-1 signatures rejected. ' +
        `cloud_name=${mask(cfg.cloud_name)} api_key=${mask(cfg.api_key)} api_secret=${mask(cfg.api_secret)} — ` +
        'verify these exactly match the Cloudinary Dashboard > Settings > API Keys (no extra spaces/quotes/newlines).');
      throw err2;
    });
  });
}

module.exports = { uploadBuffer };
