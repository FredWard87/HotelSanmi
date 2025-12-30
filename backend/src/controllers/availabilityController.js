// controllers/availabilityController.js
const Room = require('../models/Room');
const Booking = require('../models/Booking');
const RoomBlock = require('../models/RoomBlock');

// Función para verificar disponibilidad de todas las habitaciones
exports.checkAvailability = async (req, res, next) => {
  try {
    const { checkIn, checkOut, lugar } = req.query;
    
    // Validar parámetros
    if (!checkIn || !checkOut) {
      return res.status(400).json({ 
        error: 'Se requieren fechas de check-in y check-out' 
      });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    // Validar fechas
    if (checkInDate >= checkOutDate) {
      return res.status(400).json({ 
        error: 'La fecha de check-in debe ser anterior al check-out' 
      });
    }

    // Obtener todas las habitaciones
    const query = {};
    if (lugar && ['casaHotel', 'boutique'].includes(lugar)) {
      query.lugar = lugar;
    }

    const rooms = await Room.find(query);
    
    // Verificar disponibilidad para cada habitación
    const availabilityResults = await Promise.all(
      rooms.map(async (room) => {
        // Contar reservas que se superponen
        const overlappingBookings = await Booking.countDocuments({
          roomId: room._id,
          status: { $in: ['confirmed', 'active', 'paid'] },
          $or: [
            { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }
          ]
        });

        // Contar bloqueos activos
        const activeBlocks = await RoomBlock.find({
          roomId: room._id,
          active: true,
          $or: [
            { startDate: { $lt: checkOutDate }, endDate: { $gt: checkInDate } }
          ]
        });

        let totalBlockedUnits = 0;
        activeBlocks.forEach(block => {
          if (block.blockAll) {
            totalBlockedUnits += room.totalUnits;
          } else {
            totalBlockedUnits += block.quantityBlocked || 0;
          }
        });

        // Contar bloqueos heredados
        const legacyBlockedOverlaps = (room.blockedDates || []).filter(b => {
          const bStart = new Date(b.start);
          const bEnd = new Date(b.end);
          return !(bEnd <= checkInDate || bStart >= checkOutDate);
        }).length;

        // Calcular disponibilidad
        const totalUnavailable = overlappingBookings + 
                                Math.min(totalBlockedUnits, room.totalUnits) + 
                                legacyBlockedOverlaps;
        const availableUnits = Math.max(0, room.totalUnits - totalUnavailable);

        return {
          roomId: room._id,
          room,
          availableUnits,
          totalUnits: room.totalUnits,
          bookedUnits: overlappingBookings,
          blockedUnits: Math.min(totalBlockedUnits, room.totalUnits),
          legacyBlocks: legacyBlockedOverlaps,
          isAvailable: availableUnits > 0
        };
      })
    );

    // Filtrar solo las habitaciones disponibles
    const availableRooms = availabilityResults.filter(result => result.isAvailable);

    res.json({
      checkIn,
      checkOut,
      totalRooms: rooms.length,
      availableRooms: availableRooms.length,
      unavailableRooms: rooms.length - availableRooms.length,
      results: availabilityResults,
      availableRoomsList: availableRooms.map(r => ({
        _id: r.room._id,
        name: r.room.name,
        type: r.room.type,
        description: r.room.description,
        price: r.room.price,
        size: r.room.size,
        capacity: r.room.capacity,
        bedType: r.room.bedType,
        images: r.room.images,
        amenities: r.room.amenities,
        lugar: r.room.lugar,
        availableUnits: r.availableUnits,
        totalUnits: r.totalUnits
      }))
    });
  } catch (error) {
    console.error('Error en checkAvailability:', error);
    next(error);
  }
};

// Obtener solo las habitaciones disponibles (versión simplificada)
exports.getAvailableRooms = async (req, res, next) => {
  try {
    const { checkIn, checkOut, lugar } = req.query;
    
    if (!checkIn || !checkOut) {
      return res.status(400).json({ 
        error: 'Se requieren fechas de check-in y check-out' 
      });
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkInDate >= checkOutDate) {
      return res.status(400).json({ 
        error: 'La fecha de check-in debe ser anterior al check-out' 
      });
    }

    // Obtener todas las habitaciones
    const query = {};
    if (lugar && ['casaHotel', 'boutique'].includes(lugar)) {
      query.lugar = lugar;
    }

    const rooms = await Room.find(query);
    
    const availableRooms = await Promise.all(
      rooms.map(async (room) => {
        // Verificar reservas
        const overlappingBookings = await Booking.countDocuments({
          roomId: room._id,
          status: { $in: ['confirmed', 'active', 'paid'] },
          $or: [
            { checkIn: { $lt: checkOutDate }, checkOut: { $gt: checkInDate } }
          ]
        });

        // Verificar bloqueos
        const activeBlocks = await RoomBlock.find({
          roomId: room._id,
          active: true,
          $or: [
            { startDate: { $lt: checkOutDate }, endDate: { $gt: checkInDate } }
          ]
        });

        let totalBlockedUnits = 0;
        activeBlocks.forEach(block => {
          if (block.blockAll) {
            totalBlockedUnits += room.totalUnits;
          } else {
            totalBlockedUnits += block.quantityBlocked || 0;
          }
        });

        // Bloqueos heredados
        const legacyBlocks = (room.blockedDates || []).filter(b => {
          const bStart = new Date(b.start);
          const bEnd = new Date(b.end);
          return !(bEnd <= checkInDate || bStart >= checkOutDate);
        }).length;

        const totalUnavailable = overlappingBookings + 
                                Math.min(totalBlockedUnits, room.totalUnits) + 
                                legacyBlocks;
        const availableUnits = Math.max(0, room.totalUnits - totalUnavailable);

        return availableUnits > 0 ? {
          ...room.toObject(),
          availableUnits,
          totalUnits: room.totalUnits
        } : null;
      })
    );

    // Filtrar nulls
    const filteredRooms = availableRooms.filter(room => room !== null);

    res.json({
      success: true,
      checkIn,
      checkOut,
      totalAvailable: filteredRooms.length,
      rooms: filteredRooms
    });
  } catch (error) {
    console.error('Error en getAvailableRooms:', error);
    next(error);
  }
};