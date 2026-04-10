'use strict';
/**
 * seedFresh.js — Complete platform wipe + reseed with production-quality Indian data.
 *
 * Usage:
 *   node backend/src/db/seedFresh.js
 *   (from project root)
 *
 * WARNING: This script drops all platform collections before seeding.
 * Never run against a live production database.
 *
 * Credentials printed at the end.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose  = require('mongoose');
const bcrypt    = require('bcryptjs');

// ── Model imports ──────────────────────────────────────────────────────────────
const Organization = require('../models/Organization');
const User         = require('../models/User');
const Job          = require('../models/Job');
const Candidate    = require('../models/Candidate');
const Application  = require('../models/Application');

// ── Helpers ────────────────────────────────────────────────────────────────────
const hash     = (pwd) => bcrypt.hashSync(pwd, 10);
const daysAgo  = (n)   => new Date(Date.now() - n * 86_400_000);
const daysFrom = (n)   => new Date(Date.now() + n * 86_400_000);

const VALID_STAGES = [
  'Applied', 'Screening', 'Shortlisted',
  'Interview Round 1', 'Interview Round 2',
  'Offer', 'Hired', 'Rejected',
];

// ── Passwords ──────────────────────────────────────────────────────────────────
const PWD_SUPER     = 'SuperAdmin@2024';
const PWD_ADMIN     = 'Admin@2024';
const PWD_RECRUITER = 'Recruiter@2024';
const PWD_CANDIDATE = 'Candidate@2024';

// ──────────────────────────────────────────────────────────────────────────────
async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌  MONGODB_URI is not set in backend/.env. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅  Connected to MongoDB');

  // ── 0. Drop stale unique indexes that can cause insert failures ──────────────
  for (const col of ['applications', 'invitetokens']) {
    try {
      const coll = mongoose.connection.collection(col);
      await coll.dropIndex('inviteToken_1');
      console.log(`🔧  Dropped stale inviteToken_1 index on ${col}`);
    } catch (_) { /* index not found — fine */ }
  }

  // ── 1. Drop all tenant-scoped collections ────────────────────────────────────
  console.log('\n🗑   Wiping collections...');
  const collectionsToDrop = [
    'applications', 'candidates', 'jobs', 'users',
    'organizations', 'notifications', 'auditlogs',
    'assessments', 'assessmentsubmissions', 'offerlettes',
    'offerletters', 'workflowrules', 'invitetokens', 'invites',
    'referrals', 'candidatenpses', 'jobalerts', 'usersessions',
    'refreshtokens', 'emailogs', 'emaillogs', 'whatsapplogs',
  ];
  for (const name of collectionsToDrop) {
    try {
      await mongoose.connection.collection(name).drop();
      console.log(`   ↳ Dropped: ${name}`);
    } catch (_) { /* collection may not exist yet */ }
  }
  console.log('✅  All collections wiped\n');

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Create Organisation
  // ──────────────────────────────────────────────────────────────────────────
  const org = await Organization.create({
    name    : 'TalentNest HR Solutions Pvt Ltd',
    slug    : 'talentnesthr',
    domain  : 'talentnesthr.com',
    website : 'https://talentnesthr.com',
    industry: 'Staffing & Recruitment',
    size    : '51-200',
    plan    : 'enterprise',
    status  : 'active',
    location: 'Plot No. 12, Hitech City, Madhapur, Hyderabad, Telangana 500081',
    settings: {
      maxCandidates : 99999,
      maxJobs       : 999,
      maxRecruiters : 99,
      maxAdmins     : 10,
      features      : [
        'jobs', 'candidates', 'pipeline', 'ai_match',
        'bulk_import', 'reports', 'assessments', 'api_access',
        'automation', 'custom_fields', 'screening_questions',
      ],
      dataVisibility       : 'org',
      candidateExportEnabled: true,
      aiScoringEnabled     : true,
      allowPublicJobs      : true,
      brandColor           : '#0F2B6B',
    },
  });
  const tenantId = org._id;
  console.log(`✅  Organisation → ${org.name} (${tenantId})`);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Super Admin
  // ──────────────────────────────────────────────────────────────────────────
  await User.create({
    name        : 'Sai Charan Rebel',
    email       : 'superadmin@talentnesthr.com',
    passwordHash: hash(PWD_SUPER),
    role        : 'super_admin',
    tenantId,
    orgId       : tenantId,
    orgName     : org.name,
    phone       : '9000000001',
    title       : 'Super Administrator',
    isActive    : true,
  });
  console.log(`✅  Super Admin → superadmin@talentnesthr.com`);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Admins
  // ──────────────────────────────────────────────────────────────────────────
  const adminDefs = [
    { name: 'Priya Sharma',  email: 'priya.sharma@talentnesthr.com',  phone: '9000000002', title: 'Operations Manager'  },
    { name: 'Vikram Nair',   email: 'vikram.nair@talentnesthr.com',   phone: '9000000003', title: 'HR Management Head'  },
  ];
  const admins = await Promise.all(adminDefs.map(a => User.create({
    ...a,
    passwordHash: hash(PWD_ADMIN),
    role        : 'admin',
    tenantId,
    orgId       : tenantId,
    orgName     : org.name,
    isActive    : true,
  })));
  console.log(`✅  Admins (${admins.length})`);

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Recruiters
  // ──────────────────────────────────────────────────────────────────────────
  const recruiterDefs = [
    { name: 'Ananya Krishnan', email: 'ananya.krishnan@talentnesthr.com', phone: '9100000001', title: 'IT - Full Stack Development' },
    { name: 'Rohit Mehta',     email: 'rohit.mehta@talentnesthr.com',     phone: '9100000002', title: 'IT - Java & Backend'          },
    { name: 'Deepika Patel',   email: 'deepika.patel@talentnesthr.com',   phone: '9100000003', title: 'IT - Frontend & React'        },
    { name: 'Suresh Babu',     email: 'suresh.babu@talentnesthr.com',     phone: '9100000004', title: 'IT - DevOps & Cloud'          },
    { name: 'Kavitha Rao',     email: 'kavitha.rao@talentnesthr.com',     phone: '9100000005', title: 'IT - Data Science & AI'       },
    { name: 'Arun Kumar',      email: 'arun.kumar@talentnesthr.com',      phone: '9100000006', title: 'Pharma - Quality & Compliance'},
    { name: 'Sneha Joshi',     email: 'sneha.joshi@talentnesthr.com',     phone: '9100000007', title: 'Pharma - Regulatory Affairs'  },
    { name: 'Manoj Tiwari',    email: 'manoj.tiwari@talentnesthr.com',    phone: '9100000008', title: 'BFSI & Fintech'               },
    { name: 'Lakshmi Devi',    email: 'lakshmi.devi@talentnesthr.com',    phone: '9100000009', title: 'Manufacturing & Engineering'  },
    { name: 'Kiran Reddy',     email: 'kiran.reddy@talentnesthr.com',     phone: '9100000010', title: 'IT - Mobile & React Native'   },
  ];
  const recruiters = await Promise.all(recruiterDefs.map(r => User.create({
    ...r,
    passwordHash: hash(PWD_RECRUITER),
    role        : 'recruiter',
    tenantId,
    orgId       : tenantId,
    orgName     : org.name,
    isActive    : true,
  })));
  console.log(`✅  Recruiters (${recruiters.length})`);

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Jobs
  // ──────────────────────────────────────────────────────────────────────────
  const jobDefs = [
    {
      title      : 'Senior React Developer',
      department : 'Engineering',
      location   : 'Hyderabad',
      jobType    : 'Full-Time',
      experience : '4-7 years',
      salaryMin  : 1500000,
      salaryMax  : 2200000,
      skills     : ['React', 'TypeScript', 'Redux', 'REST APIs', 'Git'],
      createdBy  : recruiters[0]._id,
      assignedRecruiters: [recruiters[0]._id],
      description: 'We are looking for an experienced Senior React Developer to join our growing engineering team. You will be responsible for building scalable, high-performance web applications using React and modern frontend technologies. You need 4+ years of professional experience.',
    },
    {
      title      : 'Java Full Stack Engineer',
      department : 'Engineering',
      location   : 'Bangalore',
      jobType    : 'Full-Time',
      experience : '5-8 years',
      salaryMin  : 1800000,
      salaryMax  : 2800000,
      skills     : ['Java', 'Spring Boot', 'React', 'MySQL', 'Microservices'],
      createdBy  : recruiters[1]._id,
      assignedRecruiters: [recruiters[1]._id],
      description: 'Join our engineering team as a Java Full Stack Engineer. You will design and build robust backend services using Spring Boot and microservices architecture. 5+ years of Java development experience required.',
    },
    {
      title      : 'DevOps Engineer',
      department : 'Infrastructure',
      location   : 'Remote',
      jobType    : 'Full-Time',
      experience : '4-8 years',
      salaryMin  : 2000000,
      salaryMax  : 3000000,
      skills     : ['AWS', 'Docker', 'Kubernetes', 'Jenkins', 'Terraform', 'Linux'],
      createdBy  : recruiters[3]._id,
      assignedRecruiters: [recruiters[3]._id],
      description: 'We need a hands-on DevOps Engineer to manage our cloud infrastructure and CI/CD pipelines. You should have 4+ years of experience with AWS and container orchestration using Kubernetes.',
    },
    {
      title      : 'Data Scientist',
      department : 'Analytics',
      location   : 'Hyderabad',
      jobType    : 'Full-Time',
      experience : '3-6 years',
      salaryMin  : 2200000,
      salaryMax  : 3500000,
      skills     : ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'Pandas', 'NumPy'],
      createdBy  : recruiters[4]._id,
      assignedRecruiters: [recruiters[4]._id],
      description: 'Join our analytics team to build predictive models and extract insights from large datasets. You need 3+ years of experience with Python machine learning frameworks.',
    },
    {
      title      : 'QA Automation Engineer',
      department : 'Quality Assurance',
      location   : 'Pune',
      jobType    : 'Full-Time',
      experience : '3-5 years',
      salaryMin  : 1200000,
      salaryMax  : 1800000,
      skills     : ['Selenium', 'Java', 'TestNG', 'JIRA', 'Postman', 'API Testing'],
      createdBy  : recruiters[2]._id,
      assignedRecruiters: [recruiters[2]._id],
      description: 'We are seeking a QA Automation Engineer to design and execute test suites across our platform. You should have 3+ years of experience with Selenium and Java-based test automation frameworks.',
    },
  ];

  const jobs = await Promise.all(jobDefs.map(j => Job.create({
    tenantId,
    title             : j.title,
    description       : j.description,
    skills            : j.skills,
    salaryMin         : j.salaryMin,
    salaryMax         : j.salaryMax,
    location          : j.location,
    jobType           : j.jobType,
    createdBy         : j.createdBy,
    assignedRecruiters: j.assignedRecruiters,
    status            : 'active',
    approvalStatus    : 'approved',
    numberOfOpenings  : 2,
    targetHireDate    : daysFrom(45),
  })));
  console.log(`✅  Jobs (${jobs.length})`);

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Candidates (Candidate records + User accounts)
  // ──────────────────────────────────────────────────────────────────────────
  const candidateDefs = [
    // ── 01 ──
    {
      name: 'Rahul Sharma',           email: 'rahul.sharma.dev@gmail.com',          phone: '9200000001',
      skills: ['React','JavaScript','Node.js','MongoDB','HTML','CSS'],              exp: 4,
      company: 'TCS',          role: 'Software Engineer',      location: 'Hyderabad',
      education: { institution: 'JNTU Hyderabad', degree: 'B.Tech', field: 'Computer Science', year: '2020' },
      summary: 'Full Stack Developer with 4 years of experience building React and Node.js applications at TCS.',
      noticePeriodDays: 30, willingToRelocate: true,
    },
    // ── 02 ──
    {
      name: 'Pooja Reddy',            email: 'pooja.reddy.dev@gmail.com',            phone: '9200000002',
      skills: ['Java','Spring Boot','MySQL','Hibernate','REST APIs'],               exp: 6,
      company: 'Infosys',      role: 'Senior Java Developer',  location: 'Bangalore',
      education: { institution: 'BITS Pilani', degree: 'B.Tech', field: 'Information Technology', year: '2018' },
      summary: 'Senior Java Developer specializing in Spring Boot microservices with 6 years of enterprise experience.',
      noticePeriodDays: 60, willingToRelocate: false,
    },
    // ── 03 ──
    {
      name: 'Arjun Singh',            email: 'arjun.singh.dev@gmail.com',            phone: '9200000003',
      skills: ['Python','Django','PostgreSQL','Docker','REST APIs'],                exp: 3,
      company: 'Wipro',        role: 'Software Developer',     location: 'Chennai',
      education: { institution: 'VIT Vellore', degree: 'B.Tech', field: 'CSE', year: '2021' },
      summary: 'Python backend developer with strong Django and PostgreSQL skills. 3 years at Wipro.',
      noticePeriodDays: 30, willingToRelocate: true,
    },
    // ── 04 ──
    {
      name: 'Meena Iyer',             email: 'meena.iyer.dev@gmail.com',             phone: '9200000004',
      skills: ['React Native','TypeScript','Redux','iOS','Android'],               exp: 5,
      company: 'HCL Technologies', role: 'Mobile Developer',  location: 'Pune',
      education: { institution: 'NIT Trichy', degree: 'B.Tech', field: 'ECE', year: '2019' },
      summary: 'Cross-platform mobile developer with 5 years expertise in React Native for iOS and Android.',
      noticePeriodDays: 45, willingToRelocate: true,
    },
    // ── 05 ──
    {
      name: 'Vivek Kumar',            email: 'vivek.kumar.devops@gmail.com',          phone: '9200000005',
      skills: ['AWS','Docker','Kubernetes','Terraform','Jenkins','Linux'],          exp: 7,
      company: 'Accenture',    role: 'Senior DevOps Engineer', location: 'Hyderabad',
      education: { institution: 'IIT Bombay', degree: 'B.Tech', field: 'CSE', year: '2017' },
      summary: 'Senior DevOps Engineer with 7 years designing cloud infrastructure on AWS using Kubernetes and Terraform.',
      noticePeriodDays: 60, willingToRelocate: false,
    },
    // ── 06 ──
    {
      name: 'Kaveri Nair',            email: 'kaveri.nair.data@gmail.com',            phone: '9200000006',
      skills: ['Python','Machine Learning','TensorFlow','Pandas','SQL','Tableau'], exp: 4,
      company: 'Capgemini',    role: 'Data Scientist',         location: 'Mumbai',
      education: { institution: 'University of Hyderabad', degree: 'M.Sc', field: 'Data Science', year: '2020' },
      summary: 'Data Scientist with 4 years experience building ML models using TensorFlow and Python at Capgemini.',
      noticePeriodDays: 30, willingToRelocate: true,
    },
    // ── 07 ──
    {
      name: 'Sanjay Patel',           email: 'sanjay.patel.net@gmail.com',            phone: '9200000007',
      skills: ['.NET','C#','Azure','ASP.NET','SQL Server','Angular'],              exp: 8,
      company: 'Cognizant',    role: '.NET Tech Lead',         location: 'Hyderabad',
      education: { institution: 'Pune University', degree: 'B.Tech', field: 'Information Technology', year: '2016' },
      summary: '.NET Tech Lead with 8 years of enterprise application development using C# and Azure cloud.',
      noticePeriodDays: 90, willingToRelocate: false,
    },
    // ── 08 ──
    {
      name: 'Divya Krishnan',         email: 'divya.krishnan.qa@gmail.com',           phone: '9200000008',
      skills: ['Selenium','Java','TestNG','Cucumber','JIRA','Postman'],            exp: 5,
      company: 'Tech Mahindra', role: 'QA Lead',               location: 'Bangalore',
      education: { institution: 'Manipal University', degree: 'B.Tech', field: 'CSE', year: '2019' },
      summary: 'QA Lead with 5 years of test automation experience using Selenium, Java, and Cucumber BDD.',
      noticePeriodDays: 30, willingToRelocate: true,
    },
    // ── 09 ──
    {
      name: 'Karan Mehta',            email: 'karan.mehta.fs@gmail.com',              phone: '9200000009',
      skills: ['MongoDB','Express','React','Node.js','GraphQL','TypeScript'],      exp: 3,
      company: 'Mphasis',      role: 'Full Stack Developer',   location: 'Pune',
      education: { institution: 'GGSIPU Delhi', degree: 'B.Tech', field: 'Information Technology', year: '2021' },
      summary: 'MERN stack developer with 3 years of experience building full-stack applications with GraphQL APIs.',
      noticePeriodDays: 30, willingToRelocate: true,
    },
    // ── 10 ──
    {
      name: 'Swathi Rao',             email: 'swathi.rao.fe@gmail.com',               phone: '9200000010',
      skills: ['React','Redux','GraphQL','Tailwind CSS','Next.js','JavaScript'],   exp: 4,
      company: 'Oracle India',  role: 'Frontend Developer',   location: 'Hyderabad',
      education: { institution: 'Osmania University', degree: 'B.Tech', field: 'CSE', year: '2020' },
      summary: 'Frontend specialist with 4 years building React and Next.js applications at Oracle India.',
      noticePeriodDays: 45, willingToRelocate: true,
    },
    // ── 11 ──
    {
      name: 'Nikhil Verma',           email: 'nikhil.verma.java@gmail.com',           phone: '9200000011',
      skills: ['Java','Spring Boot','Microservices','Docker','Kafka','MySQL'],     exp: 6,
      company: 'IBM India',    role: 'Senior Software Engineer',location: 'Bangalore',
      education: { institution: 'DTU Delhi', degree: 'B.Tech', field: 'CSE', year: '2018' },
      summary: 'Senior Java engineer with 6 years specializing in Spring Boot microservices and event-driven architecture with Kafka.',
      noticePeriodDays: 60, willingToRelocate: false,
    },
    // ── 12 ──
    {
      name: 'Preethi Menon',          email: 'preethi.menon.ang@gmail.com',           phone: '9200000012',
      skills: ['Angular','TypeScript','RxJS','SCSS','NgRx','REST APIs'],           exp: 5,
      company: 'SAP India',    role: 'Frontend Engineer',      location: 'Chennai',
      education: { institution: 'College of Engineering Pune', degree: 'B.Tech', field: 'Information Technology', year: '2019' },
      summary: 'Angular specialist with 5 years building enterprise-grade SPAs with NgRx state management at SAP India.',
      noticePeriodDays: 30, willingToRelocate: true,
    },
    // ── 13 ──
    {
      name: 'Varun Gupta',            email: 'varun.gupta.py@gmail.com',              phone: '9200000013',
      skills: ['Python','FastAPI','MongoDB','Redis','Docker','Celery'],             exp: 2,
      company: 'Freshworks',   role: 'Junior Backend Developer',location: 'Hyderabad',
      education: { institution: 'Amity University', degree: 'B.Tech', field: 'CSE', year: '2022' },
      summary: 'Junior backend developer with 2 years building Python FastAPI services with Redis caching at Freshworks.',
      noticePeriodDays: 15, willingToRelocate: true,
    },
    // ── 14 ──
    {
      name: 'Asha Pillai',            email: 'asha.pillai.ios@gmail.com',             phone: '9200000014',
      skills: ['Swift','iOS','Objective-C','Xcode','Firebase','REST APIs'],        exp: 7,
      company: 'Infosys BPM',  role: 'iOS Lead Developer',     location: 'Kochi',
      education: { institution: 'College of Engineering Trivandrum', degree: 'B.Tech', field: 'ECE', year: '2017' },
      summary: 'iOS Lead Developer with 7 years of Swift and Objective-C development. Expert in Firebase and Xcode toolchain.',
      noticePeriodDays: 90, willingToRelocate: false,
    },
    // ── 15 ──
    {
      name: 'Harish Reddy',           email: 'harish.reddy.and@gmail.com',            phone: '9200000015',
      skills: ['Android','Kotlin','Java','Firebase','Material Design','SQLite'],   exp: 4,
      company: 'Wipro Technologies', role: 'Android Developer', location: 'Hyderabad',
      education: { institution: 'JNTU Kakinada', degree: 'B.Tech', field: 'CSE', year: '2020' },
      summary: 'Android Developer with 4 years building Kotlin-first apps with Firebase real-time features at Wipro.',
      noticePeriodDays: 30, willingToRelocate: true,
    },
    // ── 16 ──
    {
      name: 'Anjali Sharma',          email: 'anjali.sharma.ba@gmail.com',            phone: '9200000016',
      skills: ['Business Analysis','JIRA','Agile','SQL','Power BI','Stakeholder Management'], exp: 6,
      company: 'Deloitte India', role: 'Senior Business Analyst', location: 'Gurgaon',
      education: { institution: 'Symbiosis Institute of Business Management', degree: 'MBA', field: 'Finance', year: '2018' },
      summary: 'Senior Business Analyst with 6 years bridging business stakeholders and engineering teams using Agile at Deloitte.',
      noticePeriodDays: 60, willingToRelocate: true,
    },
    // ── 17 ──
    {
      name: 'Sujata Bhattacharya',    email: 'sujata.bhattacharya.pm@gmail.com',      phone: '9200000017',
      skills: ['Product Management','Agile','Scrum','JIRA','Figma','Roadmapping'],exp: 5,
      company: 'Razorpay',     role: 'Product Manager',         location: 'Bangalore',
      education: { institution: 'IIM Calcutta', degree: 'MBA', field: 'Marketing', year: '2019' },
      summary: 'Product Manager with 5 years driving fintech product development at Razorpay. Expertise in Agile and product roadmapping.',
      noticePeriodDays: 45, willingToRelocate: true,
    },
    // ── 18 ──
    {
      name: 'Deepak Tiwari',          email: 'deepak.tiwari.arch@gmail.com',          phone: '9200000018',
      skills: ['Java','Microservices','AWS','Spring Cloud','Redis','PostgreSQL'],  exp: 9,
      company: 'Persistent Systems', role: 'Solution Architect', location: 'Pune',
      education: { institution: 'VNIT Nagpur', degree: 'B.Tech', field: 'Computer Science', year: '2015' },
      summary: 'Solution Architect with 9 years designing distributed systems on AWS using Java microservices and Spring Cloud.',
      noticePeriodDays: 60, willingToRelocate: false,
    },
    // ── 19 ──
    {
      name: 'Roshni Kapoor',          email: 'roshni.kapoor.ui@gmail.com',            phone: '9200000019',
      skills: ['Figma','Adobe XD','User Research','Prototyping','Design Systems','Sketch'], exp: 4,
      company: 'Swiggy',       role: 'Senior UX Designer',      location: 'Bangalore',
      education: { institution: 'National Institute of Design Ahmedabad', degree: 'B.Des', field: 'UX Design', year: '2020' },
      summary: 'Senior UX Designer with 4 years crafting user-centred product experiences at Swiggy using Figma design systems.',
      noticePeriodDays: 30, willingToRelocate: true,
    },
    // ── 20 ──
    {
      name: 'Naveen Reddy',           email: 'naveen.reddy.dl@gmail.com',             phone: '9200000020',
      skills: ['Python','Deep Learning','PyTorch','NLP','Computer Vision','BERT'], exp: 5,
      company: 'NVIDIA India',  role: 'Deep Learning Engineer', location: 'Hyderabad',
      education: { institution: 'IIT Hyderabad', degree: 'M.Tech', field: 'Artificial Intelligence', year: '2019' },
      summary: 'Deep Learning Engineer with 5 years building NLP and Computer Vision models using PyTorch at NVIDIA India.',
      noticePeriodDays: 90, willingToRelocate: false,
    },
    // ── 21 ──
    {
      name: 'Pallavi Srivastava',     email: 'pallavi.srivastava.ops@gmail.com',      phone: '9200000021',
      skills: ['Operations Management','Six Sigma','Process Improvement','Excel','ERP','SAP'], exp: 7,
      company: 'Amazon India',  role: 'Operations Lead',        location: 'Mumbai',
      education: { institution: 'IIT Kharagpur', degree: 'B.Tech', field: 'Industrial Engineering', year: '2017' },
      summary: 'Operations Lead with 7 years at Amazon India, specializing in Six Sigma process improvements and ERP implementation.',
      noticePeriodDays: 60, willingToRelocate: true,
    },
    // ── 22 ──
    {
      name: 'Sandeep Nambiar',        email: 'sandeep.nambiar.ms@gmail.com',          phone: '9200000022',
      skills: ['Go','gRPC','Kubernetes','Docker','Microservices','PostgreSQL'],    exp: 6,
      company: 'Flipkart',     role: 'Backend Engineer',        location: 'Bangalore',
      education: { institution: 'NITK Surathkal', degree: 'B.Tech', field: 'CSE', year: '2018' },
      summary: 'Backend Engineer at Flipkart with 6 years building high-throughput microservices in Go with gRPC and Kubernetes.',
      noticePeriodDays: 30, willingToRelocate: true,
    },
    // ── 23 ──
    {
      name: 'Anitha Krishnakumar',    email: 'anitha.krishnakumar.sec@gmail.com',     phone: '9200000023',
      skills: ['Cybersecurity','Penetration Testing','OWASP','SIEM','ISO 27001','Python'], exp: 8,
      company: 'PwC India',    role: 'Security Consultant',     location: 'Chennai',
      education: { institution: 'Anna University', degree: 'B.E', field: 'Computer Science', year: '2016' },
      summary: 'Security Consultant with 8 years conducting penetration testing and implementing OWASP/ISO 27001 compliance at PwC.',
      noticePeriodDays: 60, willingToRelocate: false,
    },
    // ── 24 ──
    {
      name: 'Pranav Joshi',           email: 'pranav.joshi.ml@gmail.com',             phone: '9200000024',
      skills: ['Python','scikit-learn','XGBoost','Feature Engineering','SQL','Tableau'], exp: 3,
      company: 'Mu Sigma',     role: 'Machine Learning Engineer',location: 'Bangalore',
      education: { institution: 'NIT Karnataka', degree: 'B.Tech', field: 'Computer Science', year: '2021' },
      summary: 'ML Engineer with 3 years building predictive analytics solutions using scikit-learn and XGBoost at Mu Sigma.',
      noticePeriodDays: 15, willingToRelocate: true,
    },
    // ── 25 ──
    {
      name: 'Gayatri Rajan',          email: 'gayatri.rajan.qa@gmail.com',            phone: '9200000025',
      skills: ['Selenium','Cypress','Jest','API Testing','Postman','JIRA'],        exp: 4,
      company: 'Hexaware',     role: 'QA Engineer',             location: 'Pune',
      education: { institution: 'Savitribai Phule Pune University', degree: 'B.E', field: 'Information Technology', year: '2020' },
      summary: 'QA Engineer with 4 years automating test suites using Selenium and Cypress at Hexaware Technologies.',
      noticePeriodDays: 30, willingToRelocate: true,
    },
    // ── 26 ──
    {
      name: 'Vinay Kumar',            email: 'vinay.kumar.mob@gmail.com',             phone: '9200000026',
      skills: ['React Native','Flutter','Dart','iOS','Android','Firebase'],        exp: 5,
      company: 'Paytm',        role: 'Senior Mobile Developer', location: 'Noida',
      education: { institution: 'Amity University Noida', degree: 'B.Tech', field: 'CSE', year: '2019' },
      summary: 'Senior Mobile Developer at Paytm with 5 years expertise in React Native and Flutter for fintech applications.',
      noticePeriodDays: 45, willingToRelocate: true,
    },
    // ── 27 ──
    {
      name: 'Rashmi Shetty',          email: 'rashmi.shetty.ba@gmail.com',            phone: '9200000027',
      skills: ['Business Architecture','TOGAF','Enterprise Architecture','Visio','ArchiMate','BPMN'], exp: 10,
      company: 'Infosys Consulting', role: 'Principal Business Architect', location: 'Bangalore',
      education: { institution: 'Manipal Institute of Technology', degree: 'B.Tech', field: 'Computer Science', year: '2014' },
      summary: 'Principal Business Architect with 10 years designing enterprise architecture using TOGAF and ArchiMate at Infosys Consulting.',
      noticePeriodDays: 90, willingToRelocate: false,
    },
    // ── 28 ──
    {
      name: 'Sudhir Pandey',          email: 'sudhir.pandey.dba@gmail.com',           phone: '9200000028',
      skills: ['Oracle DBA','MySQL','PostgreSQL','Performance Tuning','Backup & Recovery','RMAN'], exp: 8,
      company: 'Wipro',        role: 'Senior DBA',              location: 'Hyderabad',
      education: { institution: 'BHU Varanasi', degree: 'B.Tech', field: 'Computer Science', year: '2016' },
      summary: 'Senior DBA with 8 years managing Oracle and PostgreSQL production databases, specializing in performance tuning at Wipro.',
      noticePeriodDays: 60, willingToRelocate: true,
    },
    // ── 29 ──
    {
      name: 'Nandini Bose',           email: 'nandini.bose.hr@gmail.com',             phone: '9200000029',
      skills: ['HR Strategy','Talent Acquisition','HRIS','Compensation & Benefits','Employee Relations','OD'], exp: 9,
      company: 'Tata Consultancy Services', role: 'HR Business Partner', location: 'Kolkata',
      education: { institution: 'XLRI Jamshedpur', degree: 'MBA', field: 'Human Resources', year: '2015' },
      summary: 'Experienced HR Business Partner with 9 years driving talent strategy and organizational development at TCS.',
      noticePeriodDays: 90, willingToRelocate: false,
    },
    // ── 30 ──
    {
      name: 'Aditya Sharma',          email: 'aditya.sharma.fp@gmail.com',            phone: '9200000030',
      skills: ['React','Node.js','TypeScript','GraphQL','PostgreSQL','Redis'],     exp: 5,
      company: 'Zomato',       role: 'Full Stack Engineer',     location: 'Gurgaon',
      education: { institution: 'NSIT Delhi', degree: 'B.Tech', field: 'Information Technology', year: '2019' },
      summary: 'Full Stack Engineer at Zomato with 5 years building React + Node.js applications with GraphQL APIs and PostgreSQL.',
      noticePeriodDays: 30, willingToRelocate: true,
    },
  ];

  // Create Candidate records + User accounts in parallel batches
  const candidates = [];
  const candUsers  = [];
  for (const cd of candidateDefs) {
    const candidate = await Candidate.create({
      tenantId,
      name    : cd.name,
      email   : cd.email,
      phone   : cd.phone,
      location: cd.location,
      noticePeriodDays : cd.noticePeriodDays,
      willingToRelocate: cd.willingToRelocate,
      source  : 'manual',
      parsedProfile: {
        skills              : cd.skills,
        totalExperienceYears: cd.exp,
        experience          : [{
          company    : cd.company,
          role       : cd.role,
          startDate  : `${2024 - cd.exp}-01`,
          endDate    : 'Present',
          description: cd.summary,
        }],
        education: [cd.education],
      },
      tags: cd.skills.slice(0, 3),
    });
    candidates.push(candidate);

    const user = await User.create({
      name        : cd.name,
      email       : cd.email,
      phone       : cd.phone,
      passwordHash: hash(PWD_CANDIDATE),
      role        : 'candidate',
      tenantId,
      orgId       : tenantId,
      orgName     : org.name,
      title       : cd.role,
      location    : cd.location,
      skills      : cd.skills,
      summary     : cd.summary,
      isActive    : true,
    });
    candUsers.push(user);
  }
  console.log(`✅  Candidates (${candidates.length}) + User accounts (${candUsers.length})`);

  // ──────────────────────────────────────────────────────────────────────────
  // 8. Applications — distribute 30 candidates across 5 jobs across all stages
  // ──────────────────────────────────────────────────────────────────────────
  // Each candidate applies to 1-2 jobs, spread across pipeline stages.
  const stageDistribution = [
    // [jobIndex, candidateIndices, stage]
    // Job 0: Senior React Developer
    [0,  0,  'Applied'],
    [0,  1,  'Screening'],
    [0,  2,  'Shortlisted'],
    [0,  3,  'Interview Round 1'],
    [0,  4,  'Interview Round 2'],
    [0,  5,  'Offer'],
    [0,  6,  'Hired'],
    [0,  7,  'Rejected'],
    [0,  8,  'Applied'],
    [0,  9,  'Screening'],
    // Job 1: Java Full Stack Engineer
    [1,  10, 'Applied'],
    [1,  11, 'Screening'],
    [1,  12, 'Shortlisted'],
    [1,  13, 'Interview Round 1'],
    [1,  14, 'Interview Round 2'],
    [1,  15, 'Offer'],
    [1,  16, 'Hired'],
    [1,  17, 'Rejected'],
    [1,  18, 'Applied'],
    [1,  19, 'Screening'],
    // Job 2: DevOps Engineer
    [2,  20, 'Applied'],
    [2,  21, 'Screening'],
    [2,  22, 'Shortlisted'],
    [2,  23, 'Interview Round 1'],
    [2,   4, 'Applied'],   // Vivek Kumar also applied for DevOps
    [2,   5, 'Screening'],
    // Job 3: Data Scientist
    [3,  24, 'Applied'],
    [3,  25, 'Screening'],
    [3,  26, 'Shortlisted'],
    [3,  27, 'Interview Round 1'],
    [3,  28, 'Applied'],
    [3,   6, 'Shortlisted'], // Kaveri Nair also applied for Data Scientist
    // Job 4: QA Automation Engineer
    [4,  29, 'Applied'],
    [4,   7, 'Screening'],  // Divya Krishnan also applied
    [4,  24, 'Shortlisted'],
    [4,   8, 'Interview Round 1'],
  ];

  const applications = [];
  for (const [jobIdx, candIdx, stage] of stageDistribution) {
    const job  = jobs[jobIdx];
    const cand = candidates[candIdx];

    // Build stageHistory up to current stage
    const stageIndex  = VALID_STAGES.indexOf(stage);
    const stageHistory = VALID_STAGES.slice(0, stageIndex + 1).map((s, i) => ({
      stage  : s,
      movedBy: (job.assignedRecruiters && job.assignedRecruiters[0]) || recruiters[0]._id,
      movedAt: daysAgo((stageIndex - i) * 3 + Math.floor(Math.random() * 3)),
      notes  : i === 0 ? 'Applied via platform' : `Moved to ${s}`,
    }));

    const appStatus =
      stage === 'Hired'    ? 'hired' :
      stage === 'Rejected' ? 'rejected' : 'active';

    try {
      const app = await Application.create({
        tenantId,
        jobId        : job._id,
        candidateId  : cand._id,
        currentStage : stage,
        stageHistory,
        status       : appStatus,
        aiMatchScore : Math.floor(55 + Math.random() * 40),
        matchBreakdown: {
          skillScore      : Math.floor(50 + Math.random() * 50),
          experienceScore : Math.floor(50 + Math.random() * 50),
          locationScore   : Math.floor(40 + Math.random() * 60),
          noticeScore     : 100,
        },
        screeningAnswers: [],
      });
      applications.push(app);

      // Update application count on job
      await Job.findByIdAndUpdate(job._id, { $inc: { applicationCount: 1 } });
      if (stage === 'Hired') {
        await Job.findByIdAndUpdate(job._id, { $inc: { hiredCount: 1 } });
      }
    } catch (err) {
      // Skip duplicate applications (same candidate + same job)
      if (err.code !== 11000) console.warn(`   ⚠️  Application skipped: ${err.message}`);
    }
  }
  console.log(`✅  Applications (${applications.length}) across ${jobs.length} jobs`);

  // ──────────────────────────────────────────────────────────────────────────
  // 9. Print credentials summary
  // ──────────────────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║            TalentNest HR — Fresh Seed Complete                   ║
╠══════════════════════════════════════════════════════════════════╣
║  Organisation: TalentNest HR Solutions Pvt Ltd                   ║
║  Domain      : talentnesthr.com                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  SUPER ADMIN                                                     ║
║  Email    : superadmin@talentnesthr.com                          ║
║  Password : ${PWD_SUPER.padEnd(46)}║
╠══════════════════════════════════════════════════════════════════╣
║  ADMINS (password: ${PWD_ADMIN})                              ║
║  priya.sharma@talentnesthr.com  → Priya Sharma                  ║
║  vikram.nair@talentnesthr.com   → Vikram Nair                   ║
╠══════════════════════════════════════════════════════════════════╣
║  RECRUITERS (password: ${PWD_RECRUITER})                    ║
║  ananya.krishnan@talentnesthr.com → Ananya Krishnan              ║
║  rohit.mehta@talentnesthr.com     → Rohit Mehta                  ║
║  deepika.patel@talentnesthr.com   → Deepika Patel                ║
║  suresh.babu@talentnesthr.com     → Suresh Babu                  ║
║  kavitha.rao@talentnesthr.com     → Kavitha Rao                  ║
║  arun.kumar@talentnesthr.com      → Arun Kumar                   ║
║  sneha.joshi@talentnesthr.com     → Sneha Joshi                  ║
║  manoj.tiwari@talentnesthr.com    → Manoj Tiwari                 ║
║  lakshmi.devi@talentnesthr.com    → Lakshmi Devi                 ║
║  kiran.reddy@talentnesthr.com     → Kiran Reddy                  ║
╠══════════════════════════════════════════════════════════════════╣
║  CANDIDATES (password: ${PWD_CANDIDATE})                    ║
║  30 candidates — rahul.sharma.dev@gmail.com … aditya.sharma.fp  ║
╠══════════════════════════════════════════════════════════════════╣
║  JOBS SEEDED                                                     ║
║  1. Senior React Developer    (Hyderabad)                        ║
║  2. Java Full Stack Engineer  (Bangalore)                        ║
║  3. DevOps Engineer           (Remote)                           ║
║  4. Data Scientist            (Hyderabad)                        ║
║  5. QA Automation Engineer    (Pune)                             ║
╠══════════════════════════════════════════════════════════════════╣
║  PIPELINE: ${String(applications.length).padEnd(3)} applications across all 8 stages               ║
╚══════════════════════════════════════════════════════════════════╝
`);

  await mongoose.disconnect();
  console.log('✅  MongoDB disconnected. Seed complete.');
  process.exit(0);
}

// ── Run ────────────────────────────────────────────────────────────────────────
seed().catch(err => {
  console.error('❌  Seed failed:', err.message || err);
  mongoose.disconnect().catch(() => {});
  process.exit(1);
});
