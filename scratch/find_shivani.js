const mongoose = require('mongoose');
const Candidate = require('./backend/src/models/Candidate');
require('dotenv').config({ path: './backend/.env' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const c = await Candidate.findOne({ name: /Shivani/i });
  console.log('Candidate:', JSON.stringify(c, null, 2));
  process.exit(0);
}
run();
