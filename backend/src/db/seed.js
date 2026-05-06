'use strict';
const bcrypt       = require('bcryptjs');
const User         = require('../models/User');
const Organization = require('../models/Organization');
const Job          = require('../models/Job');
const Candidate    = require('../models/Candidate');
const Application  = require('../models/Application');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const daysAgo  = (n) => new Date(Date.now() - n * 86400000);
const daysFrom = (n) => new Date(Date.now() + n * 86400000);
const slug     = (name) => name.toLowerCase().replace(/\s+/g, '.');
const careerSlug = (str) => String(str || '').toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

/** 
 * Remove duplicate jobs and safely migrate applications to the winner.
 * Handles the unique index {jobId, candidateId} by soft-deleting conflicting
 * duplicates instead of violating the constraint.
 */
async function deduplicateJobs(tenantId) {
  const jobs = await Job.find({ tenantId, deletedAt: null }).lean();
  const groups = {};

  for (const j of jobs) {
    // Normalize: lowercase + collapse whitespace for robust matching
    if (!j.title) continue; // Safety check
    const titleNorm = j.title.toLowerCase().trim().replace(/\s+/g, ' ');
    const locNorm   = (j.location || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/,.*$/, '').trim();
    const key = `${titleNorm}__${locNorm}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(j);
  }

  let mergedCount = 0;
  for (const key in groups) {
    const list = groups[key];
    if (list.length <= 1) continue;

    // Keep: slug > active status > most applications > oldest
    const appCounts = await Promise.all(list.map(j => Application.countDocuments({ jobId: j._id, deletedAt: null })));
    list.forEach((j, i) => { j._appCount = appCounts[i]; });
    list.sort((a, b) => {
      if (a.careerPageSlug && !b.careerPageSlug) return -1;
      if (!a.careerPageSlug && b.careerPageSlug) return 1;
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      if (b._appCount !== a._appCount) return b._appCount - a._appCount;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const winner = list[0];
    const losers = list.slice(1);

    for (const loser of losers) {
      // Safe migration: check for each application if winner already has one from same candidate
      const loserApps = await Application.find({ jobId: loser._id, deletedAt: null }).select('candidateId _id').lean();
      for (const app of loserApps) {
        // Check ALL docs (including soft-deleted) — the unique index {jobId,candidateId}
        // enforces uniqueness regardless of deletedAt, so we must check without deletedAt filter
        const conflict = await Application.findOne({ jobId: winner._id, candidateId: app.candidateId }).lean();
        if (conflict) {
          // Winner already has this candidate — just soft-delete the loser copy, DON'T change jobId
          await Application.findByIdAndUpdate(app._id, { $set: { deletedAt: new Date() } });
        } else {
          // No conflict — safe to re-point to winner job
          await Application.findByIdAndUpdate(app._id, { $set: { jobId: winner._id } });
        }
      }
      await Job.findByIdAndUpdate(loser._id, { $set: { deletedAt: new Date(), status: 'closed' } });
      mergedCount++;
    }
  }
  if (mergedCount > 0) console.log(`🧹  Deduplicated ${mergedCount} duplicate jobs across tenants`);
}

// Valid canonical stages (must match backend VALID_STAGES in applications.js)
const VALID_STAGES = [
  'Applied', 'Screening', 'Shortlisted',
  'Interview Round 1', 'Interview Round 2',
  'Offer', 'Hired', 'Rejected',
];

const linkedInTalentNestJobs = [
  {
    title: 'Node.js React Developer',
    location: 'Hyderabad',
    jobType: 'Full-Time',
    department: 'Engineering',
    urgency: 'High',
    numberOfOpenings: 5,
    experience: '2+ years',
    salaryType: 'CTC',
    skills: ['Node.js', 'React', 'Advanced JavaScript', 'ES6+', 'API Integration', 'MERN Stack', 'Backend Integration'],
    contactEmail: 'hr@talentnesthr.com',
    contactPhone: '7995535539',
    description: `✔️Hiring Requirement for Hyderabad Location

We are looking for candidates with strong experience in:
Node.js / React
Advanced JavaScript concepts

📌 Experience:
Minimum 2+ years

📌 Key Expectations:
Hands-on experience in real-time / production-level projects
Strong understanding of:
ES6+ concepts
APIs & backend integration
Component-based architecture (React)
Ability to work on scalable and performance-driven applications

Interested candidates kindly share cv on hr@talentnesthr.com
Reachout : 7995535539`,
  },
  {
    title: 'Freelance Recruiter',
    location: 'Remote',
    jobType: 'Contract',
    department: 'Recruitment',
    urgency: 'High',
    numberOfOpenings: 50,
    experience: '2-3 years',
    skills: ['IT Recruitment', 'Healthcare Recruitment', 'Mortgage Hiring', 'Sourcing', 'Candidate Screening', 'Closure Hiring', 'Client Coordination'],
    contactEmail: 'mhsaicharan@talentnesthr.com',
    description: `Hiring Freelance Recruiters with 2-3 years of experience.

Work areas:
- IT positions
- Healthcare domain
- Mortgage domain

Compensation:
Closure-based commission

Work mode:
Remote

Requirements:
- Strong experience in sourcing and closing positions
- Hands-on experience in IT, healthcare, or mortgage hiring
- Ability to work on priority requirements
- Good communication and client coordination skills

Interested recruiters can DM or share their profile at mhsaicharan@talentnesthr.com.`,
  },
  {
    title: 'Agricultural Promotions Executive / Store Assistant',
    location: 'Tirupati',
    jobType: 'Full-Time',
    department: 'Agriculture Operations',
    urgency: 'High',
    numberOfOpenings: 2,
    experience: '1-3 years',
    skills: ['B.Sc Chemistry', 'Agrochemicals', 'Fertilizers', 'Seeds', 'Pesticides', 'Warehouse Management', 'MS Excel', 'Farmer Education'],
    contactEmail: 'info@talentnesthr.com',
    alternateContactEmail: 'hr@selfcrops.com',
    contactPhone: '9121895028',
    description: `We are hiring an Agricultural Promotions Executive / Store Assistant for Tirupati.

Qualification:
B.Sc. Chemistry is mandatory.

Experience:
1-3 years

About the company:
Self Crops Farm Operation Center empowers farmers by providing certified seeds, fertilizers, and pesticides while educating them on correct and efficient usage.

Key Responsibilities:
- Manage day-to-day farm input godown operations
- Maintain stock records and inventory with FIFO/FEFO rotation
- Ensure proper storage conditions as per safety and regulatory norms
- Educate farmers about products and correct usage
- Conduct awareness sessions and product training camps if required
- Communicate the startup vision and value proposition
- Build relationships with the farming community
- Monitor market prices of seeds, fertilizers, and pesticides
- Identify cost-effective procurement sources
- Maintain customer database using Excel / basic CRM tools

Interested candidates can share resumes at info@talentnesthr.com or hr@selfcrops.com. Reach out: 9121895028.`,
  },
  {
    title: 'Senior Frappe Developer (ERPNext Backend)',
    location: 'Madhapur',
    jobType: 'Full-Time',
    department: 'Engineering',
    urgency: 'High',
    numberOfOpenings: 2,
    experience: '4+ years',
    salaryMin: 1000000,
    salaryMax: 1200000,
    salaryType: 'CTC',
    skills: ['Frappe Framework', 'ERPNext', 'Python', 'JavaScript', 'REST APIs', 'MariaDB', 'PostgreSQL', 'Git', 'ERP Implementation'],
    contactEmail: 'mhsaicharan@talentnesthr.com',
    contactPhone: '7995535539',
    description: `Hiring Senior Backend Developer with Frappe / ERPNext experience for a leading organization based in Madhapur.

Qualification:
B.Tech

Budget:
10-12 LPA

Notice Period:
Immediate joiners / maximum 1 week

Role Overview:
Lead backend development for custom Frappe / ERPNext applications, build scalable REST APIs, and ensure secure high-performance server-side systems for web, mobile, and IoT platforms.

Key Responsibilities:
- Custom Frappe application and module development
- High-performance REST API development
- ERP integration with payment gateways, SMS providers, and third-party services
- Database design and optimization for MariaDB / PostgreSQL
- Code reviews and mentoring junior developers
- Performance tuning and security best practices

Required Skills:
- 5+ years software development experience
- 3+ years hands-on Frappe Framework and Python experience
- Strong Python and JavaScript knowledge
- Expertise in MariaDB / PostgreSQL
- Strong REST API experience
- Deep understanding of Frappe internals including hooks, controllers, scheduler events
- Proficiency in Git

Interview Process:
1. Virtual round
2. Walk-in round mandatory

Interested candidates can share resumes at mhsaicharan@talentnesthr.com or reach out at 7995535539.`,
  },
  {
    title: 'Android Developer',
    location: 'Madhapur',
    jobType: 'Full-Time',
    department: 'Mobile Engineering',
    urgency: 'High',
    numberOfOpenings: 2,
    experience: '4-6 years',
    salaryMin: 1000000,
    salaryMax: 1200000,
    salaryType: 'CTC',
    skills: ['Android', 'Java', 'Kotlin', 'Android SDK', 'REST APIs', 'JSON', 'MVVM', 'MVP', 'SQLite', 'Room', 'Git'],
    contactEmail: 'mhsaicharan@talentnesthr.com',
    contactPhone: '7995535539',
    description: `Hiring Android Developer for Madhapur, work from office.

Experience:
4-6 years

Budget:
10-12 LPA

Notice Period:
Immediate to 15 days

Job Summary:
We are looking for a skilled Android Developer with strong Java / Kotlin expertise to build high-performance, secure, and scalable Android applications.

Key Responsibilities:
- Design, develop, and maintain Android applications
- Integrate REST APIs, JSON, and third-party SDKs
- Ensure application performance, scalability, and security
- Work with MVVM / MVP architecture
- Collaborate with UI/UX, backend, and product teams
- Debug issues and optimize app performance
- Maintain code quality, documentation, and version control

Required Skills:
- Strong Java / Kotlin proficiency
- Hands-on Android SDK experience
- REST API and JSON integration experience
- MVVM / MVP architecture knowledge
- SQLite / Room familiarity
- Git / version control experience

Share your resume at mhsaicharan@talentnesthr.com or contact 7995535539.`,
  },
  {
    title: 'Full Stack Developer',
    location: 'Madhapur',
    jobType: 'Full-Time',
    department: 'Engineering',
    urgency: 'High',
    numberOfOpenings: 4,
    experience: '2-3 years',
    salaryMin: 1000000,
    salaryMax: 1200000,
    salaryType: 'CTC',
    skills: ['Angular', 'React.js', 'Node.js', 'JavaScript', 'REST APIs', 'MongoDB', 'PostgreSQL', 'MySQL', 'Git', 'Postman', 'Agile', 'Next.js', 'Docker'],
    contactEmail: 'mhsaicharan@talentnesthr.com',
    contactPhone: '7995535539',
    description: `Hiring Full Stack Developer for Madhapur, work from office.

Experience:
2-3 years

Budget:
10-12 LPA

Notice Period:
Immediate joiners preferred

Interview:
Round 1 virtual

Job Summary:
We are looking for a skilled and proactive Full Stack Developer with hands-on experience building scalable front-end and back-end applications using JavaScript frameworks such as Angular, React.js, and Node.js.

Responsibilities:
- Develop scalable frontend and backend features using Angular, React.js, Node.js, and other JavaScript frameworks
- Build and maintain REST APIs and UI components
- Ensure documentation, testing, and version control
- Collaborate with design, QA, DevOps, and PM teams
- Maintain and enhance existing applications
- Participate in sprint planning and code reviews
- Ensure technical feasibility of UI/UX designs

Required Skills:
- Frontend: Angular, React.js, Vue.js preferred
- Backend: Node.js
- Databases: MongoDB, PostgreSQL, MySQL
- Tools: Git, GitHub portfolio/project links, Postman
- Methodology: Agile / Scrum
- Good to have: Next.js, Nuxt.js, Docker
- AI dev tools exposure: Cursor, Cline, ROO Code preferred

Interested candidates can share resumes at mhsaicharan@talentnesthr.com or reach out at 7995535539.`,
  },
  {
    title: 'Recruitment Vendor Partner - IT & Support Hiring',
    location: 'India',
    jobType: 'Contract',
    department: 'Vendor Partnerships',
    urgency: 'Medium',
    numberOfOpenings: 100,
    experience: '2+ years',
    skills: ['IT Hiring', 'Vendor Hiring', 'Recruitment Partnership', 'Sourcing', 'Candidate Screening', 'Full Stack Hiring', 'Android Hiring', 'Frappe Hiring'],
    contactEmail: 'mhsaicharan@talentnesthr.com',
    description: `Talent Nest HR is seeking experienced and reliable recruitment vendors to support ongoing full-time hiring requirements.

Active positions include:
- Full Stack Developers
- Android Developers
- Frappe Developers
- Personal Assistant to Management

We are looking for vendors who can:
- Share quality screened profiles
- Maintain strong candidate coordination
- Deliver with quick turnaround time
- Support long-term hiring partnerships

Interested vendors can DM for empanelment and rate card details or email mhsaicharan@talentnesthr.com.`,
  },
  {
    title: 'Personal Assistant to Management',
    location: 'Hyderabad',
    jobType: 'Full-Time',
    department: 'Administration',
    urgency: 'Medium',
    numberOfOpenings: 1,
    experience: '2+ years',
    skills: ['Executive Assistance', 'Calendar Management', 'Communication', 'Coordination', 'MS Office', 'Documentation', 'Follow-ups'],
    contactEmail: 'mhsaicharan@talentnesthr.com',
    description: `Hiring Personal Assistant to Management through Talent Nest HR.

Role Overview:
Support management with daily coordination, communication, scheduling, documentation, and follow-up activities.

Key Responsibilities:
- Calendar and meeting coordination
- Internal and external communication support
- Documentation and reporting
- Travel / administrative coordination as needed
- Follow-up tracking across business priorities

Interested candidates can share profiles at mhsaicharan@talentnesthr.com.`,
  },
  {
    title: 'Cybersecurity Analyst',
    location: 'Hyderabad',
    jobType: 'Full-Time',
    department: 'Security',
    urgency: 'High',
    numberOfOpenings: 10,
    experience: '2-5 years',
    skills: ['SOC', 'SIEM', 'Penetration Testing', 'GRC', 'Network Security'],
    contactEmail: 'hr@talentnesthr.com',
    description: 'We are hiring Cybersecurity Analysts for our SOC operations. Candidates should have experience in threat monitoring and incident response.'
  },
  {
    title: 'HR Business Partner',
    location: 'Mumbai',
    jobType: 'Full-Time',
    department: 'HR',
    urgency: 'Medium',
    numberOfOpenings: 5,
    experience: '3-6 years',
    skills: ['HRMS', 'Employee Relations', 'Talent Management', 'Policy Design'],
    contactEmail: 'hr@talentnesthr.com',
    description: 'Looking for an HRBP to partner with business leaders on people strategy and talent management.'
  },
  {
    title: 'React Native Developer',
    location: 'Pune',
    jobType: 'Full-Time',
    department: 'Mobile Engineering',
    urgency: 'High',
    numberOfOpenings: 19,
    experience: '2-4 years',
    skills: ['React Native', 'TypeScript', 'iOS', 'Android', 'Redux'],
    contactEmail: 'hr@talentnesthr.com',
    description: 'Join our mobile team to build cross-platform applications for our HRMS suite.'
  },

  // ── 20 Trending Jobs (External Apply — candidate data saved, then redirected) ──

  {
    title: 'AI / Machine Learning Engineer',
    location: 'Bangalore',
    jobType: 'Full-Time',
    department: 'Artificial Intelligence',
    urgency: 'High',
    numberOfOpenings: 25,
    experience: '3-7 years',
    salaryMin: 2000000, salaryMax: 4500000, salaryType: 'CTC',
    skills: ['Python', 'TensorFlow', 'PyTorch', 'LLMs', 'MLOps', 'NLP', 'Deep Learning'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://careers.tcs.com',
    description: `TCS is actively hiring AI/ML Engineers for its Gen-AI and Digital Transformation practice.

Key Responsibilities:
- Design and deploy machine learning models at scale
- Work on Large Language Models (LLMs) and GenAI applications
- Build and maintain MLOps pipelines
- Collaborate with product and data engineering teams

Requirements:
- Strong Python skills with hands-on experience in TensorFlow/PyTorch
- Experience with LLMs (GPT, LLaMA, Gemini), RAG pipelines
- Knowledge of cloud platforms (AWS/Azure/GCP)
- Prior experience in production ML deployment

📩 Apply now — your profile will be saved and forwarded to TCS Talent Team.`,
  },
  {
    title: 'Data Engineer (Azure / Databricks)',
    location: 'Hyderabad',
    jobType: 'Full-Time',
    department: 'Data Engineering',
    urgency: 'High',
    numberOfOpenings: 30,
    experience: '2-6 years',
    salaryMin: 1200000, salaryMax: 2800000, salaryType: 'CTC',
    skills: ['Apache Spark', 'Azure Data Factory', 'Databricks', 'SQL', 'Python', 'Delta Lake'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://www.infosys.com/careers',
    description: `Infosys is hiring Data Engineers for cloud-native data platform projects.

Role Overview:
Build and optimize large-scale data pipelines using Azure and Databricks.

Key Skills Required:
- Azure Data Factory, Azure Synapse, Databricks
- Apache Spark (PySpark), Delta Lake architecture
- Strong SQL and Python skills
- Experience with streaming data (Kafka / Event Hubs)
- ETL/ELT pipeline design and optimization

📩 Submit your profile — we will connect you directly with the Infosys talent team.`,
  },
  {
    title: 'Cloud Solutions Architect (AWS)',
    location: 'Bangalore',
    jobType: 'Full-Time',
    department: 'Cloud Infrastructure',
    urgency: 'High',
    numberOfOpenings: 15,
    experience: '6-12 years',
    salaryMin: 3000000, salaryMax: 5500000, salaryType: 'CTC',
    skills: ['AWS', 'Terraform', 'Kubernetes', 'Microservices', 'DevSecOps', 'CloudFormation'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://wipro.com/careers',
    description: `Wipro is looking for senior Cloud Solutions Architects to lead digital transformation for global clients.

Responsibilities:
- Design scalable, secure, cost-optimised AWS cloud architectures
- Lead cloud migration projects (on-prem to cloud)
- Define DevSecOps practices and CI/CD pipelines
- Mentor cloud engineers and guide client stakeholders

Requirements:
- AWS Certified Solutions Architect (Professional preferred)
- Hands-on with Terraform, EKS, Lambda, RDS
- 6+ years of cloud architecture experience`,
  },
  {
    title: 'GenAI / Prompt Engineer',
    location: 'Remote',
    jobType: 'Full-Time',
    department: 'AI Products',
    urgency: 'High',
    numberOfOpenings: 20,
    experience: '1-4 years',
    salaryMin: 1000000, salaryMax: 2500000, salaryType: 'CTC',
    skills: ['Prompt Engineering', 'LangChain', 'OpenAI API', 'Python', 'RAG', 'Vector Databases'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://careers.hcltech.com',
    description: `HCLTech is hiring GenAI Engineers across AI labs and innovation centres.

What You'll Do:
- Design and optimise prompts for GPT-4, Claude, Gemini models
- Build Retrieval-Augmented Generation (RAG) pipelines
- Develop AI agents using LangChain / LlamaIndex
- Integrate GenAI into enterprise workflows

Tech Stack: OpenAI API, LangChain, Pinecone/Weaviate, Python, FastAPI

This is one of the most in-demand skills globally in 2026 — apply now!`,
  },
  {
    title: 'Python Backend Developer (Django / FastAPI)',
    location: 'Pune',
    jobType: 'Full-Time',
    department: 'Engineering',
    urgency: 'High',
    numberOfOpenings: 40,
    experience: '2-5 years',
    salaryMin: 1000000, salaryMax: 2200000, salaryType: 'CTC',
    skills: ['Python', 'Django', 'FastAPI', 'PostgreSQL', 'Redis', 'Celery', 'REST APIs'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://www.accenture.com/in-en/careers',
    description: `Accenture India is hiring Python Backend Developers for digital product teams.

Role:
Build scalable backend services for enterprise and consumer applications.

Required Skills:
- Python (Django or FastAPI) with REST API development
- PostgreSQL / MySQL database design
- Redis caching, Celery for async tasks
- Docker containerisation and basic CI/CD
- Understanding of clean code and SOLID principles

Experience: 2-5 years | CTC: ₹10-22 LPA | Location: Pune / Remote`,
  },
  {
    title: 'Business Analyst — Banking & Fintech',
    location: 'Mumbai',
    jobType: 'Full-Time',
    department: 'Business Analysis',
    urgency: 'High',
    numberOfOpenings: 18,
    experience: '2-5 years',
    salaryMin: 800000, salaryMax: 1800000, salaryType: 'CTC',
    skills: ['Business Analysis', 'BFSI Domain', 'JIRA', 'SQL', 'Process Mapping', 'Stakeholder Management'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://www.hdfcbank.com/content/bbp/repositories/723fb80a-2dde-42a3-9793-7ae1be57c87f/?folderPath=/footer/Careers',
    description: `HDFC Bank is hiring Business Analysts for its Digital Banking and Fintech division.

You Will:
- Gather and document business requirements from banking stakeholders
- Create functional specifications, user stories, and process flows
- Work closely with IT and product teams on digital banking features
- Analyse banking data using SQL to support decision-making

Requirements:
- 2-5 years BA experience in BFSI / Fintech
- Strong SQL skills, process modelling (BPMN)
- Knowledge of core banking systems preferred`,
  },
  {
    title: 'iOS Developer (Swift / SwiftUI)',
    location: 'Chennai',
    jobType: 'Full-Time',
    department: 'Mobile Engineering',
    urgency: 'High',
    numberOfOpenings: 12,
    experience: '2-5 years',
    salaryMin: 1200000, salaryMax: 2500000, salaryType: 'CTC',
    skills: ['Swift', 'SwiftUI', 'UIKit', 'Core Data', 'REST APIs', 'Xcode', 'App Store'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://careers.zoho.com',
    description: `Zoho Corp is hiring iOS Developers for its flagship suite of business applications.

What You'll Build:
- Consumer and enterprise iOS apps for millions of users worldwide
- Native iOS features using SwiftUI and UIKit
- Offline-first experiences with Core Data / Realm
- Integrations with Zoho's REST APIs

Requirements:
- Strong Swift fundamentals and SwiftUI experience
- App Store deployment experience
- Performance optimisation and memory management
- Chennai-based (relocation assistance available)`,
  },
  {
    title: 'Java / Spring Boot Microservices Developer',
    location: 'Hyderabad',
    jobType: 'Full-Time',
    department: 'Backend Engineering',
    urgency: 'High',
    numberOfOpenings: 50,
    experience: '3-7 years',
    salaryMin: 1200000, salaryMax: 2800000, salaryType: 'CTC',
    skills: ['Java 17+', 'Spring Boot', 'Microservices', 'Kafka', 'Docker', 'Kubernetes', 'PostgreSQL'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://careers.cognizant.com',
    description: `Cognizant is hiring Java Microservices Developers for banking, insurance and retail clients.

Tech Stack:
- Java 17+ with Spring Boot 3.x
- Microservices design patterns (CQRS, Saga, Event-Driven)
- Apache Kafka for messaging
- Containerisation with Docker + Kubernetes
- PostgreSQL / Oracle databases

This role offers international project exposure and fast-track career growth.`,
  },
  {
    title: 'Salesforce Developer (LWC / Apex)',
    location: 'Bangalore',
    jobType: 'Full-Time',
    department: 'CRM Engineering',
    urgency: 'Medium',
    numberOfOpenings: 20,
    experience: '2-5 years',
    salaryMin: 1000000, salaryMax: 2200000, salaryType: 'CTC',
    skills: ['Salesforce', 'Apex', 'LWC', 'SOQL', 'Flow', 'REST APIs', 'Sales Cloud'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://www.capgemini.com/in-en/careers/',
    description: `Capgemini is hiring Salesforce Developers for CRM transformation projects across BFSI, retail and manufacturing.

Key Responsibilities:
- Develop custom Apex classes, triggers and LWC components
- Build and optimise Salesforce Flows and Process Builders
- Integrate Salesforce with external systems via REST/SOAP
- Conduct code reviews and mentor junior developers

Requirements:
- Salesforce Certified Platform Developer I (mandatory)
- 2-5 years hands-on Salesforce development experience`,
  },
  {
    title: 'Digital Marketing Manager (Performance / Growth)',
    location: 'Bangalore',
    jobType: 'Full-Time',
    department: 'Marketing',
    urgency: 'High',
    numberOfOpenings: 8,
    experience: '3-6 years',
    salaryMin: 1000000, salaryMax: 2000000, salaryType: 'CTC',
    skills: ['Google Ads', 'Meta Ads', 'SEO', 'SEM', 'Analytics', 'CRO', 'Email Marketing'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://careers.swiggy.com',
    description: `Swiggy is looking for a performance-driven Digital Marketing Manager to lead growth campaigns.

What You'll Own:
- Plan and execute Google Ads, Meta Ads, programmatic campaigns
- Drive user acquisition and retention through digital channels
- Lead SEO strategy and content marketing initiatives
- Use data analytics to optimise CAC, ROAS and LTV
- Manage marketing automation and email campaigns

This is a high-visibility role with direct impact on Swiggy's growth metrics.`,
  },
  {
    title: 'Financial Analyst — FP&A',
    location: 'Mumbai',
    jobType: 'Full-Time',
    department: 'Finance',
    urgency: 'Medium',
    numberOfOpenings: 10,
    experience: '2-5 years',
    salaryMin: 900000, salaryMax: 1800000, salaryType: 'CTC',
    skills: ['Financial Modelling', 'Excel', 'Power BI', 'FP&A', 'Budgeting', 'Forecasting'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://jobs.deloitte.com/in/en',
    description: `Deloitte India is hiring Financial Analysts for its FP&A and Advisory teams.

Responsibilities:
- Build and maintain financial models for budgeting and forecasting
- Prepare MIS reports and management dashboards
- Analyse variances and present insights to leadership
- Support M&A due diligence and valuations
- Work with Power BI / Tableau for financial dashboards

Ideal Candidate: CA / MBA Finance with strong Excel and modelling skills`,
  },
  {
    title: 'QA Automation Engineer (Selenium / Playwright)',
    location: 'Noida',
    jobType: 'Full-Time',
    department: 'Quality Engineering',
    urgency: 'Medium',
    numberOfOpenings: 22,
    experience: '2-5 years',
    salaryMin: 800000, salaryMax: 1800000, salaryType: 'CTC',
    skills: ['Selenium', 'Playwright', 'Java / Python', 'TestNG', 'CI/CD', 'API Testing', 'JIRA'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://www.flipkartcareers.com',
    description: `Flipkart is hiring QA Automation Engineers to ensure product quality at scale.

You Will:
- Design and implement automated test suites using Selenium/Playwright
- Build API test frameworks (RestAssured / Postman)
- Integrate tests into CI/CD pipelines (Jenkins / GitHub Actions)
- Perform performance testing using JMeter/k6
- Collaborate with developers on shift-left testing practices

Tech: Java/Python + Selenium/Playwright + Jenkins + JIRA`,
  },
  {
    title: 'Site Reliability Engineer (SRE)',
    location: 'Hyderabad',
    jobType: 'Full-Time',
    department: 'Platform Engineering',
    urgency: 'High',
    numberOfOpenings: 15,
    experience: '3-7 years',
    salaryMin: 2000000, salaryMax: 4000000, salaryType: 'CTC',
    skills: ['Kubernetes', 'Prometheus', 'Grafana', 'Linux', 'Python', 'Incident Management', 'SLO/SLI'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://careers.microsoft.com/v2/global/en/india.html',
    description: `Microsoft India is hiring SREs for its Azure Platform Reliability team.

Core Responsibilities:
- Own reliability, availability and performance of production services
- Build observability tooling (Prometheus, Grafana, distributed tracing)
- Define and track SLOs/SLIs for critical services
- Lead incident response and post-mortem culture
- Automate toil and reduce operational overhead

Requirements: Strong Linux fundamentals, Kubernetes, scripting (Python/Go), on-call experience`,
  },
  {
    title: 'Frontend Developer (React.js / Next.js)',
    location: 'Gurgaon',
    jobType: 'Full-Time',
    department: 'Product Engineering',
    urgency: 'High',
    numberOfOpenings: 35,
    experience: '2-5 years',
    salaryMin: 1000000, salaryMax: 2200000, salaryType: 'CTC',
    skills: ['React.js', 'Next.js', 'TypeScript', 'Tailwind CSS', 'GraphQL', 'Performance Optimisation'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://paytm.com/careers',
    description: `Paytm is hiring Frontend Developers to build the future of financial services for 300M+ users.

You'll Work On:
- High-traffic React/Next.js applications serving millions of daily users
- Payment flows, checkout experiences and financial dashboards
- Performance optimisation (Core Web Vitals, lazy loading, code splitting)
- Design system components and micro-frontend architecture

Stack: React 18, Next.js 14, TypeScript, GraphQL, Tailwind CSS`,
  },
  {
    title: 'Network Security Engineer (CCNP / CCIE)',
    location: 'Bangalore',
    jobType: 'Full-Time',
    department: 'Cybersecurity',
    urgency: 'High',
    numberOfOpenings: 12,
    experience: '4-8 years',
    salaryMin: 1500000, salaryMax: 3000000, salaryType: 'CTC',
    skills: ['Cisco', 'Palo Alto', 'Firewall', 'CCNP', 'SD-WAN', 'Zero Trust', 'VPN'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://jobs.cisco.com',
    description: `Cisco India is hiring Network Security Engineers for its internal security and product teams.

Key Responsibilities:
- Design and implement enterprise network security architectures
- Configure and manage Cisco Firepower, Palo Alto, Fortinet firewalls
- Implement Zero Trust Network Access (ZTNA) solutions
- Monitor network traffic and respond to security incidents
- Lead SD-WAN deployments and VPN configurations

Certifications Preferred: CCNP Security / CCIE Security`,
  },
  {
    title: 'SAP FICO / SAP S/4HANA Consultant',
    location: 'Pune',
    jobType: 'Full-Time',
    department: 'ERP Consulting',
    urgency: 'Medium',
    numberOfOpenings: 20,
    experience: '3-8 years',
    salaryMin: 1500000, salaryMax: 3000000, salaryType: 'CTC',
    skills: ['SAP FICO', 'SAP S/4HANA', 'GL', 'AP', 'AR', 'Asset Accounting', 'ABAP Basics'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://www.ibm.com/in-en/employment/',
    description: `IBM India is hiring SAP FICO Consultants for S/4HANA implementation and migration projects.

You'll Lead:
- End-to-end SAP FICO module implementations (GL, AP, AR, AA, CO)
- S/4HANA migration and greenfield projects for global clients
- Blueprint preparation, gap analysis and go-live support
- Training and knowledge transfer to client teams

Requirements: 3-8 years SAP FICO experience, at least 2 full-cycle implementations`,
  },
  {
    title: 'Customer Success Manager (B2B SaaS)',
    location: 'Bangalore',
    jobType: 'Full-Time',
    department: 'Customer Success',
    urgency: 'High',
    numberOfOpenings: 15,
    experience: '2-5 years',
    salaryMin: 1200000, salaryMax: 2200000, salaryType: 'CTC',
    skills: ['Customer Success', 'SaaS', 'Churn Reduction', 'Onboarding', 'CRM', 'Executive Communication'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://careers.salesforce.com/en/jobs/?country=India',
    description: `Salesforce India is hiring Customer Success Managers to ensure enterprise clients get maximum value.

Role Overview:
- Own a portfolio of enterprise accounts post-sale
- Drive adoption, engagement and renewal
- Conduct executive business reviews (EBRs)
- Identify expansion opportunities and reduce churn
- Collaborate with sales, product and support teams

Requirements: 2-5 years in CSM/Account Management for B2B SaaS, strong executive communication`,
  },
  {
    title: 'Embedded Systems / Firmware Engineer',
    location: 'Bangalore',
    jobType: 'Full-Time',
    department: 'Hardware Engineering',
    urgency: 'Medium',
    numberOfOpenings: 10,
    experience: '3-6 years',
    salaryMin: 1200000, salaryMax: 2500000, salaryType: 'CTC',
    skills: ['C / C++', 'RTOS', 'Embedded Linux', 'CAN', 'UART', 'SPI', 'I2C', 'ARM Cortex'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://www.bosch.in/careers/',
    description: `Bosch India is hiring Embedded Systems Engineers for its connected mobility and IoT divisions.

What You'll Build:
- Firmware for automotive ECUs and industrial IoT devices
- Real-time systems using FreeRTOS / Zephyr OS
- Communication protocol stacks (CAN, LIN, UART, SPI, I2C)
- Bootloaders and OTA (over-the-air) update mechanisms
- Hardware-software co-design with VLSI teams

Requirements: C/C++, RTOS experience, ARM Cortex-M/A series, strong debugging skills`,
  },
  {
    title: 'Technical Content Writer (Developer Docs)',
    location: 'Remote',
    jobType: 'Full-Time',
    department: 'Developer Relations',
    urgency: 'Medium',
    numberOfOpenings: 8,
    experience: '1-4 years',
    salaryMin: 600000, salaryMax: 1400000, salaryType: 'CTC',
    skills: ['Technical Writing', 'API Documentation', 'Markdown', 'Git', 'Developer Experience', 'Swagger'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://www.google.com/intl/en/about/careers/applications/jobs/results?location=India',
    description: `Google India is hiring Technical Content Writers for developer documentation and learning content.

You'll Create:
- API reference docs, SDK guides and tutorials for developers
- Code samples, quickstart guides and how-to articles
- Content for Google Cloud, Android and Chrome developer portals
- Internal engineering wiki and runbooks

Requirements: Technical background (CS/IT preferred), strong writing skills, experience with API docs or developer content`,
  },
  {
    title: 'Operations Manager — E-Commerce Fulfilment',
    location: 'Hyderabad',
    jobType: 'Full-Time',
    department: 'Operations',
    urgency: 'High',
    numberOfOpenings: 6,
    experience: '4-8 years',
    salaryMin: 1200000, salaryMax: 2200000, salaryType: 'CTC',
    skills: ['Warehouse Management', 'Supply Chain', 'P&L Ownership', 'Team Leadership', 'Six Sigma', 'SLA Management'],
    contactEmail: 'hr@talentnesthr.com',
    externalUrl: 'https://www.amazon.jobs/en/locations/india',
    description: `Amazon India is hiring Operations Managers for its fulfilment and delivery network.

Key Responsibilities:
- Lead a team of 100+ associates in a fulfilment centre
- Own productivity, quality and safety metrics for your shift
- Implement process improvements using Lean/Six Sigma methodologies
- Manage vendor relationships and SLA compliance
- Drive cost reduction initiatives

Requirements: 4-8 years in warehouse/logistics operations, MBA preferred, Six Sigma Green Belt a plus`,
  },
];


async function seedTalentNestLinkedInJobs({ tenantId, createdBy }) {
  try {
    const baseJobs = [
      { title: 'Senior Full Stack Developer', department: 'Engineering', type: 'Full-Time', experience: '4-8 years', salary: '₹18–32 LPA', skills: ['React', 'Node.js', 'MongoDB', 'AWS'], description: 'Lead the development of our core HR SaaS platform. Scaling features and mentoring juniors.' },
      { title: 'Talent Acquisition Specialist', department: 'HR', type: 'Full-Time', experience: '2-5 years', salary: '₹8–14 LPA', skills: ['Sourcing', 'Screening', 'Stakeholder Management'], description: 'Help our clients find the best talent. Manage end-to-end recruitment pipelines.' },
      { title: 'Cybersecurity Analyst (L2)', department: 'Security', type: 'Full-Time', experience: '3-6 years', salary: '₹14–22 LPA', skills: ['SOC', 'SIEM', 'Threat Hunting', 'GRC'], description: 'Protect our infrastructure and client data. Respond to incidents and perform threat audits.' },
      { title: 'Product Manager', department: 'Product', type: 'Full-Time', experience: '5-9 years', salary: '₹22–38 LPA', skills: ['Agile', 'Market Research', 'Roadmapping', 'SaaS'], description: 'Define the future of automated recruitment.' },
      { title: 'DevOps Engineer', department: 'Infrastructure', type: 'Full-Time', experience: '3-7 years', salary: '₹16–28 LPA', skills: ['Kubernetes', 'Terraform', 'CI/CD', 'Docker'], description: 'Optimize our cloud footprint.' },
      { title: 'Data Scientist', department: 'Analytics', type: 'Full-Time', experience: '3-6 years', salary: '₹15–26 LPA', skills: ['Python', 'NLP', 'Matching Algorithms', 'SQL'], description: 'Build AI-powered matching.' },
      { title: 'React Native Developer', department: 'Mobile', type: 'Full-Time', experience: '2-5 years', salary: '₹12–22 LPA', skills: ['React Native', 'TypeScript', 'iOS', 'Android'], description: 'Build a seamless mobile experience.' },
      { title: 'Finance Manager', department: 'Finance', type: 'Full-Time', experience: '6-10 years', salary: '₹18–28 LPA', skills: ['Financial Planning', 'Taxation', 'ERP'], description: 'Oversee financial operations.' },
      { title: 'Marketing Lead', department: 'Marketing', type: 'Full-Time', experience: '4-8 years', salary: '₹14–24 LPA', skills: ['Content Strategy', 'SEO', 'Lead Generation'], description: 'Drive growth and awareness.' },
      { title: 'Sales Executive', department: 'Sales', type: 'Full-Time', experience: '2-5 years', salary: '₹6–12 LPA', skills: ['B2B Sales', 'Lead Gen', 'CRM'], description: 'Bring new enterprise clients.' },
    ];

    const locations = ['Hyderabad', 'Bangalore', 'Mumbai', 'Pune', 'Chennai', 'Gurgaon', 'Noida', 'Remote'];
    const departments = ['Engineering', 'Product', 'HR', 'Finance', 'Marketing', 'Sales', 'Infrastructure', 'Security', 'Operations'];

    const jobsToCreate = [];
    for (let i = 0; i < 200; i++) {
      const base = baseJobs[i % baseJobs.length];
      const loc = locations[i % locations.length];
      const dept = departments[i % departments.length];
      const level = i < 40 ? 'Senior ' : i > 160 ? 'Junior ' : '';
      const title = `${level}${base.title}`;
      const careerPageSlug = `seed-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${loc.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i}`;

      jobsToCreate.push({
        title,
        department: dept,
        location: loc,
        type: base.type,
        experience: base.experience,
        salary: base.salary,
        skills: base.skills,
        description: base.description,
        urgency: i % 5 === 0 ? 'High' : 'Medium',
        status: 'active',
        approvalStatus: 'approved',
        isPublic: true,
        tenantId,
        orgId: tenantId,
        createdBy,
        careerPageSlug,
        companyName: 'TalentNest HR',
        applicationCount: Math.floor(Math.random() * 15),
      });
    }

    console.log(`🚀 Syncing ${jobsToCreate.length} seed jobs for TalentNest HR...`);
    for (const job of jobsToCreate) {
      await Job.findOneAndUpdate(
        { tenantId, careerPageSlug: job.careerPageSlug },
        { $set: job },
        { upsert: true }
      );
    }
    console.log(`✅  200 jobs synced successfully.`);
  } catch (err) {
    console.error('❌  Error seeding 200 jobs:', err.message);
  }
}

async function seed() {
  // ── 0. Drop stale unique indexes that cause duplicate-null crashes ───────────
  try {
    await Application.collection.dropIndex('inviteToken_1');
    console.log('🔧  Dropped stale inviteToken_1 index');
  } catch (_) { /* index didn't exist — that's fine */ }

  // ── 1. TalentNest HR org (deduplicate) ──────────────────────────────────────
  const allTnOrgs = await Organization.find({ domain: { $regex: /talentnesthr\.com/i } });
  let tnOrg;

  if (allTnOrgs.length > 1) {
    const counts = await Promise.all(allTnOrgs.map(async o => {
      const od = o.toJSON ? o.toJSON() : o;
      const count = await User.countDocuments({ orgId: od.id });
      return { org: o, count };
    }));
    counts.sort((a, b) => b.count - a.count);
    tnOrg = counts[0].org;
    const primaryId   = (tnOrg.toJSON ? tnOrg.toJSON() : tnOrg).id;
    const primaryName = (tnOrg.toJSON ? tnOrg.toJSON() : tnOrg).name;
    for (const { org } of counts.slice(1)) {
      const od = org.toJSON ? org.toJSON() : org;
      await User.updateMany({ orgId: od.id }, { $set: { orgId: primaryId, orgName: primaryName } });
      await Organization.findByIdAndDelete(od.id);
      console.log(`🧹  Removed duplicate TalentNest HR org → ${od.domain}`);
    }
    await Organization.findByIdAndUpdate(primaryId, { $set: { domain: 'www.talentnesthr.com', slug: 'talentnesthr' } });
  } else if (allTnOrgs.length === 1) {
    tnOrg = allTnOrgs[0];
  } else {
    tnOrg = await Organization.create({
      name: 'TalentNest HR', slug: 'talentnesthr', domain: 'www.talentnesthr.com',
      industry: 'HR & Recruitment', size: '11-50', plan: 'enterprise', status: 'active',
      settings: {
        maxCandidates: 99999, maxJobs: 999, maxRecruiters: 99, maxAdmins: 10,
        features: ['jobs','candidates','pipeline','ai_match','bulk_import','reports','assessments','api_access'],
        dataVisibility: 'org', candidateExportEnabled: true, aiScoringEnabled: true,
      },
    });
    console.log('✅  TalentNest HR org created → www.talentnesthr.com (Enterprise)');
  }

  const od       = tnOrg.toJSON ? tnOrg.toJSON() : tnOrg;
  const tenantId = od.id;

  // ── 2. Super Admin (always synced) ──────────────────────────────────────────
  const ADMIN_EMAIL    = 'admin@talentnesthr.com';
  const ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'TalentNest@2024';

  const existingSA = await User.findOne({ email: ADMIN_EMAIL });
  if (existingSA) {
    const e = existingSA.toJSON ? existingSA.toJSON() : existingSA;
    await User.findByIdAndUpdate(e.id, {
      $set: { passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10), role: 'super_admin', tenantId, orgId: tenantId, orgName: od.name, isActive: true },
    });
    console.log('✅  Super Admin synced → admin@talentnesthr.com');
  } else {
    await User.deleteMany({ email: { $in: ['candidate@demo.com','recruiter@demo.com','admin@demo.com','superadmin@demo.com'] }});
    await User.deleteMany({ $or: [{ tenantId },{ orgId: tenantId }], email: { $ne: ADMIN_EMAIL }, role: { $ne: 'super_admin' } });
    console.log('🧹  Cleaned up stale non-super_admin users from platform org.');
    await User.create({ name: 'Super Admin', email: ADMIN_EMAIL, passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10), role: 'super_admin', title: 'Super Administrator', tenantId, orgId: tenantId, orgName: od.name, isActive: true });
    console.log(`✅  Super Admin created → ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }

  // ── 2.1 Ensure Recruiter "Vamsee" exists ───────────────────────────────────
  const VAMSEE_EMAIL = 'vamsee@talentnesthr.com';
  let vamsee = await User.findOne({ email: VAMSEE_EMAIL });
  if (!vamsee) {
    vamsee = await User.create({
      name: 'Vamsee',
      email: VAMSEE_EMAIL,
      passwordHash: bcrypt.hashSync('Vamsee@2024', 10),
      role: 'recruiter',
      title: 'Senior Talent Acquisition',
      tenantId,
      orgId: tenantId,
      orgName: od.name,
      isActive: true
    });
    console.log(`✅  Recruiter Vamsee created → ${VAMSEE_EMAIL}`);
  }

  const superAdmin = await User.findOne({ email: ADMIN_EMAIL }).select('_id').lean();
  // Job seeding disabled — do not re-add seed jobs on every deploy

  // ── 2.2 Backfill: link existing Candidate docs to their User accounts by email ──
  // Fixes the "Registered Users" tab showing 0 for candidates who registered before
  // the userId field was added to the Candidate auto-creation in auth.js
  try {
    const candidateUsers = await User.find({ role: 'candidate' }).select('_id email').lean();
    let linked = 0;
    for (const u of candidateUsers) {
      const result = await Candidate.updateMany(
        { email: u.email.toLowerCase(), userId: null },
        { $set: { userId: u._id } }
      );
      linked += result.modifiedCount || 0;
    }
    if (linked > 0) console.log(`✅  Linked ${linked} Candidate docs → User accounts`);
  } catch (e) {
    console.warn('⚠️  Candidate-User backfill failed (non-critical):', e.message);
  }

  // ── 2.3 Cleanup Duplicates ──────────────────────────────────────────────────
  await deduplicateJobs(tenantId);

  // ── 3. Skip demo data if env flag ────────────────────────────────────────────
  if (process.env.SKIP_DEMO_SEED === 'true') {
    console.log('ℹ️   SKIP_DEMO_SEED=true — skipping demo data seed');
    return;
  }

  // ── 4. Demo Org ──────────────────────────────────────────────────────────────
  let demoOrg = await Organization.findOne({ slug: 'acme-tech' });
  if (!demoOrg) {
    demoOrg = await Organization.create({
      name: 'Acme Technologies', slug: 'acme-tech', domain: 'acmetech.in',
      industry: 'Technology', size: '51-200', plan: 'pro', status: 'active',
      settings: {
        maxCandidates: 500, maxJobs: 50, maxRecruiters: 10, maxAdmins: 3,
        features: ['jobs','candidates','pipeline','ai_match','assessments'],
      },
    });
    console.log('✅  Demo org created → Acme Technologies');
  }
  const demo       = demoOrg.toJSON ? demoOrg.toJSON() : demoOrg;
  const demoTenant = demo.id;

  // ── 5. Demo Users ────────────────────────────────────────────────────────────
  const DEMO_PWD = 'Demo@1234';
  const hash     = bcrypt.hashSync(DEMO_PWD, 10);

  const demoUserDefs = [
    { email: 'admin@acmetech.in',     role: 'admin',          name: 'Priya Sharma',  title: 'HR Manager' },
    { email: 'recruiter@acmetech.in', role: 'recruiter',      name: 'Rahul Verma',   title: 'Senior Recruiter' },
    { email: 'recruiter2@acmetech.in',role: 'recruiter',      name: 'Sneha Patel',   title: 'Talent Acquisition' },
    { email: 'hiring@acmetech.in',    role: 'hiring_manager', name: 'Arjun Mehta',   title: 'Engineering Manager' },
    { email: 'candidate@acmetech.in', role: 'candidate',      name: 'Karan Singh',   title: 'Software Engineer' },
  ];

  const createdUsers = {};
  for (const u of demoUserDefs) {
    let existing = await User.findOne({ email: u.email });
    if (!existing) {
      existing = await User.create({
        ...u, passwordHash: hash,
        tenantId: demoTenant, orgId: demoTenant, orgName: demo.name, isActive: true,
      });
      console.log(`✅  Demo user created → ${u.email}`);
    } else {
      // Always keep password in sync so Demo@1234 always works
      await User.findByIdAndUpdate(
        existing._id,
        { $set: { passwordHash: hash, tenantId: demoTenant, orgId: demoTenant, orgName: demo.name, isActive: true } }
      );
    }
    createdUsers[u.email] = existing.toJSON ? existing.toJSON() : existing;
  }

  const recruiterUser = createdUsers['recruiter@acmetech.in'];
  const recruiter2    = createdUsers['recruiter2@acmetech.in'];
  const adminUser     = createdUsers['admin@acmetech.in'];
  const candidateUser = createdUsers['candidate@acmetech.in'];

  // ── 6. Jobs ─────────────────────────────────────────────────────────────────
  const existingJobCount = await Job.countDocuments({ tenantId: demoTenant });
  let jobs = [];

  if (existingJobCount === 0) {
    const jobPool = [
      { title: 'Senior React Developer',  dept: 'Engineering',     skills: ['React','TypeScript','Node.js','GraphQL'] },
      { title: 'Product Manager',         dept: 'Product',         skills: ['Product Management','Agile','Jira','Figma'] },
      { title: 'Cloud Architect',         dept: 'Infrastructure',  skills: ['AWS','Kubernetes','Terraform','Go'] },
      { title: 'UX Designer',             dept: 'Design',          skills: ['Figma','Adobe XD','Prototyping','User Research'] },
      { title: 'Data Scientist',          dept: 'Data',            skills: ['Python','PyTorch','scikit-learn','Machine Learning'] },
      { title: 'Sales Executive',         dept: 'Sales',           skills: ['Sales','CRM','Negotiation','Communication'] },
      { title: 'QA Automation Engineer',  dept: 'Quality',         skills: ['Selenium','Jest','Playwright','Test Automation'] },
      { title: 'Marketing Lead',          dept: 'Marketing',       skills: ['SEO','SEM','Content Strategy','Google Analytics'] },
      { title: 'Backend Lead',            dept: 'Engineering',     skills: ['Node.js','Express','MongoDB','PostgreSQL'] },
      { title: 'DevOps Engineer',         dept: 'Infrastructure',  skills: ['Docker','Kubernetes','CI/CD','Jenkins'] },
    ];

    const locations = ['Bangalore', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Remote'];
    const types     = ['Full-Time', 'Full-Time', 'Contract', 'Internship'];

    const jobData = jobPool.map((j, i) => ({
      title:           j.title,
      department:      j.dept,
      skills:          j.skills,
      company:         demo.name,
      location:        locations[i % locations.length],
      jobType:         types[i % types.length],
      experience:      `${2 + (i % 5)}-${6 + (i % 5)} years`,
      salaryMin:       800000  + (i * 200000),
      salaryMax:       1500000 + (i * 300000),
      numberOfOpenings: (i % 3) + 1,
      status:          i === 8 ? 'draft' : 'active',
      approvalStatus:  i === 8 ? 'pending' : 'approved',
      targetHireDate:  daysFrom(30 + (i * 5)),
      createdBy:       recruiterUser._id || recruiterUser.id,
      assignedRecruiters: i % 2 === 0
        ? [recruiterUser._id || recruiterUser.id]
        : [recruiter2._id || recruiter2.id],
      description: `We are looking for a talented ${j.title} to join the ${j.dept} team at Acme Technologies. You will work on cutting-edge projects with a collaborative, fast-paced team.`,
      requirements: j.skills.map(s => `Proficiency in ${s}`).join('\n'),
    }));

    // Use upsert — prevents duplicate jobs on every deploy
    jobs = await Promise.all(jobData.map(j => {
      const slug = `demo-${j.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${(j.location || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      return Job.findOneAndUpdate(
        { tenantId: demoTenant, careerPageSlug: slug },
        { $set: { ...j, tenantId: demoTenant, careerPageSlug: slug } },
        { upsert: true, new: true }
      );
    }));
    console.log(`✅  Synced ${jobs.length} demo jobs (upsert — no duplicates)`);
  } else {
    jobs = await Job.find({ tenantId: demoTenant }).lean();
    console.log(`ℹ️   Demo jobs already exist (${jobs.length})`);
  }

  // ── 7. Candidates ─────────────────────────────────────────────────────────────
  const existingCandidateCount = await Candidate.countDocuments({ tenantId: demoTenant });
  let candidates = [];

  if (existingCandidateCount === 0) {
    const names = [
      'Karan Singh',    'Anjali Nair',    'Deepak Gupta',    'Meera Krishnan',
      'Rohit Sharma',   'Priyanka Joshi', 'Vikram Nambiar',  'Sonal Agarwal',
      'Amitabh Das',    'Neha Kapoor',    'Suresh Iyer',     'Lata Menon',
      'Aditya Rao',     'Kavitha Reddy',  'Manish Saxena',   'Divya Pillai',
      'Nikhil Jain',    'Ritu Pandey',    'Sanjay Dubey',    'Pooja Nair',
      'Aryan Kapoor',   'Swati Mishra',   'Tanmay Shah',     'Riya Desai',
      'Kartik Menon',   'Shruti Kumar',   'Varun Bhatia',    'Asha Sharma',
      'Chirag Patel',   'Nisha Verma',
    ];
    const skillsPool = [
      'React', 'Node.js', 'Python', 'AWS', 'Kubernetes', 'Terraform',
      'Figma', 'UI/UX', 'Product Management', 'Sales', 'Recruitment',
      'Marketing', 'SQL', 'Tableau', 'Selenium', 'Java', 'Spring Boot',
      'Angular', 'Go', 'Redis', 'Docker', 'Jenkins', 'TypeScript',
      'Swift', 'Kotlin', 'Flutter', 'Redux', 'Azure', 'GCP', 'MongoDB',
    ];
    const sources    = ['career_page', 'linkedin', 'referral', 'manual', 'bulk_import', 'invite_link'];
    const locations  = ['Bangalore', 'Mumbai', 'Hyderabad', 'Pune', 'Chennai', 'Remote'];
    const companies  = ['Google', 'Meta', 'Amazon', 'TCS', 'Infosys', 'Wipro', 'Startup Nexus', 'Flipkart'];

    const candidateData = names.map((name, i) => ({
      name,
      email:    `${slug(name)}@demo.test`,   // fixed: replaces ALL spaces
      phone:    `+91 9000${String(100000 + i).slice(1)}`,
      location: locations[i % locations.length],
      source:   sources[i % sources.length],
      skills:   [skillsPool[i % skillsPool.length], skillsPool[(i + 7) % skillsPool.length], skillsPool[(i + 14) % skillsPool.length]],
      title:    ['Software Engineer', 'Senior Developer', 'Tech Lead', 'Product Manager', 'Designer', 'Data Analyst'][i % 6],
      summary:  `Experienced professional with ${2 + (i % 8)} years in the industry, skilled in ${skillsPool[i % skillsPool.length]} and ${skillsPool[(i + 7) % skillsPool.length]}.`,
      experience: 2 + (i % 8),
      parsedProfile: {
        skills:               [skillsPool[i % skillsPool.length], skillsPool[(i + 7) % skillsPool.length]],
        totalExperienceYears: 2 + (i % 8),
        experience: [{ company: companies[i % companies.length], role: 'Specialist', startDate: '2019-01', endDate: '2024-01' }],
        education:  [{ institution: ['IIT Bombay','NIT Trichy','BITS Pilani','VIT Vellore','DTU Delhi'][i % 5], degree: 'B.Tech', year: String(2016 + (i % 5)) }],
      },
      noticePeriodDays: [15, 30, 60, 90][i % 4],
      expectedSalary:   1200000 + (i * 100000),
      currentSalary:    900000  + (i * 80000),
      // Link first candidate to the candidate user account
      userId:           i === 0 ? (candidateUser._id || candidateUser.id) : undefined,
    }));

    const createdCandidates = await Promise.all(
      candidateData.map(c => Candidate.create({ ...c, tenantId: demoTenant }))
    );
    candidates = createdCandidates.map(c => c.toJSON ? c.toJSON() : c);

    // Update the candidate user to reference their candidate profile
    const karanProfile = candidates[0];
    if (karanProfile) {
      await User.findByIdAndUpdate(candidateUser._id || candidateUser.id, {
        $set: { candidateId: karanProfile._id || karanProfile.id }
      });
    }

    console.log(`✅  Created ${candidates.length} demo candidates`);
  } else {
    candidates = (await Candidate.find({ tenantId: demoTenant }).lean())
      .map(c => ({ ...c, id: c._id?.toString() }));
    console.log(`ℹ️   Demo candidates already exist (${candidates.length})`);
  }

  // ── 8. Applications ──────────────────────────────────────────────────────────
  const existingAppCount = await Application.countDocuments({ tenantId: demoTenant });

  if (existingAppCount === 0 && jobs.length > 0 && candidates.length > 0) {
    const jIds  = jobs.map(j => j._id || j.id);
    const cIds  = candidates.map(c => c._id || c.id);
    const recId = recruiterUser._id || recruiterUser.id;

    // Spread across all valid stages with realistic distribution
    const stageDistribution = [
      ...Array(6).fill('Applied'),
      ...Array(5).fill('Screening'),
      ...Array(5).fill('Shortlisted'),
      ...Array(4).fill('Interview Round 1'),
      ...Array(3).fill('Interview Round 2'),
      ...Array(3).fill('Offer'),
      ...Array(2).fill('Hired'),
      ...Array(2).fill('Rejected'),
    ];

    const appData = Array.from({ length: 30 }).map((_, i) => ({
      jobId:       jIds[i % jIds.length],
      candidateId: cIds[i % cIds.length],
      stage:       stageDistribution[i % stageDistribution.length],
      daysBack:    i * 2,
    }));

    await Promise.all(appData.map(({ jobId, candidateId, stage, daysBack }, i) => {
      const createdAt     = daysAgo(daysBack);
      const isInterview1  = stage === 'Interview Round 1';
      const isInterview2  = stage === 'Interview Round 2';
      const isOffer       = stage === 'Offer';
      const isHired       = stage === 'Hired';

      // Build stageHistory: Applied → current
      const stageHistory = [{ stage: 'Applied', movedBy: recId, movedAt: daysAgo(daysBack + 5) }];
      if (!['Applied'].includes(stage)) {
        stageHistory.push({ stage: 'Screening',   movedBy: recId, movedAt: daysAgo(daysBack + 4) });
      }
      if (['Shortlisted','Interview Round 1','Interview Round 2','Offer','Hired','Rejected'].includes(stage)) {
        stageHistory.push({ stage: 'Shortlisted', movedBy: recId, movedAt: daysAgo(daysBack + 3) });
      }
      if (['Interview Round 1','Interview Round 2','Offer','Hired'].includes(stage)) {
        stageHistory.push({ stage: 'Interview Round 1', movedBy: recId, movedAt: daysAgo(daysBack + 2) });
      }
      if (['Interview Round 2','Offer','Hired'].includes(stage)) {
        stageHistory.push({ stage: 'Interview Round 2', movedBy: recId, movedAt: daysAgo(daysBack + 1) });
      }
      if (['Offer','Hired'].includes(stage)) {
        stageHistory.push({ stage: 'Offer', movedBy: recId, movedAt: daysAgo(daysBack) });
      }
      if (stage === 'Hired') {
        stageHistory.push({ stage: 'Hired', movedBy: recId, movedAt: createdAt });
      }
      if (stage === 'Rejected') {
        stageHistory.push({ stage: 'Rejected', movedBy: recId, movedAt: createdAt });
      }

      // Interview rounds (for Interview Round 1/2)
      const interviewRounds = [];
      if (isInterview1 || isInterview2 || isOffer || isHired) {
        interviewRounds.push({
          scheduledAt:     daysFrom(3 + (i % 4)),
          format:          ['video', 'phone', 'in_person'][i % 3],
          interviewerName: ['Rahul Verma', 'Sneha Patel', 'Arjun Mehta'][i % 3],
          interviewerEmail: ['recruiter@acmetech.in', 'recruiter2@acmetech.in', 'hiring@acmetech.in'][i % 3],
          videoLink:        i % 3 === 0 ? 'https://meet.google.com/demo-link' : '',
          feedback:         {},
        });
      }
      if (isInterview2 || isOffer || isHired) {
        interviewRounds.push({
          scheduledAt:     daysAgo(1 + (i % 3)),
          format:          'video',
          interviewerName: 'Arjun Mehta',
          interviewerEmail: 'hiring@acmetech.in',
          videoLink:        'https://zoom.us/j/demo',
          feedback:         { rating: 4, notes: 'Strong candidate, good technical skills.' },
        });
      }

      // Use findOneAndUpdate+upsert to avoid E11000 on unique {jobId,candidateId} index
      return Application.findOneAndUpdate(
        { tenantId: demoTenant, jobId, candidateId, deletedAt: null },
        { $setOnInsert: {
            tenantId, jobId, candidateId, currentStage: stage, createdAt,
            aiMatchScore: Math.floor(Math.random() * 35) + 55,
            stageHistory, interviewRounds,
            offerDetails: (isOffer || isHired) ? {
              salary: 2000000 + (i * 150000), joiningDate: daysFrom(30),
              status: isHired ? 'signed' : 'sent',
              components: [{ label: 'Fixed Pay', value: 1800000 }, { label: 'Variable', value: 400000 }],
            } : undefined,
            notes: isHired ? 'Great fit for the role. Accepted offer.' : '',
            createdBy: recId,
          }
        },
        { upsert: true, new: true }
      ).catch(() => null); // silently skip any remaining conflicts
    }));

    console.log(`✅  Created 30 demo applications across all pipeline stages`);
  } else if (existingAppCount > 0) {
    console.log(`ℹ️   Demo applications already exist (${existingAppCount}), skipping`);
  }

  // ── 9. Ensure Karan Singh (candidate user) has a linked Candidate record ─────
  const karanUser = await User.findOne({ email: 'candidate@acmetech.in' });
  if (karanUser && !karanUser.candidateId) {
    const karanProfile = await Candidate.findOne({ tenantId: demoTenant, name: 'Karan Singh' });
    if (karanProfile) {
      await User.findByIdAndUpdate(karanUser._id, { $set: { candidateId: karanProfile._id } });
      console.log('✅  Linked candidate user → Karan Singh profile');
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TalentNest HR — Demo Accounts  (password: Demo@1234)');
  console.log('  Admin:          admin@acmetech.in');
  console.log('  Recruiter:      recruiter@acmetech.in');
  console.log('  Recruiter 2:    recruiter2@acmetech.in');
  console.log('  Hiring Manager: hiring@acmetech.in');
  console.log('  Candidate:      candidate@acmetech.in');
  console.log('───────────────────────────────────────────────────────────');
  console.log('  Super Admin:    admin@talentnesthr.com / TalentNest@2024');
  console.log('═══════════════════════════════════════════════════════════');
}

module.exports = seed;
