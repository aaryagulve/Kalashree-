require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({
  origin: [
    'https://kalashree.vercel.app',
    'https://kalashreemusic.in',
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:5500',  
    'http://localhost:5500'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const mongoURI = process.env.MONGO_URL;
mongoose.connect(mongoURI)
  .then(() => console.log(' MongoDB connected'))
  .catch((err) => console.error(' MongoDB error:', err.message));

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

app.get('/', (req, res) => {
  res.send('Kalashree API is running...');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(` Server listening on port ${PORT}`);
});
