const Room = require('../models/Room');
const Booking = require('../models/Booking');
const RoomBlock = require('../models/RoomBlock');
const seedRooms = require('../data/roomsSeed');

exports.getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({}).sort({ createdAt: 1 });
    res.json(rooms);
  } catch (error) {
    next(error);
  }
};

// 🔥 FUNCIÓN AUXILIAR: Parsear fecha sin problemas de zona horaria
const parseDate = (value) => {
  if (!value) return null;

  // Si es string YYYY-MM-DD, crear fecha en hora local (mediodía para evitar desfases UTC)
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  const d = new Date(value);
  return isNaN(d) ? null : d;
};

// Obtener habitaciones disponibles para fechas específicas
exports.getAvailableRooms = async (req, res, next) => {
  try {
    const { checkIn, checkOut, lugar } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: checkIn and checkOut are required',
      });
    }

    const checkInDate = parseDate(checkIn);
    const checkOutDate = parseDate(checkOut);

    if (!checkInDate || !checkOutDate || checkInDate >= checkOutDate) {
      return res.status(400).json({
        success: false,
        error: 'Fechas inválidas. checkIn debe ser anterior a checkOut.',
      });
    }

    // Filtro de habitaciones por lugar
    const query = {};
    if (lugar) query.lugar = lugar;

    const rooms = await Room.find(query);

    // ─── Obtener todos los bloqueos activos que se superponen con el rango ───
    // Incluye bloqueos específicos (roomId) y de scope amplio (casaHotel/boutique/all)
    const activeBlocks = await RoomBlock.find({
      active: true,
      startDate: { $lt: checkOutDate },
      endDate:   { $gt: checkInDate },
    });

    // Indexar bloqueos por roomId para búsqueda O(1)
    const blocksByRoom = {};   // roomId -> [blocks]
    const scopeBlocks = {      // bloqueos que afectan grupos de habitaciones
      all:        [],
      casaHotel:  [],
      boutique:   [],
    };

    activeBlocks.forEach((block) => {
      if (block.scope === 'specific' && block.roomId) {
        const key = String(block.roomId);
        if (!blocksByRoom[key]) blocksByRoom[key] = [];
        blocksByRoom[key].push(block);
      } else if (block.scope === 'casaHotel') {
        scopeBlocks.casaHotel.push(block);
      } else if (block.scope === 'boutique') {
        scopeBlocks.boutique.push(block);
      } else if (block.scope === 'all') {
        scopeBlocks.all.push(block);
      }
    });

    // ─── Evaluar disponibilidad por habitación ───────────────────────────────
    const availableRooms = [];

    for (const room of rooms) {
      const roomId = String(room._id);
      const totalUnits = room.totalUnits || 1;

      // 1) Reservas que se superponen
      const conflictingBookings = await Booking.countDocuments({
        roomId: room._id,
        status: { $in: ['confirmed', 'active', 'paid'] },
        checkIn:  { $lt: checkOutDate },
        checkOut: { $gt: checkInDate },
      });

      // 2) Calcular unidades bloqueadas por RoomBlock
      let blockedUnits = 0;

      // Bloqueos específicos de esta habitación
      const specificBlocks = blocksByRoom[roomId] || [];

      // Bloqueos heredados por scope (all + el que corresponda al lugar)
      const inheritedBlocks = [
        ...scopeBlocks.all,
        ...(room.lugar === 'casaHotel' ? scopeBlocks.casaHotel : []),
        ...(room.lugar === 'boutique'  ? scopeBlocks.boutique  : []),
      ];

      const allBlocksForRoom = [...specificBlocks, ...inheritedBlocks];

      allBlocksForRoom.forEach((block) => {
        if (block.blockAll) {
          // Bloquea todas las unidades → alcanza para marcar la habitación completa
          blockedUnits += totalUnits;
        } else {
          blockedUnits += block.quantityBlocked || 0;
        }
      });

      // 3) Bloqueos heredados del campo legacy blockedDates del modelo Room
      const legacyBlocked = (room.blockedDates || []).filter((b) => {
        const bStart = new Date(b.start);
        const bEnd   = new Date(b.end);
        return !(bEnd <= checkInDate || bStart >= checkOutDate);
      }).length;

      // 4) Disponibilidad final
      const totalUnavailable = conflictingBookings
        + Math.min(blockedUnits, totalUnits)
        + legacyBlocked;

      const availableUnits = Math.max(0, totalUnits - totalUnavailable);

      if (availableUnits > 0) {
        availableRooms.push({
          ...room.toObject(),
          availableUnits,
          bookedUnits: conflictingBookings,
          blockedUnits: Math.min(blockedUnits, totalUnits),
        });
      }
    }

    res.json({
      success: true,
      checkIn,
      checkOut,
      rooms: availableRooms,
    });
  } catch (error) {
    next(error);
  }
};

exports.seed = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV !== 'development' && req.query.force !== 'true') {
      return res.status(403).json({
        error: 'Seeding allowed only in development (or use ?force=true).',
      });
    }

    await Room.deleteMany({});
    const created = await Room.insertMany(seedRooms);
    res.json({
      seeded: true,
      count: created.length,
      message: 'Base de datos resemibrada con éxito.',
    });
  } catch (error) {
    next(error);
  }
};
