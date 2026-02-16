const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Login
router.post('/login', authController.login);

// Obtener usuario actual (requiere autenticación)
router.get('/me', protect, authController.getMe);

module.exports = router;
