'use strict';
const bcrypt       = require('bcryptjs');
const User         = require('../models/User');
const Organization = require('../models/Organization');
const Job          = require('../models/Job');
const Application  = require('../models/Application');

const DEMO_PASSWORD = 'Demo@123456';

// Helper: random date within last N days
const daysAgo = (n) => new Date(Date.now() - Math.floor(Math.random() * n + 1) * 24 * 60 * 60 * 1000);
const exactDaysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

async function seedDemo() {
  if (process.env.SKIP_DEMO_SEED === 'true') {
    console.log('ℹ️   SKIP_DEMO_SEED=true — skipping demo data seed');
    return;
  }
  const tnOrg = await Organization.findOne({ domain: { $regex: /talentnesthr\.com/i } });
  if (!tnOrg) { console.log('⚠️  TalentNest org not found — run main seed first'); return; }
  const orgId = tnOrg._id;
  const superAdmin = await User.findOne({ email: 'admin@talentnesthr.com' });
  const createdBy = superAdmin?._id;

  // ── 3 Demo Recruiters ─────────────────────────────────────────────────────
  const recruiterData = [
    { name: 'Priya Sharma',  email: 'priya.sharma@talentnesthr.com',  title: 'Senior Technical Recruiter', phone: '+91 98765 43210', location: 'Hyderabad', skills: ['technical recruiting','nodejs','react','java'] },
    { name: 'Arjun Reddy',   email: 'arjun.reddy@talentnesthr.com',   title: 'HR Specialist',              phone: '+91 87654 32109', location: 'Bangalore',  skills: ['sourcing','screening','linkedin recruiter'] },
    { name: 'Sneha Mehta',   email: 'sneha.mehta@talentnesthr.com',   title: 'Talent Acquisition Lead',   phone: '+91 76543 21098', location: 'Mumbai',     skills: ['talent acquisition','branding','bulk hiring'] },
  ];

  const recruiters = [];
  for (const rd of recruiterData) {
    let r = await User.findOne({ email: rd.email });
    if (!r) {
      r = await User.create({
        ...rd,
        passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
        role: 'recruiter', tenantId: orgId, orgId, isActive: true,
        experience: 4, availability: 'immediate',
      });
      console.log(`✅  Recruiter created → ${rd.email}`);
    }
    recruiters.push(r);
  }

  // ── 8 Demo Jobs ───────────────────────────────────────────────────────────
  const jobDefs = [
    { title: 'Senior Full Stack Developer', department: 'Engineering', location: 'Hyderabad', type: 'full-time', experience: '3-6 years', salaryRange: '18-28 LPA', skills: ['react','nodejs','mongodb','typescript'], urgency: 'high', status: 'active', companyName: 'TalentNest HR', description: 'Looking for an experienced Full Stack Developer proficient in React and Node.js.' },
    { title: 'Product Manager',             department: 'Product',     location: 'Bangalore',  type: 'full-time', experience: '4-8 years', salaryRange: '20-35 LPA', skills: ['product management','agile','saas','analytics'], urgency: 'high', status: 'active', companyName: 'TalentNest HR', description: 'Seeking a strategic PM to lead our SaaS platform roadmap.' },
    { title: 'UI/UX Designer',             department: 'Design',       location: 'Mumbai',     type: 'full-time', experience: '2-5 years', salaryRange: '12-20 LPA', skills: ['figma','ui design','ux research','prototyping'], urgency: 'medium', status: 'active', companyName: 'TalentNest HR', description: 'Create stunning user interfaces for enterprise products.' },
    { title: 'Data Analyst',               department: 'Analytics',    location: 'Hyderabad', type: 'full-time', experience: '1-3 years', salaryRange: '8-14 LPA',  skills: ['python','sql','power bi','excel'], urgency: 'medium', status: 'active', companyName: 'TalentNest HR', description: 'Extract insights from our HR and recruitment datasets.' },
    { title: 'DevOps Engineer',            department: 'Infrastructure',location: 'Bangalore', type: 'full-time', experience: '3-5 years', salaryRange: '15-25 LPA', skills: ['aws','docker','kubernetes','terraform'], urgency: 'low', status: 'active', companyName: 'TalentNest HR', description: 'Manage cloud infrastructure and CI/CD pipelines.' },
    { title: 'Cybersecurity Analyst',      department: 'Security',     location: 'Hyderabad', type: 'full-time', experience: '2-5 years', salaryRange: '14-22 LPA', skills: ['soc','siem','penetration testing','grc'], urgency: 'high', status: 'active', companyName: 'TalentNest HR', description: 'SOC analyst for 24x7 threat monitoring and response.' },
    { title: 'HR Business Partner',        department: 'HR',           location: 'Mumbai',    type: 'full-time', experience: '3-6 years', salaryRange: '10-18 LPA', skills: ['hrms','employee relations','talent management'], urgency: 'medium', status: 'active', companyName: 'TalentNest HR', description: 'Strategic HRBP to partner with business leaders.' },
    { title: 'React Native Developer',     department: 'Mobile',       location: 'Pune',      type: 'full-time', experience: '2-4 years', salaryRange: '12-20 LPA', skills: ['react native','typescript','ios','android'], urgency: 'high', status: 'active', companyName: 'TalentNest HR', description: 'Build cross-platform mobile apps for our HRMS suite.' },
  ];

  const jobs = [];
  for (let i = 0; i < jobDefs.length; i++) {
    const jd = jobDefs[i];
    // Use careerPageSlug as the unique key — prevents duplicate creation on every deploy
    const slug = `demo-tn-${jd.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const job = await Job.findOneAndUpdate(
      { tenantId: orgId, careerPageSlug: slug },
      { $set: { ...jd, tenantId: orgId, orgId, createdBy, careerPageSlug: slug, approvalStatus: 'approved', assignedRecruiters: [recruiters[i % recruiters.length]._id] } },
      { upsert: true, new: true }
    );
    jobs.push(job);
  }
  console.log(`✅  Demo jobs synced (${jobs.length}) — upserted, no duplicates`);

  // ── 15 Demo Candidates ────────────────────────────────────────────────────
  const candidateData = [
    { name: 'Rahul Kumar',     email: 'rahul.kumar@gmail.com',     title: 'Full Stack Developer',     experience: 4, location: 'Hyderabad', skills: ['react','nodejs','mongodb','javascript'],          availability: 'immediate',  aiMatchScore: 92 },
    { name: 'Anjali Singh',    email: 'anjali.singh@gmail.com',    title: 'Product Manager',          experience: 6, location: 'Bangalore',  skills: ['product management','agile','jira','analytics'],    availability: 'immediate',  aiMatchScore: 88 },
    { name: 'Vikram Nair',     email: 'vikram.nair@gmail.com',     title: 'UI/UX Designer',           experience: 3, location: 'Mumbai',     skills: ['figma','ui design','adobe xd','css'],              availability: 'two_weeks',  aiMatchScore: 85 },
    { name: 'Pooja Gupta',     email: 'pooja.gupta@gmail.com',     title: 'Data Analyst',             experience: 2, location: 'Hyderabad', skills: ['python','sql','tableau','excel'],                   availability: 'immediate',  aiMatchScore: 79 },
    { name: 'Aditya Rao',      email: 'aditya.rao@gmail.com',      title: 'DevOps Engineer',          experience: 4, location: 'Bangalore',  skills: ['aws','docker','kubernetes','jenkins'],             availability: 'one_month',  aiMatchScore: 90 },
    { name: 'Meena Pillai',    email: 'meena.pillai@gmail.com',    title: 'React Developer',          experience: 3, location: 'Chennai',    skills: ['react','typescript','redux','graphql'],            availability: 'immediate',  aiMatchScore: 83 },
    { name: 'Sanjay Verma',    email: 'sanjay.verma@gmail.com',    title: 'Node.js Developer',        experience: 5, location: 'Pune',       skills: ['nodejs','express','postgresql','microservices'],   availability: 'two_weeks',  aiMatchScore: 87 },
    { name: 'Divya Krishnan',  email: 'divya.krishnan@gmail.com',  title: 'Product Analyst',          experience: 2, location: 'Hyderabad', skills: ['product management','sql','analytics','figma'],     availability: 'immediate',  aiMatchScore: 74 },
    { name: 'Karan Mehta',     email: 'karan.mehta@gmail.com',     title: 'Cybersecurity Analyst',    experience: 3, location: 'Hyderabad', skills: ['soc','siem','splunk','threat analysis'],           availability: 'immediate',  aiMatchScore: 91 },
    { name: 'Riya Sharma',     email: 'riya.sharma@gmail.com',     title: 'HR Business Partner',      experience: 5, location: 'Mumbai',     skills: ['hrms','employee relations','talent management'],   availability: 'two_weeks',  aiMatchScore: 82 },
    { name: 'Suresh Babu',     email: 'suresh.babu@gmail.com',     title: 'React Native Developer',   experience: 3, location: 'Pune',       skills: ['react native','typescript','ios','android'],       availability: 'immediate',  aiMatchScore: 86 },
    { name: 'Nisha Patel',     email: 'nisha.patel@gmail.com',     title: 'Full Stack Developer',     experience: 2, location: 'Ahmedabad', skills: ['react','nodejs','mysql','aws'],                    availability: 'one_month',  aiMatchScore: 76 },
    { name: 'Tarun Das',       email: 'tarun.das@gmail.com',       title: 'DevOps / SRE',             experience: 6, location: 'Bangalore',  skills: ['kubernetes','terraform','prometheus','grafana'],   availability: 'immediate',  aiMatchScore: 94 },
    { name: 'Swathi Reddy',    email: 'swathi.reddy@gmail.com',    title: 'UI Designer',              experience: 4, location: 'Hyderabad', skills: ['figma','sketch','motion design','css'],            availability: 'two_weeks',  aiMatchScore: 80 },
    { name: 'Mohit Jain',      email: 'mohit.jain@gmail.com',      title: 'Data Engineer',            experience: 3, location: 'Pune',       skills: ['python','spark','airflow','bigquery'],             availability: 'immediate',  aiMatchScore: 78 },
  ];

  const candidates = [];
  for (const cd of candidateData) {
    let c = await User.findOne({ email: cd.email });
    if (!c) {
      c = await User.create({
        ...cd,
        passwordHash: bcrypt.hashSync(DEMO_PASSWORD, 10),
        role: 'candidate', tenantId: orgId, orgId, isActive: true,
      });
      console.log(`✅  Candidate created → ${cd.name}`);
    }
    candidates.push(c);
  }

  // ── 20 Demo Applications (varied stages, spread over 30 days) ────────────
  // currentStage must match backend stage names exactly
  const STAGES = ['Applied', 'Screening', 'Shortlisted', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired', 'Rejected'];

  const appDefs = [
    { cIdx: 0,  jIdx: 0, currentStage: 'Interview Round 1', daysAgoCreated: 12, source: 'platform',  note: 'Strong technical background, cleared coding round' },
    { cIdx: 1,  jIdx: 1, currentStage: 'Offer',             daysAgoCreated: 8,  source: 'linkedin',  note: 'Excellent PM experience, offer extended' },
    { cIdx: 2,  jIdx: 2, currentStage: 'Shortlisted',       daysAgoCreated: 15, source: 'referral',  note: 'Great portfolio, moving to design challenge' },
    { cIdx: 3,  jIdx: 3, currentStage: 'Screening',         daysAgoCreated: 5,  source: 'platform',  note: 'Good SQL skills, scheduling HR screen' },
    { cIdx: 4,  jIdx: 4, currentStage: 'Hired',             daysAgoCreated: 20, source: 'referral',  note: 'Certified AWS pro — joined on 1st' },
    { cIdx: 5,  jIdx: 0, currentStage: 'Applied',           daysAgoCreated: 3,  source: 'platform',  note: 'Frontend specialist, reviewing resume' },
    { cIdx: 6,  jIdx: 0, currentStage: 'Interview Round 2', daysAgoCreated: 18, source: 'linkedin',  note: 'Backend skills match, final round scheduled' },
    { cIdx: 7,  jIdx: 1, currentStage: 'Shortlisted',       daysAgoCreated: 10, source: 'platform',  note: 'Product analytics experience matches well' },
    { cIdx: 8,  jIdx: 5, currentStage: 'Interview Round 1', daysAgoCreated: 7,  source: 'platform',  note: 'SOC skills strong, technical interview scheduled' },
    { cIdx: 9,  jIdx: 6, currentStage: 'Offer',             daysAgoCreated: 6,  source: 'referral',  note: 'Great HRBP background, verbal offer accepted' },
    { cIdx: 10, jIdx: 7, currentStage: 'Hired',             daysAgoCreated: 25, source: 'platform',  note: 'React Native expert, onboarding complete' },
    { cIdx: 11, jIdx: 0, currentStage: 'Rejected',          daysAgoCreated: 14, source: 'linkedin',  note: 'Skills gap in backend, rejected after screening' },
    { cIdx: 12, jIdx: 4, currentStage: 'Interview Round 1', daysAgoCreated: 9,  source: 'referral',  note: 'Senior DevOps, strong Kubernetes experience' },
    { cIdx: 13, jIdx: 2, currentStage: 'Screening',         daysAgoCreated: 4,  source: 'platform',  note: 'Motion design skills, profile looks promising' },
    { cIdx: 14, jIdx: 3, currentStage: 'Shortlisted',       daysAgoCreated: 11, source: 'platform',  note: 'Spark + Airflow experience is strong match' },
    { cIdx: 0,  jIdx: 5, currentStage: 'Screening',         daysAgoCreated: 2,  source: 'platform',  note: 'Security certifications under review' },
    { cIdx: 1,  jIdx: 7, currentStage: 'Applied',           daysAgoCreated: 1,  source: 'linkedin',  note: 'Interested in mobile product role' },
    { cIdx: 5,  jIdx: 3, currentStage: 'Hired',             daysAgoCreated: 28, source: 'referral',  note: 'Data skills match, accepted offer' },
    { cIdx: 6,  jIdx: 1, currentStage: 'Rejected',          daysAgoCreated: 22, source: 'platform',  note: 'Good backend but PM role needs different profile' },
    { cIdx: 3,  jIdx: 0, currentStage: 'Interview Round 1', daysAgoCreated: 6,  source: 'platform',  note: 'Pivoting from data to full stack, strong coder' },
  ];

  for (const ad of appDefs) {
    const cand = candidates[ad.cIdx];
    const job  = jobs[ad.jIdx];
    if (!cand || !job) continue;
    const existing = await Application.findOne({ jobId: job._id, candidateId: cand._id });
    if (existing) continue;

    const createdAt = exactDaysAgo(ad.daysAgoCreated);

    // Build a realistic stage history
    const stageHistory = [
      { stage: 'Applied', movedBy: cand._id, movedAt: createdAt, notes: 'Application submitted' },
    ];
    const stageOrder = ['Applied','Screening','Shortlisted','Interview Round 1','Interview Round 2','Offer','Hired'];
    const targetIdx = stageOrder.indexOf(ad.currentStage);
    for (let si = 1; si <= targetIdx; si++) {
      stageHistory.push({
        stage  : stageOrder[si],
        movedBy: recruiters[si % recruiters.length]._id,
        movedAt: new Date(createdAt.getTime() + si * 2 * 24 * 60 * 60 * 1000),
        notes  : si === targetIdx ? ad.note : `Moved to ${stageOrder[si]}`,
      });
    }
    if (ad.currentStage === 'Rejected') {
      stageHistory.push({ stage: 'Rejected', movedBy: recruiters[0]._id, movedAt: new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000), notes: ad.note });
    }

    const candidateUser = candidateData[ad.cIdx];
    await Application.create({
      jobId        : job._id,
      candidateId  : cand._id,
      tenantId     : orgId,
      currentStage : ad.currentStage,
      source       : ad.source || 'platform',
      aiMatchScore : candidateUser.aiMatchScore || Math.floor(Math.random() * 30 + 65),
      stageHistory,
      createdAt,
      updatedAt    : new Date(),
      notes: [{ authorId: recruiters[0]._id, authorName: recruiters[0].name, content: ad.note, createdAt: new Date() }],
    });

    await Job.findByIdAndUpdate(job._id, {
      $inc: {
        applicationCount: 1,
        ...(ad.currentStage === 'Hired' ? { hiredCount: 1 } : {}),
      },
    });
    console.log(`✅  Application → ${cand.name} for ${job.title} [${ad.currentStage}]`);
  }

  console.log('🎉  Demo data seeded — 15 candidates, 8 jobs, 20 applications');
  console.log(`    Recruiter logins: priya.sharma@talentnesthr.com / ${DEMO_PASSWORD}`);
}

module.exports = seedDemo;
