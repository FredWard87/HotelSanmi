// routes/roomBlocks.js
const express = require('express');
const router = express.Router();
const roomBlockController = require('../controllers/roomBlockController');

// GET /api/room-blocks -> listar todos los bloqueos
router.get('/', roomBlockController.getAllBlocks);

// GET /api/room-blocks/room/:roomId -> bloqueos de una habitación específica
router.get('/room/:roomId', roomBlockController.getBlocksByRoom);

// GET /api/room-blocks/availability/:roomId -> verificar disponibilidad en rango de fechas
router.get('/availability/:roomId', roomBlockController.checkAvailability);

// POST /api/room-blocks -> crear nuevo bloqueo
router.post('/', roomBlockController.createBlock);

// POST /api/room-blocks/clean-expired -> limpiar bloqueos expirados (cron job)
router.post('/clean-expired', roomBlockController.cleanExpiredBlocks);

// PUT /api/room-blocks/:id -> actualizar bloqueo
router.put('/:id', roomBlockController.updateBlock);

// DELETE /api/room-blocks/:id -> eliminar bloqueo
router.delete('/:id', roomBlockController.deleteBlock);

module.exports = router;