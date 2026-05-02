'use strict';
/**
 * Phase 2 — XML/JSON Feed Endpoints + Phase 8 — Sitemap + Robots
 * Powers Jooble, Adzuna, Careerjet, Indeed and all XML/JSON aggregators.
 * NEVER returns 500 — always returns valid XML/JSON even on DB failure.
 */
const express        = require('express');
const router         = express.Router();
const Job            = require('../models/Job');
const Organization   = require('../models/Organization');

const SITE_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';

// In-memory feed cache (15-min TTL)
let _feedCache = null;
let _feedCachedAt = 0;
const FEED_TTL = 15 * 60 * 1000;

function invalidateFeedCache() { _feedCache = null; _feedCachedAt = 0; }
module.exports.invalidateFeedCache = invalidateFeedCache;

function mapJobType(raw) {
  if (!raw) return 'fulltime';
  const s = String(raw).toLowerCase();
  if (s.includes('part')) return 'parttime';
  if (s.includes('contract') || s.includes('c2c') || s.includes('c2h')) return 'contract';
  if (s.includes('intern')) return 'internship';
  if (s.includes('freelance')) return 'contract';
  return 'fulltime';
}

function mapSchemaJobType(raw) {
  if (!raw) return 'FULL_TIME';
  const s = String(raw).toLowerCase();
  if (s.includes('part')) return 'PART_TIME';
  if (s.includes('contract') || s.includes('c2c')) return 'CONTRACTOR';
  if (s.includes('intern')) return 'INTERN';
  if (s.includes('temp')) return 'TEMPORARY';
  return 'FULL_TIME';
}

function buildJobUrl(job) {
  const slug = job.careerPageSlug || job._id?.toString();
  return `${SITE_URL}/careers/job/${slug}`;
}

function safeText(v) { return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function cdata(v)    { return `<![CDATA[${String(v || '')}]]>`; }

async function fetchActiveJobs(tenantId) {
  const filter = { status: 'active', deletedAt: null };
  if (tenantId) filter.tenantId = tenantId;
  return Job.find(filter)
    .select('title company companyName location description requirements skills salaryMin salaryMax jobType experience department careerPageSlug tenantId createdAt updatedAt')
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();
}

function buildXml(jobs) {
  const items = jobs.map(j => {
    const company = j.companyName || j.company || 'TalentNest Partner';
    const parts = (j.location || '').split(',').map(s => s.trim());
    const city  = parts[0] || '';
    const state = parts[1] || '';
    const salary = j.salaryMin ? `${j.salaryMin}${j.salaryMax ? `-${j.salaryMax}` : ''} INR` : '';
    const skills = Array.isArray(j.skills) ? j.skills.join(', ') : (j.skills || '');
    return `  <job>
    <title>${cdata(j.title)}</title>
    <date>${new Date(j.createdAt).toISOString()}</date>
    <referencenumber>${cdata(j._id)}</referencenumber>
    <url>${cdata(buildJobUrl(j))}</url>
    <company>${cdata(company)}</company>
    <city>${cdata(city)}</city>
    <state>${cdata(state)}</state>
    <country>IN</country>
    <description>${cdata((j.description || '') + (j.requirements ? '\n\nRequirements:\n' + j.requirements : ''))}</description>
    <salary>${cdata(salary)}</salary>
    <category>${cdata(j.department || '')}</category>
    <jobtype>${mapJobType(j.jobType)}</jobtype>
    <experience>${cdata(j.experience || '')}</experience>
    <skills>${cdata(skills)}</skills>
  </job>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<source>\n${items}\n</source>`;
}

function buildJsonFeed(jobs) {
  return jobs.map(j => {
    const company = j.companyName || j.company || 'TalentNest Partner';
    const parts   = (j.location || '').split(',').map(s => s.trim());
    return {
      id: j._id?.toString(),
      title: j.title || '',
      company,
      city: parts[0] || '',
      state: parts[1] || '',
      country: 'IN',
      location: j.location || '',
      description: (j.description || '') + (j.requirements ? '\nRequirements:\n' + j.requirements : ''),
      url: buildJobUrl(j),
      jobType: mapJobType(j.jobType),
      salary: j.salaryMin ? { min: j.salaryMin, max: j.salaryMax || null, currency: 'INR' } : null,
      skills: Array.isArray(j.skills) ? j.skills : (j.skills ? [j.skills] : []),
      experience: j.experience || null,
      category: j.department || null,
      datePosted: new Date(j.createdAt).toISOString(),
      lastModified: new Date(j.updatedAt).toISOString(),
    };
  });
}

// ── GET /api/feed/xml — global XML (all active jobs) ──────────────────────────
router.get('/xml', async (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=900');
  try {
    if (_feedCache && (Date.now() - _feedCachedAt) < FEED_TTL) {
      return res.send(_feedCache.xml);
    }
    const jobs = await fetchActiveJobs();
    const xml  = buildXml(jobs);
    _feedCache = { xml, json: jobs }; _feedCachedAt = Date.now();
    res.send(xml);
  } catch (e) {
    console.error('[Feed XML]', e.message);
    res.send('<?xml version="1.0" encoding="UTF-8"?><source></source>');
  }
});

// ── GET /api/feed/json — global JSON feed ─────────────────────────────────────
router.get('/json', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=900');
  try {
    if (_feedCache && (Date.now() - _feedCachedAt) < FEED_TTL) {
      return res.json(buildJsonFeed(_feedCache.json));
    }
    const jobs = await fetchActiveJobs();
    _feedCache = { xml: buildXml(jobs), json: jobs }; _feedCachedAt = Date.now();
    res.json(buildJsonFeed(jobs));
  } catch (e) {
    console.error('[Feed JSON]', e.message);
    res.json([]);
  }
});

// ── GET /api/feed/employer/:tenantId/xml ─────────────────────────────────────
router.get('/employer/:tenantId/xml', async (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=900');
  try {
    const jobs = await fetchActiveJobs(req.params.tenantId);
    res.send(buildXml(jobs));
  } catch (e) {
    console.error('[Feed Employer XML]', e.message);
    res.send('<?xml version="1.0" encoding="UTF-8"?><source></source>');
  }
});

// ── GET /api/feed/employer/:tenantId/json ────────────────────────────────────
router.get('/employer/:tenantId/json', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=900');
  try {
    const jobs = await fetchActiveJobs(req.params.tenantId);
    res.json(buildJsonFeed(jobs));
  } catch (e) {
    console.error('[Feed Employer JSON]', e.message);
    res.json([]);
  }
});

// ── GET /api/feed/sitemap.xml — dynamic sitemap ───────────────────────────────
let _sitemapCache = null, _sitemapCachedAt = 0;
const SITEMAP_TTL = 60 * 60 * 1000; // 1 hour

router.get('/sitemap.xml', async (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  try {
    if (_sitemapCache && (Date.now() - _sitemapCachedAt) < SITEMAP_TTL) {
      return res.send(_sitemapCache);
    }
    const jobs = await Job.find({ status: 'active', deletedAt: null }).select('careerPageSlug updatedAt createdAt _id').lean();
    const staticPages = [
      { url: SITE_URL, priority: '1.0', freq: 'daily' },
      { url: `${SITE_URL}/careers`, priority: '0.9', freq: 'daily' },
      { url: `${SITE_URL}/about`, priority: '0.6', freq: 'monthly' },
      { url: `${SITE_URL}/contact`, priority: '0.6', freq: 'monthly' },
    ];
    const urlTags = [
      ...staticPages.map(p => `  <url>\n    <loc>${safeText(p.url)}</loc>\n    <changefreq>${p.freq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`),
      ...jobs.map(j => {
        const slug = j.careerPageSlug || j._id?.toString();
        const mod  = new Date(j.updatedAt || j.createdAt).toISOString().split('T')[0];
        return `  <url>\n    <loc>${safeText(`${SITE_URL}/careers/job/${slug}`)}</loc>\n    <lastmod>${mod}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`;
      }),
    ].join('\n');
    _sitemapCache = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlTags}\n</urlset>`;
    _sitemapCachedAt = Date.now();
    res.send(_sitemapCache);
  } catch (e) {
    console.error('[Sitemap]', e.message);
    res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE_URL}</loc></url></urlset>`);
  }
});

// ── GET /api/feed/robots.txt ──────────────────────────────────────────────────
router.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Allow: /api/feed/xml
Allow: /api/feed/json
Allow: /api/feed/employer/
Allow: /careers/

Sitemap: ${SITE_URL}/api/feed/sitemap.xml
`);
});

// ── GET /api/feed/job/:id/schema — Google for Jobs JSON-LD ───────────────────
router.get('/job/:id/schema', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const job = await Job.findOne({ $or: [{ _id: req.params.id }, { careerPageSlug: req.params.id }], deletedAt: null }).lean();
    if (!job || job.status !== 'active') {
      return res.json({ active: false, schema: null });
    }
    const company = job.companyName || job.company || 'TalentNest Partner';
    const parts   = (job.location || '').split(',').map(s => s.trim());
    const schema  = {
      '@context': 'https://schema.org/',
      '@type': 'JobPosting',
      title: job.title,
      description: (job.description || '') + (job.requirements ? '\n\nRequirements:\n' + job.requirements : ''),
      datePosted: new Date(job.createdAt).toISOString(),
      employmentType: mapSchemaJobType(job.jobType),
      hiringOrganization: {
        '@type': 'Organization',
        name: company,  // ALWAYS employer name, never TalentNest
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: parts[0] || '',
          addressRegion:   parts[1] || '',
          addressCountry:  'IN',
        },
      },
      identifier: {
        '@type': 'PropertyValue',
        name: company,
        value: job._id?.toString(),
      },
      url: buildJobUrl(job),
      ...(job.skills?.length ? { skills: Array.isArray(job.skills) ? job.skills.join(', ') : job.skills } : {}),
      ...(job.experience     ? { experienceRequirements: job.experience } : {}),
      ...(job.salaryMin ? {
        baseSalary: {
          '@type': 'MonetaryAmount',
          currency: 'INR',
          value: {
            '@type': 'QuantitativeValue',
            ...(job.salaryMin ? { minValue: job.salaryMin } : {}),
            ...(job.salaryMax ? { maxValue: job.salaryMax } : {}),
            unitText: 'YEAR',
          },
        },
      } : {}),
    };
    res.json({ active: true, schema });
  } catch (e) {
    console.error('[Schema]', e.message);
    res.json({ active: false, schema: null });
  }
});

module.exports = router;
module.exports.invalidateFeedCache = invalidateFeedCache;
module.exports.buildJobUrl = buildJobUrl;
module.exports.mapSchemaJobType = mapSchemaJobType;
