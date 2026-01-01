// index.js
const express = require('express');
const router = express.Router();

// Ruta de bienvenida de la API
router.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a la API del Hotel',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

// Ruta de ejemplo para usuarios
router.get('/users', (req, res) => {
  res.json([
    { id: 1, name: 'Juan Pérez', email: 'juan@hotel.com', role: 'admin' },
    { id: 2, name: 'María García', email: 'maria@hotel.com', role: 'reception' }
  ]);
});

// Montar rutas de habitaciones (Mongoose)
router.use('/rooms', require('./rooms'));
router.use('/bookings', require('./bookings'));
router.use('/weddings', require('./weddings'));
//router.use('/visits', require('./visits'));
// Auth routes
router.use('/auth', require('./auth'));

// ⭐ Ruta para bloqueos de habitaciones
router.use('/room-blocks', require('./roomBlocks'));

module.exports = router;
