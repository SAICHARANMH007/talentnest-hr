'use strict';

// Placeholder/non-company values that sometimes end up in the free-text
// "Current Company" field — these should never become communities or
// company groups.
const COMPANY_NAME_BLOCKLIST = new Set([
  'n/a', 'na', 'none', 'nil', 'nothing', '-', '--', 'n.a', 'n.a.',
  'self', 'self employed', 'self-employed', 'freelance', 'freelancer',
  'fresher', 'unemployed', 'not applicable', 'not working', 'currently not working',
  'currently unemployed', 'no company', 'tbd', 'na.',
]);

// Strip common legal-entity suffixes so e.g. "Infosys Ltd" and "Infosys"
// land in the same group.
const LEGAL_SUFFIX_RE = /[\s,\-]+(private\s+limited|pvt\.?\s*ltd\.?|public\s+limited|limited|ltd\.?|inc\.?|llc|llp|corporation|corp\.?)\.?$/i;

// Known abbreviations/variants that should collapse onto one canonical name.
const COMPANY_ALIASES = {
  'tcs': 'Tata Consultancy Services',
  'tata consultancy services': 'Tata Consultancy Services',
  'hcl tech': 'HCL Technologies',
  'hcltech': 'HCL Technologies',
  'hcl technologies': 'HCL Technologies',
  'hcl': 'HCL Technologies',
};

/** Normalizes a free-text "Current Company" value into a canonical display
 * name for grouping (company groups, communities, autocomplete). Returns
 * null for placeholder/junk values that shouldn't be treated as a company. */
function normalizeCompanyName(raw) {
  let name = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!name) return null;

  let key = name.toLowerCase();
  if (COMPANY_NAME_BLOCKLIST.has(key)) return null;

  const stripped = name.replace(LEGAL_SUFFIX_RE, '').trim();
  if (stripped) {
    name = stripped;
    key = name.toLowerCase();
  }
  if (key.length < 2 || COMPANY_NAME_BLOCKLIST.has(key)) return null;

  if (COMPANY_ALIASES[key]) return COMPANY_ALIASES[key];
  return name;
}

// Common legal-entity suffixes appended back onto a canonical name to build
// equivalent raw variants (the inverse of LEGAL_SUFFIX_RE).
const LEGAL_SUFFIXES = [' Ltd', ' Ltd.', ' Limited', ' Pvt Ltd', ' Pvt. Ltd.', ' Private Limited', ' Inc', ' Inc.', ' LLC', ' Corp', ' Corporation'];

/** Returns every raw "Current Company" spelling that normalizes to the given
 * canonical name — the canonical name itself, common legal-suffix variants
 * (e.g. "Infosys Ltd" for "Infosys"), and any known abbreviation aliases
 * (e.g. "Tcs" / "TCS" for "Tata Consultancy Services"). Used to match users
 * for company-community auto-membership regardless of how they typed their
 * employer's name. */
function companyNameVariants(canonicalName) {
  const name = String(canonicalName || '').trim().replace(/\s+/g, ' ');
  if (!name) return [];

  const variants = new Set([name]);
  LEGAL_SUFFIXES.forEach(suffix => variants.add(name + suffix));

  const key = name.toLowerCase();
  Object.entries(COMPANY_ALIASES).forEach(([alias, canonical]) => {
    if (canonical.toLowerCase() === key) variants.add(alias);
  });

  return [...variants];
}

module.exports = { normalizeCompanyName, companyNameVariants, COMPANY_NAME_BLOCKLIST };
