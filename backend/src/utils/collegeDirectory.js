'use strict';
const Tenant = require('../models/Tenant');
const Candidate = require('../models/Candidate');
const { normalizeCollegeKey } = require('./collegeNames');

/**
 * Resolves a user-typed college/school name to its canonical form so that
 * "SelfCrops", "selfcrops ", " SELFCROPS " and even "VNR VJIET." vs "VNR
 * VJIET" all collapse into a single directory entry / college group. If a
 * registered College/Campus tenant or a previously entered Candidate.college
 * value normalizes to the same key (via normalizeCollegeKey — the same
 * punctuation/case-insensitive key used by /college-groups and
 * /college-directory), that existing canonical name is reused so the
 * candidate joins that same college community; otherwise the trimmed input
 * is returned as-is and becomes a brand-new directory entry / college group.
 */
async function resolveCollegeName(rawName, session = null) {
  const cleaned = String(rawName || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  const key = normalizeCollegeKey(cleaned);
  if (!key) return cleaned;

  const tenantQuery = Tenant.find({ type: 'college', deletedAt: null }).select('name');
  const candidateQuery = Candidate.find({ college: { $exists: true, $ne: '' } }).select('college');
  if (session) { tenantQuery.session(session); candidateQuery.session(session); }

  const [tenants, candidates] = await Promise.all([
    tenantQuery.lean(),
    candidateQuery.lean(),
  ]);

  for (const t of tenants || []) {
    const name = t.name && t.name.trim().replace(/\s+/g, ' ');
    if (name && normalizeCollegeKey(name) === key) return name;
  }
  for (const c of candidates || []) {
    const name = c.college && c.college.trim().replace(/\s+/g, ' ');
    if (name && normalizeCollegeKey(name) === key) return name;
  }
  return cleaned;
}

module.exports = { resolveCollegeName };
