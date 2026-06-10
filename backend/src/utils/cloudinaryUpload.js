'use strict';
const cloudinary = require('cloudinary').v2;

function configure(signatureAlgorithm) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
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
    return tryUpload('sha1');
  });
}

module.exports = { uploadBuffer };
