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
// 20 invite/email sends per hour per IP (invite routes only — not the whole admin router)
app.use('/api/admin/invite-admin',   rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { success: false, error: 'Too many invite requests. Please wait before sending more.' } }));
app.use('/api/admin/invite-recruiter', rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { success: false, error: 'Too many invite requests. Please wait before sending more.' } }));
app.use('/api/admin/resend-invite',  rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { success: false, error: 'Too many invite requests. Please wait before sending more.' } }));
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
  '/presence/heartbeat',
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
app.use('/api/presence', require('./src/routes/presence'));
app.use('/api/messages', require('./src/routes/messages'));

function escHtml(v = '') {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function publicBaseUrl(req) {
  return process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
}

function jobSlug(job) {
  return job.careerPageSlug || String(job._id);
}

function jobStructuredData(job, baseUrl) {
  const company = job.companyName || job.company || 'TalentNest HR';
  const posted = job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString();
  const validThrough = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description || `${job.title} opening at ${company}.`,
    datePosted: posted,
    validThrough,
    employmentType: job.jobType || 'FULL_TIME',
    hiringOrganization: {
      '@type': 'Organization',
      name: company,
      sameAs: baseUrl,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location || 'India',
        addressCountry: 'IN',
      },
    },
    applicantLocationRequirements: {
      '@type': 'Country',
      name: 'India',
    },
    directApply: true,
    url: `${baseUrl}/careers/job/${jobSlug(job)}`,
  };
}

async function publicJobs(limit = 200) {
  const Job = require('./src/models/Job');
  return Job.find({ status: 'active', deletedAt: null })
    .select('-__v')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

app.get('/careers/jobs.xml', async (req, res, next) => {
  try {
    const base = publicBaseUrl(req);
    const jobs = await publicJobs(5000);
    const urls = jobs.map(job => {
      const updated = job.updatedAt ? new Date(job.updatedAt).toISOString() : new Date().toISOString();
      return `<url><loc>${escHtml(base)}/careers/job/${escHtml(jobSlug(job))}</loc><lastmod>${updated}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`;
    }).join('');
    res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  } catch (err) { next(err); }
});

app.get('/careers/job/:slug', async (req, res, next) => {
  try {
    const Job = require('./src/models/Job');
    const clauses = [{ careerPageSlug: req.params.slug }];
    if (/^[a-f\d]{24}$/i.test(req.params.slug)) clauses.push({ _id: req.params.slug });
    const job = await Job.findOne({
      status: 'active',
      deletedAt: null,
      $or: clauses,
    }).lean();
    if (!job) return next(new AppError('Job not found', 404));
    const base = publicBaseUrl(req);
    const company = job.companyName || job.company || 'TalentNest HR';
    const skills = Array.isArray(job.skills) ? job.skills : [];
    const applyUrl = `${base}/careers?job=${job._id}`;
    const structured = JSON.stringify(jobStructuredData(job, base)).replace(/</g, '\\u003c');
    res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escHtml(job.title)} | ${escHtml(company)} | TalentNest HR Careers</title>
  <meta name="description" content="${escHtml(`${job.title} opening at ${company}. Apply through TalentNest HR.`)}">
  <link rel="canonical" href="${escHtml(base)}/careers/job/${escHtml(jobSlug(job))}">
  <script type="application/ld+json">${structured}</script>
  <style>body{font-family:Arial,sans-serif;margin:0;color:#0f172a;background:#f8fafc}.wrap{max-width:860px;margin:0 auto;padding:40px 20px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;box-shadow:0 8px 30px rgba(15,23,42,.08)}.badge{display:inline-block;background:#eff6ff;color:#075985;border-radius:999px;padding:5px 10px;margin:4px;font-size:13px}.btn{display:inline-block;background:#0176d3;color:#fff;text-decoration:none;border-radius:10px;padding:13px 22px;font-weight:700;margin-top:20px}</style>
</head>
<body>
  <main class="wrap">
    <article class="card">
      <p style="color:#0176d3;font-weight:700;margin:0 0 8px">TalentNest HR Careers</p>
      <h1>${escHtml(job.title)}</h1>
      <p><strong>Company:</strong> ${escHtml(company)}</p>
      <p><strong>Location:</strong> ${escHtml(job.location || 'Remote / India')}</p>
      <p><strong>Type:</strong> ${escHtml(job.jobType || 'Full-time')} ${job.department ? ` · <strong>Department:</strong> ${escHtml(job.department)}` : ''}</p>
      ${job.salaryMin || job.salaryMax ? `<p><strong>Salary:</strong> ${escHtml(job.salaryCurrency || 'INR')} ${escHtml(job.salaryMin || '')}${job.salaryMax ? ` - ${escHtml(job.salaryMax)}` : ''} ${escHtml(job.salaryType || '')}</p>` : ''}
      <h2>Job Description</h2>
      <p style="white-space:pre-line;line-height:1.65">${escHtml(job.description || '')}</p>
      ${skills.length ? `<h2>Skills</h2><p>${skills.map(s => `<span class="badge">${escHtml(s)}</span>`).join('')}</p>` : ''}
      <a class="btn" href="${escHtml(applyUrl)}">Apply on TalentNest HR</a>
    </article>
  </main>
</body>
</html>`);
  } catch (err) { next(err); }
});

app.get('/careers/crawl', async (req, res, next) => {
  try {
    const base = publicBaseUrl(req);
    const jobs = await publicJobs(500);
    const items = jobs.map(job => {
      const company = job.companyName || job.company || 'TalentNest HR';
      const skills = Array.isArray(job.skills) ? job.skills.join(', ') : '';
      return `<li><h2><a href="${escHtml(base)}/careers/job/${escHtml(jobSlug(job))}">${escHtml(job.title)}</a></h2><p>${escHtml(company)} · ${escHtml(job.location || 'Remote / India')}</p><p>${escHtml(job.description || '')}</p><p>${escHtml(skills)}</p></li>`;
    }).join('');
    res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>TalentNest HR Jobs</title><meta name="description" content="Open jobs at TalentNest HR. Apply directly on TalentNest HR careers."></head><body><main><h1>TalentNest HR Open Jobs</h1><ul>${items}</ul></main></body></html>`);
  } catch (err) { next(err); }
});

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
