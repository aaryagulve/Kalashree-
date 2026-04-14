const mongoose = require('mongoose');

// Simple User schema for our project
const userSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Student/Teacher name
  email: { type: String, required: true, unique: true }, // Login email (unique)
  password: { type: String, required: true }, // Hashed password (bcrypt)
  role: { type: String, default: 'student' }, // "student" or "teacher"
  ragaLevel: { type: String, default: 'Beginner' }, // Student raga learning level
  monthlyFee: { type: Number, default: 0 }, // Monthly fee amount
  status: { type: String, default: 'Active' }, // Active / Inactive etc.
  phone: { type: String }, // Student/Teacher phone number
  joiningDate: { type: Date, default: () => new Date() }, // Join date (today by default)
  practiceStreak: { type: Number, default: 0 },
  lastPracticeDate: { type: Date },
  practiceHistory: [{ type: Date }], // Array of all dates the student practiced
  isVerified: { type: Boolean, default: true }, // Teacher verifies student manually if needed
  isFirstLogin: { type: Boolean, default: true }, // Force password change on first login
  batchType: { type: String, enum: ['Gurukul Batch', 'Regular Class'], default: 'Regular Class' },
  ragaProgress: [{
    ragaName: { type: String, required: true },
    status: { type: String, enum: ['Learning', 'Practicing', 'Mastered'], default: 'Learning' }
  }]
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);