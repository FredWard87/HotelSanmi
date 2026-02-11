// routes/discountCodes.js
const express = require('express');
const router = express.Router();
const discountCodeController = require('../controllers/discountCodeController');

// POST /api/discount-codes -> Crear código (simplificado)
router.post('/', discountCodeController.createDiscountCode);

// POST /api/discount-codes/validate -> Validar código para reserva
router.post('/validate', discountCodeController.validateDiscountCode);

// GET /api/discount-codes -> Obtener todos los códigos
router.get('/', discountCodeController.getAllDiscountCodes);

// GET /api/discount-codes/:codeOrId -> Obtener código específico
router.get('/:codeOrId', discountCodeController.getDiscountCode);

// PATCH /api/discount-codes/:id -> Actualizar código
router.patch('/:id', discountCodeController.updateDiscountCode);

// DELETE /api/discount-codes/:id -> Eliminar código
router.delete('/:id', discountCodeController.deleteDiscountCode);

module.exports = router;
