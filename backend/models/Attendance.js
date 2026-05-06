const mongoose = require('mongoose'); 


const attendanceSchema = new mongoose.Schema({

  studentId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
  },

  
  studentName: { type: String }, 

 
  date: { type: Date, default: () => new Date() }, 

 
  status: { type: String }, 
});


module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);

