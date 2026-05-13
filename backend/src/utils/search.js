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
  
  // 1. Direct Synonym Match (e.g., "dot net" -> ".net|dotnet|dot net")
  if (SYNONYMS[q]) {
    return `(${SYNONYMS[q].map(s => esc(s)).join('|')})`;
  }

  // 2. Multi-word phrases that might contain synonyms
  // We'll check if the query contains any of the multi-word keys in SYNONYMS
  let result = esc(q);
  for (const [key, variants] of Object.entries(SYNONYMS)) {
    if (key.includes(' ') && q.includes(key)) {
      const escapedKey = esc(key);
      const expandedVariants = `(${variants.map(s => esc(s)).join('|')})`;
      result = result.replace(new RegExp(escapedKey, 'gi'), expandedVariants);
    }
  }

  // 3. Fallback to individual word expansion if result hasn't changed much
  if (result === esc(q)) {
    let words = q.split(/\s+/);
    result = words.map(w => {
      if (SYNONYMS[w]) {
        return `(${SYNONYMS[w].map(s => esc(s)).join('|')})`;
      }
      return esc(w);
    }).join('\\s*');
  }

  return result;
}

module.exports = {
  expandSearch,
  esc
};
