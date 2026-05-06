const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');


const JWT_SECRET = 'kalashree_secret_key';


router.post('/register', async (req, res) => {
  return res.status(403).json({ message: 'Student registration is closed. Only teachers can add students.' });
});


router.post('/login', async (req, res) => {
  try {
    
    const email = req.body.email;
    const password = req.body.password;

    console.log('Login request:', { email });

   
    if (!email || !password) {
      return res.status(400).json({ message: 'Please fill email and password' });
    }

    
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

   
    if (user.role === 'teacher') {
      const allowedTeacherEmails = ['apgulve370123@kkwagh.edu.in', 'sachinnimonkar@gmail.com', 'ashishranade@gmail.com'];
      if (!allowedTeacherEmails.includes(user.email)) {
        return res.status(403).json({ message: 'Unauthorized teacher email address.' });
      }
    }

   
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    
    if (user.isVerified === false) {
      return res.status(403).json({ message: 'Your account is not verified yet. Please contact your Guru.' });
    }

   
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    console.log('Login success:', user.email);
    return res.json({ message: 'Login successful', token: token, role: user.role, name: user.name, userId: user._id, isFirstLogin: user.isFirstLogin || false });
  } catch (err) {
    console.log('Login error:', err.message);
    return res.status(500).json({ message: err.message });
  }
});


router.put('/change-password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) return res.status(400).json({ message: 'userId and newPassword required' });
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(userId, { password: hashed, isFirstLogin: false });
    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;