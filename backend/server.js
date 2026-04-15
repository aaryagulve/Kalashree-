require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');

const app = express();

// ── CORS ──────────────────────────────────────────────────
const corsOptions = {
  origin: 'https://kalashree.vercel.app',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// ── Body parser ───────────────────────────────────────────
app.use(express.json());

// ── Static uploads ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── MongoDB ───────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => { console.error('MongoDB error:', err.message); process.exit(1); });

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
  res.json({ status: 'ok', db: mongoose.connection.host });
});

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log('Server running on port ' + PORT));
