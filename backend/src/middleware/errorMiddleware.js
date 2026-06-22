'use strict';

const { safeError } = require('./safeError');

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const isProd = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

  if (!isProd) {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    let message = err.message;

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

    if (!err.isOperational) {
      console.error('CRITICAL PROGRAMMING ERROR', err);
      // Belt-and-suspenders: capture directly in case Sentry express handler missed it
      if (process.env.SENTRY_DSN) {
        try {
          const Sentry = require('@sentry/node');
          Sentry.captureException(err);
        } catch (_) {}
      }
      message = safeError(err);
    }

    res.status(err.statusCode).json({
      status: err.status,
      message: message
    });
  }
};
