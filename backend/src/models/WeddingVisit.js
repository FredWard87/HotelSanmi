const mongoose = require('mongoose');

const WeddingVisitSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  guests: { type: Number, default: 0 },
  eventDate: { type: Date, required: true },
  message: { type: String },
  status: { type: String, enum: ['pending','confirmed','cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WeddingVisit', WeddingVisitSchema);
