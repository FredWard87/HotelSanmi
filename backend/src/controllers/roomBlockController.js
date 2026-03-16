// controllers/roomBlockController.js
const RoomBlock = require('../models/RoomBlock');
const Room = require('../models/Room');
const Booking = require('../models/Booking');

const getRoomImpactConditions = (roomId) => ([
  { scope: 'specific', roomId: roomId },
  { scope: 'all' },
  { scope: 'casaHotel', affectedRooms: roomId },
  { scope: 'boutique', affectedRooms: roomId }
]);

// Obtener todos los bloqueos con filtros opcionales
exports.getAllBlocks = async (req, res) => {
  try {
    const { roomId, active, startDate, endDate, scope } = req.query;
    
    const filter = {};
    if (scope) filter.scope = scope;
    if (active !== undefined) filter.active = active === 'true';
    
    if (startDate && endDate) {
      filter.startDate = { $lt: new Date(endDate) };
      filter.endDate = { $gt: new Date(startDate) };
    }
    
    // Si se filtra por habitación, buscar bloqueos que la afecten
    if (roomId) {
      filter.$or = getRoomImpactConditions(roomId);
    }
    
    const blocks = await RoomBlock.find(filter)
      .populate('roomId', 'name type totalUnits lugar')
      .populate('affectedRooms', 'name type totalUnits lugar')
      .sort({ startDate: -1 });
      
    res.json(blocks);
  } catch (error) {
    console.error('Error al obtener bloqueos:', error);
    res.status(500).json({ 
      message: 'Error al obtener bloqueos', 
      error: error.message 
    });
  }
};

// Obtener bloqueos de una habitación específica
exports.getBlocksByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { active = true, future = false } = req.query;
    
    const filter = {
      $or: getRoomImpactConditions(roomId)
    };
    
    if (active !== 'all') filter.active = active === 'true';
    
    if (future === 'true') {
      filter.startDate = { $gt: new Date() };
    }
    
    const blocks = await RoomBlock.find(filter)
      .populate('roomId', 'name type totalUnits lugar')
      .populate('affectedRooms', 'name type totalUnits lugar')
      .sort({ startDate: 1 });
      
    res.json(blocks);
  } catch (error) {
    console.error('Error al obtener bloqueos de habitación:', error);
    res.status(500).json({ 
      message: 'Error al obtener bloqueos', 
      error: error.message 
    });
  }
};

// Crear nuevo bloqueo
exports.createBlock = async (req, res) => {
  try {
    const { 
      scope = 'specific',
      roomId, 
      startDate, 
      endDate, 
      blockType, 
      reason, 
      blockAll, 
      quantityBlocked 
    } = req.body;

    // Validar fechas
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({ 
        message: 'La fecha de inicio no puede ser anterior a hoy' 
      });
    }

    if (end <= start) {
      return res.status(400).json({ 
        message: 'La fecha de fin debe ser posterior a la fecha de inicio' 
      });
    }

    let rooms = [];
    let filter = {};
    
    // Determinar qué habitaciones se verán afectadas
    switch(scope) {
      case 'specific':
        if (!roomId) {
          return res.status(400).json({ 
            message: 'Para scope "specific" se requiere roomId' 
          });
        }
        const room = await Room.findById(roomId);
        if (!room) {
          return res.status(404).json({ message: 'Habitación no encontrada' });
        }
        rooms = [room];
        break;
        
      case 'casaHotel':
        filter.lugar = 'casaHotel';
        rooms = await Room.find(filter);
        break;
        
      case 'boutique':
        filter.lugar = 'boutique';
        rooms = await Room.find(filter);
        break;
        
      case 'all':
        rooms = await Room.find({});
        break;
        
      default:
        return res.status(400).json({ 
          message: 'Scope no válido. Use: specific, all, casaHotel, boutique' 
        });
    }

    if (rooms.length === 0) {
      return res.status(404).json({ 
        message: `No se encontraron habitaciones para el scope: ${scope}` 
      });
    }

    const effectiveBlockAll = scope === 'specific' ? !!blockAll : true;

    // Validar cantidad bloqueada para habitaciones específicas
    if (scope === 'specific' && !effectiveBlockAll) {
      if (!quantityBlocked || quantityBlocked <= 0) {
        return res.status(400).json({ 
          message: 'Debe especificar una cantidad válida a bloquear' 
        });
      }
      if (quantityBlocked > rooms[0].totalUnits) {
        return res.status(400).json({ 
          message: `La cantidad no puede exceder las ${rooms[0].totalUnits} unidades disponibles` 
        });
      }
    }

    // Para cada habitación, verificar disponibilidad
    const availabilityResults = [];
    
    for (const room of rooms) {
      // Verificar superposición con otros bloqueos activos
      const overlappingBlocks = await RoomBlock.find({
        active: true,
        $or: getRoomImpactConditions(room._id),
        startDate: { $lt: end },
        endDate: { $gt: start }
      });

      // Verificar también reservas activas
      const overlappingBookings = await Booking.countDocuments({
        roomId: room._id,
        status: 'active',
        checkIn: { $lt: end },
        checkOut: { $gt: start }
      });

      // Calcular unidades ya bloqueadas
      let totalBlocked = overlappingBookings;
      overlappingBlocks.forEach(block => {
        if (block.blockAll) {
          totalBlocked += room.totalUnits;
        } else {
          totalBlocked += block.quantityBlocked || 0;
        }
      });

      const available = Math.max(0, room.totalUnits - Math.min(totalBlocked, room.totalUnits));
      const requestedBlock = effectiveBlockAll ? available : Number(quantityBlocked || 1);

      availabilityResults.push({
        roomId: room._id,
        roomName: room.name,
        totalUnits: room.totalUnits,
        bookedUnits: overlappingBookings,
        blockedUnits: totalBlocked - overlappingBookings,
        availableUnits: available,
        isAvailable: available >= requestedBlock,
        requestedUnits: requestedBlock
      });

      // Si no hay suficiente disponibilidad para esta habitación
      if (available < requestedBlock) {
        return res.status(400).json({
          message: `No hay suficiente disponibilidad en ${room.name}. Solo quedan ${available} unidades disponibles.`,
          scope: scope,
          details: availabilityResults
        });
      }
    }

    // Crear bloqueo
    const newBlock = new RoomBlock({
      scope,
      roomId: scope === 'specific' ? roomId : null,
      startDate: start,
      endDate: end,
      blockType: blockType || 'Mantenimiento',
      reason,
      blockAll: effectiveBlockAll,
      quantityBlocked: effectiveBlockAll ? null : Number(quantityBlocked || 1),
      active: true,
      affectedRooms: rooms.map(r => r._id)
    });

    await newBlock.save();
    await newBlock.populate('roomId', 'name type totalUnits lugar');
    await newBlock.populate('affectedRooms', 'name type totalUnits lugar');

    res.status(201).json({
      message: `Bloqueo creado exitosamente para ${rooms.length} habitación(es)`,
      scope,
      block: newBlock,
      affectedRooms: rooms.length
    });
  } catch (error) {
    console.error('Error al crear bloqueo:', error);
    res.status(500).json({ 
      message: 'Error al crear bloqueo', 
      error: error.message 
    });
  }
};

// Actualizar bloqueo
exports.updateBlock = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      scope,
      startDate, 
      endDate, 
      blockType, 
      reason, 
      blockAll, 
      quantityBlocked,
      active 
    } = req.body;

    const block = await RoomBlock.findById(id);
    if (!block) {
      return res.status(404).json({ message: 'Bloqueo no encontrado' });
    }

    // Si se cambia el scope, necesitamos recalcular affectedRooms
    let rooms = [];
    if (scope && scope !== block.scope) {
      let filter = {};
      
      switch(scope) {
        case 'specific':
          if (!block.roomId) {
            return res.status(400).json({ 
              message: 'Para scope "specific" se requiere roomId' 
            });
          }
          const room = await Room.findById(block.roomId);
          if (!room) {
            return res.status(404).json({ message: 'Habitación no encontrada' });
          }
          rooms = [room];
          break;
          
        case 'casaHotel':
          filter.lugar = 'casaHotel';
          rooms = await Room.find(filter);
          break;
          
        case 'boutique':
          filter.lugar = 'boutique';
          rooms = await Room.find(filter);
          break;
          
        case 'all':
          rooms = await Room.find({});
          break;
          
        default:
          return res.status(400).json({ 
            message: 'Scope no válido. Use: specific, all, casaHotel, boutique' 
          });
      }
      
      block.scope = scope;
      block.affectedRooms = rooms.map(r => r._id);
      if (scope !== 'specific') {
        block.roomId = null;
      }
    } else {
      // Mantener las habitaciones actuales
      rooms = await Room.find({ _id: { $in: block.affectedRooms } });
    }

    // Validar fechas si se actualizan
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const scopeToValidate = scope || block.scope;
      const effectiveBlockAll = scopeToValidate === 'specific'
        ? (blockAll !== undefined ? !!blockAll : !!block.blockAll)
        : true;
      
      if (end <= start) {
        return res.status(400).json({ 
          message: 'La fecha de fin debe ser posterior a la fecha de inicio' 
        });
      }

      // Verificar conflictos con otros bloqueos (excluyendo este)
      for (const room of rooms) {
        const overlappingBlocks = await RoomBlock.find({
          _id: { $ne: id },
          active: true,
          $or: getRoomImpactConditions(room._id),
          startDate: { $lt: end },
          endDate: { $gt: start }
        });

        const overlappingBookings = await Booking.countDocuments({
          roomId: room._id,
          status: 'active',
          checkIn: { $lt: end },
          checkOut: { $gt: start }
        });

        let totalBlocked = overlappingBookings;
        overlappingBlocks.forEach(b => {
          if (b.blockAll) {
            totalBlocked += room.totalUnits;
          } else {
            totalBlocked += b.quantityBlocked || 0;
          }
        });

        const available = Math.max(0, room.totalUnits - Math.min(totalBlocked, room.totalUnits));
        const newRequestedBlock = effectiveBlockAll
          ? available
          : Number(quantityBlocked || block.quantityBlocked || 1);

        if (newRequestedBlock > available) {
          return res.status(400).json({
            message: `No hay suficiente disponibilidad en ${room.name}. Solo quedan ${available} unidades disponibles.`,
            roomName: room.name,
            availableUnits: available
          });
        }
      }

      block.startDate = start;
      block.endDate = end;
    }

    // Actualizar otros campos
    if (blockType) block.blockType = blockType;
    if (reason !== undefined) block.reason = reason;
    const finalScope = scope || block.scope;
    const effectiveBlockAllFinal = finalScope === 'specific'
      ? (blockAll !== undefined ? !!blockAll : !!block.blockAll)
      : true;

    block.blockAll = effectiveBlockAllFinal;
    if (effectiveBlockAllFinal) {
      block.quantityBlocked = null;
    }

    if (!effectiveBlockAllFinal && quantityBlocked !== undefined) {
      if (Number(quantityBlocked) <= 0) {
        return res.status(400).json({
          message: 'Debe especificar una cantidad válida a bloquear'
        });
      }

      if (finalScope === 'specific') {
        const room = await Room.findById(block.roomId);
        if (room && Number(quantityBlocked) > room.totalUnits) {
          return res.status(400).json({ 
            message: `La cantidad no puede exceder las ${room.totalUnits} unidades disponibles` 
          });
        }
      }
      block.quantityBlocked = Number(quantityBlocked);
    }
    if (active !== undefined) block.active = active;

    block.updatedAt = Date.now();
    await block.save();
    await block.populate('roomId', 'name type totalUnits lugar');
    await block.populate('affectedRooms', 'name type totalUnits lugar');

    res.json({
      message: 'Bloqueo actualizado exitosamente',
      block
    });
  } catch (error) {
    console.error('Error al actualizar bloqueo:', error);
    res.status(500).json({ 
      message: 'Error al actualizar bloqueo', 
      error: error.message 
    });
  }
};

// Eliminar bloqueo (hard delete)
exports.deleteBlock = async (req, res) => {
  try {
    const { id } = req.params;
    
    const block = await RoomBlock.findByIdAndDelete(id);
    if (!block) {
      return res.status(404).json({ message: 'Bloqueo no encontrado' });
    }

    res.json({ 
      message: 'Bloqueo eliminado exitosamente',
      deletedId: id
    });
  } catch (error) {
    console.error('Error al eliminar bloqueo:', error);
    res.status(500).json({ 
      message: 'Error al eliminar bloqueo', 
      error: error.message 
    });
  }
};

// Verificar disponibilidad en un rango de fechas
exports.checkAvailability = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { startDate, endDate, scope } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Se requieren startDate y endDate como query params' 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    let rooms = [];
    
    if (roomId) {
      // Verificar una habitación específica
      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({ message: 'Habitación no encontrada' });
      }
      rooms = [room];
    } else if (scope) {
      // Verificar por scope
      let filter = {};
      switch(scope) {
        case 'casaHotel':
          filter.lugar = 'casaHotel';
          break;
        case 'boutique':
          filter.lugar = 'boutique';
          break;
        case 'all':
          // Sin filtro
          break;
        default:
          return res.status(400).json({ 
            message: 'Scope no válido' 
          });
      }
      rooms = await Room.find(filter);
    } else {
      return res.status(400).json({ 
        message: 'Se requiere roomId o scope' 
      });
    }

    const availabilityResults = [];
    
    for (const room of rooms) {
      // Buscar bloqueos que afecten a esta habitación
      const overlappingBlocks = await RoomBlock.find({
        active: true,
        $or: getRoomImpactConditions(room._id),
        startDate: { $lt: end },
        endDate: { $gt: start }
      });

      // Buscar reservas que se superponen
      const overlappingBookings = await Booking.countDocuments({
        roomId: room._id,
        status: 'active',
        checkIn: { $lt: end },
        checkOut: { $gt: start }
      });

      let totalBlocked = overlappingBookings;
      const blockDetails = [];
      
      overlappingBlocks.forEach(block => {
        if (block.blockAll) {
          totalBlocked += room.totalUnits;
        } else {
          totalBlocked += block.quantityBlocked || 0;
        }
        
        blockDetails.push({
          id: block._id,
          type: block.blockType,
          reason: block.reason,
          scope: block.scope,
          startDate: block.startDate,
          endDate: block.endDate,
          blockAll: block.blockAll,
          quantityBlocked: block.quantityBlocked
        });
      });

      const available = Math.max(0, room.totalUnits - Math.min(totalBlocked, room.totalUnits));

      availabilityResults.push({
        roomId: room._id,
        roomName: room.name,
        lugar: room.lugar,
        totalUnits: room.totalUnits,
        bookedUnits: overlappingBookings,
        blockedUnits: Math.min(totalBlocked - overlappingBookings, room.totalUnits),
        availableUnits: available,
        isAvailable: available > 0,
        blocks: blockDetails
      });
    }

    res.json({
      startDate,
      endDate,
      scope: scope || 'specific',
      totalRooms: rooms.length,
      availability: availabilityResults,
      summary: {
        totalAvailable: availabilityResults.filter(r => r.isAvailable).length,
        totalBlocked: availabilityResults.filter(r => !r.isAvailable).length
      }
    });
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    res.status(500).json({ 
      message: 'Error al verificar disponibilidad', 
      error: error.message 
    });
  }
};

// Limpiar bloqueos expirados (útil para cron job)
exports.cleanExpiredBlocks = async (req, res) => {
  try {
    const now = new Date();
    
    const result = await RoomBlock.updateMany(
      { endDate: { $lt: now }, active: true },
      { $set: { active: false, updatedAt: now } }
    );

    res.json({
      message: 'Bloqueos expirados limpiados',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error al limpiar bloqueos expirados:', error);
    res.status(500).json({ 
      message: 'Error al limpiar bloqueos', 
      error: error.message 
    });
  }
};
