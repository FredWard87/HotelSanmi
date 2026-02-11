// models/RoomBlock.js
const mongoose = require('mongoose');

const RoomBlockSchema = new mongoose.Schema({
  // Campos existentes...
  roomId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Room', 
    required: function() {
      // Solo requerido si scope es 'specific'
      return this.scope === 'specific';
    }
  },
  
  // NUEVO CAMPO: scope (alcance del bloqueo)
  scope: {
    type: String,
    enum: ['specific', 'all', 'casaHotel', 'boutique'],
    default: 'specific',
    required: true
  },
  
  // NUEVO CAMPO: para almacenar IDs de habitaciones afectadas (cuando scope no es 'specific')
  affectedRooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  }],
  
  // Campos existentes...
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

// Índice compuesto actualizado
RoomBlockSchema.index({ scope: 1, active: 1, startDate: 1, endDate: 1 });

// Pre-save hook actualizado
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

// Método estático para buscar bloqueos que se solapan (actualizado)
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
