// routes/guestAssignments.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const guestAssignmentController = require('../controllers/guestAssignmentController');

// Configurar multer para subir archivos
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'text/plain'
    ];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv|txt)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls) o CSV'));
    }
  }
});

// ADMIN: Seed de habitaciones de asignacion
router.post('/admin/seed-rooms', guestAssignmentController.seedAssignmentRooms);

// ADMIN: Obtener todas las habitaciones de asignacion
router.get('/admin/rooms', guestAssignmentController.getAllAssignmentRooms);

// ADMIN: Crear nueva asignacion
router.post('/', guestAssignmentController.createAssignment);

// ADMIN: Obtener todas las asignaciones
router.get('/', guestAssignmentController.getAllAssignments);

// ADMIN: Obtener detalles de asignacion
router.get('/:id', guestAssignmentController.getAssignmentDetails);

// ADMIN: Reenviar email de invitacion
router.post('/:id/resend-email', guestAssignmentController.resendInvitationEmail);

// ADMIN: Eliminar asignacion
router.delete('/:id', guestAssignmentController.deleteAssignment);

// ADMIN: Exportar a CSV
router.get('/:id/export', guestAssignmentController.exportAssignment);

// ADMIN: Carga masiva desde Excel (acepta JSON o archivo)
router.post('/bulk', upload.single('file'), guestAssignmentController.bulkUpload);

// ADMIN: Mantenimiento - eliminar indices problemáticos
router.post('/maintenance/fix-indexes', guestAssignmentController.fixIndexes);

// ADMIN: Obtener códigos de descuento para una asignación
router.get('/:id/discount-codes', guestAssignmentController.getDiscountCodesForAssignment);

// ADMIN: Enviar código de descuento por WhatsApp
router.post('/:id/send-discount-whatsapp', guestAssignmentController.sendDiscountCodeWhatsApp);

// ADMIN: Guardar grupos de fechas para una asignación
router.post('/:id/groups', guestAssignmentController.saveAssignmentGroups);

// PUBLIC: Validar token de precio preaprobado
router.get('/guest-price-token/:token', guestAssignmentController.getGuestPriceToken);
router.post('/guest-price-token/:token/consume', guestAssignmentController.consumeGuestPriceToken);

// ADMIN: Control de pagos - cruzar huéspedes con reservas
router.get('/:id/payment-status', guestAssignmentController.getPaymentStatus);

// PUBLICO: Obtener asignacion por token
router.get('/token/:token', guestAssignmentController.getAssignmentByToken);

// PUBLICO: Guardar asignacion
router.post('/token/:token/save', guestAssignmentController.saveAssignment);

module.exports = router;
