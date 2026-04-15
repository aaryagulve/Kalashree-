// ── Load environment variables FIRST ─────────────────────
require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const helmet   = require('helmet');
const path     = require('path');

const app = express();

// ── Security headers ──────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────
const allowedOrigins = [
  'https://kalashree.vercel.app',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, mobile apps, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// ── Body parser ───────────────────────────────────────────
app.use(express.json());

// ── Static uploads ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── MongoDB Connection ────────────────────────────────────
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('❌  MONGO_URL is not set in environment variables.');
  process.exit(1);
}

mongoose
  .connect(MONGO_URL)
  .then(() => {
    const host = mongoose.connection.host;
    console.log(`✅  MongoDB connected → ${host}`);
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
  res.json({
    status: 'ok',
    database: mongoose.connection.host,
    usingAtlas: !mongoose.connection.host.includes('localhost'),
  });
});

// ── Global error handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

// ── Unhandled promise rejections ──────────────────────────
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});

// ── Start server — bind to 0.0.0.0 for Render ────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀  Server running on port ${PORT}`);
});
