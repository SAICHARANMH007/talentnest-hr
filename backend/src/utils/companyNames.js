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
// Keys are matched AFTER legal-suffix stripping & lowercasing, so e.g.
// "Cognizant Technology Solutions Pvt Ltd" -> "Cognizant Technology Solutions"
// -> "Cognizant".
const COMPANY_ALIASES = {
  // Tata Consultancy Services
  'tcs': 'Tata Consultancy Services',
  'tata consultancy services': 'Tata Consultancy Services',
  // HCL Technologies
  'hcl tech': 'HCL Technologies',
  'hcltech': 'HCL Technologies',
  'hcl technologies': 'HCL Technologies',
  'hcl': 'HCL Technologies',
  // Infosys
  'infosys': 'Infosys',
  'infosys technologies': 'Infosys',
  'infosys bpo': 'Infosys',
  // Wipro
  'wipro': 'Wipro',
  'wipro technologies': 'Wipro',
  'wipro ltd': 'Wipro',
  // Cognizant
  'cognizant': 'Cognizant',
  'cognizant technology solutions': 'Cognizant',
  'cts': 'Cognizant',
  // Accenture
  'accenture': 'Accenture',
  'accenture solutions': 'Accenture',
  'accenture services': 'Accenture',
  // IBM
  'ibm': 'IBM',
  'ibm india': 'IBM',
  'international business machines': 'IBM',
  // Capgemini
  'capgemini': 'Capgemini',
  'capgemini india': 'Capgemini',
  'capgemini technology services': 'Capgemini',
  // Tech Mahindra
  'tech mahindra': 'Tech Mahindra',
  'techm': 'Tech Mahindra',
  // Mphasis
  'mphasis': 'Mphasis',
  // Hexaware
  'hexaware': 'Hexaware Technologies',
  'hexaware technologies': 'Hexaware Technologies',
  // Mindtree / LTIMindtree
  'mindtree': 'Mindtree',
  'l&t infotech': 'LTIMindtree',
  'lti': 'LTIMindtree',
  'ltimindtree': 'LTIMindtree',
  'larsen & toubro infotech': 'LTIMindtree',
  'larsen and toubro infotech': 'LTIMindtree',
  // Persistent Systems
  'persistent': 'Persistent Systems',
  'persistent systems': 'Persistent Systems',
  // Genpact
  'genpact': 'Genpact',
  // WNS
  'wns': 'WNS Global Services',
  'wns global services': 'WNS Global Services',
  // Amazon
  'amazon': 'Amazon',
  'amazon.com': 'Amazon',
  'amazon development centre': 'Amazon',
  'amazon development center': 'Amazon',
  'amzn': 'Amazon',
  // Microsoft
  'microsoft': 'Microsoft',
  'microsoft india': 'Microsoft',
  'msft': 'Microsoft',
  // Google
  'google': 'Google',
  'google india': 'Google',
  // Meta / Facebook
  'meta': 'Meta',
  'facebook': 'Meta',
  // Apple
  'apple': 'Apple',
  'apple india': 'Apple',
  // Big 4
  'deloitte': 'Deloitte',
  'deloitte india': 'Deloitte',
  'deloitte consulting': 'Deloitte',
  'deloitte usi': 'Deloitte',
  'ey': 'EY',
  'ernst & young': 'EY',
  'ernst and young': 'EY',
  'pwc': 'PwC',
  'pricewaterhousecoopers': 'PwC',
  'kpmg': 'KPMG',
  // Consulting
  'mckinsey': 'McKinsey & Company',
  'mckinsey & company': 'McKinsey & Company',
  'mckinsey and company': 'McKinsey & Company',
  'bcg': 'Boston Consulting Group',
  'boston consulting group': 'Boston Consulting Group',
  'bain': 'Bain & Company',
  'bain & company': 'Bain & Company',
  'bain and company': 'Bain & Company',
  // Global / US banks & financial services
  'jpmorgan': 'JPMorgan Chase',
  'jp morgan': 'JPMorgan Chase',
  'jpmorgan chase': 'JPMorgan Chase',
  'j.p. morgan': 'JPMorgan Chase',
  'goldman sachs': 'Goldman Sachs',
  'goldman sachs group': 'Goldman Sachs',
  'morgan stanley': 'Morgan Stanley',
  'citi': 'Citigroup',
  'citibank': 'Citigroup',
  'citigroup': 'Citigroup',
  'wells fargo': 'Wells Fargo',
  'bank of america': 'Bank of America',
  'bofa': 'Bank of America',
  'baml': 'Bank of America',
  'barclays': 'Barclays',
  'hsbc': 'HSBC',
  'standard chartered': 'Standard Chartered',
  'standard chartered bank': 'Standard Chartered',
  'deutsche bank': 'Deutsche Bank',
  'ubs': 'UBS',
  'credit suisse': 'Credit Suisse',
  'american express': 'American Express',
  'amex': 'American Express',
  'visa': 'Visa',
  'mastercard': 'Mastercard',
  'paypal': 'PayPal',
  // Indian banks
  'hdfc bank': 'HDFC Bank',
  'hdfc': 'HDFC Bank',
  'icici bank': 'ICICI Bank',
  'icici': 'ICICI Bank',
  'axis bank': 'Axis Bank',
  'state bank of india': 'State Bank of India',
  'sbi': 'State Bank of India',
  'kotak mahindra bank': 'Kotak Mahindra Bank',
  'kotak': 'Kotak Mahindra Bank',
  'yes bank': 'Yes Bank',
  'indusind bank': 'IndusInd Bank',
  'bank of baroda': 'Bank of Baroda',
  'punjab national bank': 'Punjab National Bank',
  'pnb': 'Punjab National Bank',
  // Indian IT services & product companies
  'sonata software': 'Sonata Software',
  'birlasoft': 'Birlasoft',
  'coforge': 'Coforge',
  'niit technologies': 'Coforge',
  'zensar': 'Zensar Technologies',
  'zensar technologies': 'Zensar Technologies',
  'l&t technology services': 'L&T Technology Services',
  'ltts': 'L&T Technology Services',
  'virtusa': 'Virtusa',
  'globant': 'Globant',
  'epam': 'EPAM Systems',
  'epam systems': 'EPAM Systems',
  'cyient': 'Cyient',
  'mastek': 'Mastek',
  'happiest minds': 'Happiest Minds',
  'happiest minds technologies': 'Happiest Minds',
  'quess corp': 'Quess Corp',
  'zoho': 'Zoho',
  'zoho corporation': 'Zoho',
  'freshworks': 'Freshworks',
  'freshdesk': 'Freshworks',
  // Staffing
  'randstad': 'Randstad',
  'manpowergroup': 'ManpowerGroup',
  'manpower': 'ManpowerGroup',
  'adecco': 'Adecco',
  'teamlease': 'TeamLease',
  // Indian e-commerce / startups
  'flipkart': 'Flipkart',
  'flipkart internet': 'Flipkart',
  'paytm': 'Paytm',
  'one97 communications': 'Paytm',
  'ola': 'Ola',
  'ani technologies': 'Ola',
  'ola cabs': 'Ola',
  'swiggy': 'Swiggy',
  'bundl technologies': 'Swiggy',
  'zomato': 'Zomato',
  'eternal': 'Zomato',
  'phonepe': 'PhonePe',
  'byjus': "BYJU'S",
  "byju's": "BYJU'S",
  'think and learn': "BYJU'S",
  // Telecom
  'airtel': 'Bharti Airtel',
  'bharti airtel': 'Bharti Airtel',
  'vodafone idea': 'Vodafone Idea',
  'vi': 'Vodafone Idea',
  'reliance jio': 'Reliance Jio',
  'jio': 'Reliance Jio',
  'jio platforms': 'Reliance Jio',
  'bsnl': 'BSNL',
  // Automotive / manufacturing / conglomerates
  'tata motors': 'Tata Motors',
  'mahindra & mahindra': 'Mahindra & Mahindra',
  'mahindra and mahindra': 'Mahindra & Mahindra',
  'maruti suzuki': 'Maruti Suzuki',
  'bosch': 'Bosch',
  'robert bosch': 'Bosch',
  'tata steel': 'Tata Steel',
  'l&t': 'Larsen & Toubro',
  'larsen & toubro': 'Larsen & Toubro',
  'larsen and toubro': 'Larsen & Toubro',
  // Pharma
  'sun pharma': 'Sun Pharmaceutical',
  'sun pharmaceutical': 'Sun Pharmaceutical',
  "dr reddy's": "Dr. Reddy's Laboratories",
  "dr. reddy's": "Dr. Reddy's Laboratories",
  "dr reddys": "Dr. Reddy's Laboratories",
  "dr reddy's laboratories": "Dr. Reddy's Laboratories",
  'cipla': 'Cipla',
  'biocon': 'Biocon',
  'gsk': 'GSK',
  'glaxosmithkline': 'GSK',
  // FMCG / retail
  'hindustan unilever': 'Hindustan Unilever',
  'hul': 'Hindustan Unilever',
  'itc': 'ITC',
  'nestle': 'Nestle',
  'nestle india': 'Nestle',
  'p&g': 'Procter & Gamble',
  'procter & gamble': 'Procter & Gamble',
  'procter and gamble': 'Procter & Gamble',
  // Energy
  'reliance industries': 'Reliance Industries',
  'ril': 'Reliance Industries',
  'ongc': 'ONGC',
  'indian oil': 'Indian Oil Corporation',
  'iocl': 'Indian Oil Corporation',
  'ntpc': 'NTPC',
  // Other global tech / hardware
  'sap': 'SAP',
  'salesforce': 'Salesforce',
  'adobe': 'Adobe',
  'dell': 'Dell Technologies',
  'dell emc': 'Dell Technologies',
  'dell technologies': 'Dell Technologies',
  'hp': 'HP',
  'hewlett packard': 'HP',
  'hpe': 'Hewlett Packard Enterprise',
  'hewlett packard enterprise': 'Hewlett Packard Enterprise',
  'cisco': 'Cisco',
  'cisco systems': 'Cisco',
  'intel': 'Intel',
  'nvidia': 'NVIDIA',
  'samsung': 'Samsung',
  'samsung india': 'Samsung',
  'samsung electronics': 'Samsung',
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

  // Many MNCs are entered as "<Company> India" / "<Company> (India)" — strip
  // the trailing region qualifier and re-check aliases, so e.g. "Cognizant
  // Technology Solutions India Pvt Ltd" still collapses to "Cognizant".
  const withoutIndia = name.replace(/[\s,\-]+\(?india\)?$/i, '').trim();
  if (withoutIndia && withoutIndia.length >= 2) {
    const indiaKey = withoutIndia.toLowerCase();
    if (COMPANY_ALIASES[indiaKey]) return COMPANY_ALIASES[indiaKey];
  }

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
    if (canonical.toLowerCase() === key) {
      variants.add(alias);
      LEGAL_SUFFIXES.forEach(suffix => variants.add(alias + suffix));
    }
  });

  return [...variants];
}

module.exports = { normalizeCompanyName, companyNameVariants, COMPANY_NAME_BLOCKLIST };
