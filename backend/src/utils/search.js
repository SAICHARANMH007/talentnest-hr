'use strict';

/**
 * Technical Synonym Map (Symmetric)
 */
const SYNONYMS = {
  'dotnet': ['.net', 'dot net', 'dotnet', '.net core'],
  'dot net': ['.net', 'dot net', 'dotnet', '.net core'],
  '.net': ['.net', 'dot net', 'dotnet', '.net core'],
  'react': ['react', 'reactjs', 'react.js', 'nextjs', 'next.js'],
  'reactjs': ['react', 'reactjs', 'react.js'],
  'node': ['node', 'nodejs', 'node.js', 'express'],
  'nodejs': ['node', 'nodejs', 'node.js'],
  'mongo': ['mongo', 'mongodb'],
  'mongodb': ['mongo', 'mongodb'],
  'javascript': ['js', 'javascript'],
  'js': ['js', 'javascript'],
  'typescript': ['ts', 'typescript'],
  'ts': ['ts', 'typescript'],
  'golang': ['go', 'golang'],
  'aws': ['amazon web services', 'aws', 'ec2', 's3', 'lambda'],
  'azure': ['microsoft azure', 'azure', 'azure devops'],
  'java': ['java', 'spring', 'springboot', 'j2ee'],
  'spring': ['java', 'spring', 'springboot'],
  'python': ['python', 'django', 'flask', 'fastapi'],
  'sql': ['sql', 'mysql', 'postgresql', 'postgres', 'mssql', 'oracle'],
  'postgres': ['postgresql', 'postgres', 'sql'],
  'angular': ['angular', 'angularjs', 'angular.js'],
  'vue': ['vue', 'vuejs', 'vue.js', 'nuxt'],
};

/**
 * Escapes regex special characters
 */
function esc(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * expands search query into a regex string that includes synonyms.
 * Example: "dotnet developer" -> "(dotnet|dot net|\.net) developer"
 */
function expandSearch(query) {
  if (!query) return '';
  let q = query.toLowerCase().trim();
  
  // 1. Direct Synonym Match
  if (SYNONYMS[q]) {
    return SYNONYMS[q].map(s => esc(s)).join('|');
  }

  // 2. Multi-word expansion
  let words = q.split(/\s+/);
  let expanded = words.map(w => {
    if (SYNONYMS[w]) {
      return `(${SYNONYMS[w].map(s => esc(s)).join('|')})`;
    }
    return esc(w);
  }).join('\\s*');

  return expanded;
}

module.exports = {
  expandSearch,
  esc
};
