const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const Booking = require('../models/Booking');
const { generateVoucherPDF, sendSecondPaymentReminderEmail } = require('../services/pdfService');
const { protect, adminOnly, optionalAuth } = require('../middleware/auth');

// ====================================
// RUTAS PÚBLICAS (sin autenticación)
// ====================================

// Crear Payment Intent (público)
router.post('/payment-intent', bookingController.createPaymentIntent);

// Verificar disponibilidad (público)
router.get('/availability', bookingController.checkRoomAvailability);

// Verificar disponibilidad múltiple (público) — usado por chatbot
router.get('/availability/multiple', bookingController.checkMultipleAvailability);

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
router.post('/bulk', optionalAuth, bookingController.createBulkBookings);

// ====================================
// RUTAS PROTEGIDAS ESPECÍFICAS (SIN PARAMS)
// Deben ir ANTES que /:bookingId para que Express las matchee correctamente
// ====================================

// Obtener todas las reservas (admin/employee)
router.get('/', protect, bookingController.getAllBookings);

// Obtener estadísticas generales (admin/employee)
router.get('/stats', protect, bookingController.getBookingStats);

// Obtener estadísticas de códigos de descuento (admin/employee)
router.get('/stats/discount-codes', protect, bookingController.getDiscountCodeUsageStats);

// Listar check-ins firmados (admin/employee)
router.get('/signed-checkins', protect, bookingController.getSignedCheckins);

// ====================================
// RUTAS PROTEGIDAS CON PARÁMETROS
// ====================================

// Generar documento de check-in con firma (admin/employee)
router.post('/generate-checkin/:bookingId', protect, bookingController.generateCheckin);

// Actualizar reserva (admin/employee)
router.patch('/:bookingId', protect, bookingController.updateBooking);

// Marcar segunda noche como pagada (admin/employee)
router.patch('/:bookingId/mark-paid', protect, bookingController.markSecondNightPaid);

// Anular marcado de segunda noche pagada (admin/employee)
router.patch('/:bookingId/unmark-paid', protect, bookingController.unmarkSecondNightPaid);

// Reenviar voucher de pago por email (admin/employee)
router.post('/:bookingId/resend-voucher', protect, bookingController.resendBookingEmail);

// Cancelar reserva (admin/employee)
router.delete('/:bookingId/cancel', protect, bookingController.cancelBooking);

// Descargar PDF de check-in firmado guardado (admin/employee)
router.get('/:bookingId/checkin/pdf', protect, bookingController.downloadSignedCheckin);

// Eliminar check-in firmado guardado (admin/employee)
router.delete('/:bookingId/checkin', protect, bookingController.deleteSignedCheckin);

// Obtener detalles de reserva (puede ser pública o protegida) — AL FINAL
router.get('/:bookingId', optionalAuth, bookingController.getBooking);

// ====================================
// RUTA DE PRUEBA: Enviar email de segundo pago
// ====================================
// Envía un email de recordatorio de segundo pago para probar el diseño
router.post('/test-second-payment-email', async (req, res) => {
  try {
    const { email, bookingId, paymentLink } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email es requerido' });
    }

    // Crear reserva de prueba
    const testBooking = {
      bookingId: bookingId || 'LC-TEST-123456',
      roomName: 'Junior Suite',
      checkIn: new Date('2026-03-15'),
      checkOut: new Date('2026-03-17'),
      nights: 2,
      guestInfo: {
        firstName: 'Prueba',
        lastName: 'Usuario',
        email: email,
        phone: '+52 4777 347474'
      },
      totalPrice: 5600,
      initialPayment: 2800,
      secondNightPayment: 2800
    };

    // URL de pago de prueba
    const testPaymentLink = paymentLink || 'https://hotel-lacapitana.com/reserva/pagar/L-TEST-123';

    console.log('📧 Enviando email de segundo pago de prueba a:', email);
    
    const result = await sendSecondPaymentReminderEmail(testBooking, testPaymentLink);
    
    res.json({
      success: true,
      message: 'Email de segundo pago enviado correctamente',
      result: result
    });
  } catch (error) {
    console.error('❌ Error en ruta de prueba:', error);
    res.status(500).json({ 
      error: 'Error enviando email de prueba',
      message: error.message 
    });
  }
});

module.exports = router;
