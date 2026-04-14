const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const jwt     = require('jsonwebtoken');
const Event   = require('../models/Event');

const JWT_SECRET = 'kalashree_secret_key';

// ── Multer config ─────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'poster-' + Date.now() + ext);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// ── Auth helper ───────────────────────────────────────────
function requireTeacher(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    if (decoded.role !== 'teacher') return res.status(403).json({ message: 'Only teachers can manage events' });
    req.teacher = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// ── POST /api/events ──────────────────────────────────────
router.post('/', requireTeacher, upload.single('poster'), async (req, res) => {
  try {
    const { title, date, type, description, feeAmount, isMandatory, locationOrLink } = req.body;
    if (!title || !date) return res.status(400).json({ message: 'Title and date are required' });

    const event = new Event({
      title,
      date:           new Date(date),
      type:           type || 'Baithak',
      description:    description || '',
      feeAmount:      Number(feeAmount) || 0,
      isMandatory:    isMandatory === 'true' || isMandatory === true,
      locationOrLink: locationOrLink || '',
      poster:         req.file ? req.file.filename : '',
      createdBy:      req.teacher.userId
    });

    await event.save();
    res.status(201).json({ message: 'Event created successfully', event });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/events ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/events/:id ────────────────────────────────
router.delete('/:id', requireTeacher, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/events/:id/attend ───────────────────────────
// Student RSVPs to an event
router.post('/:id/attend', async (req, res) => {
  try {
    const { studentId, studentName } = req.body;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Prevent duplicate RSVP
    const already = event.attendees.find(a => a.studentId.toString() === studentId);
    if (already) return res.json({ message: 'Already registered', attendees: event.attendees });

    event.attendees.push({ studentId, studentName: studentName || 'Student' });
    await event.save();
    res.json({ message: 'RSVP confirmed', attendees: event.attendees });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/events/:id/attend ─────────────────────────
// Student cancels RSVP
router.delete('/:id/attend', async (req, res) => {
  try {
    const { studentId } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.attendees = event.attendees.filter(a => a.studentId.toString() !== studentId);
    await event.save();
    res.json({ message: 'RSVP cancelled', attendees: event.attendees });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/events/:id/attendees ─────────────────────────
// Teacher views who is attending
router.get('/:id/attendees', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select('title date attendees');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ title: event.title, date: event.date, attendees: event.attendees });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
