const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const Booking = require('../models/Booking');
const { generateVoucherPDF } = require('../services/pdfService');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

// ====================================
// RUTAS PÚBLICAS (sin autenticación)
// ====================================

// Crear Payment Intent (público)
router.post('/payment-intent', bookingController.createPaymentIntent);

// Verificar disponibilidad (público)
router.get('/availability', bookingController.checkRoomAvailability);

// Descargar voucher (público)
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

// ====================================
// RUTAS CON AUTENTICACIÓN OPCIONAL
// (Admin puede ignorar bloqueos, usuarios regulares no)
// ====================================

// 🔥 CREAR RESERVA - Con optionalAuth para detectar admin
router.post('/', optionalAuth, bookingController.createBooking);

// Obtener detalles de reserva (puede ser pública o protegida)
router.get('/:bookingId', optionalAuth, bookingController.getBooking);

// ====================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ====================================

// Obtener todas las reservas (admin/employee)
router.get('/', protect, bookingController.getAllBookings);

// Obtener estadísticas generales (admin/employee)
router.get('/stats', protect, bookingController.getBookingStats);

// Obtener estadísticas de códigos de descuento (admin/employee)
router.get('/stats/discount-codes', protect, bookingController.getDiscountCodeUsageStats);

// Actualizar reserva (admin/employee)
router.patch('/:bookingId', protect, bookingController.updateBooking);

// Marcar segunda noche como pagada (admin/employee)
router.patch('/:bookingId/mark-paid', protect, bookingController.markSecondNightPaid);

// Cancelar reserva (admin/employee)
router.delete('/:bookingId/cancel', protect, bookingController.cancelBooking);

// Generar documento de check-in con firma (admin/employee)
router.post('/generate-checkin/:bookingId', protect, bookingController.generateCheckin);

module.exports = router;
