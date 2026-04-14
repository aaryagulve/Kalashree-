const express = require('express'); // Import Express
const router = express.Router(); // Create a router for student routes
const User = require('../models/User'); // Import the User model
const bcrypt = require('bcryptjs'); // For hashed passwords

// GET /api/students
// Fetch all students (users where role is "student")
router.get('/', async (req, res) => { // Handle GET request
  try { // Start try block
    const students = await User.find({ role: 'student' }); // Find all users with role student
    return res.json(students); // Send students as JSON response
  } catch (err) { // If any error happens
    return res.status(500).json({ message: err.message }); // Send error message
  } // End catch block
}); // End route

// GET /api/students/:id
// Fetch one student by id
router.get('/:id', async (req, res) => { // Handle GET request with id
  try { // Start try block
    const student = await User.findOne({ // Find one student
      _id: req.params.id, // Match id from URL
      role: 'student', // Only allow students
    }); // End filter object
    return res.json(student); // Send student as JSON response
  } catch (err) { // If any error happens
    return res.status(500).json({ message: err.message }); // Send error message
  } // End catch block
}); // End route

// PUT /api/students/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.name       !== undefined) updates.name       = req.body.name;
    if (req.body.phone      !== undefined) updates.phone      = req.body.phone;
    if (req.body.ragaLevel  !== undefined) updates.ragaLevel  = req.body.ragaLevel;
    if (req.body.status     !== undefined) updates.status     = req.body.status;
    if (req.body.batchType  !== undefined) updates.batchType  = req.body.batchType;

    // monthlyFee: use provided value if given, otherwise auto-set based on status
    if (req.body.monthlyFee !== undefined) {
      updates.monthlyFee = Number(req.body.monthlyFee);
    } else if (req.body.status !== undefined) {
      // Auto-set when status changes and no fee explicitly provided
      updates.monthlyFee = (req.body.status === 'Active') ? 800 : 0;
    }

    const updatedStudent = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'student' },
      updates,
      { new: true }
    );
    return res.json(updatedStudent);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// DELETE /api/students/:id
router.delete('/:id', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(auth.split(' ')[1], 'kalashree_secret_key');
    if (decoded.role !== 'teacher') {
      return res.status(403).json({ message: 'Forbidden. Only teachers can delete students.' });
    }

    const result = await User.deleteOne({ _id: req.params.id, role: 'student' });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Student not found.' });
    }
    return res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    console.error('Delete student error:', err.message);
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/students/add
// Teacher adds a new student from frontend
router.post('/add', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized. Token required.' });
    }
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, 'kalashree_secret_key'); // using project default secret
    if (decoded.role !== 'teacher') {
      return res.status(403).json({ message: 'Forbidden. Only teachers can add students.' });
    }

    const { name, email } = req.body;
    let { password } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    // Generate temp password if teacher didn't supply one
    const tempPassword = password || Math.random().toString(36).slice(-8) + 'K1';
    password = tempPassword;

    // Check if email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }

    // Hash the password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // Seed ragaProgress from current global list
    const RagaList = require('../models/Raga');
    let ragaList = await RagaList.findOne();
    if (!ragaList) ragaList = await RagaList.create({});
    const ragaProgress = ragaList.ragas.map(r => ({ ragaName: r, status: 'Learning' }));

    const newStudent = new User({
      name,
      email,
      password: hashedPassword,
      role: 'student',
      isVerified: true,
      isFirstLogin: true,
      batchType: req.body.batchType || 'Regular Class',
      monthlyFee: 800,  // Active by default → 800
      ragaProgress
    });

    await newStudent.save();
    return res.status(201).json({
      message: 'Student added successfully',
      studentId: newStudent._id,
      tempPassword   // plain text — shown once to teacher
    });
  } catch (err) {
    console.error('Error adding student:', err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router; // Export router so server.js can use it
