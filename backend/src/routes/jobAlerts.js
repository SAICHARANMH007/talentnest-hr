'use strict';
/**
 * Job Alerts — candidates opt-in to email notifications for new matching jobs.
 * Matching runs instantly when a job goes live (jobs.js calls notifyMatchingAlerts).
 */
const express      = require('express');
const router       = express.Router();
const JobAlert     = require('../models/JobAlert');
const Job          = require('../models/Job');
const { authenticate }        = require('../middleware/auth');
const asyncHandler            = require('../utils/asyncHandler');
const AppError                = require('../utils/AppError');
const { sendEmailWithRetry }  = require('../utils/email');

// All routes require auth
router.use(authenticate);

// GET /api/job-alerts
router.get('/', asyncHandler(async (req, res) => {
  const alerts = await JobAlert.find({ userId: req.user._id || req.user.id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: alerts.map(a => ({ ...a, id: a._id.toString() })) });
}));

// POST /api/job-alerts
router.post('/', asyncHandler(async (req, res) => {
  const { keywords, location, jobType, industry, department, experienceMin, experienceMax, frequency } = req.body;
  if (!keywords?.length && !location && !jobType && !industry && !department) {
    throw new AppError('At least one filter (keywords, location, jobType, industry, or department) is required.', 400);
  }

  const count = await JobAlert.countDocuments({ userId: req.user._id || req.user.id, isActive: true });
  if (count >= 10) throw new AppError('Maximum 10 active alerts allowed.', 400);

  const alert = await JobAlert.create({
    userId       : req.user._id || req.user.id,
    email        : req.user.email,
    tenantId     : req.user.tenantId || null,
    keywords     : Array.isArray(keywords) ? keywords.map(k => k.trim().toLowerCase()).filter(Boolean) : [],
    location     : location?.trim() || '',
    jobType      : jobType?.trim() || '',
    industry     : industry?.trim() || '',
    department   : department?.trim() || '',
    experienceMin: experienceMin != null ? Number(experienceMin) : null,
    experienceMax: experienceMax != null ? Number(experienceMax) : null,
    frequency    : frequency || 'daily',
  });

  res.status(201).json({ success: true, data: { ...alert.toObject(), id: alert._id.toString() } });
}));

// PATCH /api/job-alerts/:id
router.patch('/:id', asyncHandler(async (req, res) => {
  const allowed = ['keywords', 'location', 'jobType', 'industry', 'department', 'experienceMin', 'experienceMax', 'frequency', 'isActive'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  if (update.keywords) update.keywords = update.keywords.map(k => k.trim().toLowerCase()).filter(Boolean);

  const alert = await JobAlert.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id || req.user.id },
    { $set: update },
    { new: true }
  );
  if (!alert) throw new AppError('Alert not found.', 404);
  res.json({ success: true, data: { ...alert.toObject(), id: alert._id.toString() } });
}));

// DELETE /api/job-alerts/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  await JobAlert.findOneAndDelete({ _id: req.params.id, userId: req.user._id || req.user.id });
  res.json({ success: true, message: 'Alert removed.' });
}));

/**
 * notifyMatchingAlerts — called by jobs.js after a job goes active.
 * Finds all active alerts that match the job and sends instant email notifications.
 * Fire-and-forget: errors are swallowed so they never affect the job creation response.
 */
async function notifyMatchingAlerts(job) {
  try {
    const alerts = await JobAlert.find({ isActive: true }).lean();
    const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.talentnesthr.com';
    const jobSkills    = (job.skills || []).map(s => s.toLowerCase());
    const jobExpMin    = parseExpMin(job.experience);
    const jobExpMax    = parseExpMax(job.experience);
    const jobText      = `${job.title} ${job.description || ''} ${jobSkills.join(' ')}`.toLowerCase();

    for (const alert of alerts) {
      if (!alert.email) continue;
      if (!matchesAlert(alert, job, jobSkills, jobText, jobExpMin, jobExpMax)) continue;

      const jobUrl = job.careerPageSlug
        ? `${FRONTEND_URL}/careers/job/${job.careerPageSlug}`
        : `${FRONTEND_URL}/careers`;

      const alertLabel = buildAlertLabel(alert);

      await sendEmailWithRetry(
        alert.email,
        `🔔 New job match: ${job.title}`,
        `<div style="font-family:'Plus Jakarta Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff">
          <div style="background:linear-gradient(135deg,#032D60,#0176D3);padding:32px;border-radius:12px 12px 0 0;text-align:center">
            <div style="font-size:40px;margin-bottom:8px">🔔</div>
            <h1 style="color:#fff;margin:0;font-size:20px;font-weight:800">New Job Match!</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px">Based on your alert: <strong>${alertLabel}</strong></p>
          </div>
          <div style="padding:28px 32px;background:#F8FAFC;border-radius:0 0 12px 12px">
            <div style="background:#fff;borderRadius:10px;padding:18px 22px;margin-bottom:20px;border:1px solid #E2E8F0">
              <h2 style="color:#0A1628;font-size:17px;font-weight:800;margin:0 0 6px">${job.title}</h2>
              <p style="color:#64748B;font-size:13px;margin:0 0 4px">🏢 ${job.companyName || job.company || 'Company'}</p>
              ${job.location ? `<p style="color:#64748B;font-size:13px;margin:0 0 4px">📍 ${job.location}</p>` : ''}
              ${job.jobType  ? `<p style="color:#64748B;font-size:13px;margin:0 0 4px">💼 ${job.jobType}</p>` : ''}
              ${job.experience ? `<p style="color:#64748B;font-size:13px;margin:0">⏱ ${job.experience} experience</p>` : ''}
            </div>
            <div style="text-align:center;margin-bottom:20px">
              <a href="${jobUrl}" style="display:inline-block;background:linear-gradient(135deg,#0176D3,#014486);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:800;font-size:15px">
                View &amp; Apply →
              </a>
            </div>
            <p style="color:#94A3B8;font-size:11px;text-align:center;margin:0">
              You're receiving this because you set up a job alert on TalentNest HR.
              <a href="${FRONTEND_URL}/app/job-alerts" style="color:#0176D3">Manage alerts</a>
            </p>
          </div>
        </div>`
      ).catch(() => {});

      // Mark lastSentAt so daily/weekly digest knows this job was already sent
      await JobAlert.findByIdAndUpdate(alert._id, {
        $set: { lastSentAt: new Date() },
        $addToSet: { lastJobIds: job._id },
      }).catch(() => {});
    }
  } catch { /* never crash the caller */ }
}

function matchesAlert(alert, job, jobSkills, jobText, jobExpMin, jobExpMax) {
  // Keywords — must match at least one against title/skills/description
  if (alert.keywords?.length) {
    const matched = alert.keywords.some(k => jobText.includes(k));
    if (!matched) return false;
  }
  // Location
  if (alert.location) {
    const jLoc = (job.location || '').toLowerCase();
    const aLoc = alert.location.toLowerCase();
    const isRemote = jLoc.includes('remote') || aLoc.includes('remote');
    if (!isRemote && !jLoc.includes(aLoc) && !aLoc.includes(jLoc)) return false;
  }
  // Job type
  if (alert.jobType && job.jobType && alert.jobType.toLowerCase() !== job.jobType.toLowerCase()) return false;
  // Industry
  if (alert.industry && job.industry && alert.industry.toLowerCase() !== job.industry.toLowerCase()) return false;
  // Department
  if (alert.department && job.department && alert.department.toLowerCase() !== job.department.toLowerCase()) return false;
  // Experience range
  if (alert.experienceMin != null && jobExpMax != null && jobExpMax < alert.experienceMin) return false;
  if (alert.experienceMax != null && jobExpMin != null && jobExpMin > alert.experienceMax) return false;
  return true;
}

function parseExpMin(str) {
  if (!str) return null;
  const m = String(str).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}
function parseExpMax(str) {
  if (!str) return null;
  const m = String(str).match(/(\d+)\s*[-–to]+\s*(\d+)/);
  if (m) return parseInt(m[2], 10);
  const m2 = String(str).match(/(\d+)\+/);
  if (m2) return parseInt(m2[1], 10) + 10;
  return parseExpMin(str);
}

function buildAlertLabel(alert) {
  return [alert.keywords?.join(', '), alert.location, alert.jobType, alert.industry, alert.department]
    .filter(Boolean).join(' · ') || 'All jobs';
}

module.exports = router;
module.exports.notifyMatchingAlerts = notifyMatchingAlerts;
