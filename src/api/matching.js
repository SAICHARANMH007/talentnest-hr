export { parseFile, parseJD } from '../utils/fileParser.js';

const toSkillArr = skills => (Array.isArray(skills) ? skills : []).map(s => s.toLowerCase());

// Local skill-based matching — no AI, no quota, instant
export function matchCandidatesToJob(job, candidates) {
  const jobSkills = toSkillArr(job.skills);
  const expRange  = parseExpRange(job.experience || '');

  return candidates.map(c => {
    const candSkills = toSkillArr(c.skills);

    const matched = [];
    if (jobSkills.length > 0) {
      jobSkills.forEach(js => {
        if (candSkills.some(cs => cs.includes(js) || js.includes(cs))) matched.push(js);
      });
    }
    const skillScore = jobSkills.length > 0 ? Math.round((matched.length / jobSkills.length) * 70) : 35;

    const candExp = c.experience || 0;
    let expScore = 0;
    if (expRange) {
      if (candExp >= expRange.min && candExp <= expRange.max + 2) expScore = 30;
      else if (candExp > expRange.max + 2) expScore = 20;
      else expScore = Math.max(0, 30 - (expRange.min - candExp) * 8);
    } else expScore = 15;

    const matchScore = Math.min(100, skillScore + expScore);
    const recommendation = matchScore >= 75 ? 'Strong Match' : matchScore >= 50 ? 'Good Match' : 'Possible Match';
    const highlights = matched.slice(0, 3).map(s => s.charAt(0).toUpperCase() + s.slice(1));
    const reasoning = matched.length > 0
      ? `Matches ${matched.length} of ${jobSkills.length} required skills (${matched.slice(0,2).join(', ')})${candExp ? ` · ${candExp} yrs exp` : ''}.`
      : `${candExp ? candExp + ' years experience' : 'Profile'} may align with the role.`;

    return { candidateId: c._id || c.id, matchScore, recommendation, reasoning, highlights, candidate: c };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

export function matchJobsToCandidate(candidate, jobs, query = '') {
  const candSkills = toSkillArr(candidate.skills);
  const q = query.toLowerCase();

  return jobs.map(j => {
    const jobSkills = toSkillArr(j.skills);
    const expRange  = parseExpRange(j.experience || '');

    const matched = [];
    jobSkills.forEach(js => {
      if (candSkills.some(cs => cs.includes(js) || js.includes(cs))) matched.push(js);
    });
    let skillScore = jobSkills.length > 0 ? Math.round((matched.length / jobSkills.length) * 70) : 35;
    const candExp = candidate.experience || 0;
    let expScore = 0;
    if (expRange) {
      if (candExp >= expRange.min && candExp <= expRange.max + 2) expScore = 30;
      else if (candExp > expRange.max + 2) expScore = 20;
      else expScore = Math.max(0, 30 - (expRange.min - candExp) * 8);
    } else expScore = 15;
    const qBonus = q && ((j.title||'').toLowerCase().includes(q) || jobSkills.join(' ').includes(q)) ? 10 : 0;

    const matchScore = Math.min(100, skillScore + expScore + qBonus);
    const recommendation = matchScore >= 75 ? 'Strong Match' : matchScore >= 50 ? 'Good Match' : 'Possible Match';
    const highlights = matched.slice(0, 3).map(s => s.charAt(0).toUpperCase() + s.slice(1));
    const reasoning = matched.length > 0
      ? `Your skills match ${matched.length} of ${jobSkills.length} requirements (${matched.slice(0,2).join(', ')}).`
      : `Your ${candExp}y experience may fit this role.`;

    return { jobId: j._id || j.id, matchScore, recommendation, reasoning, highlights, job: j };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

function parseExpRange(str) {
  if (!str) return null;
  const m = str.match(/(\d+)\D+(\d+)/) || str.match(/(\d+)\+/);
  if (!m) return null;
  return { min: parseInt(m[1]), max: parseInt(m[2] || m[1]) + 3 };
}
