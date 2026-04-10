// ─────────────────────────────────────────────────────────────────────────────
// Resume parser — 100% browser, zero API calls
// Core idea: split every header line by separators (|  •  /  spaces),
// then classify each PIECE independently — like a human reading the resume.
// ─────────────────────────────────────────────────────────────────────────────
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 1 — RAW TEXT EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

async function extractFromPDF(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page     = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const pageWidth = viewport.width;
      const content  = await page.getTextContent();
      if (!content.items.length) continue;

      // Group text items by Y position → reconstructs visual lines
      const Y_GAP = 5;
      const groups = [];

      for (const item of content.items) {
        if (!item.str) continue;
        const y = Math.round(item.transform[5]);
        const x = item.transform[4];
        const g = groups.find(g => Math.abs(g.y - y) <= Y_GAP);
        if (g) g.items.push({ x, str: item.str });
        else   groups.push({ y, items: [{ x, str: item.str }] });
      }

      // Top-to-bottom order (PDF Y=0 is bottom of page)
      groups.sort((a, b) => b.y - a.y);

      // ── Two-column detection ───────────────────────────────────────────────
      // Many Indian resume templates use a sidebar + main-content layout.
      // Detect: if >25% of lines have items in BOTH left and right halves of the page,
      // it's a two-column layout — process each column separately to prevent garbling.
      const midX = pageWidth / 2;
      let twoColVotes = 0;
      for (const g of groups) {
        const hasLeft  = g.items.some(it => it.x < midX - 15);
        const hasRight = g.items.some(it => it.x > midX + 15);
        if (hasLeft && hasRight) twoColVotes++;
      }
      const isTwoColumn = groups.length >= 4 && twoColVotes > groups.length * 0.25;

      if (isTwoColumn) {
        // Split items into left and right column tracks, preserving Y order within each
        const leftGroups  = [];
        const rightGroups = [];
        for (const g of groups) {
          const leftItems  = g.items.filter(it => it.x < midX);
          const rightItems = g.items.filter(it => it.x >= midX);
          if (leftItems.length)  leftGroups.push({ y: g.y, items: leftItems });
          if (rightItems.length) rightGroups.push({ y: g.y, items: rightItems });
        }
        // Left column first (typically: name, contact, skills, education in sidebar)
        for (const g of leftGroups) {
          g.items.sort((a, b) => a.x - b.x);
          const line = g.items.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
          if (line) text += line + '\n';
        }
        text += '\n';
        // Right column (typically: experience, projects, summary)
        for (const g of rightGroups) {
          g.items.sort((a, b) => a.x - b.x);
          const line = g.items.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
          if (line) text += line + '\n';
        }
      } else {
        // Single column — original behaviour
        for (const g of groups) {
          g.items.sort((a, b) => a.x - b.x);
          const line = g.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
          if (line) text += line + '\n';
        }
      }
      text += '\n';
    }
    return text;
  } catch {
    throw new Error('Could not read PDF. Make sure it is a text-based PDF (not a scanned image).');
  }
}

async function extractFromDOCX(file) {
  try {
    const zip     = await JSZip.loadAsync(file);
    const xmlFile = zip.file('word/document.xml');
    if (!xmlFile) throw new Error('Invalid DOCX file');
    const xml = await xmlFile.async('string');
    return xml
      .replace(/<w:br[^>]*\/>/gi, '\n')
      .replace(/<\/w:p>/gi, '\n')
      .replace(/<w:tab\/>/gi, '  ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } catch {
    throw new Error('Could not read DOCX file.');
  }
}

async function extractFromText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result || '');
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file, 'utf-8');
  });
}

export async function extractText(file) {
  const fname = (file.name || '').toLowerCase();
  const type  = file.type || '';
  if (type === 'application/pdf' || fname.endsWith('.pdf'))         return extractFromPDF(file);
  if (type.includes('wordprocessingml') || type.includes('msword')
      || fname.endsWith('.docx') || fname.endsWith('.doc'))         return extractFromDOCX(file);
  return extractFromText(file);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 2 — CLASSIFIERS  (is this piece a name? email? phone? …)
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_HEADERS =
  'education|experience|employment|work history|work experience|professional experience|' +
  'career history|skills?|technical skills?|core competencies|competencies|key skills|' +
  'technologies|tools|summary|objective|profile|about|overview|projects?|certifications?|' +
  'awards?|achievements?|hobbies?|interests?|references?|languages?|contact|personal|' +
  'training|courses?|publications?|internship|volunteering|activities|extra.?curricular';

const SECTION_HEADER_RX = new RegExp(`^(${ALL_HEADERS})\\s*[:\\-–—]?\\s*$`, 'i');

// ── IMPROVEMENT 1: Alias → canonical skill name ──────────────────────────────
// Alias → canonical skill name (handles abbreviations and alternate spellings)
const SKILL_ALIASES = {
  'js':'JavaScript','javascript es6':'JavaScript','es6':'JavaScript','es2015':'JavaScript','ecmascript':'JavaScript','vanilla js':'JavaScript',
  'ts':'TypeScript','typescript 4':'TypeScript','typescript 5':'TypeScript',
  'node':'Node.js','nodejs':'Node.js','node js':'Node.js',
  'reactjs':'React','react.js':'React','react hooks':'React','react js':'React',
  'vuejs':'Vue','vue.js':'Vue','vue js':'Vue','vue 3':'Vue',
  'angularjs':'Angular','angular js':'Angular','angular 15':'Angular','angular 16':'Angular',
  'nextjs':'Next.js','next js':'Next.js','next 13':'Next.js','next 14':'Next.js',
  'nuxtjs':'Nuxt.js','nuxt js':'Nuxt.js',
  'nestjs':'NestJS','nest js':'NestJS','nest.js':'NestJS',
  'expressjs':'Express','express.js':'Express','express js':'Express',
  'k8s':'Kubernetes','kube':'Kubernetes','kubernetes cluster':'Kubernetes',
  'postgres':'PostgreSQL','pgsql':'PostgreSQL','pg':'PostgreSQL',
  'mongo':'MongoDB','mongodb atlas':'MongoDB',
  'elastic search':'Elasticsearch','elk stack':'ELK Stack','elk':'ELK Stack',
  'redis cache':'Redis','redis db':'Redis',
  'mssql':'MSSQL','ms sql':'MSSQL','sql server':'MSSQL','microsoft sql server':'MSSQL',
  'dot net':'.NET','dotnet':'.NET','asp.net core':'ASP.NET','dotnet core':'.NET',
  'sklearn':'Scikit-learn','scikit':'Scikit-learn',
  'tensorflow 2':'TensorFlow','tf':'TensorFlow',
  'pytorch lightning':'PyTorch','torch':'PyTorch',
  'huggingface':'Hugging Face','hf':'Hugging Face',
  'langchain':'LangChain','lang chain':'LangChain',
  'openai api':'OpenAI','chatgpt api':'OpenAI','gpt api':'OpenAI',
  'google cloud platform':'GCP','gcp cloud':'GCP',
  'azure devops':'Azure','microsoft azure':'Azure','azure cloud':'Azure',
  'aws cloud':'AWS','amazon web services':'AWS','aws services':'AWS',
  'github actions ci':'GitHub Actions','github ci':'GitHub Actions',
  'gitlab ci/cd':'GitLab CI','gitlab pipeline':'GitLab CI',
  'ci/cd pipeline':'CI/CD','cicd':'CI/CD','devops pipeline':'CI/CD',
  'rest api':'REST','restful api':'REST','restful apis':'REST','rest apis':'REST',
  'graphql api':'GraphQL',
  'websockets':'WebSocket','web sockets':'WebSocket',
  'oauth 2.0':'OAuth','oauth2':'OAuth',
  'jwt auth':'JWT','json web token':'JWT',
  'microservice':'Microservices','micro services':'Microservices','micro-services':'Microservices',
  'serverless functions':'Serverless','lambda functions':'AWS Lambda',
  'redux toolkit':'Redux','react redux':'Redux','redux thunk':'Redux',
  'tailwind css':'Tailwind','tailwindcss':'Tailwind',
  'material-ui':'Material UI','mui':'Material UI','material ui':'Material UI',
  'styled-components':'Styled Components',
  'object oriented programming':'OOP','object-oriented programming':'OOP','oop concepts':'OOP',
  'data structures and algorithms':'DSA','data structures & algorithms':'DSA','dsa':'DSA',
  'system design':'System Design','low level design':'Design Patterns','high level design':'System Design',
  'google adwords':'Google Ads','google adwords/ppc':'Google Ads',
  'facebook ads manager':'Facebook Ads','meta ads':'Facebook Ads','meta advertising':'Facebook Ads',
  'ga4':'Google Analytics','google analytics 4':'Google Analytics',
  'hubspot crm':'HubSpot CRM','hubspot marketing':'HubSpot CRM',
  'salesforce crm':'Salesforce CRM','sfdc':'Salesforce CRM',
  'ms excel':'Excel','microsoft excel':'Excel','advanced excel':'Excel',
  'ms office':'MS Office','microsoft office':'MS Office','ms office suite':'MS Office',
  'ms word':'MS Office','powerpoint':'MS Office',
  'google workspace':'Google Workspace','gsuite':'Google Workspace','g suite':'Google Workspace',
  'atlassian jira':'Jira','jira software':'Jira',
  'vs code':'VS Code','vscode':'VS Code','visual studio code':'VS Code',
  'intellij idea':'IntelliJ','pycharm':'IntelliJ','webstorm':'IntelliJ',
  'git version control':'Git','git/github':'Git',
  'wordpress cms':'WordPress','wp':'WordPress',
  'shopify store':'Shopify','shopify development':'Shopify',
  'woocommerce store':'WooCommerce',
  'adobe photoshop':'Photoshop','photoshop cc':'Photoshop',
  'adobe illustrator':'Illustrator','illustrator cc':'Illustrator',
  'adobe after effects':'After Effects','after effects cc':'After Effects',
  'adobe premiere pro':'Premiere Pro','premiere cc':'Premiere Pro',
  'figma design':'Figma','figma ui':'Figma',
  'canva design':'Canva',
  'pf & esi':'PF','pf/esi':'PF','provident fund':'PF','epf':'PF',
  'statutory compliances':'Statutory Compliance','statutory compliance management':'Statutory Compliance',
  'talent sourcing':'Sourcing','candidate sourcing':'Sourcing',
  'volume hiring':'Mass Hiring','bulk hiring':'Mass Hiring',
  'campus recruitment':'Campus Hiring','campus placements':'Campus Hiring',
  'talent management':'Talent Acquisition','talent management system':'Talent Acquisition',
  'payroll software':'Payroll','payroll system':'Payroll',
  'performance review':'Performance Management','performance appraisal system':'Performance Management',
  'six sigma green belt':'Six Sigma','six sigma black belt':'Six Sigma','lean six sigma':'Lean Six Sigma',
  'iso 9001:2015':'ISO 9001','iso certification':'ISO 9001',
  'project management professional':'PMP','pmp certified':'PMP',
  'sap fico module':'SAP FICO','sap mm module':'SAP MM','sap hr module':'SAP SuccessFactors',
  'tally erp 9':'Tally ERP','tally erp':'Tally ERP','tally prime':'Tally ERP',
  'sql queries':'SQL','sql programming':'SQL','pl/sql programming':'PL/SQL',
  'machine learning engineer':'Machine Learning','ml engineer':'Machine Learning',
  'data analysis':'Data Analysis','data analyst':'Data Analysis',
  'business intelligence':'Business Intelligence','bi tools':'Business Intelligence',
  'power bi dashboard':'Power BI','ms power bi':'Power BI',
  'tableau desktop':'Tableau','tableau dashboard':'Tableau',
  'selenium automation':'Selenium','selenium testing':'Selenium',
  'cypress testing':'Cypress','cypress automation':'Cypress',
  'agile methodology':'Agile','agile development':'Agile','agile practices':'Agile',
  'scrum methodology':'Scrum','scrum framework':'Scrum',
  'kanban board':'Kanban','kanban methodology':'Kanban',
};

// ── IMPROVEMENT 2: Indian Names Dictionary ────────────────────────────────────
const INDIAN_FIRST_NAMES = new Set([
  // Male
  'Sai','Charan','Naveen','Rahul','Amit','Ravi','Vijay','Suresh','Ramesh','Rajesh',
  'Arjun','Arun','Ajay','Rohit','Vikas','Sandeep','Deepak','Manoj','Sanjay','Rakesh',
  'Pradeep','Sachin','Nitin','Aditya','Akash','Ankit','Abhishek','Gaurav','Harish',
  'Himanshu','Harsh','Jagdish','Lalit','Mahesh','Mukesh','Naresh','Pankaj','Praveen',
  'Prakash','Prashant','Rajiv','Raju','Satish','Saurabh','Shyam','Siddharth','Sunil',
  'Surya','Tarun','Umesh','Varun','Vinay','Vineet','Vishal','Vivek','Yogesh','Ashwin',
  'Bharat','Dinesh','Ganesh','Girish','Gopal','Govind','Krishna','Lokesh','Manish',
  'Navin','Nikhil','Nilesh','Omkar','Piyush','Rajan','Ritesh','Rupesh','Shailesh',
  'Shankar','Shivam','Shubham','Sumit','Swapnil','Tushar','Uday','Yash','Akhil',
  'Akshay','Anand','Aniket','Anil','Anish','Arvind','Balaji','Bhaskar','Chetan',
  'Devendra','Dhruv','Hardik','Hitesh','Jayesh','Jitendra','Kartik','Kedar','Kishor',
  'Ketan','Kishore','Madhav','Mahendra','Milan','Milind','Mohan','Nagesh','Neeraj',
  'Niraj','Pallav','Param','Parth','Pavan','Pramod','Prasad','Prashanth','Prateek',
  'Pratik','Raghav','Raghavendra','Rajeev','Ram','Rohan','Sameer','Sanjeev','Santosh',
  'Sarvesh','Shreyas','Srikant','Sriram','Srihari','Sudheer','Sujith','Sukumar',
  'Sundar','Suryanarayana','Vamsi','Venkat','Venkatesh','Vikram','Wasim','Yogendra',
  'Zain','Surendra','Ravindra','Narendra','Jitesh','Amit','Amol','Amrit','Anshul',
  'Anurag','Ashish','Ashok','Atul','Ayush','Badri','Chirag','Dhanush','Farhan',
  'Gaurav','Guru','Harshit','Hemant','Ishan','Jayanth','Kaushik','Kiran','Kunal',
  'Lohit','Madan','Madhan','Mohammed','Mohit','Mridul','Nayan','Nirmal','Nithish',
  'Prem','Puneet','Raghu','Rishi','Ritvik','Roshan','Ruban','Sachet','Sahil',
  'Saket','Salman','Sathish','Sharan','Sharath','Shashank','Shiva','Siddesh',
  'Sohan','Srikanth','Sumanth','Suryaprakash','Tejas','Thilak','Udhay','Ujjwal',
  'Vignesh','Vinod','Viswa','Vivekanand','Yuvraj','Ajith','Aravind','Arunkumar',
  // Female
  'Priya','Anjali','Pooja','Neha','Sneha','Divya','Kavya','Ananya','Meera','Deepa',
  'Swathi','Shweta','Nisha','Usha','Latha','Mala','Sunita','Sushma','Rekha','Radha',
  'Madhuri','Lakshmi','Kavitha','Jyothi','Indira','Hema','Geeta','Geetha','Bharathi',
  'Anitha','Amrutha','Asha','Aishwarya','Aditi','Archana','Aruna','Bhavna','Chetana',
  'Deepika','Dharini','Disha','Durga','Fathima','Harini','Hemlata','Indu','Ishita',
  'Janaki','Jhansi','Jyotsna','Kalyani','Kamala','Kanchan','Keerthi','Krishnaveni',
  'Lavanya','Leela','Leelavathi','Likhitha','Madhavi','Mamatha','Manasa','Manisha',
  'Meenakshi','Mounika','Mythili','Nandita','Nayana','Nidhi','Nithya','Padma',
  'Pallavi','Pavana','Pavithra','Preethi','Priyadarshini','Pushpa','Rachana','Radhika',
  'Ramya','Rani','Ranjitha','Rathna','Revathi','Ritu','Rohini','Roopa','Sadhana',
  'Sahana','Salma','Sameera','Sarada','Saraswathi','Saritha','Savitha','Shailaja',
  'Shanta','Sharada','Shirin','Shirisha','Shobha','Shradha','Shravani','Shreya',
  'Shruti','Shubha','Sindhu','Smita','Soumya','Sowjanya','Sowmya','Sridevi','Srividya',
  'Sudha','Suganya','Sujatha','Sukanya','Suma','Sumithra','Sunanda','Supriya',
  'Surabhi','Sushila','Swarna','Sweta','Syamala','Tejaswini','Triveni','Uma',
  'Vanitha','Vasantha','Vasudha','Veda','Vimala','Yamuna','Yashoda','Yasmin','Zoya',
  'Apurva','Bhavya','Chaitra','Deepthi','Eesha','Esha','Gargi','Heena','Jasmine',
  'Jyothika','Karishma','Khushi','Komal','Kriti','Kumari','Latika','Madhura',
  'Mahima','Maitreyi','Mandakini','Megha','Meghna','Mithila','Naina','Namrata',
  'Natasha','Nikita','Nilufar','Nirupa','Nisha','Nishita','Parvathi','Prachi',
  'Pranathi','Preeti','Rachi','Rashmita','Rukmini','Rupali','Sakshi','Sandhya',
  'Sanjana','Sapna','Seema','Shefali','Shikha','Shreelakshmi','Shreeya','Simran',
  'Sonali','Sonam','Sparsha','Srushti','Subhashini','Sunitha','Swapna','Taruna',
  'Trupti','Vaishnavi','Varsha','Veena','Vibha','Vidya','Vrinda','Yamini','Yashvini',
]);

const CITIES =
  'Hyderabad|Bangalore|Bengaluru|Mumbai|Delhi|New Delhi|Chennai|Pune|Kolkata|Ahmedabad|' +
  'Jaipur|Surat|Lucknow|Kanpur|Nagpur|Indore|Thane|Bhopal|Visakhapatnam|Patna|Coimbatore|' +
  'Agra|Gurgaon|Gurugram|Noida|Chandigarh|Kochi|Cochin|Mysore|Mysuru|Mangalore|Mangaluru|' +
  'Trivandrum|Thiruvananthapuram|Bhubaneswar|Raipur|Ranchi|Guwahati|Dehradun|Varanasi|' +
  'Amritsar|Ludhiana|Vijayawada|Nashik|Rajkot|Vadodara|Srinagar|Jabalpur|Aurangabad|' +
  'New York|San Francisco|Austin|Seattle|Chicago|Boston|Los Angeles|Houston|Atlanta|Dallas|' +
  'Washington|Philadelphia|London|Berlin|Paris|Amsterdam|Dublin|Toronto|Vancouver|' +
  'Singapore|Dubai|Abu Dhabi|Sydney|Melbourne|Auckland|Tokyo|Kuala Lumpur';

const CITY_RX    = new RegExp(`\\b(${CITIES})\\b`, 'i');
const REMOTE_RX  = /\b(Remote|Hybrid|Work from Home|WFH|Onsite)\b/i;

const TITLE_KEYWORDS =
  'senior|sr|junior|jr|lead|principal|staff|associate|assistant|executive|chief|head|vp|vice president';
const TITLE_ROLES =
  'engineer|developer|designer|architect|manager|analyst|consultant|specialist|director|' +
  'officer|recruiter|scientist|technician|administrator|coordinator|intern|trainee|fresher';
const TITLE_DOMAINS =
  'software|frontend|front.end|backend|back.end|full.?stack|web|mobile|ios|android|devops|' +
  'cloud|data|ml|ai|machine learning|product|ux|ui|graphic|qa|quality|test|security|network|' +
  'systems?|database|bi|business intelligence|hr|human resources|talent|recruiting|marketing|' +
  'digital|content|seo|sales|finance|account|project|program|technical|java|python|react|' +
  'angular|node|dot.?net|php|ruby|embedded|firmware|hardware';

const TITLE_RX = new RegExp(
  `\\b(?:${TITLE_KEYWORDS})\\b.{0,40}\\b(?:${TITLE_ROLES})\\b` +
  `|\\b(?:${TITLE_DOMAINS})\\s*(?:${TITLE_ROLES})\\b` +
  `|\\b(?:ceo|cto|coo|cfo|ciso|cdo|intern|trainee|fresher|fresher)\\b`,
  'i'
);

// A single word that could appear in a person's name
const isNameWord = w =>
  /^[A-Z][a-z]{1,}(?:[-'][A-Za-z]+)*$/.test(w) || // John, O'Brien, Smith-Jones
  /^[A-Z]{2,15}$/.test(w) ||                         // JOHN, SMITH
  /^[A-Z][a-z]*[-'][A-Z][a-z]+$/.test(w) ||          // McDonald, O'Brien
  /^[A-Z]\.$/.test(w) ||                              // J.
  /^[A-Z]$/.test(w);                                  // J (initial)

// Doc-level headers that look like names but aren't
const DOC_HEADERS = new Set([
  'resume','cv','curriculum vitae','curriculum-vitae','biodata','bio-data',
  'portfolio','profile','about me','contact','contact information',
  'personal information','personal details','personal profile',
  'job application','candidate profile','my resume','my cv','the resume',
  'professional profile','career profile','career summary',
]);

function titleCase(str) {
  return str.split(/\s+/).map(w =>
    w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''
  ).join(' ').trim();
}

// Score how name-like a line is (0–10). Higher = more confident it's a name.
function nameScore(line) {
  const normalized = line.trim();
  if (!normalized || normalized.length < 2 || normalized.length > 60) return 0;
  if (DOC_HEADERS.has(normalized.toLowerCase())) return 0;
  if (/@|https?:|www\.|linkedin/i.test(normalized)) return 0;
  if (/\d{2,}/.test(normalized)) return 0;
  if (SECTION_HEADER_RX.test(normalized)) return 0;

  const words = normalized.split(/\s+/);
  if (words.length < 1 || words.length > 5) return 0;

  const nameWords = words.filter(isNameWord);
  let score = 0;

  // IMPROVEMENT 2: Boost if any word is a known Indian first name
  if (words.some(w => INDIAN_FIRST_NAMES.has(w))) score += 3;

  if (nameWords.length === words.length) score += 5;        // every word looks like a name word
  else if (nameWords.length >= words.length - 1) score += 3;

  if (words.length >= 2 && words.length <= 4) score += 3;  // sweet spot for a name
  else if (words.length === 1 && words[0].length >= 3) score += 1;

  if (nameWords.some(w => w.replace(/[.\-']/g, '').length >= 3)) score += 2; // real word, not just initials

  if (/^[A-Z]/.test(normalized)) score += 1;               // starts with capital

  // Penalise if it looks like a job title
  if (TITLE_RX.test(normalized)) score -= 3;

  return Math.max(0, score);
}

// Derive a best-guess name from an email address local part
// "sai.charan@gmail.com" → "Sai Charan"
// "naveen123@gmail.com"  → "Naveen"
function nameFromEmail(email) {
  const NOISE = new Set(['hr','info','mail','admin','contact','jobs','careers',
    'support','sales','hello','noreply','team','office','help','enquiry','query',
    'cv','resume','apply','career','talent','hire','recruitment','official']);
  const local = (email.split('@')[0] || '')
    .replace(/\d+/g, ' ')
    .replace(/[._\-+]+/g, ' ')
    .trim();
  const words = local.split(/\s+/)
    .filter(w => w.length >= 2 && !NOISE.has(w.toLowerCase()))
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  return words.join(' ');
}

// Extract a name from a LinkedIn URL slug
// "linkedin.com/in/sai-charan-mh" → "Sai Charan Mh"
function nameFromLinkedIn(url) {
  const m = (url || '').match(/linkedin\.com\/(?:in|pub)\/([a-zA-Z0-9\-]+)/i);
  if (!m) return '';
  return m[1].split('-')
    .filter(w => w.length >= 2 && !/^\d+$/.test(w))
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Expand initials using email prefix words
// name="S. Charan", email="sai.charan@gmail.com" → "Sai Charan"
function expandInitials(name, email) {
  if (!email || !name) return name;
  const emailWords = (email.split('@')[0] || '')
    .replace(/\d+/g, ' ').replace(/[._\-+]+/g, ' ')
    .trim().split(/\s+/).filter(w => w.length >= 2);
  return name.split(/\s+/).map(part => {
    if (/^[A-Z]\.$/.test(part) || /^[A-Z]$/.test(part)) {
      const initial = part[0].toUpperCase();
      const match = emailWords.find(w => w[0].toUpperCase() === initial && w.length > 1);
      if (match) return match[0].toUpperCase() + match.slice(1).toLowerCase();
    }
    return part;
  }).join(' ');
}

// ─── Email helpers ────────────────────────────────────────────────────────────
function isValidEmail(s) {
  return /^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(s);
}

// Scores how email-like a raw string is (0–5). 3+ = 60% = treat as email.
function emailScore(s) {
  let sc = 0;
  if (/@|\(at\)|\[at\]/i.test(s))                                        sc++; // has @ or (at)
  if (/[a-zA-Z0-9._%+\-]{2,}/.test(s.split(/@|\(at\)|\[at\]/i)[0]))    sc++; // valid local part
  if (/[a-zA-Z0-9\-]{2,}/.test((s.split(/@|\(at\)|\[at\]/i)[1] || ''))) sc++; // domain part
  if (/\./.test((s.split(/@|\(at\)|\[at\]/i)[1] || '')))                sc++; // dot in domain
  if (/\.(com|net|org|in|io|co|gov|edu|info|biz|dev|app|ai|tech|online|uk|us|ca|au|de|me|sg|ae)\b/i.test(s)) sc++; // known TLD
  return sc;
}

// Extracts the best email from a string, handling all common PDF/OCR artifacts.
function extractEmailFromStr(raw) {
  if (!raw) return '';

  // Normalize (dot) / [dot] → actual dot
  let s = raw
    .replace(/\s*\(dot\)\s*/gi, '.')
    .replace(/\s*\[dot\]\s*/gi, '.');

  // Normalize (at) / [at] → @
  const sAt = s
    .replace(/\s*\(at\)\s*/gi, '@')
    .replace(/\s*\[at\]\s*/gi, '@');

  // 1. Strict standard email (most reliable — try both original and normalized)
  for (const src of [s, sAt]) {
    const m = src.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (m) return m[0].toLowerCase().replace(/\.$/, '');
  }

  // 2. Spaces around @: "naveen @ gmail.com"  /  "naveen @gmail.com"
  //    Also handles domain-side spaces: "naveen@gmail .com"
  for (const src of [s, sAt]) {
    const m = src.match(
      /([a-zA-Z0-9][a-zA-Z0-9._%+\-]{0,60})\s{0,4}@\s{0,4}([a-zA-Z0-9.\-\s]{2,60})\s*\.\s*([a-zA-Z]{2,12})/
    );
    if (m) {
      const assembled =
        m[1].replace(/\s/g, '') + '@' +
        m[2].replace(/\s/g, '') + '.' +
        m[3].replace(/\s/g, '');
      const r = assembled.toLowerCase();
      if (isValidEmail(r)) return r;
    }
  }

  // 3. Highly spaced / kerned: "n a v e e n @ g m a i l . c o m"
  //    Remove all spaces and retry if the result looks like an email
  const noSpace = s.replace(/\s/g, '');
  if (/@/.test(noSpace)) {
    const m = noSpace.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
    if (m) return m[0].toLowerCase();
  }

  return '';
}

// Full-text email scanner: scans first N lines for any email-like pattern
function findEmailInText(text, scanLines = 40) {
  const lines = text.split(/\r?\n/).slice(0, scanLines);

  // Pass 1: look for explicit "Email:" / "E-mail:" / "Mail:" labels
  for (const line of lines) {
    if (/\be[\-.]?mail\s*[:\-–]|^mail\s*[:\-–]/i.test(line)) {
      const after = line.replace(/^[^:–\-]+[:\-–]\s*/, '');
      const found = extractEmailFromStr(after) || extractEmailFromStr(line);
      if (found) return found;
    }
  }

  // Pass 2: try each line as a whole
  for (const line of lines) {
    const found = extractEmailFromStr(line);
    if (found) return found;
  }

  // Pass 3: 60% score — try pieces of each line
  for (const line of lines) {
    for (const piece of line.split(/\s{2,}|[|•·◆▪]/)) {
      const p = piece.trim();
      if (p.length < 5) continue;
      if (emailScore(p) >= 3) {
        const found = extractEmailFromStr(p);
        if (found) return found;
      }
    }
  }

  return '';
}

// IMPROVEMENT 5: GitHub and Portfolio extraction helpers
function extractGithub(text) {
  const m = text.match(/github\.com\/([a-zA-Z0-9\-_]+)(?:\/[^\s)>,]*)?/i);
  if (m) return `https://github.com/${m[1]}`;
  return '';
}

function extractPortfolio(text) {
  // Explicit label
  const label = text.match(/(?:portfolio|website|personal site|blog)\s*[:\-]\s*(https?:\/\/[^\s,)>]+)/i);
  if (label) return label[1].trim();
  // URL that's not linkedin/github/twitter/facebook but looks like a portfolio
  const urls = [...text.matchAll(/https?:\/\/(?!(?:linkedin|github|twitter|facebook|instagram|youtube|wa\.me|api\.|localhost)[./])[a-zA-Z0-9\-_.]+\.[a-zA-Z]{2,}(?:\/[^\s)>,]*)*/gi)];
  if (urls.length) return urls[0][0].trim();
  return '';
}

function classifyPiece(piece) {
  const p = piece.trim().replace(/\s+/g, ' ');
  if (!p || p.length < 2) return null;

  // Email — fuzzy extractor handles spaces, (at), (dot), kerning artifacts
  const emailVal = extractEmailFromStr(p);
  if (emailVal) return { type: 'email', value: emailVal };

  // Phone — any piece containing 7–15 digits (after stripping non-digit chars)
  {
    const digits = p.replace(/\D/g, '');
    if (digits.length >= 7 && digits.length <= 15) {
      const phone = extractPhoneStr(p);
      if (phone) return { type: 'phone', value: phone };
    }
  }

  // LinkedIn URL
  if (/linkedin/i.test(p)) {
    const li = extractLinkedInStr(p);
    if (li) return { type: 'linkedin', value: li };
  }

  // IMPROVEMENT 5: GitHub URL — capture specifically as github type
  if (/github\.com/i.test(p)) return { type: 'github', value: extractGithub(p) || p };

  // Other URLs — portfolio, behance, dribbble, etc. (skip for name extraction)
  if (/https?:|www\.|portfolio|behance|dribbble/i.test(p)) return { type: 'url', value: p };

  // Location
  if ((CITY_RX.test(p) || REMOTE_RX.test(p)) && p.length <= 60 && !/\d{4,}/.test(p))
    return { type: 'location', value: (p.match(CITY_RX) || p.match(REMOTE_RX))[0].trim() };

  // Job Title
  const titleMatch = p.match(TITLE_RX);
  if (titleMatch && titleMatch[0].length >= 5 && p.length <= 100 && !SECTION_HEADER_RX.test(p))
    return { type: 'title', value: titleMatch[0].trim() };

  // Name — check if piece looks like a person's name
  if (!SECTION_HEADER_RX.test(p) && p.length >= 3 && p.length <= 70 && !/\d{2,}/.test(p)) {
    const words = p.split(/\s+/);
    if (words.length >= 2 && words.length <= 6) {
      const nameWords  = words.filter(isNameWord);
      const hasFullWord = nameWords.some(w => w.replace(/[.\-']/g, '').length >= 3);
      if (nameWords.length >= 2 && hasFullWord)
        return { type: 'name', value: p };
    }
  }

  return { type: 'other', value: p };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3 — CONTACT BLOCK PARSER
// Reads the first ~15 lines, splits each by separators, classifies every piece
// ═══════════════════════════════════════════════════════════════════════════════

function parseContactBlock(lines, fullText) {
  // IMPROVEMENT 5: Added github and portfolio to result
  const result = { name: '', email: '', phone: '', linkedin: '', location: '', title: '', github: '', portfolio: '' };

  // ── 1. EMAIL first — anchors everything else ───────────────────────────────
  result.email = findEmailInText(fullText, 50);

  // ── 2. Explicit "Name:" / "Full Name:" label ───────────────────────────────
  const nameLabel = fullText.match(/^[ \t]*(?:full\s+)?name[ \t]*[:\-–][ \t]*([^\n@\d|]{3,70})/im);
  if (nameLabel) result.name = titleCase(nameLabel[1].trim());

  // ── 3. Layout logic — first high-scoring line is the name ─────────────────
  // (handles AS-IS and ALL-CAPS variants; skips doc headers like "Resume", "CV")
  if (!result.name) {
    let best = 0, bestName = '';
    for (const rawLine of lines.slice(0, 6)) {
      const fl = rawLine.trim();
      if (!fl) continue;
      // Try both the raw line and its title-cased version (covers ALL CAPS names)
      for (const candidate of [fl, titleCase(fl)]) {
        const sc = nameScore(candidate);
        if (sc > best) { best = sc; bestName = candidate; }
      }
      if (best >= 6) break; // very confident — stop early
    }
    if (best >= 3) result.name = bestName;
  }

  // ── 4. LinkedIn slug → name ────────────────────────────────────────────────
  const liMatch = fullText.match(/linkedin\.com\/(?:in|pub)\/([a-zA-Z0-9\-_%]+)/i);
  if (liMatch) {
    result.linkedin = `https://linkedin.com/in/${liMatch[1].replace(/\/$/, '')}`;
    if (!result.name) {
      const n = nameFromLinkedIn(result.linkedin);
      if (n) result.name = n;
    }
  }

  // ── 5. Piece-by-piece scan of contact block ────────────────────────────────
  for (const rawLine of lines.slice(0, 20)) {
    const line = rawLine.trim();
    if (!line || SECTION_HEADER_RX.test(line)) continue;

    const pieces = line
      .split(/\s*[|•·✦✧◆▪▸►▶◉○●✓✔]\s*|\s{3,}/)
      .map(p => p.trim()).filter(Boolean);
    const candidates = pieces.length > 1 ? [...pieces, line] : [line];

    for (const piece of candidates) {
      const cl = classifyPiece(piece);
      if (!cl) continue;
      const { type, value } = cl;
      if (!result.email     && type === 'email')    result.email    = value;
      if (!result.phone     && type === 'phone')    result.phone    = value;
      if (!result.linkedin  && type === 'linkedin') result.linkedin = value;
      if (!result.location  && type === 'location') result.location = value;
      if (!result.title     && type === 'title')    result.title    = value;
      if (!result.name      && type === 'name')     result.name     = value;
      // IMPROVEMENT 5: Capture github and portfolio
      if (!result.github    && type === 'github')   result.github   = value;
      if (!result.portfolio && type === 'url')      result.portfolio = value;
    }
    if (result.name && result.email) break;
  }

  // ── 6. Email-to-name logic (runs after email + piece scan) ────────────────
  if (result.email) {
    // 6a. Expand initials: "S. Charan" + email "sai.charan@..." → "Sai Charan"
    if (result.name && /\b[A-Z]\.?\s/.test(result.name))
      result.name = expandInitials(result.name, result.email);

    // 6b. Cross-reference: find line whose words match the email prefix
    if (!result.name) {
      const emailWords = (result.email.split('@')[0] || '')
        .replace(/\d+/g, ' ').replace(/[._\-+]+/g, ' ')
        .trim().toLowerCase().split(/\s+/).filter(w => w.length >= 2);

      for (const rawLine of lines.slice(0, 12)) {
        const fl = rawLine.trim();
        if (!fl || fl.length > 60) continue;
        const lineWords = fl.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
        const hits = emailWords.filter(ew =>
          lineWords.some(lw => lw.startsWith(ew) || ew.startsWith(lw))
        ).length;
        if (hits >= Math.min(2, emailWords.length) && nameScore(fl) >= 2) {
          result.name = titleCase(fl);
          break;
        }
      }
    }

    // 6c. Last resort — derive directly from email prefix
    if (!result.name) result.name = nameFromEmail(result.email);
  }

  // ── 7. Title fallback ──────────────────────────────────────────────────────
  if (!result.title) {
    for (const line of lines.slice(0, 25)) {
      const m = line.match(TITLE_RX);
      if (m && m[0].length >= 5) { result.title = m[0].trim(); break; }
    }
  }
  if (!result.title) {
    const label = fullText.match(/(?:designation|position|role|title|current role|job title)\s*[:\-–]\s*([^\n]{5,80})/i);
    if (label) result.title = label[1].trim();
  }

  // ── 8. Location fallback ───────────────────────────────────────────────────
  if (!result.location) {
    const m = fullText.match(CITY_RX) || fullText.match(REMOTE_RX);
    if (m) result.location = m[0].trim();
  }

  return result;
}

function extractPhoneStr(s) {
  const pats = [
    // ── India: +91 with any separator ─────────────────────────────────────────
    /\+91[\s\-.]?\d{5}[\s\-.]?\d{5}/,
    /\+91[\s\-.]?\d{10}/,
    /\+91[\s\-.]?\(?\d{4,5}\)?[\s\-.]?\d{5,6}/,
    // ── India: 91 prefix without + ────────────────────────────────────────────
    /\b91[\s\-.]?\d{5}[\s\-.]?\d{5}\b/,
    /\b91\d{10}\b/,
    // ── India: 10-digit mobile starting 6-9 (with optional separators) ────────
    /\b[6-9]\d{4}[\s\-.]?\d{5}\b/,
    /\b[6-9]\d{9}\b/,
    // ── International: + country code + local number ──────────────────────────
    /\+\d{1,3}[\s\-.]?\(?\d{1,4}\)?[\s\-.]?\d{3,5}[\s\-.]?\d{3,5}/,
    /\+\d{10,15}/,
    // ── US/Canada: (XXX) XXX-XXXX  or  XXX-XXX-XXXX  or  XXX.XXX.XXXX ────────
    /\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}/,
    // ── Generic split patterns: covers 7–13 digit numbers with separators ──────
    /\b\d{3}[\s\-.]?\d{4}[\s\-.]?\d{4}\b/,   // 3-4-4  (11 digits)
    /\b\d{4}[\s\-.]?\d{3}[\s\-.]?\d{4}\b/,   // 4-3-4  (11 digits)
    /\b\d{4}[\s\-.]?\d{4}[\s\-.]?\d{4}\b/,   // 4-4-4  (12 digits)
    /\b\d{5}[\s\-.]?\d{5}\b/,                 // 5-5    (10 digits)
    /\b\d{4}[\s\-.]?\d{6}\b/,                 // 4-6    (10 digits)
    /\b\d{2}[\s\-.]?\d{4}[\s\-.]?\d{4}\b/,   // 2-4-4  (10 digits)
    /\b\d{3}[\s\-.]?\d{3}[\s\-.]?\d{4}\b/,   // 3-3-4  (10 US)
    /\b\d{3}[\s\-.]?\d{4}[\s\-.]?\d{3}\b/,   // 3-4-3  (10 digits)
    /\b\d{4}[\s\-.]?\d{4}\b/,                 // 4-4    ( 8 digits)
    /\b\d{3}[\s\-.]?\d{4}\b/,                 // 3-4    ( 7 digits)
    // ── Contiguous digit blocks (last resort, broad coverage) ─────────────────
    /\b\d{15}\b/,  /\b\d{14}\b/,  /\b\d{13}\b/,  /\b\d{12}\b/,
    /\b\d{11}\b/,  /\b\d{10}\b/,  /\b\d{9}\b/,
    /\b\d{8}\b/,   /\b\d{7}\b/,
  ];
  for (const p of pats) { const m = s.match(p); if (m) return m[0].trim(); }
  return '';
}

function extractLinkedInStr(s) {
  const m = s.match(/linkedin\.com\/(?:in|pub)\/([a-zA-Z0-9\-_%]+)/i);
  if (m) return `https://linkedin.com/in/${m[1].replace(/\/$/, '')}`;
  return '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4 — SECTION-BASED FIELD EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

function findSection(text, headers) {
  const escaped = headers.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const rx = new RegExp(
    `(?:^|\\n)[ \\t]*(?:${escaped})[ \\t]*[:\\-–—]?[ \\t]*\\n([\\s\\S]{1,1500}?)` +
    `(?=\\n[ \\t]*(?:${ALL_HEADERS})[ \\t]*[:\\-–—]?[ \\t]*\\n|$)`,
    'im'
  );
  return (text.match(rx) || [])[1] || null;
}

// ── Skills ─────────────────────────────────────────────────────────────────────
function extractSkills(text) {
  const section = findSection(text, [
    'skills','technical skills','core competencies','competencies','key skills',
    'technologies','tools & technologies','tools','expertise','tech stack',
    'proficiencies','technical expertise','programming languages','technologies used',
    'skill set','technical competencies','it skills','areas of expertise',
    'technical proficiencies','skills & technologies',
  ]);

  // ── Keyword scan — every skill type an HR could see ──────────────────────────
  const kw = [
    // ── Programming languages ──────────────────────────────────────────────────
    'JavaScript','TypeScript','Python','Java','C','C++','C#','Go','Rust','Ruby','PHP',
    'Swift','Kotlin','Scala','R','MATLAB','Perl','Shell','Bash','PowerShell','VBA',
    'Dart','Elixir','Haskell','Lua','Groovy','Assembly','F#','Clojure','Erlang',
    'COBOL','Fortran','PL/SQL','T-SQL',
    // ── Frontend / Web ─────────────────────────────────────────────────────────
    'React','Vue','Angular','Next.js','Nuxt.js','Svelte','HTML','CSS','SASS','SCSS',
    'Tailwind','Bootstrap','jQuery','Redux','MobX','Webpack','Vite','Gatsby','Remix',
    'Storybook','Material UI','Chakra UI','Ant Design','Styled Components','Emotion',
    'Three.js','D3.js','Chart.js','Leaflet','WebGL','WebAssembly',
    // ── Backend / Frameworks ───────────────────────────────────────────────────
    'Node.js','Express','Django','Flask','FastAPI','Spring','Spring Boot','Laravel',
    'Rails','ASP.NET','.NET','Gin','Fiber','NestJS','Fastify','Hapi','Koa','Strapi',
    'Phoenix','Actix','Axum','Rocket',
    // ── Mobile ─────────────────────────────────────────────────────────────────
    'React Native','Flutter','SwiftUI','Jetpack Compose','Ionic','Xamarin','Expo',
    'Android Development','iOS Development','Kotlin Multiplatform',
    // ── Databases ──────────────────────────────────────────────────────────────
    'SQL','PostgreSQL','MySQL','SQLite','MongoDB','Redis','Elasticsearch','Cassandra',
    'DynamoDB','Oracle','MSSQL','Firebase','Supabase','CouchDB','Neo4j','MariaDB',
    'Snowflake','BigQuery','Redshift','ClickHouse','PlanetScale','Neon',
    'Cosmos DB','Azure SQL','AWS Aurora',
    // ── ORM / ODM ──────────────────────────────────────────────────────────────
    'Prisma','TypeORM','Sequelize','Mongoose','Hibernate','SQLAlchemy','JPA','MyBatis',
    // ── Cloud & DevOps ─────────────────────────────────────────────────────────
    'AWS','Azure','GCP','Google Cloud','Docker','Kubernetes','Terraform','Ansible',
    'Jenkins','CI/CD','GitHub Actions','GitLab CI','Linux','Nginx','Apache','Helm',
    'AWS Lambda','EC2','S3','RDS','ECS','EKS','CloudFormation','CloudWatch',
    'Vercel','Netlify','Heroku','DigitalOcean','Cloudflare','Linode',
    'Pulumi','Vagrant','VMware','VirtualBox',
    // ── Message queues / Streaming ─────────────────────────────────────────────
    'RabbitMQ','Apache Kafka','Apache Flink','Apache Beam','ActiveMQ','NATS',
    'AWS SQS','AWS SNS','Azure Service Bus',
    // ── Developer tools ────────────────────────────────────────────────────────
    'Git','GitHub','GitLab','Bitbucket','SVN','Jira','Confluence','Figma','Sketch',
    'Adobe XD','Postman','Insomnia','VS Code','IntelliJ','Eclipse','Xcode',
    'Notion','Trello','Asana','Linear','Monday.com','ClickUp','Slack','Microsoft Teams',
    // ── Testing ────────────────────────────────────────────────────────────────
    'Jest','Mocha','Chai','Cypress','Selenium','Playwright','Puppeteer','Vitest',
    'JUnit','TestNG','Pytest','unittest','RSpec','k6','JMeter','Locust',
    'Selenium WebDriver','Appium','NUnit','Moq','Mockito','WireMock',
    'SonarQube','Coveralls','Codecov',
    // ── Data / Analytics / BI ─────────────────────────────────────────────────
    'TensorFlow','PyTorch','Scikit-learn','Keras','Pandas','NumPy','Matplotlib',
    'Seaborn','Plotly','OpenCV','Spark','Hadoop','Tableau','Power BI','Excel',
    'Looker','dbt','Metabase','Superset','Google Data Studio','Jupyter',
    'Databricks','Airflow','MLflow','Kubeflow',
    // ── AI / ML / GenAI ────────────────────────────────────────────────────────
    'Machine Learning','Deep Learning','NLP','Computer Vision','Data Science',
    'Data Analysis','Data Engineering','LLM','Generative AI','OpenAI','LangChain',
    'Hugging Face','Stable Diffusion','Prompt Engineering','RAG','Fine-tuning',
    'Feature Engineering','A/B Testing','Statistical Analysis',
    // ── Observability ──────────────────────────────────────────────────────────
    'Prometheus','Grafana','ELK Stack','Datadog','New Relic','Splunk','Sentry',
    'Jaeger','Zipkin','OpenTelemetry',
    // ── Architecture / Patterns ────────────────────────────────────────────────
    'REST','GraphQL','gRPC','WebSocket','MQTT','OAuth','JWT','SAML','LDAP',
    'Microservices','Serverless','OOP','Design Patterns','TDD','BDD','DevOps','MLOps',
    'Agile','Scrum','Kanban','SDLC','Event-Driven','Domain-Driven Design',
    'CQRS','Event Sourcing','Hexagonal Architecture','Clean Architecture',
    // ── Build tools ────────────────────────────────────────────────────────────
    'Maven','Gradle','npm','yarn','pnpm','Make','CMake','Bazel','Rollup',
    // ── Networking / Security ──────────────────────────────────────────────────
    'TCP/IP','DNS','VPN','Firewall','Cisco','Wireshark','SSL/TLS','HTTPS',
    'API Gateway','Load Balancing','CDN','Nginx','HAProxy',
    'Penetration Testing','OWASP','Burp Suite','Metasploit','Nmap','Kali Linux',
    'SIEM','SOC','ISO 27001','NIST','GDPR','Compliance',
    // ── Blockchain ─────────────────────────────────────────────────────────────
    'Blockchain','Solidity','Web3.js','Ethereum','Smart Contracts','Hardhat','Truffle',
    // ── Game / 3D ──────────────────────────────────────────────────────────────
    'Unity','Unreal Engine','OpenGL','Vulkan','DirectX','Blender',
    // ── Embedded / Hardware ────────────────────────────────────────────────────
    'Embedded C','Arduino','Raspberry Pi','RTOS','FPGA','Verilog','VHDL',
    'PLC','SCADA','LabVIEW','Microcontrollers','IoT',

    // ═════════════════════════════════════════════════════════════════════════
    // NON-TECHNICAL SKILLS — HR / Recruitment / Operations / Finance / Marketing
    // ═════════════════════════════════════════════════════════════════════════

    // ── Human Resources ────────────────────────────────────────────────────────
    'Recruiting','Talent Acquisition','Sourcing','Headhunting','Boolean Search',
    'HRMS','HRIS','ATS','Payroll','Payroll Management','Payroll Processing',
    'Onboarding','Offboarding','Exit Management','Employee Engagement',
    'Performance Management','Performance Appraisal','KPI','OKR',
    'Compensation & Benefits','Benefits Administration','Salary Benchmarking',
    'Training & Development','Learning & Development','L&D','LMS',
    'Workforce Planning','Headcount Planning','Succession Planning',
    'Employee Relations','Industrial Relations','Labour Law','Employment Law',
    'HR Policy','HR Compliance','Statutory Compliance','PF','ESI','Gratuity',
    'Grievance Handling','Disciplinary Action','Background Verification',
    'Job Description','Offer Letter','Contract Management',
    'Diversity & Inclusion','DEIB','Campus Hiring','Lateral Hiring','Mass Hiring',
    'Naukri','LinkedIn Recruiter','Indeed','Shine','Monster',
    'Workday','SAP SuccessFactors','Darwinbox','Keka','GreytHR','BambooHR','Zoho People',
    'Interview Scheduling','Panel Management','Reference Check',

    // ── Sales & Business Development ──────────────────────────────────────────
    'Sales','B2B Sales','B2C Sales','Inside Sales','Outside Sales','Field Sales',
    'Lead Generation','Cold Calling','Cold Emailing','Outbound Sales',
    'Account Management','Key Account Management','Client Relationship Management',
    'CRM','Salesforce CRM','HubSpot CRM','Zoho CRM','Pipeline Management',
    'Sales Forecasting','Revenue Growth','Upselling','Cross-selling',
    'Negotiation','Closing Deals','Proposal Writing','RFP','RFQ',
    'Business Development','Partnerships','Channel Sales','Distributor Management',

    // ── Marketing / Digital Marketing ─────────────────────────────────────────
    'Marketing','Digital Marketing','SEO','SEM','PPC','Google Ads','Facebook Ads',
    'Instagram Marketing','LinkedIn Marketing','Twitter Marketing','YouTube Marketing',
    'Content Marketing','Content Writing','Copywriting','Blogging','Social Media',
    'Social Media Management','Community Management','Influencer Marketing',
    'Email Marketing','Email Campaigns','Mailchimp','Klaviyo','HubSpot Marketing',
    'Brand Management','Brand Strategy','Market Research','Competitive Analysis',
    'Google Analytics','Google Search Console','Meta Pixel','Google Tag Manager',
    'Campaign Management','Performance Marketing','Affiliate Marketing',
    'Conversion Rate Optimization','CRO','Landing Page Optimization',
    'Marketing Automation','Pardot','Marketo','ActiveCampaign',
    'E-commerce','Shopify','WooCommerce','Amazon Seller',
    'Graphic Design','Video Editing','Photoshop','Illustrator',
    'After Effects','Premiere Pro','InDesign','Canva','Figma',

    // ── Finance & Accounting ───────────────────────────────────────────────────
    'Accounting','Financial Accounting','Management Accounting','Cost Accounting',
    'Financial Analysis','Financial Reporting','Financial Modeling','Valuation',
    'Budgeting','Forecasting','Cash Flow Management','Working Capital Management',
    'Accounts Payable','Accounts Receivable','Bookkeeping','Reconciliation',
    'Taxation','GST','Income Tax','Tax Filing','TDS','Indirect Tax','Direct Tax',
    'Auditing','Internal Audit','Statutory Audit','Due Diligence',
    'Tally','Tally ERP','QuickBooks','Zoho Books','SAP FICO','SAP MM','SAP SD',
    'MS Excel','Advanced Excel','VLOOKUP','Pivot Tables','Financial Dashboards',
    'MIS Reporting','Management Information Systems',
    'Banking','Credit Analysis','Risk Management','Treasury Management',
    'Investment Banking','Equity Research','Fund Management','Portfolio Management',

    // ── Operations & Supply Chain ──────────────────────────────────────────────
    'Operations Management','Process Improvement','Process Optimization',
    'Six Sigma','Lean','Lean Six Sigma','Kaizen','5S','ISO 9001',
    'Supply Chain Management','Logistics','Procurement','Vendor Management',
    'Inventory Management','Warehouse Management','ERP',
    'Quality Control','Quality Assurance','QA','QC','CAPA',
    'Project Management','PMP','PRINCE2','MS Project','Stakeholder Management',

    // ── Customer Service / Support ─────────────────────────────────────────────
    'Customer Service','Customer Support','Customer Success','Client Servicing',
    'Technical Support','Help Desk','Call Center','Contact Center',
    'CRM Management','Zendesk','Freshdesk','Freshservice','ServiceNow','Intercom',
    'CSAT','NPS','SLA Management','Ticket Management',

    // ── Communication / Soft Skills (listed on resumes) ────────────────────────
    'Communication','Written Communication','Verbal Communication',
    'Presentation Skills','Public Speaking','Stakeholder Communication',
    'Team Management','Team Leadership','Cross-functional Teams',
    'Problem Solving','Critical Thinking','Decision Making','Analytical Skills',
    'Time Management','Prioritization','Multitasking','Attention to Detail',
    'Adaptability','Flexibility','Initiative','Ownership',
    'Coaching','Mentoring','People Management','Change Management',
    'Conflict Resolution','Negotiation Skills','Interpersonal Skills',

    // ── Healthcare / Pharma / Life Sciences ───────────────────────────────────
    'Clinical Research','Clinical Trials','GCP','GMP','GDP','FDA','CDSCO',
    'Medical Coding','ICD-10','CPT','Medical Billing','EHR','EMR','HL7','FHIR',
    'Pharmacovigilance','Drug Safety','Regulatory Affairs','CTMS',
    'Healthcare IT','Hospital Management','Patient Care',

    // ── Education / Training ──────────────────────────────────────────────────
    'Curriculum Design','Instructional Design','E-learning','SCORM',
    'Training Facilitation','Training Delivery','Workshop Facilitation',
    'Moodle','Canvas','Blackboard','Articulate Storyline',

    // ── Legal / Compliance ────────────────────────────────────────────────────
    'Contract Drafting','Contract Review','Legal Research','Litigation',
    'Corporate Law','Labour Law','Intellectual Property','Trademark',
    'GDPR','Data Privacy','Risk & Compliance','KYC','AML',

    // ── Engineering (non-IT) ──────────────────────────────────────────────────
    'AutoCAD','SolidWorks','CATIA','ANSYS','Pro-E','Creo','Inventor',
    'Civil Engineering','Structural Analysis','STAAD Pro','ETABS','Revit',
    'Mechanical Engineering','Thermal Analysis','CFD','FEA',
    'Electrical Engineering','PLC Programming','SCADA','HMI',

    // ── General / MS Office ───────────────────────────────────────────────────
    'MS Office','Microsoft Office','Word','Excel','PowerPoint','Outlook',
    'Google Workspace','Google Docs','Google Sheets','Google Slides',

    // ── Additional Skills (Improvement 1 additions) ───────────────────────────
    'DSA','System Design','Design Patterns','WordPress','WooCommerce',
    'Bubble.io','Webflow','Framer','Retool',
    'Zapier','Make','n8n','IFTTT',
    'Mixpanel','Amplitude','Segment','Heap Analytics','Hotjar','Crazy Egg',
    'HubSpot','Zoho','Freshworks','Basecamp',
    'Zoom','Google Meet','Discord',
    'Miro','Lucidchart','Visio','Draw.io',
    'AWS Glue','AWS Athena','AWS SageMaker','AWS CloudFront',
    'Cloudinary','Twilio','SendGrid','Stripe','Razorpay','PayPal',
    'Socket.io','tRPC','Zod','Drizzle',
    'PlanetScale','Neon','Turso',
    'Astro','SvelteKit','Solid.js','Qwik',
    'Tauri','Electron','PWA',
    'Apache Spark','dbt','Prefect','Dagster',
    'Delta Lake',
    'OpenSearch','Typesense','Meilisearch',
    'MinIO','Ceph',
    'Istio','Linkerd','Envoy','Consul',
    'ArgoCD','FluxCD','Spinnaker',
    'Vault','Keycloak','Auth0','Okta','Cognito',
    'WebRTC','LiveKit','Agora',
    'LlamaIndex','ChromaDB','Pinecone','Weaviate','Qdrant',
    'Ollama','vLLM','TensorRT',
    'Flutter Web','Capacitor','NativeScript',
    'RxJS','Zustand','Jotai','Recoil','XState',
    'Chromatic',
    'Detox','XCTest','Espresso',
    'Pact','Contract Testing',
    'OpenAPI','Swagger','Redoc',
    'YAML','JSON','XML','CSV',
    'Linux Administration','Ubuntu Server','CentOS','RHEL','Debian',
    'Bash Scripting','Shell Scripting','Python Scripting','PowerShell Scripting',
    'Network Security','Cloud Security','Application Security','VAPT',
    'OWASP Top 10','CIS Benchmarks','PCI DSS','HIPAA','SOC 2',
    'Adobe Creative Suite','Adobe Creative Cloud',
    'Video Production','Motion Graphics','3D Modeling','Animation',
    'Content Strategy','Content Calendar','Copyediting','Technical Writing','Documentation',
    'Grant Writing','Report Writing',
    'Lean Startup','Design Thinking','User Research','Usability Testing',
    'Conversion Optimization','Funnel Analysis','Cohort Analysis',
    'Customer Journey Mapping','Persona Development',
    'Financial Modeling','DCF','LBO','Bloomberg Terminal',
    'IFRS','GAAP','Ind AS','Cost Audit','Tax Planning',
    'Customs','Import Export','Trade Finance',
    'Naukri RMS','iCIMS','Greenhouse','Lever','Taleo','SuccessFactors Recruiting',
  ];

  // Helper: normalize a token via SKILL_ALIASES
  const normalizeSkill = (token) => {
    const lower = token.toLowerCase().trim();
    return SKILL_ALIASES[lower] || token.trim();
  };

  if (section) {
    // Handle sub-category labels like "Languages: Python, Java\nFrameworks: React"
    const cleaned = section
      .replace(/^[ \t]*[A-Za-z &/()]+\s*:\s*/gm, ',')   // strip "Category:" prefixes
      .replace(/[•·▪▸►▶◆◉○●✓✔\-–—]/g, ',')
      .replace(/[|\\/\n\t]/g, ',')
      .replace(/\s{2,}/g, ',');

    const tokens = cleaned
      .split(',')
      .map(s => s.trim().replace(/\s+/g, ' '))
      .filter(s =>
        s.length >= 2 && s.length <= 60 &&
        /[a-zA-Z]/.test(s) &&
        !/^\d+$/.test(s) &&
        !/^(and|or|the|with|using|for|to|of|in|at|on|a|an|is|are|was|were)$/i.test(s)
      )
      .map(normalizeSkill);

    // Also run alias scanning on section text
    const aliasFound = [];
    const textLower = section.toLowerCase();
    for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
      if (textLower.includes(alias)) aliasFound.push(canonical);
    }

    const combined = [...new Set([...tokens, ...aliasFound])];
    if (combined.length >= 2) return combined.slice(0, 50).join(',');
  }

  // Keyword scan fallback
  const found = kw.filter(k => {
    const esc = k.replace(/[.+()[\]]/g, '\\$&');
    return new RegExp(`(?:^|[\\s,/|•\\-\\(\\[])${esc}(?:[\\s,/|•\\-\\)\\]]|$)`, 'i').test(text);
  });

  // Also scan full text for aliases
  const textLower = text.toLowerCase();
  const aliasMatches = [];
  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    if (textLower.includes(alias)) aliasMatches.push(canonical);
  }

  const allFound = [...new Set([...found, ...aliasMatches])];
  return allFound.join(',');
}

// ── Experience — reads EVERY date range, oldest→newest = total career span ─────
function extractExperience(text) {
  // Priority 1: explicit statement like "5 years of experience"
  const explicit = [
    /(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:total\s+)?(?:experience|exp|work|professional)/i,
    /(?:total\s+)?(?:experience|exp)(?:\s+of)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)/i,
    /(?:over|more than|around|approximately)\s+(\d+)\s*(?:years?|yrs?)/i,
    /(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s+(?:of\s+)?(?:industry|relevant|work|it|software)/i,
  ];
  for (const p of explicit) {
    const m = text.match(p);
    if (m) return Math.round(parseFloat(m[1]));
  }

  // Priority 2: scan ALL date ranges in the resume
  // Find month+year or year-only ranges: "Jan 2018 – Present", "2016 - 2020", etc.
  const now = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  const MONTH_MAP = {
    jan:1,feb:2,mar:3,apr:4,may:5,jun:6,
    jul:7,aug:8,sep:9,oct:10,nov:11,dec:12,
  };

  const parseMonthYear = (mon, yr) => {
    const y = parseInt(yr);
    const m = mon ? (MONTH_MAP[mon.toLowerCase().slice(0,3)] || 1) : 1;
    return { y, m };
  };

  const ranges = [
    ...text.matchAll(
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*((?:19|20)\d{2})\s*[-–—to]+\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?[a-z]*\.?\s*((?:19|20)\d{2}|present|current|now|till date|ongoing)\b/gi
    ),
    ...text.matchAll(
      /\b()((?:19|20)\d{2})\s*[-–—to]+\s*()((?:19|20)\d{2}|present|current|now|till date|ongoing)\b/gi
    ),
  ];

  if (ranges.length) {
    // Collect all start/end as {y, m} objects
    const segments = [];
    for (const m of ranges) {
      const from = parseMonthYear(m[1], m[2]);
      const isPresent = /present|current|now|till|ongoing/i.test(m[4] || '');
      const to = isPresent
        ? { y: currentYear, m: currentMonth }
        : parseMonthYear(m[3], m[4]);

      if (from.y >= 1985 && from.y <= currentYear)
        segments.push({ from, to });
    }

    if (segments.length) {
      // Oldest start date
      const oldest = segments.reduce((a, b) =>
        a.from.y < b.from.y || (a.from.y === b.from.y && a.from.m < b.from.m) ? a : b
      );
      // Most recent end date
      const newest = segments.reduce((a, b) =>
        a.to.y > b.to.y || (a.to.y === b.to.y && a.to.m > b.to.m) ? a : b
      );

      const totalMonths =
        (newest.to.y - oldest.from.y) * 12 + (newest.to.m - oldest.from.m);
      if (totalMonths > 0) return Math.round(totalMonths / 12);
    }
  }
  return 0;
}

// ── Projects ───────────────────────────────────────────────────────────────────
function extractProjects(text) {
  const section = findSection(text, [
    'projects','project details','personal projects','academic projects',
    'key projects','notable projects','project experience',
    'professional projects','selected projects',
  ]);
  if (!section) return '';

  // Take first 600 chars, clean whitespace
  return section.replace(/\n{3,}/g, '\n\n').replace(/\s+$/gm, '').trim().slice(0, 600);
}

// ── Industry ───────────────────────────────────────────────────────────────────
function extractIndustry(text, title, skills) {
  const t = `${text} ${title} ${skills}`.toLowerCase();

  const domains = [
    { label: 'Information Technology',   kw: ['software','it','saas','web development','app development','cloud','devops','sre','platform','backend','frontend','fullstack','mobile app','api','database','cybersecurity','data engineering'] },
    { label: 'Artificial Intelligence / Data Science', kw: ['machine learning','deep learning','data science','nlp','computer vision','ai','llm','generative ai','data analyst','data engineer','business intelligence','tableau','power bi'] },
    { label: 'Banking & Financial Services', kw: ['banking','financial services','investment banking','equity research','fund management','treasury','credit analysis','nbfc','insurance','wealth management','fintech','capital markets'] },
    { label: 'Accounting & Finance',      kw: ['accounting','gst','tally','taxation','audit','bookkeeping','accounts payable','accounts receivable','ca','chartered accountant','cpa','financial reporting'] },
    { label: 'Human Resources',           kw: ['recruiting','talent acquisition','hr','hris','hrms','payroll','onboarding','employee engagement','workforce planning','l&d','learning & development'] },
    { label: 'Sales & Business Development', kw: ['sales','business development','b2b','b2c','account manager','lead generation','crm','revenue','inside sales','field sales'] },
    { label: 'Digital Marketing',         kw: ['seo','sem','ppc','google ads','social media marketing','content marketing','email marketing','digital marketing','influencer','brand management'] },
    { label: 'Healthcare & Pharma',       kw: ['clinical','healthcare','pharma','medical','nursing','hospital','ehr','patient','pharmacovigilance','regulatory affairs','life sciences','biotech'] },
    { label: 'E-commerce & Retail',       kw: ['ecommerce','shopify','amazon','retail','merchandising','category management','supply chain','inventory','woocommerce','d2c'] },
    { label: 'Operations & Supply Chain', kw: ['operations','supply chain','logistics','procurement','warehouse','inventory management','six sigma','lean','quality control','manufacturing'] },
    { label: 'Customer Service',          kw: ['customer service','customer support','help desk','call center','zendesk','freshdesk','csat','nps','service now','contact center'] },
    { label: 'Engineering (Mechanical / Civil / Electrical)', kw: ['autocad','solidworks','catia','ansys','mechanical','civil','structural','electrical','plc','scada','embedded','iot','arduino'] },
    { label: 'Education & Training',      kw: ['teaching','education','curriculum','e-learning','lms','instructor','trainer','coaching','tutoring','academic'] },
    { label: 'Media & Entertainment',     kw: ['media','journalism','content','video','film','photography','editing','broadcast','publishing','pr','public relations'] },
    { label: 'Legal & Compliance',        kw: ['legal','law','compliance','contract','litigation','corporate law','gdpr','kyc','aml','intellectual property'] },
    { label: 'Real Estate & Construction',kw: ['real estate','property','construction','architecture','revit','autocad','civil engineering','project management','interior'] },
    { label: 'Consulting & Strategy',     kw: ['consulting','strategy','management consulting','business analysis','advisory','pmo','transformation','change management'] },
    { label: 'Telecom & Networking',      kw: ['telecom','networking','cisco','tcp/ip','voip','5g','noc','network engineer','ccna','ccnp','fiber','wireless'] },
    { label: 'Blockchain & Web3',         kw: ['blockchain','solidity','ethereum','web3','defi','nft','smart contract','crypto'] },
    { label: 'Gaming',                    kw: ['unity','unreal engine','game development','game design','opengl','vr','ar'] },
  ];

  let best = { label: '', score: 0 };
  for (const d of domains) {
    const score = d.kw.filter(k => t.includes(k)).length;
    if (score > best.score) best = { label: d.label, score };
  }
  return best.label;
}

// ── Current Company ────────────────────────────────────────────────────────────
function extractCurrentCompany(text) {
  // Explicit label
  const label = text.match(
    /(?:currently?\s*(?:working|employed)\s*(?:at|with|in)|current\s*(?:employer|company|organization|workplace))\s*[:\-]?\s*([^\n,|]{3,60})/i
  );
  if (label) {
    const co = label[1].trim().replace(/\s+/g, ' ');
    if (co.length >= 2) return co;
  }
  // Company on same line as "Present"
  const presentRx = /([^\n,–\-|•]{3,60})\s*(?:[,|]\s*)?(?:[A-Za-z]+,?\s*)?((?:19|20)\d{2})\s*[-–—to]+\s*(?:present|current|now|ongoing|till date)/gi;
  const matches   = [...text.matchAll(presentRx)];
  if (matches.length) {
    const sorted = matches
      .map(m => ({ company: m[1].trim().replace(/\s+/g, ' '), year: parseInt(m[2]) }))
      .filter(m => m.company.length >= 2 && m.company.length <= 60 && !/^\d/.test(m.company))
      .sort((a, b) => b.year - a.year);
    if (sorted.length) return sorted[0].company;
  }
  return '';
}

// ── IMPROVEMENT 4: Work History (structured job blocks) ───────────────────────
function extractWorkHistory(text) {
  const section = findSection(text, [
    'experience','work experience','professional experience','employment history',
    'work history','career history','employment','positions held',
    'professional background','work details','job history',
  ]);
  if (!section) return [];

  const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
  const YEAR_RANGE_RX = /(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?((?:19|20)\d{2})\s*[-–—to]+\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*)?((?:19|20)\d{2}|present|current|now|till date|ongoing)/gi;
  const MONTH_MAP = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};

  const jobs = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const matches = [...line.matchAll(YEAR_RANGE_RX)];

    if (matches.length > 0) {
      const m = matches[0];
      const fromYear = parseInt(m[2]);
      const isPresent = /present|current|now|till|ongoing/i.test(m[4] || '');
      const toYear = isPresent ? new Date().getFullYear() : parseInt(m[4]);
      const fromMonth = m[1] ? (MONTH_MAP[m[1].toLowerCase().slice(0,3)] || 1) : 1;
      const toMonth = isPresent ? new Date().getMonth()+1 : (m[3] ? (MONTH_MAP[m[3].toLowerCase().slice(0,3)] || 12) : 12);

      const totalMonths = (toYear - fromYear)*12 + (toMonth - fromMonth);
      const durationStr = totalMonths >= 12
        ? `${Math.floor(totalMonths/12)}y${totalMonths%12>0?' '+(totalMonths%12)+'m':''}`
        : `${totalMonths}m`;

      // Look back for company/title (within 3 previous non-empty lines)
      let company = '', title = '';
      for (let j = Math.max(0, i-3); j <= i; j++) {
        const l = lines[j];
        if (!l || l === line) continue;
        if (TITLE_RX.test(l) && l.length <= 80 && !title) {
          title = l.replace(/\s+/g, ' ').trim();
        } else if (l.length >= 3 && l.length <= 80 && !/^[•\-\*]/.test(l) && !company) {
          company = l.replace(/\s+/g, ' ').trim();
        }
      }
      // Also check the line itself for company name before/after the date range
      const lineBeforeDate = line.replace(YEAR_RANGE_RX, '').replace(/[-–—|,]+/g, ' ').trim();
      if (!company && lineBeforeDate.length >= 2 && lineBeforeDate.length <= 60) {
        company = lineBeforeDate.replace(/\s+/g, ' ').trim();
      }

      if (fromYear >= 1990 && fromYear <= new Date().getFullYear()) {
        jobs.push({
          company: company.slice(0, 60),
          title: title.slice(0, 80),
          from: `${fromYear}`,
          to: isPresent ? 'Present' : `${toYear}`,
          duration: durationStr,
          current: isPresent,
        });
      }
    }
    i++;
  }

  // Remove duplicate/empty entries
  const seen = new Set();
  return jobs.filter(j => {
    const key = `${j.from}-${j.to}-${j.company}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);
}

// ── IMPROVEMENT 3: Structured Education ───────────────────────────────────────
function extractEducation(text) {
  const section = findSection(text, [
    'education','academic','qualifications','educational background',
    'academic background','academic qualification','educational qualification',
    'academic details','educational details','academics',
  ]);
  const src = section || text.split('\n').slice(0, 60).join('\n');
  const lines = src.split('\n').map(l => l.trim()).filter(Boolean);

  const DEGREE_RX = /\b(?:b\.?tech|m\.?tech|b\.?e|m\.?e|b\.?sc|m\.?sc|bca|mca|b\.?com|m\.?com|bba|mba|phd|ph\.d|b\.?a\b|m\.?a\b|llb|llm|diploma|bachelor(?:'?s)?|master(?:'?s)?|doctorate|b\.?arch|m\.?arch|12th|10th|ssc|hsc|intermediate|high school|secondary school|matriculation|pgdm|pgdba|b\.?s|m\.?s\b)\b/i;
  const YEAR_RX = /\b(20[0-2]\d|199\d)\b/g;
  const GRADE_RX = /\b(\d+(?:\.\d+)?)\s*(?:cgpa|gpa|%|percent|marks?|grade)\b|\b(first class|second class|distinction|honours?|honors?|cum laude)\b/i;

  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!DEGREE_RX.test(line)) continue;

    // Collect this line + next 2 for context (year/grade might be on next line)
    const ctx = [line, lines[i+1] || '', lines[i+2] || ''].join(' ');

    const years = [...ctx.matchAll(YEAR_RX)].map(m => parseInt(m[1]));
    const yearStr = years.length ? `(${Math.max(...years)})` : '';

    const gradeMatch = ctx.match(GRADE_RX);
    const gradeStr = gradeMatch ? ` - ${gradeMatch[0].trim()}` : '';

    const degreeText = line.replace(/\s+/g, ' ').slice(0, 100);
    entries.push(`${degreeText}${yearStr ? ' ' + yearStr : ''}${gradeStr}`);
    if (entries.length >= 3) break;
  }

  if (entries.length) return entries.join(' | ');

  // Fallback: return first meaningful line from section
  if (section) {
    const first = lines.find(l => l.length >= 5);
    return first ? first.slice(0, 150) : '';
  }
  return '';
}

// ── Summary ────────────────────────────────────────────────────────────────────
function extractSummary(text, lines) {
  const s = findSection(text, [
    'summary','professional summary','career summary','executive summary',
    'objective','career objective','professional objective',
    'profile','professional profile','about me','about','overview',
    'introduction','professional overview','career profile',
  ]);
  if (s) return s.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);

  const para = lines.slice(0, 30).find(
    l => l.split(/\s+/).length >= 12 && l.length >= 80 && /[a-z]/.test(l)
  );
  return para ? para.trim().slice(0, 500) : '';
}

// ── Culture tags ───────────────────────────────────────────────────────────────
function extractCulture(text) {
  const kw = [
    'collaborative','remote','hybrid','autonomous','agile','startup','innovative',
    'data-driven','fast-paced','team player','leadership','mentoring','creative',
    'entrepreneurial','result-oriented','growth-oriented','customer-focused',
    'problem-solver','detail-oriented','self-motivated','cross-functional',
    'deadline-driven','strategic','analytical','proactive',
  ];
  return kw
    .filter(k => new RegExp(`\\b${k.replace(/-/g, '[- ]?')}\\b`, 'i').test(text))
    .join(',');
}

// ── Availability ───────────────────────────────────────────────────────────────
function extractAvailability(text) {
  if (/\bimmediate(?:ly)?\b/i.test(text)) return 'Immediate';
  const pat =
    text.match(/(\d+)\s*(months?|weeks?)\s*notice/i) ||
    text.match(/notice\s*(?:period)?\s*[:\-]?\s*(\d+)\s*(months?|weeks?)/i);
  if (pat) {
    const n    = pat[1];
    const unit = /month/i.test(pat[0]) ? 'month' : 'week';
    return `${n} ${unit}${parseInt(n) > 1 ? 's' : ''} notice`;
  }
  if (/serving\s*notice/i.test(text)) return 'Serving notice';
  return 'Immediate';
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 7 — ACHIEVEMENT / IMPACT EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

function extractAchievements(text) {
  const patterns = [
    // Percentage impact: "Increased revenue by 30%", "Reduced churn by 25%"
    /(?:increased?|improved?|grew?|boosted?|reduced?|decreased?|cut|saved?|optimized?|achieved?|delivered?|exceeded?)\w*\s+[\w\s]+\s+(?:by|to)\s+\d+(?:\.\d+)?%/gi,
    // Revenue / funding: "Generated $2M", "Saved ₹50L", "Raised $1.5M"
    /(?:generated?|raised?|achieved?|delivered?|secured?|closed?|saved?)\w*\s+[₹$€£][\d,.]+\s*(?:cr|crore|lakh|l|k|m|b|million|billion)?/gi,
    // User/customer scale: "500K users", "10,000+ customers"
    /\d[\d,]*(?:\.\d+)?[KkMmBb]?\+?\s*(?:users?|customers?|clients?|downloads?|installs?|subscribers?|followers?|leads?|orders?)/gi,
    // Team leadership: "Led a team of 15", "Managed 20+ engineers"
    /(?:led?|managed?|supervised?|mentored?|trained?|grew?|hired?|built?)\w*\s+(?:a\s+)?(?:team|squad|group|department)\s+of\s+\d+/gi,
    // Multiplier improvement: "3x faster", "2x growth", "5x improvement"
    /\d+(?:\.\d+)?[xX]\s+(?:faster|more efficient|growth|improvement|increase|reduction|cost saving)/gi,
    // Time savings: "Reduced build time by 40 minutes", "Saved 10 hours/week"
    /(?:saved?|reduced?|cut)\w*\s+\d+(?:\.\d+)?\s*(?:hours?|days?|weeks?|minutes?)\s*(?:per|\/)\s*(?:week|month|day)/gi,
    // Uptime/SLA: "Achieved 99.9% uptime", "Maintained 99% SLA"
    /(?:achieved?|maintained?|delivered?)\w*\s+\d+(?:\.\d+)?%\s*(?:uptime|availability|sla|accuracy|precision|recall)/gi,
  ];

  const found = new Set();

  // 1. Pattern scan on full text
  for (const pat of patterns) {
    const matches = text.match(pat) || [];
    for (const m of matches) {
      const t = m.trim();
      if (t.length >= 15 && t.length <= 220) found.add(t);
    }
  }

  // 2. Bullet-point lines from experience section that contain a number + impact signal
  const expSection = findSection(text, [
    'experience','work experience','professional experience','employment',
    'career history','positions held',
  ]);
  if (expSection) {
    const bulletLines = expSection
      .split('\n')
      .map(l => l.trim().replace(/^[•\-\*✓✔►▸▶◆▪\d.]+\s*/, ''))
      .filter(l =>
        l.length >= 25 && l.length <= 250 &&
        /\d+/.test(l) &&
        /[%₹$KMBx]|\b\d{2,}\b/.test(l) &&
        /(?:increase|decrease|reduce|improve|achieve|save|generate|launch|deploy|build|manage|lead|grow|deliver)/i.test(l)
      );
    for (const l of bulletLines.slice(0, 8)) found.add(l);
  }

  return [...found].slice(0, 8).join('\n');
}

// ── Certifications with dates ───────────────────────────────────────────────
function extractCertifications(text) {
  const section = findSection(text, [
    'certifications','certificates','certification','professional certifications',
    'licenses & certifications','credentials','awards & certifications',
    'courses','professional development','training','online courses',
  ]);
  if (!section && !/certifi/i.test(text)) return [];

  const src   = section || text;
  const YEAR  = /\b(20[0-2]\d|201\d|199\d)\b/g;
  const lines = src
    .split('\n')
    .map(l => l.trim().replace(/^[•\-\*✓✔►▸▶◆▪\d.]+\s*/, ''))
    .filter(l => l.length >= 6 && l.length <= 200 && /[a-zA-Z]{4,}/.test(l));

  return lines.slice(0, 10).map(line => {
    const years = [...line.matchAll(YEAR)].map(m => parseInt(m[1]));
    const yearTag = years.length ? ` (${Math.max(...years)})` : '';
    return line.replace(YEAR, '').replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim() + yearTag;
  }).filter(Boolean).slice(0, 8);
}

// ── Career gap detection ────────────────────────────────────────────────────
function detectCareerGaps(workHistory) {
  if (!workHistory || workHistory.length < 2) return [];
  const sorted = [...workHistory]
    .filter(j => j.from && /\d{4}/.test(j.from))
    .sort((a, b) => parseInt(a.from) - parseInt(b.from));

  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd  = sorted[i-1].to === 'Present'
      ? new Date().getFullYear()
      : parseInt(sorted[i-1].to);
    const nextStart = parseInt(sorted[i].from);
    const gapYears  = nextStart - prevEnd;
    if (gapYears >= 1) {
      gaps.push({
        from:    prevEnd.toString(),
        to:      nextStart.toString(),
        years:   gapYears,
        between: `${sorted[i-1].company || '?'} → ${sorted[i].company || '?'}`,
      });
    }
  }
  return gaps;
}

// ── Skills with inferred proficiency ───────────────────────────────────────
function inferSkillProficiency(text, skills) {
  if (!skills) return {};
  const t = text.toLowerCase();
  const profMap = {};
  const EXPERT_RX  = /\b(?:expert|advanced|strong|extensive|deep|proficient|specialist|senior|lead)\b/i;
  const MID_RX     = /\b(?:intermediate|proficient|working knowledge|hands.on|comfortable|familiar with)\b/i;
  const BEGINNER_RX= /\b(?:beginner|basic|learning|exposure to|some experience|introductory)\b/i;

  for (const skill of skills.split(',').map(s => s.trim()).filter(Boolean)) {
    const sl = skill.toLowerCase();
    // Search in a 60-char window around the skill mention
    const idx = t.indexOf(sl);
    if (idx === -1) { profMap[skill] = 'Familiar'; continue; }
    const window = t.slice(Math.max(0, idx - 60), idx + sl.length + 60);
    if (EXPERT_RX.test(window))   profMap[skill] = 'Expert';
    else if (MID_RX.test(window)) profMap[skill] = 'Proficient';
    else if (BEGINNER_RX.test(window)) profMap[skill] = 'Learning';
    else profMap[skill] = 'Familiar';
  }
  return profMap;
}

// ── Confidence scoring ─────────────────────────────────────────────────────
function computeConfidence(fields) {
  const nameOk   = fields.name  && /^[A-Z][a-z]/.test(fields.name) && fields.name.includes(' ');
  const emailOk  = fields.email && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email);
  const phoneOk  = fields.phone && fields.phone.replace(/\D/g, '').length >= 10;
  const skillCnt = (fields.skills || '').split(',').filter(Boolean).length;

  return {
    name:       nameOk  ? 90 : fields.name  ? 60 : 0,
    email:      emailOk ? 99 : 0,
    phone:      phoneOk ? 95 : fields.phone ? 60 : 0,
    skills:     skillCnt >= 10 ? 90 : skillCnt >= 5 ? 75 : skillCnt >= 1 ? 50 : 0,
    experience: (fields.experience || 0) > 0 ? 85 : 40,
    education:  (fields.education || '').length >= 10 ? 85 : 30,
    overall:    Math.round(
      (nameOk ? 90 : 50) * 0.20 +
      (emailOk ? 99 : 0) * 0.20 +
      (phoneOk ? 95 : 0) * 0.10 +
      (skillCnt >= 5 ? 85 : 40) * 0.30 +
      ((fields.experience || 0) > 0 ? 85 : 40) * 0.10 +
      ((fields.education || '').length >= 10 ? 85 : 30) * 0.10
    ),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 5 — ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

function parseFields(text) {
  const lines       = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const contact     = parseContactBlock(lines, text);
  const skills      = extractSkills(text);
  const workHistory = extractWorkHistory(text);

  const fields = {
    name:             contact.name,
    email:            contact.email,
    phone:            contact.phone,
    title:            contact.title,
    linkedin:         contact.linkedin,
    location:         contact.location,
    github:           contact.github,
    portfolio:        contact.portfolio || extractPortfolio(text),
    skills,
    experience:       extractExperience(text),
    summary:          extractSummary(text, lines),
    education:        extractEducation(text),
    currentCompany:   extractCurrentCompany(text),
    projects:         extractProjects(text),
    industry:         extractIndustry(text, contact.title, skills),
    culture:          extractCulture(text),
    availability:     extractAvailability(text),
    workHistory,
    // Phase 7 new fields
    achievements:     extractAchievements(text),
    certifications:   extractCertifications(text),
    careerGaps:       detectCareerGaps(workHistory),
    skillProficiency: inferSkillProficiency(text, skills),
  };

  fields.confidence = computeConfidence(fields);
  return fields;
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function parseFile(file) {
  const text = await extractText(file);
  if (!text.trim())
    throw new Error('Could not extract text from this file. Try uploading a PDF or DOCX.');
  return { text, ...parseFields(text) };
}

// ── ATS Match Scoring ──────────────────────────────────────────────────────────
// Compare a parsed resume against a parsed JD. Returns score 0–100 + gap analysis.
function _levenshteinSim(a, b) {
  if (a === b) return 1;
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return 1 - dp[m][n] / Math.max(m, n);
}

export function scoreResumeVsJD(resumeFields, jdFields) {
  if (!resumeFields || !jdFields) return { score: 0, matched: [], missing: [], breakdown: {} };

  const resumeSkills = (resumeFields.skills || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  const jdSkills     = (jdFields.skills     || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  const matchedSkills = jdSkills.filter(js =>
    resumeSkills.some(rs => rs === js || rs.includes(js) || js.includes(rs) || _levenshteinSim(rs, js) >= 0.82)
  );
  const missingSkills = jdSkills.filter(js =>
    !resumeSkills.some(rs => rs === js || rs.includes(js) || js.includes(rs) || _levenshteinSim(rs, js) >= 0.82)
  );

  const skillsScore = jdSkills.length > 0 ? (matchedSkills.length / jdSkills.length) * 100 : 60;

  // Experience
  const resumeExp   = parseFloat(resumeFields.experience) || 0;
  const jdExpNum    = ((jdFields.experience || '').match(/(\d+)/) || [])[1];
  const jdExpMin    = jdExpNum ? parseInt(jdExpNum) : 0;
  const expScore    = jdExpMin > 0 ? Math.min(100, (resumeExp / jdExpMin) * 100) : 75;

  // Title similarity
  const rTitle = (resumeFields.title || '').toLowerCase().replace(/[^a-z ]/g, '');
  const jTitle = (jdFields.title     || '').toLowerCase().replace(/[^a-z ]/g, '');
  const rWords = rTitle.split(/\s+/).filter(Boolean);
  const jWords = jTitle.split(/\s+/).filter(Boolean);
  const titleScore = rTitle && jTitle
    ? (jWords.filter(w => rWords.some(r => r === w || _levenshteinSim(r, w) >= 0.8)).length / Math.max(jWords.length, 1)) * 100
    : 55;

  // Location
  const rLoc = (resumeFields.location || '').toLowerCase();
  const jLoc = (jdFields.location    || '').toLowerCase();
  const locationScore = !jLoc || /remote/i.test(jLoc) || !rLoc ? 80
    : rLoc.includes(jLoc) || jLoc.includes(rLoc) ? 100 : 45;

  const score = Math.round(
    skillsScore   * 0.50 +
    expScore      * 0.25 +
    titleScore    * 0.15 +
    locationScore * 0.10
  );

  return {
    score:    Math.min(100, Math.max(0, score)),
    matched:  matchedSkills,
    missing:  missingSkills,
    breakdown: {
      skills:     Math.round(skillsScore),
      experience: Math.round(expScore),
      title:      Math.round(titleScore),
      location:   Math.round(locationScore),
    },
  };
}

// ── IMPROVEMENT 6: JD Parser — improved version with full structured extraction ─
export function parseJD(text) {
  if (!text || !text.trim()) return {};

  const skills = extractSkills(text);

  // Title
  const titleLabel = text.match(/(?:^|\n)[ \t]*(?:job title|position|role|designation)[ \t]*[:\-–][ \t]*([^\n]{3,80})/im);
  let title = '';
  if (titleLabel) {
    title = titleLabel[1].trim();
  } else {
    const firstLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const l of firstLines.slice(0, 5)) {
      if (TITLE_RX.test(l) && l.length <= 80) { title = l; break; }
    }
  }

  // Experience
  const expMatch =
    text.match(/(\d+)\s*[-–to]+\s*(\d+)\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/i) ||
    text.match(/(?:minimum|min\.?|at least)\s*(\d+)\s*(?:years?|yrs?)/i) ||
    text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)/i);
  const experience = expMatch
    ? expMatch[2] ? `${expMatch[1]}-${expMatch[2]} years` : `${expMatch[1]}+ years`
    : '';

  // Location
  const locMatch = text.match(CITY_RX) || text.match(REMOTE_RX);
  const location = locMatch ? locMatch[0].trim() : '';

  // Salary
  const salaryMatch = text.match(
    /(?:salary|ctc|compensation|package|pay)\s*[:\-–]?\s*([₹$€£]?\s*[\d,.]+\s*(?:lpa|lakhs?|k|lakh|per annum|\/year|\/month|\/mo|per month)?(?:\s*[-–to]+\s*[₹$€£]?\s*[\d,.]+\s*(?:lpa|lakhs?|k|lakh|per annum|\/year|\/month|\/mo)?)?)/i
  );
  const salary = salaryMatch ? salaryMatch[1].trim() : '';

  // Employment type
  let employmentType = '';
  if (/\bfull[\s-]?time\b/i.test(text)) employmentType = 'Full-time';
  else if (/\bpart[\s-]?time\b/i.test(text)) employmentType = 'Part-time';
  else if (/\bcontract\b/i.test(text)) employmentType = 'Contract';
  else if (/\binternship\b/i.test(text)) employmentType = 'Internship';
  else if (/\bfreelance\b/i.test(text)) employmentType = 'Freelance';

  // Work mode
  let workMode = '';
  if (/\bremote\b/i.test(text)) workMode = 'Remote';
  else if (/\bhybrid\b/i.test(text)) workMode = 'Hybrid';
  else if (/\bonsite\b|\bin[\s-]office\b|\bin[\s-]person\b/i.test(text)) workMode = 'Onsite';

  // Education requirement
  const eduMatch = text.match(/(?:degree|qualification|education)\s*[:\-–]?\s*([^\n.]{5,100})/i)
    || text.match(/\b(?:bachelor'?s?|master'?s?|b\.?tech|m\.?tech|mba|phd|diploma)\b[^\n.]{0,60}/i);
  const education = eduMatch ? eduMatch[0].trim().slice(0, 120) : '';

  // Description — first long paragraph
  const paraLines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const descPara = paraLines.find(l => l.split(/\s+/).length >= 15 && l.length >= 80);
  const description = descPara ? descPara.slice(0, 400) : '';

  // Industry
  const industry = extractIndustry(text, title, skills);

  // Department
  let department = '';
  const deptMatch = text.match(/(?:department|team|division|function)\s*[:\-]\s*([^\n,]{3,50})/i);
  if (deptMatch) {
    department = deptMatch[1].trim();
  } else {
    const deptKw = [
      ['Engineering','engineer','developer','architect','devops','sre','technical'],
      ['Product','product manager','product owner','pm ','scrum master'],
      ['Design','designer','ux','ui','graphic'],
      ['Data & Analytics','data scientist','analyst','bi ','machine learning','data engineer'],
      ['Marketing','marketing','seo','sem','content','brand','digital marketing'],
      ['Sales','sales','business development','account executive','bd '],
      ['Human Resources','hr ','talent acquisition','recruiter','people ops'],
      ['Finance & Accounting','finance','accounting','ca ','cfo','controller','auditor'],
      ['Operations','operations','supply chain','logistics','procurement'],
      ['Customer Success','customer success','customer support','account manager'],
      ['Legal','legal','compliance','counsel','attorney'],
    ];
    const t = text.toLowerCase();
    for (const [label, ...kws] of deptKw) {
      if (kws.some(k => t.includes(k))) { department = label; break; }
    }
  }

  // Urgency
  let urgency = 'Medium';
  if (/\b(?:urgent|immediate joiner|asap|immediately|joining asap|urgent requirement|urgent hiring|urgent opening)\b/i.test(text)) urgency = 'High';
  else if (/\b(?:not urgent|whenever available|flexible start|no rush)\b/i.test(text)) urgency = 'Low';

  // Requirements — extract bullet points from Requirements / Qualifications section
  const reqSection = findSection(text, [
    'requirements','required qualifications','qualifications','must have',
    'what we require','what you need','candidate requirements',
    'skills required','what we are looking for','who you are',
    'minimum qualifications','basic qualifications','required skills',
  ]);
  const requirements = reqSection
    ? reqSection.split('\n')
        .map(l => l.trim().replace(/^[•\-\*✓✔►▸▶◆▪\d]+\.?\s*/, '').trim())
        .filter(l => l.length >= 10 && l.length <= 200 && /[a-z]/i.test(l))
        .slice(0, 12)
    : [];

  // Responsibilities — extract bullet points from Responsibilities section
  const respSection = findSection(text, [
    'responsibilities','job responsibilities','key responsibilities',
    'roles and responsibilities','duties','what you will do',
    'your role','role & responsibilities','scope of work','you will',
    'what you\'ll do','key duties','primary responsibilities','your responsibilities',
  ]);
  const responsibilities = respSection
    ? respSection.split('\n')
        .map(l => l.trim().replace(/^[•\-\*✓✔►▸▶◆▪\d]+\.?\s*/, '').trim())
        .filter(l => l.length >= 10 && l.length <= 200 && /[a-z]/i.test(l))
        .slice(0, 12)
    : [];

  // Benefits — extract from Benefits / Perks section
  const benefitsSection = findSection(text, [
    'benefits','perks','what we offer','we offer','compensation & benefits',
    'why join us','why work with us','what you get','package includes',
    'employee benefits','perks and benefits','our benefits',
  ]);
  const benefits = benefitsSection
    ? benefitsSection.split('\n')
        .map(l => l.trim().replace(/^[•\-\*✓✔►▸▶◆▪\d]+\.?\s*/, '').trim())
        .filter(l => l.length >= 5 && l.length <= 150 && /[a-z]/i.test(l))
        .slice(0, 10)
    : [];

  // Notice period
  let noticePeriod = '';
  const noticeMatch = text.match(/notice\s*period\s*[:\-]?\s*([^\n,]{3,40})/i)
    || text.match(/(\d+)\s*(days?|weeks?|months?)\s*notice/i);
  if (noticeMatch) noticePeriod = noticeMatch[1]?.trim() || '';

  return {
    title, skills, experience, location, salary, employmentType, workMode,
    education, description, industry, department, urgency, noticePeriod,
    requirements, responsibilities, benefits,
  };
}
