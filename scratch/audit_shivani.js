const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

async function audit() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const email = 'shivanibit.09@gmail.com';
    const emailRegex = new RegExp(`^${email}$`, 'i');

    const Candidate = mongoose.model('Candidate', new mongoose.Schema({}, { strict: false }), 'candidates');
    const Application = mongoose.model('Application', new mongoose.Schema({}, { strict: false }), 'applications');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    const registeredUser = await User.findOne({ email: emailRegex });
    console.log('--- USER ACCOUNT ---');
    if (registeredUser) {
      console.log('User ID:', registeredUser._id);
      console.log('Role:', registeredUser.role);
    } else {
      console.log('NO REGISTERED USER FOUND FOR THIS EMAIL');
    }

    const candidates = await Candidate.find({ email: emailRegex });
    console.log('\n--- CANDIDATE RECORDS ---');
    console.log('Count:', candidates.length);

    for (const c of candidates) {
      const apps = await Application.find({ candidateId: c._id });
      console.log(`\nCandidate ID: ${c._id}`);
      console.log(`UserId in Candidate: ${c.userId}`);
      console.log(`Applications Count: ${apps.length}`);
      apps.forEach(a => {
        console.log(`  - App ID: ${a._id}, Job: ${a.jobId}, Stage: ${a.stage}, Deleted: ${!!a.deletedAt}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('Audit failed:', err);
    process.exit(1);
  }
}

audit();
