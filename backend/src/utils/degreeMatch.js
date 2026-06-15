'use strict';

// Maps each canonical degree/branch name (as offered in the platform's
// dropdowns — src/constants/education.js) to common alternate spellings that
// students who registered before the dropdowns existed may have typed into
// the free-text degree/specialization fields. Used by findEligibleCandidates
// to match a placement drive's eligibility criteria against legacy free-text
// education records without disturbing the stored data.
const ALIASES = {
  // Degrees
  'mba': ['master of business administration', 'masters in business administration', 'master in business administration', 'm.b.a'],
  'bba': ['bachelor of business administration', 'b.b.a'],
  'b.tech': ['bachelor of technology', 'btech'],
  'b.e.': ['bachelor of engineering', 'be'],
  'm.tech': ['master of technology', 'mtech'],
  'm.e.': ['master of engineering'],
  'b.sc': ['bachelor of science', 'bsc'],
  'm.sc': ['master of science', 'msc'],
  'b.com': ['bachelor of commerce', 'bcom'],
  'm.com': ['master of commerce', 'mcom'],
  'b.a.': ['bachelor of arts'],
  'm.a.': ['master of arts'],
  'bca': ['bachelor of computer applications'],
  'mca': ['master of computer applications'],
  'b.pharm': ['bachelor of pharmacy'],
  'm.pharm': ['master of pharmacy'],
  'b.arch': ['bachelor of architecture'],
  'm.arch': ['master of architecture'],
  'b.des': ['bachelor of design'],
  'm.des': ['master of design'],
  'bfa': ['bachelor of fine arts'],
  'mfa': ['master of fine arts'],
  'b.ed': ['bachelor of education'],
  'm.ed': ['master of education'],
  'llb': ['bachelor of laws', 'bachelor of law'],
  'llm': ['master of laws', 'master of law'],
  'mbbs': ['bachelor of medicine and bachelor of surgery', 'bachelor of medicine'],
  'bds': ['bachelor of dental surgery'],
  'bams': ['bachelor of ayurvedic medicine and surgery'],
  'bhms': ['bachelor of homeopathic medicine and surgery'],
  'b.vsc': ['bachelor of veterinary science'],
  'bpt': ['bachelor of physiotherapy'],
  'b.sc nursing': ['bachelor of science in nursing'],
  'phd': ['doctor of philosophy', 'doctorate', 'ph.d'],
  'm.phil': ['master of philosophy'],
  'bhm': ['bachelor of hotel management'],
  'mhm': ['master of hotel management', 'master in hospitality management'],
  'md': ['doctor of medicine'],
  'ms (medical)': ['master of surgery'],
  '12th / intermediate / diploma': ['intermediate', 'higher secondary', 'hsc', '12th standard'],
  '10th / ssc': ['secondary school certificate', '10th standard'],

  // Engineering branches — match the "(ABBR)" suffix used in ENGINEERING_BRANCHES
  'computer science engineering (cse)': ['computer science and engineering', 'computer science', 'cse', 'computer engineering'],
  'information technology (it)': ['information technology', 'it'],
  'electronics & communication engineering (ece)': ['electronics and communication engineering', 'electronics & communication', 'ece'],
  'electrical & electronics engineering (eee)': ['electrical and electronics engineering', 'electrical & electronics', 'eee'],
  'electrical engineering (ee)': ['electrical engineering', 'ee'],
  'mechanical engineering (me)': ['mechanical engineering', 'mech', 'me'],
  'civil engineering (ce)': ['civil engineering', 'civil', 'ce'],
};

function normalize(text) {
  return String(text || '').toLowerCase().replace(/[.\s]+/g, ' ').trim();
}

function wordsOf(text) {
  return normalize(text).split(' ').filter(Boolean);
}

// For short forms (e.g. "cse", "it", "be") require a whole-word match to
// avoid false positives like "it" matching inside "limit". Longer forms use
// substring matching so e.g. "computer science" matches "computer science
// and engineering".
function formMatches(text, form) {
  const norm = normalize(text);
  if (!norm || !form) return false;
  if (form.length <= 3) return wordsOf(text).includes(form);
  return norm.includes(form) || form.includes(norm);
}

/**
 * Returns true if a candidate's free-text degree/branch value should be
 * considered equivalent to an eligibility criterion selected from the
 * platform's master dropdowns (e.g. "MBA" vs "Master of Business
 * Administration", or "Computer Science Engineering (CSE)" vs "CSE").
 */
function textMatches(candidateText, criterionText) {
  const cand = normalize(candidateText);
  const crit = normalize(criterionText);
  if (!cand || !crit) return false;
  if (cand.includes(crit) || crit.includes(cand)) return true;

  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    const forms = [canonical, ...aliases].map(normalize);
    const critMatches = forms.some(f => formMatches(crit, f));
    const candMatches = forms.some(f => formMatches(cand, f));
    if (critMatches && candMatches) return true;
  }
  return false;
}

// Removes all whitespace from a normalized string, so spaced-out input like
// "m b a" or "M.B.A" collapses to "mba" for comparison against compact forms.
function compact(text) {
  return normalize(text).replace(/\s+/g, '');
}

/**
 * Returns true if `candidateText` (e.g. a student's name, email, degree or
 * branch) should be considered a match for a free-text search `query`,
 * case-insensitively and regardless of spacing/punctuation — e.g. searching
 * "mba", "MBA", "M.B.A" or "m b a" all match a candidate whose degree is
 * "Master of Business Administration", and "cse" matches "Computer Science".
 */
function searchMatches(candidateText, query) {
  const cand = normalize(candidateText);
  const q = normalize(query);
  if (!cand || !q) return false;
  if (cand.includes(q) || q.includes(cand)) return true;

  const candCompact = compact(candidateText);
  const qCompact = compact(query);
  if (candCompact.includes(qCompact) || qCompact.includes(candCompact)) return true;

  for (const [canonical, aliases] of Object.entries(ALIASES)) {
    const forms = [canonical, ...aliases].map(normalize);
    const formsCompact = forms.map(f => f.replace(/\s+/g, ''));
    const qMatchesGroup = forms.some(f => formMatches(q, f)) || formsCompact.includes(qCompact);
    const candMatchesGroup = forms.some(f => formMatches(cand, f)) || formsCompact.some(f => candCompact.includes(f));
    if (qMatchesGroup && candMatchesGroup) return true;
  }
  return false;
}

module.exports = { textMatches, normalize, searchMatches };
