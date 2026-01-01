// models/Room.js
const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['STANDARD', 'SUITE', 'MASTER']
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  size: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  bedType: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  amenities: [{
    type: String
  }],
  lugar: {
    type: String,
    enum: ['casaHotel', 'boutique'],
    required: true
  },
  totalUnits: {
    type: Number,
    default: 1,
    min: 1
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índices
RoomSchema.index({ lugar: 1 });
RoomSchema.index({ type: 1 });
RoomSchema.index({ active: 1 });

// Pre-save hook para actualizar updatedAt
RoomSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Room', RoomSchema);
