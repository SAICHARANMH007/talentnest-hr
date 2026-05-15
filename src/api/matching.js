// ── TalentNest Proprietary Matching Engine v3.0 ──────────────────────────────
// 18-vector multi-dimensional scoring engine.
// Tier A: Work history recency · Soft skills · Role-type weighting · Stability
// Tier B: Stack completeness · Company quality · Platform behavioral signals
// All vectors produce human-readable insights + a visual score breakdown.

// ── Demand × scarcity weight table ───────────────────────────────────────────
export const TECH_WEIGHTS = {
  'react': 1.6, 'node': 1.6, 'java': 1.5, 'python': 1.5, 'aws': 1.5, 'azure': 1.5,
  'kubernetes': 1.5, 'golang': 1.4, '.net': 1.4, 'ts': 1.4, 'js': 1.4,
  'angular': 1.4, 'vue': 1.4, 'spring': 1.4, 'django': 1.3, 'flutter': 1.3,
  'mongo': 1.2, 'postgres': 1.2, 'sql': 1.2, 'redis': 1.2, 'docker': 1.2,
  'kafka': 1.3, 'elastic': 1.2, 'terraform': 1.3, 'jenkins': 1.1, 'ansible': 1.1,
  'html': 0.8, 'css': 0.8, 'git': 0.7, 'linux': 0.9, 'bash': 0.9,
};

const SKILL_SYNONYMS = {
  'reactjs':'react','react.js':'react','nextjs':'react','next.js':'react',
  'nodejs':'node','node.js':'node','expressjs':'node','express.js':'node','express':'node',
  'mongodb':'mongo','mongoose':'mongo',
  'postgresql':'postgres','mysql':'sql','mssql':'sql','mariadb':'sql',
  'javascript':'js','ecmascript':'js','es6':'js',
  'typescript':'ts',
  'springboot':'spring','spring boot':'spring','spring mvc':'spring',
  'amazon web services':'aws','gcp':'aws','google cloud':'aws',
  'microsoft azure':'azure',
  'dotnet':'.net','dot net':'.net','.net core':'.net','asp.net':'.net','c#':'.net','csharp':'.net',
  'k8s':'kubernetes',
  'elasticsearch':'elastic','elk':'elastic',
  'ci/cd':'jenkins','gitlab ci':'jenkins','github actions':'jenkins',
  'vuejs':'vue','angularjs':'angular',
  'machine learning':'python','ml':'python','deep learning':'python','nlp':'python',
  'data science':'python','pandas':'python','numpy':'python','tensorflow':'python','pytorch':'python',
  'django rest framework':'django','flask':'django','fastapi':'django',
  'react native':'flutter',
};

// ── Skill domain clusters ─────────────────────────────────────────────────────
const SKILL_DOMAINS = {
  frontend : ['react','angular','vue','html','css','ts','js'],
  backend  : ['node','java','python','golang','.net','spring','django'],
  database : ['sql','mongo','postgres','redis','elastic'],
  cloud    : ['aws','azure','kubernetes','docker','terraform'],
  mobile   : ['flutter','swift','kotlin'],
  data     : ['python','kafka','elastic','sql','postgres'],
};

// ── Complete tech stacks (co-occurrence intelligence) ─────────────────────────
const SKILL_STACKS = {
  'MERN'         : ['mongo','react','node'],
  'MEAN'         : ['mongo','angular','node'],
  'Cloud Native' : ['aws','kubernetes','docker','terraform'],
  'ML / AI'      : ['python','elastic'],        // simplified to avoid false positives
  'Java Enterprise': ['java','spring','sql'],
  '.NET Stack'   : ['.net','sql','azure'],
  'Data Engineering': ['python','kafka','sql'],
};

// ── Seniority model ───────────────────────────────────────────────────────────
const SENIORITY_ORDER = { intern:0, junior:1, mid:2, senior:3, lead:4, staff:4, manager:4, director:5 };
function detectSeniority(title, exp) {
  const t = (title || '').toLowerCase(); const e = parseFloat(exp || 0);
  if (/intern|trainee/.test(t)) return 'intern';
  if (/junior|jr\.?\s|associate|entry/.test(t) || e <= 2) return 'junior';
  if (/senior|sr\.?\s|principal|specialist/.test(t) || e >= 8) return 'senior';
  if (/lead|tech lead|team lead/.test(t) || e >= 12) return 'lead';
  if (/staff|architect/.test(t)) return 'staff';
  if (/director|vp\s|head of|c[te]o/.test(t)) return 'director';
  if (/manager/.test(t)) return 'manager';
  if (e <= 0) return 'intern'; if (e <= 2) return 'junior'; if (e <= 5) return 'mid'; if (e <= 9) return 'senior';
  return 'lead';
}

// ── Role-type category detection ──────────────────────────────────────────────
const ROLE_SKILL_MULTIPLIERS = {
  backend  : { backend:1.5, database:1.4, cloud:1.3, frontend:0.6 },
  frontend : { frontend:1.5, backend:0.6 },
  fullstack: { frontend:1.2, backend:1.2, database:1.1 },
  data     : { data:1.8, cloud:1.2, backend:0.8 },
  mobile   : { mobile:2.0, frontend:0.9, backend:0.7 },
  devops   : { cloud:2.0, backend:0.9 },
};
function detectRoleCategory(title, jobSkills) {
  const t = (title || '').toLowerCase();
  if (/backend|server side|api dev/.test(t)) return 'backend';
  if (/frontend|ui dev|react dev|angular dev/.test(t)) return 'frontend';
  if (/full.?stack|mern|mean/.test(t)) return 'fullstack';
  if (/data eng|ml eng|data sci|analytics/.test(t)) return 'data';
  if (/mobile|android|ios|flutter/.test(t)) return 'mobile';
  if (/devops|sre|cloud eng|infra/.test(t)) return 'devops';
  const hasBack = jobSkills.some(s => ['node','java','python','golang','.net','spring'].includes(s));
  const hasFront = jobSkills.some(s => ['react','angular','vue','html','css'].includes(s));
  if (hasBack && hasFront) return 'fullstack';
  if (hasBack) return 'backend';
  if (hasFront) return 'frontend';
  return 'general';
}
function contextualWeight(skill, roleCategory) {
  const muls = ROLE_SKILL_MULTIPLIERS[roleCategory] || {};
  for (const [dom, domSkills] of Object.entries(SKILL_DOMAINS)) {
    if (domSkills.includes(skill)) return muls[dom] || 1.0;
  }
  return 1.0;
}

// ── Tier-1 company signal ─────────────────────────────────────────────────────
const TIER1 = [
  'google','microsoft','amazon','meta','apple','netflix','uber','airbnb','stripe','twilio',
  'goldman sachs','morgan stanley','jp morgan','jpmorgan','barclays','citibank',
  'mckinsey','bcg','bain','deloitte','pwc','kpmg','accenture',
  'infosys','tcs','wipro','hcl','cognizant','capgemini','tech mahindra',
  'oracle','sap','salesforce','servicenow','adobe','atlassian',
  'flipkart','swiggy','zomato','razorpay','phonepe','paytm','zepto','meesho','cred',
  'byju','freshworks','zoho','chargebee','browserstack','postman',
  'ola','oyo','delhivery','manyavar','bigbasket',
];
function companyQualityScore(workHistory, maxPts = 4) {
  if (!Array.isArray(workHistory) || !workHistory.length) return 1;
  const names = workHistory.map(j => (j.company || j.employer || j.organisation || '').toLowerCase());
  const hits  = names.filter(n => n && TIER1.some(t => n.includes(t))).length;
  if (hits >= 2) return maxPts;
  if (hits === 1) return Math.round(maxPts * 0.7);
  return 1;
}

// ── Career stability signal ───────────────────────────────────────────────────
function stabilityScore(workHistory, jobType, maxPts = 5) {
  if (!Array.isArray(workHistory) || !workHistory.length) return 2;
  const tenures = workHistory.map(job => {
    try {
      const s = new Date(job.startDate || job.from || job.start || '');
      const eDateStr = (job.endDate || job.to || job.end || '').toString();
      const e = /present|current|now/i.test(eDateStr) ? new Date() : new Date(eDateStr);
      if (isNaN(s) || isNaN(e)) return null;
      return Math.max(0, (e - s) / (1000 * 60 * 60 * 24 * 365));
    } catch { return null; }
  }).filter(t => t !== null && t > 0 && t < 40);
  if (!tenures.length) return 2;
  const avg = tenures.reduce((a, b) => a + b, 0) / tenures.length;
  if (/contract|freelance|consulting/i.test(jobType || '')) return maxPts; // contracts are short by nature
  if (avg >= 3)   return maxPts;
  if (avg >= 2)   return maxPts - 1;
  if (avg >= 1.5) return maxPts - 2;
  if (avg >= 1)   return maxPts - 3;
  return Math.max(0, maxPts - 4);
}

// ── Work history recency multiplier for skills ────────────────────────────────
function skillRecencyMultiplier(skill, workHistory) {
  if (!Array.isArray(workHistory) || !workHistory.length) return 0.9; // assume somewhat recent
  const now = new Date();
  for (const job of workHistory) {
    const text = (job.description || job.skills || job.tech || job.role || '').toLowerCase();
    if (!text.includes(skill.toLowerCase())) continue;
    const eDateStr = (job.endDate || job.to || '').toString();
    if (/present|current|now/i.test(eDateStr)) return 1.0; // current job
    try {
      const e = new Date(eDateStr);
      if (isNaN(e)) return 0.85;
      const months = (now - e) / (1000 * 60 * 60 * 24 * 30);
      if (months < 12) return 1.0;
      if (months < 24) return 0.85;
      if (months < 48) return 0.65;
      return 0.40;
    } catch { return 0.85; }
  }
  return 0.8; // skill listed but not found explicitly in work history
}

// ── Soft skills extraction ────────────────────────────────────────────────────
const SOFT_SIGNALS = {
  leadership   : ['led ','lead ','managed','headed','directed','supervised','mentored','coached','guided team'],
  communication: ['stakeholder','client facing','cross-functional','presented','negotiated'],
  delivery     : ['delivered','launched','shipped','deployed','released','achieved on time'],
  scale        : ['million users','million request','high traffic','enterprise scale','billion'],
  innovation   : ['built from scratch','architected','designed system','founded','created product'],
  problem      : ['debugged','resolved','optimised','reduced latency','cut cost','improved performance'],
};
function extractSoftSkills(c) {
  const text = [c.summary, c.workHistory, c.projects, c.achievements, c.volunteering]
    .map(f => typeof f === 'string' ? f : JSON.stringify(f || '')).join(' ').toLowerCase();
  return Object.entries(SOFT_SIGNALS)
    .filter(([, patterns]) => patterns.some(p => text.includes(p)))
    .map(([name]) => name);
}
function softSkillScore(softSkills, jobTitle, maxPts = 5) {
  const isMgmt = /manager|lead|head|director|vp/i.test(jobTitle || '');
  let score = Math.min(softSkills.length, 3);
  if (isMgmt && softSkills.includes('leadership')) score += 2;
  return Math.min(maxPts, score);
}

// ── Stack co-occurrence ───────────────────────────────────────────────────────
function stackScore(candSkills, jobSkills, maxPts = 6) {
  let best = 0, bestName = '';
  for (const [name, stackSkills] of Object.entries(SKILL_STACKS)) {
    const jobCovers = stackSkills.filter(s => jobSkills.includes(s)).length;
    if (jobCovers < 2) continue;
    const candCovers = stackSkills.filter(s => candSkills.includes(s)).length;
    const pct = candCovers / stackSkills.length;
    const score = Math.round(pct * maxPts);
    if (score > best) { best = score; bestName = name; }
  }
  return { score: best, stack: bestName };
}

// ── Remaining helpers (unchanged) ────────────────────────────────────────────
export const normalizeTech = s => {
  if (!s) return '';
  let v = String(s).toLowerCase().trim();
  if (SKILL_SYNONYMS[v]) return SKILL_SYNONYMS[v];
  v = v.replace(/\.net\s*core/g,'.net').replace(/dot\s*net/g,'.net').replace(/dotnet/g,'.net')
       .replace(/react\.?js/g,'react').replace(/node\.?js/g,'node')
       .replace(/mongo\.?db/g,'mongo').replace(/javascript/g,'js').replace(/typescript/g,'ts')
       .replace(/postgresql/g,'postgres').replace(/springboot/g,'spring')
       .replace(/[^a-z0-9.+#+\s]/g,' ').replace(/\s+/g,' ').trim();
  return SKILL_SYNONYMS[v] || v;
};
export const toSkillArr = skills => {
  if (Array.isArray(skills)) return skills.map(s => normalizeTech(s)).filter(Boolean);
  if (typeof skills === 'string') return skills.split(/[,;|\/]/).map(s => normalizeTech(s.trim())).filter(Boolean);
  return [];
};
export function parseExpRange(str) {
  if (!str) return null;
  const m = String(str).match(/(\d+)\s*[-–to]+\s*(\d+)/) || String(str).match(/(\d+)\+/);
  if (!m) return null;
  return { min: parseInt(m[1]), max: m[2] ? parseInt(m[2]) : parseInt(m[1]) + 3 };
}
function parseCTC(str) {
  if (!str) return null;
  const m = String(str).match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}
function stem(word) {
  return word.replace(/developer?s?$/i,'develop').replace(/engineer(ing|s)?$/i,'engineer')
             .replace(/architect(ure|s)?$/i,'architect').replace(/manager(ial)?$/i,'manag')
             .replace(/ing$/,'').replace(/er$/,'').replace(/s$/,'');
}
function completenessScore(c) {
  let s = 0;
  if (c.name) s+=1; if (c.title) s+=1.5;
  if (toSkillArr(c.skills).length >= 3) s+=2;
  if (c.experience) s+=1; if (c.location) s+=1;
  if (c.summary && c.summary.length > 50) s+=1.5;
  if (c.phone) s+=0.5;
  if (c.linkedinUrl || c.github || c.portfolio) s+=0.5;
  return Math.min(10, s);
}
function portfolioBonus(c) {
  let b = 0;
  if (c.linkedinUrl) b+=2; if (c.github||c.portfolio) b+=2;
  if (c.videoResumeUrl) b+=1; if (c.certifications && String(c.certifications).length>5) b+=1;
  return Math.min(4, b);
}
function recencyBoost(c) {
  const last = c.updatedAt || c.createdAt;
  if (!last) return 0;
  const d = (Date.now() - new Date(last).getTime()) / 86400000;
  return d < 7 ? 5 : d < 30 ? 3 : d < 90 ? 1 : 0;
}
function jobFreshnessBonus(job) {
  const created = job.createdAt || job.postedAt;
  if (!created) return 3;
  const d = (Date.now() - new Date(created).getTime()) / 86400000;
  return d < 3 ? 8 : d < 7 ? 6 : d < 14 ? 5 : d < 30 ? 3 : d < 60 ? 2 : 1;
}
function noticePenalty(urgency, notice) {
  if (!notice) return 0;
  const u = (urgency || '').toLowerCase(); const n = String(notice).toLowerCase();
  if (u === 'high' || u === 'critical') {
    if (/immediate|^0/.test(n)) return 0;
    if (n.includes('15')) return -2; if (n.includes('30')) return -5;
    if (n.includes('60')) return -8; if (n.includes('90')) return -10;
  }
  return 0;
}
function ctcFitScore(jobMax, candExpected) {
  const j = parseCTC(jobMax); const c = parseCTC(candExpected);
  if (!j || !c) return 4;
  if (c <= j) return 8; if (c <= j*1.15) return 4; return 0;
}
function getConfidence(job, cand) {
  let s = 0;
  if (toSkillArr(job.skills).length>0) s++; if (job.experience) s++;
  if (job.location) s++; if (cand.experience) s++;
  if (toSkillArr(cand.skills).length>=3) s++; if (cand.title) s++;
  return s >= 5 ? 'High' : s >= 3 ? 'Medium' : 'Low';
}
function getRecommendation(score) {
  return score>=90?'Perfect Match':score>=80?'Exceptional Match':score>=70?'Strong Match':score>=55?'Good Match':score>=40?'Possible Match':'Weak Match';
}

// ── Safe JSON parse for work history ─────────────────────────────────────────
function safeParseWH(c) {
  try {
    if (Array.isArray(c.workHistory)) return c.workHistory;
    if (typeof c.workHistory === 'string' && c.workHistory.trim()) return JSON.parse(c.workHistory);
  } catch {}
  return [];
}

// ── genericSearchMatch (unchanged) ───────────────────────────────────────────
export const genericSearchMatch = (haystack, query) => {
  if (!query) return 100;
  const h = normalizeTech(haystack); const q = normalizeTech(query);
  if (h === q || h.includes(q)) return 100;
  const qSyn = SKILL_SYNONYMS[q]; if (qSyn && h.includes(qSyn)) return 95;
  const words = q.split(/\s+/).filter(w => w.length > 1);
  if (words.length > 1) {
    const mc = words.filter(w => h.includes(w)||(SKILL_SYNONYMS[w]&&h.includes(SKILL_SYNONYMS[w]))).length;
    if (mc === words.length) return 90; if (mc > 0) return Math.round((mc/words.length)*70);
  }
  const qs = stem(q); const hw = h.split(/\s+/);
  if (qs.length>3 && hw.some(w=>stem(w)===qs||w.startsWith(qs))) return 60;
  const rH = String(haystack).toLowerCase(); const rQ = String(query).toLowerCase().trim();
  if (rH.includes(rQ)) return 45;
  if (rQ.split(/\s+/).some(w=>w.length>2&&rH.includes(w))) return 25;
  return 0;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALGORITHM 1 — matchCandidatesToJob  v3.0
// 18 scoring vectors. All vectors produce matchInsights for full transparency.
// ═══════════════════════════════════════════════════════════════════════════════
export function matchCandidatesToJob(job, candidates) {
  const jobSkills   = toSkillArr(job.skills);
  const expRange    = parseExpRange(job.experience || '');
  const jobLoc      = normalizeTech(job.location || '');
  const jobTitle    = normalizeTech(job.title || '');
  const jobUrgency  = job.urgency || '';
  const jobMaxCTC   = job.ctcMax || job.maxCTC || job.salaryMax || '';
  const jobType     = job.jobType || job.employmentType || '';
  const roleCategory = detectRoleCategory(job.title, jobSkills);
  const jobSeniorityOrder = SENIORITY_ORDER[detectSeniority(job.title, expRange?.min)] ?? 2;
  const jobDomains  = Object.entries(SKILL_DOMAINS).filter(([,s])=>jobSkills.some(js=>s.includes(js))).map(([d])=>d);

  return candidates.map(c => {
    const wh          = safeParseWH(c);
    const candSkills  = toSkillArr(c.skills);
    const candLoc     = normalizeTech(c.location || '');
    const candPrefLoc = normalizeTech(c.preferredLocation || '');
    const candTitle   = normalizeTech(c.title || c.currentTitle || '');
    const candExp     = parseFloat(c.experience || 0);
    const candOrder   = SENIORITY_ORDER[detectSeniority(c.title, candExp)] ?? 2;
    const softSkills  = extractSoftSkills(c);
    const insights    = [];

    // ── V1. Skill Match with recency × contextual weighting (40 pts) ─────────
    let matchedW = 0, totalW = 0;
    const hits = [], gaps = [];
    jobSkills.forEach(js => {
      const baseW   = (TECH_WEIGHTS[js] || 1.0) * contextualWeight(js, roleCategory);
      totalW += baseW;
      const matched = candSkills.some(cs => cs===js||cs.includes(js)||js.includes(cs)||(SKILL_SYNONYMS[cs]===js));
      if (matched) {
        const rec = wh.length ? skillRecencyMultiplier(js, wh) : 1.0;
        matchedW += baseW * rec;
        if (hits.length < 5) hits.push(js.charAt(0).toUpperCase()+js.slice(1));
      } else if (gaps.length < 3) gaps.push(js.charAt(0).toUpperCase()+js.slice(1));
    });
    const extraDeep = candSkills.filter(cs=>!jobSkills.includes(cs)&&(TECH_WEIGHTS[cs]||0)>=1.3).length;
    const skillScore = Math.min(40, (totalW>0?(matchedW/totalW)*40:18) + Math.min(4, extraDeep*1.2));
    if (hits.length) insights.push({ vector:'Skills', signal:`${hits.length}/${jobSkills.length} matched: ${hits.join(', ')}`, score:Math.round(skillScore) });
    if (gaps.length) insights.push({ vector:'Skill Gaps', signal:`Missing: ${gaps.join(', ')}`, score:0 });

    // ── V2. Experience calibration (16 pts) ───────────────────────────────────
    let expScore = 8; let expInsight = `${candExp}y experience`;
    if (expRange) {
      if (candExp>=expRange.min && candExp<=expRange.max+1) { expScore=16; expInsight=`${candExp}y — perfect fit (${expRange.min}-${expRange.max}y required)`; }
      else if (candExp>expRange.max+1) { const over=Math.round(candExp-expRange.max); expScore=Math.max(5,16-over*2); expInsight=`${candExp}y — ${over}y overqualified`; }
      else { const under=Math.round(expRange.min-candExp); expScore=Math.max(0,16-under*4); expInsight=`${candExp}y — ${under}y below requirement`; }
    }
    insights.push({ vector:'Experience', signal:expInsight, score:Math.round(expScore) });

    // ── V3. Location (7 pts) ──────────────────────────────────────────────────
    const CITY_STATE = { 'hyderabad':'telangana','bangalore':'karnataka','mumbai':'maharashtra','pune':'maharashtra','chennai':'tamilnadu','delhi':'ncr','noida':'ncr','gurgaon':'ncr' };
    const remoteOk = jobLoc.includes('remote')||candLoc.includes('remote')||candPrefLoc.includes('remote');
    let locScore = remoteOk ? 7 :
      (jobLoc&&(jobLoc.includes(candLoc)||candLoc.includes(jobLoc)||candPrefLoc.includes(jobLoc))) ? 7 :
      (jobLoc&&candLoc&&CITY_STATE[jobLoc]===CITY_STATE[candLoc]) ? 5 : 2;
    const locInsight = remoteOk?'Remote-compatible':(locScore===7?'Location match':(locScore===5?'Same metro region':'Relocation required'));
    insights.push({ vector:'Location', signal:locInsight, score:locScore });

    // ── V4. Role title fit (9 pts) ────────────────────────────────────────────
    let titleScore = 2;
    if (jobTitle && candTitle) {
      if (candTitle===jobTitle||candTitle.includes(jobTitle)||jobTitle.includes(candTitle)) titleScore=9;
      else { const jw=jobTitle.split(/\s+/).filter(w=>w.length>2); const ms=jw.filter(w=>candTitle.includes(w)||candTitle.includes(stem(w))); titleScore=Math.min(7,2+(ms.length/Math.max(1,jw.length))*7); }
    }
    insights.push({ vector:'Role Title', signal:titleScore>=9?'Direct title match':titleScore>=5?'Partial title overlap':'Different title', score:Math.round(titleScore) });

    // ── V5. Career level intelligence (7 pts) ─────────────────────────────────
    const ld = Math.abs(candOrder - jobSeniorityOrder);
    const levelScore = ld===0?7:ld===1?5:ld===2?2:0;
    const levelInsight = ld===0?`Seniority match (${detectSeniority(c.title,candExp)})`:ld===1?`One level apart — ${candOrder>jobSeniorityOrder?'overqualified':'growth opportunity'}`:ld===2?'Significant seniority gap':'Major mismatch';
    insights.push({ vector:'Career Level', signal:levelInsight, score:levelScore });

    // ── V6. Skill domain coverage (4 pts) ─────────────────────────────────────
    let domainScore = 0;
    if (jobDomains.length>0) {
      const cov = jobDomains.filter(d=>SKILL_DOMAINS[d]?.some(s=>candSkills.includes(s)));
      domainScore = Math.round((cov.length/jobDomains.length)*4);
      insights.push({ vector:'Domain Coverage', signal:`${cov.length}/${jobDomains.length} domains covered (${cov.join(', ')||'none'})`, score:domainScore });
    }

    // ── V7. Stack completeness — TIER B (5 pts) ──────────────────────────────
    const { score: stScore, stack: stName } = stackScore(candSkills, jobSkills, 5);
    if (stName) insights.push({ vector:'Tech Stack', signal:`${stScore===5?'Complete':'Partial'} ${stName} stack`, score:stScore });

    // ── V8. Work history recency signal (4 pts) ───────────────────────────────
    let recencySignalScore = 2; // neutral when no history
    if (wh.length > 0) {
      const currentJob = wh.find(j => { const e=(j.endDate||j.to||'').toString(); return /present|current|now/i.test(e)||!e.trim(); });
      const monthsSince = currentJob ? 0 : (() => {
        const latest = wh.reduce((best, j) => {
          try { const e=new Date(j.endDate||j.to||''); return !isNaN(e)&&e>best?e:best; } catch { return best; }
        }, new Date(0));
        return (Date.now()-latest.getTime())/(1000*60*60*24*30);
      })();
      recencySignalScore = monthsSince<3?4:monthsSince<12?3:monthsSince<24?2:1;
    }
    insights.push({ vector:'Work Recency', signal:recencySignalScore>=4?'Currently employed / recently active':recencySignalScore>=3?'Active within last year':recencySignalScore>=2?'Last active 1-2 years ago':'Gap detected — verify availability', score:recencySignalScore });

    // ── V9. Career stability — TIER A (5 pts) ─────────────────────────────────
    const stabScore = stabilityScore(wh, jobType, 5);
    const avgTenure = (() => { if (!wh.length) return null; const t=wh.map(j=>{ try{ const s=new Date(j.startDate||j.from||''); const e=/present/i.test((j.endDate||j.to||'').toString())?new Date():new Date(j.endDate||j.to||''); return(!isNaN(s)&&!isNaN(e))?(e-s)/(1000*60*60*24*365):null; }catch{return null;} }).filter(t=>t&&t>0&&t<40); return t.length?Math.round(t.reduce((a,b)=>a+b,0)/t.length*10)/10:null; })();
    insights.push({ vector:'Stability', signal:avgTenure?`Avg tenure ${avgTenure}y — ${stabScore>=4?'stable career':'frequent moves'}`:'Work history not detailed', score:stabScore });

    // ── V10. Company quality — TIER B (4 pts) ─────────────────────────────────
    const compScore = companyQualityScore(wh, 4);
    if (wh.length) insights.push({ vector:'Company Quality', signal:compScore>=4?'Tier-1 company experience':compScore>=2?'Recognized company background':'Company history available', score:compScore });

    // ── V11. Soft skills — TIER A (5 pts) ─────────────────────────────────────
    const softScore = softSkillScore(softSkills, job.title, 5);
    if (softSkills.length) insights.push({ vector:'Soft Skills', signal:`Detected: ${softSkills.slice(0,3).join(', ')}`, score:softScore });

    // ── V12. CTC fit (7 pts) ──────────────────────────────────────────────────
    const ctcScore = ctcFitScore(jobMaxCTC, c.expectedCTC||c.currentCTC||'');
    const cctc = parseCTC(c.expectedCTC||c.currentCTC||''); const jctc = parseCTC(jobMaxCTC);
    const ctcInsight = !cctc?'CTC not specified':!jctc?'Budget not disclosed':ctcScore===8?`₹${cctc}L — within budget`:ctcScore===4?`₹${cctc}L — negotiable`:ctcScore===0?'Significantly above budget':'CTC match';
    insights.push({ vector:'CTC Fit', signal:ctcInsight, score:ctcScore });

    // ── V13. Portfolio signals (3 pts) ────────────────────────────────────────
    const portScore = Math.min(3, portfolioBonus(c));

    // ── V14. Notice period penalty ────────────────────────────────────────────
    const penalty = noticePenalty(jobUrgency, c.noticePeriod||c.availability||'');

    // ── V15. Profile completeness (2 pts) ─────────────────────────────────────
    const complScore = Math.round((completenessScore(c)/10)*2);

    // ── V16. Platform recency (2 pts) ─────────────────────────────────────────
    const platRecency = Math.min(2, recencyBoost(c)*0.4);

    // ── V17. Platform behavioral signal (4 pts) — injected by enrichment ──────
    const behavScore = Math.min(4, c._platformScore || 0);
    if (c._platformScore > 0) insights.push({ vector:'Platform Track Record', signal:c._platformInsight||'Previous platform activity', score:Math.round(behavScore) });

    // ── V18. Cross-skill synergy ───────────────────────────────────────────────
    const skillPct = totalW>0?matchedW/totalW:0;
    const synergy = skillPct>=0.85?4:skillPct>=0.70?2:0;
    if (synergy>0) insights.push({ vector:'Synergy', signal:`${Math.round(skillPct*100)}% of required skill stack covered — deployable from day 1`, score:synergy });

    const raw = skillScore+expScore+locScore+titleScore+levelScore+domainScore+stScore+recencySignalScore+stabScore+compScore+softScore+ctcScore+portScore+complScore+platRecency+behavScore+synergy+penalty;
    const matchScore = Math.round(Math.min(99, Math.max(1, raw)));

    return {
      candidateId   : c._id || c.id,
      matchScore,
      recommendation: getRecommendation(matchScore),
      confidenceLevel: getConfidence(job, c),
      matchVector   : { skills:Math.round(skillScore), experience:Math.round(expScore), location:locScore, title:Math.round(titleScore), careerLevel:levelScore, domain:domainScore, stack:stScore, workRecency:recencySignalScore, stability:stabScore, company:compScore, softSkills:softScore, ctcFit:ctcScore, portfolio:portScore, synergy },
      matchInsights : insights,
      highlights    : hits,
      missingSkills : gaps,
      softSkills,
      reasoning     : insights.filter(i=>i.score>0).slice(0,3).map(i=>i.signal).join(' · '),
      candidate     : c,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALGORITHM 2 — matchJobsToCandidate  v3.0
// Candidate view: freshness + growth + salary + stack alignment.
// ═══════════════════════════════════════════════════════════════════════════════
export function matchJobsToCandidate(candidate, jobs, query = '') {
  const candSkills = toSkillArr(candidate.skills);
  const candLoc    = normalizeTech(candidate.location || '');
  const candTitle  = normalizeTech(candidate.title || candidate.currentTitle || '');
  const candExp    = parseFloat(candidate.experience || 0);
  const candCTC    = parseCTC(candidate.expectedCTC || '');
  const candOrder  = SENIORITY_ORDER[detectSeniority(candidate.title, candExp)] ?? 2;
  const wh         = safeParseWH(candidate);
  const q          = normalizeTech(query);

  return jobs.map(j => {
    const jobSkills = toSkillArr(j.skills);
    const expRange  = parseExpRange(j.experience || '');
    const jobLoc    = normalizeTech(j.location || '');
    const jobTitle  = normalizeTech(j.title || '');
    const insights  = [];
    const highlights = [];

    // ── Skill match with recency weighting (35 pts) ───────────────────────────
    let matchedW=0, totalW=0;
    const roleC = detectRoleCategory(j.title, jobSkills);
    jobSkills.forEach(js => {
      const bw = (TECH_WEIGHTS[js]||1.0)*contextualWeight(js,roleC); totalW+=bw;
      if (candSkills.some(cs=>cs===js||cs.includes(js)||js.includes(cs)||SKILL_SYNONYMS[cs]===js)) {
        const rec = wh.length?skillRecencyMultiplier(js,wh):1.0;
        matchedW+=bw*rec;
        if (highlights.length<4) highlights.push(js.charAt(0).toUpperCase()+js.slice(1));
      }
    });
    const skillScore = totalW>0?(matchedW/totalW)*35:14;
    if (highlights.length) insights.push({ vector:'Skills', signal:`${highlights.length} matching skills: ${highlights.join(', ')}`, score:Math.round(skillScore) });

    // ── Experience fit (13 pts) ───────────────────────────────────────────────
    let expScore = 7;
    if (expRange) { if (candExp>=expRange.min&&candExp<=expRange.max+1) expScore=13; else expScore=Math.max(0,13-Math.abs(candExp-expRange.min)*3); }

    // ── Location (9 pts) ─────────────────────────────────────────────────────
    const remoteOk = jobLoc.includes('remote')||candLoc.includes('remote');
    const pref = normalizeTech(candidate.preferredLocation||'');
    const locScore = remoteOk?9:(jobLoc&&(jobLoc.includes(candLoc)||candLoc.includes(jobLoc)||pref.includes(jobLoc)))?9:3;

    // ── Title (13 pts) ────────────────────────────────────────────────────────
    let titleScore = 3;
    if (jobTitle&&candTitle) {
      if (candTitle.includes(jobTitle)||jobTitle.includes(candTitle)) titleScore=13;
      else { const jw=jobTitle.split(/\s+/).filter(w=>w.length>2); const hits=jw.filter(w=>candTitle.includes(w)||candTitle.includes(stem(w))); titleScore=Math.min(10,3+(hits.length/Math.max(1,jw.length))*7); }
    }

    // ── Career growth signal — TIER A (8 pts) ─────────────────────────────────
    const jobOrder = SENIORITY_ORDER[detectSeniority(j.title,expRange?.min)] ?? 2;
    const diff = jobOrder - candOrder;
    const growthScore = diff===1?8:diff===0?6:diff===2?4:diff<0?2:3;
    const growthInsight = diff===1?'⬆️ One step up — ideal career growth':diff===0?'Lateral move — stable':diff===2?'Stretch role — fast growth':diff<0?'Step down':'Seniority unclear';
    insights.push({ vector:'Career Growth', signal:growthInsight, score:growthScore });

    // ── Job freshness — TIER A (6 pts) ────────────────────────────────────────
    const fresh = jobFreshnessBonus(j);
    const dOld = j.createdAt?Math.round((Date.now()-new Date(j.createdAt).getTime())/86400000):null;
    const freshInsight = !dOld?'Posting date unknown':dOld<3?'Just posted — apply immediately':dOld<7?`Posted ${dOld} days ago — still fresh`:dOld<30?`Posted ${dOld} days ago`:dOld<60?`Posted ${dOld} days ago — moderate competition`:'Older posting — may be filled';
    insights.push({ vector:'Freshness', signal:freshInsight, score:fresh });

    // ── Salary alignment — TIER A (6 pts) ─────────────────────────────────────
    let salScore = 3;
    const jMax = parseCTC(j.salaryMax||j.ctcMax||j.salary||'');
    if (candCTC&&jMax) { salScore=candCTC<=jMax?6:candCTC<=jMax*1.1?4:1; }
    const salInsight = !candCTC||!jMax?'Salary not specified':salScore===6?`₹${candCTC}L within budget`:salScore===4?`₹${candCTC}L — negotiable`:salScore===1?'CTC may exceed budget':'Budget aligned';
    insights.push({ vector:'Salary', signal:salInsight, score:salScore });

    // ── Stack match — TIER B (5 pts) ─────────────────────────────────────────
    const { score:stScore, stack:stName } = stackScore(candSkills, jobSkills, 5);
    if (stName) insights.push({ vector:'Tech Stack', signal:`${stScore===5?'Complete':'Partial'} ${stName} match`, score:stScore });

    // ── Platform behavioral — injected (3 pts) ───────────────────────────────
    const behavScore = Math.min(3, candidate._platformScore||0);

    // ── Query boost (search) ──────────────────────────────────────────────────
    let qBonus = 0;
    if (q) {
      const jT=normalizeTech(j.title); const jS=toSkillArr(j.skills).join(' '); const jD=normalizeTech(j.description||''); const jC=normalizeTech(j.companyName||j.company||'');
      const src=`${jT} ${jS} ${jD} ${jC}`;
      const TMAP = { 'dotnet':['.net','dotnet','csharp'],'react':['react','reactjs','nextjs'],'node':['node','nodejs','express'],'java':['java','spring','springboot'],'python':['python','django','flask','fastapi'],'sql':['sql','postgres','mysql'] };
      const kws = q.split(/\s+/).filter(k=>k.length>1);
      const matches = kws.filter(kw=>{ const v=TMAP[kw]||[kw,SKILL_SYNONYMS[kw]].filter(Boolean); return v.some(vv=>src.includes(vv)); });
      if (matches.length>0) { const r=matches.length/kws.length; qBonus=matches.some(m=>jT.includes(m))?50+r*20:matches.some(m=>jS.includes(m))?40+r*20:30+r*20; }
      else { const raw=`${j.title} ${j.companyName||j.company} ${(j.skills||[]).join(' ')} ${j.description||''}`.toLowerCase(); if (raw.includes(query.toLowerCase().trim())) qBonus=20; }
      if (qBonus===0) return null;
    }

    const base = skillScore+expScore+locScore+titleScore+growthScore+fresh+salScore+stScore+behavScore;
    const matchScore = q ? Math.min(100, Math.round(base*0.5+qBonus)) : Math.round(Math.min(99, base));
    return {
      jobId          : j._id||j.id,
      matchScore,
      recommendation : getRecommendation(matchScore),
      confidenceLevel: getConfidence(j, candidate),
      matchInsights  : insights,
      reasoning      : highlights.length>0?`${highlights.length} skill match · ${growthInsight} · ${freshInsight}`:getRecommendation(matchScore),
      highlights,
      job            : j,
    };
  }).filter(Boolean).sort((a,b)=>b.matchScore-a.matchScore);
}

// ═══════════════════════════════════════════════════════════════════════════════
// enrichWithPlatformSignals — TIER B
// Fetches shortlist/interview/hire stats from backend and injects them
// into the candidate objects before matching. Call this BEFORE matchCandidatesToJob.
// ═══════════════════════════════════════════════════════════════════════════════
export async function enrichWithPlatformSignals(candidates, apiClient) {
  if (!candidates.length || !apiClient) return candidates;
  try {
    const ids = candidates.slice(0,100).map(c => c.id || c._id).filter(Boolean).join(',');
    if (!ids) return candidates;
    const stats = await apiClient('GET', `/users/platform-signals?ids=${ids}`, null, false);
    if (!stats || !stats.data) return candidates;
    const map = new Map(stats.data.map(s => [s.candidateId, s]));
    return candidates.map(c => {
      const sig = map.get(c.id || c._id?.toString());
      if (!sig) return c;
      const successRate = sig.totalApps > 0 ? sig.shortlisted / sig.totalApps : 0;
      const platformScore = Math.min(4,
        (sig.hired > 0 ? 2 : 0) +
        (successRate > 0.3 ? 1.5 : successRate > 0.1 ? 0.75 : 0) +
        (sig.interviewCleared > 0 ? 0.5 : 0)
      );
      const platformInsight = sig.hired > 0 ?
        `Hired ${sig.hired}× on platform — proven placements` :
        sig.shortlisted > 0 ?
        `Shortlisted ${sig.shortlisted}× (${Math.round(successRate*100)}% shortlist rate)` :
        'New to platform';
      return { ...c, _platformScore: platformScore, _platformInsight: platformInsight };
    });
  } catch { return candidates; }
}

// ═══════════════════════════════════════════════════════════════════════════════
// filterCandidates — server-side search (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════
export function filterCandidates(candidates, filters) {
  const { designation, skills, location, expMin, expMax, minCTC, maxCTC, availability } = filters;
  return candidates.map(c => {
    let score = 0;
    if (designation) { const s=genericSearchMatch(`${c.title||''} ${c.currentRole||''}`,designation); if(s===0)return null; score+=(s/100)*40; } else score+=40;
    if (skills) { const terms=skills.split(/[,;|]/).map(s=>s.trim()).filter(Boolean); const cs=toSkillArr(c.skills).join(' '); const ms=terms.map(t=>genericSearchMatch(cs,t)); if(ms.every(m=>m===0))return null; score+=(ms.reduce((a,b)=>a+b,0)/ms.length/100)*40; } else score+=40;
    if (location) { const cl=normalizeTech(c.location||''); const pl=normalizeTech(c.preferredLocation||''); const lq=normalizeTech(location); const rem=cl.includes('remote')||pl.includes('remote')||lq.includes('remote'); if(!rem&&!cl.includes(lq)&&!pl.includes(lq))return null; score+=10; } else score+=10;
    const ce=parseFloat(c.experience||0);
    if (expMin&&ce<parseFloat(expMin))return null;
    if (expMax&&ce>parseFloat(expMax))return null;
    const cc=parseCTC(c.expectedCTC)||0;
    if (minCTC&&cc<parseFloat(minCTC))return null;
    if (maxCTC&&cc>parseFloat(maxCTC))return null;
    if (availability) { const av=normalizeTech(c.availability||c.noticePeriod||''); if(!av.includes(normalizeTech(availability)))return null; }
    score+=completenessScore(c)*0.5+recencyBoost(c)*0.5;
    return { ...c, _searchScore:Math.round(score) };
  }).filter(Boolean).sort((a,b)=>b._searchScore-a._searchScore);
}

// ═══════════════════════════════════════════════════════════════════════════════
// parseJD — unchanged
// ═══════════════════════════════════════════════════════════════════════════════
export function parseJD(text) {
  const lines=(text||'').split('\n').map(l=>l.trim()).filter(Boolean);
  const result={ title:'',location:'',skills:'',experience:'',description:text?.slice(0,2000),salary:'',department:'',education:'',employmentType:'Full-Time',workMode:'Onsite' };
  if(!lines.length)return result;
  if(lines[0].length<60)result.title=lines[0];
  const content=text.toLowerCase();
  const em=text.match(/(\d+)\s*(?:-|–|to)\s*(\d+)\s*(?:years?|yrs?|yexp)/i)||text.match(/(\d+)\+\s*(?:years?|yrs?|yexp)/i);
  if(em)result.experience=em[0];
  const allTech=[...Object.keys(TECH_WEIGHTS),'communication','leadership','agile','scrum','jira'];
  const fs=allTech.filter(t=>content.includes(t));
  if(fs.length)result.skills=fs.map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(', ');
  const locs=['Hyderabad','Bangalore','Mumbai','Pune','Delhi','Noida','Gurgaon','Chennai','Kolkata','Ahmedabad','Remote'];
  const fl=locs.find(l=>content.includes(l.toLowerCase()));
  if(fl)result.location=fl;
  if(content.includes('contract'))result.employmentType='Contract';
  else if(content.includes('intern'))result.employmentType='Internship';
  else if(content.includes('freelance'))result.employmentType='Freelance';
  if(content.includes('remote')||content.includes('work from home')||content.includes('wfh'))result.workMode='Remote';
  else if(content.includes('hybrid'))result.workMode='Hybrid';
  const sm=text.match(/(?:₹|INR|Rs\.?)\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(?:LPA|L|Lakh)/i)||text.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(?:LPA|L|Lakh)/i);
  if(sm)result.salary=`${sm[1]}-${sm[2]} LPA`;
  return result;
}
