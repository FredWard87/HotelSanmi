// routes/index.js
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
      api: '/api',
      auth: '/api/auth',
      rooms: '/api/rooms',
      bookings: '/api/bookings',
      roomBlocks: '/api/room-blocks',
      discountCodes: '/api/discount-codes',
      guestAssignments: '/api/guest-assignments'
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

// ==========================================
// RUTAS PÚBLICAS (sin autenticación)
// ==========================================

// Auth routes (login, etc.)
router.use('/auth', require('./auth'));

// Rutas de habitaciones (algunas públicas, algunas protegidas dentro del archivo)
router.use('/rooms', require('./rooms'));

// Rutas de bookings (algunas públicas, algunas protegidas dentro del archivo)
router.use('/bookings', require('./bookings'));

// Rutas de weddings
router.use('/weddings', require('./weddings'));

// ==========================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ==========================================

// Ruta para bloqueos de habitaciones (protegida)
router.use('/room-blocks', require('./roomBlocks'));

// Ruta para códigos de descuento (protegida)
router.use('/discount-codes', require('./discountCodes'));

// Ruta para asignación de huéspedes (protegida)
router.use('/guest-assignments', require('./guestAssignments'));

module.exports = router;
