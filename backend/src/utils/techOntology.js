'use strict';

/**
 * Universal Tech Ontology (UTO)
 * Provides semantic relationships between technologies to enable "Matching better than AI"
 * without the unpredictability of LLMs.
 */

const TECH_ONTOLOGY = {
  // CLOUD & INFRASTRUCTURE
  'aws': { synonyms: ['amazon web services', 'ec2', 's3', 'lambda'], parents: ['cloud', 'infrastructure'] },
  'azure': { synonyms: ['microsoft azure', 'azure devops'], parents: ['cloud', 'infrastructure'] },
  'gcp': { synonyms: ['google cloud platform', 'google cloud'], parents: ['cloud', 'infrastructure'] },
  'docker': { synonyms: ['containers', 'dockerize'], parents: ['devops', 'infrastructure'] },
  'kubernetes': { synonyms: ['k8s', 'helm', 'kubectl'], parents: ['devops', 'infrastructure'] },
  'terraform': { synonyms: ['iac', 'infrastructure as code'], parents: ['devops', 'cloud'] },
  'jenkins': { synonyms: ['cicd', 'continuous integration'], parents: ['devops'] },

  // BACKEND
  'node.js': { synonyms: ['node', 'nodejs', 'express', 'nestjs'], parents: ['backend', 'javascript'] },
  'python': { synonyms: ['django', 'flask', 'fastapi', 'py'], parents: ['backend', 'data science'] },
  'java': { synonyms: ['spring boot', 'spring', 'hibernate', 'j2ee'], parents: ['backend'] },
  'go': { synonyms: ['golang'], parents: ['backend'] },
  'php': { synonyms: ['laravel', 'symfony', 'codeigniter'], parents: ['backend'] },
  'ruby': { synonyms: ['rails', 'ruby on rails'], parents: ['backend'] },
  'c#': { synonyms: ['.net', 'asp.net', 'dotnet'], parents: ['backend'] },

  // FRONTEND
  'react': { synonyms: ['reactjs', 'react.js', 'redux', 'nextjs', 'next.js'], parents: ['frontend', 'javascript', 'ui framework'] },
  'angular': { synonyms: ['angularjs', 'angular.js', 'rxjs'], parents: ['frontend', 'javascript', 'ui framework'] },
  'vue': { synonyms: ['vuejs', 'vue.js', 'vuex'], parents: ['frontend', 'javascript', 'ui framework'] },
  'javascript': { synonyms: ['js', 'es6', 'typescript', 'ts'], parents: ['frontend', 'backend'] },
  'html': { synonyms: ['html5'], parents: ['frontend'] },
  'css': { synonyms: ['css3', 'sass', 'less', 'tailwind', 'bootstrap'], parents: ['frontend'] },

  // MOBILE
  'react native': { synonyms: ['rn'], parents: ['mobile', 'frontend', 'javascript'] },
  'flutter': { synonyms: ['dart'], parents: ['mobile'] },
  'swift': { synonyms: ['ios', 'swiftui'], parents: ['mobile'] },
  'kotlin': { synonyms: ['android', 'android studio'], parents: ['mobile'] },

  // DATA & DATABASES
  'mongodb': { synonyms: ['mongo', 'nosql', 'mongoose'], parents: ['database'] },
  'postgresql': { synonyms: ['postgres', 'sql'], parents: ['database'] },
  'mysql': { synonyms: ['sql'], parents: ['database'] },
  'redis': { synonyms: ['caching'], parents: ['database', 'infrastructure'] },
  'elasticsearch': { synonyms: ['elk', 'kibana'], parents: ['search', 'database'] },
  'snowflake': { synonyms: ['data warehouse'], parents: ['data science', 'database'] },

  // DOMAINS / CATEGORIES (Parents)
  'frontend': { synonyms: ['web development', 'ui', 'ux', 'client-side'] },
  'backend': { synonyms: ['server-side', 'api', 'microservices'] },
  'fullstack': { synonyms: ['full stack', 'fullstack developer'], includes: ['frontend', 'backend'] },
  'devops': { synonyms: ['site reliability', 'sre', 'automation'] },
  'data science': { synonyms: ['machine learning', 'ml', 'ai', 'data engineering', 'analytics'] },
  'cloud': { synonyms: ['serverless'] },
};

/**
 * Expand a skill list to include synonyms and parents for better matching.
 */
function expandSkills(skills) {
  if (!Array.isArray(skills)) return [];
  const expanded = new Set();
  
  skills.forEach(skill => {
    const s = skill.toLowerCase().trim();
    expanded.add(s);
    
    // Check ontology
    for (const [key, meta] of Object.entries(TECH_ONTOLOGY)) {
      if (key === s || (meta.synonyms && meta.synonyms.includes(s))) {
        expanded.add(key);
        if (meta.parents) meta.parents.forEach(p => expanded.add(p));
        if (meta.synonyms) meta.synonyms.forEach(syn => expanded.add(syn));
      }
    }
  });
  
  return Array.from(expanded);
}

module.exports = {
  TECH_ONTOLOGY,
  expandSkills
};
