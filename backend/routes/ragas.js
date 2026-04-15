const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const RagaList = require('../models/Raga');
const User = require('../models/user');

const JWT_SECRET = 'kalashree_secret_key';

function verifyTeacher(req, res) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
  if (decoded.role !== 'teacher') { res.status(403).json({ message: 'Forbidden' }); return null; }
  return decoded;
}

// GET /api/ragas — get global raga list (public, students can read)
router.get('/', async (req, res) => {
  try {
    let list = await RagaList.findOne();
    if (!list) {
      list = await RagaList.create({});
    }
    return res.json({ ragas: list.ragas });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// PUT /api/ragas — teacher updates global raga list
router.put('/', async (req, res) => {
  try {
    verifyTeacher(req, res);
    const { ragas } = req.body;
    if (!Array.isArray(ragas)) return res.status(400).json({ message: 'ragas must be an array' });

    let list = await RagaList.findOne();
    if (!list) list = new RagaList();
    list.ragas = ragas;
    await list.save();
    return res.json({ message: 'Raga list updated', ragas: list.ragas });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/ragas/:studentId/progress — get one student's raga progress
router.get('/:studentId/progress', async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId).select('ragaProgress name');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    return res.json({ ragaProgress: student.ragaProgress });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// PUT /api/ragas/:studentId/progress — teacher updates a student's raga statuses
// Body: { updates: [{ ragaName: 'Yaman', status: 'Mastered' }, ...] }
router.put('/:studentId/progress', async (req, res) => {
  try {
    verifyTeacher(req, res);
    const { updates } = req.body; // array of { ragaName, status }
    if (!Array.isArray(updates)) return res.status(400).json({ message: 'updates must be an array' });

    const student = await User.findById(req.params.studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Merge updates into existing ragaProgress
    updates.forEach(({ ragaName, status }) => {
      const existing = student.ragaProgress.find(r => r.ragaName === ragaName);
      if (existing) {
        existing.status = status;
      } else {
        student.ragaProgress.push({ ragaName, status });
      }
    });

    // Auto-calculate ragaLevel from mastered count
    const masteredCount = student.ragaProgress.filter(r => r.status === 'Mastered').length;
    if      (masteredCount >= 7) student.ragaLevel = 'Gurukul';
    else if (masteredCount >= 5) student.ragaLevel = 'Advanced';
    else if (masteredCount >= 3) student.ragaLevel = 'Intermediate';
    else                         student.ragaLevel = 'Beginner';

    await student.save();
    return res.json({ message: 'Progress updated', ragaProgress: student.ragaProgress, ragaLevel: student.ragaLevel });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
