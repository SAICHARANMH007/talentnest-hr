'use strict';

const { safeError } = require('./safeError');

/**
 * Global Error Handling Middleware — Enterprise Standard
 * 
 * This is the final catch-all middleware in the Express app.
 * It formats errors, hides stack traces in production, 
 * and ensures the server never crashes on unknown exceptions.
 */
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const isProd = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

  if (!isProd) {
    // Development Environment: Send full details for debugging
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    // Production Environment: Hide internal details, send client-safe messages
    let message = err.message;

    // ── Mongoose Error Specialization (Industry Standard) ────────────────
    if (err.name === 'CastError') {
      err.statusCode = 400;
      message = `Invalid technical identity: ${err.value} at ${err.path}`;
      err.isOperational = true;
    }
    if (err.name === 'ValidationError') {
      err.statusCode = 400;
      message = Object.values(err.errors).map(el => el.message).join('. ');
      err.isOperational = true;
    }
    if (err.code === 11000) {
      err.statusCode = 409;
      message = 'Duplicate field value entered. Record already exists.';
      err.isOperational = true;
    }

    // If it's NOT an operational error (e.g., a bug in code), hide it with safeError logic
    if (!err.isOperational) {
      console.error('CRITICAL PROGRAMMING ERROR', err);
      message = safeError(err);
    }

    res.status(err.statusCode).json({
      status: err.status,
      message: message
    });
  }
};
