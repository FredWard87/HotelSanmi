const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const Booking = require('../models/Booking');
const { generateVoucherPDF } = require('../services/pdfService');

// POST /api/bookings/payment-intent -> Crear Payment Intent
router.post('/payment-intent', bookingController.createPaymentIntent);

// POST /api/bookings -> Crear reserva (procesa pago inicial 50%)
router.post('/', bookingController.createBooking);

// GET /api/bookings/stats -> Obtener estadísticas (admin)
router.get('/stats', bookingController.getBookingStats);

// GET /api/bookings/availability -> Verificar disponibilidad
router.get('/availability', bookingController.checkRoomAvailability);

// GET /api/bookings/download/:bookingId -> Descargar voucher PDF
router.get('/download/:bookingId', async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId }).lean();

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const pdfBuffer = await generateVoucherPDF(booking);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Voucher_${bookingId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// GET /api/bookings/:bookingId -> Obtener detalles de reserva
router.get('/:bookingId', bookingController.getBooking);

// GET /api/bookings -> Obtener todas las reservas (admin)
router.get('/', bookingController.getAllBookings);

// PATCH /api/bookings/:bookingId -> Actualizar reserva
router.patch('/:bookingId', bookingController.updateBooking);

// PATCH /api/bookings/:bookingId/mark-paid -> Marcar segunda noche pagada
router.patch('/:bookingId/mark-paid', bookingController.markSecondNightPaid);

// DELETE /api/bookings/:bookingId/cancel -> Cancelar reserva
router.delete('/:bookingId/cancel', bookingController.cancelBooking);

module.exports = router;