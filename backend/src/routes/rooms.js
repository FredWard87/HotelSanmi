const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const adminRoomController = require('../controllers/adminRoomController');

// GET /api/rooms -> list all rooms
router.get('/', roomController.getRooms);

// POST /api/rooms/seed -> seed the database (development only)
router.post('/seed', roomController.seed);

// Admin routes (manage room inventory and blocked dates)
router.get('/admin', adminRoomController.listRoomsAdmin);
router.post('/admin', adminRoomController.createRoom);
router.put('/admin/:id', adminRoomController.updateRoom);
router.delete('/admin/:id', adminRoomController.deleteRoom);
router.post('/admin/:id/block', adminRoomController.blockDates);
router.post('/admin/:id/unblock', adminRoomController.unblockDates);
router.post('/admin/:id/inventory', adminRoomController.setInventory);
router.get('/admin/:id/availability', adminRoomController.checkAvailability);

module.exports = router;
