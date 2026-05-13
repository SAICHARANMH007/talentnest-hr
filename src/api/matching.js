// Tier 1: Core Languages/Frameworks (Highest Value)
export const TECH_WEIGHTS = {
  'react': 1.5, 'node': 1.5, 'java': 1.5, 'python': 1.5, 'aws': 1.5, 'azure': 1.5, 'kubernetes': 1.5,
  '.net': 1.4, 'golang': 1.4, 'ts': 1.4, 'js': 1.4, 'angular': 1.4, 'vue': 1.4,
  // Tier 2: Databases/Major Tools
  'mongo': 1.2, 'postgres': 1.2, 'sql': 1.2, 'redis': 1.2, 'docker': 1.2,
};

export const normalizeTech = s => String(s || '').toLowerCase().trim()
  .replace(/\.net\s*core/g, '.net')
  .replace(/dot\s*net/g, '.net')
  .replace(/dotnet/g, '.net')
  .replace(/react\.?js/g, 'react')
  .replace(/node\.?js/g, 'node')
  .replace(/mongo\.?db/g, 'mongo')
  .replace(/javascript/g, 'js')
  .replace(/typescript/g, 'ts')
  .replace(/postgresql/g, 'postgres')
  .replace(/springboot/g, 'spring')
  .replace(/[^a-z0-9.+#+]/g, ' '); // Keep dots for .net and #/+ for C#/C++

export const toSkillArr = skills => {
  if (Array.isArray(skills)) return skills.map(s => normalizeTech(s)).filter(Boolean);
  if (typeof skills === 'string') return skills.split(/[,;|]/).map(s => normalizeTech(s.trim())).filter(Boolean);
  return [];
};

/**
 * genericSearchMatch — Heuristic for multi-word, normalized keyword matching.
 * Returns a score from 0-100.
 */
export const genericSearchMatch = (haystack, query) => {
  if (!query) return 100;
  const q = normalizeTech(query);
  const h = normalizeTech(haystack);
  
  // 1. Direct Normalized Match
  if (h.includes(q)) return 100;

  // 2. Multi-word Partial Match (Classic Naukri Heuristic)
  const words = q.split(/\s+/).filter(w => w.length > 2);
  if (words.length > 1) {
    const matchCount = words.filter(w => h.includes(w)).length;
    if (matchCount > 0) {
      return (matchCount / words.length) * 80; // Max 80 for partial
    }
  }
  
  // 3. Raw Fallback for special chars or very short terms
  if (haystack.toLowerCase().includes(query.toLowerCase())) return 50;

  return 0;
};

/**
 * matchCandidatesToJob — Enhanced Deterministic Matching Engine
 */
export function matchCandidatesToJob(job, candidates) {
  const jobSkills = toSkillArr(job.skills);
  const expRange  = parseExpRange(job.experience || '');
  const jobLoc    = normalizeTech(job.location);
  const jobTitle  = normalizeTech(job.title);

  return candidates.map(c => {
    const candSkills = toSkillArr(c.skills);
    const candLoc    = normalizeTech(c.location);
    const candTitle  = normalizeTech(c.currentTitle || c.title);

    // 1. Intelligent Skill Match (Weight: 50%)
    let matchedWeight = 0;
    let totalWeight = 0;
    const highlights = [];

    jobSkills.forEach(js => {
      const weight = TECH_WEIGHTS[js] || 1.0;
      totalWeight += weight;
      if (candSkills.some(cs => cs === js || cs.includes(js) || js.includes(cs))) {
        matchedWeight += weight;
        if (highlights.length < 3) highlights.push(js.charAt(0).toUpperCase() + js.slice(1));
      }
    });

    const skillScore = totalWeight > 0 ? (matchedWeight / totalWeight) * 50 : 25;

    // 2. Experience Calibration (Weight: 25%)
    const candExp = parseFloat(c.experience || 0);
    let expScore = 0;
    if (expRange) {
      const diff = candExp - expRange.min;
      if (diff >= 0 && candExp <= expRange.max + 1) expScore = 25;
      else if (diff > 1) expScore = 20; // Overqualified
      else expScore = Math.max(0, 25 - Math.abs(diff) * 6);
    } else expScore = 15;

    // 3. Location & Availability (Weight: 10%)
    let locScore = 0;
    const isRemoteFriendly = jobLoc.includes('remote') || candLoc.includes('remote');
    if (isRemoteFriendly) locScore = 10;
    else if (jobLoc && candLoc && (jobLoc.includes(candLoc) || candLoc.includes(jobLoc))) locScore = 10;
    else locScore = 5;

    // 4. Role Fit (Weight: 15%)
    let titleScore = 0;
    const jWords = jobTitle.split(/\s+/).filter(w => w.length > 2);
    if (jobTitle && candTitle) {
      if (candTitle.includes(jobTitle) || jobTitle.includes(candTitle)) titleScore = 15;
      else {
        const matchCount = jWords.filter(w => candTitle.includes(w)).length;
        titleScore = (matchCount / Math.max(1, jWords.length)) * 12;
      }
    }

    const rawScore = skillScore + expScore + locScore + titleScore;
    const matchScore = Math.round(Math.min(99, rawScore)); // Caps at 99 for realism
    
    // Intelligent Reason Generation
    let reasons = [];
    if (matchedWeight / totalWeight > 0.7) reasons.push(`Strong alignment with ${jobSkills.length} required technologies.`);
    if (expScore === 25) reasons.push(`Experience level matches ideal profile (${expRange.min}-${expRange.max}y).`);
    if (titleScore >= 12) reasons.push(`Currently serving in a similar ${jWords?.[0] || 'technical'} role.`);
    if (isRemoteFriendly) reasons.push(`Compatible with remote-first workflow.`);

    const recommendation = matchScore >= 85 ? 'Exceptional Match' : matchScore >= 70 ? 'Strong Match' : matchScore >= 50 ? 'Good Match' : 'Possible Match';

    return { 
      candidateId: c._id || c.id, 
      matchScore, 
      recommendation, 
      reasoning: reasons.length > 0 ? reasons.join(' ') : 'Profile shows general compatibility with role requirements.',
      highlights, 
      candidate: c 
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

export function matchJobsToCandidate(candidate, jobs, query = '') {
  const candSkills = toSkillArr(candidate.skills);
  const candLoc    = normalizeTech(candidate.location);
  const candTitle  = normalizeTech(candidate.currentTitle || candidate.title);
  const q = normalizeTech(query);

  return jobs.map(j => {
    const jobSkills = toSkillArr(j.skills);
    const expRange  = parseExpRange(j.experience || '');
    const jobLoc    = normalizeTech(j.location);
    const jobTitle  = normalizeTech(j.title);

    // Skill Scoring
    let matchedWeight = 0;
    let totalWeight = 0;
    const highlights = [];
    jobSkills.forEach(js => {
      const weight = TECH_WEIGHTS[js] || 1.0;
      totalWeight += weight;
      if (candSkills.some(cs => cs === js || cs.includes(js) || js.includes(cs))) {
        matchedWeight += weight;
        if (highlights.length < 3) highlights.push(js.charAt(0).toUpperCase() + js.slice(1));
      }
    });

    let skillScore = totalWeight > 0 ? (matchedWeight / totalWeight) * 40 : 20;

    // Experience
    const candExp = parseFloat(candidate.experience || 0);
    let expScore = 0;
    if (expRange) {
      if (candExp >= expRange.min && candExp <= expRange.max + 1) expScore = 20;
      else expScore = Math.max(0, 20 - Math.abs(candExp - expRange.min) * 4);
    } else expScore = 10;

    // Location
    let locScore = (jobLoc.includes('remote') || candLoc.includes('remote')) ? 15 : (jobLoc && candLoc && jobLoc.includes(candLoc) ? 15 : 5);

    // Title
    let titleScore = (jobTitle && candTitle && (candTitle.includes(jobTitle) || jobTitle.includes(candTitle))) ? 25 : 5;

    // Global Deep Search Bonus (Naukri-style precision)
    let qBonus = 0;
    if (q) {
      const normalizedTitle = normalizeTech(j.title);
      const normalizedSkills = toSkillArr(j.skills).join(' ');
      const normalizedDesc = normalizeTech(j.description);
      const normalizedCompany = normalizeTech(j.companyName || j.company);
      const searchable = [normalizedTitle, normalizedSkills, normalizedDesc, normalizedCompany].join(' ');

      const keywords = q.split(/\s+/).filter(k => k.length > 1);
      if (keywords.length > 0) {
        const techMap = {
          'dotnet': ['.net', 'dot net', 'dotnet'],
          '.net': ['.net', 'dot net', 'dotnet'],
          'react': ['react', 'reactjs', 'nextjs'],
          'node': ['node', 'nodejs', 'express'],
          'java': ['java', 'spring'],
          'python': ['python', 'django', 'flask'],
          'sql': ['sql', 'postgres', 'mysql'],
          'c#': ['c#', 'csharp', '.net'],
          'c++': ['c++', 'cpp']
        };

        const matches = keywords.filter(kw => {
          const variants = techMap[kw] || [kw];
          return variants.some(v => searchable.includes(v));
        });

        if (matches.length > 0) {
          // Weighted bonus based on matches
          const matchRatio = matches.length / keywords.length;
          const hasTitleMatch = matches.some(m => normalizedTitle.includes(m));
          const hasSkillMatch = matches.some(m => normalizedSkills.includes(m));
          
          if (hasTitleMatch) qBonus = 40 + (matchRatio * 20);
          else if (hasSkillMatch) qBonus = 30 + (matchRatio * 20);
          else qBonus = 20 + (matchRatio * 20);
        } else {
          // 4. Raw Substring Fallback (matching Career Page behavior exactly)
          const rawHaystack = `${j.title} ${j.companyName || j.company} ${j.description} ${(j.skills || []).join(' ')}`.toLowerCase();
          const rawQ = query.toLowerCase();
          if (rawHaystack.includes(rawQ)) {
            qBonus = 15;
          }
        }
      }

      if (qBonus === 0) return null;
    }

    const baseScore = skillScore + expScore + locScore + titleScore;
    const matchScore = q ? Math.min(100, Math.round((baseScore * 0.6) + qBonus)) : Math.round(baseScore);
    
    const recommendation = matchScore >= 80 ? 'Exceptional Match' : matchScore >= 60 ? 'Strong Match' : 'Good Match';
    
    return { 
      jobId: j._id || j.id, 
      matchScore, 
      recommendation, 
      reasoning: `Matched via Smart Engine with ${highlights.length} key skill overlaps.`,
      highlights, 
      job: j 
    };
  }).filter(Boolean).sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * filterCandidates — Robust search and filtering for Recruiter Talent Pool.
 */
export function filterCandidates(candidates, filters) {
  const { designation, skills, location, expMin, expMax, minCTC, maxCTC, availability } = filters;
  
  return candidates.map(c => {
    let score = 0;
    let reasons = [];

    // 1. Designation Search
    if (designation) {
      const s = genericSearchMatch(c.title || c.currentRole || '', designation);
      if (s === 0) return null;
      score += s * 0.4;
    }

    // 2. Skills Search
    if (skills) {
      const candSkills = toSkillArr(c.skills).join(' ');
      const s = genericSearchMatch(candSkills, skills);
      if (s === 0) return null;
      score += s * 0.4;
    }

    // 3. Location
    if (location) {
      const candLoc = normalizeTech(c.location || '');
      const prefLoc = normalizeTech(c.preferredLocation || '');
      const locQ = normalizeTech(location);
      if (!candLoc.includes(locQ) && !prefLoc.includes(locQ)) return null;
      score += 20;
    } else score += 20;

    // 4. Numeric Filters (Hard Constraints)
    const candExp = parseFloat(c.experience || 0);
    if (expMin && candExp < parseFloat(expMin)) return null;
    if (expMax && candExp > parseFloat(expMax)) return null;

    const expectedCTC = parseFloat(c.expectedCTC) || 0;
    if (minCTC && expectedCTC < parseFloat(minCTC)) return null;
    if (maxCTC && expectedCTC > parseFloat(maxCTC)) return null;

    if (availability && !normalizeTech(c.availability || '').includes(normalizeTech(availability))) return null;

    return { ...c, _searchScore: score };
  }).filter(Boolean).sort((a, b) => b._searchScore - a._searchScore);
}

function parseExpRange(str) {
  if (!str) return null;
  const m = str.match(/(\d+)\D+(\d+)/) || str.match(/(\d+)\+/);
  if (!m) return null;
  return { min: parseInt(m[1]), max: parseInt(m[2] || m[1]) + 3 };
}

export function parseJD(text) {
  const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const result = {
    title: '', location: '', skills: '', experience: '', 
    description: text?.slice(0, 2000), 
    salary: '', department: '', education: '',
    employmentType: 'Full-Time', workMode: 'Onsite'
  };

  if (!lines.length) return result;
  if (lines[0].length < 60) result.title = lines[0];

  const content = text.toLowerCase();
  const expMatch = text.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years|yrs|yexp)/i) || text.match(/(\d+)\+\s*(?:years|yrs|yexp)/i);
  if (expMatch) result.experience = expMatch[0];

  const allTech = Object.keys(TECH_WEIGHTS);
  const foundSkills = allTech.filter(t => content.includes(t));
  if (foundSkills.length) {
    result.skills = foundSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');
  }

  const locs = ['Hyderabad', 'Bangalore', 'Mumbai', 'Pune', 'Delhi', 'Noida', 'Gurgaon', 'Chennai', 'Remote'];
  const foundLoc = locs.find(l => content.includes(l.toLowerCase()));
  if (foundLoc) result.location = foundLoc;

  if (content.includes('contract')) result.employmentType = 'Contract';
  else if (content.includes('intern')) result.employmentType = 'Internship';
  else if (content.includes('freelance')) result.employmentType = 'Freelance';

  if (content.includes('remote') || content.includes('work from home') || content.includes('wfh')) result.workMode = 'Remote';
  else if (content.includes('hybrid')) result.workMode = 'Hybrid';

  return result;
}
