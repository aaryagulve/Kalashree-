const mongoose = require('mongoose'); 


const feeSchema = new mongoose.Schema({
  
  studentId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
  },

 
  studentName: { type: String }, 

  
  month: { type: String }, 

 
  amount: { type: Number }, 

  
  dueDate: { type: Date }, 

  
  status: { type: String, default: 'Unpaid' }, 

  
  paidDate: { type: Date }, 

  
  paymentStatus: { type: String, default: 'Unpaid' },

  
  paymentRequestDate: { type: Date },

  
  screenshotPath: { type: String, default: '' },

  
  paymentMethod: { type: String, default: 'UPI' },
});

module.exports = mongoose.models.Fee || mongoose.model('Fee', feeSchema); 

