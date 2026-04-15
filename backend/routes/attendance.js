const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/user'); // Moved to top

// POST /api/attendance/mark
router.post('/mark', async (req, res) => {
  try {
    const { studentId, studentName, status, date } = req.body;

    console.log('Marking attendance for:', studentName);

    const record = new Attendance({
      studentId,
      studentName,
      status,
      date: date ? new Date(date) : new Date()
    });

    await record.save();
    return res.json({ message: 'Attendance saved', record });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/today
router.get('/today', async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      date: { $gte: start, $lte: end },
    }).sort({ date: -1 });

    return res.json(records);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/student/:id
router.get('/student/:id', async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.params.id }).sort({ date: -1 });
    return res.json(records);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/percentage/:id
router.get('/percentage/:id', async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.params.id });
    const total = records.length;
    const present = records.filter((r) => r.status === 'Present').length;
    const percentage = total === 0 ? 0 : (present / total) * 100;

    return res.json({ studentId: req.params.id, totalRecords: total, presentRecords: present, percentage });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/attendance/weekly-progress/:id
router.get('/weekly-progress/:id', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const expectedPerWeek = student.batchType === 'Gurukul Batch' ? 6 : 2;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    const records = await Attendance.find({
      studentId: req.params.id,
      date: { $gte: monday }
    });

    const present = records.filter(r => r.status === 'Present').length;
    
    return res.json({
      batchType: student.batchType || 'Regular Class',
      expectedPerWeek,
      presentThisWeek: present,
      markedThisWeek: records.length,
      weekStart: monday
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;