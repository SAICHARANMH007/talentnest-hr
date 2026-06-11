'use strict';

/** Builds a normalized grouping key for a College/School Name so that minor
 * spelling/punctuation/casing differences (e.g. "B.V. Raju Institute of
 * Technology" vs "BV Raju Institute of Technology", "St. Joseph's College"
 * vs "St Josephs College", "VNR VJIET" vs "VNR VJIET.") collapse onto the
 * same college group/community instead of creating duplicate entries. */
function normalizeCollegeKey(raw) {
  let s = String(raw || '').trim().toLowerCase();
  if (!s) return '';
  s = s.replace(/['’]/g, '');
  s = s.replace(/&/g, ' and ');
  s = s.replace(/[^a-z0-9]+/g, ' ').trim();
  return s;
}

module.exports = { normalizeCollegeKey };
