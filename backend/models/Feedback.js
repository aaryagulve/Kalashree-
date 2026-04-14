const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  isGlobal: {
    type: Boolean,
    default: false,
  },
  noteText: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
