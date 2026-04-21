const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const Fee     = require('../models/Fee');
const User    = require('../models/user');

// ── Screenshot upload folder ──────────────────────────────
const screenshotDir = path.join(__dirname, '..', 'uploads', 'screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

const screenshotUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, screenshotDir),
    filename:    (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, 'pay-' + Date.now() + ext);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// Helper: get month label like "March 2026"
function getMonthLabel() {
  const now = new Date(); // Current date
  const monthNames = [ // Month names array
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]; // End month names array
  const monthName = monthNames[now.getMonth()]; // Get month name from index
  const year = now.getFullYear(); // Get current year
  return monthName + ' ' + year; // Example March 2026
}

// Helper: due date = last day of this month
function getDueDateForCurrentMonth() {
  const now = new Date(); // Current date
  const year = now.getFullYear(); // Current year
  const month = now.getMonth(); // Current month index (0-11)
  return new Date(year, month + 1, 0); // Last day of current month
}

// POST /api/fee/generate
// Generate fee records for all active students for current month
router.post('/generate', async (req, res) => {
  try {
    console.log('Generate fee request received'); // Log request

    const month = getMonthLabel(); // Current month label
    const dueDate = getDueDateForCurrentMonth(); // Due date for current month

    // 1) Get all students
    const students = await User.find({ role: 'student' }); // Simple fetch

    // 2) Loop and create fee records for each active student
    for (const student of students) {
      const active = !student.status || student.status === 'Active'; // Treat missing status as active

      if (!active) {
        continue; // Skip inactive students
      }

      // Check if fee already generated for this student + this month
      const existing = await Fee.findOne({
        studentId: student._id, // Match student
        month: month, // Match current month
      }); // End query

      if (existing) {
        continue; // Skip if already generated
      }

      // Create new fee record
      const record = new Fee({
        studentId: student._id, // Store student id
        studentName: student.name, // Store student name
        month: month, // Store month
        amount: student.monthlyFee || 0, // Take monthlyFee from student
        dueDate: dueDate, // Due date
        status: 'Unpaid', // Default unpaid
        paidDate: null, // Not paid yet
      }); // End record

      await record.save(); // Save fee to database
      console.log('Fee created for:', student.email); // Simple log
    } // End for loop

    return res.json({ message: 'Fee generation complete', month: month }); // Send response
  } catch (err) {
    return res.status(500).json({ message: err.message }); // Send error
  }
});

// GET /api/fee/all
// Get fee records — Active students only, with batchType
// Optional ?month=April 2026 to filter by specific month
router.get('/all', async (req, res) => {
  try {
    const month = req.query.month || getMonthLabel();

    const activeStudents = await User.find(
      { role: 'student', status: { $in: ['Active', null, undefined] } },
      '_id batchType'
    );
    const activeIds = activeStudents.map(s => s._id);
    const batchMap  = {};
    activeStudents.forEach(s => { batchMap[s._id.toString()] = s.batchType || 'Regular Class'; });

    const month = req.query.month || getMonthLabel();
    const query = { studentId: { $in: activeIds } };
    if (month !== 'all') {
      query.month = month;
    }

    const records = await Fee.find(query).sort({ dueDate: -1 });

    const enriched = records.map(r => {
      const obj = r.toObject();
      obj.batchType = batchMap[r.studentId.toString()] || 'Regular Class';
      return obj;
    });

    return res.json(enriched);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/fee/months
// Get list of all months that have fee records (for dropdown)
router.get('/months', async (req, res) => {
  try {
    const months = await Fee.distinct('month');
    // Sort newest first
    const sorted = months.sort((a, b) => {
      const da = new Date(a); const db = new Date(b);
      return db - da;
    });
    return res.json(sorted);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/fee/student/:id
// Get fee history for one student
router.get('/student/:id', async (req, res) => {
  try {
    console.log('Get fee history for student'); // Log request

    const studentId = req.params.id; // Read student id

    const records = await Fee.find({ studentId: studentId }).sort({ dueDate: -1 }); // Newest first

    return res.json(records); // Send history
  } catch (err) {
    return res.status(500).json({ message: err.message }); // Send error
  }
});

// PUT /api/fee/pay/:id
// Mark a fee record as paid and set paidDate to today
router.put('/pay/:id', async (req, res) => {
  try {
    console.log('Mark fee as paid'); // Log request

    const feeId = req.params.id; // Fee record id

    const updated = await Fee.findByIdAndUpdate(
      feeId, // Which fee record
      {
        status: 'Paid', // Mark as paid
        paidDate: new Date(), // Set paid date
      }, // Update fields
      { new: true } // Return updated record
    ); // End update

    return res.json(updated); // Send updated record
  } catch (err) {
    return res.status(500).json({ message: err.message }); // Send error
  }
});

// GET /api/fee/defaulters
// Get students whose fee status is Unpaid and due date has passed
router.get('/defaulters', async (req, res) => {
  try {
    console.log('Get defaulters'); // Log request

    const today = new Date(); // Today

    const records = await Fee.find({
      status: 'Unpaid', // Still unpaid
      dueDate: { $lt: today }, // Due date passed
    }).sort({ dueDate: -1 }); // Newest first

    return res.json(records); // Send defaulter fee records
  } catch (err) {
    return res.status(500).json({ message: err.message }); // Send error
  }
});

// PUT /api/fee/request/:id  (with optional screenshot upload)
router.put('/request/:id', screenshotUpload.single('screenshot'), async (req, res) => {
  try {
    const feeId = req.params.id;
    const updateData = {
      status: 'Payment Requested',
      paymentStatus: 'Payment Requested',
      paymentRequestDate: new Date(),
      paymentMethod: req.body.paymentMethod || 'UPI'
    };
    if (req.file) updateData.screenshotPath = req.file.filename;

    const updated = await Fee.findByIdAndUpdate(feeId, updateData, { new: true });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// PUT /api/fee/confirm/:id
// Teacher confirms payment
router.put('/confirm/:id', async (req, res) => {
  try {
    console.log('Teacher confirmed payment'); // Log request

    const feeId = req.params.id; // Fee record id

    const updated = await Fee.findByIdAndUpdate(
      feeId, // Which fee record
      {
        status: 'Paid', // Mark as paid
        paymentStatus: 'Paid', // Advanced flow
        paidDate: new Date(), // Set paid date
      }, // Update fields
      { new: true } // Return updated record
    ); // End update

    return res.json(updated); // Send updated record
  } catch (err) {
    return res.status(500).json({ message: err.message }); // Send error
  }
});

// PUT /api/fee/reject/:id
// Teacher rejects payment
router.put('/reject/:id', async (req, res) => {
  try {
    console.log('Teacher rejected payment'); // Log request

    const feeId = req.params.id; // Fee record id

    const updated = await Fee.findByIdAndUpdate(
      feeId, // Which fee record
      {
        status: 'Unpaid', // Revert to unpaid
        paymentStatus: 'Rejected', // Mark as rejected for student to see
      }, // Update fields
      { new: true } // Return updated record
    ); // End update

    return res.json(updated); // Send updated record
  } catch (err) {
    return res.status(500).json({ message: err.message }); // Send error
  }
});

// GET /api/fee/requests
// Get all payment requested fees for teacher
router.get('/requests', async (req, res) => {
  try {
    console.log('Get all payment requests'); // Log request

    const records = await Fee.find({ paymentStatus: 'Payment Requested' }).sort({ paymentRequestDate: -1 }); // Newest requests first

    return res.json(records); // Send fee requests
  } catch (err) {
    return res.status(500).json({ message: err.message }); // Send error
  }
});

// POST /api/fee/confirm-bulk
// Teacher confirms multiple payments at once
router.post('/confirm-bulk', async (req, res) => {
  try {
    const { ids } = req.body; // array of fee IDs
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No IDs provided' });
    await Fee.updateMany(
      { _id: { $in: ids } },
      { status: 'Paid', paymentStatus: 'Paid', paidDate: new Date() }
    );
    return res.json({ message: `${ids.length} payment(s) confirmed` });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;

