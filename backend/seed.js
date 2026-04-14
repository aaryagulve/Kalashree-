/**
 * ══════════════════════════════════════════════════════════
 *  KALASHREE SANGEET GURUKUL — Database Seed Script
 * ══════════════════════════════════════════════════════════
 *
 *  USAGE:
 *    node seed.js                  → insert sample data
 *    node seed.js --clear          → clear all collections first, then insert
 *    node seed.js --from-json      → load from exported JSON files in ./seed-data/
 *    node seed.js --clear --from-json
 *
 *  HOW TO EXPORT FROM COMPASS:
 *    1. Open Compass → connect to localhost:27017 → kalashree database
 *    2. Click each collection → Export Collection → JSON
 *    3. Save files as:
 *         seed-data/users.json
 *         seed-data/attendances.json
 *         seed-data/fees.json
 *         seed-data/homeworks.json
 *         seed-data/feedbacks.json
 *         seed-data/ragalists.json
 *         seed-data/events.json
 *    4. Run: node seed.js --from-json
 * ══════════════════════════════════════════════════════════
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const fs       = require('fs');
const path     = require('path');

// ── Models ────────────────────────────────────────────────
const User       = require('./models/User');
const Attendance = require('./models/Attendance');
const Fee        = require('./models/Fee');
const Homework   = require('./models/Homework');
const Feedback   = require('./models/Feedback');
const RagaList   = require('./models/Raga');
const Event      = require('./models/Event');

// ── CLI flags ─────────────────────────────────────────────
const CLEAR     = process.argv.includes('--clear');
const FROM_JSON = process.argv.includes('--from-json');
const JSON_DIR  = path.join(__dirname, 'seed-data');

// ── Connect ───────────────────────────────────────────────
async function connect() {
  const url = process.env.MONGO_URL;
  if (!url) { console.error('❌  MONGO_URL not set in .env'); process.exit(1); }
  await mongoose.connect(url);
  const host = mongoose.connection.host;
  console.log(`✅  Connected → ${host}`);
  if (host.includes('localhost')) console.warn('⚠️  WARNING: Using LOCAL MongoDB, not Atlas!');
  else console.log('☁️  Using MongoDB ATLAS');
}

// ── Clear collections ─────────────────────────────────────
async function clearAll() {
  console.log('\n🗑️  Clearing all collections...');
  const results = await Promise.all([
    User.deleteMany({}),
    Attendance.deleteMany({}),
    Fee.deleteMany({}),
    Homework.deleteMany({}),
    Feedback.deleteMany({}),
    RagaList.deleteMany({}),
    Event.deleteMany({})
  ]);
  const names = ['users','attendances','fees','homeworks','feedbacks','ragalists','events'];
  results.forEach((r, i) => console.log(`   ✓ ${names[i]}: deleted ${r.deletedCount}`));
}

// ── Load JSON helper ──────────────────────────────────────
function loadJSON(filename) {
  const file = path.join(JSON_DIR, filename);
  if (!fs.existsSync(file)) {
    console.warn(`   ⚠️  ${filename} not found — skipping`);
    return null;
  }
  const raw  = fs.readFileSync(file, 'utf8').trim();
  if (!raw || raw.length < 2) {
    console.warn(`   ⚠️  ${filename} is empty — skipping`);
    return null;
  }
  const data = JSON.parse(raw);
  if (Array.isArray(data)) return data;
  if (data.documents) return data.documents;
  // Single object — wrap in array
  return [data];
}

// ── Fix ObjectId fields from Compass JSON ─────────────────
function fixDoc(obj) {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(fixDoc);
  if (typeof obj === 'object') {
    // Convert { $oid: "..." } → ObjectId
    if (obj.$oid) return new mongoose.Types.ObjectId(obj.$oid);
    // Convert { $date: "..." } or { $date: { $numberLong: "..." } } → Date
    if (obj.$date) {
      if (typeof obj.$date === 'string') return new Date(obj.$date);
      if (obj.$date.$numberLong) return new Date(parseInt(obj.$date.$numberLong));
      return new Date(obj.$date);
    }
    // Convert { $numberLong: "..." } → Number
    if (obj.$numberLong) return parseInt(obj.$numberLong);
    if (obj.$numberInt)  return parseInt(obj.$numberInt);
    if (obj.$numberDouble) return parseFloat(obj.$numberDouble);
    // Recurse into plain objects
    const fixed = {};
    for (const key of Object.keys(obj)) {
      fixed[key] = fixDoc(obj[key]);
    }
    return fixed;
  }
  return obj;
}

function fixIds(docs) {
  return docs.map(doc => fixDoc(doc));
}

// ── Insert from JSON files ────────────────────────────────
async function seedFromJSON() {
  console.log(`\n📂  Loading JSON files from: ${JSON_DIR}`);

  const collections = [
    { file: 'users.json',       model: User,       name: 'users' },
    { file: 'attendances.json', model: Attendance, name: 'attendances' },
    { file: 'fees.json',        model: Fee,        name: 'fees' },
    { file: 'homeworks.json',   model: Homework,   name: 'homeworks' },
    { file: 'feedbacks.json',   model: Feedback,   name: 'feedbacks' },
    { file: 'ragalists.json',   model: RagaList,   name: 'ragalists' },
    { file: 'events.json',      model: Event,      name: 'events' },
  ];

  for (const col of collections) {
    const raw = loadJSON(col.file);
    if (!raw || raw.length === 0) { console.log(`   ⚠️  ${col.name}: 0 docs parsed from JSON — skipping`); continue; }
    const docs = fixIds(raw);
    console.log(`   📄  ${col.name}: parsed ${docs.length} docs from JSON`);
    try {
      const result = await col.model.insertMany(docs, { ordered: false });
      console.log(`   ✅  ${col.name}: inserted ${result.length} documents`);
    } catch (err) {
      if (err.code === 11000) {
        console.log(`   ⚠️  ${col.name}: some duplicates skipped (${err.writeErrors?.length || '?'} skipped)`);
      } else {
        console.error(`   ❌  ${col.name}: ${err.message}`);
      }
    }
  }
}

// ── Sample data seed ──────────────────────────────────────
async function seedSampleData() {
  console.log('\n🌱  Inserting sample data...');

  // 1. Teacher accounts
  const teacherPass = await bcrypt.hash('Kalashree@123', 10);
  const teachers = await User.insertMany([
    {
      name: 'Aarya Gulve',
      email: 'apgulve370123@kkwagh.edu.in',
      password: teacherPass,
      role: 'teacher',
      isVerified: true,
      isFirstLogin: false
    },
    {
      name: 'Samidhani Monkar',
      email: 'samidhanimonkar@gmail.com',
      password: teacherPass,
      role: 'teacher',
      isVerified: true,
      isFirstLogin: false
    }
  ], { ordered: false }).catch(e => {
    if (e.code === 11000) { console.log('   ⚠️  Teachers already exist — skipping'); return []; }
    throw e;
  });
  console.log(`   ✅  teachers: inserted ${teachers.length}`);

  // 2. Global raga list
  const existingRagas = await RagaList.findOne();
  if (!existingRagas) {
    await RagaList.create({
      ragas: ['Yaman', 'Bhairav', 'Bhoopali', 'Khamaj', 'Kafi', 'Bhairavi', 'Bhimpalas', 'Malkauns']
    });
    console.log('   ✅  ragalists: inserted 1 (global raga list)');
  } else {
    console.log('   ⚠️  ragalists: already exists — skipping');
  }

  // 3. Sample students
  const studentPass = await bcrypt.hash('Student@123', 10);
  const ragas = ['Yaman', 'Bhairav', 'Bhoopali', 'Khamaj', 'Kafi', 'Bhairavi', 'Bhimpalas', 'Malkauns'];
  const ragaProgress = ragas.map(r => ({ ragaName: r, status: 'Learning' }));

  const studentData = [
    { name: 'Kushal Patil',    email: 'kushal@gmail.com',    batchType: 'Gurukul Batch',  monthlyFee: 1200, ragaLevel: 'Intermediate' },
    { name: 'Priya Sharma',    email: 'priya@gmail.com',     batchType: 'Regular Class',  monthlyFee: 800,  ragaLevel: 'Beginner' },
    { name: 'Rohan Desai',     email: 'rohan@gmail.com',     batchType: 'Regular Class',  monthlyFee: 800,  ragaLevel: 'Beginner' },
    { name: 'Sneha Joshi',     email: 'sneha@gmail.com',     batchType: 'Gurukul Batch',  monthlyFee: 1200, ragaLevel: 'Advanced' },
    { name: 'Arjun Kulkarni',  email: 'arjun@gmail.com',     batchType: 'Regular Class',  monthlyFee: 800,  ragaLevel: 'Beginner' },
  ];

  const students = await User.insertMany(
    studentData.map(s => ({
      ...s,
      password: studentPass,
      role: 'student',
      isVerified: true,
      isFirstLogin: false,
      status: 'Active',
      joiningDate: new Date('2024-01-15'),
      ragaProgress
    })),
    { ordered: false }
  ).catch(e => {
    if (e.code === 11000) { console.log('   ⚠️  Some students already exist — skipping duplicates'); return []; }
    throw e;
  });
  console.log(`   ✅  students: inserted ${students.length}`);

  // 4. Sample attendance (last 7 days for each student)
  const allStudents = await User.find({ role: 'student' });
  const attDocs = [];
  for (const s of allStudents) {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(10, 0, 0, 0);
      attDocs.push({
        studentId:   s._id,
        studentName: s.name,
        date:        d,
        status:      Math.random() > 0.2 ? 'Present' : 'Absent'
      });
    }
  }
  if (attDocs.length > 0) {
    const att = await Attendance.insertMany(attDocs, { ordered: false });
    console.log(`   ✅  attendances: inserted ${att.length}`);
  }

  // 5. Sample fee records (current month)
  const now = new Date();
  const monthName = now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const dueDate   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const feeDocs   = allStudents.map(s => ({
    studentId:   s._id,
    studentName: s.name,
    month:       monthName,
    amount:      s.monthlyFee || 800,
    dueDate,
    status:      'Unpaid',
    paymentStatus: 'Unpaid'
  }));
  if (feeDocs.length > 0) {
    const fees = await Fee.insertMany(feeDocs, { ordered: false });
    console.log(`   ✅  fees: inserted ${fees.length}`);
  }

  // 6. Sample feedback (guru notes)
  const teacher = await User.findOne({ role: 'teacher' });
  if (teacher && allStudents.length > 0) {
    const notes = [
      { noteText: 'Excellent progress on Raag Yaman this week. Keep practicing the alaap section.', studentId: allStudents[0]?._id },
      { noteText: 'Focus on the meend technique in Raag Bhairav. Practice slowly with tanpura.', studentId: allStudents[1]?._id },
      { noteText: 'All students: Please revise the basic swaras before next class.', isGlobal: true },
    ];
    const fb = await Feedback.insertMany(
      notes.map(n => ({ teacherId: teacher._id, ...n, date: new Date() })),
      { ordered: false }
    );
    console.log(`   ✅  feedbacks: inserted ${fb.length}`);
  }

  // 7. Sample event
  const evCount = await Event.countDocuments();
  if (evCount === 0) {
    await Event.create({
      title:          'Raag Yaman Baithak',
      date:           new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      type:           'Baithak',
      description:    'Monthly student performance session. All students must participate.',
      feeAmount:      0,
      isMandatory:    true,
      locationOrLink: 'Kalashree Hall, Nashik',
      createdBy:      teacher?._id
    });
    console.log('   ✅  events: inserted 1');
  } else {
    console.log('   ⚠️  events: already exist — skipping');
  }
}

// ── Main ──────────────────────────────────────────────────
async function main() {
  await connect();

  if (CLEAR) await clearAll();

  if (FROM_JSON) {
    await seedFromJSON();
  } else {
    await seedSampleData();
  }

  console.log('\n🎉  Seeding complete!\n');
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
