const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title:          { type: String, required: true },
  date:           { type: Date,   required: true },
  type:           { type: String, enum: ['Baithak', 'Workshop', 'Recital', 'Festival'], default: 'Baithak' },
  description:    { type: String, default: '' },
  feeAmount:      { type: Number, default: 0 },
  isMandatory:    { type: Boolean, default: false },
  locationOrLink: { type: String, default: '' },
  poster:         { type: String, default: '' },
  createdBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt:      { type: Date, default: () => new Date() },
  attendees: [{
    studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    studentName: { type: String },
    rsvpAt:      { type: Date, default: () => new Date() }
  }]
});

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);
