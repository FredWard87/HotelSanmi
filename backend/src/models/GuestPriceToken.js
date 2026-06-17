const mongoose = require('mongoose');

const GuestPriceTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'GuestAssignment', required: true },
  roomId: { type: String, required: false },
  roomRefId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: false },
  guestName: { type: String, required: false },
  phone: { type: String, required: false },
  price: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  used: { type: Boolean, default: false },
  usedAt: { type: Date }
});

module.exports = mongoose.model('GuestPriceToken', GuestPriceTokenSchema);
