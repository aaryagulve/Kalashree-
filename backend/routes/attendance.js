const express = require('express'); // Import express
const router = express.Router(); // Create a router
const Attendance = require('../models/Attendance'); // Import Attendance model

// POST /api/attendance/mark
// Save one attendance record
router.post('/mark', async (req, res) => {
  try {
    // Read values from frontend
    const studentId = req.body.studentId; // Student id
    const studentName = req.body.studentName; // Student name
    const status = req.body.status; // "Present" or "Absent"
    const date = req.body.date; // Use incoming date if exists

    console.log('Mark attendance:', { studentId, studentName, status, date }); // Simple log

    // Create one attendance document
    const record = new Attendance({
      studentId: studentId, // Save student id
      studentName: studentName, // Save student name
      status: status, // Save status
      ...(date && { date: new Date(date) }) // Apply selected date
    });

    // Save to MongoDB
    await record.save();

    // Send back success
    return res.json({ message: 'Attendance saved', record: record });
  } catch (err) {
    // Send error message
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/today
// Get all attendance records for today's date
router.get('/today', async (req, res) => {
  try {
    // Get today's start and end timestamps
    const start = new Date(); // Create a new date object
    start.setHours(0, 0, 0, 0); // Set time to 00:00:00

    const end = new Date(); // Create another date object
    end.setHours(23, 59, 59, 999); // Set time to 23:59:59.999

    // Find records for today
    const records = await Attendance.find({
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    // Send back today's records
    return res.json(records);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/student/:id
// Get all attendance records for one student
router.get('/student/:id', async (req, res) => {
  try {
    // Read student id from URL
    const studentId = req.params.id; // Student id

    // Find records for this student
    const records = await Attendance.find({ studentId: studentId }).sort({
      date: -1,
    });

    // Send back records
    return res.json(records);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/percentage/:id
// Calculate attendance percentage for one student
router.get('/percentage/:id', async (req, res) => {
  try {
    // Read student id from URL
    const studentId = req.params.id; // Student id

    // Get all attendance records for that student
    const records = await Attendance.find({ studentId: studentId });

    // Count present and total
    const total = records.length; // Total records
    const present = records.filter((r) => r.status === 'Present').length; // Present count

    // Calculate percentage
    const percentage = total === 0 ? 0 : (present / total) * 100; // Simple formula

    // Send back result
    return res.json({
      studentId: studentId,
      totalRecords: total,
      presentRecords: present,
      percentage: percentage,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/weekly-progress/:id
// Returns this week's expected vs actual attendance based on batchType
router.get('/weekly-progress/:id', async (req, res) => {
  try {
    const User = require('../models/User');
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Expected classes per week based on batch
    const isGurukul = student.batchType === 'Gurukul Batch';
    const expectedPerWeek = isGurukul ? 6 : 2;

    // Get this week's Monday to today
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const records = await Attendance.find({
      studentId: req.params.id,
      date: { $gte: monday }
    });

    const present = records.filter(r => r.status === 'Present').length;
    const total   = records.length;

    return res.json({
      batchType: student.batchType || 'Regular Class',
      expectedPerWeek,
      presentThisWeek: present,
      markedThisWeek: total,
      weekStart: monday
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Export router
module.exports = router;

