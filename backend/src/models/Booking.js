// models/Booking.js
const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true, required: true }, // LC-2025-XXXXX
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  roomName: { type: String, required: true },
  guestInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    specialRequests: { type: String },
  },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  nights: { type: Number, required: true },
  pricePerNight: { type: Number, required: true },
  subtotal: { type: Number, required: true }, // Precio base
  tax: { type: Number, required: true }, // 16% IVA
  municipalTax: { type: Number, required: true }, // 4% Impuesto municipal - NUEVO
  totalPrice: { type: Number, required: true },
  initialPayment: { type: Number, required: true }, // 50% del total
  secondNightPayment: { type: Number, required: true }, // 50% del total (a pagar en recepción)
  paymentStatus: { type: String, enum: ['pending', 'completed', 'partial'], default: 'pending' },
  stripePaymentIntentId: { type: String },
  stripeChargeId: { type: String },
  secondNightNoteId: { type: String }, // ID de la nota para segunda noche
  secondNightNotePaid: { type: Boolean, default: false },
  // status: active | cancelled
  status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Booking', BookingSchema);