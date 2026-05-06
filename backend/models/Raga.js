const mongoose = require('mongoose');


const ragaSchema = new mongoose.Schema({
  ragas: {
    type: [String],
    default: ['Yaman', 'Bhairav', 'Bhoopali', 'Khamaj', 'Kafi', 'Bhairavi', 'Bhimpalas', 'Malkauns']
  }
});

module.exports = mongoose.models.RagaList || mongoose.model('RagaList', ragaSchema);
