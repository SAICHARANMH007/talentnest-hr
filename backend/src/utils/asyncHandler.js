'use strict';

/**
 * asyncHandler(fn) — Wraps async Express routes.
 * 
 * Instead of: try { await code() } catch(e) { next(e) }
 * Use: asyncHandler(async (req, res, next) => { await code(); })
 */
module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
