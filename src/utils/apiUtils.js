/**
 * Safely extracts an array from various API response shapes.
 * MongoDB/Express APIs may return: raw array, { data: [] }, { jobs: [] },
 * { candidates: [] }, { users: [] }, { results: [] }, { applications: [] }
 */
export const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  if (data && Array.isArray(data.jobs)) return data.jobs;
  if (data && Array.isArray(data.candidates)) return data.candidates;
  if (data && Array.isArray(data.users)) return data.users;
  if (data && Array.isArray(data.results)) return data.results;
  if (data && Array.isArray(data.applications)) return data.applications;
  return [];
};

/**
 * Safely converts a skills field to an array.
 * MongoDB stores skills as arrays; legacy / poorly parsed data may be a string.
 */
export const toSkillsArray = (skills) => {
  if (Array.isArray(skills)) return skills;
  if (typeof skills === 'string') return skills.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

/**
 * Display a skills array or string as a comma-separated string.
 */
export const skillsToString = (skills) => {
  if (Array.isArray(skills)) return skills.join(', ');
  return skills || '';
};
