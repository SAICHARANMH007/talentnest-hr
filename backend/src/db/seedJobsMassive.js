'use strict';
/**
 * seedJobsMassive.js
 * Generates all 2000+ Junior + Senior job variants across 53 categories.
 * Called from seed.js after the TalentNest HR org is created.
 *
 * SEO-optimised: every job has a canonical careerPageSlug, isPublic=true,
 * status=active, and a real external URL (LinkedIn/Naukri/Indeed search)
 * so Google for Jobs, NaukriBot, IndeedBot can index them immediately.
 */

const LOCATIONS = [
  'Delhi NCR', 'Bangalore', 'Mumbai', 'Kolkata',
  'Hyderabad', 'Pune', 'Chennai', 'Noida',
  'Gurgaon', 'Ahmedabad', 'Bhubaneswar', 'Kochi',
];

const COMPANIES = [
  'TCS', 'Infosys', 'Wipro', 'HCL Technologies', 'Tech Mahindra',
  'Accenture India', 'Cognizant', 'Capgemini', 'IBM India', 'SAP India',
  'Deloitte India', 'PwC India', 'EY India', 'KPMG India', 'BCG India',
  'McKinsey India', 'Bain India', 'HDFC Bank', 'ICICI Bank', 'Kotak Mahindra',
  'Axis Bank', 'SBI', 'Yes Bank', 'Bajaj Finserv', 'Reliance Industries',
  'TATA Group', 'Mahindra & Mahindra', 'Larsen & Toubro', 'Godrej Industries',
  'Birla Group', 'Flipkart', 'Amazon India', 'Swiggy', 'Zomato', 'Meesho',
  'PhonePe', 'Paytm', 'CRED', 'Razorpay', 'Freshworks',
  'Zepto', 'Nykaa', 'Urban Company', 'OYO Hotels', 'Ola', 'Byju\'s',
  'Apollo Hospitals', 'Fortis Healthcare', 'Manipal Health', 'Max Healthcare',
  'Sun Pharmaceutical', 'Dr Reddy\'s', 'Cipla', 'Biocon', 'Lupin',
  'ONGC', 'Coal India', 'Adani Group', 'Vedanta', 'JSW Steel',
  'Infra.Market', 'DLF', 'Prestige Estates', 'Godrej Properties',
  'Taj Hotels', 'ITC Hotels', 'Marriott India', 'MakeMyTrip',
  'GMR Group', 'IndiGo Airlines', 'Air India', 'Blue Dart', 'Delhivery',
  'Ecom Express', 'Maersk India', 'Siemens India', 'ABB India', 'Bosch India',
  'Hero MotoCorp', 'Bajaj Auto', 'TVS Motor', 'Maruti Suzuki', 'Hyundai India',
  'ISRO', 'HAL', 'DRDO', 'Tata Advanced Systems', 'Bharat Electronics',
  'ICICI Prudential', 'HDFC Life', 'Star Health', 'Bajaj Allianz', 'LIC',
  'Myntra', 'Ajio', 'BigBasket', 'JioMart', 'Licious',
];

// External URLs: real LinkedIn/Naukri/Indeed search URLs by category keyword
function extUrl(keyword, board = 'linkedin') {
  const kw = encodeURIComponent(keyword);
  if (board === 'naukri')  return `https://www.naukri.com/${keyword.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-jobs`;
  if (board === 'indeed')  return `https://in.indeed.com/jobs?q=${kw}&l=India`;
  if (board === 'glassdoor') return `https://www.glassdoor.co.in/Jobs/${keyword.replace(/\s+/g,'-')}-jobs-SRCH_KO0,${keyword.length}.htm`;
  return `https://www.linkedin.com/jobs/search/?keywords=${kw}&location=India`;
}

// Job description template
function desc(title, category, company, seniority) {
  const lvl = seniority === 'senior' ? 'senior-level' : 'entry-level';
  return `${company} is hiring a ${lvl} ${title} to join its ${category} team. The role involves end-to-end ownership of key projects, cross-functional collaboration, and delivering high-impact results aligned with business goals. Candidates should bring strong domain knowledge, excellent communication skills, and a drive to grow within a dynamic, fast-paced environment. This is a full-time opportunity with competitive compensation and career development support.`;
}

/**
 * CATEGORIES — each has: department, skills (5), salaryJr, salarySnr, urlKeyword, board
 *
 * Salary in INR per annum (min, max) for junior and senior.
 * Junior = 0-3 years, Senior = 6+ years.
 */
const CATEGORIES = [
  // ── Technology ────────────────────────────────────────────────────────────
  {
    cat: 'Software Development',        dept: 'Engineering',
    skills: ['JavaScript','React','Node.js','REST APIs','Git'],
    jrSal: [400000,700000],  snrSal: [1500000,3000000],
    url: 'full-stack-developer', board: 'naukri',
    titles: ['Full-Stack Developer','Frontend Engineer','Backend Engineer','Mobile App Developer',
             'API Architect','Embedded Systems Engineer','Game Developer','Systems Architect',
             'QA Engineer','Site Reliability Engineer','Low-Code Developer','Desktop Application Developer',
             'Cross-Platform Developer','Compiler Engineer','Firmware Engineer','Cloud-Native Developer',
             'Middleware Specialist','Distributed Systems Engineer','Mainframe Modernization Specialist','AR/VR Software Engineer'],
  },
  {
    cat: 'Artificial Intelligence',    dept: 'AI & Machine Learning',
    skills: ['Python','TensorFlow','PyTorch','NLP','MLflow'],
    jrSal: [600000,1000000], snrSal: [2000000,4500000],
    url: 'artificial-intelligence-engineer', board: 'linkedin',
    titles: ['AI Research Engineer','Prompt Engineer','MLOps Engineer','AI Ethicist','LLM Specialist',
             'Agentic Engineer','Computer Vision Specialist','AI Lead','Chief AI Officer','AI Solutions Architect',
             'AI Security Specialist','AI Data Governance Manager','Conversational AI Designer','GEO Strategist',
             'AI Content Strategist','AI Enablement Lead','AI Agent Architect','Neural Network Architect',
             'AI Literacy Coach','Deep Learning Researcher','AI Product Manager'],
  },
  {
    cat: 'Data & Analytics',           dept: 'Data Science',
    skills: ['Python','SQL','Tableau','Spark','Power BI'],
    jrSal: [500000,900000],  snrSal: [1800000,3500000],
    url: 'data-scientist', board: 'naukri',
    titles: ['Data Scientist','Data Architect','Big Data Engineer','BI Analyst','Data Storyteller',
             'Data Privacy Officer','Analytics Translator','Data Literacy Officer','Predictive Analytics Specialist',
             'Data Engineer','Clinical Data Scientist','Data Governance Lead','Metadata Manager',
             'Database Administrator','Quantitative Analyst','Machine Learning Scientist','Research Data Scientist',
             'Spatial Data Analyst','CDP Manager','Analytics Engineer'],
  },
  {
    cat: 'Cybersecurity',              dept: 'Information Security',
    skills: ['Penetration Testing','SIEM','OWASP','Firewalls','Threat Modelling'],
    jrSal: [500000,900000],  snrSal: [1800000,4000000],
    url: 'cybersecurity-analyst', board: 'linkedin',
    titles: ['Ethical Hacker','SOC Analyst','Cryptographer','Incident Response Manager','Cybersecurity GRC Specialist',
             'CISO','Cloud Security Engineer','Application Security Specialist','Digital Forensics Investigator',
             'Threat Intelligence Analyst','IAM Specialist','Network Security Engineer','IoT Security Specialist',
             'Blockchain Security Auditor','DevSecOps Engineer','Security Compliance Auditor',
             'Vulnerability Management Lead','Cyber Risk Analyst','ICS Security Engineer','Zero Trust Architect'],
  },
  {
    cat: 'Cloud & DevOps',             dept: 'Platform Engineering',
    skills: ['AWS','Kubernetes','Terraform','CI/CD','Docker'],
    jrSal: [500000,900000],  snrSal: [1800000,3800000],
    url: 'devops-engineer', board: 'naukri',
    titles: ['DevOps Engineer','Cloud Architect','Site Reliability Engineer','Infrastructure Engineer',
             'Solution Architect','Platform Engineer','Cloud Operations Manager','Cloud Security Architect',
             'FinOps Specialist','Multi-Cloud Orchestration Lead','Kubernetes Administrator',
             'Cloud Migration Consultant','IaC Specialist','Edge Computing Architect',
             'Serverless Architecture Expert','Cloud Network Engineer','Hybrid Cloud Strategist',
             'Disaster Recovery Specialist','Virtualization Engineer','Cloud Compliance Manager'],
  },
  {
    cat: 'Emerging Technology',        dept: 'Innovation Lab',
    skills: ['Blockchain','Solidity','IoT','AR/VR','Quantum Computing'],
    jrSal: [500000,900000],  snrSal: [2000000,4000000],
    url: 'emerging-technology-engineer', board: 'indeed',
    titles: ['Quantum Computing Scientist','Blockchain Developer','AR/VR Experience Designer',
             'IoT Solutions Architect','Quantum Algorithms Researcher','Web3 Product Manager',
             'Metaverse Architect','Digital Twin Specialist','BCI Designer',
             'RPA Developer','Nanotechnology Engineer','Synthetic Biology Engineer',
             'Smart Contract Auditor','NFT Strategist','5G Network Architect',
             'Wearable Tech Designer','Holographic Display Technician','Autonomous Systems Engineer',
             'Edge AI Specialist','Decentralized Identity Expert'],
  },
  // ── Life Sciences & Healthcare ────────────────────────────────────────────
  {
    cat: 'Medical Practice',           dept: 'Clinical Operations',
    skills: ['Clinical Diagnosis','Patient Management','EMR Systems','Medical Protocols','Surgery'],
    jrSal: [600000,1200000], snrSal: [2500000,6000000],
    url: 'doctor-physician', board: 'naukri',
    titles: ['Surgeon','General Physician','Psychiatrist','Radiologist','Anesthesiologist',
             'Dermatologist','Pathologist','Cardiologist','Endocrinologist','Oncologist',
             'Geriatrician','Emergency Medicine Specialist','Rheumatologist','Nephrologist',
             'Pulmonologist','Gastroenterologist','Infectious Disease Specialist',
             'Palliative Care Physician','Occupational Health Specialist','Sports Medicine Physician','Clinical Immunologist'],
  },
  {
    cat: 'Pharma & Biotech',           dept: 'Research & Development',
    skills: ['Clinical Trials','Regulatory Affairs','GMP','Bioinformatics','Pharmacovigilance'],
    jrSal: [400000,700000],  snrSal: [1500000,3500000],
    url: 'pharma-research', board: 'naukri',
    titles: ['Regulatory Affairs Manager','Pharmacovigilance Specialist','Clinical Research Associate',
             'Formulation Scientist','Biostatistician','Bioinformatics Scientist','Medical Science Liaison',
             'HEOR Specialist','Bioprocess Engineer','QC Microbiologist','R&D Scientist',
             'Medical Writer','Clinical Trial Manager','Drug Safety Officer','Analytical Chemist',
             'Genomics Researcher','Proteomics Specialist','CMC Lead','Process Validation Engineer','Tech Transfer Specialist'],
  },
  {
    cat: 'Healthcare Support',         dept: 'Patient Care',
    skills: ['Patient Care','Medical Equipment','EMR','Clinical Procedures','Healthcare Protocols'],
    jrSal: [300000,500000],  snrSal: [700000,1500000],
    url: 'healthcare-support-jobs', board: 'naukri',
    titles: ['Registered Nurse','Telehealth Coordinator','Physical Therapist','Medical Lab Technician',
             'Radiologic Technologist','Phlebotomist','Physician Assistant','Nurse Practitioner',
             'Occupational Therapy Assistant','Clinical Research Coordinator','Community Health Worker',
             'Healthcare Administrator','Home Health Aide','Dental Hygienist','Surgical Technologist',
             'EMT','Medical Scribe','Patient Care Coordinator','Medical Assistant','Pharmacy Technician'],
  },
  {
    cat: 'Specialized Care',           dept: 'Specialized Medicine',
    skills: ['Counseling','Therapeutic Techniques','Patient Psychology','Assessment Tools','Care Planning'],
    jrSal: [350000,600000],  snrSal: [800000,1800000],
    url: 'specialized-healthcare', board: 'indeed',
    titles: ['Genetic Counselor','Geriatric Care Manager','Mental Health Counselor','Nutritionist',
             'Speech-Language Pathologist','Art Therapist','Music Therapist','Behavioral Health Technician',
             'Substance Abuse Counselor','Hospice Manager','Child Life Specialist','Respiratory Therapist',
             'Audiologist','Vision Rehabilitation Specialist','Perinatal Consultant','Memory Care Director',
             'Neuropsychologist','Dialysis Technician','Grief Counselor','Developmental Disability Specialist'],
  },
  // ── Manufacturing & Engineering ───────────────────────────────────────────
  {
    cat: 'Core Engineering',           dept: 'Engineering',
    skills: ['AutoCAD','SolidWorks','MATLAB','FEA','Project Management'],
    jrSal: [350000,600000],  snrSal: [1200000,2500000],
    url: 'engineer-jobs-india', board: 'naukri',
    titles: ['Mechanical Engineer','Electrical Engineer','Civil Engineer','Industrial Engineer',
             'Structural Engineer','Chemical Engineer','Materials Science Engineer','Environmental Engineer',
             'Geotechnical Engineer','Aerospace Engineer','Nuclear Engineer','Biomedical Engineer',
             'Petroleum Engineer','Marine Engineer','Agricultural Engineer','Systems Engineer',
             'Reliability Engineer','Mechatronics Engineer','Photonics Engineer','Acoustic Engineer'],
  },
  {
    cat: 'Manufacturing',              dept: 'Production',
    skills: ['Lean Manufacturing','Six Sigma','ERP','Production Planning','Quality Control'],
    jrSal: [300000,550000],  snrSal: [1000000,2200000],
    url: 'manufacturing-jobs', board: 'naukri',
    titles: ['Production Manager','QA Inspector','Lean Manufacturing Consultant','CNC Machinist',
             'Assembly Line Supervisor','Manufacturing Engineer','Operations Manager','Process Improvement Engineer',
             'Plant Manager','Supply Chain Manufacturing Lead','Industrial Designer','Robotics Technician',
             'Safety Manager','Inventory Controller','Tool and Die Maker','Production Planner',
             'Maintenance Manager','Digital Twin Manufacturing Specialist','Smart Factory Architect','3D Printing Engineer'],
  },
  {
    cat: 'Automotive',                 dept: 'Automotive Engineering',
    skills: ['MATLAB/Simulink','CAN Bus','AUTOSAR','Battery Management','ADAS'],
    jrSal: [400000,700000],  snrSal: [1500000,3000000],
    url: 'automotive-engineer', board: 'naukri',
    titles: ['EV Design Engineer','BMS Engineer','Autonomous Vehicle Systems Engineer','Service Technician',
             'Battery Chemist','Powertrain Engineer','Automotive Embedded Software Developer',
             'ADAS Engineer','Vehicle Safety Engineer','Telematics Specialist',
             'Charging Infrastructure Planner','Automotive Interior Designer','NVH Engineer',
             'Fleet Electrification Manager','Connected Car Product Manager','Automotive Cybersecurity Expert',
             'Test Track Driver','Homologation Engineer','Automotive PCB Layout Designer','Chassis Systems Engineer'],
  },
  {
    cat: 'Aerospace',                  dept: 'Aerospace Engineering',
    skills: ['CATIA','Structural Analysis','Avionics','Flight Dynamics','DO-178C'],
    jrSal: [450000,800000],  snrSal: [1500000,3500000],
    url: 'aerospace-engineer', board: 'linkedin',
    titles: ['Aerospace Engineer','Avionics Technician','Satellite Operations Specialist','Propulsion Engineer',
             'Flight Controls Engineer','Aircraft Maintenance Engineer','Spacecraft Systems Architect',
             'Payload Integration Engineer','Aerospace Structures Engineer','Orbital Mechanics Specialist',
             'Space Traffic Manager','Drone Operations Pilot','Aviation Safety Inspector',
             'Aerospace Materials Scientist','Avionics Software Engineer','Rocket Engine Designer',
             'Satellite Image Analyst','Space Policy Advisor','Mission Control Controller','Aerospace Quality Auditor'],
  },
  // ── Finance ───────────────────────────────────────────────────────────────
  {
    cat: 'Banking',                    dept: 'Banking & Finance',
    skills: ['Financial Analysis','Credit Risk','Regulatory Compliance','Excel','CRM'],
    jrSal: [350000,650000],  snrSal: [1500000,4000000],
    url: 'banking-finance-jobs', board: 'naukri',
    titles: ['Investment Banker','Corporate Banker','Relationship Manager','Underwriter','Credit Analyst',
             'Compliance Manager','Commercial Lender','Mortgage Loan Officer','Private Banker','Branch Manager',
             'AML Officer','Treasury Analyst','Trade Finance Specialist','Retail Banking Head',
             'Financial Crime Investigator','KYC Analyst','Wealth Manager','Correspondent Banker',
             'Syndicated Loan Specialist','Digital Banking Product Lead'],
  },
  {
    cat: 'Accounting & Audit',         dept: 'Finance & Accounts',
    skills: ['Tally/SAP','IFRS','Tax Planning','Internal Audit','Financial Reporting'],
    jrSal: [300000,550000],  snrSal: [1200000,2800000],
    url: 'accountant-auditor-jobs', board: 'naukri',
    titles: ['Chartered Accountant','Internal Auditor','Forensic Accountant','Tax Consultant','Controller',
             'Management Accountant','Financial Auditor','Cost Accountant','Fixed Asset Manager',
             'Accounts Payable Manager','Payroll Specialist','Financial Reporting Manager',
             'External Auditor','Government Accountant','Non-profit Accountant','Environmental Accountant',
             'IFRS Compliance Lead','Consolidation Manager','Budget Analyst','Audit Associate'],
  },
  {
    cat: 'FinTech & Wealth',           dept: 'Investments & Trading',
    skills: ['Financial Modelling','Risk Management','Python','Bloomberg','Portfolio Management'],
    jrSal: [400000,800000],  snrSal: [2000000,6000000],
    url: 'fintech-analyst', board: 'linkedin',
    titles: ['Portfolio Manager','Actuary','Risk Manager','Financial Planner','Crypto Assets Analyst',
             'Stock Broker','Algorithmic Trader','Quantitative Analyst','Robo-Advisory Specialist',
             'InsurTech Product Manager','Blockchain Finance Developer','Private Equity Associate',
             'Venture Capitalist','ESG Investment Analyst','Derivatives Trader',
             'Hedge Fund Manager','Family Office Manager','Retirement Planning Specialist',
             'Digital Wallet Operations Lead','Open Banking API Strategist'],
  },
  // ── Sales & Marketing ─────────────────────────────────────────────────────
  {
    cat: 'Marketing',                  dept: 'Marketing',
    skills: ['Google Analytics','SEO','Content Strategy','CRM','Social Media Marketing'],
    jrSal: [300000,550000],  snrSal: [1200000,2800000],
    url: 'marketing-digital-jobs', board: 'naukri',
    titles: ['SEO/SEM Specialist','Performance Marketer','Content Strategist','Brand Manager',
             'Product Marketer','Influencer Marketing Manager','Growth Hacker','Marketing Analytics Manager',
             'CRM Specialist','Digital Strategist','Email Marketing Lead','Marketing Automation Specialist',
             'Creative Strategist','Customer Insights Manager','Global Marketing Director',
             'E-commerce Marketing Manager','Event Marketer','Video Marketing Specialist',
             'Affiliate Manager','Community Manager'],
  },
  {
    cat: 'Sales',                      dept: 'Sales',
    skills: ['Salesforce','Pipeline Management','B2B Sales','Negotiation','CRM'],
    jrSal: [300000,600000],  snrSal: [1200000,3000000],
    url: 'sales-manager-jobs', board: 'naukri',
    titles: ['Business Development Manager','Account Executive','Channel Sales Manager',
             'SDR','Partnership Manager','Sales Operations Manager','Solutions Consultant',
             'Enterprise Account Manager','Sales Enablement Lead','Inside Sales Representative',
             'Field Sales Executive','National Sales Director','Customer Success Manager',
             'Pre-Sales Engineer','Regional Sales Manager','Key Account Manager',
             'Sales Trainer','Territory Manager','Retail Sales Associate','Direct Sales Representative'],
  },
  {
    cat: 'Creative & Advertising',     dept: 'Creative',
    skills: ['Adobe Creative Suite','Copywriting','Brand Identity','UX Writing','Video Production'],
    jrSal: [300000,550000],  snrSal: [1000000,2500000],
    url: 'creative-advertising-jobs', board: 'indeed',
    titles: ['Copywriter','Creative Director','Art Director','Media Buyer','PR Manager',
             'Graphic Designer','UX Writer','Content Creator','Social Media Manager',
             'Advertising Strategist','Media Planner','Publicity Coordinator',
             'Brand Identity Designer','Scriptwriter','Video Producer','Sound Designer',
             'Digital Ad Operations Specialist','Account Planner','User Researcher','Visual Storyteller'],
  },
  // ── Human Resources ───────────────────────────────────────────────────────
  {
    cat: 'Talent Acquisition',         dept: 'Human Resources',
    skills: ['ATS','Sourcing','LinkedIn Recruiter','Talent Mapping','Employer Branding'],
    jrSal: [300000,550000],  snrSal: [1200000,2500000],
    url: 'talent-acquisition-recruiter', board: 'naukri',
    titles: ['Technical Recruiter','Executive Search Consultant','Talent Acquisition Lead',
             'Campus Recruiter','Talent Sourcing Specialist','Recruitment Marketing Manager',
             'Diversity Recruiter','Employer Brand Specialist','Talent Analyst','Contract Recruiter',
             'Head of Talent','Candidate Experience Manager','Interview Coordinator',
             'Recruitment Operations Lead','Onboarding Specialist','Talent Pipelines Architect',
             'Global Sourcing Lead','RPO Manager','Skill Gap Analyst','Internal Mobility Coordinator'],
  },
  {
    cat: 'HR Generalist',              dept: 'Human Resources',
    skills: ['HRIS','Employee Relations','Compensation & Benefits','Compliance','People Analytics'],
    jrSal: [300000,550000],  snrSal: [1200000,3000000],
    url: 'hr-manager-jobs', board: 'naukri',
    titles: ['HR Business Partner','Employee Engagement Manager','Compensation & Benefits Specialist',
             'DEI Manager','CHRO','HR Operations Manager','Employee Relations Specialist',
             'Payroll Manager','HRIS Specialist','Total Rewards Director','People Analytics Lead',
             'Culture Officer','Benefits Administrator','HR Compliance Manager',
             'Workplace Experience Manager','Labor Relations Specialist','Conflict Resolution Mediator',
             'HR Coordinator','Global HR Manager','People Data Scientist'],
  },
  {
    cat: 'Learning & Development',     dept: 'Learning & Development',
    skills: ['Instructional Design','LMS','eLearning','Training Delivery','Content Development'],
    jrSal: [280000,500000],  snrSal: [900000,2000000],
    url: 'learning-development-trainer', board: 'indeed',
    titles: ['L&D Coach','Instructional Designer','Corporate Trainer','E-learning Developer',
             'Leadership Development Specialist','Performance Management Consultant','Vocational Trainer',
             'Talent Development Lead','Sales Trainer','Technical Trainer',
             'Instructional Content Creator','Learning Experience Designer','Skills Transformation Coach',
             'Training Coordinator','Educational Psychologist','Career Pathing Specialist',
             'On-the-Job Training Supervisor','Webinar Producer','LMS Administrator','Executive Coach'],
  },
  // ── Energy & Sustainability ───────────────────────────────────────────────
  {
    cat: 'Renewable Energy',           dept: 'Energy',
    skills: ['Solar PV Design','Wind Energy','SCADA','Grid Systems','AutoCAD Electrical'],
    jrSal: [350000,600000],  snrSal: [1200000,2800000],
    url: 'renewable-energy-engineer', board: 'linkedin',
    titles: ['Solar Engineer','Wind Energy Engineer','Grid Modernization Specialist','Energy Auditor',
             'Battery Storage Specialist','Bioenergy Specialist','Hydroelectric Power Engineer',
             'Geothermal Energy Technician','Renewable Energy Project Manager','Solar Sales Consultant',
             'Wind Turbine Technician','Offshore Wind Specialist','PV Designer',
             'Energy Storage Systems Engineer','Grid Stability Analyst','Clean Tech Consultant',
             'Hydrogen Fuel Cell Researcher','Renewable Energy Policy Analyst','Smart Grid Architect',
             'DER Lead','Energy Procurement Manager'],
  },
  {
    cat: 'Sustainability',             dept: 'ESG & Sustainability',
    skills: ['ESG Reporting','Carbon Accounting','LCA','Sustainability Frameworks','GRI/TCFD'],
    jrSal: [350000,600000],  snrSal: [1200000,3000000],
    url: 'sustainability-esg-jobs', board: 'linkedin',
    titles: ['Chief Sustainability Officer','ESG Reporting Manager','Circular Economy Specialist',
             'Carbon Emissions Manager','Sustainability Data Analyst','Climate Risk Analyst',
             'Supply Chain Sustainability Lead','Corporate Responsibility Manager','Zero Waste Coordinator',
             'Sustainable Sourcing Specialist','Carbon Sequestration Engineer','Carbon Accounting Auditor',
             'Green Building Consultant','Sustainable Finance Analyst','Impact Investment Associate',
             'Biodiversity Specialist','LCA Specialist','Net Zero Strategist',
             'ESG Auditor','Sustainability Communications Manager'],
  },
  {
    cat: 'Environmental Science',      dept: 'Environment',
    skills: ['EIA','Environmental Monitoring','GIS','Field Research','Regulatory Compliance'],
    jrSal: [300000,550000],  snrSal: [1000000,2500000],
    url: 'environmental-consultant', board: 'indeed',
    titles: ['Environmental Consultant','Hydrologist','Ecologist','Marine Biologist',
             'Waste Management Engineer','EIA Lead','Conservation Scientist','Soil Health Microbiologist',
             'Air Quality Specialist','Remediation Engineer','Wildlife Biologist','Forestry Manager',
             'Toxicologist','Oceanographer','Hazardous Waste Manager','Environmental Compliance Officer',
             'Water Resource Planner','Climate Change Adaptation Specialist','Parks Director','Urban Ecologist'],
  },
  // ── Education & EdTech ─────────────────────────────────────────────────────
  {
    cat: 'Academia & Education',       dept: 'Academic',
    skills: ['Curriculum Development','Research Methods','Academic Writing','Student Assessment','LMS'],
    jrSal: [280000,500000],  snrSal: [800000,2000000],
    url: 'teacher-professor-jobs', board: 'naukri',
    titles: ['University Professor','School Teacher','Academic Researcher','Librarian','School Principal',
             'Department Chair','Academic Dean','Admissions Counselor','Registrar',
             'Education Policy Analyst','Grant Writer','Special Education Teacher',
             'ESL Instructor','Curriculum Developer','Student Affairs Director',
             'Career Services Manager','Alumni Relations Officer','Research Assistant',
             'Faculty Development Lead','Academic Editor'],
  },
  {
    cat: 'EdTech & Digital Learning',  dept: 'Product & Content',
    skills: ['EdTech Platforms','Instructional Design','Video Production','Analytics','UX Design'],
    jrSal: [300000,550000],  snrSal: [1000000,2500000],
    url: 'edtech-product-manager', board: 'linkedin',
    titles: ['Instructional Content Creator','Learning Experience Designer','Online Tutor',
             'EdTech Product Manager','Instructional Technologist','Virtual Classroom Coordinator',
             'Educational App Developer','Learning Analytics Specialist','Digital Literacy Coach',
             'EdTech Sales Representative','Content QA Specialist','VR Education Designer',
             'Micro-learning Specialist','Adaptive Learning Strategist','Educational Game Designer',
             'MOOC Producer','Distance Learning Coordinator','Digital Textbook Author',
             'EdTech Implementation Specialist','AI-Tutor Developer'],
  },
  // ── Legal & Governance ────────────────────────────────────────────────────
  {
    cat: 'Legal',                      dept: 'Legal & Compliance',
    skills: ['Contract Law','Litigation','Legal Research','Compliance','Negotiation'],
    jrSal: [350000,650000],  snrSal: [1500000,4000000],
    url: 'lawyer-legal-jobs', board: 'naukri',
    titles: ['Corporate Lawyer','Litigation Attorney','IP Lawyer','Paralegal','Judge',
             'Company Secretary','Contract Manager','Legal Counsel','Criminal Defense Attorney',
             'Real Estate Attorney','Family Lawyer','Tax Attorney','Employment Lawyer',
             'Legal Operations Manager','Court Clerk','Mediator','Legal Secretary',
             'Compliance Attorney','Patent Agent','Law Librarian'],
  },
  {
    cat: 'Governance & Policy',        dept: 'Policy & Government Affairs',
    skills: ['Policy Analysis','Stakeholder Engagement','Research','Regulatory Affairs','Public Affairs'],
    jrSal: [300000,550000],  snrSal: [1200000,3000000],
    url: 'policy-analyst-government', board: 'indeed',
    titles: ['Policy Analyst','Public Affairs Specialist','Regulatory Compliance Officer',
             'Legislative Assistant','Government Relations Manager','Public Policy Researcher',
             'Lobbyist','Urban Policy Planner','International Relations Specialist',
             'Political Consultant','Grant Administrator','Ethics Officer',
             'Public Information Officer','Civic Technologist','Census Analyst',
             'Election Official','National Security Analyst','Social Policy Advisor',
             'Diplomat','Think Tank Researcher'],
  },
  // ── Logistics & Supply Chain ──────────────────────────────────────────────
  {
    cat: 'Supply Chain & Logistics',   dept: 'Supply Chain',
    skills: ['SAP SCM','Demand Planning','Procurement','Logistics Coordination','Inventory Management'],
    jrSal: [300000,550000],  snrSal: [1200000,2800000],
    url: 'supply-chain-logistics', board: 'naukri',
    titles: ['Logistics Manager','Procurement Specialist','Inventory Planner','Supply Chain Analyst',
             'Import/Export Coordinator','Demand Planner','Strategic Sourcing Manager',
             'Supply Chain Systems Lead','Vendor Manager','Warehouse Operations Manager',
             'Category Manager','Supply Chain Risk Manager','Global Trade Compliance Specialist',
             'Distribution Center Manager','Materials Manager','Production Planner',
             'SIOP Manager','Logistics Data Scientist','3PL Account Manager','Supply Chain Sustainability Coordinator'],
  },
  {
    cat: 'Aviation',                   dept: 'Aviation Operations',
    skills: ['Aviation Regulations','Safety Management','Air Traffic Procedures','Aircraft Systems','DGCA'],
    jrSal: [350000,700000],  snrSal: [1500000,4000000],
    url: 'aviation-pilot-atc-jobs', board: 'naukri',
    titles: ['Commercial Pilot','Air Traffic Controller','Flight Attendant','Ground Handling Supervisor',
             'Aircraft Maintenance Engineer','Flight Operations Manager','Aviation Safety Inspector',
             'Avionics Technician','Airport Director','Ground Operations Lead',
             'Flight Dispatcher','Airline Catering Manager','Cargo Operations Specialist',
             'Passenger Service Agent','Aviation Security Specialist','Flight School Instructor',
             'Drone Pilot','Aerospace Quality Auditor','Revenue Management Analyst','Aviation Maintenance Planner'],
  },
  {
    cat: 'Shipping & Maritime',        dept: 'Maritime Operations',
    skills: ['SOLAS','IMO Regulations','Port Operations','Marine Engineering','Navigation'],
    jrSal: [350000,700000],  snrSal: [1200000,3000000],
    url: 'shipping-maritime-jobs', board: 'indeed',
    titles: ['Merchant Navy Officer','Port Manager','Freight Forwarder','Marine Superintendent',
             'Customs Broker','Ship Broker','Marine Engineer','Harbor Master',
             'Shipping Operations Coordinator','Maritime Lawyer','Bunker Trader',
             'Chartering Manager','Vessel Traffic Controller','Marine Surveyor',
             'Logistics Coordinator Maritime','Port Engineer','Container Terminal Manager',
             'Stevedore Superintendent','Naval Architect','Maritime Safety Officer'],
  },
  // ── Creative Arts & Media ─────────────────────────────────────────────────
  {
    cat: 'Visual Arts & Design',       dept: 'Design',
    skills: ['Figma','Adobe Creative Suite','UI/UX Design','Typography','Brand Design'],
    jrSal: [300000,550000],  snrSal: [1000000,2500000],
    url: 'graphic-ux-designer-jobs', board: 'naukri',
    titles: ['UX/UI Designer','Graphic Designer','Motion Graphics Artist','Illustrator','Interior Designer',
             'Fashion Designer','Visual Identity Designer','Product Designer','Interaction Designer',
             'Exhibit Designer','Textile Designer','Packaging Designer','Visual Merchandiser',
             'Concept Artist','Multimedia Designer','3D Modeler','User Researcher',
             'Jewelry Designer','Layout Artist','Brand Identity Consultant'],
  },
  {
    cat: 'Media & Production',         dept: 'Media Production',
    skills: ['Video Editing','Adobe Premiere','Sound Design','Journalism','Broadcast'],
    jrSal: [280000,500000],  snrSal: [900000,2500000],
    url: 'media-production-journalist', board: 'indeed',
    titles: ['Video Editor','Sound Engineer','Cinematographer','News Anchor','Podcast Producer',
             'Digital Content Producer','Broadcast Journalist','Multimedia Producer','Sound Designer',
             'Radio Host','Scriptwriter','Media Director','Photojournalist',
             'Camera Operator','Production Assistant','Post-Production Coordinator',
             'Voiceover Artist','Creative Content Lead','VFX Artist','Colorist'],
  },
  {
    cat: 'Entertainment',              dept: 'Entertainment',
    skills: ['Performance Arts','Event Production','Stage Management','Content Creation','Entertainment Marketing'],
    jrSal: [250000,500000],  snrSal: [800000,3000000],
    url: 'entertainment-arts-jobs', board: 'linkedin',
    titles: ['Professional Actor','Musician','Choreographer','Stunt Coordinator','Esports Manager',
             'Talent Agent','Event Producer','Stage Manager','Lighting Designer',
             'Casting Director','Music Producer','Game Streamer','Film Director',
             'Script Supervisor','Concert Promoter','Theme Park Designer',
             'Booking Agent','Professional Dancer','Set Designer','Tour Manager'],
  },
  // ── Construction & Real Estate ────────────────────────────────────────────
  {
    cat: 'Construction',               dept: 'Construction & Infrastructure',
    skills: ['AutoCAD','Project Management','MS Project','HSE','Site Supervision'],
    jrSal: [300000,550000],  snrSal: [1000000,2500000],
    url: 'civil-construction-engineer', board: 'naukri',
    titles: ['Site Engineer','Project Manager Construction','Quantity Surveyor','HSE Officer',
             'Civil Supervisor','Construction Estimator','Building Inspector','Heavy Equipment Operator',
             'Concrete Finisher','Steel Fixer','Construction Foreman','Site Safety Coordinator',
             'Field Engineer','BIM Coordinator','Land Surveyor','Construction Laborer',
             'Paving Operator','Glazier','Drywall Installer','Insulation Specialist'],
  },
  {
    cat: 'Architecture',               dept: 'Architecture & Urban Design',
    skills: ['AutoCAD','Revit','BIM','SketchUp','Urban Planning'],
    jrSal: [300000,600000],  snrSal: [1200000,3000000],
    url: 'architect-urban-planner', board: 'linkedin',
    titles: ['Urban Planner','Landscape Architect','BIM Manager','Interior Architect',
             'Architectural Draftsperson','Sustainable Design Consultant','Conservation Architect',
             'Residential Architect','Commercial Architect','Industrial Architect',
             'Lighting Designer Architecture','Specification Writer','Architectural Technologist',
             'Urban Designer','Master Planner','Accessibility Consultant',
             'Facade Engineer','Model Maker','Design Director Architecture','Space Planner'],
  },
  {
    cat: 'Real Estate',                dept: 'Real Estate',
    skills: ['Property Valuation','Real Estate Law','MLS','CRM','Negotiation'],
    jrSal: [280000,600000],  snrSal: [1000000,3000000],
    url: 'real-estate-property-manager', board: 'naukri',
    titles: ['Real Estate Agent','Property Manager','Facility Manager','Real Estate Valuation Analyst',
             'Leasing Consultant','Real Estate Developer','Commercial Broker','Mortgage Broker',
             'Land Acquisition Manager','Asset Manager Real Estate','Escrow Officer',
             'Title Examiner','Real Estate Investment Analyst','Housing Counselor',
             'HOA Manager','Real Estate Compliance Officer','Relocation Specialist',
             'Residential Appraiser','Industrial Real Estate Lead','Real Estate Marketing Coordinator'],
  },
  // ── Hospitality & Tourism ─────────────────────────────────────────────────
  {
    cat: 'Hospitality',                dept: 'Hotel & Hospitality',
    skills: ['Hospitality Management','PMS Systems','Revenue Management','Customer Service','F&B Operations'],
    jrSal: [250000,450000],  snrSal: [800000,2500000],
    url: 'hotel-hospitality-jobs', board: 'naukri',
    titles: ['Hotel General Manager','Front Office Manager','Concierge','Housekeeping Executive',
             'Guest Relations Manager','Revenue Manager Hotels','Event Planner','Banquet Manager',
             'Hotel Sales Director','Night Manager','Resort Manager','Spa Director',
             'Bell Captain','Reservations Agent','Catering Sales Manager',
             'Food and Beverage Director','Chief Engineer Hotels','Loss Prevention Officer',
             'Hotel Asset Manager','Hospitality Consultant'],
  },
  {
    cat: 'Food & Culinary',            dept: 'Food & Beverage',
    skills: ['Culinary Arts','Kitchen Management','HACCP','Food Safety','Menu Planning'],
    jrSal: [200000,400000],  snrSal: [600000,2000000],
    url: 'chef-restaurant-manager', board: 'naukri',
    titles: ['Executive Chef','Pastry Chef','Sommelier','F&B Manager','Barista',
             'Sous Chef','Line Cook','Restaurant Manager','Maitre d hotel','Bartender',
             'Baker','Catering Manager','Food Stylist','Kitchen Manager',
             'Nutritionist Food Service','Food Safety Auditor','Butcher',
             'Dishwasher','Server','Mixologist'],
  },
  {
    cat: 'Tourism & Travel',           dept: 'Tourism',
    skills: ['GDS Systems','Destination Knowledge','Tour Planning','Customer Service','Travel Technology'],
    jrSal: [250000,450000],  snrSal: [700000,1800000],
    url: 'travel-tourism-jobs', board: 'indeed',
    titles: ['Travel Consultant','Tour Guide','Event Planner Tourism','Cruise Ship Director',
             'Destination Manager','Travel Writer','Tourism Marketing Manager',
             'Shore Excursion Coordinator','Travel Agency Manager','Tourism Policy Advisor',
             'Group Travel Planner','Adventure Guide','Eco-tourism Specialist',
             'Reservationist Travel','Travel Data Analyst','Visitor Information Center Manager',
             'Hospitality Sales Representative','Attraction Manager','GDS Specialist','Cultural Ambassador'],
  },
  // ── Customer Service & Retail ─────────────────────────────────────────────
  {
    cat: 'Customer Service',           dept: 'Customer Experience',
    skills: ['CRM','Zendesk','Customer Success','Communication','Problem Solving'],
    jrSal: [250000,450000],  snrSal: [800000,2000000],
    url: 'customer-service-support-jobs', board: 'naukri',
    titles: ['Customer Success Manager','Call Center Representative','Technical Support Specialist',
             'Client Relations Manager','Customer Service Lead','Help Desk Technician',
             'Tier 2 Support Specialist','Implementation Specialist','Retention Specialist',
             'CX Analyst','Support Operations Manager','Dispute Resolution Specialist',
             'Multilingual Support Agent','Chatbot Content Curator','Customer Service Trainer',
             'Account Manager Post-Sales','VIP Support Executive','Knowledge Base Manager',
             'Customer Advocacy Manager','Community Support Lead'],
  },
  {
    cat: 'Retail',                     dept: 'Retail Operations',
    skills: ['Retail Management','POS Systems','Visual Merchandising','Inventory','Customer Service'],
    jrSal: [200000,400000],  snrSal: [700000,2000000],
    url: 'retail-store-manager', board: 'naukri',
    titles: ['Store Manager','Visual Merchandiser','Category Manager Retail','Retail Operations Lead',
             'Retail Sales Associate','Cashier','Merchandising Manager','Loss Prevention Specialist',
             'District Manager','Inventory Associate','E-commerce Fulfillment Lead',
             'Personal Stylist','Buying Manager','Retail Buyer','Stock Clerk',
             'Floor Supervisor','Retail Marketing Coordinator','Regional Operations Manager',
             'Customer Loyalty Manager','POS Technician'],
  },
  // ── Skilled Trades & Maintenance ─────────────────────────────────────────
  {
    cat: 'Skilled Trades',             dept: 'Technical Trades',
    skills: ['Trade Certification','Safety Protocols','Technical Tools','Blueprint Reading','Compliance'],
    jrSal: [200000,400000],  snrSal: [600000,1500000],
    url: 'electrician-plumber-trades', board: 'naukri',
    titles: ['Electrician','Plumber','HVAC Technician','Carpenter','Welder',
             'Pipefitter','Mason','Roofer','Sheet Metal Worker','Glazier',
             'Drywaller','Painter','Flooring Installer','Ironworker',
             'Insulation Installer','Cabinet Maker','Landscaper',
             'Concrete Worker','Paving Specialist','Scaffolder'],
  },
  {
    cat: 'Maintenance & Facilities',   dept: 'Facilities Management',
    skills: ['Preventive Maintenance','CMMS','Mechanical Systems','Electrical Systems','Safety Compliance'],
    jrSal: [200000,400000],  snrSal: [600000,1500000],
    url: 'facility-maintenance-technician', board: 'indeed',
    titles: ['Facility Technician','Elevator Mechanic','Diesel Mechanic','Locksmith',
             'General Maintenance Worker','Building Engineer','Industrial Machinery Mechanic',
             'HVAC Mechanic','Auto Body Repairer','Appliance Repair Technician',
             'Telecommunications Technician','Power Line Worker','Wind Turbine Technician',
             'Aircraft Mechanic','Small Engine Mechanic','Marine Mechanic',
             'Biomedical Equipment Technician','Heavy Equipment Mechanic',
             'Solar Panel Installer','Maintenance Planner'],
  },
  // ── Government & Social Services ─────────────────────────────────────────
  {
    cat: 'Protective Services',        dept: 'Public Safety',
    skills: ['Law Enforcement','Emergency Response','Security Operations','Investigation','Crisis Management'],
    jrSal: [250000,500000],  snrSal: [700000,2000000],
    url: 'police-security-jobs', board: 'naukri',
    titles: ['Police Officer','Firefighter','Military Personnel','Security Consultant',
             'Private Investigator','Corrections Officer','Border Patrol Agent',
             'Secret Service Agent','Customs Inspector','Cybercrime Investigator',
             'Airport Security Screener','Emergency Dispatcher','Game Warden',
             'Security Guard','Loss Prevention Manager','Criminologist',
             'Bailiff','Deputy Sheriff','Intelligence Analyst','Forensic Specialist'],
  },
  {
    cat: 'Social Services',            dept: 'Social Work & NGO',
    skills: ['Case Management','Community Outreach','Counseling','Program Management','Grant Writing'],
    jrSal: [250000,450000],  snrSal: [700000,1800000],
    url: 'social-worker-ngo-jobs', board: 'indeed',
    titles: ['Social Worker','NGO Program Manager','Child Welfare Specialist','Community Outreach Coordinator',
             'Case Manager','Youth Counselor','Family Support Worker','Crisis Intervention Specialist',
             'Geriatric Social Worker','Rehabilitation Counselor','Social Services Assistant',
             'Non-profit Executive Director','Fundraiser','Human Rights Advocate',
             'Victim Advocate','Refugee Support Coordinator','Community Health Educator',
             'Public Health Worker','Disability Services Coordinator','Social Policy Researcher'],
  },
  // ── Agriculture & Natural Resources ──────────────────────────────────────
  {
    cat: 'Agriculture',                dept: 'Agriculture & Farming',
    skills: ['Agronomy','Precision Agriculture','Soil Science','GIS','Farm Management'],
    jrSal: [250000,450000],  snrSal: [700000,1800000],
    url: 'agricultural-scientist-farmer', board: 'naukri',
    titles: ['Agricultural Scientist','Agronomist','Farm Manager','Precision Agriculture Specialist',
             'Crop Consultant','Soil Scientist','Agricultural Engineer','Farm Laborer',
             'Greenhouse Manager','Irrigation Specialist','Livestock Manager',
             'Pesticide Handler','Agricultural Sales Representative','Organic Farming Consultant',
             'Beekeeper','Aquaculture Manager','Dairy Manager','Vineyard Manager',
             'Agricultural Inspector','Food Scientist Agriculture'],
  },
  {
    cat: 'Natural Resources',          dept: 'Mining & Geosciences',
    skills: ['Geology','Mining Operations','GIS','Environmental Compliance','Drilling'],
    jrSal: [300000,550000],  snrSal: [1000000,2500000],
    url: 'mining-petroleum-geologist', board: 'indeed',
    titles: ['Mining Engineer','Petroleum Geologist','Forester','Fisheries Manager',
             'Geologist','Hydrologist','Mineralogist','Driller','Mining Safety Inspector',
             'Land Reclamation Specialist','Forestry Technician','Park Ranger',
             'Wildlife Manager','Conservationist','Quarry Manager',
             'Oil Rig Worker','Natural Resource Manager','Meteorologist',
             'Oceanographer','Seismologist'],
  },
  // ── E-commerce & Digital Operations ──────────────────────────────────────
  {
    cat: 'E-commerce Operations',      dept: 'Operations',
    skills: ['WMS','E-commerce Platforms','Logistics Coordination','Inventory Management','Data Analysis'],
    jrSal: [280000,500000],  snrSal: [900000,2200000],
    url: 'ecommerce-operations-manager', board: 'naukri',
    titles: ['Warehouse Operations Lead','Fulfillment Center Manager','Last-Mile Delivery Coordinator',
             'Warehouse Manager','Order Fulfillment Associate','Inventory Controller',
             'E-commerce Operations Manager','Supply Chain Coordinator E-commerce',
             'Distribution Manager','Returns Manager','Logistics Analyst',
             'Procurement Coordinator Retail','Shipping Receiving Supervisor',
             'Package Handler','Delivery Driver','Fleet Manager',
             'E-commerce Project Manager','Marketplace Specialist',
             'Digital Merchandiser','Order Management Specialist','3PL Relationship Manager'],
  },
  // ── Executive Leadership ──────────────────────────────────────────────────
  {
    cat: 'Corporate Strategy & Leadership', dept: 'Executive Leadership',
    skills: ['Strategic Planning','P&L Management','Stakeholder Management','Transformation','Board Relations'],
    jrSal: [1000000,2000000], snrSal: [5000000,20000000],
    url: 'ceo-cto-cfo-executive-jobs', board: 'linkedin',
    titles: ['CEO','COO','CFO','CTO','CMO','CHRO','Strategy Consultant',
             'Board Director','Chief Data Officer','CIO','VP of Strategy',
             'Chief Product Officer','Chief Sustainability Officer','Chief Compliance Officer',
             'Chief Risk Officer','General Manager','VP of Operations','VP of Sales',
             'VP of Marketing','Managing Director','EVP','Chief Innovation Officer',
             'Business Transformation Lead','Chief Digital Officer'],
  },
  // ── Remote & Freelance ────────────────────────────────────────────────────
  {
    cat: 'Remote & Freelance',         dept: 'Freelance & Remote Work',
    skills: ['Remote Collaboration','Asana/Trello','Digital Tools','Self-Management','Communication'],
    jrSal: [200000,400000],  snrSal: [600000,1800000],
    url: 'remote-work-freelance-jobs', board: 'linkedin',
    titles: ['Virtual Assistant','Transcriptionist','Voice-over Artist','Micro-Influencer',
             'Data Labeler','Digital Nomad Consultant','Remote Work Manager','Freelance Writer',
             'Ghostwriter','Graphic Design Freelancer','Freelance Web Developer',
             'Online Content Moderator','Digital Marketing Consultant Freelance',
             'Virtual Bookkeeper','Remote Project Coordinator','Freelance Video Editor',
             'Independent Consultant','Stock Photographer','Gig Economy Platform Manager',
             'Virtual Event Moderator'],
  },
];

/**
 * Main seed function — call with the TalentNest HR org object
 */
async function seedMassiveJobs(tnOrg, adminUserId) {
  const Job          = require('../models/Job');
  const Organization = require('../models/Organization');

  const od       = tnOrg.toJSON ? tnOrg.toJSON() : tnOrg;
  const tenantId = od.id || od._id?.toString();
  const slug = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  let locIndex     = 0;
  let companyIndex = 0;
  let jobCount     = 0;
  let skipCount    = 0;

  for (const cat of CATEGORIES) {
    for (const title of cat.titles) {
      for (const seniority of ['junior', 'senior']) {
        const isSnr    = seniority === 'senior';
        const fullTitle = isSnr ? `Senior ${title}` : `Junior ${title}`;
        const location  = LOCATIONS[locIndex % LOCATIONS.length];
        const company   = COMPANIES[companyIndex % COMPANIES.length];
        const expRange  = isSnr ? '6–12 years' : '0–3 years';
        const salMin    = isSnr ? cat.snrSal[0] : cat.jrSal[0];
        const salMax    = isSnr ? cat.snrSal[1] : cat.jrSal[1];
        const careerPageSlug = `tn-${slug(fullTitle)}-${slug(location)}`;

        locIndex++;
        companyIndex++;

        // Skip if already exists (idempotent re-runs)
        const exists = await Job.findOne({ tenantId, careerPageSlug }).select('_id').lean();
        if (exists) { skipCount++; continue; }

        const description = `${company} is seeking a ${isSnr ? 'highly experienced' : 'motivated and enthusiastic'} ${fullTitle} to join the ${cat.dept} team. ` +
          `This role involves ${isSnr ? 'leading key initiatives, mentoring junior team members, and driving strategic outcomes' : 'hands-on work, learning best practices, and contributing to impactful projects'} within the ${cat.cat} domain. ` +
          `The ideal candidate brings strong expertise in ${cat.skills.slice(0,3).join(', ')} and thrives in a collaborative, fast-paced environment. ` +
          `${company} offers competitive compensation, growth opportunities, and the chance to work on meaningful challenges in ${location}.`;

        await Job.create({
          title:          fullTitle,
          company:        company,
          companyName:    company,
          department:     cat.dept,
          location,
          jobType:        'Full-Time',
          workMode:       companyIndex % 3 === 0 ? 'Remote' : companyIndex % 3 === 1 ? 'Hybrid' : 'Onsite',
          experience:     expRange,
          skills:         cat.skills,
          salaryMin:      salMin,
          salaryMax:      salMax,
          salaryCurrency: 'INR',
          salaryType:     'CTC',
          description,
          requirements:   `${expRange} of experience in ${cat.cat}. Strong proficiency in ${cat.skills.join(', ')}. ${isSnr ? 'Proven track record of delivering results in a leadership or senior individual-contributor role.' : 'Strong fundamentals, eagerness to learn, and ability to work in a team.'}`,
          benefits:       'Competitive salary, health insurance, learning budget, performance bonus, flexible work options.',
          // externalUrl intentionally omitted for seeded jobs.
          // These were pointing to generic job board search pages (Naukri/LinkedIn/Indeed/Glassdoor).
          // All applications now go through TalentNest HR. Real company career links (NuSummit etc.) are kept separately.
          urgency:        ['High','Medium','Low'][locIndex % 3],
          numberOfOpenings: isSnr ? Math.floor(Math.random() * 3) + 1 : Math.floor(Math.random() * 5) + 1,
          tenantId,
          orgId:          tenantId,
          careerPageSlug,
          status:         'active',
          approvalStatus: 'approved',
          isPublic:       true,
          createdBy:      adminUserId,
        });

        jobCount++;
      }
    }
  }

  console.log(`✅  Massive job seed: ${jobCount} new jobs created, ${skipCount} already existed`);
  return jobCount;
}

module.exports = { seedMassiveJobs };
