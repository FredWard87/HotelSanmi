const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String },
  description: { type: String },
  price: { type: Number, default: 0 },
  size: { type: String },
  capacity: { type: Number },
  bedType: { type: String },
  images: [{ type: String }],
  amenities: [{ type: String }],
  lugar: { type: String, enum: ['casaHotel', 'boutique'], default: 'casaHotel' },
  // Inventory: how many units of this room type exist
  totalUnits: { type: Number, default: 1 },
  // Array of blocked date ranges where this room type is unavailable
  blockedDates: [
    {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
      reason: { type: String },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Room', RoomSchema);
