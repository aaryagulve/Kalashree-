const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/user'); 

router.post('/mark', async (req, res) => {
  try {
    const { studentId, studentName, status, date } = req.body;

    // Normalize date: Always use YYYY-MM-DD at 00:00:00.000
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    // Using findOneAndUpdate with upsert:true is the standard way to prevent duplicates
    // combined with the Unique Index in the model, this is foolproof.
    const record = await Attendance.findOneAndUpdate(
      { studentId, date: targetDate },
      { studentName, status, date: targetDate },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.json({ message: 'Attendance saved', record });
  } catch (err) {
    console.error('Mark attendance error:', err);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/today', async (req, res) => {
  try {
    const targetDate = req.query.date ? new Date(req.query.date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const records = await Attendance.find({ date: targetDate }).sort({ studentName: 1 });

    // Deduplicate in memory just in case legacy duplicates exist
    const uniqueRecords = [];
    const seen = new Set();
    records.forEach(r => {
      if (!seen.has(r.studentId.toString())) {
        seen.add(r.studentId.toString());
        uniqueRecords.push(r);
      }
    });

    return res.json(uniqueRecords);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/student/:id', async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.params.id }).sort({ date: -1 });
    
    // Deduplicate by date string to hide duplicates from student side
    const uniqueByDate = [];
    const seenDates = new Set();
    records.forEach(r => {
      const dStr = new Date(r.date).toDateString();
      if (!seenDates.has(dStr)) {
        seenDates.add(dStr);
        uniqueByDate.push(r);
      }
    });

    return res.json(uniqueByDate);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

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
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let presentToday = false;
    let markedToday = false;

    records.forEach(r => {
      const rDate = new Date(r.date);
      rDate.setHours(0, 0, 0, 0);
      if (rDate.getTime() === today.getTime()) {
        markedToday = true;
        if (r.status === 'Present') presentToday = true;
      }
    });

    return res.json({
      batchType: student.batchType || 'Regular Class',
      expectedPerWeek,
      presentThisWeek: present,
      markedThisWeek: records.length,
      weekStart: monday,
      markedToday,
      presentToday
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;