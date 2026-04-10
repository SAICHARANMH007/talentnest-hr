'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level}: ${stack || message}`;
  })
);

// Professional transport configuration
const transports = [
  // Output to console for dev monitoring
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }),
];

// In production, save errors to structured files
if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
  transports.push(
    new DailyRotateFile({
      filename: path.join('logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d', // Keep 14 days of history
    })
  );
}

const AuditLog = require('../models/AuditLog');

const loggerWinston = winston.createLogger({
  level: 'info',
  format: logFormat,
  transports,
  exitOnError: false, 
});

// Backward compatibility wrapper (to avoid breaking current code)
const loggerShim = {
  info:  (msg, data) => loggerWinston.info(msg, { data }),
  warn:  (msg, data) => loggerWinston.warn(msg, { data }),
  error: (msg, data) => loggerWinston.error(msg, { data }),
  debug: (msg, data) => loggerWinston.debug(msg, { data }),
  
  /**
   * Enterprise Audit Ledger — Persistent & Searchable Compliance Records
   */
  audit: async (action, userId, orgId, extra = {}) => {
    // 1. System Log (Winston)
    loggerWinston.info(`[AUDIT] ${action}`, { userId: userId?.toString(), orgId: orgId?.toString(), ...extra });

    // 2. Persistent Ledger (MongoDB) — Standard for Finance/HR Compliance
    try {
      await AuditLog.create({
        action,
        userId  : userId || null,
        tenantId: orgId  || null, // orgId kept as param for backward compat; maps to tenantId
        details : extra,
      });
    } catch (err) {
      loggerWinston.error('Failed to write persistent AuditLog:', err.message);
    }
  },
};

module.exports = loggerShim;
