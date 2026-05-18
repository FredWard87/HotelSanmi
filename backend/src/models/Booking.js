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
  // 🆕 Campo para reservas gratuitas
  isFree: { type: Boolean, default: false },
  // 🆕 Campos para código de descuento
  subtotalBeforeDiscount: { type: Number, default: 0 }, // Subtotal original antes del descuento
  discountCode: { type: String, default: null }, // Código usado (ej: "BODA2025")
  discountCodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'DiscountCode', default: null },
  discountAmount: { type: Number, default: 0 }, // Monto del descuento aplicado
  // Campos de precio después del descuento
  subtotal: { type: Number, required: true }, // Precio base después de descuento
  tax: { type: Number, required: true }, // 16% IVA
  municipalTax: { type: Number, required: true }, // 4% Impuesto municipal
  totalPrice: { type: Number, required: true },
  initialPayment: { type: Number, required: true }, // 50% del total
  secondNightPayment: { type: Number, required: true }, // 50% del total (a pagar en recepción)
  paymentStatus: { type: String, enum: ['pending', 'completed', 'partial'], default: 'pending' },
  stripePaymentIntentId: { type: String },
  stripeChargeId: { type: String },
  secondNightNoteId: { type: String }, // ID de la nota para segunda noche
  secondNightNotePaid: { type: Boolean, default: false },
  // Fields for encrypted signed check-in
  checkinSignatureEncrypted: { type: String, default: null },
  checkinSignatureIV: { type: String, default: null },
  checkinSignatureAuthTag: { type: String, default: null },
  checkinCity: { type: String, default: null },
  checkinState: { type: String, default: null },
  checkinIncludeBreakfast: { type: Boolean, default: false },
  checkinSignedAt: { type: Date, default: null },
  checkinSignedBy: { type: String, default: null },
  // status: active | cancelled | partial
  status: {
    type: String,
    enum: {
      values: ['active', 'cancelled', 'partial'],
      message: '{VALUE} no es un estado válido. Usa: active, cancelled o partial'
    },
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Booking', BookingSchema);
