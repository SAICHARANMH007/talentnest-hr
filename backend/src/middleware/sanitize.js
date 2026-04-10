'use strict';

/**
 * Enterprise Sanitize Middleware — Silicon Valley Security Standards
 * Protects against NoSQL Injection and XSS before the Request hits the controller.
 */
const sanitize = (req, res, next) => {
  const clean = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // 1. Prevent NoSQL Injection: Keys starting with $ or containing . (MongoDB reserved)
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
          continue;
        }

        const value = obj[key];

        // 2. Prevent XSS: Recursively sanitize strings
        if (typeof value === 'string') {
          // Strip <script> and other dangerous HTML tags
          obj[key] = value
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
            .replace(/on\w+="[^"]*"/gim, '')
            .trim();
        } else if (typeof value === 'object') {
          clean(value);
        }
      }
    }
  };

  if (req.body)  clean(req.body);
  if (req.query) clean(req.query);
  if (req.params) clean(req.params);

  next();
};

module.exports = sanitize;
