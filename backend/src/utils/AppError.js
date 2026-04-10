'use strict';

/**
 * AppError Class — Enterprise Standard for API Errors
 * 
 * Allows passing status codes (400, 401, 403, 404, etc.) 
 * and specifies if the error is "Operational" (known) or a "Programming" error (crash).
 */
class AppError extends Error {
  constructor(message, statusCode, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // For distinguishing known vs unknown errors
    if (data) this.data = data;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
