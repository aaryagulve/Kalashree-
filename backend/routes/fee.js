const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const Fee     = require('../models/Fee');
const User    = require('../models/user');


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
    folder: 'kalashree/screenshots',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp']
  }
});

const screenshotUpload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});


function getMonthLabel() {
  const now = new Date(); 
  const monthNames = [ 
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
  ]; 
  const monthName = monthNames[now.getMonth()]; 
  const year = now.getFullYear(); 
  return monthName + ' ' + year; 
}


function getDueDateForCurrentMonth() {
  const now = new Date(); 
  const year = now.getFullYear(); 
  const month = now.getMonth(); 
  return new Date(year, month + 1, 0); 
}

router.post('/generate', async (req, res) => {
  try {
    console.log('Generate fee request received'); 

    const month = getMonthLabel(); 
    const dueDate = getDueDateForCurrentMonth(); 

   
    const students = await User.find({ role: 'student' }); 

    
    for (const student of students) {
      const active = !student.status || student.status === 'Active'; 

      if (!active) {
        continue; 
      }

      
      const existing = await Fee.findOne({
        studentId: student._id,
        month: month, 
      }); 

      if (existing) {
        continue;
      }

      const record = new Fee({
        studentId: student._id,
        studentName: student.name,
        month: month,
        amount: student.monthlyFee || 0,
        dueDate: dueDate,
        status: 'Unpaid',
        paidDate: null,
      });

      await record.save();
      console.log('Fee created for:', student.email);
    }

    return res.json({ message: 'Fee generation complete', month: month });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

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

router.get('/months', async (req, res) => {
  try {
    const months = await Fee.distinct('month');
    const sorted = months.sort((a, b) => {
      const da = new Date(a); const db = new Date(b);
      return db - da;
    });
    return res.json(sorted);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/student/:id', async (req, res) => {
  try {
    console.log('Get fee history for student');

    const studentId = req.params.id;

    const records = await Fee.find({ studentId: studentId }).sort({ dueDate: -1 });

    return res.json(records);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.put('/pay/:id', async (req, res) => {
  try {
    console.log('Mark fee as paid');

    const feeId = req.params.id;

    const updated = await Fee.findByIdAndUpdate(
      feeId,
      {
        status: 'Paid',
        paidDate: new Date(),
      },
      { new: true }
    );

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/defaulters', async (req, res) => {
  try {
    console.log('Get defaulters');

    const today = new Date();

    const records = await Fee.find({
      status: 'Unpaid',
      dueDate: { $lt: today },
    }).sort({ dueDate: -1 });

    return res.json(records);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.put('/request/:id', screenshotUpload.single('screenshot'), async (req, res) => {
  try {
    const feeId = req.params.id;
    const updateData = {
      status: 'Payment Requested',
      paymentStatus: 'Payment Requested',
      paymentRequestDate: new Date(),
      paymentMethod: req.body.paymentMethod || 'UPI'
    };
    if (req.file) updateData.screenshotPath = req.file.path;

    const updated = await Fee.findByIdAndUpdate(feeId, updateData, { new: true });
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.put('/confirm/:id', async (req, res) => {
  try {
    console.log('Teacher confirmed payment');

    const feeId = req.params.id;

    const updated = await Fee.findByIdAndUpdate(
      feeId,
      {
        status: 'Paid',
        paymentStatus: 'Paid',
        paidDate: new Date(),
      },
      { new: true }
    );

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.put('/reject/:id', async (req, res) => {
  try {
    console.log('Teacher rejected payment');

    const feeId = req.params.id;

    const updated = await Fee.findByIdAndUpdate(
      feeId,
      {
        status: 'Unpaid',
        paymentStatus: 'Rejected',
      },
      { new: true }
    );

    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/requests', async (req, res) => {
  try {
    console.log('Get all payment requests');

    const records = await Fee.find({ paymentStatus: 'Payment Requested' }).sort({ paymentRequestDate: -1 });

    return res.json(records);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.post('/confirm-bulk', async (req, res) => {
  try {
    const { ids } = req.body;
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

