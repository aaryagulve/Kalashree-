const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true }, 
  email: { type: String, required: true, unique: true }, 
  password: { type: String, required: true }, 
  role: { type: String, default: 'student' }, 
  ragaLevel: { type: String, default: 'Beginner' }, 
  monthlyFee: { type: Number, default: 0 }, 
  status: { type: String, default: 'Active' }, 
  phone: { type: String }, 
  joiningDate: { type: Date, default: () => new Date() }, 
  practiceStreak: { type: Number, default: 0 },
  lastPracticeDate: { type: Date },
  practiceHistory: [{ type: Date }], 
  isVerified: { type: Boolean, default: true }, 
  isFirstLogin: { type: Boolean, default: true }, 
  batchType: { type: String, enum: ['Gurukul Batch', 'Regular Class'], default: 'Regular Class' },
  ragaProgress: [{
    ragaName: { type: String, required: true },
    status: { type: String, enum: ['Learning', 'Practicing', 'Mastered'], default: 'Learning' }
  }]
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);