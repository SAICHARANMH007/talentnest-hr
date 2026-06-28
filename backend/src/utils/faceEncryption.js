'use strict';
/**
 * faceEncryption — AES-256-GCM field-level encryption for biometric descriptors.
 *
 * Key: 32-byte random key from FACE_ENCRYPTION_KEY env var (64-char hex).
 * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * When FACE_ENCRYPTION_KEY is not set, encryption is skipped (no-op) so that
 * existing deployments without a key continue to work. Raw descriptor arrays
 * are stored as-is; loadDescriptor() falls back to them automatically.
 *
 * Storage format: { iv: hexString, tag: hexString, data: hexString }
 * All three are hex-encoded for safe MongoDB storage.
 */
const crypto = require('crypto');
const logger = require('../middleware/logger');

const ALGO     = 'aes-256-gcm';
const IV_BYTES = 12;  // 96-bit IV — recommended for GCM

let _key  = null;
let _warn = false;  // log warning once

function getKey() {
  if (_key) return _key;
  const raw = process.env.FACE_ENCRYPTION_KEY;
  if (!raw) return null;
  if (raw.length !== 64) {
    if (!_warn) { _warn = true; logger.warn('FACE_ENCRYPTION_KEY must be 64 hex chars (32 bytes) — face encryption disabled'); }
    return null;
  }
  try {
    const buf = Buffer.from(raw, 'hex');
    if (buf.length !== 32) return null;
    _key = buf;
    return _key;
  } catch {
    return null;
  }
}

/**
 * Encrypt a float32 descriptor array.
 * Returns { iv, tag, data } (all hex strings) on success, null when key not configured.
 */
function encryptDescriptor(arr) {
  const key = getKey();
  if (!key || !Array.isArray(arr) || arr.length === 0) return null;

  // Pack descriptor as little-endian float32 buffer
  const buf = Buffer.allocUnsafe(arr.length * 4);
  for (let i = 0; i < arr.length; i++) buf.writeFloatLE(arr[i], i * 4);

  const iv      = crypto.randomBytes(IV_BYTES);
  const cipher  = crypto.createCipheriv(ALGO, key, iv);
  const enc     = Buffer.concat([cipher.update(buf), cipher.final()]);
  const tag     = cipher.getAuthTag();

  return {
    iv  : iv.toString('hex'),
    tag : tag.toString('hex'),
    data: enc.toString('hex'),
  };
}

/**
 * Decrypt an encrypted descriptor object back to a float32 array.
 * Returns null on any failure (bad key, tampered data, missing fields).
 */
function decryptDescriptor(enc) {
  const key = getKey();
  if (!key || !enc?.iv || !enc?.tag || !enc?.data) return null;

  try {
    const iv         = Buffer.from(enc.iv,   'hex');
    const tag        = Buffer.from(enc.tag,  'hex');
    const ciphertext = Buffer.from(enc.data, 'hex');
    const decipher   = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const result = [];
    for (let i = 0; i < plain.length; i += 4) result.push(plain.readFloatLE(i));
    return result;
  } catch {
    return null;
  }
}

/**
 * Encrypt an array of descriptors (multi-pose gallery).
 * Returns an array of { iv, tag, data } objects, or null when key not configured.
 */
function encryptDescriptors(arrs) {
  const key = getKey();
  if (!key || !Array.isArray(arrs) || arrs.length === 0) return null;
  const results = arrs.map(encryptDescriptor).filter(Boolean);
  return results.length > 0 ? results : null;
}

/**
 * Load the primary descriptor from a user/candidate document.
 * Prefers faceDescriptorEnc (encrypted) when available and key is configured;
 * falls back to raw faceDescriptor for legacy records without encryption.
 */
function loadDescriptor(user) {
  if (!user) return null;
  const dec = decryptDescriptor(user.faceDescriptorEnc);
  if (dec && dec.length >= 64) return dec;
  // Legacy / no-key fallback
  return (Array.isArray(user.faceDescriptor) && user.faceDescriptor.length >= 64)
    ? user.faceDescriptor
    : null;
}

/**
 * Load the multi-pose gallery from a user/candidate document.
 * Prefers faceDescriptorsEnc (encrypted) when available; falls back to raw faceDescriptors.
 */
function loadDescriptors(user) {
  if (!user) return null;
  if (Array.isArray(user.faceDescriptorsEnc) && user.faceDescriptorsEnc.length > 0 && getKey()) {
    const decArr = user.faceDescriptorsEnc.map(decryptDescriptor).filter(d => d && d.length >= 64);
    if (decArr.length > 0) return decArr;
  }
  return (Array.isArray(user.faceDescriptors) && user.faceDescriptors.length >= 2)
    ? user.faceDescriptors
    : null;
}

module.exports = {
  encryptDescriptor,
  decryptDescriptor,
  encryptDescriptors,
  loadDescriptor,
  loadDescriptors,
};
