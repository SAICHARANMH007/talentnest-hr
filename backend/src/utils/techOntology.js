'use strict';

/**
 * Universal Tech Ontology (UTO) v2
 *
 * Expanded from ~40 tech skills to 120+ skills covering:
 *   - All original tech categories (cloud, backend, frontend, mobile, DB)
 *   - Non-tech domains: sales, marketing, HR, finance, ops, design, legal
 *   - Seniority vocabulary (extracted separately via SENIORITY_LEVELS)
 *   - Location aliases (CITY_ALIASES) for Indian cities commonly misspelled/aliased
 *   - Related-skill groups (if you have React you likely have JS — used for soft matching)
 */

// ── City aliases for Indian market ────────────────────────────────────────────
const CITY_ALIASES = {
  'bangalore':  ['bengaluru', 'blr', 'bangalore urban'],
  'bengaluru':  ['bangalore', 'blr'],
  'mumbai':     ['bombay', 'bom', 'navi mumbai', 'thane'],
  'delhi':      ['new delhi', 'ncr', 'delhi ncr', 'noida', 'gurgaon', 'gurugram', 'faridabad'],
  'ncr':        ['delhi', 'noida', 'gurgaon', 'gurugram', 'faridabad', 'new delhi'],
  'noida':      ['ncr', 'delhi ncr', 'greater noida'],
  'gurgaon':    ['gurugram', 'ncr', 'delhi ncr'],
  'gurugram':   ['gurgaon', 'ncr', 'delhi ncr'],
  'hyderabad':  ['secunderabad', 'hyd', 'cyberabad'],
  'chennai':    ['madras', 'maa'],
  'pune':       ['pimpri', 'pimpri-chinchwad', 'pcmc'],
  'kolkata':    ['calcutta', 'cal'],
  'ahmedabad':  ['amdavad', 'ahd'],
  'jaipur':     ['pink city'],
  'kochi':      ['cochin', 'ernakulam'],
  'coimbatore': ['kovai'],
  'visakhapatnam': ['vizag', 'visakhpatnam'],
};

// ── Seniority vocabulary ───────────────────────────────────────────────────────
// Used by matchScore.js to extract seniority from titles/descriptions.
// Only EXPLICIT seniority qualifiers — not role-type words (developer, analyst, executive)
// to avoid false positives (e.g. "Junior Developer" returning mid-level rank).
const SENIORITY_LEVELS = {
  intern:     { rank: 0, words: ['intern', 'trainee', 'apprentice', 'fresher'] },
  junior:     { rank: 1, words: ['junior', 'entry level', 'entry-level', 'jr.', 'jr '] },
  mid:        { rank: 2, words: ['mid-level', 'mid level', 'midlevel'] },
  senior:     { rank: 3, words: ['senior', 'sr.', 'sr ', 'experienced'] },
  lead:       { rank: 4, words: ['lead', 'tech lead', 'team lead', 'staff engineer'] },
  principal:  { rank: 5, words: ['principal', 'architect', 'chief', 'distinguished'] },
  manager:    { rank: 5, words: ['manager', 'mgr', 'head of', 'vp ', 'vice president'] },
  director:   { rank: 6, words: ['director', 'cto', 'ceo', 'coo', 'cpo', 'c-level'] },
};

// ── Full ontology ─────────────────────────────────────────────────────────────
const TECH_ONTOLOGY = {
  // ── CLOUD & INFRASTRUCTURE ─────────────────────────────────────────────────
  'aws':         { synonyms: ['amazon web services', 'ec2', 's3', 'lambda', 'aws cloud', 'cloudformation', 'route 53', 'rds', 'elasticache'], parents: ['cloud', 'infrastructure'] },
  'azure':       { synonyms: ['microsoft azure', 'azure devops', 'azure cloud', 'azure functions', 'cosmos db', 'azure sql'], parents: ['cloud', 'infrastructure'] },
  'gcp':         { synonyms: ['google cloud platform', 'google cloud', 'gcp cloud', 'bigquery', 'cloud run', 'cloud functions', 'firebase'], parents: ['cloud', 'infrastructure'] },
  'docker':      { synonyms: ['containers', 'dockerize', 'containerization', 'dockerfile', 'docker compose'], parents: ['devops', 'infrastructure'] },
  'kubernetes':  { synonyms: ['k8s', 'helm', 'kubectl', 'eks', 'aks', 'gke', 'openshift'], parents: ['devops', 'infrastructure'] },
  'terraform':   { synonyms: ['iac', 'infrastructure as code', 'ansible', 'pulumi', 'cloudformation'], parents: ['devops', 'cloud'] },
  'jenkins':     { synonyms: ['cicd', 'ci/cd', 'continuous integration', 'github actions', 'gitlab ci', 'circleci', 'travis ci', 'azure pipelines'], parents: ['devops'] },
  'nginx':       { synonyms: ['apache', 'web server', 'reverse proxy', 'load balancer'], parents: ['infrastructure'] },
  'linux':       { synonyms: ['unix', 'bash', 'shell scripting', 'ubuntu', 'centos', 'rhel', 'debian'], parents: ['infrastructure'] },

  // ── BACKEND ────────────────────────────────────────────────────────────────
  'node.js':     { synonyms: ['node', 'nodejs', 'express', 'nestjs', 'node js', 'express.js', 'koa', 'fastify'], parents: ['backend', 'javascript'] },
  'python':      { synonyms: ['django', 'flask', 'fastapi', 'py', 'pandas', 'numpy', 'scipy', 'pytorch', 'tensorflow', 'sklearn'], parents: ['backend', 'data science'] },
  'java':        { synonyms: ['spring boot', 'spring', 'hibernate', 'j2ee', 'maven', 'gradle', 'jvm', 'struts', 'springmvc', 'spring framework'], parents: ['backend'] },
  'go':          { synonyms: ['golang', 'go lang', 'gin', 'echo framework'], parents: ['backend'] },
  'php':         { synonyms: ['laravel', 'symfony', 'codeigniter', 'wordpress', 'drupal', 'yii', 'cakephp'], parents: ['backend'] },
  'ruby':        { synonyms: ['rails', 'ruby on rails', 'sinatra'], parents: ['backend'] },
  'c#':          { synonyms: ['.net', 'asp.net', 'dotnet', 'dot net', '.net core', 'csharp', 'entity framework', 'blazor', 'xamarin'], parents: ['backend'] },
  '.net':        { synonyms: ['dotnet', 'dot net', '.net core', 'c#', 'csharp', 'asp.net', 'ef core'], parents: ['backend'] },
  'rust':        { synonyms: ['rust-lang', 'actix', 'tokio'], parents: ['backend'] },
  'scala':       { synonyms: ['akka', 'play framework', 'spark'], parents: ['backend', 'data science'] },
  'graphql':     { synonyms: ['apollo', 'hasura', 'relay', 'graphql api'], parents: ['backend', 'api'] },
  'rest api':    { synonyms: ['restful', 'rest', 'api development', 'http api', 'openapi', 'swagger'], parents: ['backend', 'api'] },
  'microservices': { synonyms: ['service mesh', 'event driven', 'event-driven architecture', 'api gateway', 'grpc'], parents: ['backend', 'architecture'] },

  // ── FRONTEND ───────────────────────────────────────────────────────────────
  'react':       { synonyms: ['reactjs', 'react.js', 'redux', 'nextjs', 'next.js', 'react native', 'hooks', 'react hooks', 'zustand', 'react query', 'recoil'], parents: ['frontend', 'javascript', 'ui framework'] },
  'angular':     { synonyms: ['angularjs', 'angular.js', 'rxjs', 'ngrx', 'angular material'], parents: ['frontend', 'javascript', 'ui framework'] },
  'vue':         { synonyms: ['vuejs', 'vue.js', 'vuex', 'nuxt', 'nuxt.js', 'pinia'], parents: ['frontend', 'javascript', 'ui framework'] },
  'javascript':  { synonyms: ['js', 'es6', 'es2015', 'es2016', 'ecmascript', 'typescript', 'ts'], parents: ['frontend', 'backend'] },
  'typescript':  { synonyms: ['ts', 'javascript', 'js', 'tsc'], parents: ['frontend', 'backend'] },
  'html':        { synonyms: ['html5', 'xhtml', 'web markup', 'semantic html'], parents: ['frontend'] },
  'css':         { synonyms: ['css3', 'sass', 'scss', 'less', 'tailwind', 'tailwindcss', 'bootstrap', 'material ui', 'mui', 'styled components', 'chakra ui', 'ant design'], parents: ['frontend'] },
  'svelte':      { synonyms: ['sveltekit'], parents: ['frontend', 'javascript', 'ui framework'] },

  // ── MOBILE ─────────────────────────────────────────────────────────────────
  'react native': { synonyms: ['rn', 'expo', 'react native cli'], parents: ['mobile', 'frontend', 'javascript'] },
  'flutter':     { synonyms: ['dart'], parents: ['mobile'] },
  'swift':       { synonyms: ['ios', 'swiftui', 'objective-c', 'xcode', 'cocoa', 'uikit'], parents: ['mobile'] },
  'kotlin':      { synonyms: ['android', 'android studio', 'android development', 'android sdk'], parents: ['mobile'] },

  // ── DATA & DATABASES ───────────────────────────────────────────────────────
  'mongodb':     { synonyms: ['mongo', 'nosql', 'mongoose', 'mongodb atlas', 'document db', 'nosql database'], parents: ['database'] },
  'postgresql':  { synonyms: ['postgres', 'pg', 'psql', 'relational database', 'sql database'], parents: ['database'] },
  'mysql':       { synonyms: ['mariadb', 'relational database', 'sql database', 'innodb'], parents: ['database'] },
  'sql':         { synonyms: ['postgresql', 'mysql', 'mssql', 'oracle sql', 'tsql', 'plsql', 'database', 'query', 'stored procedures'], parents: ['database'] },
  'redis':       { synonyms: ['caching', 'memcached', 'cache', 'in-memory database', 'pub/sub'], parents: ['database', 'infrastructure'] },
  'elasticsearch': { synonyms: ['elk', 'kibana', 'logstash', 'opensearch', 'solr'], parents: ['search', 'database'] },
  'snowflake':   { synonyms: ['data warehouse', 'bigquery', 'redshift', 'databricks', 'dbt'], parents: ['data science', 'database'] },
  'cassandra':   { synonyms: ['apache cassandra', 'dynamodb', 'wide column'], parents: ['database'] },

  // ── DATA SCIENCE & ML ──────────────────────────────────────────────────────
  'machine learning': { synonyms: ['ml', 'deep learning', 'neural network', 'nlp', 'computer vision', 'ai', 'artificial intelligence', 'reinforcement learning'], parents: ['data science'] },
  'data analysis':    { synonyms: ['data analytics', 'business intelligence', 'bi', 'data analyst', 'data visualization', 'tableau', 'power bi', 'excel analytics', 'reporting'], parents: ['data science', 'analytics'] },
  'data engineering': { synonyms: ['etl', 'data pipeline', 'apache spark', 'hadoop', 'kafka', 'airflow', 'dbt'], parents: ['data science', 'backend'] },

  // ── DOMAINS / CATEGORIES ───────────────────────────────────────────────────
  'frontend':    { synonyms: ['web development', 'ui development', 'ux development', 'client-side', 'front-end', 'front end', 'web frontend'] },
  'backend':     { synonyms: ['server-side', 'api development', 'microservices', 'back-end', 'back end', 'server side'] },
  'fullstack':   { synonyms: ['full stack', 'fullstack developer', 'full-stack', 'mern', 'mean', 'lamp'], related: ['frontend', 'backend'] },
  'devops':      { synonyms: ['site reliability', 'sre', 'platform engineering', 'automation', 'dev ops', 'mlops'] },
  'data science': { synonyms: ['machine learning', 'ml engineer', 'data scientist', 'ai engineer', 'analytics', 'data engineering'] },
  'cloud':       { synonyms: ['serverless', 'cloud computing', 'iaas', 'paas', 'saas', 'cloud architecture'] },
  'security':    { synonyms: ['cybersecurity', 'information security', 'appsec', 'sast', 'dast', 'penetration testing', 'vapt', 'siem', 'devsecops'] },
  'qa':          { synonyms: ['quality assurance', 'testing', 'sdet', 'test automation', 'selenium', 'cypress', 'playwright', 'jest', 'pytest', 'postman', 'api testing'] },

  // ── NON-TECH / BUSINESS DOMAINS (new in v2) ────────────────────────────────
  'sales':       { synonyms: ['business development', 'b2b sales', 'b2c sales', 'saas sales', 'enterprise sales', 'inside sales', 'field sales', 'account executive', 'ae', 'bdm', 'bde', 'closing', 'pipeline management', 'crm sales', 'cold calling', 'prospecting', 'outbound sales', 'inbound sales', 'revenue growth'], parents: ['business'] },
  'bdm':         { synonyms: ['business development manager', 'business development', 'sales', 'b2b', 'partnerships', 'enterprise sales', 'strategic sales'], parents: ['business', 'sales'] },
  'marketing':   { synonyms: ['digital marketing', 'growth marketing', 'performance marketing', 'brand marketing', 'content marketing', 'seo', 'sem', 'paid ads', 'social media marketing', 'email marketing', 'influencer marketing', 'product marketing', 'go-to-market'], parents: ['business'] },
  'seo':         { synonyms: ['search engine optimization', 'organic search', 'on-page seo', 'off-page seo', 'link building', 'technical seo', 'sem', 'google analytics', 'keyword research'], parents: ['marketing'] },
  'hr':          { synonyms: ['human resources', 'talent acquisition', 'recruitment', 'recruiting', 'sourcing', 'hris', 'people operations', 'employee relations', 'performance management', 'onboarding', 'hr operations', 'hrbp', 'hr business partner', 'compensation and benefits', 'payroll'], parents: ['business'] },
  'recruitment': { synonyms: ['recruiter', 'talent acquisition', 'sourcing', 'headhunting', 'executive search', 'lateral hiring', 'campus hiring', 'naukri', 'linkedin recruiter'], parents: ['hr'] },
  'finance':     { synonyms: ['accounting', 'financial analysis', 'fp&a', 'financial planning', 'budgeting', 'forecasting', 'financial modeling', 'valuation', 'm&a', 'private equity', 'investment banking', 'cfa', 'ca', 'chartered accountant', 'cpa', 'bookkeeping', 'taxation', 'gst', 'tds', 'audit'], parents: ['business'] },
  'operations':  { synonyms: ['ops', 'supply chain', 'logistics', 'procurement', 'vendor management', 'process improvement', 'lean', 'six sigma', 'project management', 'program management', 'stakeholder management', 'bpm', 'business operations'], parents: ['business'] },
  'product management': { synonyms: ['product manager', 'pm', 'product owner', 'po', 'roadmap', 'agile', 'scrum', 'kanban', 'sprint planning', 'user stories', 'product requirements', 'prd', 'go-to-market', 'jira'], parents: ['business', 'tech'] },
  'customer success': { synonyms: ['customer support', 'account management', 'client success', 'cs', 'csm', 'customer experience', 'cx', 'client management', 'retention', 'churn reduction', 'nps', 'zendesk', 'freshdesk', 'intercom', 'customer onboarding'], parents: ['business'] },
  'design':      { synonyms: ['ux design', 'ui design', 'product design', 'graphic design', 'figma', 'sketch', 'adobe xd', 'invision', 'user research', 'usability testing', 'wireframing', 'prototyping', 'visual design', 'illustration', 'branding'], parents: ['creative'] },
  'communication': { synonyms: ['verbal communication', 'written communication', 'presentation skills', 'stakeholder communication', 'cross-functional communication', 'client communication', 'interpersonal skills'], parents: ['soft skills'] },
  'leadership':  { synonyms: ['team management', 'people management', 'team leadership', 'mentoring', 'coaching', 'org building', 'hiring', 'performance reviews'], parents: ['soft skills', 'management'] },
  'excel':       { synonyms: ['microsoft excel', 'ms excel', 'spreadsheets', 'vlookup', 'pivot tables', 'advanced excel', 'vba', 'google sheets'], parents: ['tools', 'data analysis'] },
  'crm':         { synonyms: ['salesforce', 'hubspot', 'zoho crm', 'freshsales', 'pipedrive', 'dynamics 365', 'customer relationship management'], parents: ['sales', 'tools'] },
};

/**
 * Expand a skill list to include synonyms and parents for better matching.
 * @param {string[]} skills
 * @returns {string[]} expanded set of skill terms
 */
function expandSkills(skills) {
  if (!Array.isArray(skills)) return [];
  const expanded = new Set();

  skills.forEach(skill => {
    const s = skill.toLowerCase().trim();
    expanded.add(s);

    for (const [key, meta] of Object.entries(TECH_ONTOLOGY)) {
      if (key === s || (meta.synonyms && meta.synonyms.includes(s))) {
        expanded.add(key);
        if (meta.parents) meta.parents.forEach(p => expanded.add(p));
        if (meta.synonyms) meta.synonyms.forEach(syn => expanded.add(syn));
        if (meta.related) meta.related.forEach(r => expanded.add(r));
      }
    }
  });

  return Array.from(expanded);
}

/**
 * Extract seniority rank (0–6) from a text string (title or description).
 * Returns null if no seniority signal found.
 */
function extractSeniorityRank(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  // Check from highest to lowest so "Senior Manager" hits 'manager' (5) not 'senior' (3)
  // Actually we want the highest match found
  let bestRank = null;
  for (const [, tier] of Object.entries(SENIORITY_LEVELS)) {
    for (const word of tier.words) {
      if (lower.includes(word)) {
        if (bestRank === null || tier.rank > bestRank) bestRank = tier.rank;
      }
    }
  }
  return bestRank;
}

/**
 * Check if two location strings refer to the same city, accounting for
 * Indian aliases (Bangalore/Bengaluru, Delhi/NCR, etc.).
 * Returns: 'exact' | 'alias' | 'none'
 */
function locationMatch(jobLoc, candLoc) {
  if (!jobLoc || !candLoc) return 'none';
  const j = jobLoc.toLowerCase().trim();
  const c = candLoc.toLowerCase().trim();

  if (c.includes(j) || j.includes(c)) return 'exact';

  // Extract city token (first part of "Bangalore, Karnataka")
  const jCity = j.split(',')[0].trim();
  const cCity = c.split(',')[0].trim();
  if (jCity === cCity) return 'exact';

  // Check alias table
  const jAliases = CITY_ALIASES[jCity] || [];
  const cAliases = CITY_ALIASES[cCity] || [];
  if (jAliases.includes(cCity) || cAliases.includes(jCity)) return 'alias';
  // Cross-check: does cCity appear in any alias of jCity or vice versa?
  if (jAliases.some(a => cCity.includes(a) || a.includes(cCity))) return 'alias';
  if (cAliases.some(a => jCity.includes(a) || a.includes(jCity))) return 'alias';

  return 'none';
}

module.exports = {
  TECH_ONTOLOGY,
  CITY_ALIASES,
  SENIORITY_LEVELS,
  expandSkills,
  extractSeniorityRank,
  locationMatch,
};
