export { parseFile, parseJD } from '../utils/fileParser.js';

const toSkillArr = skills => (Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',').map(s=>s.trim()) : [])).map(s => s.toLowerCase()).filter(Boolean);

/**
 * matchCandidatesToJob — Deterministic Heuristics (RegEx-based)
 * Ranks candidates against a job using weighted scoring of skills, experience, and location.
 */
export function matchCandidatesToJob(job, candidates) {
  const jobSkills = toSkillArr(job.skills);
  const expRange  = parseExpRange(job.experience || '');
  const jobLoc    = (job.location || '').toLowerCase();
  const jobTitle  = (job.title || '').toLowerCase();

  return candidates.map(c => {
    const candSkills = toSkillArr(c.skills);
    const candLoc    = (c.location || '').toLowerCase();
    const candTitle  = (c.currentTitle || c.title || '').toLowerCase();

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
      if (titleScore === 0 && candTitle) titleScore = 5; // some title provided
    } else {
      titleScore = 5;
    }

    const matchScore = Math.round(Math.min(100, skillScore + expScore + locScore + titleScore));
    const recommendation = matchScore >= 80 ? 'Exceptional Match' : matchScore >= 60 ? 'Strong Match' : matchScore >= 40 ? 'Good Match' : 'Possible Match';
    const highlights = matched.slice(0, 3).map(s => s.charAt(0).toUpperCase() + s.slice(1));
    
    let reasoning = '';
    if (matched.length > 0) reasoning += `Matches ${matched.length}/${jobSkills.length} skills (${matched.slice(0,2).join(', ')}). `;
    if (candExp) reasoning += `${candExp} yrs exp. `;
    if (locScore === 10 && jobLoc && candLoc && !jobLoc.includes('remote')) reasoning += `Local to ${candLoc.charAt(0).toUpperCase() + candLoc.slice(1)}. `;
    else if (locScore === 10 && jobLoc.includes('remote')) reasoning += `Remote friendly. `;

    return { candidateId: c._id || c.id, matchScore, recommendation, reasoning: reasoning.trim(), highlights, candidate: c };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

export function matchJobsToCandidate(candidate, jobs, query = '') {
  const candSkills = toSkillArr(candidate.skills);
  const candLoc    = (candidate.location || '').toLowerCase();
  const candTitle  = (candidate.currentTitle || candidate.title || '').toLowerCase();
  const q = query.toLowerCase();

  return jobs.map(j => {
    const jobSkills = toSkillArr(j.skills);
    const expRange  = parseExpRange(j.experience || '');
    const jobLoc    = (j.location || '').toLowerCase();
    const jobTitle  = (j.title || '').toLowerCase();

    // 1. Skill Match (Weight: 45%)
    const matched = [];
    jobSkills.forEach(js => {
      if (candSkills.some(cs => cs === js || cs.includes(js) || js.includes(cs))) matched.push(js);
    });
    let skillScore = jobSkills.length > 0 ? (matched.length / jobSkills.length) * 45 : 20;

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

    // 4. Title/Role Match (Weight: 20%)
    let titleScore = 0;
    if (jobTitle && candTitle) {
      const jWords = jobTitle.split(/\s+/);
      const matchedWords = jWords.filter(w => w.length > 2 && candTitle.includes(w));
      titleScore = Math.min(20, (matchedWords.length / Math.max(1, jWords.length)) * 20);
    } else {
      titleScore = 5;
    }

    // 5. Query Bonus
    let qBonus = 0;
    if (q) {
      if (jobTitle.includes(q)) qBonus = 20;
      else if (jobLoc.includes(q)) qBonus = 15;
      else if (jobSkills.some(s => s.includes(q))) qBonus = 10;
      else if ((j.companyName || j.company || '').toLowerCase().includes(q)) qBonus = 10;
    }

    const baseScore = skillScore + expScore + locScore + titleScore;
    const matchScore = q ? Math.min(100, Math.round(baseScore + qBonus)) : Math.round(baseScore);
    
    // Filter out extremely low matches if query is provided but not matched
    if (q && qBonus === 0 && matchScore < 40) return null;

    const recommendation = matchScore >= 80 ? 'Exceptional Match' : matchScore >= 60 ? 'Strong Match' : matchScore >= 40 ? 'Good Match' : 'Possible Match';
    const highlights = matched.slice(0, 3).map(s => s.charAt(0).toUpperCase() + s.slice(1));
    
    let reasoning = '';
    if (matched.length > 0) reasoning += `Matches ${matched.length}/${jobSkills.length} skills. `;
    if (locScore === 15) reasoning += jobLoc.includes('remote') ? `Remote. ` : `Location match. `;
    if (titleScore > 10) reasoning += `Role alignment. `;

    return { jobId: j._id || j.id, matchScore, recommendation, reasoning: reasoning.trim() || `Profile may align with this role.`, highlights, job: j };
  }).filter(Boolean).sort((a, b) => b.matchScore - a.matchScore);
}

function parseExpRange(str) {
  if (!str) return null;
  const m = str.match(/(\d+)\D+(\d+)/) || str.match(/(\d+)\+/);
  if (!m) return null;
  return { min: parseInt(m[1]), max: parseInt(m[2] || m[1]) + 3 };
}

