// controllers/bookingController.js
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const RoomBlock = require('../models/RoomBlock');
const DiscountCode = require('../models/DiscountCode');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { generateAndSendVoucher } = require('../services/pdfService');
const { generateCheckinPDF } = require('../services/checkinPdfService');

// ─────────────────────────────────────────────
// FUNCIONES AUXILIARES
// ─────────────────────────────────────────────

// Generar ID único para reserva
const generateBookingId = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substr(2, 9).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  return `LC-${year}-${timestamp}${random.substr(0, 3)}`;
};

// 🔥 CORREGIDO: Formatear fecha SIN conversión de zona horaria
// Mantener la fecha exacta como viene (YYYY-MM-DD a las 00:00:00)
const formatDateWithTimezone = (value) => {
  if (!value) return null;
  
  // Si es string en formato YYYY-MM-DD, crear fecha en UTC a medianoche
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }
  
  // Si es Date o string con hora, extraer solo la parte de fecha
  const d = new Date(value);
  if (isNaN(d)) return null;
  
  // Crear nueva fecha en UTC usando los componentes de fecha local
  return new Date(Date.UTC(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    0, 0, 0, 0
  ));
};

// Sanitizar valores undefined/null/string "undefined"
const sanitizeValue = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'undefined' || trimmed.toLowerCase() === 'null') {
      return null;
    }
    return trimmed;
  }
  return value;
};

// Convertir a booleano seguro
const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  if (typeof value === 'number') return value !== 0;
  return Boolean(value);
};

// Formatear moneda MXN
function formatMXN(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
}

// ─────────────────────────────────────────────
// FUNCIÓN CENTRAL DE DISPONIBILIDAD
// ─────────────────────────────────────────────

async function checkRoomAvailabilityInternal(roomId, startDate, endDate, options = {}) {
  const { ignoreBlocks = false } = options;
  
  const room = await Room.findById(roomId);
  if (!room) {
    return {
      available: false,
      error: 'Habitación no encontrada',
      totalUnits: 0,
      availableUnits: 0,
      bookedUnits: 0,
      blockedUnits: 0
    };
  }

  const start = formatDateWithTimezone(startDate);
  const end = formatDateWithTimezone(endDate);

  // 1. Contar reservas activas que se solapan
  const overlappingBookings = await Booking.countDocuments({
    roomId: room._id,
    status: 'active',
    $or: [
      { checkIn: { $lt: end }, checkOut: { $gt: start } }
    ]
  });

  // 2. Contar unidades bloqueadas considerando SCOPE
  let overlappingBlocks = [];
  let maxBlockedByBlocks = 0;

  if (!ignoreBlocks) {
    overlappingBlocks = await RoomBlock.find({
      $or: [
        { scope: 'specific', roomId: room._id, active: true },
        { scope: 'all', active: true },
        { scope: 'casaHotel', affectedRooms: room._id, active: true },
        { scope: 'boutique', affectedRooms: room._id, active: true }
      ],
      $or: [
        { startDate: { $lt: end }, endDate: { $gt: start } }
      ]
    });

    overlappingBlocks.forEach(block => {
      if (block.blockAll) {
        maxBlockedByBlocks = Math.max(maxBlockedByBlocks, room.totalUnits);
      } else {
        maxBlockedByBlocks = Math.max(maxBlockedByBlocks, block.quantityBlocked || 0);
      }
    });
  }

  // 3. Calcular disponibilidad
  const totalUnits = room.totalUnits || 1;
  const totalBlocked = overlappingBookings + maxBlockedByBlocks;
  const unavailableUnits = Math.min(totalBlocked, totalUnits);
  const availableUnits = Math.max(0, totalUnits - unavailableUnits);

  return {
    available: availableUnits > 0,
    totalUnits,
    availableUnits,
    bookedUnits: overlappingBookings,
    blockedUnits: maxBlockedByBlocks,
    room,
    blocks: overlappingBlocks
  };
}

// ─────────────────────────────────────────────
// FUNCIÓN INTERNA: Enviar email de confirmación
// ─────────────────────────────────────────────

async function sendBookingConfirmationEmail(booking) {
  try {
    console.log(`\n📧 ===== INICIANDO ENVÍO DE EMAIL =====`);
    console.log(`📧 Para: ${booking.guestInfo.email}`);
    console.log(`📧 Booking ID: ${booking.bookingId}`);
    console.log(`📧 Habitación: ${booking.roomName}`);
    console.log(`📧 Huésped: ${booking.guestInfo.firstName} ${booking.guestInfo.lastName}`);

    const result = await generateAndSendVoucher(booking);

    if (result && result.success) {
      console.log(`✅ EMAIL ENVIADO EXITOSAMENTE a ${booking.guestInfo.email}`);
      console.log(`✅ MessageId: ${result.messageId || 'N/A'}`);
    } else {
      console.log(`⚠️ Email enviado pero sin confirmación de éxito`);
    }

    console.log(`📧 ===== FIN ENVÍO DE EMAIL =====\n`);
    return { success: true, ...result };
  } catch (error) {
    console.error(`\n❌ ===== ERROR ENVIANDO EMAIL =====`);
    console.error(`❌ Para: ${booking.guestInfo.email}`);
    console.error(`❌ Booking: ${booking.bookingId}`);
    console.error(`❌ Error:`, error.message);
    console.error(`❌ Stack:`, error.stack);
    if (error.code) console.error(`❌ Code:`, error.code);
    if (error.command) console.error(`❌ Command:`, error.command);
    if (error.response) console.error(`❌ Response:`, error.response);
    console.error(`❌ ===== FIN ERROR EMAIL =====\n`);
    
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      command: error.command
    };
  }
}

// ─────────────────────────────────────────────
// CONTROLADORES
// ─────────────────────────────────────────────

// Obtener todas las reservas
exports.getAllBookings = async (req, res, next) => {
  try {
    const { status, startDate, endDate, limit = 100 } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (startDate && endDate) {
      const start = formatDateWithTimezone(startDate);
      const end = formatDateWithTimezone(endDate);
      filter.checkIn = { $gte: start };
      filter.checkOut = { $lte: end };
    }

    const bookings = await Booking.find(filter)
      .populate('roomId', 'name type totalUnits')
      .populate('discountCodeId', 'code description discountType discountValue')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json(bookings);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    next(error);
  }
};

// Obtener estadísticas de reservas
exports.getBookingStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};

    if (startDate && endDate) {
      const start = formatDateWithTimezone(startDate);
      const end = formatDateWithTimezone(endDate);
      filter.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    const stats = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
          totalTax: { $sum: '$tax' },
          totalMunicipalTax: { $sum: '$municipalTax' },
          totalDiscount: { $sum: '$discountAmount' },
          avgPrice: { $avg: '$totalPrice' }
        }
      }
    ]);

    const roomStats = await Booking.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$roomId',
          roomName: { $first: '$roomName' },
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' }
        }
      },
      { $sort: { totalBookings: -1 } },
      { $limit: 10 }
    ]);

    const totalBookings = await Booking.countDocuments(filter);
    const activeBookings = await Booking.countDocuments({ ...filter, status: 'active' });
    const cancelledBookings = await Booking.countDocuments({ ...filter, status: 'cancelled' });

    const totalRevenue = await Booking.aggregate([
      { $match: { ...filter, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    const totalDiscountGiven = await Booking.aggregate([
      { $match: { ...filter, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$discountAmount' } } }
    ]);

    res.json({
      summary: {
        totalBookings,
        activeBookings,
        cancelledBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalTaxCollected: stats.reduce((sum, stat) => sum + (stat.totalTax || 0), 0),
        totalMunicipalTaxCollected: stats.reduce((sum, stat) => sum + (stat.totalMunicipalTax || 0), 0),
        totalDiscountGiven: totalDiscountGiven[0]?.total || 0
      },
      roomStats,
      byStatus: stats,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    next(error);
  }
};

// Estadísticas de uso de códigos de descuento
exports.getDiscountCodeUsageStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const match = { discountCodeId: { $ne: null } };

    if (startDate && endDate) {
      const start = formatDateWithTimezone(startDate);
      const end = formatDateWithTimezone(endDate);
      match.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    const stats = await Booking.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$discountCodeId',
          code: { $first: '$discountCode' },
          totalUses: { $sum: 1 },
          totalDiscountGiven: { $sum: '$discountAmount' },
          totalRevenue: { $sum: '$totalPrice' },
          averageDiscount: { $avg: '$discountAmount' },
          minDiscount: { $min: '$discountAmount' },
          maxDiscount: { $max: '$discountAmount' }
        }
      },
      {
        $lookup: {
          from: 'discountcodes',
          localField: '_id',
          foreignField: '_id',
          as: 'codeDetails'
        }
      },
      { $unwind: { path: '$codeDetails', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          code: 1,
          totalUses: 1,
          totalDiscountGiven: 1,
          totalRevenue: 1,
          averageDiscount: 1,
          minDiscount: 1,
          maxDiscount: 1,
          discountType: '$codeDetails.discountType',
          discountValue: '$codeDetails.discountValue',
          active: '$codeDetails.active',
          validFrom: '$codeDetails.validFrom',
          validUntil: '$codeDetails.validUntil'
        }
      },
      { $sort: { totalUses: -1 } }
    ]);

    const totals = await Booking.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalBookingsWithDiscount: { $sum: 1 },
          totalDiscountGiven: { $sum: '$discountAmount' },
          totalRevenueWithDiscount: { $sum: '$totalPrice' },
          avgDiscountPerBooking: { $avg: '$discountAmount' }
        }
      }
    ]);

    const monthlyStats = await Booking.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          monthUses: { $sum: 1 },
          monthDiscount: { $sum: '$discountAmount' },
          monthRevenue: { $sum: '$totalPrice' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      stats,
      totals: totals[0] || {
        totalBookingsWithDiscount: 0,
        totalDiscountGiven: 0,
        totalRevenueWithDiscount: 0,
        avgDiscountPerBooking: 0
      },
      monthlyStats,
      summary: {
        totalCodes: stats.length,
        activeCodes: stats.filter(s => s.active === true).length,
        mostUsedCode: stats.length > 0 ? stats[0] : null,
        highestDiscountCode: stats.length > 0
          ? [...stats].sort((a, b) => b.totalDiscountGiven - a.totalDiscountGiven)[0]
          : null
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas de códigos:', error);
    next(error);
  }
};

// Verificar disponibilidad de una habitación
exports.checkAvailability = async (req, res, next) => {
  try {
    const { roomId, checkIn, checkOut } = req.query;

    if (!roomId || !checkIn || !checkOut) {
      return res.status(400).json({
        message: 'Se requieren roomId, checkIn y checkOut'
      });
    }

    const start = formatDateWithTimezone(checkIn);
    const end = formatDateWithTimezone(checkOut);

    if (end <= start) {
      return res.status(400).json({
        message: 'La fecha de salida debe ser posterior a la fecha de entrada'
      });
    }

    const availability = await checkRoomAvailabilityInternal(roomId, start, end);

    if (availability.error) {
      return res.status(404).json({ message: availability.error });
    }

    res.json({
      roomId: availability.room._id,
      roomName: availability.room.name,
      totalUnits: availability.totalUnits,
      bookedUnits: availability.bookedUnits,
      blockedUnits: availability.blockedUnits,
      availableUnits: availability.availableUnits,
      isAvailable: availability.available,
      blocks: availability.blocks.map(b => ({
        id: b._id,
        type: b.blockType,
        reason: b.reason,
        scope: b.scope,
        startDate: b.startDate,
        endDate: b.endDate,
        blockAll: b.blockAll,
        quantityBlocked: b.quantityBlocked,
        affectsAllUnits: b.blockAll
      })),
      checkIn: start,
      checkOut: end
    });
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    next(error);
  }
};

// Verificar disponibilidad para múltiples habitaciones por SCOPE
exports.checkMultipleAvailability = async (req, res, next) => {
  try {
    const { checkIn, checkOut, scope } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        message: 'Se requieren checkIn y checkOut'
      });
    }

    const start = formatDateWithTimezone(checkIn);
    const end = formatDateWithTimezone(checkOut);

    if (end <= start) {
      return res.status(400).json({
        message: 'La fecha de salida debe ser posterior a la fecha de entrada'
      });
    }

    let filter = {};
    if (scope === 'casaHotel') {
      filter.lugar = 'casaHotel';
    } else if (scope === 'boutique') {
      filter.lugar = 'boutique';
    }

    const rooms = await Room.find(filter);
    const availabilityResults = [];

    for (const room of rooms) {
      const availability = await checkRoomAvailabilityInternal(room._id, start, end);

      availabilityResults.push({
        roomId: room._id,
        roomName: room.name,
        roomType: room.type,
        lugar: room.lugar,
        totalUnits: availability.totalUnits,
        bookedUnits: availability.bookedUnits,
        blockedUnits: availability.blockedUnits,
        availableUnits: availability.availableUnits,
        isAvailable: availability.available,
        blocks: availability.blocks.map(b => ({
          type: b.blockType,
          reason: b.reason,
          scope: b.scope
        }))
      });
    }

    res.json({
      checkIn: start,
      checkOut: end,
      scope: scope || 'all',
      totalRooms: rooms.length,
      availableRooms: availabilityResults.filter(r => r.isAvailable).length,
      rooms: availabilityResults,
      summary: {
        totalAvailable: availabilityResults.filter(r => r.isAvailable).length,
        totalUnavailable: availabilityResults.filter(r => !r.isAvailable).length,
        totalBlockedByScope: availabilityResults.filter(r =>
          r.blocks.some(b => b.scope !== 'specific')
        ).length
      }
    });
  } catch (error) {
    console.error('Error al verificar disponibilidad múltiple:', error);
    next(error);
  }
};

// Crear Payment Intent con Stripe
exports.createPaymentIntent = async (req, res, next) => {
  try {
    const { amount, currency = 'mxn' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: 'Se requiere un monto válido'
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: {
        integration_check: 'accept_a_payment'
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creando Payment Intent:', error);
    next(error);
  }
};

// Crear reserva - CORREGIDO CON FECHAS Y PRECIO MANUAL
exports.createBooking = async (req, res, next) => {
  try {
    const {
      roomId,
      roomName,
      guestInfo,
      checkIn,
      checkOut,
      nights,
      pricePerNight,
      subtotal,
      tax,
      municipalTax,
      totalPrice,
      paymentIntentId,
      paymentMethodId,
      specialRequests,
      discountCode
    } = req.body;

    console.log('=== CREANDO RESERVA ===');
    console.log('Check-in recibido:', checkIn);
    console.log('Check-out recibido:', checkOut);
    console.log('Código de descuento recibido:', discountCode);
    console.log('Email del huésped:', guestInfo?.email);
    console.log('Usuario que crea la reserva:', req.user?.email, '| Rol:', req.user?.role);

    // Validar datos requeridos
    if (!roomId || !guestInfo || !checkIn || !checkOut || !nights || !pricePerNight) {
      return res.status(400).json({
        message: 'Faltan datos requeridos',
        error: 'Missing required fields'
      });
    }

    // Validar que el email no esté vacío
    if (!guestInfo.email || guestInfo.email.trim() === '') {
      return res.status(400).json({
        message: 'El email del huésped es requerido',
        error: 'Email required'
      });
    }

    // 🔥 CORREGIDO: Formatear fechas SIN conversión de zona horaria
    const startDate = formatDateWithTimezone(checkIn);
    const endDate = formatDateWithTimezone(checkOut);

    console.log('Fechas formateadas (UTC):');
    console.log('  - Check-in:', startDate);
    console.log('  - Check-out:', endDate);

    if (endDate <= startDate) {
      return res.status(400).json({
        message: 'La fecha de salida debe ser posterior a la fecha de entrada'
      });
    }

    // DETERMINAR SI SE DEBEN IGNORAR BLOQUEOS
    const isAdmin = req.user && req.user.role === 'admin';
    const shouldIgnoreBlocks = isAdmin;

    if (shouldIgnoreBlocks) {
      console.log('🔓 ADMIN DETECTADO - IGNORANDO BLOQUEOS DE HABITACIÓN');
    }

    // Verificar disponibilidad
    const availability = await checkRoomAvailabilityInternal(
      roomId, 
      startDate, 
      endDate, 
      { ignoreBlocks: shouldIgnoreBlocks }
    );

    if (!availability.available) {
      let message = `❌ Lo sentimos, esta habitación no está disponible para las fechas seleccionadas.\n\n`;

      if (availability.error) {
        message = availability.error;
      } else {
        message += `📊 Estado de disponibilidad:\n`;
        message += `• Total de unidades: ${availability.totalUnits}\n`;
        message += `• Reservadas: ${availability.bookedUnits}\n`;
        message += `• Bloqueadas: ${availability.blockedUnits}\n`;
        message += `• Disponibles: ${availability.availableUnits}\n\n`;

        if (availability.blocks && availability.blocks.length > 0) {
          message += `🚫 Motivo del bloqueo:\n`;
          availability.blocks.forEach(block => {
            const reason = block.reason || block.blockType;
            message += `• ${reason} (${new Date(block.startDate).toLocaleDateString('es-MX')} - ${new Date(block.endDate).toLocaleDateString('es-MX')})\n`;
          });
        }

        message += `\n💡 Por favor, intenta con otras fechas o selecciona otra habitación.`;
      }

      return res.status(409).json({
        message,
        error: 'Room not available',
        details: {
          totalUnits: availability.totalUnits,
          bookedUnits: availability.bookedUnits,
          blockedUnits: availability.blockedUnits,
          availableUnits: availability.availableUnits,
          blocks: availability.blocks.map(b => ({
            type: b.blockType,
            reason: b.reason,
            scope: b.scope,
            blockAll: b.blockAll
          }))
        }
      });
    }

    if (shouldIgnoreBlocks && availability.blockedUnits > 0) {
      console.log(`⚠️ ADMIN OVERRIDE: Se ignoraron ${availability.blockedUnits} unidades bloqueadas`);
    }

    // 🔥 CORREGIDO: Manejo de precio manual vs automático
    let discountAmount = 0;
    let discountCodeDoc = null;
    const originalSubtotal = pricePerNight * nights;
    const originalTotal = originalSubtotal * 1.20;

    let finalTotal;
    let isPrecioManual = false;
    let finalSubtotal;
    let finalTax;
    let finalMunicipalTax;

    if (totalPrice && typeof totalPrice === 'number' && totalPrice > 0) {
      // 🆕 PRECIO MANUAL - YA INCLUYE IMPUESTOS
      finalTotal = totalPrice;
      isPrecioManual = true;
      
      // Extraer impuestos del precio manual
      finalTax = finalTotal * (16 / 120);
      finalMunicipalTax = finalTotal * (4 / 120);
      finalSubtotal = finalTotal - finalTax - finalMunicipalTax;
      
      console.log('💰 Usando PRECIO MANUAL (ya incluye impuestos):');
      console.log('  - Total recibido:', finalTotal);
      console.log('  - Subtotal (extraído):', finalSubtotal.toFixed(2));
      console.log('  - IVA 16% (extraído):', finalTax.toFixed(2));
      console.log('  - Municipal 4% (extraído):', finalMunicipalTax.toFixed(2));
      
    } else {
      // PRECIO AUTOMÁTICO - aplicar descuentos si hay
      finalTotal = originalTotal;
      
      if (discountCode && discountCode.trim()) {
        console.log('🎟️ Validando código de descuento:', discountCode);

        discountCodeDoc = await DiscountCode.findOne({
          code: discountCode.toUpperCase().trim(),
          active: true
        });

        if (!discountCodeDoc) {
          console.log('❌ Código no encontrado o inactivo');
          return res.status(404).json({
            error: 'Discount code not found',
            message: 'Código de descuento no encontrado o inactivo'
          });
        }

        console.log('✅ Código encontrado:', discountCodeDoc.code);

        const validation = discountCodeDoc.isValidForBooking({
          nights: Number(nights),
          roomLugar: availability.room.lugar
        });

        if (!validation.valid) {
          console.log('❌ Código no válido:', validation.reason);
          return res.status(400).json({
            error: 'Invalid discount code',
            message: validation.reason
          });
        }

        finalTotal = discountCodeDoc.finalPrice;
        discountAmount = originalTotal - finalTotal;

        console.log('💰 Descuento aplicado (precio fijo):');
        console.log('  - Precio original (con impuestos):', originalTotal);
        console.log('  - Precio final (código):', finalTotal);
        console.log('  - Descuento total:', discountAmount);
      }

      finalTax = finalTotal * (16 / 120);
      finalMunicipalTax = finalTotal * (4 / 120);
      finalSubtotal = finalTotal - finalTax - finalMunicipalTax;
    }

    console.log('📊 Cálculo final:');
    console.log('  - Subtotal:', finalSubtotal.toFixed(2));
    console.log('  - IVA 16%:', finalTax.toFixed(2));
    console.log('  - Impuesto Municipal 4%:', finalMunicipalTax.toFixed(2));
    console.log('  - Total:', finalTotal.toFixed(2));

    // Lógica de pagos
    let initialPayment, secondNightPayment;
    if (Number(nights) === 1) {
      initialPayment = finalTotal;
      secondNightPayment = 0;
    } else {
      initialPayment = finalTotal * 0.5;
      secondNightPayment = finalTotal * 0.5;
    }

    // VERIFICAR PAYMENT INTENT
    let stripeChargeId = null;
    let paymentStatus = 'pending';

    if (paymentIntentId) {
      try {
        if (paymentIntentId.startsWith('pi_TEST_')) {
          console.log('⚠️ Usando Payment Intent de prueba:', paymentIntentId);
          stripeChargeId = `ch_TEST_${paymentIntentId.slice(8)}`;
          paymentStatus = initialPayment === finalTotal ? 'completed' : 'partial';
        } else {
          const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
          if (paymentIntent.status === 'succeeded') {
            stripeChargeId = paymentIntent.latest_charge;
            paymentStatus = initialPayment === finalTotal ? 'completed' : 'partial';
          } else {
            return res.status(400).json({
              error: 'Payment not completed',
              message: `Estado del pago: ${paymentIntent.status}`
            });
          }
        }
      } catch (stripeErr) {
        console.error('Error verificando Payment Intent:', stripeErr);
        return res.status(400).json({
          error: 'Failed to verify payment',
          message: 'No se pudo verificar el pago con Stripe'
        });
      }
    } else {
      console.log('⚠️ Creando reserva sin Payment Intent - estado: pending');
      paymentStatus = 'pending';
    }

    // Generar ID de reserva único
    const bookingId = generateBookingId();

    // Crear la reserva
    const newBooking = new Booking({
      bookingId,
      roomId: availability.room._id,
      roomName: availability.room.name,
      guestInfo,
      checkIn: startDate,
      checkOut: endDate,
      nights,
      pricePerNight,
      subtotalBeforeDiscount: originalSubtotal,
      discountCode: discountCodeDoc ? discountCodeDoc.code : null,
      discountCodeId: discountCodeDoc ? discountCodeDoc._id : null,
      discountAmount,
      subtotal: finalSubtotal,
      tax: finalTax,
      municipalTax: finalMunicipalTax,
      totalPrice: finalTotal,
      initialPayment,
      secondNightPayment,
      secondNightPaid: false,
      paymentStatus,
      paymentIntentId: paymentIntentId || null,
      stripePaymentIntentId: paymentIntentId || null,
      stripeChargeId: stripeChargeId || null,
      secondNightNoteId: secondNightPayment > 0 ? `NOTE-${bookingId}-2ND-NIGHT` : null,
      status: 'active',
      specialRequests: specialRequests || '',
      createdBy: req.user ? req.user._id : null,
      createdByRole: req.user ? req.user.role : 'guest',
      adminOverride: shouldIgnoreBlocks && availability.blockedUnits > 0,
      isPrecioManual: isPrecioManual
    });

    await newBooking.save();

    console.log(`✅ Reserva creada: ${newBooking.bookingId} para ${guestInfo.email}`);
    if (newBooking.adminOverride) {
      console.log(`🔓 Reserva creada con ADMIN OVERRIDE (ignoró bloqueos)`);
    }
    if (isPrecioManual) {
      console.log(`💰 Reserva creada con PRECIO MANUAL: ${formatMXN(finalTotal)}`);
    }

    // Incrementar uso del código de descuento
    if (discountCodeDoc) {
      console.log('📈 Incrementando uso del código:', discountCodeDoc.code);
      discountCodeDoc.currentUses = (discountCodeDoc.currentUses || 0) + 1;
      await discountCodeDoc.save();
    }

    // ENVIAR EMAIL DE CONFIRMACIÓN
    console.log(`\n📧 Preparando envío de email a ${guestInfo.email}...`);
    
    let emailResult = null;
    try {
      emailResult = await generateAndSendVoucher(newBooking);
      console.log(`✅ Email procesado, resultado:`, emailResult ? 'Éxito' : 'Completado');
    } catch (emailError) {
      console.error(`❌ Error crítico enviando email:`, emailError);
    }

    let successMessage = '✅ Reserva creada exitosamente. Revisa tu email para el voucher.';
    
    if (discountAmount > 0) {
      successMessage = `✅ Reserva confirmada con descuento de ${formatMXN(discountAmount)} aplicado. Revisa tu email para el voucher.`;
    } else if (isPrecioManual) {
      successMessage = `✅ Reserva creada con precio personalizado de ${formatMXN(finalTotal)}. Revisa tu email para el voucher.`;
    }

    res.status(201).json({
      success: true,
      message: successMessage,
      bookingId: newBooking.bookingId,
      booking: newBooking,
      discountApplied: discountAmount > 0,
      discountAmount,
      discountCode: discountCodeDoc ? discountCodeDoc.code : null,
      emailSent: emailResult ? true : false,
      adminOverride: newBooking.adminOverride || false,
      isPrecioManual: isPrecioManual,
      secondNightNote: secondNightPayment > 0 ? {
        id: newBooking.secondNightNoteId,
        amount: secondNightPayment,
        message: `El 50% restante (${formatMXN(secondNightPayment)}) se pagará en recepción al check-in.`
      } : null
    });

    console.log(`✅ Respuesta enviada al cliente`);
  } catch (error) {
    console.error('Error al crear reserva:', error);
    next(error);
  }
};

// Obtener reserva por bookingId
exports.getBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId })
      .populate('roomId')
      .populate('discountCodeId');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found', message: 'Reserva no encontrada' });
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

// Obtener reserva por ID de MongoDB o bookingId
exports.getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let booking;
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      booking = await Booking.findById(id);
    } else {
      booking = await Booking.findOne({ bookingId: id });
    }

    if (!booking) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    res.json(booking);
  } catch (error) {
    console.error('Error al obtener reserva:', error);
    next(error);
  }
};

// Actualizar reserva
exports.updateBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { checkIn, checkOut, roomId, guestInfo, status } = req.body;

    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found',
        message: 'Reserva no encontrada'
      });
    }

    const isAdmin = req.user && req.user.role === 'admin';
    const shouldIgnoreBlocks = isAdmin;

    if ((checkIn && checkOut) || roomId) {
      const newRoomId = roomId || booking.roomId;
      const newCheckIn = formatDateWithTimezone(checkIn || booking.checkIn);
      const newCheckOut = formatDateWithTimezone(checkOut || booking.checkOut);

      const availability = await checkRoomAvailabilityInternal(
        newRoomId, 
        newCheckIn, 
        newCheckOut,
        { ignoreBlocks: shouldIgnoreBlocks }
      );

      if (!availability.available) {
        return res.status(409).json({
          error: 'Room not available',
          message: `No hay disponibilidad para las nuevas fechas. Solo hay ${availability.availableUnits} unidades disponibles.`,
          details: {
            totalUnits: availability.totalUnits,
            bookedUnits: availability.bookedUnits,
            blockedUnits: availability.blockedUnits,
            availableUnits: availability.availableUnits
          }
        });
      }

      if (roomId && roomId !== booking.roomId.toString()) {
        booking.roomId = newRoomId;
        booking.roomName = availability.room.name;
      }
    }

    if (checkIn && checkOut) {
      const startDate = formatDateWithTimezone(checkIn);
      const endDate = formatDateWithTimezone(checkOut);

      if (endDate <= startDate) {
        return res.status(400).json({
          error: 'Invalid dates',
          message: 'La fecha de check-out debe ser posterior a la de check-in'
        });
      }

      const newNights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      booking.nights = newNights;
      booking.checkIn = startDate;
      booking.checkOut = endDate;

      let newSubtotal = booking.pricePerNight * newNights;
      let discountAmount = 0;

      if (booking.discountCodeId) {
        const discountCodeDoc = await DiscountCode.findById(booking.discountCodeId);
        if (discountCodeDoc && discountCodeDoc.active) {
          const validation = discountCodeDoc.isValidForBooking({
            checkIn: startDate,
            checkOut: endDate,
            nights: newNights,
            subtotal: newSubtotal,
            roomId: booking.roomId,
            roomLugar: (await Room.findById(booking.roomId)).lugar
          });

          if (validation.valid) {
            discountAmount = discountCodeDoc.calculateDiscount(newSubtotal);
            newSubtotal = newSubtotal - discountAmount;
          } else {
            booking.discountCode = null;
            booking.discountCodeId = null;
            booking.discountAmount = 0;
          }
        }
      }

      const newTax = newSubtotal * 0.16;
      const newMunicipalTax = newSubtotal * 0.04;
      const newTotalPrice = newSubtotal + newTax + newMunicipalTax;

      booking.subtotalBeforeDiscount = booking.pricePerNight * newNights;
      booking.discountAmount = discountAmount;
      booking.subtotal = newSubtotal;
      booking.tax = newTax;
      booking.municipalTax = newMunicipalTax;
      booking.totalPrice = newTotalPrice;

      if (newNights === 1) {
        booking.initialPayment = newTotalPrice;
        booking.secondNightPayment = 0;
      } else {
        booking.initialPayment = newTotalPrice * 0.5;
        booking.secondNightPayment = newTotalPrice * 0.5;
      }
    }

    if (guestInfo) {
      booking.guestInfo = {
        ...booking.guestInfo.toObject(),
        ...guestInfo
      };
    }

    if (status) {
      booking.status = status;
    }

    booking.updatedAt = Date.now();
    await booking.save();
    await booking.populate('roomId', 'name type totalUnits');
    await booking.populate('discountCodeId', 'code description');

    res.json({
      success: true,
      message: 'Reserva actualizada exitosamente',
      booking
    });
  } catch (error) {
    console.error('Error al actualizar reserva:', error);
    next(error);
  }
};

// Cancelar reserva
exports.cancelBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'La reserva ya está cancelada' });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason || 'Cancelado por el huésped';
    booking.cancelledAt = Date.now();
    booking.updatedAt = Date.now();

    await booking.save();

    try {
      if (booking.stripeChargeId || booking.paymentIntentId) {
        console.log(`Reembolso necesario para reserva ${booking.bookingId}`);
      }
    } catch (stripeError) {
      console.error('Error procesando reembolso:', stripeError);
    }

    await booking.populate('roomId', 'name type totalUnits');
    await booking.populate('discountCodeId', 'code description');

    res.json({
      success: true,
      message: 'Reserva cancelada exitosamente',
      booking
    });
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    next(error);
  }
};

// Marcar segunda noche como pagada
exports.markSecondNightPaid = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found',
        message: 'Reserva no encontrada'
      });
    }

    if (booking.secondNightPayment === 0) {
      return res.status(400).json({
        message: 'Esta reserva no tiene pago de segunda noche pendiente'
      });
    }

    if (booking.secondNightPaid || booking.secondNightNotePaid) {
      return res.status(400).json({
        error: 'Already paid',
        message: 'La segunda noche ya fue marcada como pagada'
      });
    }

    booking.secondNightPaid = true;
    booking.secondNightNotePaid = true;
    booking.paymentStatus = 'completed';
    booking.updatedAt = Date.now();

    await booking.save();
    await booking.populate('roomId', 'name type totalUnits');
    await booking.populate('discountCodeId', 'code description');

    res.json({
      success: true,
      message: '✅ Segunda noche marcada como pagada. Estado actualizado a completado.',
      booking
    });
  } catch (error) {
    console.error('Error al marcar segunda noche como pagada:', error);
    next(error);
  }
};

// Generar documento de check-in con firma
exports.generateCheckin = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const rawBody = req.body || {};

    const signature = sanitizeValue(rawBody.signature);
    const ciudad = sanitizeValue(rawBody.ciudad);
    const estado = sanitizeValue(rawBody.estado);
    const breakfastBoolean = toBoolean(rawBody.includeBreakfast);

    if (!signature) {
      return res.status(400).json({ message: 'Se requiere la firma del huésped' });
    }
    if (!ciudad) {
      return res.status(400).json({ message: 'Se requiere la ciudad' });
    }
    if (!estado) {
      return res.status(400).json({ message: 'Se requiere el estado' });
    }

    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    try {
      const pdfBuffer = await generateCheckinPDF(
        booking,
        signature,
        ciudad,
        estado,
        breakfastBoolean
      );

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Checkin_${bookingId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);

      console.log('=== PDF CHECK-IN ENVIADO CON ÉXITO ===');
      console.log(`Tamaño del PDF: ${pdfBuffer.length} bytes`);
    } catch (pdfError) {
      console.error('Error al generar el PDF de check-in:', pdfError);
      return res.status(500).json({
        message: 'Error al generar el PDF de check-in',
        error: pdfError.message
      });
    }
  } catch (error) {
    console.error('Error en generateCheckin:', error);
    next(error);
  }
};

// Descargar voucher
exports.downloadVoucher = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId }).lean();

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const { generateVoucherPDF } = require('../services/pdfService');
    const pdfBuffer = await generateVoucherPDF(booking);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Voucher_${bookingId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error al descargar voucher:', error);
    next(error);
  }
};

// Reenviar email de confirmación
exports.resendBookingEmail = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found',
        message: 'Reserva no encontrada'
      });
    }

    console.log(`\n📧 Reenviando email para reserva: ${booking.bookingId}`);

    const emailResult = await sendBookingConfirmationEmail(booking);

    if (emailResult.success) {
      res.json({
        success: true,
        message: 'Email de confirmación reenviado exitosamente',
        messageId: emailResult.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Error al reenviar el email',
        error: emailResult.error
      });
    }
  } catch (error) {
    console.error('Error al reenviar email:', error);
    next(error);
  }
};

// Enviar email de prueba a reserva existente
exports.sendTestEmailToExistingBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found',
        message: 'Reserva no encontrada'
      });
    }

    console.log(`\n🧪 Enviando email de PRUEBA para reserva: ${booking.bookingId}`);
    console.log(`📧 Email destino: ${booking.guestInfo.email}`);

    const emailResult = await sendBookingConfirmationEmail(booking);

    res.json({
      success: true,
      message: `Email de prueba enviado a ${booking.guestInfo.email}`,
      emailResult,
      bookingDetails: {
        bookingId: booking.bookingId,
        guestEmail: booking.guestInfo.email,
        roomName: booking.roomName,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        totalPrice: booking.totalPrice
      }
    });
  } catch (error) {
    console.error('Error al enviar email de prueba:', error);
    next(error);
  }
};

// Test de email básico
exports.testEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Se requiere un email de destino'
      });
    }

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from: `"Hotel La Capilla" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: 'Test Email - Hotel La Capilla',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>Email de Prueba</h1>
          <p>Este es un email de prueba del sistema de reservas del Hotel La Capilla.</p>
          <p>Si recibes este mensaje, la configuración de email está funcionando correctamente.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Fecha: ${new Date().toLocaleString('es-MX')}
          </p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Email de prueba enviado exitosamente',
      messageId: info.messageId,
      recipient: email
    });
  } catch (error) {
    console.error('Error al enviar email de prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar email de prueba',
      error: error.message
    });
  }
};

// ─────────────────────────────────────────────
// EXPORTAR TODAS LAS FUNCIONES
// ─────────────────────────────────────────────

module.exports = {
  createPaymentIntent: exports.createPaymentIntent,
  createBooking: exports.createBooking,
  getAllBookings: exports.getAllBookings,
  getBooking: exports.getBooking,
  getBookingById: exports.getBookingById,
  updateBooking: exports.updateBooking,
  cancelBooking: exports.cancelBooking,
  markSecondNightPaid: exports.markSecondNightPaid,
  getBookingStats: exports.getBookingStats,
  getDiscountCodeUsageStats: exports.getDiscountCodeUsageStats,
  checkAvailability: exports.checkAvailability,
  checkMultipleAvailability: exports.checkMultipleAvailability,
  generateCheckin: exports.generateCheckin,
  downloadVoucher: exports.downloadVoucher,
  resendBookingEmail: exports.resendBookingEmail,
  sendTestEmailToExistingBooking: exports.sendTestEmailToExistingBooking,
  testEmail: exports.testEmail
};
