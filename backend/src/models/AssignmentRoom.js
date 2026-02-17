// models/AssignmentRoom.js
const mongoose = require('mongoose');

const assignmentRoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  number: {
    type: String,
    required: true
  },
  m2: {
    type: String,
    default: ''
  },
  bed: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['casa_hotel', 'boutique'],
    required: true
  },
  // Referencia al tipo de habitación de roomsSeed
  roomType: {
    type: {
      type: String,
      enum: ['STANDARD', 'SUITE', 'MASTER'],
      required: true
    },
    lugar: {
      type: String,
      enum: ['casaHotel', 'boutique'],
      required: true
    }
  },
  // 🆕 Referencia al Room (tipo de habitación) en MongoDB
  roomRefId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index para busquedas rapidas
assignmentRoomSchema.index({ type: 1, isActive: 1 });
assignmentRoomSchema.index({ name: 'text' });

module.exports = mongoose.model('AssignmentRoom', assignmentRoomSchema);
