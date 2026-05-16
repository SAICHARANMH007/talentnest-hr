'use strict';
/**
 * Keyword-based job classifier.
 * Detects Industry and Department from a job title + description.
 * Uses regex rules ordered from most specific → most general.
 * Returns { industry, department } — empty string means no confident match.
 */

// ── Department rules (title is primary signal) ─────────────────────────────
const DEPT_RULES = [
  // DevOps / Infrastructure / SRE
  { re: /devops|site\s*reliability|sre\b|infrastructure\s*eng|platform\s*eng|cloud\s*eng|network\s*eng|sys\s*admin|sysadmin/i,
    dept: 'DevOps & Site Reliability' },
  // Cybersecurity
  { re: /security\s*eng|cybersec|infosec|pentest|penetration\s*test|soc\s*analyst|security\s*analyst|vulnerability/i,
    dept: 'Security' },
  // Data / Analytics / AI / ML
  { re: /data\s*(scientist|engineer|analyst|architect)|machine\s*learn|artificial\s*intel|\bai\s*eng|deep\s*learn|nlp\s*eng|mlops|bi\s*(developer|analyst)|business\s*intel|analytics\s*eng/i,
    dept: 'Data & Analytics' },
  // Software / Tech Engineering
  { re: /software\s*(engineer|developer|architect|dev)|full.?stack|frontend|front.end|backend|back.end|mobile\s*dev|android\s*dev|ios\s*dev|react\s*(dev|eng)|node\s*(dev|eng)|java\s*dev|python\s*dev|\.net\s*dev|php\s*dev|flutter\s*dev|blockchain\s*dev|embedded\s*(eng|dev)/i,
    dept: 'IT & Software Development' },
  // QA / Testing
  { re: /quality\s*assur|qa\s*(eng|analyst|lead|manager|tester)|\bqc\b|test\s*eng|sdet|automation\s*test|manual\s*test/i,
    dept: 'Quality Assurance & Testing' },
  // Product Management
  { re: /product\s*(manager|owner|lead|director|vp|head)|\bpm\b.*product|product\s*management/i,
    dept: 'Product Management' },
  // Design / UX / UI
  { re: /ux\s*(designer|researcher|lead)?|ui\s*(designer|lead)?|graphic\s*design|visual\s*design|motion\s*design|interaction\s*design|product\s*design/i,
    dept: 'Design & UX/UI' },
  // Cloud / Infrastructure (broader)
  { re: /cloud\s*(architect|admin|consul|specialist)|aws\s*(eng|architect)|azure\s*(eng|architect)|gcp\s*(eng|architect)/i,
    dept: 'Cloud & Infrastructure' },
  // Sales
  { re: /sales\s*(exec|manager|rep|director|lead|head|engineer|consult)|account\s*(exec|manager|director)|business\s*dev(elop)?|bd\s*manager|revenue|inside\s*sales/i,
    dept: 'Sales' },
  // Marketing
  { re: /market(ing)?\s*(manager|exec|analyst|director|lead|head|specialist)|brand\s*(manager|exec)|content\s*(market|strateg|writer|lead)|seo|sem\b|digital\s*market|growth\s*market|performance\s*market|social\s*media\s*manager/i,
    dept: 'Marketing & Communications' },
  // Finance / Accounting
  { re: /finance\s*(manager|analyst|controller|director|exec)|financial\s*(analyst|planner|advisor|controller)|accountant|accounting\s*manager|\bcfo\b|cpa\b|auditor|tax\s*(analyst|manager|consul)|treasury|payroll/i,
    dept: 'Finance & Accounting' },
  // HR / Talent
  { re: /human\s*resource|\bhr\b.*(manager|exec|bp|director|partner|generalist)|talent\s*(acqui|manager|partner)|recruiter|recruitment\s*(manager|exec)|hrbp|people\s*(ops|partner|lead)/i,
    dept: 'Human Resources' },
  // Customer Service / Support
  { re: /customer\s*(service|success|support|care|exp|relation)|client\s*(success|service|relation)|helpdesk|help\s*desk|service\s*desk|support\s*(eng|spec|analyst)|\bcx\b\s*(lead|manager)/i,
    dept: 'Customer Service & Support' },
  // Operations / Logistics / Supply Chain
  { re: /operations?\s*(manager|exec|lead|analyst|director)|supply\s*chain|logistics\s*(manager|coord|exec)|warehouse|dispatch\s*(manager|coord)|procurement\s*manager|fleet\s*manager/i,
    dept: 'Logistics & Operations' },
  // Legal / Compliance
  { re: /legal\s*(manager|counsel|exec|officer)|lawyer|attorney|\bcounsel\b|compliance\s*(manager|officer|analyst)|regulatory\s*(affairs|manager)|paralegal/i,
    dept: 'Legal & Compliance' },
  // R&D / Science
  { re: /research\s*(scientist|engineer|analyst|director)|r&d\s*(manager|engineer)|scientist|biolog|chemist|lab\s*(manager|director|scientist)/i,
    dept: 'Research & Development' },
  // Administration
  { re: /admin(istrat)?\s*(manager|exec|officer|assist)|executive\s*assist|office\s*manager|secretary|receptionist|front\s*desk|office\s*coord/i,
    dept: 'Administration & Office Management' },
  // Training / L&D
  { re: /training\s*(manager|exec|coord|specialist)|learning\s*(&|and)\s*dev|l&d\s*(manager|spec)|instructional\s*design|coach\s*(ing)?\s*manager|corporate\s*trainer/i,
    dept: 'Training & Learning' },
  // Strategy / Consulting
  { re: /strateg(y|ic)\s*(manager|analyst|consult)|management\s*consult|business\s*analyst|strategy\s*(lead|director|vp)|engagement\s*manager/i,
    dept: 'Strategy & Consulting' },
  // Procurement / Buying
  { re: /procurement\s*(manager|officer|analyst|exec)|buyer\b|sourcing\s*(manager|spec)|vendor\s*management/i,
    dept: 'Procurement & Supply Chain' },
  // Engineering (general, mechanical/civil/electrical catch-all)
  { re: /engineer|developer|architect/i,
    dept: 'Engineering & Technology' },
];

// ── Industry rules (uses title + description) ───────────────────────────────
const IND_RULES = [
  { re: /fintech|payment\s*gateway|digital\s*bank|neobank|insurtech|wealthtech|lending\s*platform/i,
    ind: 'FinTech' },
  { re: /edtech|e-learning|online\s*learning|lms\b|learning\s*management|mooc|ed\s*tech/i,
    ind: 'Education & EdTech' },
  { re: /healthtech|medtech|digital\s*health|health\s*tech|telemedicine|telehealth|med\s*device|medical\s*device|health\s*app/i,
    ind: 'HealthTech & MedTech' },
  { re: /hospital|clinic|nursing|pharma(ceutical)?|drug\s*company|biotech|biopharma|life\s*science/i,
    ind: 'Healthcare & Hospitals' },
  { re: /e-?commerce|marketplace|flipkart|amazon|meesho|shopify|online\s*retail|d2c\b/i,
    ind: 'E-commerce & Marketplace' },
  { re: /saas\b|software\s*product|cloud\s*software|platform\s*company|product\s*company/i,
    ind: 'SaaS & Software Products' },
  { re: /banking|investment\s*bank|nse\b|bse\b|stock\s*(broker|exchange)|mutual\s*fund|nbfc|wealth\s*manag|asset\s*manag|capital\s*market/i,
    ind: 'Banking & Financial Services' },
  { re: /insurance\b|general\s*insur|life\s*insur|reinsur/i,
    ind: 'Insurance & InsurTech' },
  { re: /cybersecurity|information\s*security|network\s*security|endpoint\s*security/i,
    ind: 'Cybersecurity' },
  { re: /artificial\s*intel|\bai\b.*\b(company|startup|firm|solutions)\b|machine\s*learn\s*company/i,
    ind: 'Artificial Intelligence & ML' },
  { re: /telecom|telecommunications|broadband|wireless\s*(carrier|operator)|mobile\s*network|jio\b|airtel|vodafone/i,
    ind: 'Telecommunications' },
  { re: /automobile|automotive|car\s*(manufacturer|company)|vehicle|ev\s*(company|startup)|electric\s*vehicle/i,
    ind: 'Automotive & Transportation' },
  { re: /manufact|industrial|factory|plant\s*operations?|production\s*engineering|machine\s*tools/i,
    ind: 'Manufacturing & Engineering' },
  { re: /retail\b|supermarket|grocery\s*chain|fashion\s*retail|apparel\s*brand|fmcg\b|consumer\s*goods/i,
    ind: 'Consumer Goods & FMCG' },
  { re: /real\s*estate|construction\s*company|builder\b|infrastructure\s*(company|dev)|proptech/i,
    ind: 'Construction & Real Estate' },
  { re: /media\s*(company|house)|entertainment|film\b|ott\b|streaming|gaming\s*company|game\s*(dev|studio)|esport/i,
    ind: 'Entertainment & Media' },
  { re: /food\s*(tech|delivery|company)|restaurant|hospitality\s*industry|hotel|resort\b|travel\s*(tech|company)/i,
    ind: 'Hospitality & Tourism' },
  { re: /logistics\s*company|supply\s*chain\s*company|shipping\s*company|freight|courier|warehouse\s*company|3pl\b/i,
    ind: 'Logistics & Supply Chain' },
  { re: /oil\s*(company|&\s*gas)|petroleum|energy\s*(company|sector)|power\s*(company|sector)|renewable\s*energy|solar\s*(company|energy)/i,
    ind: 'Energy & Utilities' },
  { re: /government|public\s*sector|psu\b|ngo\b|non.?profit|social\s*sector/i,
    ind: 'Government & Public Sector' },
  { re: /consulting\s*(firm|company)|professional\s*services|big\s*4|mckinsey|deloitte|accenture|infosys|wipro|tcs\b|cognizant|capgemini|hcl\b/i,
    ind: 'Professional Services & Consulting' },
  { re: /\b(software|tech|it\s*services|it\s*company|technology|digital\s*agency|web\s*agency|mobile\s*app|startup)\b/i,
    ind: 'Information Technology' },
];

/**
 * @param {string} title
 * @param {string} description
 * @returns {{ industry: string, department: string }}
 */
function classifyJob(title = '', description = '') {
  const titleStr = String(title || '');
  const descStr  = String(description || '').slice(0, 800); // first 800 chars of description
  const fullText = `${titleStr} ${descStr}`;

  // Department — title is primary
  let department = '';
  for (const rule of DEPT_RULES) {
    if (rule.re.test(titleStr)) { department = rule.dept; break; }
  }

  // Industry — use full text (title + description snippet)
  let industry = '';
  for (const rule of IND_RULES) {
    if (rule.re.test(fullText)) { industry = rule.ind; break; }
  }

  // Fallback: if department resolved to software/IT dept but no industry found, default to IT
  if (!industry && /IT & Software Development|DevOps|Cloud|Data & Analytics|Quality Assurance|Product Management|Design|Security/i.test(department)) {
    industry = 'Information Technology';
  }

  return { industry, department };
}

module.exports = { classifyJob };
