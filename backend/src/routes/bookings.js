// routes/bookings.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// Ruta para verificar disponibilidad de una habitación
router.get('/availability', bookingController.checkAvailability);

// Ruta para verificar disponibilidad para múltiples habitaciones por SCOPE
router.get('/availability/multiple', bookingController.checkMultipleAvailability);

// Ruta para crear una nueva reserva
router.post('/', bookingController.createBooking);

// Ruta para obtener todas las reservas (con filtros)
router.get('/', bookingController.getAllBookings);

// Ruta para obtener estadísticas de reservas
router.get('/stats', bookingController.getBookingStats);

// Ruta para obtener una reserva específica por ID
router.get('/:id', bookingController.getBookingById);

// Ruta para actualizar una reserva
router.patch('/:id', bookingController.updateBooking);

// Ruta para cancelar una reserva
router.delete('/:id/cancel', bookingController.cancelBooking);

// Ruta para marcar segunda noche como pagada
router.patch('/:id/mark-paid', bookingController.markSecondNightPaid);

// Ruta para descargar voucher en PDF
router.get('/download/:id', bookingController.downloadVoucher);

// Ruta para crear Payment Intent con Stripe
router.post('/payment-intent', bookingController.createPaymentIntent);

module.exports = router;
