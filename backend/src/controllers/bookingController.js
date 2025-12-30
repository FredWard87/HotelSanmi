// controllers/bookingController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const RoomBlock = require('../models/RoomBlock');
const { v4: uuidv4 } = require('uuid');
const { generateAndSendVoucher } = require('../services/pdfService');

// Generar ID único para reserva
const generateBookingId = () => `LC-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

// 🔥 FUNCIÓN AUXILIAR: Verificar disponibilidad de habitación
async function checkRoomAvailabilityInternal(roomId, startDate, endDate) {
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

  const start = new Date(startDate);
  const end = new Date(endDate);

  // 1. Contar reservas activas que se solapan
  const overlappingBookings = await Booking.countDocuments({
    roomId: room._id,
    status: 'active',
    $or: [
      { checkIn: { $lt: end }, checkOut: { $gt: start } }
    ]
  });

  // 2. Contar unidades bloqueadas (RoomBlock)
  const activeBlocks = await RoomBlock.find({
    roomId: room._id,
    active: true,
    $or: [
      { startDate: { $lt: end }, endDate: { $gt: start } }
    ]
  });

  let totalBlockedUnits = 0;
  activeBlocks.forEach(block => {
    if (block.blockAll) {
      totalBlockedUnits += room.totalUnits;
    } else {
      totalBlockedUnits += block.quantityBlocked || 0;
    }
  });

  // 3. Calcular disponibilidad
  const totalUnits = room.totalUnits || 1;
  const unavailableUnits = Math.min(overlappingBookings + totalBlockedUnits, totalUnits);
  const availableUnits = Math.max(0, totalUnits - unavailableUnits);

  return {
    available: availableUnits > 0,
    totalUnits,
    availableUnits,
    bookedUnits: overlappingBookings,
    blockedUnits: Math.min(totalBlockedUnits, totalUnits),
    room,
    blocks: activeBlocks
  };
}

// Crear Payment Intent con Stripe
exports.createPaymentIntent = async (req, res, next) => {
  try {
    const { amount, currency = 'mxn' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe usa centavos
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    next(error);
  }
};

// 🔥 Procesar reserva completa con verificación de disponibilidad
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
      subtotal, // Recibir subtotal del frontend
      tax, // Recibir IVA del frontend
      municipalTax, // Recibir impuesto municipal del frontend - NUEVO
      totalPrice, // Recibir total del frontend
      paymentIntentId,
      paymentMethodId,
    } = req.body;

    // Validaciones básicas
    if (!roomId || !guestInfo || !checkIn || !checkOut || !nights || !pricePerNight) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Faltan campos requeridos para la reserva'
      });
    }

    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);

    // 🔥 VERIFICAR DISPONIBILIDAD ANTES DE CREAR LA RESERVA
    const availability = await checkRoomAvailabilityInternal(roomId, startDate, endDate);

    if (!availability.available) {
      // Construir mensaje detallado de no disponibilidad
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
        error: 'Room not available',
        message,
        availability: {
          totalUnits: availability.totalUnits,
          availableUnits: availability.availableUnits,
          bookedUnits: availability.bookedUnits,
          blockedUnits: availability.blockedUnits
        }
      });
    }

    // ✅ Si se reciben los cálculos desde el frontend, usarlos directamente
    // ✅ Si no, calcularlos en el backend (para compatibilidad con versiones anteriores)
    let finalSubtotal, finalTax, finalMunicipalTax, finalTotalPrice;

    if (subtotal && tax !== undefined && totalPrice !== undefined) {
      // Usar valores del frontend
      finalSubtotal = subtotal;
      finalTax = tax;
      finalMunicipalTax = municipalTax || 0; // Usar municipalTax si viene, sino 0
      finalTotalPrice = totalPrice;
    } else {
      // Calcular en backend (para compatibilidad)
      finalSubtotal = pricePerNight * nights;
      finalTax = finalSubtotal * 0.16; // IVA 16%
      finalMunicipalTax = finalSubtotal * 0.04; // Impuesto municipal 4% - NUEVO
      finalTotalPrice = finalSubtotal + finalTax + finalMunicipalTax;
    }

    // Lógica de pagos: 1 noche = 100%, 2+ noches = 50% inicial
    let initialPayment, secondNightPayment;
    if (Number(nights) === 1) {
      initialPayment = finalTotalPrice;
      secondNightPayment = 0;
    } else {
      initialPayment = finalTotalPrice * 0.5;
      secondNightPayment = finalTotalPrice * 0.5;
    }

    // Generar ID de reserva
    const bookingId = generateBookingId();

    // Confirmar Payment Intent si existe
    let stripeChargeId = null;
    if (paymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (paymentIntent.status === 'succeeded') {
          stripeChargeId = paymentIntent.latest_charge;
        } else {
          return res.status(400).json({ 
            error: 'Payment not completed',
            message: `Estado del pago: ${paymentIntent.status}`
          });
        }
      } catch (stripeErr) {
        console.error('Error verificando Payment Intent:', stripeErr);
        return res.status(400).json({ 
          error: 'Failed to verify payment',
          message: 'No se pudo verificar el pago con Stripe'
        });
      }
    }

    // Determinar estado de pago
    let paymentStatus;
    if (initialPayment === finalTotalPrice) {
      paymentStatus = stripeChargeId ? 'completed' : 'pending';
    } else {
      paymentStatus = stripeChargeId ? 'partial' : 'pending';
    }

    // Crear documento de reserva
    const booking = new Booking({
      bookingId,
      roomId: availability.room._id,
      roomName: availability.room.name,
      guestInfo,
      checkIn: startDate,
      checkOut: endDate,
      nights,
      pricePerNight,
      subtotal: finalSubtotal,
      tax: finalTax,
      municipalTax: finalMunicipalTax, // GUARDAR IMPUESTO MUNICIPAL - NUEVO
      totalPrice: finalTotalPrice,
      initialPayment,
      secondNightPayment,
      paymentStatus,
      stripePaymentIntentId: paymentIntentId,
      stripeChargeId,
      secondNightNoteId: secondNightPayment > 0 ? `NOTE-${bookingId}-2ND-NIGHT` : null,
    });

    await booking.save();

    // 🎫 Generar y enviar voucher PDF automáticamente
    generateAndSendVoucher(booking).catch(err => {
      console.error('⚠️ Error generando voucher:', err.message);
    });

    res.json({
      success: true,
      bookingId,
      booking,
      message: '✅ Reserva confirmada exitosamente. Se ha cobrado el pago inicial. Revisa tu email para el voucher.',
      secondNightNote: secondNightPayment > 0 ? {
        id: booking.secondNightNoteId,
        amount: secondNightPayment,
        message: `Pagar $${secondNightPayment.toFixed(2)} MXN en recepción`,
      } : null,
    });
  } catch (error) {
    console.error('Booking error:', error);
    next(error);
  }
};

// Obtener booking por ID
exports.getBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId }).populate('roomId');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

// Obtener todas las reservas (admin)
exports.getAllBookings = async (req, res, next) => {
  try {
    const { status, startDate, endDate, limit = 100 } = req.query;

    const filter = {};
    
    if (status) {
      filter.status = status;
    }

    if (startDate && endDate) {
      filter.checkIn = { $gte: new Date(startDate) };
      filter.checkOut = { $lte: new Date(endDate) };
    }

    const bookings = await Booking.find(filter)
      .populate('roomId', 'name type totalUnits')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json(bookings);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    next(error);
  }
};

// Actualizar reserva (PATCH)
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

    // Si se actualizan fechas o habitación, verificar disponibilidad
    if ((checkIn && checkOut) || roomId) {
      const newRoomId = roomId || booking.roomId;
      const newCheckIn = checkIn || booking.checkIn;
      const newCheckOut = checkOut || booking.checkOut;

      // Excluir la reserva actual de la verificación
      const availability = await checkRoomAvailabilityInternal(
        newRoomId,
        newCheckIn,
        newCheckOut
      );

      if (!availability.available) {
        return res.status(409).json({
          error: 'Room not available',
          message: 'La habitación no está disponible para las nuevas fechas',
          availability: {
            totalUnits: availability.totalUnits,
            availableUnits: availability.availableUnits,
            bookedUnits: availability.bookedUnits,
            blockedUnits: availability.blockedUnits
          }
        });
      }

      // Actualizar habitación si cambió
      if (roomId && roomId !== booking.roomId.toString()) {
        booking.roomId = newRoomId;
        booking.roomName = availability.room.name;
      }
    }

    // Validar y actualizar fechas
    if (checkIn && checkOut) {
      const startDate = new Date(checkIn);
      const endDate = new Date(checkOut);

      if (endDate <= startDate) {
        return res.status(400).json({ 
          error: 'Invalid dates',
          message: 'La fecha de check-out debe ser posterior a la de check-in' 
        });
      }

      const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      booking.nights = nights;
      booking.checkIn = startDate;
      booking.checkOut = endDate;

      // Recalcular precios con impuesto municipal
      const subtotal = booking.pricePerNight * nights;
      const tax = subtotal * 0.16; // IVA 16%
      const municipalTax = subtotal * 0.04; // Impuesto municipal 4%
      const totalPrice = subtotal + tax + municipalTax;

      booking.subtotal = subtotal;
      booking.tax = tax;
      booking.municipalTax = municipalTax; // ACTUALIZAR IMPUESTO MUNICIPAL
      booking.totalPrice = totalPrice;

      // Recalcular pagos
      if (nights === 1) {
        booking.initialPayment = totalPrice;
        booking.secondNightPayment = 0;
      } else {
        booking.initialPayment = totalPrice * 0.5;
        booking.secondNightPayment = totalPrice * 0.5;
      }
    }

    // Actualizar información del huésped
    if (guestInfo) {
      booking.guestInfo = { 
        ...booking.guestInfo.toObject(), 
        ...guestInfo 
      };
    }

    // Actualizar estado
    if (status) {
      booking.status = status;
    }

    booking.updatedAt = Date.now();
    await booking.save();
    await booking.populate('roomId', 'name type totalUnits');

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

    const booking = await Booking.findOneAndUpdate(
      { bookingId },
      { 
        status: 'cancelled',
        updatedAt: Date.now(),
        cancellationReason: reason || 'No especificado'
      },
      { new: true }
    ).populate('roomId', 'name type totalUnits');

    if (!booking) {
      return res.status(404).json({ 
        error: 'Booking not found',
        message: 'Reserva no encontrada' 
      });
    }

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

    if (booking.secondNightNotePaid) {
      return res.status(400).json({ 
        error: 'Already paid',
        message: 'La segunda noche ya fue marcada como pagada' 
      });
    }

    booking.secondNightNotePaid = true;
    booking.paymentStatus = 'completed';
    booking.updatedAt = Date.now();
    
    await booking.save();
    await booking.populate('roomId', 'name type totalUnits');

    res.json({
      success: true,
      booking,
      message: '✅ Segunda noche marcada como pagada. Estado actualizado a completado.',
    });
  } catch (error) {
    console.error('Error al marcar segunda noche como pagada:', error);
    next(error);
  }
};

// Obtener estadísticas de reservas
exports.getBookingStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const filter = {};
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
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
          avgPrice: { $avg: '$totalPrice' }
        }
      }
    ]);

    const totalBookings = await Booking.countDocuments(filter);
    const activeBookings = await Booking.countDocuments({ ...filter, status: 'active' });
    const cancelledBookings = await Booking.countDocuments({ ...filter, status: 'cancelled' });
    
    const totalRevenue = await Booking.aggregate([
      { $match: { ...filter, status: 'active' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]);

    res.json({
      totalBookings,
      activeBookings,
      cancelledBookings,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalTaxCollected: stats.reduce((sum, stat) => sum + (stat.totalTax || 0), 0),
      totalMunicipalTaxCollected: stats.reduce((sum, stat) => sum + (stat.totalMunicipalTax || 0), 0),
      byStatus: stats,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    next(error);
  }
};

// 🔥 Verificar disponibilidad de habitación (endpoint público)
exports.checkRoomAvailability = async (req, res, next) => {
  try {
    const { roomId, checkIn, checkOut } = req.query;

    if (!roomId || !checkIn || !checkOut) {
      return res.status(400).json({ 
        error: 'Missing parameters',
        message: 'Se requieren roomId, checkIn y checkOut' 
      });
    }

    const availability = await checkRoomAvailabilityInternal(roomId, checkIn, checkOut);

    if (availability.error) {
      return res.status(404).json({
        error: availability.error,
        message: availability.error
      });
    }

    res.json({
      roomId,
      roomName: availability.room.name,
      totalUnits: availability.totalUnits,
      bookedUnits: availability.bookedUnits,
      blockedUnits: availability.blockedUnits,
      availableUnits: availability.availableUnits,
      isAvailable: availability.available,
      checkIn,
      checkOut,
      blocks: availability.blocks.map(b => ({
        type: b.blockType,
        reason: b.reason,
        startDate: b.startDate,
        endDate: b.endDate,
        blockAll: b.blockAll,
        quantityBlocked: b.quantityBlocked
      }))
    });
  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    next(error);
  }
};