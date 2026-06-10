'use strict';
const Tenant = require('../models/Tenant');
const Candidate = require('../models/Candidate');

/**
 * Resolves a user-typed college/school name to its canonical form so that
 * "SelfCrops", "selfcrops " and " SELFCROPS " all collapse into a single
 * directory entry. If a registered College/Campus tenant or a previously
 * entered Candidate.college value matches (ignoring case/whitespace), that
 * existing canonical name is reused; otherwise the trimmed input becomes a
 * new directory entry.
 */
async function resolveCollegeName(rawName, session = null) {
  const cleaned = String(rawName || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';
  const key = cleaned.toLowerCase();

  const tenantQuery = Tenant.find({ type: 'college', deletedAt: null }).select('name');
  const candidateQuery = Candidate.find({ college: { $exists: true, $ne: '' } }).select('college');
  if (session) { tenantQuery.session(session); candidateQuery.session(session); }

  const [tenants, candidates] = await Promise.all([
    tenantQuery.lean(),
    candidateQuery.lean(),
  ]);

  for (const t of tenants || []) {
    if (t.name && t.name.trim().replace(/\s+/g, ' ').toLowerCase() === key) return t.name.trim().replace(/\s+/g, ' ');
  }
  for (const c of candidates || []) {
    if (c.college && c.college.trim().replace(/\s+/g, ' ').toLowerCase() === key) return c.college.trim().replace(/\s+/g, ' ');
  }
  return cleaned;
}

module.exports = { resolveCollegeName };
