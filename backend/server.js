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
// 5s private cache — browser reuses response on back-nav / rapid re-renders.
// Only applies to GET; POST/PATCH/DELETE requests bypass this middleware entirely.
app.use(['/api/jobs', '/api/dashboard', '/api/stats', '/api/orgs', '/api/candidates', '/api/notifications'], (req, res, next) => {
  if (req.method === 'GET') {
    res.set('Cache-Control', 'private, max-age=5, stale-while-revalidate=10');
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

/** Map free-text jobType → Google-approved Schema.org employmentType values */
function normalizeEmploymentType(raw) {
  if (!raw) return 'FULL_TIME';
  const s = raw.toString().toLowerCase();
  if (s.includes('part')) return 'PART_TIME';
  if (s.includes('contract') || s.includes('c2c') || s.includes('c2h')) return 'CONTRACTOR';
  if (s.includes('intern')) return 'INTERN';
  if (s.includes('temp')) return 'TEMPORARY';
  if (s.includes('freelance') || s.includes('volunteer')) return 'VOLUNTEER';
  return 'FULL_TIME';
}

/** Detect remote jobs — triggers Google's "Remote" badge */
function isRemoteJob(location) {
  if (!location) return false;
  const l = location.toLowerCase();
  return l.includes('remote') || l.includes('work from home') || l.includes('wfh');
}

/**
 * Build a complete Schema.org JobPosting JSON-LD object.
 * Every optional field is only included when data is available.
 */
function jobStructuredData(job, baseUrl) {
  const company   = job.companyName || job.company || 'TalentNest HR';
  const posted    = job.createdAt ? new Date(job.createdAt).toISOString() : new Date().toISOString();
  const postedMs  = job.createdAt ? new Date(job.createdAt).getTime() : Date.now();
  // 60-day validity window — Google deprioritises stale listings
  const validThrough = new Date(postedMs + 60 * 24 * 60 * 60 * 1000).toISOString();
  const remote    = isRemoteJob(job.location);
  const applyUrl  = `${baseUrl}/careers/job/${jobSlug(job)}`;

  // Enrich description with skills/experience so crawlers can categorise
  const skillsAppend = Array.isArray(job.skills) && job.skills.length
    ? `\n\nRequired Skills: ${job.skills.join(', ')}` : '';
  const niceAppend = Array.isArray(job.niceToHaveSkills) && job.niceToHaveSkills.length
    ? `\nNice to Have: ${job.niceToHaveSkills.join(', ')}` : '';
  const expAppend = job.experience ? `\nExperience Required: ${job.experience}` : '';
  const fullDesc = (job.description || `${job.title} opening at ${company}.`)
    + skillsAppend + niceAppend + expAppend;

  const data = {
    '@context': 'https://schema.org',
    '@type':    'JobPosting',
    // ── Required ──────────────────────────────────────────────────────────
    title:       job.title,
    description: fullDesc,
    datePosted:  posted,
    validThrough,
    hiringOrganization: {
      '@type': 'Organization',
      name:    company,
      sameAs:  baseUrl,
      url:     baseUrl,
      logo:    `${baseUrl}/favicon.svg`,
    },
    // ── Employment type ───────────────────────────────────────────────────
    employmentType: normalizeEmploymentType(job.jobType),
    // ── Location ─────────────────────────────────────────────────────────
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type':         'PostalAddress',
        addressLocality: remote ? 'India' : (job.location || 'Hyderabad'),
        addressCountry:  'IN',
      },
    },
    // ── Identifiers & apply ───────────────────────────────────────────────
    identifier: { '@type': 'PropertyValue', name: 'TalentNest HR', value: String(job._id) },
    url:         applyUrl,
    directApply: true,
    applicantLocationRequirements: { '@type': 'Country', name: 'India' },
  };

  // Remote label — triggers Google's "Remote" filter tag
  if (remote) data.jobLocationType = 'TELECOMMUTE';

  // Openings count
  if (job.numberOfOpenings && job.numberOfOpenings > 1) {
    data.totalJobOpenings = job.numberOfOpenings;
  }

  // Experience
  if (job.experience) data.experienceRequirements = job.experience;

  // Skills
  if (Array.isArray(job.skills) && job.skills.length) {
    data.skills = job.skills.join(', ');
  }

  // Salary — only when actual values provided
  if (job.salaryMin || job.salaryMax) {
    const unitMap = { monthly: 'MONTH', annual: 'YEAR', CTC: 'YEAR' };
    data.baseSalary = {
      '@type':  'MonetaryAmount',
      currency: job.salaryCurrency || 'INR',
      value: {
        '@type':    'QuantitativeValue',
        unitText:   unitMap[job.salaryType] || 'YEAR',
        ...(job.salaryMin ? { minValue: job.salaryMin } : {}),
        ...(job.salaryMax ? { maxValue: job.salaryMax } : {}),
      },
    };
  }

  // Application contact
  if (job.contactEmail || job.contactPhone) {
    data.applicationContact = {
      '@type':     'ContactPoint',
      contactType: 'Human Resources',
      ...(job.contactEmail ? { email:     job.contactEmail }   : {}),
      ...(job.contactPhone ? { telephone: job.contactPhone }   : {}),
    };
  }

  // Department
  if (job.department) data.occupationalCategory = job.department;

  return data;
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

app.get('/jobs.xml', (req, res, next) => {
  res.redirect(301, '/careers/jobs.xml');
});

app.get('/careers/jobs.json', async (req, res, next) => {
  try {
    const base = publicBaseUrl(req);
    const jobs = await publicJobs(5000);
    res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      total: jobs.length,
      jobs: jobs.map(job => ({
        id: String(job._id),
        title: job.title,
        company: job.companyName || job.company || 'TalentNest HR',
        location: job.location || 'India',
        employmentType: job.jobType || 'Full-Time',
        experience: job.experience || '',
        salaryMin: job.salaryMin || null,
        salaryMax: job.salaryMax || null,
        salaryCurrency: job.salaryCurrency || 'INR',
        skills: Array.isArray(job.skills) ? job.skills : [],
        description: job.description || '',
        contactEmail: job.contactEmail || '',
        contactPhone: job.contactPhone || '',
        applyUrl: `${base}/careers/job/${jobSlug(job)}`,
        datePosted: job.createdAt || null,
        updatedAt: job.updatedAt || null,
      })),
    });
  } catch (err) { next(err); }
});

// ── robots.txt ──────────────────────────────────────────────────────────────
app.get('/robots.txt', (req, res) => {
  const base = publicBaseUrl(req);
  res.type('text/plain').send([
    'User-agent: *',
    'Allow: /',
    'Allow: /careers',
    'Allow: /careers/',
    'Allow: /careers/job/',
    'Allow: /careers/jobs.xml',
    'Allow: /careers/jobs.json',
    'Allow: /careers/crawl',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    `Sitemap: ${base}/careers/jobs.xml`,
  ].join('\n'));
});

// ── Sitemap index (points to both sitemaps) ─────────────────────────────────
app.get('/sitemap.xml', (req, res) => {
  const base = publicBaseUrl(req);
  const now  = new Date().toISOString();
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    `<sitemap><loc>${escHtml(base)}/careers/jobs.xml</loc><lastmod>${now}</lastmod></sitemap>` +
    `</sitemapindex>`
  );
});

// ── SSR Job detail page — fully Google Jobs compliant ───────────────────────
app.get('/careers/job/:slug', async (req, res, next) => {
  try {
    const Job = require('./src/models/Job');
    const clauses = [{ careerPageSlug: req.params.slug }];
    if (/^[a-f\d]{24}$/i.test(req.params.slug)) clauses.push({ _id: req.params.slug });
    const job = await Job.findOne({ status: 'active', deletedAt: null, $or: clauses }).lean();
    if (!job) return next(new AppError('Job not found', 404));

    const base       = publicBaseUrl(req);
    const company    = job.companyName || job.company || 'TalentNest HR';
    const skills     = Array.isArray(job.skills) ? job.skills : [];
    const niceSkills = Array.isArray(job.niceToHaveSkills) ? job.niceToHaveSkills : [];
    const canonUrl   = `${base}/careers/job/${escHtml(jobSlug(job))}`;
    const applyUrl   = `${base}/careers?job=${job._id}`;
    const remote     = isRemoteJob(job.location);
    const empType    = normalizeEmploymentType(job.jobType);
    const empLabel   = { FULL_TIME: 'Full-time', PART_TIME: 'Part-time', CONTRACTOR: 'Contract', INTERN: 'Internship', TEMPORARY: 'Temporary' }[empType] || job.jobType || 'Full-time';
    const locationLabel = remote ? `${job.location} (Remote)` : (job.location || 'India');
    const metaDesc   = `${empLabel} ${job.title} role at ${company} in ${locationLabel}. ${job.experience ? `${job.experience} experience required. ` : ''}Apply on TalentNest HR.`;
    const structured = JSON.stringify(jobStructuredData(job, base)).replace(/</g, '\\u003c');
    const postedDate = job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Recently';

    res.type('html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escHtml(job.title)} — ${escHtml(empLabel)} at ${escHtml(company)} | TalentNest HR</title>
  <meta name="description" content="${escHtml(metaDesc)}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${canonUrl}">
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonUrl}">
  <meta property="og:title" content="${escHtml(job.title)} at ${escHtml(company)}">
  <meta property="og:description" content="${escHtml(metaDesc)}">
  <meta property="og:image" content="${escHtml(base)}/og-image.png">
  <meta property="og:site_name" content="TalentNest HR">
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escHtml(job.title)} at ${escHtml(company)}">
  <meta name="twitter:description" content="${escHtml(metaDesc)}">
  <meta name="twitter:image" content="${escHtml(base)}/og-image.png">
  <!-- Schema.org JobPosting JSON-LD -->
  <script type="application/ld+json">${structured}</script>
  <!-- Breadcrumb JSON-LD -->
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',    item: base },
      { '@type': 'ListItem', position: 2, name: 'Careers', item: `${base}/careers` },
      { '@type': 'ListItem', position: 3, name: job.title, item: `${base}/careers/job/${jobSlug(job)}` },
    ],
  }).replace(/</g, '\\u003c')}</script>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#0f172a;line-height:1.6}
    .wrap{max-width:900px;margin:0 auto;padding:32px 20px}
    nav.breadcrumb{font-size:13px;color:#64748b;margin-bottom:24px}
    nav.breadcrumb a{color:#0176d3;text-decoration:none}
    nav.breadcrumb a:hover{text-decoration:underline}
    nav.breadcrumb span{margin:0 6px}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:36px;box-shadow:0 4px 24px rgba(15,23,42,.07)}
    .brand{display:inline-flex;align-items:center;gap:8px;background:#eff6ff;color:#0176d3;font-size:13px;font-weight:700;padding:5px 12px;border-radius:50px;margin-bottom:18px;text-decoration:none}
    h1{font-size:clamp(1.4rem,3vw,2rem);font-weight:800;color:#0a1628;margin-bottom:10px}
    .meta{display:flex;flex-wrap:wrap;gap:14px;font-size:14px;color:#475569;margin:14px 0 24px;padding-bottom:20px;border-bottom:1px solid #f1f5f9}
    .meta strong{color:#0f172a}
    h2{font-size:1.05rem;font-weight:700;color:#0a1628;margin:24px 0 10px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}
    h3{font-size:.95rem;font-weight:700;color:#334155;margin:16px 0 8px}
    p{color:#475569;font-size:.9rem;line-height:1.75;margin-bottom:12px}
    pre{white-space:pre-wrap;font-family:inherit;font-size:.9rem;color:#475569;line-height:1.75}
    ul.skills{list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 16px}
    ul.skills li{background:#eff6ff;color:#075985;border:1px solid #bfdbfe;border-radius:50px;padding:4px 14px;font-size:13px;font-weight:600}
    ul.nice li{background:#f0fdf4;color:#166534;border-color:#bbf7d0}
    .salary{background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:10px 16px;font-size:.88rem;color:#78350f;margin-bottom:20px}
    .apply-box{margin-top:32px;padding-top:24px;border-top:2px solid #e2e8f0;text-align:center}
    .apply-btn{display:inline-block;background:linear-gradient(135deg,#0176d3,#014486);color:#fff;text-decoration:none;border-radius:10px;padding:14px 36px;font-weight:800;font-size:1rem;box-shadow:0 4px 18px rgba(1,118,211,.35);transition:opacity .2s}
    .apply-btn:hover{opacity:.9}
    .secondary-link{display:block;margin-top:12px;color:#64748b;font-size:13px}
    .secondary-link a{color:#0176d3}
    footer{text-align:center;padding:32px 20px;color:#94a3b8;font-size:13px}
    footer a{color:#0176d3;text-decoration:none}
    @media(max-width:600px){.card{padding:22px 16px}}
  </style>
</head>
<body>
  <main class="wrap">
    <!-- Breadcrumb navigation — crawlable by Googlebot -->
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="${escHtml(base)}">Home</a>
      <span aria-hidden="true">›</span>
      <a href="${escHtml(base)}/careers">Careers</a>
      <span aria-hidden="true">›</span>
      <span aria-current="page">${escHtml(job.title)}</span>
    </nav>

    <article class="card" itemscope itemtype="https://schema.org/JobPosting">
      <a class="brand" href="${escHtml(base)}/careers">← TalentNest HR Careers</a>

      <!-- H1: Job Title (one per page — Google Jobs requirement) -->
      <h1 itemprop="title">${escHtml(job.title)}</h1>

      <!-- Structured meta row — crawlable text, not images -->
      <div class="meta">
        <div><strong>🏢 Company:</strong> <span itemprop="hiringOrganization" itemscope itemtype="https://schema.org/Organization"><span itemprop="name">${escHtml(company)}</span></span></div>
        <div><strong>📍 Location:</strong> <span itemprop="jobLocation" itemscope itemtype="https://schema.org/Place"><span itemprop="address">${escHtml(locationLabel)}</span></span>${remote ? ' <span style="background:#dcfce7;color:#166534;font-size:11px;padding:2px 8px;border-radius:50px;font-weight:700">REMOTE</span>' : ''}</div>
        <div><strong>💼 Type:</strong> <span itemprop="employmentType">${escHtml(empLabel)}</span></div>
        ${job.experience ? `<div><strong>🎯 Experience:</strong> <span itemprop="experienceRequirements">${escHtml(job.experience)}</span></div>` : ''}
        ${job.department ? `<div><strong>🏷 Department:</strong> <span itemprop="occupationalCategory">${escHtml(job.department)}</span></div>` : ''}
        <div><strong>📅 Posted:</strong> <time itemprop="datePosted" datetime="${job.createdAt ? new Date(job.createdAt).toISOString() : ''}">${postedDate}</time></div>
        ${job.numberOfOpenings > 1 ? `<div><strong>👥 Openings:</strong> ${job.numberOfOpenings}</div>` : ''}
      </div>

      ${(job.salaryMin || job.salaryMax) ? `
      <div class="salary" itemprop="baseSalary" itemscope itemtype="https://schema.org/MonetaryAmount">
        💰 <strong>Salary Range:</strong>
        <meta itemprop="currency" content="${escHtml(job.salaryCurrency || 'INR')}">
        ${job.salaryCurrency || 'INR'} ${job.salaryMin ? escHtml(String(job.salaryMin)) : ''}${job.salaryMin && job.salaryMax ? ' – ' : ''}${job.salaryMax ? escHtml(String(job.salaryMax)) : ''} ${escHtml(job.salaryType || 'per year')}
      </div>` : ''}

      <!-- H2: About the Role -->
      <h2>About the Role</h2>
      <div itemprop="description">
        <pre>${escHtml(job.description || '')}</pre>
      </div>

      ${job.requirements ? `
      <!-- H2: Requirements -->
      <h2>Requirements</h2>
      <pre>${escHtml(job.requirements)}</pre>` : ''}

      ${skills.length ? `
      <!-- H2: Required Skills — bulleted list for crawler categorisation -->
      <h2>Required Skills</h2>
      <ul class="skills" aria-label="Required skills">
        ${skills.map(s => `<li itemprop="skills">${escHtml(s)}</li>`).join('')}
      </ul>` : ''}

      ${niceSkills.length ? `
      <!-- H3: Nice to Have -->
      <h3>Nice to Have</h3>
      <ul class="skills nice" aria-label="Nice to have skills">
        ${niceSkills.map(s => `<li>${escHtml(s)}</li>`).join('')}
      </ul>` : ''}

      ${(job.contactEmail || job.contactPhone) ? `
      <!-- H2: How to Apply — direct email link, crawlable -->
      <h2>How to Apply</h2>
      <p>
        ${job.contactEmail ? `Send your resume to <a href="mailto:${escHtml(job.contactEmail)}">${escHtml(job.contactEmail)}</a>` : ''}
        ${job.contactPhone ? ` or call <a href="tel:${escHtml(job.contactPhone)}">${escHtml(job.contactPhone)}</a>` : ''}.
        Alternatively, use the Apply button below to submit through TalentNest HR.
      </p>` : ''}

      <!-- CTA: Direct <a href> apply button — bots can follow this link -->
      <div class="apply-box">
        <a class="apply-btn" href="${escHtml(applyUrl)}" rel="noopener">Apply Now →</a>
        <p class="secondary-link">
          Or <a href="${escHtml(base)}/careers">browse all open positions</a> at TalentNest HR
        </p>
      </div>
    </article>
  </main>

  <footer>
    <p><a href="${escHtml(base)}">TalentNest HR</a> · India's AI-Powered Staffing Platform ·
    <a href="${escHtml(base)}/careers">View All Jobs</a></p>
  </footer>
</body>
</html>`);
  } catch (err) { next(err); }
});

app.get('/careers/crawl', async (req, res, next) => {
  try {
    const base = publicBaseUrl(req);
    const jobs = await publicJobs(500);
    const ldItems = jobs.map(j => JSON.stringify(jobStructuredData(j, base)).replace(/</g, '\\u003c'));
    const items = jobs.map(job => {
      const company = job.companyName || job.company || 'TalentNest HR';
      const skills  = Array.isArray(job.skills) ? job.skills.join(', ') : '';
      return `<li itemscope itemtype="https://schema.org/JobPosting">
        <h2><a href="${escHtml(base)}/careers/job/${escHtml(jobSlug(job))}" itemprop="url">${escHtml(job.title)}</a></h2>
        <p><strong itemprop="hiringOrganization">${escHtml(company)}</strong> · <span itemprop="jobLocation">${escHtml(job.location || 'India')}</span> · ${escHtml(job.experience || '')}</p>
        <p itemprop="description">${escHtml((job.description || '').slice(0, 300))}…</p>
        ${skills ? `<p><strong>Skills:</strong> <span itemprop="skills">${escHtml(skills)}</span></p>` : ''}
      </li>`;
    }).join('');
    res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>TalentNest HR — All Open Jobs</title>
<meta name="description" content="Browse all open jobs at TalentNest HR. IT, cybersecurity, finance and executive roles across India.">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${escHtml(base)}/careers/crawl">
${ldItems.map(ld => `<script type="application/ld+json">${ld}</script>`).join('\n')}
</head><body><main>
<h1>TalentNest HR — Open Jobs (${jobs.length})</h1>
<ul>${items}</ul>
<p><a href="${escHtml(base)}/careers">View Interactive Job Board</a></p>
</main></body></html>`);
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

  // SSR routes that must NOT fall through to the React bundle
  const SSR_PREFIXES = ['/careers/job/', '/careers/crawl', '/careers/jobs.xml', '/careers/jobs.json', '/robots.txt', '/sitemap.xml'];

  // SPA fallback: all non-API, non-SSR routes serve the frontend when a bundle is present.
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    if (SSR_PREFIXES.some(p => req.originalUrl.startsWith(p))) return next();
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
  .then(() => {
    // Only run demo seed if explicitly enabled OR NOT in production/Render
    const skipDemo = process.env.SKIP_DEMO_SEED === 'true' || IS_PROD || !!process.env.RENDER;
    if (!skipDemo) {
      return seedDemo();
    } else {
      console.log('ℹ️   Skipping demo seed (Production/Render environment)');
    }
  })
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
