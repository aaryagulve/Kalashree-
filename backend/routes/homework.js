const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const Homework = require('../models/Homework');


const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ── Cloudinary Config ─────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ── Multer Config (Cloudinary) ────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'kalashree/audio',
    resource_type: 'video',
    allowed_formats: ['mp3', 'wav', 'm4a', 'mp4']
  }
});

const audioUpload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/') || file.mimetype === 'video/mp4') {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed (MP3, WAV, M4A, MP4)'));
    }
  }
});

// ── POST /api/homework/submit ─────────────────────────────
router.post('/submit', audioUpload.single('audioFile'), async (req, res) => {
  try {
    const { studentId, title, fileUrl, submissionType } = req.body;

    if (!studentId || !title) {
      return res.status(400).json({ message: 'studentId and title are required' });
    }

    const type = req.file ? 'upload' : (submissionType || 'link');

    if (type === 'link' && !fileUrl) {
      return res.status(400).json({ message: 'Please provide an audio/video link' });
    }

    const homework = new Homework({
      studentId,
      title,
      fileUrl:        type === 'link'   ? (fileUrl || '') : '',
      audioFilePath:  type === 'upload' ? req.file.path : '',
      submissionType: type
    });

    await homework.save();

    if (type === 'upload' && req.file) {
      const User = require('../models/user');
      const student = await User.findById(studentId);
      if (student) {
        const today = new Date(); today.setHours(0,0,0,0);
        const alreadyToday = (student.practiceHistory || []).some(d => {
          const pd = new Date(d); pd.setHours(0,0,0,0);
          return pd.getTime() === today.getTime();
        });
        if (!alreadyToday) {
          let streak = student.practiceStreak || 0;
          if (student.lastPracticeDate) {
            const last = new Date(student.lastPracticeDate); last.setHours(0,0,0,0);
            const diff = Math.round((today - last) / (1000*60*60*24));
            streak = diff === 1 ? streak + 1 : 1;
          } else {
            streak = 1;
          }
          student.practiceStreak    = streak;
          student.lastPracticeDate  = new Date();
          student.practiceHistory   = [...(student.practiceHistory || []), new Date()];
          await student.save();
        }
      }
    }

    res.status(201).json({ message: 'Practice submitted successfully', homework });

  } catch (err) {
    console.error('Homework submit error:', err.message);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// ── GET /api/homework/student/:studentId ──────────────────
router.get('/student/:studentId', async (req, res) => {
  try {
    const homework = await Homework.find({ studentId: req.params.studentId }).sort({ submittedAt: -1 });
    res.json(homework);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/homework ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filter = req.query.filter || 'pending';
    let query = {};
    if (filter === 'pending')  query = { isReviewed: false };
    if (filter === 'reviewed') query = { isReviewed: true };
    const homework = await Homework.find(query)
      .populate('studentId', 'name email ragaLevel')
      .sort({ submittedAt: -1 });
    res.json(homework);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── PUT /api/homework/:id/feedback ────────────────────────
router.put('/:id/feedback', async (req, res) => {
  try {
    const homework = await Homework.findById(req.params.id);
    if (!homework) return res.status(404).json({ message: 'Homework not found' });

    homework.teacherFeedback = req.body.feedback;
    homework.status     = 'Reviewed';
    homework.isReviewed = true;
    homework.reviewedAt = new Date();
    await homework.save();

    res.json({ message: 'Feedback added successfully', homework });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
