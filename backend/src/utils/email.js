'use strict';
const logger     = require('../middleware/logger');
const nodemailer = require('nodemailer');

// ── In-process org email config cache (5 min TTL) ────────────────────────────
// Prevents a DB lookup on every single email. Safe because org email settings
// change rarely. Cache is cleared on restart (acceptable for email config).
const _orgConfigCache = new Map();
const ORG_CACHE_TTL   = 5 * 60 * 1000;

// ── In-process org customization cache (5 min TTL) ───────────────────────────
const _orgCustCache  = new Map();
const CUST_CACHE_TTL = 5 * 60 * 1000;

async function getOrgSignature(tenantId) {
  if (!tenantId) return null;
  const tid    = String(tenantId);
  const cached = _orgCustCache.get(tid);
  if (cached && Date.now() - cached.at < CUST_CACHE_TTL) return cached.sig;
  try {
    const OrgCustomizations = require('../models/OrgCustomizations');
    const cust = await OrgCustomizations.findOne({ orgId: tid }).select('emailSignature').lean();
    const sig  = cust?.emailSignature || null;
    _orgCustCache.set(tid, { sig, at: Date.now() });
    return sig;
  } catch { return null; }
}

function buildSignatureHtml(sig) {
  if (!sig) return '';
  const parts = [];
  if (sig.companyName) parts.push(`<strong>${sig.companyName}</strong>`);
  if (sig.tagline)     parts.push(`<em>${sig.tagline}</em>`);
  if (sig.supportEmail) parts.push(`<a href="mailto:${sig.supportEmail}">${sig.supportEmail}</a>`);
  if (sig.phone)       parts.push(sig.phone);
  if (sig.website)     parts.push(`<a href="${sig.website}" target="_blank">${sig.website}</a>`);
  if (sig.linkedIn)    parts.push(`<a href="${sig.linkedIn}" target="_blank">LinkedIn</a>`);
  if (!parts.length && !sig.footerNote) return '';
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"><p style="font-size:11px;color:#706E6B;margin:0">${parts.join(' · ')}${sig.footerNote ? `<br><span>${sig.footerNote}</span>` : ''}</p>`;
}

async function getOrgEmailConfig(tenantId) {
  if (!tenantId) return null;
  const tid    = String(tenantId);
  const cached = _orgConfigCache.get(tid);
  if (cached && Date.now() - cached.at < ORG_CACHE_TTL) return cached.cfg;
  try {
    // Lazy-require avoids circular dependency issues at module load time
    const Organization = require('../models/Organization');
    const org = await Organization.findById(tid).select('name settings').lean();
    const es  = org?.settings?.emailSettings;
    // Only treat as configured if the org actually set an API key or SMTP credentials
    const hasKey = es?.apiKey && es.apiKey.trim().length > 8;
    const cfg = hasKey ? { ...es, orgName: org.name } : null;
    _orgConfigCache.set(tid, { cfg, at: Date.now() });
    return cfg;
  } catch { return null; }
}

// Clear a single org's cache entry (call after saving email settings)
function clearOrgEmailCache(tenantId) {
  if (tenantId) _orgConfigCache.delete(String(tenantId));
}

// ── Core send via Resend ──────────────────────────────────────────────────────
async function sendViaResend(to, subject, html, attachments, orgConfig) {
  const apiKey    = orgConfig?.apiKey   || process.env.RESEND_API_KEY;
  const fromEmail = orgConfig?.fromEmail || process.env.RESEND_FROM || 'hr@talentnesthr.com';
  const fromName  = orgConfig?.fromName  || orgConfig?.orgName || 'TalentNest HR';

  if (!apiKey) {
    console.log(`[Email DEV] To: ${to} | Subject: ${subject}`);
    return { id: 'dev-mode' };
  }

  const body = {
    from   : `${fromName} <${fromEmail}>`,
    to     : Array.isArray(to) ? to : [to],
    subject,
    html,
  };
  if (attachments && attachments.length) body.attachments = attachments;

  const r = await fetch('https://api.resend.com/emails', {
    method : 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body   : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || JSON.stringify(d));
  return { id: d.id };
}

// ── Core send via SMTP (nodemailer) ───────────────────────────────────────────
async function sendViaSmtp(to, subject, html, attachments, orgConfig) {
  if (!orgConfig?.smtpHost || !orgConfig?.fromEmail || !orgConfig?.apiKey) {
    throw new Error('SMTP config incomplete — smtpHost, fromEmail, and API Key / App Password are required.');
  }
  const fromName = orgConfig.fromName || orgConfig.orgName || 'TalentNest HR';
  const transporter = nodemailer.createTransport({
    host  : orgConfig.smtpHost,
    port  : parseInt(orgConfig.smtpPort || '587', 10),
    secure: parseInt(orgConfig.smtpPort, 10) === 465,
    auth  : { user: orgConfig.fromEmail, pass: orgConfig.apiKey },
    tls   : { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout  : 8000,
    socketTimeout    : 10000,
  });

  const mailOptions = {
    from   : `"${fromName}" <${orgConfig.fromEmail}>`,
    to     : Array.isArray(to) ? to.join(',') : to,
    subject,
    html,
  };
  if (attachments && attachments.length) {
    mailOptions.attachments = attachments.map(a => ({
      filename: a.filename,
      content : Buffer.from(a.content, 'base64'),
    }));
  }
  await transporter.sendMail(mailOptions);
  return { id: `smtp-${Date.now()}` };
}

// ── Unified dispatcher — picks Resend or SMTP based on org config ─────────────
async function sendWithConfig(to, subject, html, attachments, orgConfig) {
  const provider = orgConfig?.provider || 'resend';
  if (orgConfig && provider !== 'resend' && orgConfig.smtpHost) {
    return sendViaSmtp(to, subject, html, attachments, orgConfig);
  }
  return sendViaResend(to, subject, html, attachments, orgConfig);
}

// ── sendEmailWithRetry — drop-in replacement, backward-compatible ─────────────
// Existing callers: sendEmailWithRetry(to, subject, html)
//                   sendEmailWithRetry(to, subject, html, maxRetries)
//                   sendEmailWithRetry(to, subject, html, attachments, maxRetries)
// New callers:      sendEmailWithRetry(to, subject, html, attachments, maxRetries, orgConfig)
const sendEmailWithRetry = async (to, subject, html, attachments, maxRetries = 3, orgConfig = null) => {
  // Legacy: (to, subject, html, maxRetries) — 4th param is number
  if (typeof attachments === 'number') { maxRetries = attachments; attachments = undefined; }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendWithConfig(to, subject, html, attachments, orgConfig);
      logger.info(`Email sent to ${to}`, { subject, attempt });
      return result;
    } catch (err) {
      logger.warn(`Email attempt ${attempt} failed: ${err.message}`, { to, subject });
      if (attempt === maxRetries) {
        logger.error(`Email delivery failed after ${maxRetries} attempts`, { to, subject, error: err.message });
        throw err;
      }
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
};

// ── sendOrgEmail — convenience wrapper that auto-fetches org email config ─────
// Use this in routes where you have tenantId and want org-branded emails.
// Falls back to platform default if the org hasn't configured their own settings.
// Also appends org email signature from OrgCustomizations.emailSignature.
const sendOrgEmail = async (to, subject, html, tenantId, attachments) => {
  const [orgConfig, orgSig] = await Promise.all([
    tenantId ? getOrgEmailConfig(tenantId) : Promise.resolve(null),
    tenantId ? getOrgSignature(tenantId)   : Promise.resolve(null),
  ]);
  const sigHtml = buildSignatureHtml(orgSig);
  const finalHtml = sigHtml ? `${html}${sigHtml}` : html;
  return sendEmailWithRetry(to, subject, finalHtml, attachments, 3, orgConfig);
};

// ── Batch send via Resend ─────────────────────────────────────────────────────
async function sendBatchViaResend(emails, orgConfig) {
  const apiKey    = orgConfig?.apiKey    || process.env.RESEND_API_KEY;
  const fromEmail = orgConfig?.fromEmail || process.env.RESEND_FROM || 'hr@talentnesthr.com';
  const fromName  = orgConfig?.fromName  || orgConfig?.orgName || 'TalentNest HR';

  if (!apiKey) {
    console.log(`[Email DEV] Batch sending ${emails.length} emails`);
    return { data: emails.map((_, i) => ({ id: `dev-mode-${i}` })) };
  }

  const body = emails.map(e => ({
    from   : `${fromName} <${fromEmail}>`,
    to     : Array.isArray(e.to) ? e.to : [e.to],
    subject: e.subject,
    html   : e.html,
    ...(e.attachments && e.attachments.length ? { attachments: e.attachments } : {}),
  }));

  const r = await fetch('https://api.resend.com/emails/batch', {
    method : 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body   : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || JSON.stringify(d));
  return d;
}

const sendBatchEmailWithRetry = async (emails, maxRetries = 3, orgConfig = null) => {
  if (!emails || !emails.length) return { data: [] };
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendBatchViaResend(emails, orgConfig);
      logger.info(`Batch email sent to ${emails.length} recipients`, { attempt });
      return result;
    } catch (err) {
      logger.warn(`Batch email attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxRetries) {
        logger.error(`Batch email delivery failed after ${maxRetries} attempts`, { error: err.message });
        throw err;
      }
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }
};

const templates = require('./emailTemplates');

module.exports = {
  sendEmailWithRetry,
  sendBatchEmailWithRetry,
  sendOrgEmail,
  getOrgEmailConfig,
  clearOrgEmailCache,
  templates,
};
