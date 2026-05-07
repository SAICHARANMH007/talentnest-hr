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

  // ── 2.4 NuSummit Org + Admin + Jobs (always synced) ─────────────────────────
  try {
    const NS_SLUG     = 'nusummit';
    const NS_EMAIL    = 'admin@nusummit.com';
    const NS_PASSWORD = 'NuSummit@2024';

    let nsOrg = await Organization.findOne({ slug: NS_SLUG });
    if (!nsOrg) {
      nsOrg = await Organization.create({
        name: 'NuSummit', slug: NS_SLUG, domain: 'nusummit.com',
        industry: 'IT Services & Consulting', size: '51-200', plan: 'pro', status: 'active',
        settings: {
          maxCandidates: 1000, maxJobs: 100, maxRecruiters: 10, maxAdmins: 3,
          features: ['jobs','candidates','pipeline','ai_match','assessments'],
        },
      });
      console.log('✅  NuSummit org created → nusummit.com');
    }
    const nsOd       = nsOrg.toJSON ? nsOrg.toJSON() : nsOrg;
    const nsTenantId = nsOd.id;

    // NuSummit admin (upsert + sync password)
    let nsAdmin = await User.findOne({ email: NS_EMAIL });
    if (!nsAdmin) {
      await User.create({
        name: 'NuSummit Admin', email: NS_EMAIL,
        passwordHash: bcrypt.hashSync(NS_PASSWORD, 10),
        role: 'admin', title: 'HR Admin',
        tenantId: nsTenantId, orgId: nsTenantId, orgName: nsOd.name, isActive: true,
      });
      console.log(`✅  NuSummit Admin created → ${NS_EMAIL} / ${NS_PASSWORD}`);
    } else {
      await User.findByIdAndUpdate(nsAdmin._id, {
        $set: { passwordHash: bcrypt.hashSync(NS_PASSWORD, 10), tenantId: nsTenantId, orgId: nsTenantId, orgName: nsOd.name, isActive: true },
      });
      console.log(`✅  NuSummit Admin synced → ${NS_EMAIL}`);
    }

    // 16 NuSummit jobs — upsert by careerPageSlug so re-deploys never create duplicates
    const nsJobDefs = [
      {
        title: 'Kafka Technical Consultant',
        location: 'Mumbai',
        department: 'Infrastructure',
        skills: ['Apache Kafka', 'KSQL', 'Java', 'Schema Registry', 'Confluent', 'Event-Driven Architecture'],
        experience: '4+ years',
        description: `NuSummit is hiring a Kafka Technical Consultant to design and implement event-driven architectures for enterprise clients.

Key Responsibilities:
• Design and implement event-driven architectures using Apache Kafka and Confluent Platform
• Manage and monitor Confluent Kafka clusters in production environments
• Develop Kafka Streams and KSQL-based real-time data pipelines
• Lead performance tuning, capacity planning, and disaster recovery strategies
• Work with clients to assess, architect, and migrate data pipelines to Kafka
• Manage Schema Registry, Kafka Connect connectors, and MirrorMaker setups
• Provide L3 support and resolution for Kafka-related incidents

About NuSummit:
NuSummit is a technology consulting firm specializing in cloud, data engineering, and enterprise IT solutions. We partner with Fortune 500 companies to deliver scalable, high-performance systems.`,
        requirements: `Required Skills & Experience:
• 4+ years hands-on experience with Apache Kafka in production
• Strong expertise in Confluent Platform, KSQL, and Schema Registry
• Proficiency in Java for Kafka producer/consumer development
• Experience with Kafka Connect, MirrorMaker, and stream processing
• Understanding of distributed systems and messaging architectures
• Confluent Certified Developer or Administrator certification preferred
• Strong communication skills for client-facing engagements`,
        benefits: 'Competitive salary, health insurance, flexible work arrangements, professional certifications sponsored, performance bonuses.',
        externalUrl: 'https://www.nusummit.com/current-openings/kafka-technical-consultant/',
      },
      {
        title: 'GoLang Developer',
        location: 'Mumbai',
        department: 'Engineering',
        skills: ['GoLang', 'Microservices', 'REST APIs', 'SQL', 'Docker', 'Kubernetes'],
        experience: '3+ years',
        description: `NuSummit is looking for a skilled GoLang Developer to build high-performance backend services for enterprise-grade platforms.

Key Responsibilities:
• Develop and maintain high-concurrency backend services and microservices using Go
• Design and implement RESTful APIs and gRPC services
• Manage containerized deployments using Docker and Kubernetes
• Write clean, testable, and performant Go code following best practices
• Collaborate with front-end and DevOps teams for end-to-end delivery
• Optimize services for performance, reliability, and scalability
• Participate in code reviews and technical design discussions

About NuSummit:
NuSummit is a technology consulting company delivering cloud-native solutions and digital transformation projects across industries.`,
        requirements: `Required Skills & Experience:
• 3+ years of professional Go (GoLang) development experience
• Strong understanding of microservices architecture and design patterns
• Experience building RESTful APIs and working with SQL databases (PostgreSQL/MySQL)
• Hands-on with Docker and Kubernetes for containerization and orchestration
• Familiarity with CI/CD pipelines and version control (Git)
• Knowledge of concurrency patterns, goroutines, and channels
• Good understanding of software testing practices in Go`,
        benefits: 'Competitive CTC, health & wellness benefits, remote flexibility, learning & development budget.',
        externalUrl: 'https://www.nusummit.com/current-openings/golang-developer/',
      },
      {
        title: 'AI Product Engineer',
        location: 'Pan-India',
        department: 'Engineering',
        skills: ['Python', 'LLMs', 'GPT', 'Claude', 'RAG', 'PyTorch', 'Prompt Engineering'],
        experience: '3+ years',
        description: `NuSummit is seeking an AI Product Engineer to lead GenAI product development initiatives across our portfolio of enterprise clients.

Key Responsibilities:
• Lead R&D for Generative AI products including LLM integration and prompt engineering
• Design and implement RAG (Retrieval-Augmented Generation) pipelines for enterprise search and Q&A systems
• Build and fine-tune AI models using PyTorch and Hugging Face
• Collaborate with product and engineering teams to take AI features from concept to production
• Evaluate and integrate leading LLM APIs (OpenAI GPT, Anthropic Claude, etc.)
• Optimize inference performance and manage AI cost-efficiency
• Document architectures, conduct experiments, and publish learnings

About NuSummit:
NuSummit is at the forefront of AI-driven enterprise transformation, working with clients across banking, healthcare, retail, and technology sectors.`,
        requirements: `Required Skills & Experience:
• 3+ years of Python development with a focus on AI/ML
• Hands-on experience with LLMs — GPT-4, Claude, or equivalent models
• Strong understanding of RAG architectures and vector databases (Pinecone, Weaviate, FAISS)
• Experience with PyTorch and ML model deployment
• Prompt engineering skills — both zero-shot and few-shot techniques
• Familiarity with LangChain, LlamaIndex, or similar frameworks
• Experience deploying AI applications in cloud environments (AWS/Azure/GCP)`,
        benefits: 'Top-of-market compensation, stock options, flexible remote work, AI research budget, conference sponsorships.',
        externalUrl: 'https://www.nusummit.com/current-openings/ai-product-engineer/',
      },
      {
        title: 'Java Developer',
        location: 'Mumbai',
        department: 'Engineering',
        skills: ['Java', 'Spring Boot', 'Hibernate', 'Microservices', 'REST APIs', 'SQL'],
        experience: '3+ years',
        description: `NuSummit is hiring a Java Developer to build microservices-based enterprise applications for leading clients across BFSI, telecom, and technology sectors.

Key Responsibilities:
• Design and develop microservices and RESTful APIs using Java and Spring Boot
• Implement data persistence layers using Hibernate/JPA with relational databases
• Collaborate with solution architects to design scalable backend systems
• Write unit and integration tests and maintain code quality through code reviews
• Participate in Agile sprints and contribute to technical documentation
• Optimize application performance and troubleshoot production issues
• Work across the full SDLC from requirements to deployment

About NuSummit:
NuSummit delivers enterprise Java solutions to marquee clients, helping them modernize legacy systems and build cloud-native platforms.`,
        requirements: `Required Skills & Experience:
• 3+ years experience with Java 8/11+ in enterprise environments
• Strong knowledge of Spring Boot, Spring MVC, and Spring Security
• Proficiency with Hibernate/JPA and relational databases (Oracle/MySQL/PostgreSQL)
• Experience designing RESTful APIs and microservices architecture
• Understanding of design patterns and SOLID principles
• Familiarity with Maven/Gradle build tools and Git
• Experience with Agile/Scrum development methodologies`,
        benefits: 'Competitive salary, health insurance, annual appraisals, learning & development fund, flexible hours.',
        externalUrl: 'https://www.nusummit.com/current-openings/java-developer/',
      },
      {
        title: 'DevOps Engineer',
        location: 'Chennai',
        department: 'Infrastructure',
        skills: ['Jenkins', 'Git', 'Kubernetes', 'Docker', 'CI/CD', 'AWS', 'Azure', 'Terraform'],
        experience: '3+ years',
        description: `NuSummit is looking for a DevOps Engineer to build and maintain robust CI/CD pipelines and cloud infrastructure for enterprise clients.

Key Responsibilities:
• Design, build, and maintain CI/CD pipelines using Jenkins, GitHub Actions, or Azure DevOps
• Manage containerized workloads on Kubernetes (EKS/AKS) and Docker
• Automate infrastructure provisioning using Terraform and Ansible
• Monitor application health, respond to incidents, and drive reliability improvements
• Implement security best practices and compliance controls in the pipeline
• Collaborate with development teams to streamline deployment processes
• Manage cloud resources on AWS and/or Azure, including cost optimization

About NuSummit:
NuSummit's infrastructure practice supports large-scale enterprise deployments across multi-cloud and hybrid environments.`,
        requirements: `Required Skills & Experience:
• 3+ years in a DevOps or SRE role
• Proficiency with CI/CD tools: Jenkins, GitHub Actions, or Azure DevOps
• Hands-on Kubernetes (EKS/AKS/GKE) and Docker container management
• Infrastructure-as-code experience with Terraform and/or Ansible
• Cloud platform experience on AWS or Azure (certifications preferred)
• Scripting proficiency in Bash, Python, or PowerShell
• Understanding of monitoring tools: Prometheus, Grafana, Datadog, or similar`,
        benefits: 'Competitive CTC, remote work flexibility, cloud certifications sponsored, health benefits, performance bonus.',
        externalUrl: 'https://www.nusummit.com/current-openings/devops-engineer/',
      },
      {
        title: 'C Linux Developer',
        location: 'Mumbai',
        department: 'Engineering',
        skills: ['C', 'Linux', 'Socket Programming', 'Linux Kernel', 'Low-Latency Systems', 'Embedded Systems'],
        experience: '4+ years',
        description: `NuSummit is seeking a C Linux Developer to work on system-level software and low-latency performance-critical applications.

Key Responsibilities:
• Design and develop system-level software, daemons, and kernel modules in C
• Implement low-latency networking using socket programming (TCP/UDP, raw sockets)
• Optimize application performance through profiling, tuning, and memory management
• Debug complex issues at the OS and kernel level using tools like GDB, Valgrind, and perf
• Collaborate with hardware and embedded teams for driver and firmware development
• Develop and maintain automated test suites for system components
• Document system architecture and technical specifications

About NuSummit:
NuSummit's systems engineering team works on latency-sensitive, mission-critical applications across telecom, defense, and financial services.`,
        requirements: `Required Skills & Experience:
• 4+ years of C programming in a Linux environment
• Deep understanding of Linux kernel internals, process management, and memory model
• Proficiency in POSIX socket programming (TCP/UDP, IPC mechanisms)
• Experience with low-latency or real-time Linux system development
• Debugging skills using GDB, Valgrind, strace, ltrace, and perf
• Familiarity with embedded systems and cross-compilation toolchains a plus
• Strong grasp of data structures, algorithms, and multi-threaded programming`,
        benefits: 'Competitive compensation, technical growth paths, health insurance, flexible work policy.',
        externalUrl: 'https://www.nusummit.com/current-openings/c-linux/',
      },
      {
        title: 'AWS L3 Professional',
        location: 'Mumbai',
        department: 'Cloud Operations',
        skills: ['AWS', 'EC2', 'S3', 'CloudFormation', 'IAM', 'Terraform', 'Infrastructure Automation'],
        experience: '4+ years',
        description: `NuSummit is hiring an AWS L3 Professional to handle complex cloud escalations and infrastructure automation for enterprise clients.

Key Responsibilities:
• Provide L3 support for critical AWS infrastructure outages and complex technical issues
• Perform root cause analysis (RCA) and drive long-term remediation strategies
• Automate infrastructure provisioning and management using CloudFormation and Terraform
• Design and implement IAM policies, security groups, and compliance controls
• Manage EC2 fleets, S3 lifecycle policies, VPC configurations, and RDS instances
• Collaborate with L1/L2 teams to build runbooks and escalation procedures
• Drive cost optimization through Reserved Instances, Savings Plans, and rightsizing

About NuSummit:
NuSummit's cloud operations team supports 24x7 enterprise AWS environments with a commitment to high availability and security.`,
        requirements: `Required Skills & Experience:
• 4+ years managing complex AWS environments in a production setting
• Deep expertise in core AWS services: EC2, S3, VPC, RDS, CloudFormation, IAM, ELB
• Hands-on with Terraform for infrastructure-as-code
• Strong understanding of AWS security services: GuardDuty, Config, CloudTrail, Security Hub
• AWS Solutions Architect Associate or Professional certification preferred
• Experience with incident management, RCA, and post-mortem processes
• Scripting skills in Python or Bash for automation tasks`,
        benefits: 'Competitive salary, AWS certification support, health & wellness benefits, shift allowances where applicable.',
        externalUrl: 'https://www.nusummit.com/current-openings/aws-l3/',
      },
      {
        title: 'Cloud Operations Manager',
        location: 'Mumbai',
        department: 'Cloud Operations',
        skills: ['AWS', 'Azure', 'SRE', 'FinOps', 'Cloud Governance', 'Cost Optimization'],
        experience: '7+ years',
        description: `NuSummit is seeking a Cloud Operations Manager to lead cloud governance, FinOps, and SRE team operations across enterprise client environments.

Key Responsibilities:
• Lead a team of cloud engineers and SREs managing multi-cloud environments (AWS/Azure)
• Define and drive cloud governance frameworks, policies, and compliance standards
• Own FinOps initiatives — cloud cost visibility, optimization, and chargeback models
• Establish SLOs, SLAs, and error budgets aligned to business requirements
• Drive incident management, blameless post-mortems, and reliability improvements
• Manage vendor relationships with AWS, Azure, and third-party tooling providers
• Lead strategic cloud roadmap planning and present to senior stakeholders

About NuSummit:
NuSummit's cloud practice manages large-scale enterprise cloud infrastructure with a focus on reliability, security, and cost efficiency.`,
        requirements: `Required Skills & Experience:
• 7+ years in cloud infrastructure roles with 3+ years in management or leadership
• Deep expertise in AWS and/or Azure cloud platforms
• Hands-on SRE experience: SLOs, error budgets, incident management, automation
• Strong FinOps knowledge — cloud cost governance and optimization frameworks
• Experience with cloud governance tools and compliance frameworks (CIS, NIST, SOC2)
• Excellent stakeholder communication and executive-level reporting skills
• AWS Solutions Architect Professional or Azure Expert-level certification preferred`,
        benefits: 'Senior leadership compensation, equity participation, relocation assistance, top-tier health benefits.',
        externalUrl: 'https://www.nusummit.com/current-openings/cloud-operations-manager/',
      },
      {
        title: 'Informatica Admin',
        location: 'Chennai / Mumbai',
        department: 'Data Engineering',
        skills: ['Informatica PowerCenter', 'ETL', 'Unix', 'SQL', 'Data Migration', 'Performance Tuning'],
        experience: '4+ years',
        description: `NuSummit is hiring an Informatica Admin to manage and optimize enterprise ETL platforms and large-scale data migration projects.

Key Responsibilities:
• Administer and maintain Informatica PowerCenter environments (Dev/QA/Prod)
• Manage ETL workflows, session configurations, and scheduler settings
• Plan and execute data migration projects with minimal downtime
• Perform performance tuning of mappings, sessions, and database queries
• Troubleshoot ETL failures, monitor logs, and respond to production issues
• Implement best practices for Informatica repository management and version control
• Coordinate with DBAs and data architects on schema changes and data quality

About NuSummit:
NuSummit's data engineering team handles end-to-end data platform modernization projects for leading banks, insurers, and telecom companies.`,
        requirements: `Required Skills & Experience:
• 4+ years Informatica PowerCenter administration (8.x/9.x/10.x)
• Strong ETL design and development skills in Informatica
• Unix/Linux shell scripting for automation and scheduling
• SQL expertise (Oracle/SQL Server) for complex query writing and optimization
• Experience with Informatica repository management and deployment procedures
• Knowledge of data warehousing concepts, dimensional modeling, and CDC
• Familiarity with Informatica IICS or cloud ETL tools is a plus`,
        benefits: 'Competitive pay, health insurance, relocation support, data certifications sponsored.',
        externalUrl: 'https://www.nusummit.com/current-openings/informatica-admin/',
      },
      {
        title: 'Network Engineer',
        location: 'Mumbai',
        department: 'Infrastructure',
        skills: ['Cisco', 'Palo Alto', 'VPN', 'Routing', 'Switching', 'Firewall', 'BGP', 'OSPF'],
        experience: '4+ years',
        description: `NuSummit is looking for a Network Engineer to design, deploy, and maintain enterprise network infrastructure for global clients.

Key Responsibilities:
• Configure, maintain, and troubleshoot L2/L3 Cisco switches and routers
• Manage Palo Alto next-generation firewalls, security policies, and VPN configurations
• Design and implement BGP, OSPF, and MPLS routing across WAN environments
• Monitor network performance using tools like SolarWinds, PRTG, or Zabbix
• Respond to network incidents, perform root cause analysis, and drive resolution
• Implement network security best practices, segmentation, and access controls
• Document network topology, IP addressing schemes, and change records

About NuSummit:
NuSummit's infrastructure team manages global enterprise network environments across BFSI, manufacturing, and technology sectors.`,
        requirements: `Required Skills & Experience:
• 4+ years of enterprise networking experience
• Strong hands-on skills with Cisco routers, switches, and IOS
• Experience configuring and managing Palo Alto firewalls and Panorama
• Proficiency in routing protocols: BGP, OSPF, EIGRP
• Site-to-site and remote access VPN configuration (IPSec/SSL)
• CCNA/CCNP certification required; Palo Alto PCNSE a plus
• Familiarity with SD-WAN technologies (Cisco Viptela, Meraki) preferred`,
        benefits: 'Competitive salary, Cisco/Palo Alto certification support, health insurance, shift flexibility.',
        externalUrl: 'https://www.nusummit.com/current-openings/network-engineer/',
      },
      {
        title: 'App/Prod Support (Linux/SQL)',
        location: 'Gandhinagar',
        department: 'Operations',
        skills: ['Linux', 'SQL', 'Shell Scripting', 'ITIL', 'Log Analysis', 'Monitoring'],
        experience: '2+ years',
        description: `NuSummit is hiring an Application/Production Support Engineer to maintain and troubleshoot enterprise applications on Linux and SQL environments.

Key Responsibilities:
• Provide 24/7 L2/L3 application and production support across Linux-based systems
• Monitor application health, analyze server logs, and identify performance bottlenecks
• Execute SQL queries for data analysis, issue diagnosis, and reporting
• Write and maintain shell scripts for automation, scheduling, and health checks
• Raise, track, and resolve incidents per ITIL processes within SLA timelines
• Collaborate with development teams to escalate and resolve complex issues
• Maintain runbooks, SOPs, and knowledge base articles

About NuSummit:
NuSummit's managed services team provides round-the-clock application support to enterprise clients across BFSI, healthcare, and logistics.`,
        requirements: `Required Skills & Experience:
• 2+ years experience in application or production support roles
• Strong Linux administration skills (RHEL/CentOS/Ubuntu)
• SQL proficiency for query writing, data extraction, and troubleshooting
• Shell scripting (Bash) for task automation
• ITIL Foundation certification or knowledge of ITIL incident management
• Experience with monitoring tools: Nagios, Splunk, AppDynamics, or similar
• Good communication skills for client interaction and escalation management`,
        benefits: 'Shift allowances, health insurance, ITIL certification support, performance bonuses.',
        externalUrl: 'https://www.nusummit.com/current-opening/application-production-supportlinux-and-sql/',
      },
      {
        title: 'Automation A360 RPA Support',
        location: 'Mumbai',
        department: 'Automation',
        skills: ['RPA', 'Automation Anywhere', 'A360', 'Bot Insight', 'Process Automation'],
        experience: '2+ years',
        description: `NuSummit is seeking an Automation A360 RPA Support specialist to deploy, manage, and optimize intelligent RPA bots for enterprise clients.

Key Responsibilities:
• Deploy and support RPA bots built on Automation Anywhere A360 platform
• Monitor bot execution queues, resolve failures, and maintain bot availability
• Work with business analysts and developers to identify automation opportunities
• Configure and manage Bot Insight dashboards for performance tracking
• Develop and maintain bot documentation, runbooks, and change requests
• Perform bot upgrades, migrations, and version management
• Provide L2 support for RPA infrastructure and bot-related incidents

About NuSummit:
NuSummit's automation practice delivers intelligent process automation solutions to banking, insurance, and shared services clients.`,
        requirements: `Required Skills & Experience:
• 2+ years experience with Automation Anywhere A360 or A2019
• Hands-on bot development and support using AA A360 platform
• Experience with Bot Insight reporting and analytics
• Understanding of Control Room administration and user management
• Knowledge of process analysis and automation feasibility assessment
• Automation Anywhere Certified RPA Associate (ACRPA) preferred
• Basic SQL and API integration knowledge for bot development`,
        benefits: 'Competitive salary, RPA certifications sponsored, health insurance, performance bonuses.',
        externalUrl: 'https://www.nusummit.com/current-openings/automation-a360-rpa-support/',
      },
      {
        title: 'Dot Net Developer',
        location: 'Mumbai',
        department: 'Engineering',
        skills: ['C#', '.NET Core', 'ASP.NET', 'SQL Server', 'Entity Framework', 'REST APIs'],
        experience: '3+ years',
        description: `NuSummit is hiring a .NET Developer to build scalable enterprise web applications and APIs for BFSI and technology clients.

Key Responsibilities:
• Design and develop web applications and REST APIs using C# and .NET Core
• Implement data access layers with Entity Framework Core and SQL Server
• Participate in the full SDLC: requirements gathering to deployment and maintenance
• Write clean, well-tested code and conduct peer code reviews
• Integrate third-party APIs, services, and enterprise platforms
• Troubleshoot and resolve production defects and performance issues
• Follow SOLID principles, design patterns, and coding standards

About NuSummit:
NuSummit builds enterprise .NET solutions for banks, insurance companies, and technology firms across India and globally.`,
        requirements: `Required Skills & Experience:
• 3+ years of professional C# and .NET Core development
• Strong ASP.NET MVC/Web API development skills
• Proficiency with Entity Framework Core and SQL Server
• Experience designing and consuming RESTful APIs
• Familiarity with Dependency Injection, SOLID principles, and design patterns
• Version control using Git and familiarity with CI/CD pipelines
• Understanding of Agile/Scrum practices`,
        benefits: 'Competitive CTC, health insurance, flexible working hours, annual performance bonus.',
        externalUrl: 'https://www.nusummit.com/current-openings/dot-net-developer/',
      },
      {
        title: 'Database Manager',
        location: 'Mumbai',
        department: 'Data Engineering',
        skills: ['Oracle', 'SQL Server', 'Performance Tuning', 'Backup & Recovery', 'Database Security', 'DBA'],
        experience: '6+ years',
        description: `NuSummit is looking for an experienced Database Manager to oversee enterprise database environments for critical financial and technology clients.

Key Responsibilities:
• Manage and administer Oracle and SQL Server databases across Dev/QA/Prod environments
• Design and implement database architectures, schemas, and data models
• Perform performance tuning: query optimization, indexing strategy, execution plan analysis
• Develop and maintain backup, recovery, and high-availability strategies (RAC, Always On, RMAN)
• Implement database security: user access control, auditing, encryption, and compliance
• Plan and execute database migrations, upgrades, and patching
• Mentor junior DBAs and establish DBA best practices and standards

About NuSummit:
NuSummit's data management team handles mission-critical database environments for banks, trading firms, and enterprise technology companies.`,
        requirements: `Required Skills & Experience:
• 6+ years DBA experience with Oracle (12c/19c) and/or SQL Server (2016/2019)
• Expert-level performance tuning: query analysis, indexing, partitioning, execution plans
• Strong HA/DR knowledge: Oracle RAC, Data Guard, SQL Server Always On, Log Shipping
• Backup and recovery expertise with RMAN and SQL Server backup strategies
• Database security: TDE, auditing, role-based access control, and compliance (GDPR, SOX)
• Scripting skills (PL/SQL, T-SQL) for automation and complex data operations
• OCP or equivalent certification preferred`,
        benefits: 'Senior-level compensation, Oracle/Microsoft certifications supported, health insurance, leadership track.',
        externalUrl: 'https://www.nusummit.com/current-openings/database-manager/',
      },
      {
        title: 'Technical Architect',
        location: 'Gurgaon',
        department: 'Architecture',
        skills: ['System Design', 'Distributed Systems', 'Cloud', 'Microservices', 'API Design', 'Technical Leadership'],
        experience: '8+ years',
        description: `NuSummit is seeking a Technical Architect to lead platform design, define technical strategy, and mentor engineering teams on enterprise transformation programs.

Key Responsibilities:
• Own end-to-end solution and application architecture for enterprise client programs
• Lead technical roadmap creation and present architectural decisions to senior stakeholders
• Design cloud-native microservices architectures on AWS/Azure/GCP
• Define API strategies, integration patterns, and data flow designs
• Conduct architecture reviews, proof-of-concepts, and technology evaluations
• Mentor and guide development teams on technical best practices and standards
• Drive adoption of modern engineering practices: TDD, CI/CD, DevOps, IaC

About NuSummit:
NuSummit's architecture practice advises Fortune 500 clients on cloud-native modernization, platform engineering, and enterprise digital transformation.`,
        requirements: `Required Skills & Experience:
• 8+ years total experience with 3+ years in architecture or solution design roles
• Deep expertise in distributed systems, microservices, and event-driven architectures
• Hands-on cloud platform experience (AWS/Azure/GCP) with certifications preferred
• Strong API design skills: REST, GraphQL, gRPC, and API gateway patterns
• Experience with domain-driven design (DDD) and clean architecture principles
• Proven ability to lead technical teams and influence without authority
• Excellent written and verbal communication for executive and client-facing presentations`,
        benefits: 'Senior compensation package, equity, premium health benefits, leadership development programs.',
        externalUrl: 'https://www.nusummit.com/current-openings/technical-architect/',
      },
      {
        title: 'Dot Net Lead',
        location: 'Mumbai',
        department: 'Engineering',
        skills: ['C#', '.NET Core', 'ASP.NET', 'SQL Server', 'Team Leadership', 'Code Review', 'Microservices'],
        experience: '6+ years',
        description: `NuSummit is hiring a .NET Lead to drive technical delivery, lead a team of developers, and own the architecture of enterprise .NET applications.

Key Responsibilities:
• Lead a team of 4–8 .NET developers, conducting code reviews and guiding technical decisions
• Own end-to-end delivery of .NET Core-based enterprise applications and microservices
• Architect and design scalable .NET solutions aligned to client business requirements
• Define coding standards, best practices, and technical documentation for the team
• Collaborate with project managers, business analysts, and client stakeholders
• Drive technical hiring, onboarding, and mentoring of team members
• Participate in pre-sales and solution design activities with the NuSummit leadership team

About NuSummit:
NuSummit builds high-impact .NET solutions for BFSI, healthcare, and logistics clients. The .NET Lead role offers a direct path into solution architecture and delivery management.`,
        requirements: `Required Skills & Experience:
• 6+ years professional .NET development with 2+ years in a lead or senior role
• Expertise in C#, .NET Core, ASP.NET Web API, and microservices patterns
• Strong SQL Server skills including stored procedures, query tuning, and schema design
• Experience leading small-to-mid development teams end-to-end
• Knowledge of Azure DevOps, CI/CD pipelines, and agile delivery practices
• Architecture knowledge: CQRS, Event Sourcing, DDD, or similar patterns preferred
• Strong communication and stakeholder management skills`,
        benefits: 'Leadership compensation, team bonuses, health coverage, fast-track to architect roles, certification sponsorships.',
        externalUrl: 'https://www.nusummit.com/current-openings/dot-net-lead/',
      },
    ];

    let nsJobCount = 0;
    for (const j of nsJobDefs) {
      const nsSlug = `nusummit-${j.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      await Job.findOneAndUpdate(
        { tenantId: nsTenantId, careerPageSlug: nsSlug },
        {
          $set: {
            ...j,
            company: 'NuSummit',
            companyName: 'NuSummit',
            tenantId: nsTenantId,
            orgId: nsTenantId,
            careerPageSlug: nsSlug,
            status: 'active',
            approvalStatus: 'approved',
            isPublic: true,
            jobType: j.jobType || 'Full-Time',
            workMode: 'Hybrid',
            location: j.location || 'Mumbai',
            urgency: 'Medium',
            createdBy: nsAdmin?._id || (await User.findOne({ email: NS_EMAIL }).select('_id').lean())?._id,
          },
        },
        { upsert: true }
      );
      nsJobCount++;
    }
    console.log(`✅  NuSummit: ${nsJobCount} jobs synced (upsert — no duplicates)`);
  } catch (nsErr) {
    console.error('❌  NuSummit seed failed (non-critical):', nsErr.message);
  }

  // ── 2.5 SelfCrops Org + Admin Kavya + 22 Agriculture/AgriTech Jobs ──────────
  try {
    const SC_SLUG     = 'selfcrops';
    const SC_EMAIL    = 'kavya@selfcrops.com';
    const SC_PASSWORD = 'SelfCrops@2024';

    let scOrg = await Organization.findOne({ slug: SC_SLUG });
    if (!scOrg) {
      scOrg = await Organization.create({
        name: 'SelfCrops', slug: SC_SLUG, domain: 'selfcrops.com',
        industry: 'Agriculture & AgriTech', size: '51-200', plan: 'pro', status: 'active',
        settings: {
          maxCandidates: 1000, maxJobs: 100, maxRecruiters: 10, maxAdmins: 3,
          features: ['jobs','candidates','pipeline','ai_match','assessments'],
        },
      });
      console.log('✅  SelfCrops org created → selfcrops.com');
    }
    const scOd       = scOrg.toJSON ? scOrg.toJSON() : scOrg;
    const scTenantId = scOd.id;

    // Admin: Kavya
    let kavya = await User.findOne({ email: SC_EMAIL });
    if (!kavya) {
      await User.create({
        name: 'Kavya', email: SC_EMAIL,
        passwordHash: bcrypt.hashSync(SC_PASSWORD, 10),
        role: 'admin', title: 'HR Admin — Agriculture',
        tenantId: scTenantId, orgId: scTenantId, orgName: scOd.name, isActive: true,
      });
      console.log(`✅  SelfCrops Admin Kavya created → ${SC_EMAIL} / ${SC_PASSWORD}`);
    } else {
      await User.findByIdAndUpdate(kavya._id, {
        $set: { passwordHash: bcrypt.hashSync(SC_PASSWORD, 10), tenantId: scTenantId, orgId: scTenantId, orgName: scOd.name, isActive: true },
      });
      console.log(`✅  SelfCrops Admin Kavya synced → ${SC_EMAIL}`);
    }

    const scAdminId = kavya ? (kavya._id) : (await User.findOne({ email: SC_EMAIL }).select('_id').lean())?._id;

    // 22 Agriculture & AgriTech jobs — upsert by slug, no duplicates
    const scJobDefs = [
      {
        title: 'Agronomist — Field Crops',
        department: 'Agriculture Science',
        skills: ['Agronomy', 'Crop Management', 'Soil Science', 'Pest Management', 'Field Research', 'Data Recording'],
        experience: '2–5 years',
        jobType: 'Full-Time',
        urgency: 'High',
        description: `SelfCrops is hiring an experienced Agronomist to support farmers across Andhra Pradesh with crop advisory, soil health management, and yield improvement strategies.

Key Responsibilities:
• Conduct field visits to assess crop health, soil conditions, and irrigation practices
• Advise farmers on crop variety selection, fertilizer application, and pest management
• Collect and record field data for precision agriculture models
• Coordinate with agri-input suppliers and government extension officers
• Prepare agronomy reports and crop performance summaries
• Train field agents on best agricultural practices`,
        requirements: `• B.Sc or M.Sc in Agronomy, Agriculture Science, or related field
• 2–5 years field experience in crop advisory
• Strong knowledge of Kharif and Rabi crop cycles in South India
• Experience with soil testing and fertilizer recommendation
• Two-wheeler license (field travel required)
• Telugu and English communication skills`,
        benefits: 'Competitive salary, field allowance, health insurance, two-wheeler fuel reimbursement, annual performance bonus.',
        externalUrl: 'https://www.naukri.com/agronomy-jobs-in-tirupati',
      },
      {
        title: 'Agri Sales Executive',
        department: 'Sales',
        skills: ['Agri Sales', 'Dealer Network', 'Crop Advisory', 'Target Achievement', 'B2B Sales', 'CRM'],
        experience: '1–3 years',
        jobType: 'Full-Time',
        urgency: 'High',
        description: `SelfCrops is looking for an Agri Sales Executive to drive on-ground sales of agricultural inputs — seeds, fertilizers, crop protection — to dealers, retailers, and farmers in the Tirupati region.

Key Responsibilities:
• Build and maintain a network of agri dealers and retailers across assigned territory
• Achieve monthly sales targets for seeds, fertilizers, and agri-chemicals
• Conduct farmer meetings and product demonstrations in villages
• Collect market intelligence on competitor products and pricing
• Handle order processing, collections, and customer grievances
• Report daily field activities via CRM`,
        requirements: `• B.Sc Agriculture or any graduate with agri sales experience
• 1–3 years in agri input sales (seeds, fertilizers, crop protection)
• Strong dealer relationship management skills
• Target-driven with willingness to travel extensively in rural areas
• Telugu proficiency essential; basic English for reporting`,
        benefits: 'Fixed salary + performance incentives + field allowance + health insurance.',
        externalUrl: 'https://www.naukri.com/agri-sales-jobs-in-tirupati',
      },
      {
        title: 'Agricultural Marketing Manager',
        department: 'Marketing',
        skills: ['Agri Marketing', 'Brand Management', 'Digital Marketing', 'Market Research', 'Campaign Management', 'Content Strategy'],
        experience: '4–7 years',
        jobType: 'Full-Time',
        urgency: 'Medium',
        description: `SelfCrops is seeking an Agricultural Marketing Manager to lead brand campaigns, farmer outreach programmes, and digital marketing for agri products across Andhra Pradesh and Telangana.

Key Responsibilities:
• Design and execute go-to-market strategies for new agri product launches
• Manage digital marketing — social media, WhatsApp campaigns, YouTube for farmers
• Plan and execute melas, kisan sammelans, and field day events
• Coordinate with agronomists for technical content creation
• Analyse market trends, competitor positioning, and farmer feedback
• Manage marketing budget and measure ROI per campaign`,
        requirements: `• MBA Marketing or B.Sc Agriculture + Marketing experience
• 4–7 years in agri marketing, agri-input brands, or agritech companies
• Strong understanding of farmer purchase behaviour in South India
• Experience with digital marketing tools and rural outreach programmes
• Excellent communication in Telugu and English`,
        benefits: 'Senior compensation, travel allowance, health coverage, learning budget, performance bonus.',
        externalUrl: 'https://www.linkedin.com/jobs/agri-marketing-jobs-tirupati',
      },
      {
        title: 'IoT Engineer — Smart Farming',
        department: 'Engineering',
        skills: ['IoT', 'Embedded Systems', 'Arduino', 'Raspberry Pi', 'MQTT', 'Python', 'Sensor Networks', 'Edge Computing'],
        experience: '2–4 years',
        jobType: 'Full-Time',
        urgency: 'High',
        description: `SelfCrops is building smart irrigation and crop monitoring systems. We need an IoT Engineer to design, deploy, and maintain sensor networks and automated control systems for precision farming.

Key Responsibilities:
• Design IoT sensor networks for soil moisture, temperature, humidity, and pest detection
• Program microcontrollers (Arduino, ESP32, Raspberry Pi) for farm automation
• Develop MQTT-based data pipelines from field sensors to the cloud
• Integrate IoT data with our precision agriculture dashboard
• Conduct field installations and farmer training on smart devices
• Troubleshoot hardware failures and software issues remotely and on-site`,
        requirements: `• B.E/B.Tech in Electronics, ECE, Computer Science, or related
• 2–4 years in IoT product development
• Proficiency in C/C++, Python, and MQTT protocols
• Hands-on with ESP32, Arduino, Raspberry Pi, and LoRa modules
• Experience with cloud platforms (AWS IoT, Azure IoT Hub) preferred
• Willingness to travel to rural farm sites for installation`,
        benefits: 'Competitive CTC, project bonus, health insurance, relocation support.',
        externalUrl: 'https://www.naukri.com/iot-engineer-agriculture-jobs',
      },
      {
        title: 'Data Scientist — Crop Analytics',
        department: 'Data Science',
        skills: ['Python', 'Machine Learning', 'Remote Sensing', 'GIS', 'Crop Yield Prediction', 'Data Visualization', 'SQL'],
        experience: '2–4 years',
        jobType: 'Full-Time',
        urgency: 'Medium',
        description: `SelfCrops is hiring a Data Scientist to build predictive models for crop yield forecasting, disease detection, and precision input recommendations using satellite imagery and field sensor data.

Key Responsibilities:
• Build and validate crop yield prediction models using ML/DL techniques
• Process and analyse multi-spectral satellite imagery for crop health assessment
• Develop disease and pest risk models integrated with weather data
• Create data pipelines for field sensor and drone data ingestion
• Build interactive dashboards for agronomists and farm managers
• Collaborate with agronomy teams to validate model recommendations`,
        requirements: `• B.Tech/M.Tech in Computer Science, Statistics, Data Science, or Agriculture Engineering
• 2–4 years in agricultural data science or geospatial analytics
• Proficiency in Python (pandas, scikit-learn, TensorFlow/PyTorch)
• Experience with GIS tools (QGIS, Google Earth Engine) and remote sensing
• Knowledge of agriculture domain — crop cycles, soil science — a strong plus`,
        benefits: 'Competitive salary, remote flexibility, research publication support, health insurance.',
        externalUrl: 'https://www.linkedin.com/jobs/data-scientist-agritech',
      },
      {
        title: 'Field Agricultural Officer',
        department: 'Field Operations',
        skills: ['Crop Advisory', 'Farmer Relations', 'Field Data Collection', 'Extension Services', 'Telugu', 'Documentation'],
        experience: '1–3 years',
        jobType: 'Full-Time',
        urgency: 'High',
        description: `SelfCrops is hiring Field Agricultural Officers to be the direct link between farmers and our platform — conducting field visits, collecting crop data, providing crop advisory, and onboarding farmers onto the SelfCrops digital system.

Key Responsibilities:
• Conduct daily village visits to enrolled and prospective farmer households
• Assess crop conditions and provide on-field advisory for pest, disease, and nutrition
• Onboard farmers to the SelfCrops mobile app and digital platform
• Collect geo-tagged field photos, crop data, and soil samples
• Coordinate input delivery and collection of crop produce
• Attend weekly team meetings and submit daily field reports`,
        requirements: `• B.Sc Agriculture or Diploma in Agriculture
• 1–3 years in any farm-related advisory or extension role
• Strong communication skills in Telugu
• Two-wheeler licence and own vehicle preferred
• Basic smartphone proficiency for field data entry
• Willingness to travel to remote villages in Tirupati district`,
        benefits: 'Fixed salary + field incentives + two-wheeler fuel + health insurance + training support.',
        externalUrl: 'https://www.naukri.com/field-agricultural-officer-jobs',
      },
      {
        title: 'Supply Chain Manager — Agriculture',
        department: 'Supply Chain & Logistics',
        skills: ['Agricultural Supply Chain', 'Cold Chain Management', 'Logistics', 'Vendor Management', 'Procurement', 'ERP'],
        experience: '5–8 years',
        jobType: 'Full-Time',
        urgency: 'Medium',
        description: `SelfCrops is hiring a Supply Chain Manager to oversee farm-to-market logistics, manage procurement from farmer-producer organisations (FPOs), and ensure quality control across the supply chain.

Key Responsibilities:
• Plan and manage end-to-end supply chain from farm procurement to retail/export delivery
• Build and maintain relationships with FPOs, mandis, cold storage facilities, and transporters
• Negotiate procurement prices with farmer groups and aggregators
• Implement quality control processes at procurement and packing centres
• Manage inventory, demand forecasting, and seasonal stock planning
• Coordinate with agro-processing units for value-added products`,
        requirements: `• MBA or B.E with 5–8 years in agri supply chain, food processing, or FMCG logistics
• Experience managing cold chain and perishable produce supply chains
• Strong vendor negotiation and relationship management skills
• Familiarity with ERP systems (SAP/Oracle/custom)
• Knowledge of export quality standards (APEDA, FSSAI) preferred`,
        benefits: 'Senior leadership compensation, health coverage, relocation assistance, performance bonus.',
        externalUrl: 'https://www.naukri.com/agri-supply-chain-jobs-tirupati',
      },
      {
        title: 'Precision Agriculture Specialist',
        department: 'Agriculture Technology',
        skills: ['Precision Agriculture', 'Variable Rate Technology', 'GPS/GNSS', 'Remote Sensing', 'Drone Operations', 'GIS', 'Soil Mapping'],
        experience: '3–6 years',
        jobType: 'Full-Time',
        urgency: 'Medium',
        description: `SelfCrops is seeking a Precision Agriculture Specialist to develop and implement site-specific crop management strategies using technology — drones, soil maps, variable rate application, and GPS-guided machinery.

Key Responsibilities:
• Design variable rate fertilizer and pesticide application programmes based on soil maps
• Operate and analyse drone imagery for canopy health, stress mapping, and weed detection
• Implement GPS-guided field operations and automate planting/harvesting guidance
• Create prescription maps for seed rate, fertilizer, and irrigation zones
• Train farmers and field agents on precision agriculture tools
• Analyse cost vs benefit of technology adoption and prepare ROI reports`,
        requirements: `• B.Sc/M.Sc Agriculture Engineering or Agronomy with precision ag certification
• 3–6 years in precision agriculture, farm management, or agri-tech
• Hands-on drone piloting certification (DGCA approved preferred)
• Proficiency in ArcGIS, QGIS, or similar GIS platforms
• Experience with Trimble, John Deere, or similar precision ag systems`,
        benefits: 'Competitive salary, drone operations allowance, training certifications, health insurance.',
        externalUrl: 'https://www.linkedin.com/jobs/precision-agriculture-india',
      },
      {
        title: 'Agri Business Development Executive',
        department: 'Business Development',
        skills: ['Business Development', 'FPO Partnerships', 'Institutional Sales', 'Agri Finance', 'Government Liaison', 'Negotiation'],
        experience: '3–5 years',
        jobType: 'Full-Time',
        urgency: 'High',
        description: `SelfCrops is hiring an Agri Business Development Executive to expand partnerships with FPOs (Farmer Producer Organisations), NABARD, government schemes, agri-banks, and institutional buyers for our platform.

Key Responsibilities:
• Identify and onboard new FPOs, cooperatives, and agri institutions as platform partners
• Develop relationships with NABARD, APEDA, and state agriculture department officials
• Negotiate tie-ups with institutional commodity buyers (processors, exporters, retailers)
• Lead presentations and proposals for government-funded agri programmes
• Coordinate with the product team to customise the platform for institutional clients
• Track business metrics: new partners added, revenue per partnership, renewal rate`,
        requirements: `• MBA or graduate with strong agri-business background
• 3–5 years in agri business development, FPO management, or institutional sales
• Understanding of NABARD schemes, PM-KISAN, and Andhra Pradesh agriculture programmes
• Strong network in the Tirupati/Rayalaseema agri ecosystem preferred
• Fluency in Telugu and English; willingness to travel`,
        benefits: 'Competitive salary + partnership bonus + health insurance + leadership track.',
        externalUrl: 'https://www.naukri.com/agri-business-development-jobs',
      },
      {
        title: 'Soil Health Specialist',
        department: 'Agriculture Science',
        skills: ['Soil Science', 'Soil Testing', 'Nutrient Management', 'Biofertilizers', 'Soil Carbon', 'Lab Analysis', 'Field Research'],
        experience: '2–5 years',
        jobType: 'Full-Time',
        urgency: 'Medium',
        description: `SelfCrops is looking for a Soil Health Specialist to lead soil testing operations, develop nutrient management plans, and promote sustainable soil health practices across our farmer network in Tirupati district.

Key Responsibilities:
• Conduct soil sampling, field testing, and laboratory analysis across enrolled farms
• Develop farm-specific nutrient management plans and fertilizer recommendations
• Promote biofertilizers, organic amendments, and soil health improvement practices
• Build and maintain a soil health database across the farmer network
• Collaborate with agronomists to integrate soil data into crop advisory
• Prepare reports on soil organic carbon, soil moisture, and macronutrient trends`,
        requirements: `• M.Sc Soil Science, Agriculture Chemistry, or related field
• 2–5 years in soil health management, soil testing laboratory, or agronomy
• Proficiency in laboratory soil analysis techniques (pH, EC, NPK, micronutrients)
• Strong understanding of Andhra Pradesh soil types and crop-soil interactions
• Experience with soil health card schemes (GOI) preferred`,
        benefits: 'Competitive salary, lab equipment support, research publications, health insurance.',
        externalUrl: 'https://www.naukri.com/soil-scientist-jobs-india',
      },
      {
        title: 'Drone Operations Engineer',
        department: 'AgriTech Operations',
        skills: ['Drone Operations', 'DGCA Certification', 'Multispectral Imaging', 'UAV Maintenance', 'Data Processing', 'GIS', 'GPS'],
        experience: '2–4 years',
        jobType: 'Full-Time',
        urgency: 'High',
        description: `SelfCrops operates a fleet of agricultural drones for crop monitoring, spraying, and precision mapping. We need a Drone Operations Engineer to fly, maintain, and process imagery from our UAV fleet across farms in Tirupati region.

Key Responsibilities:
• Operate fixed-wing and multi-rotor drones for crop monitoring and aerial spraying missions
• Plan and execute drone flights using AeroGCS, DJI Terra, or similar ground control software
• Process multispectral imagery to generate NDVI maps, field health indices, and prescription maps
• Perform routine drone maintenance, battery management, and pre-flight checks
• Train farmers on interpreting drone-generated reports
• Maintain flight logs, airspace compliance records, and DGCA documentation`,
        requirements: `• DGCA-approved Remote Pilot Certificate (Type 1 or Type 2)
• 2–4 years of commercial drone operations in agriculture or survey
• Experience with multispectral cameras (Micasense, Sentera, Parrot) a strong plus
• Proficiency in Pix4D, Agisoft Metashape, or DJI Terra for image processing
• Willingness to travel to field sites across Tirupati district and Rayalaseema`,
        benefits: 'Competitive salary + field allowance + DGCA renewal support + health insurance.',
        externalUrl: 'https://www.naukri.com/drone-pilot-agriculture-jobs',
      },
      {
        title: 'Agri Product Manager',
        department: 'Product',
        skills: ['Product Management', 'Agritech', 'User Research', 'Product Roadmap', 'Agile', 'Farmer UX', 'Data Analysis'],
        experience: '4–7 years',
        jobType: 'Full-Time',
        urgency: 'Medium',
        description: `SelfCrops is building the next generation of digital tools for farmers and agri-businesses. We need a Product Manager who understands the agriculture domain deeply and can translate farmer pain points into product features.

Key Responsibilities:
• Own the product roadmap for SelfCrops farmer app and web platform
• Conduct farmer interviews, field visits, and usability studies to drive product decisions
• Write detailed product requirement documents (PRDs) and user stories
• Collaborate with engineering, design, and agronomy teams on feature delivery
• Define success metrics and monitor product KPIs post-launch
• Prioritise the backlog based on farmer impact, business value, and technical feasibility`,
        requirements: `• MBA or B.Tech with 4–7 years in product management, preferably in agritech or rural tech
• Deep understanding of Indian farmer challenges, rural mobile usage patterns
• Experience with Agile/Scrum methodologies and product tools (Jira, Figma, Mixpanel)
• Strong analytical skills — ability to use data to make product decisions
• Telugu proficiency a strong advantage for farmer-facing product understanding`,
        benefits: 'Senior compensation, equity consideration, remote flexibility, health insurance.',
        externalUrl: 'https://www.linkedin.com/jobs/agritech-product-manager-india',
      },
      {
        title: 'Agricultural Software Developer',
        department: 'Engineering',
        skills: ['Python', 'Django', 'REST APIs', 'PostgreSQL', 'React', 'Agriculture Domain', 'GIS APIs', 'Mobile APIs'],
        experience: '2–4 years',
        jobType: 'Full-Time',
        urgency: 'High',
        description: `SelfCrops is building an end-to-end digital platform connecting farmers, agri-advisors, input suppliers, and buyers. We need a Software Developer to build and maintain the backend services and APIs that power our agricultural intelligence.

Key Responsibilities:
• Build and maintain REST APIs for farmer onboarding, crop advisory, and marketplace features
• Integrate with external data sources — weather APIs, satellite imagery, soil databases, price feeds
• Develop mobile-first web interfaces for farmer-facing features
• Build admin dashboards for agronomists and supply chain managers
• Implement geospatial features — farm boundary mapping, field analysis, route optimisation
• Write unit tests and maintain code quality through code reviews`,
        requirements: `• B.Tech in Computer Science, IT, or related field
• 2–4 years professional backend development in Python/Django or Node.js
• Experience with PostgreSQL/PostGIS and REST API design
• Basic GIS knowledge or willingness to learn geospatial programming
• Agriculture domain knowledge is a strong differentiator`,
        benefits: 'Competitive CTC, hybrid work, health insurance, learning budget, annual appraisal.',
        externalUrl: 'https://www.naukri.com/agritech-developer-jobs-india',
      },
      {
        title: 'Crop Disease & Pest Diagnostician',
        department: 'Agriculture Science',
        skills: ['Plant Pathology', 'Entomology', 'Crop Disease Diagnosis', 'Integrated Pest Management', 'Field Microscopy', 'Report Writing'],
        experience: '2–5 years',
        jobType: 'Full-Time',
        urgency: 'High',
        description: `SelfCrops provides real-time crop disease and pest advisory to farmers. We need a Crop Disease & Pest Diagnostician to identify, diagnose, and recommend solutions for crop health issues reported by our farmer network.

Key Responsibilities:
• Diagnose crop diseases and pest infestations from field photos, samples, and description reports
• Develop and maintain a digital crop disease library for AI-assisted diagnosis
• Provide timely, actionable advisory to farmers via the platform
• Conduct field validation visits for complex or repeated crop health issues
• Collaborate with the data science team to train AI disease detection models
• Prepare pest and disease alert bulletins for farmer communication`,
        requirements: `• M.Sc Plant Pathology, Entomology, or Agriculture with specialisation in crop protection
• 2–5 years field experience in crop disease diagnosis and IPM
• Strong knowledge of major crops in Andhra Pradesh — paddy, groundnut, chilli, tomato
• Experience with microscopy, disease identification keys, and field diagnostic kits
• Ability to write clear advisory content in Telugu and English`,
        benefits: 'Competitive salary, field research support, publication opportunities, health insurance.',
        externalUrl: 'https://www.naukri.com/plant-pathologist-jobs-india',
      },
      {
        title: 'Agri E-Commerce & Marketplace Executive',
        department: 'E-Commerce',
        skills: ['Agri E-Commerce', 'Marketplace Operations', 'Vendor Onboarding', 'Catalogue Management', 'Pricing Strategy', 'Digital Marketing'],
        experience: '2–4 years',
        jobType: 'Full-Time',
        urgency: 'Medium',
        description: `SelfCrops runs an online agri-input marketplace for farmers to purchase seeds, fertilizers, crop protection, and farm equipment at fair prices. We need an E-Commerce Executive to manage product listings, vendor partnerships, and marketplace operations.

Key Responsibilities:
• Onboard and manage agri-input suppliers and manufacturers on the SelfCrops marketplace
• Maintain accurate product catalogues — descriptions, pricing, stock levels, images
• Monitor competitive pricing and recommend pricing adjustments
• Coordinate with logistics teams for last-mile delivery to farmers
• Handle customer disputes, returns, and quality complaints
• Run promotional campaigns — seasonal discounts, bundle offers, flash sales`,
        requirements: `• Graduate with 2–4 years in e-commerce operations, agri retail, or marketplace management
• Understanding of agri-input products — seeds, fertilizers, agrochemicals, equipment
• Experience with marketplace tools (Unicommerce, Browntape, Fynd) preferred
• Strong vendor relationship and negotiation skills
• Proficiency in Telugu for farmer-facing communication`,
        benefits: 'Competitive salary, health insurance, performance bonus, annual increment.',
        externalUrl: 'https://www.naukri.com/agri-ecommerce-jobs',
      },
      {
        title: 'Agri Content Creator & Digital Marketer',
        department: 'Marketing',
        skills: ['Agriculture Content', 'Vernacular Content', 'Video Production', 'Social Media', 'YouTube', 'WhatsApp Marketing', 'Telugu Content'],
        experience: '1–3 years',
        jobType: 'Full-Time',
        urgency: 'Medium',
        description: `SelfCrops reaches farmers through digital content — YouTube videos, WhatsApp tips, social media posts, and vernacular infographics. We need an Agri Content Creator who understands farming and can create content farmers trust.

Key Responsibilities:
• Create Telugu-language videos, reels, and short-form content on crop tips, market prices, and scheme updates
• Write weekly agri advisory blogs, WhatsApp messages, and push notifications for the SelfCrops app
• Design infographics and visual explainers for farmers on soil health, pest management, and weather
• Manage SelfCrops YouTube channel, Instagram, and Facebook pages
• Coordinate with agronomists to translate technical content into farmer-friendly formats
• Track content performance — views, reach, engagement, app downloads from campaigns`,
        requirements: `• Graduate with 1–3 years in content creation, journalism, or agri communication
• Strong writing and video scripting skills in Telugu
• Basic video editing skills (CapCut, InShot, Adobe Premiere)
• Passion for agriculture and rural India
• Experience with farming community audiences on YouTube/WhatsApp a strong plus`,
        benefits: 'Competitive salary, content creation allowance, health insurance, creative freedom.',
        externalUrl: 'https://www.naukri.com/agri-content-creator-jobs',
      },
      {
        title: 'Farm Operations Manager',
        department: 'Operations',
        skills: ['Farm Management', 'Operations Planning', 'Labour Management', 'Harvest Planning', 'Cold Storage', 'Logistics', 'Quality Control'],
        experience: '4–7 years',
        jobType: 'Full-Time',
        urgency: 'Medium',
        description: `SelfCrops operates managed farms and farmer support centres in the Tirupati region. We need a Farm Operations Manager to oversee day-to-day farming operations, labour management, and farm-to-collection centre logistics.

Key Responsibilities:
• Plan and supervise all farm operations — land preparation, sowing, irrigation, fertilisation, harvest
• Manage labour teams including hiring, scheduling, productivity, and compliance
• Coordinate with input suppliers for timely delivery of seeds, fertilizers, and equipment
• Implement quality control at harvest — grading, packaging, and cold storage management
• Monitor crop progress against targets and flag risks to leadership
• Maintain farm records, production logs, and compliance documentation`,
        requirements: `• B.Sc Agriculture or B.Tech Agriculture Engineering with 4–7 years in farm management
• Hands-on experience managing large-scale farm operations (50+ acres)
• Knowledge of drip/sprinkler irrigation systems and mechanised farming
• Strong labour management skills — experience managing 50+ seasonal workers
• Proficiency in Telugu; experience in Andhra Pradesh farming ecosystem`,
        benefits: 'Senior compensation, on-site accommodation option, health insurance, annual bonus.',
        externalUrl: 'https://www.naukri.com/farm-operations-manager-jobs',
      },
      {
        title: 'Agri Finance & Credit Analyst',
        department: 'Finance',
        skills: ['Agricultural Finance', 'Credit Assessment', 'KCC Loans', 'NABARD Schemes', 'Financial Analysis', 'Risk Assessment', 'Excel'],
        experience: '2–5 years',
        jobType: 'Full-Time',
        urgency: 'Medium',
        description: `SelfCrops facilitates agricultural credit access for farmers through partnerships with banks, NBFCs, and NABARD. We need an Agri Finance Analyst to assess farmer credit profiles, connect them to schemes, and manage our agri-loan partnership operations.

Key Responsibilities:
• Assess farmer income, land holdings, crop history, and credit worthiness for input credit and loans
• Guide farmers through Kisan Credit Card (KCC), PM-KISAN, and crop insurance scheme enrollment
• Coordinate with bank partners and NBFCs for disbursement and collection
• Build and maintain a farmer credit database with repayment tracking
• Prepare credit risk reports and portfolio performance dashboards
• Identify farmers eligible for government subsidy programmes and facilitate applications`,
        requirements: `• MBA Finance, B.Com, or B.Sc Agriculture with banking/agri-finance experience
• 2–5 years in agricultural lending, microfinance, or rural banking (SFB/NBFC/cooperative bank)
• Knowledge of KCC, NABARD refinance products, PM-KISAN, and crop insurance schemes
• Strong Excel/data analysis skills for portfolio tracking
• Telugu proficiency for farmer-facing communication`,
        benefits: 'Competitive salary, performance incentives, health insurance, NABARD training support.',
        externalUrl: 'https://www.naukri.com/agri-finance-jobs-andhra-pradesh',
      },
      {
        title: 'Rural Sales Manager',
        department: 'Sales',
        skills: ['Rural Sales', 'Channel Management', 'Team Leadership', 'Agri Inputs', 'Route Planning', 'Performance Tracking', 'Territory Management'],
        experience: '5–8 years',
        jobType: 'Full-Time',
        urgency: 'High',
        description: `SelfCrops is expanding its rural distribution network across Tirupati, Chittoor, Kadapa, and Kurnool districts. We need a Rural Sales Manager to lead a team of field sales executives and build a market-leading distribution network.

Key Responsibilities:
• Recruit, train, and manage a team of 10–15 Agri Sales Executives across the territory
• Set and track monthly sales targets per executive and per product category
• Build and expand distributor, dealer, and retailer network in assigned geography
• Conduct regular market visits, beat plans, and competitor analysis
• Implement trade promotions, dealer incentive programmes, and farmer schemes
• Report weekly sales data, market feedback, and team performance to leadership`,
        requirements: `• B.Sc Agriculture or any graduate with 5–8 years in agri sales, seeds, or FMCG
• 2+ years in a team leadership or territory management role
• Strong dealer and distributor network in Tirupati/Chittoor/Kadapa region preferred
• Result-oriented with proven track record of achieving sales targets
• Own vehicle and Telugu language proficiency essential`,
        benefits: 'Fixed + variable compensation, vehicle allowance, health insurance, leadership development.',
        externalUrl: 'https://www.naukri.com/rural-sales-manager-agri-jobs',
      },
      {
        title: 'Vegetable & Horticulture Specialist',
        department: 'Agriculture Science',
        skills: ['Horticulture', 'Vegetable Cultivation', 'Protected Cultivation', 'Greenhouse', 'Post-Harvest Management', 'Quality Grading'],
        experience: '2–5 years',
        jobType: 'Full-Time',
        urgency: 'Medium',
        description: `SelfCrops works with vegetable growers across Tirupati's peri-urban and rural areas. We need a Horticulture Specialist to provide crop advisory, quality management, and market linkage for our vegetable farmer network.

Key Responsibilities:
• Provide crop-specific advisory for tomato, brinjal, leafy greens, gourds, and capsicum
• Guide farmers on protected cultivation — polyhouses, shade nets, and drip irrigation
• Implement post-harvest management practices — grading, packaging, cold chain handling
• Coordinate with buyers (mandis, retail chains, restaurant aggregators) on quality specifications
• Conduct crop health monitoring and respond to quality complaints from buyers
• Develop cropping calendars aligned with market demand and price seasonality`,
        requirements: `• B.Sc/M.Sc Horticulture or Agriculture with vegetable specialisation
• 2–5 years in vegetable extension services, agri-supply chain, or buyer-facing quality roles
• Understanding of Andhra Pradesh vegetable market — APMC, direct procurement, export
• Hands-on with protected cultivation and post-harvest technology
• Strong Telugu communication and ability to build farmer trust`,
        benefits: 'Competitive salary, field allowance, health insurance, performance bonus.',
        externalUrl: 'https://www.naukri.com/horticulture-specialist-jobs-india',
      },
      {
        title: 'Livestock & Dairy Farm Advisor',
        department: 'Animal Husbandry',
        skills: ['Livestock Management', 'Dairy Farming', 'Animal Nutrition', 'Veterinary Coordination', 'Breed Selection', 'Disease Prevention'],
        experience: '2–5 years',
        jobType: 'Full-Time',
        urgency: 'Medium',
        description: `SelfCrops is expanding into integrated farming with livestock and dairy as key components. We need a Livestock & Dairy Farm Advisor to support farmers managing cattle, goats, and poultry alongside crop farming in the Tirupati region.

Key Responsibilities:
• Advise farmers on breed selection, feeding management, and housing for dairy cattle and goats
• Implement vaccination schedules and disease prevention programmes in coordination with veterinarians
• Guide farmers on milk production optimisation, fodder crop cultivation, and feed formulation
• Coordinate with dairy procurement partners for farmer-direct milk collection routes
• Conduct training programmes on animal husbandry best practices
• Maintain livestock farm records — health logs, production data, and income tracking`,
        requirements: `• B.V.Sc, B.Sc Animal Husbandry, or B.Sc Agriculture (livestock specialisation)
• 2–5 years in livestock extension services, dairy advisory, or integrated farming
• Strong knowledge of HF/Jersey cattle breeds and goat farming in South India
• Telugu proficiency essential for farmer communication
• Willingness to travel to remote farms including early morning dairy routes`,
        benefits: 'Competitive salary, field allowance, veterinary support, health insurance.',
        externalUrl: 'https://www.naukri.com/livestock-dairy-advisor-jobs-india',
      },
      {
        title: 'Agri Logistics & Last-Mile Delivery Coordinator',
        department: 'Logistics',
        skills: ['Agri Logistics', 'Last-Mile Delivery', 'Route Optimisation', 'Cold Chain', 'Fleet Management', 'Vendor Coordination'],
        experience: '2–4 years',
        jobType: 'Full-Time',
        urgency: 'High',
        description: `SelfCrops delivers agri-inputs to farmers' doorsteps and collects produce from farm gates. We need a Logistics Coordinator to manage our last-mile delivery fleet, route planning, and village-level collection operations across Tirupati.

Key Responsibilities:
• Plan daily delivery and collection routes for efficient last-mile operations across assigned mandals
• Coordinate with 10–20 delivery partners, auto-rickshaws, and mini-trucks for daily operations
• Track delivery success rates, return rate, and damage-in-transit metrics
• Manage relationships with village-level entrepreneurs (VLEs) acting as collection points
• Handle input delivery escalations — delays, wrong deliveries, and damage claims
• Monitor cold chain integrity for perishable agri-input delivery (bio-pesticides, bio-fertilizers)`,
        requirements: `• Graduate with 2–4 years in logistics, delivery operations, or agri supply chain
• Experience managing field delivery teams in rural/semi-urban geographies
• Familiarity with route planning tools and delivery tracking apps
• Telugu language proficiency essential for village-level coordination
• Two-wheeler licence and willingness to do regular field visits`,
        benefits: 'Competitive salary, vehicle allowance, health insurance, performance-based incentives.',
        externalUrl: 'https://www.naukri.com/agri-logistics-coordinator-jobs',
      },
      // ── Extra: Store Manager & Sales Person (Agriculture) ──────────────────
      {
        title: 'Agri Store Manager',
        department: 'Retail & Store Operations',
        skills: ['Retail Management', 'Agri Input Sales', 'Inventory Management', 'Team Leadership', 'Customer Service', 'POS Systems', 'Stock Audit'],
        experience: '3–6 years',
        jobType: 'Full-Time',
        urgency: 'High',
        description: `SelfCrops is opening agri-input retail stores in Tirupati to serve local farmers with seeds, fertilizers, crop protection, farm tools, and advisory services. We need an Agri Store Manager to run daily store operations, manage a team of sales staff, and deliver an outstanding farmer service experience.

Key Responsibilities:
• Manage daily operations of the SelfCrops agri-input retail store
• Supervise and train a team of 4–6 store sales executives
• Maintain optimal stock levels — reorder, receive, verify, and shelve inventory
• Handle high-value product categories: seeds (paddy, groundnut, chilli), fertilizers, agrochemicals, farm tools
• Achieve monthly sales targets and upsell value-added products
• Build relationships with walk-in farmers — provide crop advisory alongside product sales
• Handle billing, cash management, daily sales reconciliation, and reports to management
• Coordinate with supply chain team on product availability and delivery timelines
• Ensure compliance with pesticide licensing and FSSAI norms for fertilizer retail`,
        requirements: `• B.Sc Agriculture or any graduate with agri retail experience
• 3–6 years in agri input retail, seeds company, or farm store management
• Hands-on experience managing store staff and inventory in an agri environment
• Strong knowledge of seeds, fertilizers, and crop protection products used in Andhra Pradesh
• Proficiency in Telugu for farmer-facing communication
• Basic computer skills — billing software, Excel, inventory management systems
• Pesticide dealer licence or willingness to obtain one`,
        benefits: 'Fixed salary + sales incentives + health insurance + annual increment + performance bonus.',
        externalUrl: 'https://www.naukri.com/agri-store-manager-jobs-tirupati',
      },
      {
        title: 'Agricultural Sales Person (Field)',
        department: 'Sales',
        skills: ['Agri Sales', 'Farmer Outreach', 'Product Demonstration', 'Lead Generation', 'Target Achievement', 'Rural Communication', 'Telugu'],
        experience: '0–2 years',
        jobType: 'Full-Time',
        urgency: 'High',
        description: `SelfCrops is hiring energetic and farmer-friendly Agricultural Sales Persons to sell agri-inputs — seeds, fertilizers, bio-pesticides, irrigation kits, and farm advisory services — directly to farmers in villages around Tirupati.

This is a field-first role. You will spend most of your day visiting farmers at their farms and homes — not sitting in an office. If you love agriculture, love talking to farmers, and are motivated by building relationships and meeting targets, this role is for you.

Key Responsibilities:
• Visit 15–20 farmers per day in assigned village routes (beats)
• Explain and demonstrate product benefits — seeds varieties, fertilizer schedules, crop protection options
• Generate leads through word-of-mouth referrals, farmer groups, and village meetings
• Achieve weekly and monthly sales targets for SelfCrops products
• Collect payments and coordinate order delivery with logistics team
• Report daily activities, sales made, and farmer feedback via mobile app
• Participate in kisan melas, field demonstrations, and crop days organised by SelfCrops
• Maintain a clean record of customer contacts and purchase history`,
        requirements: `• Minimum 12th pass; B.Sc Agriculture preferred but not mandatory
• 0–2 years of experience — freshers from agriculture background welcome
• Strong communication skills in Telugu — ability to connect naturally with farmers
• Own a two-wheeler and valid driving licence (mandatory for field travel)
• Genuine interest in agriculture and farmer welfare
• Result-oriented and self-motivated to meet targets`,
        benefits: 'Fixed salary + performance incentives + fuel reimbursement + health insurance + training + career growth path.',
        externalUrl: 'https://www.naukri.com/agri-sales-fresher-jobs-tirupati',
      },
    ];

    let scJobCount = 0;
    for (const j of scJobDefs) {
      const scSlug = `selfcrops-${j.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g,'-').replace(/^-|-$/g,'')}`;
      await Job.findOneAndUpdate(
        { tenantId: scTenantId, careerPageSlug: scSlug },
        {
          $set: {
            ...j,
            company:       'SelfCrops',
            companyName:   'SelfCrops',
            tenantId:      scTenantId,
            orgId:         scTenantId,
            careerPageSlug: scSlug,
            location:      'Tirupati',
            status:        'active',
            approvalStatus: 'approved',
            isPublic:      true,
            workMode:      'Onsite',
            salaryCurrency: 'INR',
            createdBy:     scAdminId,
          },
        },
        { upsert: true }
      );
      scJobCount++;
    }
    console.log(`✅  SelfCrops: ${scJobCount} agri/agritech jobs synced (Tirupati)`);
  } catch (scErr) {
    console.error('❌  SelfCrops seed failed (non-critical):', scErr.message);
  }

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
