// ── TalentNest Smart Matching Engine ─────────────────────────────────────────
// Naukri-inspired pre-AI deterministic matching. Covers skill overlap (TF-IDF
// weighted), experience calibration, location proximity, title similarity,
// notice period fit, CTC budget fit, profile completeness, and recency boost.

// ── Tier Weights: higher = more in-demand ─────────────────────────────────────
export const TECH_WEIGHTS = {
  // Tier 1 — Core frameworks / languages in highest demand
  'react': 1.6, 'node': 1.6, 'java': 1.5, 'python': 1.5, 'aws': 1.5, 'azure': 1.5,
  'kubernetes': 1.5, 'golang': 1.4, '.net': 1.4, 'ts': 1.4, 'js': 1.4,
  'angular': 1.4, 'vue': 1.4, 'spring': 1.4, 'django': 1.3, 'flutter': 1.3,
  // Tier 2 — Data / DB / DevOps
  'mongo': 1.2, 'postgres': 1.2, 'sql': 1.2, 'redis': 1.2, 'docker': 1.2,
  'kafka': 1.3, 'elastic': 1.2, 'terraform': 1.3, 'jenkins': 1.1, 'ansible': 1.1,
  // Tier 3 — Widely used but less differentiated
  'html': 0.8, 'css': 0.8, 'git': 0.7, 'linux': 0.9, 'bash': 0.9,
};

// ── Synonym / alias expansion map ─────────────────────────────────────────────
const SKILL_SYNONYMS = {
  'reactjs': 'react', 'react.js': 'react', 'nextjs': 'react',
  'nodejs': 'node', 'node.js': 'node', 'expressjs': 'node', 'express.js': 'node',
  'mongodb': 'mongo', 'mongoose': 'mongo',
  'postgresql': 'postgres', 'mysql': 'sql', 'mssql': 'sql', 'mariadb': 'sql',
  'javascript': 'js', 'ecmascript': 'js', 'es6': 'js', 'es2015': 'js',
  'typescript': 'ts',
  'springboot': 'spring', 'spring boot': 'spring', 'spring mvc': 'spring',
  'amazon web services': 'aws', 'gcp': 'aws', 'google cloud': 'aws',
  'microsoft azure': 'azure',
  'dotnet': '.net', 'dot net': '.net', '.net core': '.net', 'asp.net': '.net',
  'c#': '.net', 'csharp': '.net',
  'golang': 'golang', 'go lang': 'golang',
  'flutter': 'flutter', 'dart': 'flutter',
  'k8s': 'kubernetes',
  'elasticsearch': 'elastic', 'elk': 'elastic',
  'ci/cd': 'jenkins', 'gitlab ci': 'jenkins', 'github actions': 'jenkins',
  'vuejs': 'vue', 'vue.js': 'vue',
  'angularjs': 'angular', 'angular.js': 'angular',
  'machine learning': 'python', 'ml': 'python', 'deep learning': 'python', 'nlp': 'python',
  'data science': 'python', 'pandas': 'python', 'numpy': 'python',
  'django rest framework': 'django', 'flask': 'django',
};

// ── Stem words for partial matching (developer→develop, developing→develop) ───
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

// ── Primary normalizer ─────────────────────────────────────────────────────────
export const normalizeTech = s => {
  if (!s) return '';
  let v = String(s).toLowerCase().trim();
  // Apply synonym map first
  if (SKILL_SYNONYMS[v]) return SKILL_SYNONYMS[v];
  // Common replacements
  v = v
    .replace(/\.net\s*core/g, '.net').replace(/dot\s*net/g, '.net').replace(/dotnet/g, '.net')
    .replace(/react\.?js/g, 'react').replace(/node\.?js/g, 'node')
    .replace(/mongo\.?db/g, 'mongo').replace(/javascript/g, 'js').replace(/typescript/g, 'ts')
    .replace(/postgresql/g, 'postgres').replace(/springboot/g, 'spring')
    .replace(/[^a-z0-9.+#+\s]/g, ' ').replace(/\s+/g, ' ').trim();
  // Re-check synonyms after normalization
  return SKILL_SYNONYMS[v] || v;
};

export const toSkillArr = skills => {
  if (Array.isArray(skills)) return skills.map(s => normalizeTech(s)).filter(Boolean);
  if (typeof skills === 'string') return skills.split(/[,;|\/]/).map(s => normalizeTech(s.trim())).filter(Boolean);
  return [];
};

// ── Parse experience requirement string ("3-5 years", "5+ years") ─────────────
export function parseExpRange(str) {
  if (!str) return null;
  const m = String(str).match(/(\d+)\s*[-–to]+\s*(\d+)/) || String(str).match(/(\d+)\+/);
  if (!m) return null;
  const min = parseInt(m[1]);
  const max = m[2] ? parseInt(m[2]) : min + 3;
  return { min, max };
}

// ── Parse CTC string ("10 LPA", "10-15 LPA", "10L") → number in LPA ──────────
function parseCTC(str) {
  if (!str) return null;
  const m = String(str).match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

// ── Profile completeness score 0-10 ───────────────────────────────────────────
function completenessScore(c) {
  let s = 0;
  if (c.name)        s += 1;
  if (c.title)       s += 1.5;
  if (c.skills && (Array.isArray(c.skills) ? c.skills.length : String(c.skills).split(',').length) >= 3) s += 2;
  if (c.experience)  s += 1;
  if (c.location)    s += 1;
  if (c.summary && c.summary.length > 50) s += 1.5;
  if (c.phone)       s += 0.5;
  if (c.linkedinUrl || c.github || c.portfolio) s += 0.5;
  return Math.min(10, s);
}

// ── Recency boost: more active / recently updated candidates score higher ──────
function recencyBoost(c) {
  const last = c.updatedAt || c.createdAt;
  if (!last) return 0;
  const daysAgo = (Date.now() - new Date(last).getTime()) / 86400000;
  if (daysAgo < 7)   return 5;
  if (daysAgo < 30)  return 3;
  if (daysAgo < 90)  return 1;
  return 0;
}

// ── Notice period penalty: urgent roles penalize long notice periods ───────────
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

// ── CTC fit score 0-8 ─────────────────────────────────────────────────────────
function ctcFitScore(jobMaxCTC, candidateExpected) {
  const jobMax = parseCTC(jobMaxCTC);
  const candExp = parseCTC(candidateExpected);
  if (!jobMax || !candExp) return 4; // unknown — neutral
  if (candExp <= jobMax) return 8;   // within budget
  if (candExp <= jobMax * 1.15) return 4; // slightly over — negotiable
  return 0; // way over budget
}

/**
 * genericSearchMatch — Multi-strategy keyword match. Returns 0-100.
 * Strategy: direct match → synonym expansion → stemmed match → partial word match → substring fallback.
 */
export const genericSearchMatch = (haystack, query) => {
  if (!query) return 100;
  const h = normalizeTech(haystack);
  const q = normalizeTech(query);

  // 1. Direct normalized match
  if (h === q || h.includes(q)) return 100;

  // 2. Synonym expansion on query
  const qSyn = SKILL_SYNONYMS[q];
  if (qSyn && h.includes(qSyn)) return 95;

  // 3. Multi-word partial (TF-IDF-like)
  const words = q.split(/\s+/).filter(w => w.length > 1);
  if (words.length > 1) {
    const matchCount = words.filter(w => h.includes(w) || (SKILL_SYNONYMS[w] && h.includes(SKILL_SYNONYMS[w]))).length;
    if (matchCount === words.length) return 90;
    if (matchCount > 0) return Math.round((matchCount / words.length) * 70);
  }

  // 4. Stemmed match
  const qStem = stem(q);
  const hWords = h.split(/\s+/);
  if (qStem.length > 3 && hWords.some(w => stem(w) === qStem || w.startsWith(qStem))) return 60;

  // 5. Raw substring fallback
  const rawH = String(haystack).toLowerCase();
  const rawQ = String(query).toLowerCase().trim();
  if (rawH.includes(rawQ)) return 45;

  // 6. Individual word fallback
  if (rawQ.split(/\s+/).some(w => w.length > 2 && rawH.includes(w))) return 25;

  return 0;
};

/**
 * matchCandidatesToJob — Full Naukri-style deterministic matching engine.
 * Weights: Skills 45% | Experience 20% | Location 8% | Title 12% |
 *          CTC fit 8% | Notice period −penalty | Completeness 4% | Recency 3%
 */
export function matchCandidatesToJob(job, candidates) {
  const jobSkills  = toSkillArr(job.skills);
  const expRange   = parseExpRange(job.experience || '');
  const jobLoc     = normalizeTech(job.location || '');
  const jobTitle   = normalizeTech(job.title || '');
  const jobUrgency = job.urgency || '';
  const jobMaxCTC  = job.ctcMax || job.maxCTC || job.salaryMax || '';

  return candidates.map(c => {
    const candSkills = toSkillArr(c.skills);
    const candLoc    = normalizeTech(c.location || '');
    const candPrefLoc = normalizeTech(c.preferredLocation || '');
    const candTitle  = normalizeTech(c.title || c.currentTitle || c.currentRole || '');
    const candExp    = parseFloat(c.experience || 0);

    // ── 1. Skill Match (45 pts max) ─────────────────────────────────────────
    let matchedWeight = 0;
    let totalWeight   = 0;
    const highlights  = [];

    jobSkills.forEach(js => {
      const weight = TECH_WEIGHTS[js] || 1.0;
      totalWeight += weight;
      const hit = candSkills.some(cs =>
        cs === js ||
        cs.includes(js) || js.includes(cs) ||
        (SKILL_SYNONYMS[cs] && SKILL_SYNONYMS[cs] === js) ||
        (SKILL_SYNONYMS[js] && candSkills.includes(SKILL_SYNONYMS[js]))
      );
      if (hit) {
        matchedWeight += weight;
        if (highlights.length < 4) highlights.push(js.charAt(0).toUpperCase() + js.slice(1));
      }
    });

    // Bonus: candidate has skills beyond the JD (shows depth)
    const extraSkills = candSkills.filter(cs => !jobSkills.includes(cs) && TECH_WEIGHTS[cs] >= 1.2).length;
    const depthBonus = Math.min(5, extraSkills * 1.5);

    const skillScore = totalWeight > 0 ? Math.min(45, (matchedWeight / totalWeight) * 45 + depthBonus) : 20;

    // ── 2. Experience Calibration (20 pts max) ──────────────────────────────
    let expScore = 10; // default unknown
    if (expRange) {
      if (candExp >= expRange.min && candExp <= expRange.max + 1) {
        expScore = 20; // perfect fit
      } else if (candExp > expRange.max + 1) {
        expScore = Math.max(8, 20 - (candExp - expRange.max) * 2); // overqualified
      } else {
        expScore = Math.max(0, 20 - (expRange.min - candExp) * 4); // underqualified
      }
    }

    // ── 3. Location (8 pts max) ─────────────────────────────────────────────
    let locScore = 3;
    const remoteOk = jobLoc.includes('remote') || candLoc.includes('remote') || candPrefLoc.includes('remote');
    if (remoteOk) {
      locScore = 8;
    } else if (jobLoc && (jobLoc.includes(candLoc) || candLoc.includes(jobLoc) || candPrefLoc.includes(jobLoc))) {
      locScore = 8;
    } else if (jobLoc && candLoc) {
      // City to state fallback — e.g. "hyderabad" vs "telangana"
      const cityStateMap = { 'hyderabad': 'telangana', 'bangalore': 'karnataka', 'mumbai': 'maharashtra', 'pune': 'maharashtra', 'chennai': 'tamilnadu', 'delhi': 'ncr', 'noida': 'ncr', 'gurgaon': 'ncr' };
      const jState = cityStateMap[jobLoc] || jobLoc;
      const cState = cityStateMap[candLoc] || candLoc;
      if (jState === cState || jobLoc.includes(cState) || candLoc.includes(jState)) locScore = 5;
    }

    // ── 4. Title / Role Fit (12 pts max) ────────────────────────────────────
    let titleScore = 3;
    if (jobTitle && candTitle) {
      if (candTitle === jobTitle || candTitle.includes(jobTitle) || jobTitle.includes(candTitle)) {
        titleScore = 12;
      } else {
        const jWords = jobTitle.split(/\s+/).filter(w => w.length > 2);
        const stemMatch = jWords.filter(w => candTitle.includes(w) || candTitle.includes(stem(w)) || stem(candTitle).includes(stem(w)));
        titleScore = Math.min(10, 3 + (stemMatch.length / Math.max(1, jWords.length)) * 9);
      }
    }

    // ── 5. CTC Fit (8 pts max) ──────────────────────────────────────────────
    const ctcScore = ctcFitScore(jobMaxCTC, c.expectedCTC || c.currentCTC || '');

    // ── 6. Notice Period Penalty ────────────────────────────────────────────
    const penalty = noticePenalty(jobUrgency, c.noticePeriod || c.availability || '');

    // ── 7. Completeness Bonus (4 pts max) ───────────────────────────────────
    const complScore = (completenessScore(c) / 10) * 4;

    // ── 8. Recency Boost (3 pts max) ────────────────────────────────────────
    const recency = recencyBoost(c);

    const rawScore = skillScore + expScore + locScore + titleScore + ctcScore + complScore + recency + penalty;
    const matchScore = Math.round(Math.min(99, Math.max(1, rawScore)));

    // Reasoning
    const reasons = [];
    if (skillScore >= 35) reasons.push(`Strong skill alignment with ${highlights.length} matched technologies.`);
    else if (skillScore >= 20) reasons.push(`Partial skill match — ${highlights.join(', ') || 'some overlap'}.`);
    if (expScore >= 18) reasons.push(`Experience (${candExp}y) perfectly calibrated for this role.`);
    if (titleScore >= 10) reasons.push(`Current title closely matches the job requirement.`);
    if (remoteOk) reasons.push('Remote-compatible candidate.');
    if (ctcScore === 8) reasons.push('CTC expectation within budget.');
    if (penalty < -5) reasons.push('Long notice period — may not suit urgency level.');

    const recommendation =
      matchScore >= 85 ? 'Exceptional Match' :
      matchScore >= 70 ? 'Strong Match' :
      matchScore >= 50 ? 'Good Match' : 'Possible Match';

    return {
      candidateId: c._id || c.id,
      matchScore,
      recommendation,
      reasoning: reasons.length > 0 ? reasons.join(' ') : 'General compatibility based on profile and requirements.',
      highlights,
      candidate: c,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * matchJobsToCandidate — Match jobs to a given candidate profile.
 * Uses the same engine in reverse. Adds query-aware boost for search use-case.
 */
export function matchJobsToCandidate(candidate, jobs, query = '') {
  const candSkills = toSkillArr(candidate.skills);
  const candLoc    = normalizeTech(candidate.location || '');
  const candTitle  = normalizeTech(candidate.title || candidate.currentTitle || '');
  const candExp    = parseFloat(candidate.experience || 0);
  const q          = normalizeTech(query);

  return jobs.map(j => {
    const jobSkills = toSkillArr(j.skills);
    const expRange  = parseExpRange(j.experience || '');
    const jobLoc    = normalizeTech(j.location || '');
    const jobTitle  = normalizeTech(j.title || '');

    // ── Skill Score (40 pts) ─────────────────────────────────────────────────
    let matchedWeight = 0, totalWeight = 0;
    const highlights = [];
    jobSkills.forEach(js => {
      const weight = TECH_WEIGHTS[js] || 1.0;
      totalWeight += weight;
      if (candSkills.some(cs => cs === js || cs.includes(js) || js.includes(cs) || SKILL_SYNONYMS[cs] === js)) {
        matchedWeight += weight;
        if (highlights.length < 3) highlights.push(js.charAt(0).toUpperCase() + js.slice(1));
      }
    });
    const skillScore = totalWeight > 0 ? (matchedWeight / totalWeight) * 40 : 18;

    // ── Experience (18 pts) ──────────────────────────────────────────────────
    let expScore = 9;
    if (expRange) {
      if (candExp >= expRange.min && candExp <= expRange.max + 1) expScore = 18;
      else expScore = Math.max(0, 18 - Math.abs(candExp - expRange.min) * 3);
    }

    // ── Location (12 pts) ────────────────────────────────────────────────────
    const remoteOk = jobLoc.includes('remote') || candLoc.includes('remote');
    let locScore = remoteOk ? 12 : (jobLoc && candLoc && (jobLoc.includes(candLoc) || candLoc.includes(jobLoc))) ? 12 : 4;

    // ── Title (20 pts) ───────────────────────────────────────────────────────
    let titleScore = 5;
    if (jobTitle && candTitle) {
      if (candTitle.includes(jobTitle) || jobTitle.includes(candTitle)) titleScore = 20;
      else {
        const jWords = jobTitle.split(/\s+/).filter(w => w.length > 2);
        const hits = jWords.filter(w => candTitle.includes(w) || candTitle.includes(stem(w)));
        titleScore = Math.min(16, 5 + (hits.length / Math.max(1, jWords.length)) * 11);
      }
    }

    // ── Query Boost (up to +50 bonus, nullifies non-matching results) ────────
    let qBonus = 0;
    if (q) {
      const jTitleN = normalizeTech(j.title);
      const jSkillsN = toSkillArr(j.skills).join(' ');
      const jDescN  = normalizeTech(j.description || '');
      const jCoN    = normalizeTech(j.companyName || j.company || '');
      const searchable = `${jTitleN} ${jSkillsN} ${jDescN} ${jCoN}`;

      const keywords = q.split(/\s+/).filter(k => k.length > 1);
      if (keywords.length > 0) {
        const TECH_MAP = {
          'dotnet': ['.net', 'dotnet', 'csharp', 'c#'], '.net': ['.net', 'dotnet', 'csharp'],
          'react': ['react', 'reactjs', 'nextjs', 'frontend'],
          'node': ['node', 'nodejs', 'express', 'backend'],
          'java': ['java', 'spring', 'springboot', 'jvm'],
          'python': ['python', 'django', 'flask', 'fastapi', 'ml', 'data'],
          'sql': ['sql', 'postgres', 'mysql', 'mariadb', 'mssql'],
          'c#': ['c#', 'csharp', '.net', 'asp.net'], 'c++': ['c++', 'cpp'],
        };
        const matches = keywords.filter(kw => {
          const variants = TECH_MAP[kw] || [kw, SKILL_SYNONYMS[kw]].filter(Boolean);
          return variants.some(v => searchable.includes(v));
        });
        if (matches.length > 0) {
          const ratio = matches.length / keywords.length;
          const inTitle = matches.some(m => jTitleN.includes(m));
          const inSkill = matches.some(m => jSkillsN.includes(m));
          qBonus = inTitle ? 50 + ratio * 20 : inSkill ? 40 + ratio * 20 : 30 + ratio * 20;
        } else {
          // Raw fallback
          const raw = `${j.title} ${j.companyName || j.company} ${(j.skills || []).join(' ')} ${j.description || ''}`.toLowerCase();
          if (raw.includes(query.toLowerCase().trim())) qBonus = 20;
        }
      }
      if (qBonus === 0) return null;
    }

    const baseScore = skillScore + expScore + locScore + titleScore;
    const matchScore = q
      ? Math.min(100, Math.round((baseScore * 0.55) + qBonus))
      : Math.round(Math.min(99, baseScore));

    const recommendation = matchScore >= 80 ? 'Exceptional Match' : matchScore >= 60 ? 'Strong Match' : 'Good Match';

    return {
      jobId: j._id || j.id,
      matchScore,
      recommendation,
      reasoning: `${highlights.length} skill overlaps — ${recommendation.toLowerCase()}.`,
      highlights,
      job: j,
    };
  }).filter(Boolean).sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * filterCandidates — Recruiter Talent Pool search.
 * Uses multi-strategy scoring: exact → synonym → stem → partial → raw fallback.
 * Hard filters (exp range, CTC, location) eliminate non-matching candidates first.
 * Remaining candidates are soft-ranked by relevance.
 */
export function filterCandidates(candidates, filters) {
  const { designation, skills, location, expMin, expMax, minCTC, maxCTC, availability } = filters;

  return candidates.map(c => {
    let score = 0;

    // ── Designation search (40%) ────────────────────────────────────────────
    if (designation) {
      const haystack = `${c.title || ''} ${c.currentRole || ''} ${c.currentTitle || ''}`;
      const s = genericSearchMatch(haystack, designation);
      if (s === 0) return null;
      score += (s / 100) * 40;
    } else score += 40;

    // ── Skills search (40%) ─────────────────────────────────────────────────
    if (skills) {
      const skillTerms = skills.split(/[,;|]/).map(s => s.trim()).filter(Boolean);
      const candSkillStr = toSkillArr(c.skills).join(' ');
      const skillMatches = skillTerms.map(term => genericSearchMatch(candSkillStr, term));
      const avgMatch = skillMatches.reduce((a, b) => a + b, 0) / skillMatches.length;
      // Must match at least one skill term
      if (skillMatches.every(m => m === 0)) return null;
      score += (avgMatch / 100) * 40;
    } else score += 40;

    // ── Location (hard + soft) ──────────────────────────────────────────────
    if (location) {
      const candLoc  = normalizeTech(c.location || '');
      const prefLoc  = normalizeTech(c.preferredLocation || '');
      const locQ     = normalizeTech(location);
      const remoteOk = candLoc.includes('remote') || prefLoc.includes('remote') || locQ.includes('remote');
      if (!remoteOk && !candLoc.includes(locQ) && !prefLoc.includes(locQ)) return null;
      score += 10;
    } else score += 10;

    // ── Hard numeric constraints ────────────────────────────────────────────
    const candExp = parseFloat(c.experience || 0);
    if (expMin && candExp < parseFloat(expMin)) return null;
    if (expMax && candExp > parseFloat(expMax)) return null;

    const candCTC = parseCTC(c.expectedCTC) || 0;
    if (minCTC && candCTC < parseFloat(minCTC)) return null;
    if (maxCTC && candCTC > parseFloat(maxCTC)) return null;

    // ── Availability / notice period ────────────────────────────────────────
    if (availability) {
      const avail = normalizeTech(c.availability || c.noticePeriod || '');
      if (!avail.includes(normalizeTech(availability))) return null;
    }

    // ── Completeness + recency boost ────────────────────────────────────────
    score += completenessScore(c) * 0.5;
    score += recencyBoost(c) * 0.5;

    return { ...c, _searchScore: Math.round(score) };
  }).filter(Boolean).sort((a, b) => b._searchScore - a._searchScore);
}

/**
 * parseJD — Extract structured fields from raw job description text.
 */
export function parseJD(text) {
  const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
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

  // Extract skills from TECH_WEIGHTS keys + common non-tech skills
  const allTech = [...Object.keys(TECH_WEIGHTS), 'communication', 'leadership', 'agile', 'scrum', 'jira'];
  const foundSkills = allTech.filter(t => content.includes(t));
  if (foundSkills.length) result.skills = foundSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');

  const locs = ['Hyderabad', 'Bangalore', 'Mumbai', 'Pune', 'Delhi', 'Noida', 'Gurgaon', 'Chennai', 'Kolkata', 'Ahmedabad', 'Remote'];
  const foundLoc = locs.find(l => content.includes(l.toLowerCase()));
  if (foundLoc) result.location = foundLoc;

  if (content.includes('contract')) result.employmentType = 'Contract';
  else if (content.includes('intern')) result.employmentType = 'Internship';
  else if (content.includes('freelance')) result.employmentType = 'Freelance';

  if (content.includes('remote') || content.includes('work from home') || content.includes('wfh')) result.workMode = 'Remote';
  else if (content.includes('hybrid')) result.workMode = 'Hybrid';

  const salMatch = text.match(/(?:₹|INR|Rs\.?)\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(?:LPA|L|Lakh)/i)
                 || text.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(?:LPA|L|Lakh)/i);
  if (salMatch) result.salary = `${salMatch[1]}-${salMatch[2]} LPA`;

  return result;
}
