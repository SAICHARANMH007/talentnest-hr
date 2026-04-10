require('dotenv').config();
// v3.5 — email triggers, audit log DB, duplicate detection, time-to-hire
'use strict';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/db/connect');
const seed = require('./src/db/seed');
const seedDemo = require('./src/db/seedDemo');
const logger = require('./src/middleware/logger');
const errorMiddleware = require('./src/middleware/errorMiddleware');
const AppError = require('./src/utils/AppError');
const morgan = require('morgan');
const setupSwagger = require('./src/config/swagger');
const sanitize = require('./src/middleware/sanitize');

// ── Startup Sanity Check (Enterprise Standard) ──────────────────────────────
const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.RENDER || !!process.env.RENDER;

const criticalVars = ['MONGODB_URI', 'JWT_SECRET'];
const missing = criticalVars.filter(v => !process.env[v]);
if (missing.length) {
  console.error(`❌  CRITICAL: Missing environment variables: ${missing.join(', ')}`);
  process.exit(1);
}
// COOKIE_SECRET must be set in Render environment variables. 
// Using fallback for local dev compatibility but this MUST be set in production.
// ACTION REQUIRED: Add COOKIE_SECRET to Render dashboard.
if (!process.env.COOKIE_SECRET) {
  console.error('🚨  SECURITY WARNING: COOKIE_SECRET not set. Add it to Render env vars immediately!');
  process.env.COOKIE_SECRET = 'talentnest_default_secure_secret_2026_prod';
}

const app = express();
const DIST_PATH = path.join(__dirname, '../dist');
const HAS_DIST = fs.existsSync(DIST_PATH);

// ── Automated API Documentation (Swagger/OpenAPI)
setupSwagger(app);

// Trust Render/Cloud Proxy — required for rate-limiting behind load balancer
app.set('trust proxy', 1);

// ── Health checks BEFORE everything
const sendHealth = (req, res) => {
  res.json({
    status: 'ok',
    db: process.env.MONGODB_URI ? 'mongodb' : 'json-file',
    frontend: HAS_DIST ? 'bundled' : 'external',
    timestamp: new Date().toISOString(),
  });
};

app.get('/api/health', sendHealth);
app.get('/health', sendHealth);

// ── Gzip compression for all responses
app.use(compression());

// ── Cookie parsing (Secret for signed cookies)
app.use(cookieParser(process.env.COOKIE_SECRET || 'talent_nest_secure_cookie_secret_2024'));

// ── Security headers via Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (origin.startsWith('http://localhost:')) return cb(null, true);
    if (origin.endsWith('.vercel.app')) return cb(null, true);
    if (origin.endsWith('.railway.app') || origin.endsWith('.up.railway.app')) return cb(null, true);
    if (origin.endsWith('.onrender.com')) return cb(null, true);
    if (origin.endsWith('talentnesthr.com')) return cb(null, true);
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));

// ── Request logger (Morgan - Professional Standard)
app.use(morgan(IS_PROD ? 'combined' : 'dev'));

// ── Rate limiting
// Global: 200 requests per 15 min per IP
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  message: { success: false, error: 'Too many requests. Try again later.' }
}));
// Auth endpoints — tighter limits
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, error: 'Too many login attempts.' } }));
app.use('/api/auth/register', rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, error: 'Too many registration attempts.' } }));
// Email / invite sending — prevent email spam and Resend bill abuse
// 20 invite/email sends per hour per IP
app.use('/api/admin', rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { success: false, error: 'Too many invite requests. Please wait before sending more.' } }));
app.use('/api/email', rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { success: false, error: 'Email rate limit reached. Please try again later.' } }));

// ── Body parsing
app.use('/api/users/bulk-import', express.json({ limit: '25mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ── CSRF Guard (Defense-in-depth for state-changing requests)
// All POST/PUT/PATCH/DELETE calls from the frontend must include X-Requested-With: TalentNest
// GET/HEAD/OPTIONS are read-only and safe to skip.
// Public endpoints (job applications, set-password, careers) are explicitly exempted.
const CSRF_SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_EXEMPT_PATHS = new Set([
  '/auth/login', '/auth/register', '/auth/google',
  '/auth/verify-otp', '/auth/forgot-password', '/auth/reset-password',
  '/auth/set-password', '/auth/verify-invite', '/auth/refresh', '/auth/verify-domain',
  '/applications/public', '/leads', '/health',
  '/whatsapp/webhook',
]);
app.use('/api/', (req, res, next) => {
  if (CSRF_SAFE_METHODS.has(req.method)) return next();
  if (CSRF_EXEMPT_PATHS.has(req.path)) return next();
  if (req.headers['x-requested-with'] === 'TalentNest') return next();
  // Allow Swagger UI and Postman in development only
  if (!IS_PROD && (req.headers['user-agent']?.includes('swagger') || req.headers['user-agent']?.includes('PostmanRuntime'))) return next();
  return res.status(403).json({ success: false, error: 'CSRF validation failed. Request rejected.' });
});

// ── Short-lived Cache-Control for GET-heavy read endpoints ────────────────────
// 30s private cache — browser reuses response on back-nav / rapid re-renders.
// Only applies to GET; POST/PATCH/DELETE requests bypass this middleware entirely.
app.use(['/api/jobs', '/api/dashboard', '/api/stats', '/api/orgs', '/api/candidates', '/api/notifications'], (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
  }
  next();
});

// ── Routes (Unified Production Layer)
app.use('/api/parse-resume', require('./src/routes/parseResume'));
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/jobs', require('./src/routes/jobs'));
app.use('/api/applications', require('./src/routes/applications'));
app.use('/api/orgs', require('./src/routes/orgs'));
app.use('/api/stats', require('./src/routes/dashboard'));
app.use('/api/dashboard', require('./src/routes/dashboard'));

// ── Admin & Recruiter Action Routes
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/recruiter', require('./src/routes/recruiterAdmin'));

// ── Phase 4: Core hiring flow
app.use('/api/candidates', require('./src/routes/candidates'));
app.use('/api/interest', require('./src/routes/interest'));
app.use('/api/track', require('./src/routes/track'));

// ── Legacy Compatibility (shared-model aliases)
app.use('/api/invites', require('./src/routes/invites'));

// ── Secondary Features
app.use('/api/email', require('./src/routes/email'));
app.use('/api/billing', require('./src/routes/billing'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/assessments', require('./src/routes/assessments'));
app.use('/api/offers', require('./src/routes/offers'));
app.use('/api/candidate-requests', require('./src/routes/candidateRequests'));
app.use('/api/clients', require('./src/routes/clients'));
app.use('/api/leads', require('./src/routes/leads'));
app.use('/api/social', require('./src/routes/social'));
app.use('/api/platform', require('./src/routes/platform'));
app.use('/api/push', require('./src/routes/push'));
app.use('/api/whatsapp', require('./src/routes/whatsapp'));
app.use('/api/nps', require('./src/routes/nps'));
// Candidate sub-routes (must come AFTER the main /api/candidates router to avoid conflicts)
app.use('/api/candidates/:id/documents', require('./src/routes/candidateDocs'));
app.use('/api/candidates/:id/video', require('./src/routes/candidateVideo'));
app.use('/api/preboarding', require('./src/routes/preboarding'));
app.use('/api/custom-fields', require('./src/routes/customFields'));
app.use('/api/customizations', require('./src/routes/customizations'));
app.use('/api/pipeline-templates', require('./src/routes/pipelineTemplates'));
app.use('/api/job-alerts', require('./src/routes/jobAlerts'));
app.use('/api/blogs', require('./src/routes/blogs'));

if (IS_PROD) {
  if (HAS_DIST) {
    console.info('✅  Static Assets     →  Loaded from /dist');
  } else {
    console.info('ℹ️   Static Mode      →  No /dist found. Running API-only instance.');
  }
}

if (HAS_DIST) {
  app.use(express.static(DIST_PATH));

  // SPA fallback: all non-API routes serve the frontend when a bundle is present.
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    res.sendFile(path.join(DIST_PATH, 'index.html'), (err) => {
      if (err) next();
    });
  });
} else {
  // Keep backend-only hosts healthy without pretending they serve the UI.
  app.get('/', (req, res) => {
    res.status(200).json({
      service: 'Talent Nest API',
      status: 'ok',
      health: '/api/health',
      frontend: process.env.FRONTEND_URL || 'not-configured',
    });
  });

  app.head('/', (req, res) => {
    res.sendStatus(200);
  });
}

// ── 404 handler (Wrap in AppError for API)
app.all('*', (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
});

// ── Global error handler (Industry Standard)
app.use(errorMiddleware);

// ── Start
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀  Talent Nest API   →  Listening on port ${PORT}`);
  console.log(`📡  Mode             →  ${IS_PROD ? (process.env.RENDER ? 'Production (Render)' : 'Production') : 'Development'}`);
  if (IS_PROD) console.info('🔥  Production Environment Active & Bound to 0.0.0.0');
});

// Connect DB + seed in background
const { startWeeklyReportJob } = require('./src/jobs/weeklyReport');
const { startSlaMonitorJob } = require('./src/jobs/slaMonitor');
const { startNpsSchedulerJob } = require('./src/jobs/npsScheduler');
const { startPreBoardingJobs } = require('./src/jobs/preboardingCron');
const { startJobAlertJobs } = require('./src/jobs/jobAlertCron');

connectDB()
  .then(() => seed())
  .then(() => seedDemo())
  .then(() => {
    startWeeklyReportJob();
    startSlaMonitorJob();
    startNpsSchedulerJob();
    startPreBoardingJobs();
    startJobAlertJobs();

    // ── Keep-alive self-ping (prevents Render free tier from sleeping) ──
    // Pings own health endpoint every 10 minutes.
    if (process.env.RENDER_EXTERNAL_URL) {
      const https = require('https');
      const http = require('http');
      const selfUrl = process.env.RENDER_EXTERNAL_URL + '/api/health';
      setInterval(() => {
        const client = selfUrl.startsWith('https') ? https : http;
        client.get(selfUrl, (res) => {
          console.log(`🏓  Keep-alive ping → ${res.statusCode}`);
        }).on('error', (e) => {
          console.warn('⚠️  Keep-alive ping failed:', e.message);
        });
      }, 10 * 60 * 1000); // every 10 minutes
      console.log(`⏱️  Keep-alive cron started → ${selfUrl}`);
    }
  })
  .catch(err => console.error('❌  DB connection failed:', err.message));

