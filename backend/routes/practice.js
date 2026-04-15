const express = require('express');
const router = express.Router();
const User = require('../models/User');

// @route   PUT /api/practice/mark-done
// @desc    Mark practice done for a student and update streak
router.put('/mark-done', async (req, res) => {
  try {
    const { studentId, date } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    const user = await User.findById(studentId);
    if (!user) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Use provided date or today
    const practiceDate = date ? new Date(date) : new Date();
    practiceDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if this date is already in practiceHistory
    const alreadyMarked = (user.practiceHistory || []).some(d => {
      const pd = new Date(d);
      pd.setHours(0, 0, 0, 0);
      return pd.getTime() === practiceDate.getTime();
    });

    if (alreadyMarked) {
      return res.status(200).json({ message: 'Practice already marked for this date', streak: user.practiceStreak || 0 });
    }

    let streak = user.practiceStreak || 0;
    
    // Check last practice date
    if (user.lastPracticeDate) {
      const lastDate = new Date(user.lastPracticeDate);
      lastDate.setHours(0, 0, 0, 0);

      const diffTime = Math.abs(practiceDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return res.status(200).json({ message: 'Already marked practice for this date', streak });
      } else if (diffDays === 1) {
        streak += 1;
      } else {
        streak = 1;
      }
    } else {
      streak = 1;
    }

    user.practiceStreak = streak;
    user.lastPracticeDate = practiceDate;
    if (!user.practiceHistory) user.practiceHistory = [];
    user.practiceHistory.push(practiceDate);

    await user.save();

    res.json({ message: 'Practice marked successfully', streak: user.practiceStreak });
  } catch (error) {
    console.error('Error marking practice:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/practice/:studentId
// @desc    Get current practice streak
router.get('/:studentId', async (req, res) => {
  try {
    const user = await User.findById(req.params.studentId);
    if (!user) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Calculate if streak is still active
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let isStreakActive = false;
    let didPracticeToday = false;
    
    if (user.lastPracticeDate) {
      const lastDate = new Date(user.lastPracticeDate);
      lastDate.setHours(0, 0, 0, 0);
      
      const diffTime = today - lastDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        didPracticeToday = true;
        isStreakActive = true;
      } else if (diffDays === 1) {
        isStreakActive = true;
      }
    }
    
    // If they missed more than 1 day, actual streak is 0 visually
    const currentStreak = isStreakActive ? (user.practiceStreak || 0) : 0;
    
    res.json({ 
      streak: currentStreak, 
      didPracticeToday: didPracticeToday,
      totalRecord: user.practiceStreak || 0 
    });
  } catch (error) {
    console.error('Error getting practice streak:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/practice/stats/weekly
// @desc    Get practice counts for the last 7 days across all students
router.get('/stats/weekly', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' });

    // Build last 7 days array (oldest → newest)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    // Label each day as "Mon 30", "Tue 31" etc.
    const labels = days.map(d =>
      d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
    );

    // Count practices per day
    const dayCounts = new Array(7).fill(0);

    students.forEach(student => {
      if (!student.practiceHistory) return;
      student.practiceHistory.forEach(date => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        days.forEach((day, idx) => {
          if (d.getTime() === day.getTime()) dayCounts[idx]++;
        });
      });
    });

    res.json({ labels, dayCounts });
  } catch (error) {
    console.error('Error getting weekly stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
