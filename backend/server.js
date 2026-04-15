const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

// ── Load .env FIRST before anything else ──────────────────
require('dotenv').config();

const app = express();

// ── CORS ──────────────────────────────────────────────────
app.use(cors({ origin: 'https://kalashree.vercel.app/', credentials: true }));

// ── Body parser ───────────────────────────────────────────
app.use(express.json());

// ── Static uploads ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── MongoDB Connection ────────────────────────────────────
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('❌  MONGO_URL is not set in .env — server cannot start.');
  process.exit(1); // Hard stop — no silent fallback to localhost
}

console.log('🔗  Connecting to:', MONGO_URL.includes('localhost') ? '⚠️  LOCAL MongoDB' : '☁️  MongoDB ATLAS');

mongoose
  .connect(MONGO_URL)
  .then(() => {
    const host = mongoose.connection.host;
    console.log(`✅  MongoDB connected → ${host}`);
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
      console.warn('⚠️  WARNING: Connected to LOCAL MongoDB, not Atlas!');
    } else {
      console.log('☁️  Confirmed: Using MongoDB ATLAS');
    }
  })
  .catch((err) => {
    console.error('❌  MongoDB connection FAILED:', err.message);
    process.exit(1);
  });

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/students',   require('./routes/students'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/fee',        require('./routes/fee'));
app.use('/api/practice',   require('./routes/practice'));
app.use('/api/ragas',      require('./routes/ragas'));
app.use('/api/homework',   require('./routes/homework'));
app.use('/api/feedback',   require('./routes/feedback'));
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api/events',     require('./routes/events'));

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const host = mongoose.connection.host;
  res.json({
    status: 'ok',
    database: host,
    usingAtlas: !host.includes('localhost')
  });
});

// ── Start server ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀  Server running on port ${PORT}`));
