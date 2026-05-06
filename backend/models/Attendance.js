const mongoose = require('mongoose'); 


const attendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
  },
  studentName: { type: String }, 
  date: { type: Date, required: true }, 
  status: { type: String }, 
});

// Ensure a student can only have one attendance record per day
attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

// Normalize date to midnight before saving
attendanceSchema.pre('save', function(next) {
  if (this.date) {
    this.date.setHours(0, 0, 0, 0);
  }
  next();
});

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

