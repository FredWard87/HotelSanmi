// models/RoomBlock.js
const mongoose = require('mongoose');

const RoomBlockSchema = new mongoose.Schema({
  // NUEVO CAMPO: scope (alcance del bloqueo)
  scope: {
    type: String,
    enum: ['specific', 'all', 'casaHotel', 'boutique'],
    default: 'specific',
    required: true
  },
  
  // Campo roomId ahora es condicional
  roomId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room', 
    required: function() {
      // Solo requerido si scope es 'specific'
      return this.scope === 'specific';
    }
  },
  
  // NUEVO CAMPO: para almacenar IDs de habitaciones afectadas (cuando scope no es 'specific')
  affectedRooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  }],
  
  startDate: { 
    type: Date, 
    required: true,
    index: true
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
RoomBlockSchema.index({ scope: 1, active: 1, startDate: 1, endDate: 1 });
RoomBlockSchema.index({ affectedRooms: 1 });

// Validación: endDate debe ser después de startDate
RoomBlockSchema.pre('save', async function(next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('La fecha de fin debe ser posterior a la fecha de inicio'));
  }
  
  // Si blockAll es true, quantityBlocked debe ser null
  if (this.blockAll) {
    this.quantityBlocked = null;
  }
  
  // Si el scope no es 'specific', llenar affectedRooms
  if (this.scope !== 'specific' && (!this.affectedRooms || this.affectedRooms.length === 0)) {
    try {
      let filter = {};
      
      switch(this.scope) {
        case 'all':
          // Todas las habitaciones
          break;
        case 'casaHotel':
          filter.lugar = 'casaHotel';
          break;
        case 'boutique':
          filter.lugar = 'boutique';
          break;
      }
      
      const Room = mongoose.model('Room');
      const rooms = await Room.find(filter).select('_id');
      this.affectedRooms = rooms.map(room => room._id);
      
    } catch (error) {
      return next(error);
    }
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
RoomBlockSchema.statics.findOverlapping = function(roomId, startDate, endDate, scope = null) {
  const query = {
    active: true,
    $or: [
      { startDate: { $lt: endDate }, endDate: { $gt: startDate } }
    ]
  };
  
  // Si buscamos por habitación específica, incluir todos los scopes que la afecten
  if (roomId) {
    query.$or = [
      { scope: 'specific', roomId: roomId },
      { scope: 'all' },
      { scope: 'casaHotel', affectedRooms: roomId },
      { scope: 'boutique', affectedRooms: roomId }
    ];
  }
  
  // Si buscamos por scope específico
  if (scope) {
    query.scope = scope;
  }
  
  return this.find(query);
};

module.exports = mongoose.model('RoomBlock', RoomBlockSchema);
