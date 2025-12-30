const Room = require('../models/Room');
const Booking = require('../models/Booking');
const RoomBlock = require('../models/RoomBlock');

// List rooms with inventory and blocked dates
exports.listRoomsAdmin = async (req, res, next) => {
  try {
    const rooms = await Room.find().sort({ createdAt: -1 });
    res.json(rooms);
  } catch (err) {
    next(err);
  }
};

// Create a new room type
exports.createRoom = async (req, res, next) => {
  try {
    const payload = req.body;
    const room = new Room(payload);
    await room.save();
    res.status(201).json({ success: true, room });
  } catch (err) {
    next(err);
  }
};

// Update room metadata (price, description, totalUnits, etc.)
exports.updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const room = await Room.findByIdAndUpdate(id, updates, { new: true });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ success: true, room });
  } catch (err) {
    next(err);
  }
};

// Delete a room type (soft-delete would be safer but provide hard-delete option)
exports.deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Verificar si hay reservas activas
    const activeBookings = await Booking.countDocuments({
      roomId: id,
      status: 'active',
      checkOut: { $gte: new Date() }
    });

    if (activeBookings > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete room with active bookings',
        message: `Esta habitación tiene ${activeBookings} reserva(s) activa(s). Cancela las reservas primero.`
      });
    }

    const room = await Room.findByIdAndDelete(id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    // Eliminar bloqueos asociados
    await RoomBlock.deleteMany({ roomId: id });
    
    res.json({ success: true, message: 'Room deleted' });
  } catch (err) {
    next(err);
  }
};

// Block a date range for a room type (DEPRECATED - usar RoomBlock en su lugar)
exports.blockDates = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start, end, reason } = req.body;
    if (!start || !end) return res.status(400).json({ error: 'start and end are required' });
    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    room.blockedDates.push({ start: new Date(start), end: new Date(end), reason });
    await room.save();
    res.json({ success: true, room });
  } catch (err) {
    next(err);
  }
};

// Unblock (remove) a blocked range by its index or id (DEPRECATED)
exports.unblockDates = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { blockedId } = req.body;
    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (!blockedId) return res.status(400).json({ error: 'blockedId required' });
    room.blockedDates = room.blockedDates.filter(b => String(b._id) !== String(blockedId));
    await room.save();
    res.json({ success: true, room });
  } catch (err) {
    next(err);
  }
};

// Set total units inventory
exports.setInventory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { totalUnits } = req.body;
    if (typeof totalUnits !== 'number') return res.status(400).json({ error: 'totalUnits must be number' });
    if (totalUnits < 0) return res.status(400).json({ error: 'totalUnits must be positive' });
    const room = await Room.findByIdAndUpdate(id, { totalUnits }, { new: true });
    res.json({ success: true, room });
  } catch (err) {
    next(err);
  }
};

// 🔥 Check availability for a room type between dates (ACTUALIZADO con RoomBlocks)
exports.checkAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: 'start and end required' });

    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const startDate = new Date(start);
    const endDate = new Date(end);

    // 1. Count overlapping bookings for this room type
    const overlappingBookings = await Booking.countDocuments({
      roomId: room._id,
      status: 'active',
      $or: [
        { checkIn: { $lt: endDate }, checkOut: { $gt: startDate } }
      ]
    });

    // 2. Count blocked units from RoomBlock collection
    const activeBlocks = await RoomBlock.find({
      roomId: room._id,
      active: true,
      $or: [
        { startDate: { $lt: endDate }, endDate: { $gt: startDate } }
      ]
    });

    let totalBlockedUnits = 0;
    const blockDetails = [];
    
    activeBlocks.forEach(block => {
      if (block.blockAll) {
        totalBlockedUnits += room.totalUnits;
      } else {
        totalBlockedUnits += block.quantityBlocked || 0;
      }
      
      blockDetails.push({
        type: block.blockType,
        reason: block.reason,
        startDate: block.startDate,
        endDate: block.endDate,
        blockAll: block.blockAll,
        quantityBlocked: block.quantityBlocked
      });
    });

    // 3. Count legacy blocked ranges (mantener compatibilidad)
    const legacyBlockedOverlaps = (room.blockedDates || []).filter(b => {
      const bStart = new Date(b.start);
      const bEnd = new Date(b.end);
      return !(bEnd <= startDate || bStart >= endDate);
    }).length;

    // 4. Calculate final availability
    const totalUnavailable = overlappingBookings + Math.min(totalBlockedUnits, room.totalUnits) + legacyBlockedOverlaps;
    const available = Math.max(0, room.totalUnits - totalUnavailable);

    res.json({ 
      roomId: id,
      roomName: room.name,
      totalUnits: room.totalUnits,
      available, 
      overlappingBookings, 
      blockedUnits: Math.min(totalBlockedUnits, room.totalUnits),
      legacyBlocks: legacyBlockedOverlaps,
      blocks: blockDetails,
      isAvailable: available > 0,
      checkIn: start,
      checkOut: end
    });
  } catch (err) {
    next(err);
  }
};