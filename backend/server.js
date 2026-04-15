require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ── 1. CORS CONFIGURATION ──────────────────────────────────
// Strictly allow your Vercel URL (ensure NO trailing slash)
app.use(cors({
  origin: 'https://kalashree.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── 2. MIDDLEWARE ──────────────────────────────────────────
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── 3. DATABASE CONNECTION ────────────────────────────────
const mongoURI = process.env.MONGO_URL;

if (!mongoURI) {
  console.error('CRITICAL ERROR: MONGO_URL is missing in Environment Variables!');
  // Don't exit here, let it try to connect so Render doesn't loop forever
}

mongoose
  .connect(mongoURI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// ── 4. ROUTE IMPORTS ──────────────────────────────────────
// Importing first to catch any file-not-found errors immediately
try {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/students', require('./routes/students'));
  app.use('/api/attendance', require('./routes/attendance'));
  app.use('/api/fee', require('./routes/fee'));
  app.use('/api/practice', require('./routes/practice'));
  app.use('/api/ragas', require('./routes/ragas'));
  app.use('/api/homework', require('./routes/homework'));
  app.use('/api/feedback', require('./routes/feedback'));
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/events', require('./routes/events'));
} catch (error) {
  console.error('❌ Route Loading Error:', error.message);
}

// ── 5. HEALTH CHECKS ──────────────────────────────────────
// Root route so you can visit kalashree.onrender.com and see a message
app.get('/', (req, res) => {
  res.status(200).send('Kalashree Backend is Live 🚀');
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

// ── 6. START SERVER ───────────────────────────────────────
// Render provides the PORT, we just listen to it.
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});