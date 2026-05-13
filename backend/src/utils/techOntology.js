'use strict';

/**
 * Universal Tech Ontology (UTO)
 * Provides semantic relationships between technologies to enable "Matching better than AI"
 * without the unpredictability of LLMs.
 */

const TECH_ONTOLOGY = {
  // CLOUD & INFRASTRUCTURE
  'aws': { synonyms: ['amazon web services', 'ec2', 's3', 'lambda', 'aws cloud'], parents: ['cloud', 'infrastructure'] },
  'azure': { synonyms: ['microsoft azure', 'azure devops', 'azure cloud'], parents: ['cloud', 'infrastructure'] },
  'gcp': { synonyms: ['google cloud platform', 'google cloud', 'gcp cloud'], parents: ['cloud', 'infrastructure'] },
  'docker': { synonyms: ['containers', 'dockerize', 'containerization'], parents: ['devops', 'infrastructure'] },
  'kubernetes': { synonyms: ['k8s', 'helm', 'kubectl', 'eks', 'aks', 'gke'], parents: ['devops', 'infrastructure'] },
  'terraform': { synonyms: ['iac', 'infrastructure as code', 'ansible', 'pulumi'], parents: ['devops', 'cloud'] },
  'jenkins': { synonyms: ['cicd', 'continuous integration', 'github actions', 'gitlab ci'], parents: ['devops'] },

  // BACKEND
  'node.js': { synonyms: ['node', 'nodejs', 'express', 'nestjs', 'node js'], parents: ['backend', 'javascript'] },
  'python': { synonyms: ['django', 'flask', 'fastapi', 'py', 'pandas', 'numpy'], parents: ['backend', 'data science'] },
  'java': { synonyms: ['spring boot', 'spring', 'hibernate', 'j2ee', 'maven', 'gradle'], parents: ['backend'] },
  'go': { synonyms: ['golang', 'go lang'], parents: ['backend'] },
  'php': { synonyms: ['laravel', 'symfony', 'codeigniter', 'wordpress'], parents: ['backend'] },
  'ruby': { synonyms: ['rails', 'ruby on rails'], parents: ['backend'] },
  'c#': { synonyms: ['.net', 'asp.net', 'dotnet', 'dot net', '.net core', 'csharp', 'entity framework'], parents: ['backend'] },
  '.net': { synonyms: ['dotnet', 'dot net', '.net core', 'c#', 'csharp', 'asp.net'], parents: ['backend'] },

  // FRONTEND
  'react': { synonyms: ['reactjs', 'react.js', 'redux', 'nextjs', 'next.js', 'react native'], parents: ['frontend', 'javascript', 'ui framework'] },
  'angular': { synonyms: ['angularjs', 'angular.js', 'rxjs', 'ngrx'], parents: ['frontend', 'javascript', 'ui framework'] },
  'vue': { synonyms: ['vuejs', 'vue.js', 'vuex', 'nuxt', 'nuxt.js'], parents: ['frontend', 'javascript', 'ui framework'] },
  'javascript': { synonyms: ['js', 'es6', 'typescript', 'ts', 'react', 'node'], parents: ['frontend', 'backend'] },
  'typescript': { synonyms: ['ts', 'javascript', 'js'], parents: ['frontend', 'backend'] },
  'html': { synonyms: ['html5', 'xhtml'], parents: ['frontend'] },
  'css': { synonyms: ['css3', 'sass', 'less', 'tailwind', 'bootstrap', 'material ui', 'mui'], parents: ['frontend'] },

  // MOBILE
  'react native': { synonyms: ['rn', 'react'], parents: ['mobile', 'frontend', 'javascript'] },
  'flutter': { synonyms: ['dart'], parents: ['mobile'] },
  'swift': { synonyms: ['ios', 'swiftui', 'objective-c', 'xcode'], parents: ['mobile'] },
  'kotlin': { synonyms: ['android', 'android studio', 'java'], parents: ['mobile'] },

  // DATA & DATABASES
  'mongodb': { synonyms: ['mongo', 'nosql', 'mongoose', 'mongodb atlas'], parents: ['database'] },
  'postgresql': { synonyms: ['postgres', 'sql', 'relational database'], parents: ['database'] },
  'mysql': { synonyms: ['sql', 'mariadb'], parents: ['database'] },
  'sql': { synonyms: ['postgresql', 'mysql', 'mssql', 'oracle', 'database'], parents: ['database'] },
  'redis': { synonyms: ['caching', 'memcached'], parents: ['database', 'infrastructure'] },
  'elasticsearch': { synonyms: ['elk', 'kibana', 'opensearch'], parents: ['search', 'database'] },
  'snowflake': { synonyms: ['data warehouse', 'bigquery'], parents: ['data science', 'database'] },

  // DOMAINS / CATEGORIES (Parents)
  'frontend': { synonyms: ['web development', 'ui', 'ux', 'client-side', 'front-end'] },
  'backend': { synonyms: ['server-side', 'api', 'microservices', 'back-end'] },
  'fullstack': { synonyms: ['full stack', 'fullstack developer', 'mern', 'mean'], includes: ['frontend', 'backend'] },
  'devops': { synonyms: ['site reliability', 'sre', 'automation', 'dev ops'] },
  'data science': { synonyms: ['machine learning', 'ml', 'ai', 'data engineering', 'analytics', 'data scientist'] },
  'cloud': { synonyms: ['serverless', 'iaas', 'paas', 'saas'] },
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
