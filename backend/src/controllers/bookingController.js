// controllers/bookingController.js
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const RoomBlock = require('../models/RoomBlock');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { generateAndSendVoucher } = require('../services/pdfService');

// Obtener todas las reservas
exports.getAllBookings = async (req, res) => {
  try {
    const { status, startDate, endDate, limit = 50 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    
    if (startDate && endDate) {
      filter.checkIn = { $gte: new Date(startDate) };
      filter.checkOut = { $lte: new Date(endDate) };
    }
    
    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json(bookings);
  } catch (error) {
    console.error('Error al obtener reservas:', error);
    res.status(500).json({
      message: 'Error al obtener reservas',
      error: error.message
    });
  }
};

// Obtener estadísticas de reservas
exports.getBookingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const match = {};
    if (startDate && endDate) {
      match.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const stats = await Booking.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$totalPrice' },
          totalNights: { $sum: '$nights' },
          activeBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);
    
    const roomStats = await Booking.aggregate([
      { $match: match },
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
    
    res.json({
      summary: stats[0] || {
        totalBookings: 0,
        totalRevenue: 0,
        totalNights: 0,
        activeBookings: 0,
        cancelledBookings: 0
      },
      roomStats,
      period: { startDate, endDate }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
};

// Verificar disponibilidad de una habitación (CON SCOPE ACTUALIZADO)
exports.checkAvailability = async (req, res) => {
  try {
    const { roomId, checkIn, checkOut } = req.query;

    if (!roomId || !checkIn || !checkOut) {
      return res.status(400).json({
        message: 'Se requieren roomId, checkIn y checkOut'
      });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        message: 'Habitación no encontrada'
      });
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (end <= start) {
      return res.status(400).json({
        message: 'La fecha de salida debe ser posterior a la fecha de entrada'
      });
    }

    // 🔥 ACTUALIZADO: Buscar bloqueos que afecten a esta habitación por SCOPE
    const overlappingBlocks = await RoomBlock.find({
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

    // Buscar reservas activas que se superponen
    const overlappingBookings = await Booking.find({
      roomId: room._id,
      status: 'active',
      $or: [
        { checkIn: { $lt: end }, checkOut: { $gt: start } }
      ]
    });

    // Calcular unidades ya reservadas
    let bookedUnits = overlappingBookings.length;

    // Calcular unidades bloqueadas por SCOPE
    let blockedUnits = 0;
    const blockDetails = [];

    overlappingBlocks.forEach(block => {
      if (block.blockAll) {
        // Si bloquea todas las unidades, contar todas las unidades de la habitación
        blockedUnits += room.totalUnits;
      } else {
        // Si bloquea cantidad específica
        blockedUnits += block.quantityBlocked || 0;
      }

      blockDetails.push({
        id: block._id,
        type: block.blockType,
        reason: block.reason,
        scope: block.scope,
        startDate: block.startDate,
        endDate: block.endDate,
        blockAll: block.blockAll,
        quantityBlocked: block.quantityBlocked,
        affectsAllUnits: block.blockAll
      });
    });

    // Calcular unidades disponibles
    const totalUnits = room.totalUnits;
    const usedUnits = Math.min(bookedUnits + blockedUnits, totalUnits);
    const availableUnits = Math.max(0, totalUnits - usedUnits);
    const isAvailable = availableUnits > 0;

    res.json({
      roomId: room._id,
      roomName: room.name,
      totalUnits: totalUnits,
      bookedUnits: bookedUnits,
      blockedUnits: blockedUnits,
      availableUnits: availableUnits,
      isAvailable: isAvailable,
      blocks: blockDetails,
      checkIn: start,
      checkOut: end
    });

  } catch (error) {
    console.error('Error al verificar disponibilidad:', error);
    res.status(500).json({
      message: 'Error al verificar disponibilidad',
      error: error.message
    });
  }
};

// Verificar disponibilidad para múltiples habitaciones por SCOPE
exports.checkMultipleAvailability = async (req, res) => {
  try {
    const { checkIn, checkOut, scope } = req.query;

    if (!checkIn || !checkOut) {
      return res.status(400).json({
        message: 'Se requieren checkIn y checkOut'
      });
    }

    const start = new Date(checkIn);
    const end = new Date(checkOut);

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
    // Si scope es 'all' o undefined, no aplicamos filtro

    const rooms = await Room.find(filter);
    const availabilityResults = [];

    for (const room of rooms) {
      // Verificar bloqueos por SCOPE
      const overlappingBlocks = await RoomBlock.find({
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

      // Verificar reservas
      const overlappingBookings = await Booking.find({
        roomId: room._id,
        status: 'active',
        $or: [
          { checkIn: { $lt: end }, checkOut: { $gt: start } }
        ]
      });

      // Calcular disponibilidad
      let bookedUnits = overlappingBookings.length;
      let blockedUnits = 0;

      overlappingBlocks.forEach(block => {
        if (block.blockAll) {
          blockedUnits += room.totalUnits;
        } else {
          blockedUnits += block.quantityBlocked || 0;
        }
      });

      const totalUnits = room.totalUnits;
      const usedUnits = Math.min(bookedUnits + blockedUnits, totalUnits);
      const availableUnits = Math.max(0, totalUnits - usedUnits);

      availabilityResults.push({
        roomId: room._id,
        roomName: room.name,
        roomType: room.type,
        lugar: room.lugar,
        totalUnits: totalUnits,
        bookedUnits: bookedUnits,
        blockedUnits: blockedUnits,
        availableUnits: availableUnits,
        isAvailable: availableUnits > 0,
        blocks: overlappingBlocks.map(b => ({
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
    res.status(500).json({
      message: 'Error al verificar disponibilidad',
      error: error.message
    });
  }
};

// Crear reserva (CON SCOPE ACTUALIZADO Y BOOKINGID GENERADO)
exports.createBooking = async (req, res) => {
  try {
    const {
      roomId,
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
      specialRequests
    } = req.body;

    // Validar datos requeridos
    if (!roomId || !guestInfo || !checkIn || !checkOut || !paymentIntentId) {
      return res.status(400).json({
        message: 'Faltan datos requeridos'
      });
    }

    // Validar fechas
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (end <= start) {
      return res.status(400).json({
        message: 'La fecha de salida debe ser posterior a la fecha de entrada'
      });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({
        message: 'Habitación no encontrada'
      });
    }

    // 🔥 ACTUALIZADO: Verificar disponibilidad considerando SCOPE
    const overlappingBlocks = await RoomBlock.find({
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

    const overlappingBookings = await Booking.find({
      roomId: room._id,
      status: 'active',
      $or: [
        { checkIn: { $lt: end }, checkOut: { $gt: start } }
      ]
    });

    // Calcular unidades disponibles
    let bookedUnits = overlappingBookings.length;
    let blockedUnits = 0;

    overlappingBlocks.forEach(block => {
      if (block.blockAll) {
        blockedUnits += room.totalUnits;
      } else {
        blockedUnits += block.quantityBlocked || 0;
      }
    });

    const totalUnits = room.totalUnits;
    const usedUnits = Math.min(bookedUnits + blockedUnits, totalUnits);
    const availableUnits = Math.max(0, totalUnits - usedUnits);

    if (availableUnits <= 0) {
      return res.status(409).json({
        message: `No hay disponibilidad para las fechas seleccionadas. Solo hay ${availableUnits} unidades disponibles.`,
        details: {
          totalUnits: totalUnits,
          bookedUnits: bookedUnits,
          blockedUnits: blockedUnits,
          availableUnits: availableUnits,
          blocks: overlappingBlocks.map(b => ({
            type: b.blockType,
            reason: b.reason,
            scope: b.scope,
            blockAll: b.blockAll
          }))
        }
      });
    }

    // 🔥 GENERAR BOOKING ID ÚNICO
    const year = new Date().getFullYear();
    const random = Math.random().toString(36).substr(2, 9).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const bookingId = `LC-${year}-${timestamp}${random.substr(0, 3)}`;

    // Calcular pagos
    const initialPayment = nights === 1 ? totalPrice : totalPrice * 0.5;
    const secondNightPayment = nights === 1 ? 0 : totalPrice * 0.5;

    // Crear la reserva CON bookingId
    const newBooking = new Booking({
      bookingId, // 🔥 CAMPO AGREGADO
      roomId,
      roomName: room.name,
      guestInfo,
      checkIn: start,
      checkOut: end,
      nights,
      pricePerNight,
      subtotal,
      tax,
      municipalTax,
      totalPrice,
      initialPayment,
      secondNightPayment,
      secondNightPaid: false,
      paymentIntentId,
      status: 'active',
      specialRequests: specialRequests || ''
    });

    await newBooking.save();

    console.log(`✅ Reserva creada: ${newBooking.bookingId} para ${guestInfo.email}`);

    // 🔥 ACTUALIZADO: Enviar email de confirmación REAL con voucher
    try {
      await sendBookingConfirmationEmail(newBooking);
      console.log(`✅ Email enviado exitosamente a ${guestInfo.email}`);
    } catch (emailError) {
      console.error('❌ Error enviando email:', emailError);
      console.log('⚠️ La reserva se creó pero el email no pudo enviarse');
      // No fallar la reserva si el email falla
    }

    res.status(201).json({
      message: 'Reserva creada exitosamente',
      bookingId: newBooking.bookingId,
      booking: newBooking,
      secondNightNote: nights > 1 
        ? `El 50% restante (${formatMXN(secondNightPayment)}) se pagará en recepción al check-in.`
        : null
    });

  } catch (error) {
    console.error('Error al crear reserva:', error);
    res.status(500).json({
      message: 'Error al crear reserva',
      error: error.message
    });
  }
};

// Obtener reserva por ID
exports.getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        message: 'Reserva no encontrada'
      });
    }
    
    res.json(booking);
  } catch (error) {
    console.error('Error al obtener reserva:', error);
    res.status(500).json({
      message: 'Error al obtener reserva',
      error: error.message
    });
  }
};

// Actualizar reserva (CON SCOPE ACTUALIZADO)
exports.updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        message: 'Reserva no encontrada'
      });
    }
    
    // Si se actualizan fechas o habitación, verificar disponibilidad
    if (updateData.checkIn || updateData.checkOut || updateData.roomId) {
      const roomId = updateData.roomId || booking.roomId;
      const checkIn = updateData.checkIn ? new Date(updateData.checkIn) : booking.checkIn;
      const checkOut = updateData.checkOut ? new Date(updateData.checkOut) : booking.checkOut;
      
      const room = await Room.findById(roomId);
      if (!room) {
        return res.status(404).json({
          message: 'Habitación no encontrada'
        });
      }
      
      // Verificar disponibilidad excluyendo esta reserva actual
      const overlappingBlocks = await RoomBlock.find({
        $or: [
          { scope: 'specific', roomId: room._id, active: true },
          { scope: 'all', active: true },
          { scope: 'casaHotel', affectedRooms: room._id, active: true },
          { scope: 'boutique', affectedRooms: room._id, active: true }
        ],
        $or: [
          { startDate: { $lt: checkOut }, endDate: { $gt: checkIn } }
        ]
      });
      
      const overlappingBookings = await Booking.find({
        _id: { $ne: id },
        roomId: room._id,
        status: 'active',
        $or: [
          { checkIn: { $lt: checkOut }, checkOut: { $gt: checkIn } }
        ]
      });
      
      let bookedUnits = overlappingBookings.length;
      let blockedUnits = 0;
      
      overlappingBlocks.forEach(block => {
        if (block.blockAll) {
          blockedUnits += room.totalUnits;
        } else {
          blockedUnits += block.quantityBlocked || 0;
        }
      });
      
      const totalUnits = room.totalUnits;
      const usedUnits = Math.min(bookedUnits + blockedUnits, totalUnits);
      const availableUnits = Math.max(0, totalUnits - usedUnits);
      
      if (availableUnits <= 0) {
        return res.status(409).json({
          message: `No hay disponibilidad para las nuevas fechas. Solo hay ${availableUnits} unidades disponibles.`,
          details: {
            totalUnits,
            bookedUnits,
            blockedUnits,
            availableUnits
          }
        });
      }
    }
    
    // Actualizar la reserva
    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== '__v' && key !== 'bookingId') {
        booking[key] = updateData[key];
      }
    });
    
    booking.updatedAt = Date.now();
    await booking.save();
    
    res.json({
      message: 'Reserva actualizada exitosamente',
      booking
    });
  } catch (error) {
    console.error('Error al actualizar reserva:', error);
    res.status(500).json({
      message: 'Error al actualizar reserva',
      error: error.message
    });
  }
};

// Cancelar reserva
exports.cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        message: 'Reserva no encontrada'
      });
    }
    
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        message: 'La reserva ya está cancelada'
      });
    }
    
    booking.status = 'cancelled';
    booking.cancellationReason = reason || 'Cancelado por el huésped';
    booking.cancelledAt = Date.now();
    booking.updatedAt = Date.now();
    
    await booking.save();
    
    // Intentar reembolso en Stripe si corresponde
    try {
      console.log(`Reembolso necesario para reserva ${booking.bookingId}`);
      // Implementar lógica de reembolso aquí si es necesario
    } catch (stripeError) {
      console.error('Error procesando reembolso:', stripeError);
    }
    
    res.json({
      message: 'Reserva cancelada exitosamente',
      booking
    });
  } catch (error) {
    console.error('Error al cancelar reserva:', error);
    res.status(500).json({
      message: 'Error al cancelar reserva',
      error: error.message
    });
  }
};

// Marcar segunda noche como pagada
exports.markSecondNightPaid = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({
        message: 'Reserva no encontrada'
      });
    }
    
    if (booking.secondNightPayment === 0) {
      return res.status(400).json({
        message: 'Esta reserva no tiene pago de segunda noche pendiente'
      });
    }
    
    if (booking.secondNightPaid) {
      return res.status(400).json({
        message: 'La segunda noche ya está marcada como pagada'
      });
    }
    
    booking.secondNightPaid = true;
    booking.updatedAt = Date.now();
    await booking.save();
    
    res.json({
      message: 'Segunda noche marcada como pagada',
      booking
    });
  } catch (error) {
    console.error('Error al marcar segunda noche como pagada:', error);
    res.status(500).json({
      message: 'Error al actualizar el pago',
      error: error.message
    });
  }
};

// Crear Payment Intent con Stripe
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: 'Se requiere un monto válido'
      });
    }
    
    // Crear Payment Intent en Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'mxn',
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
    res.status(500).json({
      message: 'Error creando Payment Intent',
      error: error.message
    });
  }
};

// Descargar voucher en PDF
exports.downloadVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📥 Solicitud de voucher para ID:', id);
    
    // 🔥 Intentar buscar por _id o por bookingId
    let booking;
    
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      booking = await Booking.findById(id);
    } else {
      booking = await Booking.findOne({ bookingId: id });
    }
    
    if (!booking) {
      console.error('❌ Reserva no encontrada:', id);
      return res.status(404).json({
        message: 'Reserva no encontrada'
      });
    }

    console.log('✅ Reserva encontrada:', booking.bookingId);

    // 🔥 INTENTAR OBTENER DETALLES DE LA HABITACIÓN
    let roomDetails = null;
    try {
      if (booking.roomId) {
        roomDetails = await Room.findById(booking.roomId).lean();
        console.log('✅ Detalles de habitación obtenidos:', roomDetails?.name);
      }
    } catch (roomErr) {
      console.warn('⚠️ No se pudo obtener info de Room:', roomErr.message);
    }

    // 🔥 PREPARAR DATOS PARA EL PDF
    const bookingPayload = booking.toObject ? booking.toObject() : { ...booking };
    if (roomDetails) {
      bookingPayload.room = roomDetails;
    }

    console.log('🎨 Generando PDF del voucher...');

    // 🔥 IMPORTAR LA FUNCIÓN DE GENERACIÓN DE PDF
    const { generateVoucherPDF } = require('../services/pdfService');
    
    // 🔥 GENERAR EL PDF
    const pdfBuffer = await generateVoucherPDF(bookingPayload);
    
    console.log('✅ PDF generado correctamente, tamaño:', pdfBuffer.length, 'bytes');

    // 🔥 VERIFICAR QUE EL BUFFER NO ESTÉ VACÍO
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('El PDF generado está vacío');
    }

    // 🔥 CONFIGURAR HEADERS CORRECTOS PARA PDF
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Voucher_${booking.bookingId}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // 🔥 ENVIAR EL BUFFER DEL PDF DIRECTAMENTE
    res.end(pdfBuffer, 'binary');
    
    console.log('✅ PDF enviado al cliente');

  } catch (error) {
    console.error('❌ Error generando voucher:', error);
    
    if (res.headersSent) {
      res.end();
    } else {
      res.status(500).json({
        message: 'Error generando voucher',
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
};

// Test email endpoint
exports.testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        message: 'Se requiere un email para la prueba'
      });
    }
    
    console.log('📧 Probando envío de email a:', email);
    console.log('📧 Usando cuenta:', process.env.EMAIL_USERNAME);
    
    // Importar nodemailer directamente para la prueba
    const nodemailer = require('nodemailer');
    
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
      debug: true,
      logger: true
    });
    
    console.log('📧 Configurando email...');
    
    const mailOptions = {
      from: `"La Capilla Hotel - Test" <${process.env.EMAIL_USERNAME}>`,
      to: email,
      cc: 'lacapillasl@gmail.com',
      subject: 'Test Email - La Capilla Hotel',
      text: 'Este es un email de prueba del sistema de reservas de La Capilla Hotel.',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1a1a1a; color: #C9A961; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { background: #eee; padding: 15px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>LA CAPILLA HOTEL</h1>
              <p>Test de Sistema de Emails</p>
            </div>
            <div class="content">
              <h2>¡Email de prueba exitoso!</h2>
              <p>Este email confirma que el sistema de envío de correos está funcionando correctamente.</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
              <p><strong>Destinatario:</strong> ${email}</p>
              <p>Si recibes este email, significa que la configuración SMTP con Gmail está funcionando.</p>
            </div>
            <div class="footer">
              <p>La Capilla Hotel | Sistema Automático de Pruebas</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    console.log('📤 Enviando email de prueba...');
    
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email de prueba enviado exitosamente');
    console.log('✅ Response:', result.response);
    
    res.json({
      success: true,
      message: 'Email de prueba enviado exitosamente',
      details: {
        to: email,
        from: process.env.EMAIL_USERNAME,
        response: result.response,
        messageId: result.messageId
      }
    });
    
  } catch (error) {
    console.error('❌ Error en test email:', error);
    console.error('❌ Error details:', {
      code: error.code,
      command: error.command,
      response: error.response
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      details: {
        code: error.code,
        command: error.command,
        response: error.response
      }
    });
  }
};

// Función auxiliar para formatear moneda
function formatMXN(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
}

// 🔥 ACTUALIZADA: Función para enviar email REAL con voucher
async function sendBookingConfirmationEmail(booking) {
  try {
    console.log(`📧 Iniciando envío de email para ${booking.guestInfo.email}...`);
    console.log(`📧 Booking ID: ${booking.bookingId}`);
    console.log(`📧 Habitación: ${booking.roomName}`);
    
    const result = await generateAndSendVoucher(booking);
    
    console.log(`✅ Email enviado exitosamente a ${booking.guestInfo.email}`);
    return result;
  } catch (error) {
    console.error('❌ Error enviando email de confirmación:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      command: error.command
    });
    
    // No lanzar el error para no romper el flujo de reserva
    console.log('⚠️ La reserva se creó pero el email no pudo enviarse');
    
    return { success: false, error: error.message };
  }
}
