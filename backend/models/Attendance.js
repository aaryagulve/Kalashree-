const mongoose = require('mongoose'); // Import mongoose for MongoDB schema

// Attendance schema
const attendanceSchema = new mongoose.Schema({
  // The student id (reference to User model)
  studentId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB ObjectId type
    ref: 'User', // This points to the User collection
    required: true, // Must be provided when marking attendance
  },

  // Student name (kept as plain string for easy display)
  studentName: { type: String }, // Name of student at the time of marking

  // Date of attendance (defaults to today)
  date: { type: Date, default: () => new Date() }, // Auto set to current date

  // Attendance status: "Present" or "Absent"
  status: { type: String }, // Stored as string
});

// Export Attendance model
module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

