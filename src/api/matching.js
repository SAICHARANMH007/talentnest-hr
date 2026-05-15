// ── TalentNest Proprietary Matching Engine v2.0 ──────────────────────────────
// Multi-dimensional deterministic scoring across 12 vectors.
// Each match produces a score (0-99), a recommendation tier, specific insights,
// and a confidence level — giving recruiters and candidates full transparency
// into why a match was made.

// ── Tier Weights: demand × scarcity factor ────────────────────────────────────
export const TECH_WEIGHTS = {
  // Tier 1 — Critical path / highest market demand
  'react': 1.6, 'node': 1.6, 'java': 1.5, 'python': 1.5, 'aws': 1.5, 'azure': 1.5,
  'kubernetes': 1.5, 'golang': 1.4, '.net': 1.4, 'ts': 1.4, 'js': 1.4,
  'angular': 1.4, 'vue': 1.4, 'spring': 1.4, 'django': 1.3, 'flutter': 1.3,
  // Tier 2 — Data / infrastructure
  'mongo': 1.2, 'postgres': 1.2, 'sql': 1.2, 'redis': 1.2, 'docker': 1.2,
  'kafka': 1.3, 'elastic': 1.2, 'terraform': 1.3, 'jenkins': 1.1, 'ansible': 1.1,
  // Tier 3 — Foundational (common, less differentiating)
  'html': 0.8, 'css': 0.8, 'git': 0.7, 'linux': 0.9, 'bash': 0.9,
};

// ── Skill synonym / alias normalisation ──────────────────────────────────────
const SKILL_SYNONYMS = {
  'reactjs': 'react', 'react.js': 'react', 'nextjs': 'react', 'next.js': 'react',
  'nodejs': 'node', 'node.js': 'node', 'expressjs': 'node', 'express.js': 'node', 'express': 'node',
  'mongodb': 'mongo', 'mongoose': 'mongo',
  'postgresql': 'postgres', 'mysql': 'sql', 'mssql': 'sql', 'mariadb': 'sql', 'oracle db': 'sql',
  'javascript': 'js', 'ecmascript': 'js', 'es6': 'js', 'es2015': 'js', 'vanilla js': 'js',
  'typescript': 'ts',
  'springboot': 'spring', 'spring boot': 'spring', 'spring mvc': 'spring', 'spring framework': 'spring',
  'amazon web services': 'aws', 'gcp': 'aws', 'google cloud': 'aws',
  'microsoft azure': 'azure',
  'dotnet': '.net', 'dot net': '.net', '.net core': '.net', 'asp.net': '.net',
  'c#': '.net', 'csharp': '.net',
  'golang': 'golang', 'go lang': 'golang', 'go programming': 'golang',
  'flutter': 'flutter', 'dart': 'flutter',
  'k8s': 'kubernetes', 'kube': 'kubernetes',
  'elasticsearch': 'elastic', 'elk': 'elastic', 'elk stack': 'elastic',
  'ci/cd': 'jenkins', 'gitlab ci': 'jenkins', 'github actions': 'jenkins', 'circleci': 'jenkins',
  'vuejs': 'vue', 'vue.js': 'vue',
  'angularjs': 'angular', 'angular.js': 'angular', 'angular 2': 'angular',
  'machine learning': 'python', 'ml': 'python', 'deep learning': 'python', 'nlp': 'python',
  'data science': 'python', 'pandas': 'python', 'numpy': 'python', 'tensorflow': 'python', 'pytorch': 'python',
  'django rest framework': 'django', 'flask': 'django', 'fastapi': 'django',
  'react native': 'flutter', 'xamarin': 'flutter',
};

// ── Skill domain clusters (for coverage intelligence) ─────────────────────────
const SKILL_DOMAINS = {
  frontend  : ['react', 'angular', 'vue', 'html', 'css', 'ts', 'js'],
  backend   : ['node', 'java', 'python', 'golang', '.net', 'spring', 'django'],
  database  : ['sql', 'mongo', 'postgres', 'redis', 'elastic'],
  cloud     : ['aws', 'azure', 'kubernetes', 'docker', 'terraform'],
  mobile    : ['flutter', 'swift', 'kotlin'],
  data      : ['python', 'kafka', 'elastic', 'sql', 'postgres'],
};

// ── Career seniority model ─────────────────────────────────────────────────────
const SENIORITY_KEYWORDS = {
  intern   : ['intern', 'trainee', 'apprentice'],
  junior   : ['junior', 'jr', 'associate', 'entry level', 'fresher'],
  mid      : ['developer', 'engineer', 'analyst'],  // default
  senior   : ['senior', 'sr.', 'sr ', 'principal', 'specialist'],
  lead     : ['lead', 'tech lead', 'team lead'],
  staff    : ['staff', 'architect', 'expert'],
  manager  : ['manager', 'head of'],
  director : ['director', 'vp', 'vice president', 'cto', 'ceo'],
};
const SENIORITY_ORDER = { intern: 0, junior: 1, mid: 2, senior: 3, lead: 4, staff: 4, manager: 4, director: 5 };

function detectSeniority(title, experienceYears) {
  const t = (title || '').toLowerCase();
  const exp = parseFloat(experienceYears || 0);
  for (const [level, keywords] of Object.entries(SENIORITY_KEYWORDS)) {
    if (keywords.some(kw => t.includes(kw))) return level;
  }
  // Fallback: infer from experience
  if (exp <= 0)  return 'intern';
  if (exp <= 2)  return 'junior';
  if (exp <= 5)  return 'mid';
  if (exp <= 9)  return 'senior';
  if (exp <= 13) return 'lead';
  return 'staff';
}

// ── Stemmer for partial title matching ────────────────────────────────────────
function stem(word) {
  return word
    .replace(/developer?s?$/i, 'develop')
    .replace(/engineer(ing|s)?$/i, 'engineer')
    .replace(/architect(ure|s)?$/i, 'architect')
    .replace(/manager(ial)?$/i, 'manag')
    .replace(/designing?$/i, 'design')
    .replace(/testing$/i, 'test')
    .replace(/analyst(s)?$/i, 'analyt')
    .replace(/specialist(s)?$/i, 'special')
    .replace(/consultant(s)?$/i, 'consult')
    .replace(/ing$/, '')
    .replace(/er$/, '')
    .replace(/s$/, '');
}

// ── Tech normaliser ───────────────────────────────────────────────────────────
export const normalizeTech = s => {
  if (!s) return '';
  let v = String(s).toLowerCase().trim();
  if (SKILL_SYNONYMS[v]) return SKILL_SYNONYMS[v];
  v = v
    .replace(/\.net\s*core/g, '.net').replace(/dot\s*net/g, '.net').replace(/dotnet/g, '.net')
    .replace(/react\.?js/g, 'react').replace(/node\.?js/g, 'node')
    .replace(/mongo\.?db/g, 'mongo').replace(/javascript/g, 'js').replace(/typescript/g, 'ts')
    .replace(/postgresql/g, 'postgres').replace(/springboot/g, 'spring')
    .replace(/[^a-z0-9.+#+\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return SKILL_SYNONYMS[v] || v;
};

export const toSkillArr = skills => {
  if (Array.isArray(skills)) return skills.map(s => normalizeTech(s)).filter(Boolean);
  if (typeof skills === 'string') return skills.split(/[,;|\/]/).map(s => normalizeTech(s.trim())).filter(Boolean);
  return [];
};

// ── Numeric helpers ───────────────────────────────────────────────────────────
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

// ── Profile quality signals ───────────────────────────────────────────────────
function completenessScore(c) {
  let s = 0;
  if (c.name)                    s += 1;
  if (c.title)                   s += 1.5;
  if ((toSkillArr(c.skills).length) >= 3) s += 2;
  if (c.experience)              s += 1;
  if (c.location)                s += 1;
  if (c.summary && c.summary.length > 50) s += 1.5;
  if (c.phone)                   s += 0.5;
  if (c.linkedinUrl || c.github || c.portfolio) s += 0.5;
  return Math.min(10, s);
}

function portfolioBonus(c) {
  let bonus = 0;
  if (c.linkedinUrl)                    bonus += 2;
  if (c.github || c.portfolio)          bonus += 2;
  if (c.videoResumeUrl)                 bonus += 1;
  if (c.certifications && String(c.certifications).length > 5) bonus += 1;
  return Math.min(4, bonus);
}

function recencyBoost(c) {
  const last = c.updatedAt || c.createdAt;
  if (!last) return 0;
  const daysAgo = (Date.now() - new Date(last).getTime()) / 86400000;
  if (daysAgo < 7)  return 5;
  if (daysAgo < 30) return 3;
  if (daysAgo < 90) return 1;
  return 0;
}

function jobFreshnessBonus(job) {
  const created = job.createdAt || job.postedAt;
  if (!created) return 3; // neutral
  const daysOld = (Date.now() - new Date(created).getTime()) / 86400000;
  if (daysOld < 3)  return 8;
  if (daysOld < 7)  return 6;
  if (daysOld < 14) return 5;
  if (daysOld < 30) return 3;
  if (daysOld < 60) return 2;
  return 1; // older job — less desirable
}

// ── Notice period penalty ─────────────────────────────────────────────────────
function noticePenalty(jobUrgency, candidateNotice) {
  if (!candidateNotice) return 0;
  const urgent = (jobUrgency || '').toLowerCase();
  const notice = String(candidateNotice).toLowerCase();
  if (urgent === 'high' || urgent === 'critical') {
    if (notice.includes('immediate') || notice.includes('0')) return 0;
    if (notice.includes('15')) return -2;
    if (notice.includes('30')) return -5;
    if (notice.includes('60')) return -8;
    if (notice.includes('90')) return -10;
  }
  return 0;
}

// ── CTC fit ───────────────────────────────────────────────────────────────────
function ctcFitScore(jobMaxCTC, candidateExpected) {
  const jobMax  = parseCTC(jobMaxCTC);
  const candExp = parseCTC(candidateExpected);
  if (!jobMax || !candExp) return 4;
  if (candExp <= jobMax)          return 8;
  if (candExp <= jobMax * 1.15)   return 4;
  return 0;
}

// ── Confidence level ──────────────────────────────────────────────────────────
function getConfidence(job, candidate) {
  let signals = 0;
  if (toSkillArr(job.skills).length > 0)       signals++;
  if (job.experience)                           signals++;
  if (job.location)                             signals++;
  if (candidate.experience)                     signals++;
  if (toSkillArr(candidate.skills).length >= 3) signals++;
  if (candidate.title)                          signals++;
  if (signals >= 5) return 'High';
  if (signals >= 3) return 'Medium';
  return 'Low';
}

// ── Recommendation tier ───────────────────────────────────────────────────────
function getRecommendation(score) {
  if (score >= 90) return 'Perfect Match';
  if (score >= 80) return 'Exceptional Match';
  if (score >= 70) return 'Strong Match';
  if (score >= 55) return 'Good Match';
  if (score >= 40) return 'Possible Match';
  return 'Weak Match';
}

/**
 * genericSearchMatch — Multi-strategy keyword match. Returns 0-100.
 */
export const genericSearchMatch = (haystack, query) => {
  if (!query) return 100;
  const h = normalizeTech(haystack);
  const q = normalizeTech(query);
  if (h === q || h.includes(q)) return 100;
  const qSyn = SKILL_SYNONYMS[q];
  if (qSyn && h.includes(qSyn)) return 95;
  const words = q.split(/\s+/).filter(w => w.length > 1);
  if (words.length > 1) {
    const matchCount = words.filter(w => h.includes(w) || (SKILL_SYNONYMS[w] && h.includes(SKILL_SYNONYMS[w]))).length;
    if (matchCount === words.length) return 90;
    if (matchCount > 0) return Math.round((matchCount / words.length) * 70);
  }
  const qStem = stem(q);
  const hWords = h.split(/\s+/);
  if (qStem.length > 3 && hWords.some(w => stem(w) === qStem || w.startsWith(qStem))) return 60;
  const rawH = String(haystack).toLowerCase();
  const rawQ = String(query).toLowerCase().trim();
  if (rawH.includes(rawQ)) return 45;
  if (rawQ.split(/\s+/).some(w => w.length > 2 && rawH.includes(w))) return 25;
  return 0;
};

// ═══════════════════════════════════════════════════════════════════════════════
// ALGORITHM 1 — matchCandidatesToJob
// Recruiter view: "show me the best candidates for this job."
// 12 scoring vectors with full transparency via matchInsights.
// ═══════════════════════════════════════════════════════════════════════════════
export function matchCandidatesToJob(job, candidates) {
  const jobSkills  = toSkillArr(job.skills);
  const expRange   = parseExpRange(job.experience || '');
  const jobLoc     = normalizeTech(job.location || '');
  const jobTitle   = normalizeTech(job.title || '');
  const jobUrgency = job.urgency || '';
  const jobMaxCTC  = job.ctcMax || job.maxCTC || job.salaryMax || '';

  // Detect what domain(s) this job belongs to
  const jobDomains = Object.entries(SKILL_DOMAINS)
    .filter(([, skills]) => jobSkills.some(js => skills.includes(js)))
    .map(([d]) => d);

  const jobSeniority = detectSeniority(job.title, expRange?.min);
  const jobSeniorityOrder = SENIORITY_ORDER[jobSeniority] ?? 2;

  return candidates.map(c => {
    const candSkills   = toSkillArr(c.skills);
    const candLoc      = normalizeTech(c.location || '');
    const candPrefLoc  = normalizeTech(c.preferredLocation || '');
    const candTitle    = normalizeTech(c.title || c.currentTitle || c.currentRole || '');
    const candExp      = parseFloat(c.experience || 0);
    const candSeniority = detectSeniority(c.title, candExp);
    const candSeniorityOrder = SENIORITY_ORDER[candSeniority] ?? 2;
    const insights = [];

    // ── V1. Skill Match (40 pts) ────────────────────────────────────────────
    let matchedWeight = 0, totalWeight = 0;
    const highlights = [];
    const missingSkills = [];

    jobSkills.forEach(js => {
      const weight = TECH_WEIGHTS[js] || 1.0;
      totalWeight += weight;
      const hit = candSkills.some(cs =>
        cs === js || cs.includes(js) || js.includes(cs) ||
        (SKILL_SYNONYMS[cs] === js) ||
        (SKILL_SYNONYMS[js] && candSkills.includes(SKILL_SYNONYMS[js]))
      );
      if (hit) {
        matchedWeight += weight;
        if (highlights.length < 5) highlights.push(js.charAt(0).toUpperCase() + js.slice(1));
      } else {
        if (missingSkills.length < 3) missingSkills.push(js.charAt(0).toUpperCase() + js.slice(1));
      }
    });

    // Depth bonus: candidate has in-demand skills beyond the JD
    const extraDemandedSkills = candSkills.filter(cs => !jobSkills.includes(cs) && TECH_WEIGHTS[cs] >= 1.3).length;
    const depthBonus = Math.min(4, extraDemandedSkills * 1.2);
    const skillScore = totalWeight > 0 ? Math.min(40, (matchedWeight / totalWeight) * 40 + depthBonus) : 18;
    const skillPct   = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;

    if (highlights.length > 0)
      insights.push({ vector: 'Skills', signal: `Matched ${highlights.length}/${jobSkills.length} required skills: ${highlights.join(', ')}`, score: Math.round(skillScore) });
    if (missingSkills.length > 0)
      insights.push({ vector: 'Skills Gap', signal: `Missing: ${missingSkills.join(', ')}`, score: 0 });

    // ── V2. Experience Calibration (18 pts) ────────────────────────────────
    let expScore = 9;
    let expInsight = '';
    if (expRange) {
      if (candExp >= expRange.min && candExp <= expRange.max + 1) {
        expScore = 18;
        expInsight = `${candExp}y — perfectly calibrated (${expRange.min}-${expRange.max}y required)`;
      } else if (candExp > expRange.max + 1) {
        const over = Math.round(candExp - expRange.max);
        expScore = Math.max(6, 18 - over * 2);
        expInsight = `${candExp}y — ${over}y overqualified. Possible retention risk.`;
      } else {
        const under = Math.round(expRange.min - candExp);
        expScore = Math.max(0, 18 - under * 4);
        expInsight = `${candExp}y — ${under}y short of minimum ${expRange.min}y. High-growth candidate.`;
      }
    } else {
      expInsight = `${candExp}y experience (no requirement specified)`;
    }
    insights.push({ vector: 'Experience', signal: expInsight, score: Math.round(expScore) });

    // ── V3. Location Compatibility (8 pts) ─────────────────────────────────
    let locScore = 3;
    let locInsight = '';
    const remoteOk = jobLoc.includes('remote') || candLoc.includes('remote') || candPrefLoc.includes('remote');
    const CITY_STATE = { 'hyderabad':'telangana','bangalore':'karnataka','mumbai':'maharashtra','pune':'maharashtra','chennai':'tamilnadu','delhi':'ncr','noida':'ncr','gurgaon':'ncr' };
    if (remoteOk) {
      locScore = 8; locInsight = 'Remote-compatible — open to any location';
    } else if (jobLoc && (jobLoc.includes(candLoc) || candLoc.includes(jobLoc) || candPrefLoc.includes(jobLoc))) {
      locScore = 8; locInsight = 'Location is an exact match';
    } else if (jobLoc && candLoc && CITY_STATE[jobLoc] === CITY_STATE[candLoc]) {
      locScore = 5; locInsight = 'Same metro region — relocation minimal';
    } else if (jobLoc && candLoc) {
      locInsight = `Candidate in ${c.location || '?'}, job in ${job.location || '?'} — relocation required`;
    }
    insights.push({ vector: 'Location', signal: locInsight, score: locScore });

    // ── V4. Role Title Fit (10 pts) ─────────────────────────────────────────
    let titleScore = 3;
    let titleInsight = '';
    if (jobTitle && candTitle) {
      if (candTitle === jobTitle || candTitle.includes(jobTitle) || jobTitle.includes(candTitle)) {
        titleScore = 10; titleInsight = 'Title is a direct match';
      } else {
        const jWords = jobTitle.split(/\s+/).filter(w => w.length > 2);
        const matches = jWords.filter(w => candTitle.includes(w) || candTitle.includes(stem(w)) || stem(candTitle).includes(stem(w)));
        titleScore = Math.min(8, 3 + (matches.length / Math.max(1, jWords.length)) * 7);
        titleInsight = matches.length > 0
          ? `Partial title match on: ${matches.join(', ')}`
          : 'Different role title — transferable skills may qualify';
      }
    }
    insights.push({ vector: 'Role Title', signal: titleInsight || 'No title information', score: Math.round(titleScore) });

    // ── V5. Career Level Intelligence (8 pts) — NEW ─────────────────────────
    const levelDiff = Math.abs(candSeniorityOrder - jobSeniorityOrder);
    let levelScore = 0;
    let levelInsight = '';
    if (levelDiff === 0) {
      levelScore = 8; levelInsight = `Seniority match — both ${candSeniority} level`;
    } else if (levelDiff === 1) {
      levelScore = 5;
      const dir = candSeniorityOrder > jobSeniorityOrder ? 'overqualified' : 'growth opportunity';
      levelInsight = `One seniority level apart (${candSeniority} vs ${jobSeniority} required) — ${dir}`;
    } else if (levelDiff === 2) {
      levelScore = 2; levelInsight = `Significant seniority gap (${candSeniority} vs ${jobSeniority})`;
    } else {
      levelScore = 0; levelInsight = `Major seniority mismatch`;
    }
    insights.push({ vector: 'Career Level', signal: levelInsight, score: levelScore });

    // ── V6. Skill Domain Coverage (4 pts) — NEW ──────────────────────────────
    let domainScore = 0;
    let domainInsight = '';
    if (jobDomains.length > 0) {
      const coveredDomains = jobDomains.filter(d => SKILL_DOMAINS[d]?.some(s => candSkills.includes(s)));
      domainScore = Math.round((coveredDomains.length / jobDomains.length) * 4);
      domainInsight = coveredDomains.length === jobDomains.length
        ? `Full domain coverage across ${coveredDomains.join(', ')}`
        : `Covers ${coveredDomains.length}/${jobDomains.length} required domains (${coveredDomains.join(', ') || 'none'})`;
    }
    insights.push({ vector: 'Domain Coverage', signal: domainInsight || 'Domain not identified', score: domainScore });

    // ── V7. CTC / Budget Fit (7 pts) ───────────────────────────────────────
    const ctcScore   = ctcFitScore(jobMaxCTC, c.expectedCTC || c.currentCTC || '');
    const candCTC    = parseCTC(c.expectedCTC || c.currentCTC || '');
    const jobMaxNum  = parseCTC(jobMaxCTC);
    const ctcInsight = !candCTC ? 'CTC not specified — check during interview' :
                       !jobMaxNum ? 'Budget not disclosed' :
                       ctcScore === 8 ? `₹${candCTC}L expected — within budget` :
                       ctcScore === 4 ? `₹${candCTC}L expected — negotiable (${Math.round((candCTC / jobMaxNum - 1) * 100)}% above budget)` :
                       `₹${candCTC}L expected — significantly above budget`;
    insights.push({ vector: 'CTC Fit', signal: ctcInsight, score: ctcScore });

    // ── V8. Portfolio / Activity Signals (4 pts) — NEW ──────────────────────
    const portScore   = portfolioBonus(c);
    const portInsight = portScore >= 4 ? 'Strong online presence (LinkedIn + portfolio)' :
                        portScore >= 2 ? 'Partial online presence (LinkedIn or portfolio)' :
                        'No verified online presence found';
    insights.push({ vector: 'Portfolio', signal: portInsight, score: portScore });

    // ── V9. Completeness (3 pts) ────────────────────────────────────────────
    const complScore = Math.round((completenessScore(c) / 10) * 3);

    // ── V10. Recency / Availability Signal (3 pts) ──────────────────────────
    const recency     = recencyBoost(c);
    const recencyNorm = Math.min(3, recency * 0.6);

    // ── V11. Notice Period (penalty) ────────────────────────────────────────
    const penalty = noticePenalty(jobUrgency, c.noticePeriod || c.availability || '');
    if (penalty < 0) {
      insights.push({ vector: 'Notice Period', signal: `Long notice period may not fit urgency level`, score: penalty });
    }

    // ── V12. Cross-Skill Synergy Bonus ───────────────────────────────────────
    // Extra points if candidate has all skills from a critical job cluster
    let synergyBonus = 0;
    if (jobSkills.length >= 3) {
      const skillMatchPct = totalWeight > 0 ? matchedWeight / totalWeight : 0;
      if (skillMatchPct >= 0.85) { synergyBonus = 4; insights.push({ vector: 'Synergy', signal: 'Covers 85%+ of required skill stack — highly deployable from day 1', score: 4 }); }
      else if (skillMatchPct >= 0.70) { synergyBonus = 2; }
    }

    // ── Final Score ──────────────────────────────────────────────────────────
    const rawScore  = skillScore + expScore + locScore + titleScore + levelScore + domainScore + ctcScore + portScore + complScore + recencyNorm + penalty + synergyBonus;
    const matchScore = Math.round(Math.min(99, Math.max(1, rawScore)));
    const recommendation = getRecommendation(matchScore);
    const confidenceLevel = getConfidence(job, c);

    // ── Match Vector (breakdown by dimension) ────────────────────────────────
    const matchVector = {
      skills      : Math.round(skillScore),
      experience  : Math.round(expScore),
      location    : locScore,
      title       : Math.round(titleScore),
      careerLevel : levelScore,
      domain      : domainScore,
      ctcFit      : ctcScore,
      portfolio   : portScore,
      completeness: complScore,
      recency     : Math.round(recencyNorm),
      synergy     : synergyBonus,
    };

    return {
      candidateId      : c._id || c.id,
      matchScore,
      recommendation,
      confidenceLevel,
      matchVector,
      matchInsights    : insights,
      highlights,
      missingSkills,
      reasoning        : insights.filter(i => i.score > 0).slice(0, 3).map(i => i.signal).join(' · '),
      candidate        : c,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ALGORITHM 2 — matchJobsToCandidate
// Candidate view: "show me the jobs that fit my profile best."
// 10 scoring vectors including job freshness and career growth.
// ═══════════════════════════════════════════════════════════════════════════════
export function matchJobsToCandidate(candidate, jobs, query = '') {
  const candSkills = toSkillArr(candidate.skills);
  const candLoc    = normalizeTech(candidate.location || '');
  const candTitle  = normalizeTech(candidate.title || candidate.currentTitle || '');
  const candExp    = parseFloat(candidate.experience || 0);
  const candCTC    = parseCTC(candidate.expectedCTC || '');
  const candSeniority = detectSeniority(candidate.title, candExp);
  const candOrder  = SENIORITY_ORDER[candSeniority] ?? 2;
  const q          = normalizeTech(query);

  return jobs.map(j => {
    const jobSkills  = toSkillArr(j.skills);
    const expRange   = parseExpRange(j.experience || '');
    const jobLoc     = normalizeTech(j.location || '');
    const jobTitle   = normalizeTech(j.title || '');
    const insights   = [];
    const highlights = [];

    // ── V1. Skill Match (38 pts) ────────────────────────────────────────────
    let matchedWeight = 0, totalWeight = 0;
    jobSkills.forEach(js => {
      const weight = TECH_WEIGHTS[js] || 1.0;
      totalWeight += weight;
      if (candSkills.some(cs => cs === js || cs.includes(js) || js.includes(cs) || SKILL_SYNONYMS[cs] === js)) {
        matchedWeight += weight;
        if (highlights.length < 4) highlights.push(js.charAt(0).toUpperCase() + js.slice(1));
      }
    });
    const skillScore = totalWeight > 0 ? (matchedWeight / totalWeight) * 38 : 16;
    if (highlights.length > 0) insights.push({ vector: 'Skills', signal: `${highlights.length} matching skills: ${highlights.join(', ')}`, score: Math.round(skillScore) });

    // ── V2. Experience Fit (15 pts) ─────────────────────────────────────────
    let expScore = 8;
    if (expRange) {
      if (candExp >= expRange.min && candExp <= expRange.max + 1) expScore = 15;
      else expScore = Math.max(0, 15 - Math.abs(candExp - expRange.min) * 3);
    }

    // ── V3. Location (10 pts) ───────────────────────────────────────────────
    const remoteOk  = jobLoc.includes('remote') || candLoc.includes('remote');
    const candPref  = normalizeTech(candidate.preferredLocation || '');
    const locScore  = remoteOk ? 10 :
                      (jobLoc && (jobLoc.includes(candLoc) || candLoc.includes(jobLoc) || candPref.includes(jobLoc))) ? 10 : 3;

    // ── V4. Role Title Alignment (15 pts) ───────────────────────────────────
    let titleScore = 4;
    if (jobTitle && candTitle) {
      if (candTitle.includes(jobTitle) || jobTitle.includes(candTitle)) titleScore = 15;
      else {
        const jWords = jobTitle.split(/\s+/).filter(w => w.length > 2);
        const hits = jWords.filter(w => candTitle.includes(w) || candTitle.includes(stem(w)));
        titleScore = Math.min(12, 4 + (hits.length / Math.max(1, jWords.length)) * 8);
      }
    }

    // ── V5. Career Growth Signal (8 pts) — NEW ──────────────────────────────
    const jobSeniority = detectSeniority(j.title, expRange?.min);
    const jobOrder = SENIORITY_ORDER[jobSeniority] ?? 2;
    const levelDiff = jobOrder - candOrder;
    let growthScore = 0, growthInsight = '';
    if (levelDiff === 0)  { growthScore = 6; growthInsight = 'Lateral move — stable career progression'; }
    else if (levelDiff === 1) { growthScore = 8; growthInsight = '⬆️ One step up — ideal career growth'; }
    else if (levelDiff === 2) { growthScore = 4; growthInsight = 'Stretch role — accelerated growth potential'; }
    else if (levelDiff < 0)   { growthScore = 2; growthInsight = 'Step down — may affect career trajectory'; }
    if (growthInsight) insights.push({ vector: 'Career Growth', signal: growthInsight, score: growthScore });

    // ── V6. Job Freshness (6 pts) — NEW ─────────────────────────────────────
    const freshnessScore = jobFreshnessBonus(j);
    const daysOld = j.createdAt ? Math.round((Date.now() - new Date(j.createdAt).getTime()) / 86400000) : null;
    const freshInsight = daysOld === null ? 'Posting date unknown' :
                         daysOld < 3   ? 'Just posted — apply immediately' :
                         daysOld < 7   ? `Posted ${daysOld} days ago — still fresh` :
                         daysOld < 30  ? `Posted ${daysOld} days ago` :
                         `Posted ${daysOld} days ago — competition may be high`;
    insights.push({ vector: 'Job Freshness', signal: freshInsight, score: freshnessScore });

    // ── V7. Salary Alignment (6 pts) — NEW ──────────────────────────────────
    let salaryScore = 3;
    const jobMin = parseCTC(j.salaryMin || j.ctcMin || '');
    const jobMax = parseCTC(j.salaryMax || j.ctcMax || j.salary || '');
    if (candCTC && jobMax) {
      if (candCTC <= jobMax)                    salaryScore = 6;
      else if (candCTC <= jobMax * 1.1)         salaryScore = 4;
      else                                      salaryScore = 1;
    }

    // ── Query Boost (search use-case) ───────────────────────────────────────
    let qBonus = 0;
    if (q) {
      const jTitleN  = normalizeTech(j.title);
      const jSkillsN = toSkillArr(j.skills).join(' ');
      const jDescN   = normalizeTech(j.description || '');
      const jCoN     = normalizeTech(j.companyName || j.company || '');
      const searchable = `${jTitleN} ${jSkillsN} ${jDescN} ${jCoN}`;
      const TECH_MAP = {
        'dotnet': ['.net','dotnet','csharp','c#'],'.net':['.net','dotnet','csharp'],
        'react':['react','reactjs','nextjs','frontend'],'node':['node','nodejs','express','backend'],
        'java':['java','spring','springboot'],'python':['python','django','flask','fastapi','ml','data'],
        'sql':['sql','postgres','mysql','mariadb','mssql'],'c#':['c#','csharp','.net','asp.net'],
      };
      const keywords = q.split(/\s+/).filter(k => k.length > 1);
      if (keywords.length > 0) {
        const matches = keywords.filter(kw => {
          const variants = TECH_MAP[kw] || [kw, SKILL_SYNONYMS[kw]].filter(Boolean);
          return variants.some(v => searchable.includes(v));
        });
        if (matches.length > 0) {
          const ratio = matches.length / keywords.length;
          qBonus = matches.some(m => jTitleN.includes(m)) ? 50 + ratio * 20 :
                   matches.some(m => jSkillsN.includes(m)) ? 40 + ratio * 20 :
                   30 + ratio * 20;
        } else {
          const raw = `${j.title} ${j.companyName || j.company} ${(j.skills||[]).join(' ')} ${j.description||''}`.toLowerCase();
          if (raw.includes(query.toLowerCase().trim())) qBonus = 20;
        }
      }
      if (qBonus === 0) return null;
    }

    const baseScore  = skillScore + expScore + locScore + titleScore + growthScore + freshnessScore + salaryScore;
    const matchScore = q
      ? Math.min(100, Math.round((baseScore * 0.5) + qBonus))
      : Math.round(Math.min(99, baseScore));

    const recommendation = getRecommendation(matchScore);
    const confidenceLevel = getConfidence(j, candidate);

    return {
      jobId            : j._id || j.id,
      matchScore,
      recommendation,
      confidenceLevel,
      matchInsights    : insights,
      reasoning        : highlights.length > 0 ? `${highlights.length} skill match — ${recommendation.toLowerCase()}. ${freshInsight}` : recommendation,
      highlights,
      job              : j,
    };
  }).filter(Boolean).sort((a, b) => b.matchScore - a.matchScore);
}

// ═══════════════════════════════════════════════════════════════════════════════
// filterCandidates — Recruiter Talent Pool search (unchanged, server-side)
// ═══════════════════════════════════════════════════════════════════════════════
export function filterCandidates(candidates, filters) {
  const { designation, skills, location, expMin, expMax, minCTC, maxCTC, availability } = filters;

  return candidates.map(c => {
    let score = 0;

    if (designation) {
      const haystack = `${c.title || ''} ${c.currentRole || ''} ${c.currentTitle || ''}`;
      const s = genericSearchMatch(haystack, designation);
      if (s === 0) return null;
      score += (s / 100) * 40;
    } else score += 40;

    if (skills) {
      const skillTerms    = skills.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
      const candSkillStr  = toSkillArr(c.skills).join(' ');
      const skillMatches  = skillTerms.map(term => genericSearchMatch(candSkillStr, term));
      if (skillMatches.every(m => m === 0)) return null;
      score += (skillMatches.reduce((a, b) => a + b, 0) / skillMatches.length / 100) * 40;
    } else score += 40;

    if (location) {
      const candLoc = normalizeTech(c.location || '');
      const prefLoc = normalizeTech(c.preferredLocation || '');
      const locQ    = normalizeTech(location);
      const remoteOk = candLoc.includes('remote') || prefLoc.includes('remote') || locQ.includes('remote');
      if (!remoteOk && !candLoc.includes(locQ) && !prefLoc.includes(locQ)) return null;
      score += 10;
    } else score += 10;

    const candExp = parseFloat(c.experience || 0);
    if (expMin && candExp < parseFloat(expMin)) return null;
    if (expMax && candExp > parseFloat(expMax)) return null;

    const candCTC = parseCTC(c.expectedCTC) || 0;
    if (minCTC && candCTC < parseFloat(minCTC)) return null;
    if (maxCTC && candCTC > parseFloat(maxCTC)) return null;

    if (availability) {
      const avail = normalizeTech(c.availability || c.noticePeriod || '');
      if (!avail.includes(normalizeTech(availability))) return null;
    }

    score += completenessScore(c) * 0.5;
    score += recencyBoost(c) * 0.5;

    return { ...c, _searchScore: Math.round(score) };
  }).filter(Boolean).sort((a, b) => b._searchScore - a._searchScore);
}

// ═══════════════════════════════════════════════════════════════════════════════
// parseJD — Extract structured fields from raw JD text (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════
export function parseJD(text) {
  const lines  = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const result = {
    title: '', location: '', skills: '', experience: '',
    description: text?.slice(0, 2000),
    salary: '', department: '', education: '',
    employmentType: 'Full-Time', workMode: 'Onsite',
  };
  if (!lines.length) return result;
  if (lines[0].length < 60) result.title = lines[0];

  const content = text.toLowerCase();
  const expMatch = text.match(/(\d+)\s*(?:-|–|to)\s*(\d+)\s*(?:years?|yrs?|yexp)/i)
                || text.match(/(\d+)\+\s*(?:years?|yrs?|yexp)/i);
  if (expMatch) result.experience = expMatch[0];

  const allTech = [...Object.keys(TECH_WEIGHTS), 'communication', 'leadership', 'agile', 'scrum', 'jira'];
  const foundSkills = allTech.filter(t => content.includes(t));
  if (foundSkills.length) result.skills = foundSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');

  const locs = ['Hyderabad','Bangalore','Mumbai','Pune','Delhi','Noida','Gurgaon','Chennai','Kolkata','Ahmedabad','Remote'];
  const foundLoc = locs.find(l => content.includes(l.toLowerCase()));
  if (foundLoc) result.location = foundLoc;

  if (content.includes('contract'))       result.employmentType = 'Contract';
  else if (content.includes('intern'))    result.employmentType = 'Internship';
  else if (content.includes('freelance')) result.employmentType = 'Freelance';

  if (content.includes('remote') || content.includes('work from home') || content.includes('wfh')) result.workMode = 'Remote';
  else if (content.includes('hybrid')) result.workMode = 'Hybrid';

  const salMatch = text.match(/(?:₹|INR|Rs\.?)\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(?:LPA|L|Lakh)/i)
                 || text.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(?:LPA|L|Lakh)/i);
  if (salMatch) result.salary = `${salMatch[1]}-${salMatch[2]} LPA`;

  return result;
}
