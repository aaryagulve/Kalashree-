/**
 * fix_fees.js
 * Sets monthlyFee = 800 for all Active students
 * Sets monthlyFee = 0 for Inactive/On Leave students
 * Run once: node fix_fees.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function fix() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log('Connected to:', mongoose.connection.host);

  // Set 800 for Active students
  const active = await User.updateMany(
    { role: 'student', status: { $in: ['Active', null, undefined] } },
    { $set: { monthlyFee: 800 } }
  );
  console.log(`✅  Active students updated to ₹800: ${active.modifiedCount}`);

  // Set 0 for Inactive / On Leave
  const inactive = await User.updateMany(
    { role: 'student', status: { $in: ['Inactive', 'On Leave'] } },
    { $set: { monthlyFee: 0 } }
  );
  console.log(`✅  Inactive students updated to ₹0: ${inactive.modifiedCount}`);

  // Verify
  const students = await User.find({ role: 'student' }, 'name status monthlyFee');
  console.log('\nCurrent fee status:');
  students.forEach(s => console.log(`  ${s.name.padEnd(25)} ${(s.status||'Active').padEnd(12)} ₹${s.monthlyFee}`));

  await mongoose.disconnect();
  console.log('\nDone.');
}

fix().catch(err => { console.error(err); process.exit(1); });
