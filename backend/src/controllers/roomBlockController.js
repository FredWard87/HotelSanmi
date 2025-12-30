// controllers/roomBlockController.js
const RoomBlock = require('../models/RoomBlock');
const Room = require('../models/Room');
const Booking = require('../models/Booking');

// Obtener todos los bloqueos con filtros opcionales
exports.getAllBlocks = async (req, res) => {
  try {
    const { roomId, active, startDate, endDate } = req.query;
    
    const filter = {};
    if (roomId) filter.roomId = roomId;
    if (active !== undefined) filter.active = active === 'true';
    
    if (startDate && endDate) {
      filter.$or = [
        { startDate: { $lt: new Date(endDate) }, endDate: { $gt: new Date(startDate) } }
      ];
    }
    
    const blocks = await RoomBlock.find(filter)
      .populate('roomId', 'name type totalUnits lugar')
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
    
    const filter = { roomId };
    if (active !== 'all') filter.active = active === 'true';
    
    if (future === 'true') {
      filter.startDate = { $gt: new Date() };
    }
    
    const blocks = await RoomBlock.find(filter).sort({ startDate: 1 });
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
      roomId, 
      startDate, 
      endDate, 
      blockType, 
      reason, 
      blockAll, 
      quantityBlocked 
    } = req.body;

    // Validar que la habitación existe
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

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

    // Validar cantidad bloqueada
    if (!blockAll) {
      if (!quantityBlocked || quantityBlocked <= 0) {
        return res.status(400).json({ 
          message: 'Debe especificar una cantidad válida a bloquear' 
        });
      }
      if (quantityBlocked > room.totalUnits) {
        return res.status(400).json({ 
          message: `La cantidad no puede exceder las ${room.totalUnits} unidades disponibles` 
        });
      }
    }

    // Verificar superposición con otros bloqueos activos
    const overlappingBlocks = await RoomBlock.find({
      roomId,
      active: true,
      $or: [
        { startDate: { $lt: end }, endDate: { $gt: start } }
      ]
    });

    // Verificar también reservas activas
    const overlappingBookings = await Booking.countDocuments({
      roomId,
      status: 'active',
      $or: [
        { checkIn: { $lt: end }, checkOut: { $gt: start } }
      ]
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

    const requestedBlock = blockAll ? room.totalUnits : quantityBlocked;
    const available = Math.max(0, room.totalUnits - Math.min(totalBlocked, room.totalUnits));

    if (requestedBlock > available) {
      return res.status(400).json({
        message: `No hay suficiente disponibilidad. Solo quedan ${available} unidades disponibles en esas fechas.`,
        availableUnits: available,
        details: {
          totalUnits: room.totalUnits,
          bookedUnits: overlappingBookings,
          blockedUnits: totalBlocked - overlappingBookings,
          requestedUnits: requestedBlock
        }
      });
    }

    // Crear bloqueo
    const newBlock = new RoomBlock({
      roomId,
      startDate: start,
      endDate: end,
      blockType: blockType || 'Mantenimiento',
      reason,
      blockAll: !!blockAll,
      quantityBlocked: blockAll ? null : quantityBlocked,
      active: true
    });

    await newBlock.save();
    await newBlock.populate('roomId', 'name type totalUnits lugar');

    res.status(201).json({
      message: 'Bloqueo creado exitosamente',
      block: newBlock
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

    const room = await Room.findById(block.roomId);
    if (!room) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    // Validar fechas si se actualizan
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end <= start) {
        return res.status(400).json({ 
          message: 'La fecha de fin debe ser posterior a la fecha de inicio' 
        });
      }

      // Verificar conflictos con otros bloqueos (excluyendo este)
      const overlappingBlocks = await RoomBlock.find({
        _id: { $ne: id },
        roomId: block.roomId,
        active: true,
        $or: [
          { startDate: { $lt: end }, endDate: { $gt: start } }
        ]
      });

      const overlappingBookings = await Booking.countDocuments({
        roomId: block.roomId,
        status: 'active',
        $or: [
          { checkIn: { $lt: end }, checkOut: { $gt: start } }
        ]
      });

      let totalBlocked = overlappingBookings;
      overlappingBlocks.forEach(b => {
        if (b.blockAll) {
          totalBlocked += room.totalUnits;
        } else {
          totalBlocked += b.quantityBlocked || 0;
        }
      });

      const newRequestedBlock = (blockAll !== undefined ? blockAll : block.blockAll) 
        ? room.totalUnits 
        : (quantityBlocked || block.quantityBlocked);
      
      const available = Math.max(0, room.totalUnits - totalBlocked);

      if (newRequestedBlock > available) {
        return res.status(400).json({
          message: `No hay suficiente disponibilidad. Solo quedan ${available} unidades disponibles.`,
          availableUnits: available
        });
      }

      block.startDate = start;
      block.endDate = end;
    }

    // Actualizar otros campos
    if (blockType) block.blockType = blockType;
    if (reason !== undefined) block.reason = reason;
    if (blockAll !== undefined) {
      block.blockAll = blockAll;
      if (blockAll) {
        block.quantityBlocked = null;
      }
    }
    if (!blockAll && quantityBlocked) {
      if (quantityBlocked > room.totalUnits) {
        return res.status(400).json({ 
          message: `La cantidad no puede exceder las ${room.totalUnits} unidades disponibles` 
        });
      }
      block.quantityBlocked = quantityBlocked;
    }
    if (active !== undefined) block.active = active;

    block.updatedAt = Date.now();
    await block.save();
    await block.populate('roomId', 'name type totalUnits lugar');

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
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: 'Se requieren startDate y endDate como query params' 
      });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Habitación no encontrada' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Buscar bloqueos que se superponen
    const overlappingBlocks = await RoomBlock.find({
      roomId,
      active: true,
      $or: [
        { startDate: { $lt: end }, endDate: { $gt: start } }
      ]
    });

    // Buscar reservas que se superponen
    const overlappingBookings = await Booking.countDocuments({
      roomId,
      status: 'active',
      $or: [
        { checkIn: { $lt: end }, checkOut: { $gt: start } }
      ]
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
        startDate: block.startDate,
        endDate: block.endDate,
        blockAll: block.blockAll,
        quantityBlocked: block.quantityBlocked
      });
    });

    const available = Math.max(0, room.totalUnits - Math.min(totalBlocked, room.totalUnits));

    res.json({
      roomId,
      roomName: room.name,
      totalUnits: room.totalUnits,
      bookedUnits: overlappingBookings,
      blockedUnits: Math.min(totalBlocked - overlappingBookings, room.totalUnits),
      availableUnits: available,
      isAvailable: available > 0,
      blocks: blockDetails,
      startDate,
      endDate
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