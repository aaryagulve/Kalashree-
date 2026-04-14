/**
 * seed_teachers.js
 * Run once to create teacher accounts in Atlas:
 *   node seed_teachers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('./models/User');

const TEACHERS = [
  {
    name:     'Aarya Gulve',
    email:    'apgulve370123@kkwagh.edu.in',
    password: '98765',   // ← change to your actual teacher password
    role:     'teacher'
  },
  {
    name:     'Samidha Nimonkar',
    email:    'samidhanimonkar@gmail.com',
    password: 'samidha@123',   // ← change to your actual teacher password
    role:     'teacher'
  }
];

async function seed() {
  const MONGO_URL = process.env.MONGO_URL;
  if (!MONGO_URL) { console.error('MONGO_URL not set'); process.exit(1); }

  await mongoose.connect(MONGO_URL);
  console.log('Connected to:', mongoose.connection.host);

  for (const t of TEACHERS) {
    const existing = await User.findOne({ email: t.email });
    if (existing) {
      console.log(`⚠️  Already exists: ${t.email}`);
      continue;
    }
    const hashed = await bcrypt.hash(t.password, 10);
    await User.create({
      name:        t.name,
      email:       t.email,
      password:    hashed,
      role:        'teacher',
      isVerified:  true,
      isFirstLogin: false
    });
    console.log(`✅  Created teacher: ${t.email}`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch(err => { console.error(err); process.exit(1); });
