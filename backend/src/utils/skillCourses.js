'use strict';

// Static, curated catalog mapping in-demand skills to free/affordable
// upskilling resources. No external API calls — keeps the recommendation
// feature fast, predictable, and free to operate. Search URLs are used
// instead of specific course IDs so links never go stale.
const COURSE_CATALOG = {
  'javascript':   [{ title: 'JavaScript Algorithms and Data Structures', provider: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/' }],
  'react':        [{ title: 'React — The Complete Guide', provider: 'Udemy', url: 'https://www.udemy.com/courses/search/?q=react' }],
  'node.js':      [{ title: 'Node.js, Express & MongoDB', provider: 'Udemy', url: 'https://www.udemy.com/courses/search/?q=node.js' }],
  'node':         [{ title: 'Node.js, Express & MongoDB', provider: 'Udemy', url: 'https://www.udemy.com/courses/search/?q=node.js' }],
  'python':       [{ title: 'Python for Everybody', provider: 'Coursera', url: 'https://www.coursera.org/specializations/python' }],
  'java':         [{ title: 'Java Programming and Software Engineering Fundamentals', provider: 'Coursera', url: 'https://www.coursera.org/specializations/java-programming' }],
  'sql':          [{ title: 'SQL for Data Science', provider: 'Coursera', url: 'https://www.coursera.org/learn/sql-for-data-science' }],
  'mongodb':      [{ title: 'MongoDB Basics', provider: 'MongoDB University', url: 'https://learn.mongodb.com/' }],
  'aws':          [{ title: 'AWS Cloud Practitioner Essentials', provider: 'AWS Skill Builder', url: 'https://skillbuilder.aws/' }],
  'azure':        [{ title: 'Azure Fundamentals (AZ-900)', provider: 'Microsoft Learn', url: 'https://learn.microsoft.com/training/courses/az-900t00' }],
  'docker':       [{ title: 'Docker for Beginners', provider: 'Udemy', url: 'https://www.udemy.com/courses/search/?q=docker' }],
  'kubernetes':   [{ title: 'Kubernetes for the Absolute Beginners', provider: 'Udemy', url: 'https://www.udemy.com/courses/search/?q=kubernetes' }],
  'git':          [{ title: 'Version Control with Git', provider: 'Coursera', url: 'https://www.coursera.org/learn/version-control-with-git' }],
  'data structures': [{ title: 'Data Structures and Algorithms', provider: 'NPTEL', url: 'https://nptel.ac.in/' }],
  'dsa':          [{ title: 'Data Structures and Algorithms', provider: 'NPTEL', url: 'https://nptel.ac.in/' }],
  'machine learning': [{ title: 'Machine Learning Specialization', provider: 'Coursera', url: 'https://www.coursera.org/specializations/machine-learning-introduction' }],
  'data analysis': [{ title: 'Google Data Analytics Certificate', provider: 'Coursera', url: 'https://www.coursera.org/professional-certificates/google-data-analytics' }],
  'excel':        [{ title: 'Excel Skills for Business', provider: 'Coursera', url: 'https://www.coursera.org/specializations/excel' }],
  'communication': [{ title: 'Improving Communication Skills', provider: 'Coursera', url: 'https://www.coursera.org/learn/wharton-communication-skills' }],
  'html':         [{ title: 'Responsive Web Design', provider: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/' }],
  'css':          [{ title: 'Responsive Web Design', provider: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/2022/responsive-web-design/' }],
  'rest api':     [{ title: 'API Design and Fundamentals of Google APIs', provider: 'Coursera', url: 'https://www.coursera.org/learn/api-design-fundamentals-google' }],
  'communication skills': [{ title: 'Improving Communication Skills', provider: 'Coursera', url: 'https://www.coursera.org/learn/wharton-communication-skills' }],
};

// Generic fallback resource shown for any in-demand skill that doesn't have a
// specific catalog entry — points the student to a general search.
function getCoursesForSkill(skill) {
  const key = String(skill || '').trim().toLowerCase();
  if (COURSE_CATALOG[key]) return COURSE_CATALOG[key];
  return [{ title: `${skill} — Online Courses`, provider: 'Coursera', url: `https://www.coursera.org/search?query=${encodeURIComponent(skill)}` }];
}

module.exports = { COURSE_CATALOG, getCoursesForSkill };
