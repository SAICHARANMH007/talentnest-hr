const TECH_WEIGHTS = {
  // Tier 1: Core Languages/Frameworks (Highest Value)
  'react': 1.5, 'node': 1.5, 'java': 1.5, 'python': 1.5, 'aws': 1.5, 'azure': 1.5, 'kubernetes': 1.5,
  '.net': 1.4, 'golang': 1.4, 'typescript': 1.4, 'angular': 1.4, 'vue': 1.4,
  // Tier 2: Databases/Major Tools
  'mongo': 1.2, 'postgres': 1.2, 'sql': 1.2, 'redis': 1.2, 'docker': 1.2,
};

const normalizeTech = s => String(s || '').toLowerCase().trim()
  .replace(/dot\s*net/g, '.net')
  .replace(/dotnet/g, '.net')
  .replace(/reactjs/g, 'react')
  .replace(/nodejs/g, 'node')
  .replace(/mongodb/g, 'mongo');

const toSkillArr = skills => (Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',').map(s=>s.trim()) : [])).map(s => normalizeTech(s)).filter(Boolean);

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

    // Global Deep Search Bonus
    let qBonus = 0;
    if (q) {
      const jobData = [j.title, j.companyName, j.description, j.location, ...(Array.isArray(j.skills) ? j.skills : [])].join(' ').toLowerCase();
      if (jobTitle.includes(q)) qBonus = 50;
      else if (jobData.includes(q)) qBonus = 30;
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

function parseExpRange(str) {
  if (!str) return null;
  const m = str.match(/(\d+)\D+(\d+)/) || str.match(/(\d+)\+/);
  if (!m) return null;
  return { min: parseInt(m[1]), max: parseInt(m[2] || m[1]) + 3 };
}

/**
 * parseJD — Simple deterministic JD parser
 * Extracts key fields from raw text using pattern matching.
 */
export function parseJD(text) {
  const lines = (text || '').split('\n').map(l => l.trim()).filter(Boolean);
  const result = {
    title: '', location: '', skills: '', experience: '', 
    description: text?.slice(0, 2000), // full text as fallback
    salary: '', department: '', education: '',
    employmentType: 'Full-Time', workMode: 'Onsite'
  };

  if (!lines.length) return result;

  // 1. Title Heuristic (usually first non-empty line if short)
  if (lines[0].length < 60) result.title = lines[0];

  // 2. Pattern Matching
  const content = text.toLowerCase();
  
  // Experience
  const expMatch = text.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:years|yrs|yexp)/i) || text.match(/(\d+)\+\s*(?:years|yrs|yexp)/i);
  if (expMatch) result.experience = expMatch[0];

  // Skills (common keywords)
  const allTech = Object.keys(TECH_WEIGHTS);
  const foundSkills = allTech.filter(t => content.includes(t));
  if (foundSkills.length) {
    result.skills = foundSkills.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');
  }

  // Location
  const locs = ['Hyderabad', 'Bangalore', 'Mumbai', 'Pune', 'Delhi', 'Noida', 'Gurgaon', 'Chennai', 'Remote'];
  const foundLoc = locs.find(l => content.includes(l.toLowerCase()));
  if (foundLoc) result.location = foundLoc;

  // Employment Type
  if (content.includes('contract')) result.employmentType = 'Contract';
  else if (content.includes('intern')) result.employmentType = 'Internship';
  else if (content.includes('freelance')) result.employmentType = 'Freelance';

  // Work Mode
  if (content.includes('remote') || content.includes('work from home') || content.includes('wfh')) result.workMode = 'Remote';
  else if (content.includes('hybrid')) result.workMode = 'Hybrid';

  return result;
}
