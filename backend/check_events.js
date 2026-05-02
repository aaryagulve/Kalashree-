const mongoose = require('mongoose');
require('dotenv').config();
const Event = require('./models/Event');

async function run() {
  await mongoose.connect(process.env.MONGO_URL);
  const events = await Event.find({});
  console.log('Events in DB:');
  events.forEach(e => {
    console.log(`- ID: ${e._id}, Title: ${e.title}, Poster: ${e.poster}`);
  });
  mongoose.connection.close();
}
run();
