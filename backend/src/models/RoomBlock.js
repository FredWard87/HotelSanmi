// models/RoomBlock.js
const mongoose = require('mongoose');

const RoomBlockSchema = new mongoose.Schema({
  roomId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room', 
    required: true,
    index: true // Índice para búsquedas rápidas
  },
  startDate: { 
    type: Date, 
    required: true,
    index: true // Índice para consultas de rango
  },
  endDate: { 
    type: Date, 
    required: true,
    index: true
  },
  blockType: { 
    type: String, 
    enum: ['Mantenimiento', 'Reparación', 'Evento', 'Agotada', 'Otro'],
    default: 'Mantenimiento'
  },
  reason: { 
    type: String,
    maxlength: 500 
  },
  blockAll: { 
    type: Boolean, 
    default: false 
  },
  quantityBlocked: { 
    type: Number, 
    default: 1,
    min: 0
  },
  active: { 
    type: Boolean, 
    default: true,
    index: true
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Índice compuesto para búsquedas de disponibilidad
RoomBlockSchema.index({ roomId: 1, active: 1, startDate: 1, endDate: 1 });

// Validación: endDate debe ser después de startDate
RoomBlockSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('La fecha de fin debe ser posterior a la fecha de inicio'));
  }
  
  // Si blockAll es true, quantityBlocked debe ser null
  if (this.blockAll) {
    this.quantityBlocked = null;
  }
  
  this.updatedAt = Date.now();
  next();
});

// Método virtual para verificar si el bloqueo está vigente
RoomBlockSchema.virtual('isCurrent').get(function() {
  const now = new Date();
  return this.active && this.startDate <= now && this.endDate >= now;
});

// Método virtual para verificar si el bloqueo es futuro
RoomBlockSchema.virtual('isFuture').get(function() {
  const now = new Date();
  return this.active && this.startDate > now;
});

// Método para desactivar el bloqueo (soft delete)
RoomBlockSchema.methods.deactivate = function() {
  this.active = false;
  this.updatedAt = Date.now();
  return this.save();
};

// Método estático para buscar bloqueos que se solapan
RoomBlockSchema.statics.findOverlapping = function(roomId, startDate, endDate) {
  return this.find({
    roomId,
    active: true,
    $or: [
      { startDate: { $lt: endDate }, endDate: { $gt: startDate } }
    ]
  });
};

module.exports = mongoose.model('RoomBlock', RoomBlockSchema);