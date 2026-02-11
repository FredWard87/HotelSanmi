// controllers/discountCodeController.js
const DiscountCode = require('../models/DiscountCode');
const Room = require('../models/Room');
const Booking = require('../models/Booking');

// 🆕 SIMPLIFICADO: Crear código de descuento (solo 5 campos)
exports.createDiscountCode = async (req, res, next) => {
  try {
    const {
      code,
      description,
      finalPrice,
      validFrom,
      validUntil,
      applicableTo = 'all',
      active = true,
    } = req.body;

    console.log('=== CREANDO CÓDIGO DE DESCUENTO SIMPLIFICADO ===');
    console.log('Datos recibidos:', req.body);

    // Validaciones simples
    if (!code || !description || !finalPrice || !validFrom || !validUntil) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Faltan campos requeridos: code, description, finalPrice, validFrom, validUntil'
      });
    }

    if (finalPrice < 0) {
      return res.status(400).json({
        error: 'Invalid final price',
        message: 'El precio final no puede ser negativo'
      });
    }

    // Verificar que el código no exista
    const existing = await DiscountCode.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(409).json({
        error: 'Code already exists',
        message: 'Este código ya existe'
      });
    }

    // Validar fechas
    const validFromDate = new Date(validFrom);
    const validUntilDate = new Date(validUntil);

    if (validUntilDate <= validFromDate) {
      return res.status(400).json({
        error: 'Invalid dates',
        message: 'La fecha de fin debe ser posterior a la fecha de inicio'
      });
    }

    // Crear el código
    const discountCode = new DiscountCode({
      code: code.toUpperCase().trim(),
      description: description.trim(),
      finalPrice: Number(finalPrice),
      validFrom: validFromDate,
      validUntil: validUntilDate,
      applicableTo,
      active,
      nights: 2 // Siempre 2 noches para bodas
    });

    await discountCode.save();

    console.log('✅ Código creado exitosamente:', discountCode.code);
    console.log('💰 Precio final:', discountCode.finalPrice);

    res.status(201).json({
      success: true,
      message: 'Código de descuento creado exitosamente',
      discountCode
    });
  } catch (error) {
    console.error('Error creando código de descuento:', error);
    next(error);
  }
};

// 🆕 SIMPLIFICADO: Obtener todos los códigos
exports.getAllDiscountCodes = async (req, res, next) => {
  try {
    const { active, limit = 100 } = req.query;

    const filter = {};
    if (active !== undefined) {
      filter.active = active === 'true';
    }

    const discountCodes = await DiscountCode.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      count: discountCodes.length,
      discountCodes
    });
  } catch (error) {
    console.error('Error obteniendo códigos:', error);
    next(error);
  }
};

// 🆕 SIMPLIFICADO: Obtener código por ID o código
exports.getDiscountCode = async (req, res, next) => {
  try {
    const { codeOrId } = req.params;

    let discountCode;
    
    // Intentar buscar por código primero
    discountCode = await DiscountCode.findOne({ code: codeOrId.toUpperCase() });

    // Si no se encuentra, buscar por ID
    if (!discountCode) {
      discountCode = await DiscountCode.findById(codeOrId);
    }

    if (!discountCode) {
      return res.status(404).json({
        error: 'Code not found',
        message: 'Código no encontrado'
      });
    }

    res.json({
      success: true,
      discountCode
    });
  } catch (error) {
    console.error('Error obteniendo código:', error);
    next(error);
  }
};

// 🔥 CORREGIDO: Validar código para una reserva - ahora pasa checkIn
exports.validateDiscountCode = async (req, res, next) => {
  try {
    const { code, checkIn, checkOut, nights, totalPrice, roomId } = req.body;

    console.log('=== VALIDANDO CÓDIGO DE DESCUENTO ===');
    console.log('Código:', code);
    console.log('Check-in:', checkIn);
    console.log('Check-out:', checkOut);
    console.log('Noches:', nights);
    console.log('Precio total original:', totalPrice);
    console.log('Room ID:', roomId);

    if (!code || !nights || !totalPrice || !roomId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Faltan campos requeridos'
      });
    }

    // Buscar el código
    const discountCode = await DiscountCode.findOne({ 
      code: code.toUpperCase().trim(),
      active: true 
    });

    if (!discountCode) {
      return res.status(404).json({
        valid: false,
        error: 'Code not found',
        message: 'Código no encontrado o inactivo'
      });
    }

    console.log('✅ Código encontrado:', discountCode.code);
    console.log('💰 Precio final configurado:', discountCode.finalPrice);

    // Obtener información de la habitación
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        valid: false,
        error: 'Room not found',
        message: 'Habitación no encontrada'
      });
    }

    // 🔥 CORREGIDO: Pasar checkIn a la validación
    const validation = discountCode.isValidForBooking({
      nights: Number(nights),
      roomLugar: room.lugar,
      checkIn: checkIn // 🔥 AGREGADO: Pasar fecha de check-in
    });

    if (!validation.valid) {
      console.log('❌ Validación fallida:', validation.reason);
      return res.status(400).json({
        valid: false,
        message: validation.reason
      });
    }

    // Calcular precio final y descuento
    const finalPrice = discountCode.calculateFinalPrice(Number(totalPrice));
    const discountAmount = discountCode.calculateDiscountAmount(Number(totalPrice));

    console.log('💰 Resultado:');
    console.log('  - Precio original:', totalPrice);
    console.log('  - Precio final:', finalPrice);
    console.log('  - Descuento aplicado:', discountAmount);

    res.json({
      valid: true,
      discountCode: {
        _id: discountCode._id,
        code: discountCode.code,
        description: discountCode.description,
        finalPrice: discountCode.finalPrice
      },
      discountAmount,
      originalTotal: Number(totalPrice),
      finalPrice,
      message: `Precio especial para bodas: $${finalPrice.toFixed(2)} MXN (2 noches)`
    });
  } catch (error) {
    console.error('Error validando código:', error);
    next(error);
  }
};

// 🆕 SIMPLIFICADO: Actualizar código
exports.updateDiscountCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    console.log('=== ACTUALIZANDO CÓDIGO DE DESCUENTO ===');
    console.log('ID:', id);
    console.log('Datos:', updateData);

    // No permitir cambiar el código una vez creado
    delete updateData.code;
    delete updateData.uses;

    const discountCode = await DiscountCode.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!discountCode) {
      return res.status(404).json({
        error: 'Code not found',
        message: 'Código no encontrado'
      });
    }

    console.log('✅ Código actualizado:', discountCode.code);

    res.json({
      success: true,
      message: 'Código actualizado exitosamente',
      discountCode
    });
  } catch (error) {
    console.error('Error actualizando código:', error);
    next(error);
  }
};

// 🆕 SIMPLIFICADO: Eliminar código
exports.deleteDiscountCode = async (req, res, next) => {
  try {
    const { id } = req.params;

    console.log('=== ELIMINANDO CÓDIGO DE DESCUENTO ===');
    console.log('ID:', id);

    const discountCode = await DiscountCode.findByIdAndDelete(id);

    if (!discountCode) {
      return res.status(404).json({
        error: 'Code not found',
        message: 'Código no encontrado'
      });
    }

    console.log('✅ Código eliminado:', discountCode.code);

    res.json({
      success: true,
      message: 'Código eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando código:', error);
    next(error);
  }
};
