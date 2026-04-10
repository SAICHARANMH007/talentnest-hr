'use strict';

/**
 * Advanced Indian Resume Parser
 * Supports PDF, DOCX, and TXT formats.
 * Returns { fields, confidence } where confidence values are 0-100.
 */

const pdfParse = require('pdf-parse');
const mammoth  = require('mammoth');

// ── Section boundary regex (used in findSection) ─────────────────────────────
const ALL_HEADERS = [
  'education','academic','qualifications','experience','employment','work history',
  'professional experience','skills?','technical skills?','core competencies',
  'key skills','technologies','tools','expertise','proficiencies',
  'summary','objective','profile','about','projects?','certifications?',
  'awards?','achievements?','hobbies?','interests?','references?',
  'languages?','contact','personal','career','overview',
  'current ctc','expected ctc','compensation','salary','notice period',
  'linkedin','github','portfolio','social',
];
const ALL_HEADERS_RX = ALL_HEADERS.join('|');

function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

/**
 * Find the text content of a named section in the resume.
 * Returns the raw string content, or null if section not found.
 */
function findSection(text, headers) {
  const escaped = headers.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const rx = new RegExp(
    `(?:^|\\n)[ \\t]*(?:${escaped})[ \\t]*[:\\-–—]?[ \\t]*\\n([\\s\\S]{1,2000}?)(?=\\n[ \\t]*(?:${ALL_HEADERS_RX})[ \\t]*[:\\-–—]?[ \\t]*(?:\\n|$)|$)`,
    'im'
  );
  const m = text.match(rx);
  return m ? m[1] : null;
}

// ── Text Extraction ───────────────────────────────────────────────────────────

async function extractText(fileBuffer, mimeType) {
  if (mimeType === 'application/pdf') {
    const data = await pdfParse(fileBuffer);
    return data.text || '';
  }
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value || '';
  }
  if (mimeType === 'text/plain') {
    return fileBuffer.toString('utf8');
  }
  throw new Error(`Unsupported MIME type: ${mimeType}`);
}

// ── Field Extractors ──────────────────────────────────────────────────────────

function extractName(lines) {
  const rejectRx = /[@\+\d]|http|linkedin|github|Ltd|Pvt|Inc|LLC|Corp|Resume|CV|Portfolio|Curriculum/i;
  const titleWords = /\b(engineer|developer|manager|analyst|consultant|architect|lead|director|designer|intern|associate|senior|junior|head|officer|specialist|recruiter|scientist|executive)\b/i;

  for (const raw of lines.slice(0, 12)) {
    const l = clean(raw);
    if (!l || l.length < 3 || l.length > 50) continue;
    if (rejectRx.test(l)) continue;
    if (titleWords.test(l)) continue;

    const words = l.split(/\s+/);
    if (words.length < 2 || words.length > 5) continue;

    // All words should start with capital letter, no digits
    const allCapitalized = words.every(w => /^[A-Z][a-zA-Z'-]*$/.test(w));
    if (allCapitalized) {
      return { value: l, confidence: 85 };
    }
    // Partial match — still might be a name
    const mostlyAlpha = words.every(w => /^[A-Za-z'-]+$/.test(w));
    if (mostlyAlpha && words.length >= 2) {
      return { value: l, confidence: 50 };
    }
  }
  return { value: '', confidence: 0 };
}

function extractEmail(text) {
  const matches = [...text.matchAll(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g)];
  if (!matches.length) return { value: '', confidence: 0 };
  // Prefer email with non-numeric local part
  const best = matches.find(m => !/^\d+@/.test(m[0])) || matches[0];
  return { value: best[0].toLowerCase(), confidence: 95 };
}

function extractPhone(text) {
  const patterns = [
    /(?:\+91|91)?[\s\-]?[6-9]\d{4}[\s\-]?\d{5}/,
    /\d{5}[\s\-]\d{5}/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const digits = m[0].replace(/\D/g, '');
      const last10 = digits.slice(-10);
      if (last10.length === 10) {
        const conf = /^[6-9]/.test(last10) ? 95 : 80;
        return { value: last10, confidence: conf };
      }
    }
  }
  return { value: '', confidence: 0 };
}

function extractCurrentCompany(text) {
  const presentRx = /\b(present|current|till date|ongoing|to date)\b/i;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const l = clean(lines[i]);
    if (!presentRx.test(l)) continue;
    // Pattern: "Company | Role | 2022 - Present" or "Company – Role – Jan 2022 to Present"
    const pipe = l.match(/^([^|–\-•]+)[|–\-]/);
    if (pipe) {
      const company = clean(pipe[1]);
      if (company.length > 1 && company.length < 80) return { value: company, confidence: 80 };
    }
    // Company might be on the previous line
    for (let back = 1; back <= 2; back++) {
      const prev = clean(lines[i - back] || '');
      if (prev && prev.length > 1 && prev.length < 80 && !/^\d+$/.test(prev)) {
        return { value: prev, confidence: 75 };
      }
    }
  }
  return { value: '', confidence: 0 };
}

function extractCurrentRole(text) {
  const roleKeywords = /\b(engineer|developer|manager|analyst|consultant|architect|lead|director|vp|vice president|head|officer|specialist|designer|intern|associate|senior|junior|principal|scientist|technician|administrator|coordinator|programmer|executive|strategist|recruiter)\b/i;
  const presentRx = /\b(present|current|till date|ongoing|to date)\b/i;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const l = clean(lines[i]);
    if (!presentRx.test(l)) continue;
    // Check this line and 1-2 lines above for role keywords
    for (let back = 0; back <= 2; back++) {
      const candidate = clean(lines[i - back] || '');
      if (roleKeywords.test(candidate) && candidate.length < 80) {
        // Extract just the role phrase
        const m = candidate.match(/([A-Za-z\s]{5,60}(?:engineer|developer|manager|analyst|consultant|architect|lead|director|vp|head|officer|specialist|designer|intern|associate|senior|junior|principal)[A-Za-z\s]{0,30})/i);
        if (m) return { value: clean(m[1]), confidence: 75 };
        return { value: candidate, confidence: 65 };
      }
    }
  }
  return { value: '', confidence: 0 };
}

function extractTotalExperience(text) {
  // Explicit statement
  const explicit = [
    { p: /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:total\s+)?(?:experience|exp|work|professional)/i, c: 90 },
    { p: /(?:total\s+)?(?:experience|exp)(?:\s+of)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/i, c: 90 },
    { p: /(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s+exp/i, c: 85 },
  ];
  for (const { p, c } of explicit) {
    const m = text.match(p);
    if (m) return { value: parseFloat(parseFloat(m[1]).toFixed(1)), confidence: c };
  }

  // Calculate from date ranges
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  let totalMonths = 0;
  const ranges = [
    ...text.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)['\s]?(\d{2,4})\s*[-–—to]+\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)['\s]?(\d{2,4})\b/gi),
    ...text.matchAll(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)['\s]?(\d{2,4})\s*[-–—to]+\s*(present|current|today)\b/gi),
    ...text.matchAll(/\b((?:19|20)\d{2})\s*[-–—to]+\s*((?:19|20)\d{2}|present|current)\b/gi),
  ];

  const monthMap = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

  const intervals = [];
  for (const m of ranges) {
    try {
      let startYear, startMonth, endYear, endMonth;
      if (/^\d{4}$/.test(m[1])) {
        startYear = parseInt(m[1]); startMonth = 1;
        endYear   = /present|current/i.test(m[2]) ? currentYear : parseInt(m[2]);
        endMonth  = /present|current/i.test(m[2]) ? currentMonth : 12;
      } else {
        startMonth = monthMap[m[1].slice(0,3).toLowerCase()] || 1;
        startYear  = parseInt(m[2]); if (startYear < 100) startYear += 2000;
        const endStr = m[3];
        if (/present|current|today/i.test(endStr)) { endYear = currentYear; endMonth = currentMonth; }
        else { endMonth = monthMap[endStr.slice(0,3).toLowerCase()] || 12; endYear = parseInt(m[4]); if (endYear < 100) endYear += 2000; }
      }
      if (startYear >= 1990 && startYear <= currentYear) {
        intervals.push({ startYear, startMonth, endYear, endMonth });
      }
    } catch { /* skip bad parse */ }
  }

  if (intervals.length) {
    // Sum unique months (avoid double-counting overlaps by using year-month set)
    const monthSet = new Set();
    intervals.forEach(({ startYear, startMonth, endYear, endMonth }) => {
      let y = startYear, mo = startMonth;
      while (y < endYear || (y === endYear && mo <= endMonth)) {
        monthSet.add(`${y}-${mo}`);
        mo++; if (mo > 12) { mo = 1; y++; }
        if (y > currentYear + 1) break;
      }
    });
    totalMonths = monthSet.size;
    if (totalMonths > 0) {
      return { value: parseFloat((totalMonths / 12).toFixed(1)), confidence: 70 };
    }
  }

  return { value: 0, confidence: 0 };
}

const KNOWN_SKILLS = [
  'JavaScript','TypeScript','Python','Java','C++','C#','Go','Rust','PHP','Ruby','Swift','Kotlin',
  'React','Angular','Vue','Next.js','Node.js','Express','Django','Flask','Spring Boot','Laravel',
  'MongoDB','PostgreSQL','MySQL','Redis','Elasticsearch','Cassandra','DynamoDB',
  'AWS','Azure','GCP','Docker','Kubernetes','Terraform','Jenkins','GitHub Actions',
  'HTML','CSS','SASS','Tailwind','Bootstrap','Material UI',
  'Git','Jira','Confluence','Figma','Postman','VS Code',
  'Machine Learning','Deep Learning','TensorFlow','PyTorch','Pandas','NumPy',
  'React Native','Flutter','iOS','Android',
  'Salesforce','SAP','Oracle','Power BI','Tableau',
  'Selenium','Jest','Cypress','Pytest','JUnit',
  'Linux','Bash','PowerShell','REST','GraphQL','gRPC','Microservices','Kafka',
  'FastAPI','Spring','Hibernate','Struts','JSP','Servlet',
  'Vue.js','Nuxt.js','Gatsby','Remix','SvelteKit','Svelte',
  'Firebase','Supabase','PlanetScale',
  'Apache','Nginx','HAProxy',
  'Ansible','Puppet','Chef',
  'RabbitMQ','ActiveMQ','SQS','SNS',
  'OAuth','JWT','SAML','OpenID',
  'Agile','Scrum','Kanban','SAFe',
  'CI/CD','DevOps','SRE','MLOps',
  'Spark','Hadoop','Hive','Airflow','dbt',
  'OpenCV','NLTK','spaCy','Scikit-learn','XGBoost',
];

function toTitleCase(s) {
  // Preserve known casing for acronyms / proper names
  const known = KNOWN_SKILLS.find(k => k.toLowerCase() === s.toLowerCase());
  if (known) return known;
  return s.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function extractSkills(text) {
  const sectionContent = findSection(text, [
    'skills','technical skills','core competencies','key skills',
    'technologies','tools','expertise','proficiencies','competencies',
  ]);

  const rawSet = new Set();

  if (sectionContent) {
    const tokens = sectionContent
      .split(/[,\n•·▪▸|/\t\\]+/)
      .map(s => clean(s))
      .filter(s => s.length >= 2 && s.length <= 50 && /[a-zA-Z]/.test(s));
    tokens.forEach(t => rawSet.add(t.toLowerCase()));
  }

  // Scan full text for known tech terms
  const lowerText = text.toLowerCase();
  KNOWN_SKILLS.forEach(skill => {
    // Use word boundary matching for short skills to avoid false positives
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`\\b${escaped}\\b`, 'i');
    if (rx.test(lowerText)) rawSet.add(skill.toLowerCase());
  });

  if (!rawSet.size) return { value: [], confidence: 0 };

  // Deduplicate case-insensitively and title-case
  const seen = new Set();
  const result = [];
  for (const s of rawSet) {
    const key = s.toLowerCase();
    if (!seen.has(key) && result.length < 50) {
      seen.add(key);
      result.push(toTitleCase(s));
    }
  }

  const conf = sectionContent ? 85 : 60;
  return { value: result, confidence: conf };
}

function extractEducation(text) {
  const sectionContent = findSection(text, ['education','academic','qualifications','academics']);
  const src = sectionContent || text;

  const degreeRx = /\b(B\.?Tech|BE|B\.?E\.|B\.?Sc|BCA|MCA|MBA|M\.?Tech|ME|M\.?E\.|M\.?Sc|BPharm|MPharm|BDS|MBBS|B\.?Com|M\.?Com|BA|MA|LLB|LLM|PhD|Ph\.?D|B\.?Arch|BBA|B\.?Des|PGDM|PGDBM|Diploma)\b/gi;
  const yearRx   = /\b((?:19|20)\d{2})\b/g;
  const institutionRx = /\b(IIT|NIT|BITS|VIT|Manipal|Anna|Osmania|Hyderabad|Bangalore|Mumbai|Delhi|Pune|Amity|Symbiosis|IIIT|ISB|XLRI|IIM|SRM|Vellore|Saveetha|Andhra|Jawaharlal|JNTU|Calicut|Kerala|Madras|Bombay|Calcutta|University|Institute|College|School)\b/gi;

  const entries = [];
  const lines = src.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const l = clean(lines[i]);
    const degM = l.match(degreeRx);
    if (degM) {
      const yearM = l.match(yearRx) || [];
      const instM = l.match(institutionRx) || [];
      // Look at adjacent lines for more context
      const context = [lines[i-1], lines[i], lines[i+1], lines[i+2]].filter(Boolean).map(clean).join(' ');
      const ctxYears = context.match(yearRx) || [];
      const ctxInst  = context.match(institutionRx) || [];
      entries.push({
        degree:      degM[0],
        institution: ctxInst[0] || instM[0] || '',
        year:        ctxYears[ctxYears.length - 1] || yearM[0] || '',
      });
    }
    i++;
  }

  if (!entries.length) return { value: [], confidence: 0 };
  return { value: entries.slice(0, 5), confidence: 80 };
}

function parseCTCToRupees(str) {
  if (!str) return null;
  const s = str.replace(/,/g, '').replace(/₹|INR|Rs\.?\s*/gi, '').trim();
  // e.g. "12 LPA", "12L", "12 Lakhs", "12.5 lakh"
  const lakhM = s.match(/^([\d.]+)\s*(?:L(?:PA)?|Lakh?s?)/i);
  if (lakhM) return Math.round(parseFloat(lakhM[1]) * 100000);
  // e.g. "1200000"
  const numM = s.match(/^([\d.]+)$/);
  if (numM) {
    const n = parseFloat(numM[1]);
    return n > 10000 ? Math.round(n) : Math.round(n * 100000); // small number = lakhs
  }
  return null;
}

function extractCTC(text, type = 'current') {
  const keywords = type === 'current'
    ? ['current ctc', 'ctc', 'current salary', 'present ctc', 'current package']
    : ['expected ctc', 'desired ctc', 'expected salary', 'desired salary', 'expected package'];

  for (const kw of keywords) {
    const rx = new RegExp(`${kw.replace(/\s+/g,'\\s+')}\\s*[:\\-]?\\s*([\\d.,₹A-Za-z\\s]+?)(?:\\n|$|,(?!\\d))`, 'i');
    const m = text.match(rx);
    if (m) {
      const val = parseCTCToRupees(m[1]);
      if (val) return { value: val, confidence: 80 };
    }
  }
  return { value: null, confidence: 0 };
}

function extractNoticePeriod(text) {
  const patterns = [
    { p: /\b(?:immediate|immediately\s+available|immediate\s+joiner|0\s*days?)\b/i, v: 0, c: 90 },
    { p: /\b15\s*days?\b/i, v: 15, c: 90 },
    { p: /\b(?:1\s*month|30\s*days?|one\s*month)\b/i, v: 30, c: 90 },
    { p: /\b45\s*days?\b/i, v: 45, c: 90 },
    { p: /\b(?:2\s*months?|60\s*days?|two\s*months?)\b/i, v: 60, c: 90 },
    { p: /\b(?:3\s*months?|90\s*days?|three\s*months?)\b/i, v: 90, c: 90 },
    { p: /notice\s*period\s*[:\-]?\s*(\d+)\s*(days?|months?)/i, v: null, c: 85, calc: true },
  ];

  // Check in context of "notice period" line first
  const noticeCtx = text.match(/notice\s*period\s*[:\-]?\s*([^\n.]+)/i);
  const ctx = noticeCtx ? noticeCtx[0] : text;

  for (const { p, v, c, calc } of patterns) {
    if (p.test(ctx)) {
      if (calc) {
        const m = ctx.match(/(\d+)\s*(days?|months?)/i);
        if (m) {
          const n = parseInt(m[1]);
          const days = /month/i.test(m[2]) ? n * 30 : n;
          return { value: days, confidence: c };
        }
      }
      return { value: v, confidence: c };
    }
  }
  return { value: null, confidence: 0 };
}

function extractLocation(text) {
  const cities = [
    'Hyderabad','Bangalore','Bengaluru','Mumbai','Delhi','New Delhi','Chennai','Pune',
    'Kolkata','Ahmedabad','Noida','Gurgaon','Gurugram','Chandigarh','Jaipur','Lucknow',
    'Kochi','Coimbatore','Nagpur','Indore','Bhopal','Vadodara','Surat','Visakhapatnam',
    'Vizag','Thiruvananthapuram','Trivandrum','Mysore','Mysuru','Vijayawada','Patna',
    'Thane','Navi Mumbai','Greater Noida','Faridabad','Ghaziabad','Agra','Kanpur',
    'Ranchi','Bhubaneswar','Raipur','Dehradun','Mangalore','Hubli','Belgaum',
  ];

  // Scan first 5 lines of resume
  const firstLines = text.split(/\r?\n/).slice(0, 5).join(' ');

  for (const city of cities) {
    const rx = new RegExp(`\\b${city}\\b`, 'i');
    if (rx.test(firstLines)) return { value: city, confidence: 80 };
  }

  // Scan full text
  for (const city of cities) {
    const rx = new RegExp(`\\b${city}\\b`, 'i');
    if (rx.test(text)) return { value: city, confidence: 70 };
  }

  const remoteM = text.match(/\b(Remote|Hybrid|WFH)\b/i);
  if (remoteM) return { value: remoteM[1], confidence: 80 };

  return { value: '', confidence: 0 };
}

function extractLinkedIn(text) {
  const m = text.match(/linkedin\.com\/in\/[a-zA-Z0-9\-_%]+/i);
  if (m) return { value: `https://www.${m[0]}`, confidence: 95 };
  return { value: '', confidence: 0 };
}

function extractGitHub(text) {
  const m = text.match(/github\.com\/[a-zA-Z0-9\-_]+/i);
  if (m) return { value: `https://www.${m[0]}`, confidence: 95 };
  return { value: '', confidence: 0 };
}

function extractPortfolio(text) {
  const urlRx = /https?:\/\/(?!(?:www\.)?(?:linkedin|github)\.com)[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/gi;
  const matches = [...text.matchAll(urlRx)];
  if (matches.length) return { value: matches[0][0], confidence: 70 };
  return { value: '', confidence: 0 };
}

// ── Main Entry Point ──────────────────────────────────────────────────────────

/**
 * Parse a resume buffer and extract structured fields.
 * @param {Buffer} fileBuffer
 * @param {string} mimeType - 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' | 'text/plain'
 * @returns {Promise<{ fields: object, confidence: object }>}
 */
async function parseResume(fileBuffer, mimeType) {
  const text = await extractText(fileBuffer, mimeType);
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const raw = {
    name:                 extractName(lines),
    email:                extractEmail(text),
    phone:                extractPhone(text),
    currentCompany:       extractCurrentCompany(text),
    currentRole:          extractCurrentRole(text),
    totalExperienceYears: extractTotalExperience(text),
    skills:               extractSkills(text),
    education:            extractEducation(text),
    currentCTC:           extractCTC(text, 'current'),
    expectedCTC:          extractCTC(text, 'expected'),
    noticePeriodDays:     extractNoticePeriod(text),
    location:             extractLocation(text),
    linkedinUrl:          extractLinkedIn(text),
    githubUrl:            extractGitHub(text),
    portfolioUrl:         extractPortfolio(text),
  };

  const fields = {};
  const confidence = {};

  for (const [key, { value, confidence: conf }] of Object.entries(raw)) {
    fields[key] = value;
    confidence[key] = conf; // 0-100
  }

  // Ensure skills is always an Array
  if (!Array.isArray(fields.skills)) fields.skills = [];

  return { fields, confidence };
}

module.exports = { parseResume };
