const Room = require('../models/Room');
const Booking = require('../models/Booking');
const seedRooms = require('../data/roomsSeed');

exports.getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({}).sort({ createdAt: 1 });
    res.json(rooms);
  } catch (error) {
    next(error);
  }
};

// Get available rooms for specific dates
exports.getAvailableRooms = async (req, res, next) => {
  try {
    const { checkIn, checkOut, lugar } = req.query;
    
    if (!checkIn || !checkOut) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: checkIn and checkOut are required' 
      });
    }
    
    // Convert string dates to Date objects (start of day for checkIn, end of day for checkOut)
    const startDate = new Date(checkIn);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(checkOut);
    endDate.setUTCHours(0, 0, 0, 0);
    
    // Build query filter
    const query = {};
    if (lugar) {
      query.lugar = lugar;
    }
    
    const rooms = await Room.find(query);
    
    // For each room, check availability
    const availableRooms = [];
    
    for (const room of rooms) {
      // Find overlapping bookings for this room
      const conflictingBookings = await Booking.find({
        roomId: room._id,
        status: 'active',
        $or: [
          {
            checkIn: { $lt: endDate },
            checkOut: { $gt: startDate }
          }
        ]
      }).countDocuments();
      
      const totalUnits = room.totalUnits || 1;
      const availableUnits = totalUnits - conflictingBookings;
      
      if (availableUnits > 0) {
        availableRooms.push({
          ...room.toObject(),
          availableUnits,
          bookedUnits: conflictingBookings
        });
      }
    }
    
    res.json({
      success: true,
      checkIn,
      checkOut,
      rooms: availableRooms
    });
  } catch (error) {
    next(error);
  }
};

exports.seed = async (req, res, next) => {
  try {
    // Protección básica: solo en entorno development a menos que se pase ?force=true
    if (process.env.NODE_ENV !== 'development' && req.query.force !== 'true') {
      return res.status(403).json({ error: 'Seeding allowed only in development (or use ?force=true).' });
    }

    // Eliminar todas las habitaciones existentes y reinsertar
    await Room.deleteMany({});
    const created = await Room.insertMany(seedRooms);
    res.json({ seeded: true, count: created.length, message: 'Base de datos resemibrada con éxito.' });
  } catch (error) {
    next(error);
  }
};
