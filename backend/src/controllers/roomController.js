const Room = require('../models/Room');
const seedRooms = require('../data/roomsSeed');

exports.getRooms = async (req, res, next) => {
  try {
    const rooms = await Room.find({}).sort({ createdAt: 1 });
    res.json(rooms);
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
