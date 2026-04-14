const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
  studentId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:           { type: String, required: true },
  fileUrl:         { type: String, default: '' },       // external link (Google Drive, YouTube)
  audioFilePath:   { type: String, default: '' },       // uploaded audio filename
  submissionType:  { type: String, enum: ['link', 'upload'], default: 'link' },
  submittedAt:     { type: Date, default: () => new Date() },
  teacherFeedback: { type: String, default: '' },
  status:          { type: String, default: 'Pending' },
  isReviewed:      { type: Boolean, default: false },
  reviewedAt:      { type: Date }   // set when teacher gives feedback
});

module.exports = mongoose.models.Homework || mongoose.model('Homework', homeworkSchema);
