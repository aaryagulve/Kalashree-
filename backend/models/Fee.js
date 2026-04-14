const mongoose = require('mongoose'); // Import mongoose

// Fee model for student monthly fees
const feeSchema = new mongoose.Schema({
  // This links the fee record to a student in User model
  studentId: {
    type: mongoose.Schema.Types.ObjectId, // MongoDB id type
    ref: 'User', // Reference to User collection
    required: true, // Must be provided
  },

  // Store student name for easy display
  studentName: { type: String }, // Optional

  // Month label like "March 2026"
  month: { type: String }, // Example March 2026

  // Fee amount for the month
  amount: { type: Number }, // Amount to pay

  // Due date for the fee
  dueDate: { type: Date }, // Due date

  // Either "Unpaid" or "Paid"
  status: { type: String, default: 'Unpaid' }, // Default unpaid

  // Date when fee is paid
  paidDate: { type: Date }, // When payment happened

  // Advanced flow: "Unpaid", "Payment Requested", "Paid", "Rejected"
  paymentStatus: { type: String, default: 'Unpaid' },

  // When the student clicked "I Have Paid"
  paymentRequestDate: { type: Date },

  // Screenshot of payment uploaded by student
  screenshotPath: { type: String, default: '' },
});

module.exports = mongoose.models.Fee || mongoose.model('Fee', feeSchema); // Export Fee model

