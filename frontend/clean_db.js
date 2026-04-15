const mongoose = require('mongoose');
const User = require('./backend/models/User');

mongoose.connect('mongodb://127.0.0.1:27017/kalashree').then(async () => {
  console.log('Connected to DB...');

  // List every email that was self-registered (not added by teacher)
  // Add any other rogue emails here before running
  const rogueEmails = [
    'riya@gmail.com',
    'priya@gmail.com',
    'riyaponde@gmail.com',
  ];

  const result = await User.deleteMany({ email: { $in: rogueEmails } });
  console.log(`Deleted ${result.deletedCount} unauthorised account(s).`);

  // Show who remains
  const remaining = await User.find({}, 'name email role');
  console.log('\nRemaining users:');
  remaining.forEach(u => console.log(` - ${u.role.padEnd(8)} ${u.email}  (${u.name})`));

  mongoose.connection.close();
}).catch(err => console.error(err));
