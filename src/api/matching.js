export { parseFile, parseJD } from '../utils/fileParser.js';

const normalizeTech = s => String(s || '').toLowerCase().trim()
  .replace(/dot\s*net/g, '.net')
  .replace(/dotnet/g, '.net')
  .replace(/reactjs/g, 'react')
  .replace(/nodejs/g, 'node')
  .replace(/mongodb/g, 'mongo');

const toSkillArr = skills => (Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',').map(s=>s.trim()) : [])).map(s => normalizeTech(s)).filter(Boolean);

/**
 * matchCandidatesToJob — Deterministic Heuristics (RegEx-based)
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

    // 1. Skill Match (Weight: 50%)
    const matched = [];
    if (jobSkills.length > 0) {
      jobSkills.forEach(js => {
        if (candSkills.some(cs => cs === js || cs.includes(js) || js.includes(cs))) matched.push(js);
      });
    }
    const skillScore = jobSkills.length > 0 ? (matched.length / jobSkills.length) * 50 : 25;

    // 2. Experience Match (Weight: 25%)
    const candExp = parseFloat(c.experience || 0);
    let expScore = 0;
    if (expRange) {
      if (candExp >= expRange.min && candExp <= expRange.max + 2) expScore = 25;
      else if (candExp > expRange.max + 2) expScore = 20;
      else expScore = Math.max(0, 25 - (expRange.min - candExp) * 5);
    } else expScore = 15;

    // 3. Location & Remote Match (Weight: 10%)
    let locScore = 0;
    if (jobLoc.includes('remote') || candLoc.includes('remote')) locScore = 10;
    else if (jobLoc && candLoc && (jobLoc.includes(candLoc) || candLoc.includes(jobLoc))) locScore = 10;
    else if (!jobLoc || !candLoc) locScore = 5;

    // 4. Title/Role Match (Weight: 15%)
    let titleScore = 0;
    if (jobTitle && candTitle) {
      const jWords = jobTitle.split(/\s+/);
      const matchedWords = jWords.filter(w => w.length > 2 && candTitle.includes(w));
      titleScore = Math.min(15, (matchedWords.length / jWords.length) * 15);
      if (titleScore === 0 && candTitle) titleScore = 5;
    } else {
      titleScore = 5;
    }

    const matchScore = Math.round(Math.min(100, skillScore + expScore + locScore + titleScore));
    const recommendation = matchScore >= 80 ? 'Exceptional Match' : matchScore >= 60 ? 'Strong Match' : matchScore >= 40 ? 'Good Match' : 'Possible Match';
    const highlights = matched.slice(0, 3).map(s => s.charAt(0).toUpperCase() + s.slice(1));
    
    let reasoning = '';
    if (matched.length > 0) reasoning += `Matches ${matched.length}/${jobSkills.length} skills. `;
    if (candExp) reasoning += `${candExp} yrs exp. `;
    if (locScore === 10) reasoning += `Location match. `;

    return { candidateId: c._id || c.id, matchScore, recommendation, reasoning: reasoning.trim(), highlights, candidate: c };
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

    // 1. Skill Match (Weight: 40%)
    const matched = [];
    jobSkills.forEach(js => {
      if (candSkills.some(cs => cs === js || cs.includes(js) || js.includes(cs))) matched.push(js);
    });
    let skillScore = jobSkills.length > 0 ? (matched.length / jobSkills.length) * 40 : 20;

    // 2. Experience Match (Weight: 20%)
    const candExp = parseFloat(candidate.experience || 0);
    let expScore = 0;
    if (expRange) {
      if (candExp >= expRange.min && candExp <= expRange.max + 2) expScore = 20;
      else if (candExp > expRange.max + 2) expScore = 15;
      else expScore = Math.max(0, 20 - (expRange.min - candExp) * 5);
    } else expScore = 10;

    // 3. Location Match (Weight: 15%)
    let locScore = 0;
    if (jobLoc.includes('remote') || candLoc.includes('remote')) locScore = 15;
    else if (jobLoc && candLoc && (jobLoc.includes(candLoc) || candLoc.includes(jobLoc))) locScore = 15;
    else if (!jobLoc || !candLoc) locScore = 5;

    // 4. Title/Role Match (Weight: 25%)
    let titleScore = 0;
    if (jobTitle && candTitle) {
      const jWords = jobTitle.split(/\s+/);
      const matchedWords = jWords.filter(w => w.length > 1 && candTitle.includes(w));
      titleScore = Math.min(25, (matchedWords.length / Math.max(1, jWords.length)) * 25);
    } else {
      titleScore = 5;
    }

    // 5. Global Deep Search Bonus (Crucial for Priority)
    let qBonus = 0;
    if (q) {
      const qLower = q.toLowerCase();
      const jobData = [
        j.title,
        j.companyName,
        j.company,
        j.description,
        j.requirements,
        j.benefits,
        j.location,
        j.department,
        j.industry,
        j.jobType,
        ...(Array.isArray(j.skills) ? j.skills : (j.skills || '').split(',')),
        ...(j.tags || [])
      ].map(s => String(s || '').toLowerCase()).join(' ');

      if (normalizeTech(j.title).includes(q)) qBonus = 50;
      else if (jobSkills.some(s => s === q || s.includes(q))) qBonus = 40;
      else if (jobData.includes(qLower)) qBonus = 30;
      
      // If there is a query but NO match at all in the entire job string, hide it
      if (qBonus === 0 && !jobData.includes(qLower)) return null;
    }

    const baseScore = skillScore + expScore + locScore + titleScore;
    const matchScore = q ? Math.min(100, Math.round((baseScore * 0.6) + qBonus)) : Math.round(baseScore);
    
    const recommendation = matchScore >= 80 ? 'Exceptional Match' : matchScore >= 60 ? 'Strong Match' : matchScore >= 40 ? 'Good Match' : 'Possible Match';
    const highlights = matched.slice(0, 3).map(s => s.charAt(0).toUpperCase() + s.slice(1));
    
    let reasoning = '';
    if (qBonus >= 40) reasoning += `Strong match for your search "${query}". `;
    else if (qBonus >= 30) reasoning += `Matched keyword in job details. `;
    if (matched.length > 0) reasoning += `Matches ${matched.length}/${jobSkills.length} profile skills. `;

    return { jobId: j._id || j.id, matchScore, recommendation, reasoning: reasoning.trim() || `Profile matches this role.`, highlights, job: j };
  }).filter(Boolean).sort((a, b) => b.matchScore - a.matchScore);
}

function parseExpRange(str) {
  if (!str) return null;
  const m = str.match(/(\d+)\D+(\d+)/) || str.match(/(\d+)\+/);
  if (!m) return null;
  return { min: parseInt(m[1]), max: parseInt(m[2] || m[1]) + 3 };
}

