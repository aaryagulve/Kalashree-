const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

router.post('/send', async (req, res) => {
  try {
    const { teacherId, studentId, noteText, isGlobal } = req.body;

    if (!noteText) {
      return res.status(400).json({ message: 'Note text is required.' });
    }

    const feedback = new Feedback({
      teacherId: teacherId || null,
      studentId: studentId === 'ALL' ? null : studentId,
      noteText,
      isGlobal: isGlobal || studentId === 'ALL',
    });

    await feedback.save();
    return res.status(201).json({ message: 'Note saved successfully.', feedback });
  } catch (err) {
    console.error('Error saving feedback:', err);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/teacher', async (req, res) => {
  try {
    const records = await Feedback.find()
      .populate('studentId', 'name')
      .sort({ date: -1 });
    return res.json(records);
  } catch (err) {
    console.error('Error fetching teacher feedback:', err);
    return res.status(500).json({ message: err.message });
  }
});

router.get('/student/:id', async (req, res) => {
  try {
    const studentId = req.params.id;
    const records = await Feedback.find({
      $or: [{ studentId: studentId }, { isGlobal: true }],
    }).sort({ date: -1 });
    
    return res.json(records);
  } catch (err) {
    console.error('Error fetching student feedback:', err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
