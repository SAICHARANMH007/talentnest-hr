'use strict';
/**
 * safeError(e) — returns a client-safe error message.
 * In production, internal error details (DB queries, paths, driver errors)
 * are hidden from the response to prevent information leakage.
 * In development, the real message is returned for easier debugging.
 */
const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

const SAFE_MESSAGES = {
  // Mongoose / MongoDB driver errors
  'E11000': 'A record with that value already exists.',
  'CastError': 'Invalid ID format.',
  'ValidationError': 'Validation failed. Check your input.',
  'MongoNetworkError': 'Database connection error. Try again shortly.',
  'MongoServerError': 'Database error. Try again shortly.',
  // JWT errors
  'JsonWebTokenError': 'Invalid session token.',
  'TokenExpiredError': 'Session expired. Please log in again.',
  'NotBeforeError': 'Session not yet valid.',
};

function safeError(e) {
  if (!IS_PROD) return e.message; // Full detail in dev
  // Check known error types / codes
  for (const [key, msg] of Object.entries(SAFE_MESSAGES)) {
    if (e.name === key || e.code === key || (e.message || '').includes(key)) return msg;
  }
  return 'An unexpected error occurred. Please try again.';
}

module.exports = { safeError };
