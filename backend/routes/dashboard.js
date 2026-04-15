const express  = require('express');
const router   = express.Router();
const User       = require('../models/user');
const Homework   = require('../models/Homework');
const Attendance = require('../models/Attendance');

// ── helpers ──────────────────────────────────────────────
function monthStart() {
  const d = new Date();
  d.setDate(1); d.setHours(0,0,0,0);
  return d;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0,0,0,0);
  return d;
}

// ── GET /api/dashboard/student-insights ──────────────────
// Query: ?studentId=xxx
router.get('/student-insights', async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const student = await User.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // 1. Practice sessions this month — only audio file uploads count
    const submissionsThisMonth = await Homework.countDocuments({
      studentId,
      submissionType: 'upload',
      submittedAt: { $gte: monthStart() }
    });

    // 2. Current streak (already on user model)
    const streak = student.practiceStreak || 0;

    // 3. Raga completion %
    const ragaProgress  = student.ragaProgress || [];
    const total         = ragaProgress.length;
    const mastered      = ragaProgress.filter(r => r.status === 'Mastered').length;
    const ragaCompletionPct = total === 0 ? 0 : Math.round((mastered / total) * 100);

    // 4. Attendance this month
    const attRecords = await Attendance.find({
      studentId,
      date: { $gte: monthStart() }
    });
    const attTotal   = attRecords.length;
    const attPresent = attRecords.filter(r => r.status === 'Present').length;
    const attPct     = attTotal === 0 ? 0 : Math.round((attPresent / attTotal) * 100);

    // 5. Motivational message
    let motivation = 'Keep going — every raga takes time to bloom. 🌸';
    if (streak >= 7 && submissionsThisMonth >= 4)  motivation = 'Excellent consistency this week! You\'re on fire 🔥';
    else if (streak >= 3)                           motivation = 'Great streak! Keep the momentum going 🎵';
    else if (submissionsThisMonth >= 3)             motivation = 'Good practice sessions this month! Push for more 💪';
    else if (submissionsThisMonth === 0)            motivation = 'Let\'s start practicing — your Guru is waiting! 🎶';
    else                                            motivation = 'Increase your practice sessions for faster progress 📈';

    res.json({
      submissionsThisMonth,
      streak,
      ragaCompletionPct,
      total, mastered,
      attPct,
      motivation
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/dashboard/teacher-insights ──────────────────
// Requires Bearer token — only teachers can call this
router.get('/teacher-insights', async (req, res) => {
  try {
    // Verify teacher JWT
    const auth = req.headers.authorization;
    let teacherId = null;
    if (auth && auth.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(auth.split(' ')[1], 'kalashree_secret_key');
        if (decoded.role !== 'teacher') return res.status(403).json({ message: 'Forbidden' });
        teacherId = decoded.userId;
      } catch (e) {
        return res.status(401).json({ message: 'Invalid token' });
      }
    }

    // Strictly fetch only ACTIVE students — never include the teacher or inactive
    const query = { role: 'student', status: { $in: ['Active', null, undefined] } };
    if (teacherId) query._id = { $ne: teacherId };

    const students = await User.find(query);
    const total    = students.length;
    if (total === 0) return res.json({ total: 0, avgAttPct: 0, avgSubmissions: 0, needsAttention: [], topStudents: [] });

    const ids = students.map(s => s._id);

    // Attendance this month — per student
    const attRecords = await Attendance.find({
      studentId: { $in: ids },
      date: { $gte: monthStart() }
    });

    // Homework this month — only audio uploads count as practice
    const hwRecords = await Homework.find({
      studentId: { $in: ids },
      submissionType: 'upload',
      submittedAt: { $gte: monthStart() }
    });

    // Homework last 7 days — only audio uploads
    const hwLast7 = await Homework.find({
      studentId: { $in: ids },
      submissionType: 'upload',
      submittedAt: { $gte: daysAgo(7) }
    });
    const activeIds = new Set(hwLast7.map(h => h.studentId.toString()));

    // Per-student stats
    let totalAttPct = 0;
    let totalSubmissions = 0;
    const needsAttention = [];
    const studentStats = [];

    students.forEach(s => {
      const sid = s._id.toString();

      // Attendance
      const sAtt     = attRecords.filter(r => r.studentId.toString() === sid);
      const present  = sAtt.filter(r => r.status === 'Present').length;
      const attPct   = sAtt.length === 0 ? 0 : Math.round((present / sAtt.length) * 100);
      totalAttPct   += attPct;

      // Submissions this month
      const sHw = hwRecords.filter(h => h.studentId.toString() === sid).length;
      totalSubmissions += sHw;

      // Needs attention: no submission in last 7 days
      if (!activeIds.has(sid)) {
        needsAttention.push({ name: s.name, streak: s.practiceStreak || 0, attPct });
      }

      studentStats.push({ name: s.name, streak: s.practiceStreak || 0, submissions: sHw });
    });

    const avgAttPct      = Math.round(totalAttPct / total);
    const avgSubmissions = Math.round((totalSubmissions / total) * 10) / 10;

    // Top 5 by streak then submissions
    const topStudents = [...studentStats]
      .sort((a, b) => b.streak - a.streak || b.submissions - a.submissions)
      .slice(0, 5);

    res.json({ total, avgAttPct, avgSubmissions, needsAttention, topStudents });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
