'use strict';
/**
 * migrateJobIndustry.js
 * One-time migration: fills `industry` for all jobs that have it empty.
 * Maps from `department` (set by seedJobsMassive.js) to the correct industry.
 * Run with: node backend/src/db/migrateJobIndustry.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Job = require('../models/Job');

const DEPT_TO_INDUSTRY = {
  'AI & Machine Learning'     : 'Artificial Intelligence',
  'Data Science'              : 'Data & Analytics',
  'Information Security'      : 'Cybersecurity',
  'Platform Engineering'      : 'Cloud & DevOps',
  'Innovation Lab'            : 'Emerging Technology',
  'Clinical Operations'       : 'Healthcare',
  'Research & Development'    : 'Pharmaceutical & Biotech',
  'Patient Care'              : 'Healthcare',
  'Specialized Medicine'      : 'Healthcare',
  'Production'                : 'Manufacturing',
  'Automotive Engineering'    : 'Automotive',
  'Aerospace Engineering'     : 'Aerospace & Defence',
  'Banking & Finance'         : 'Banking & Financial Services',
  'Finance & Accounts'        : 'Accounting & Finance',
  'Investments & Trading'     : 'FinTech & Wealth Management',
  'Marketing'                 : 'Marketing & Advertising',
  'Sales'                     : 'Sales',
  'Creative'                  : 'Media & Advertising',
  'Human Resources'           : 'Human Resources',
  'Learning & Development'    : 'Learning & Development',
  'Energy'                    : 'Renewable Energy',
  'ESG & Sustainability'      : 'Sustainability & ESG',
  'Environment'               : 'Environmental Science',
  'Academic'                  : 'Education',
  'Product & Content'         : 'EdTech & Digital Learning',
  'Legal & Compliance'        : 'Legal',
  'Policy & Government Affairs': 'Government & Public Policy',
  'Supply Chain'              : 'Supply Chain & Logistics',
  'Aviation Operations'       : 'Aviation',
  'Maritime Operations'       : 'Shipping & Maritime',
  'Design'                    : 'Creative & Design',
  'Media Production'          : 'Media & Entertainment',
  'Entertainment'             : 'Entertainment',
  'Construction & Infrastructure': 'Construction & Real Estate',
  'Architecture & Urban Design': 'Architecture & Urban Design',
  'Real Estate'               : 'Real Estate',
  'Hotel & Hospitality'       : 'Hospitality & Tourism',
  'Food & Beverage'           : 'Food & Culinary',
  'Tourism'                   : 'Tourism & Travel',
  'Customer Experience'       : 'Customer Service',
  'Retail Operations'         : 'Retail',
  'Technical Trades'          : 'Skilled Trades',
  'Facilities Management'     : 'Facilities & Maintenance',
  'Public Safety'             : 'Public Safety & Security',
  'Social Work & NGO'         : 'Social Services & NGO',
  'Agriculture & Farming'     : 'Agriculture & Farming',
  'Mining & Geosciences'      : 'Mining & Natural Resources',
  'Operations'                : 'E-commerce & Operations',
  'Executive Leadership'      : 'Corporate Strategy & Leadership',
  'Freelance & Remote Work'   : 'Freelance & Consulting',
};

const SOFTWARE_KEYWORDS = [
  'software','developer','frontend','backend','full-stack','fullstack','full stack',
  'api ','web developer','mobile','app developer','game','firmware','cross-platform',
  'cloud-native','low-code','middleware','distributed systems','mainframe','ar/vr',
  'compiler','desktop application','embedded systems','site reliability','sre',
  'qa engineer','quality assurance',
];

function inferIndustry(department, title) {
  const industry = DEPT_TO_INDUSTRY[department];
  if (industry) return industry;
  if (department === 'Engineering') {
    const titleLower = (title || '').toLowerCase();
    const isSoftware = SOFTWARE_KEYWORDS.some(kw => titleLower.includes(kw));
    return isSoftware ? 'Software Development' : 'Core Engineering';
  }
  return department || '';
}

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) { console.error('MONGO_URI not set'); process.exit(1); }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const jobs = await Job.find({
    $or: [{ industry: { $exists: false } }, { industry: '' }, { industry: null }],
  }).select('_id title department industry').lean();

  console.log(`Found ${jobs.length} jobs with missing industry`);
  if (jobs.length === 0) { await mongoose.disconnect(); return; }

  let updated = 0;
  const bulk = Job.collection.initializeUnorderedBulkOp();

  for (const job of jobs) {
    const industry = inferIndustry(job.department || '', job.title || '');
    if (industry) {
      bulk.find({ _id: job._id }).updateOne({ $set: { industry } });
      updated++;
    }
  }

  if (updated > 0) {
    await bulk.execute();
    console.log(`✅ Updated industry for ${updated} jobs`);
  }

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(err => { console.error(err); process.exit(1); });
