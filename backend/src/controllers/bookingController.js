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

// Formatear fecha SIN conversión de zona horaria
const formatDateWithTimezone = (value) => {
  if (!value) return null;

  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  const d = new Date(value);
  if (isNaN(d)) return null;

  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
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
      startDate: { $lt: end },
      endDate: { $gt: start }
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
// FUNCIÓN INTERNA: Enviar email de cancelación
// ─────────────────────────────────────────────

async function sendCancellationEmail(booking, refundResult = null) {
  try {
    console.log(`\n📧 ===== ENVIANDO EMAIL DE CANCELACIÓN =====`);
    console.log(`📧 Para: ${booking.guestInfo.email}`);
    console.log(`📧 Booking ID: ${booking.bookingId}`);

    const nodemailer = require('nodemailer');
    const fs = require('fs');
    const path = require('path');

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USERNAME || 'audit3674@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'xarv ywnv gdkv jofm',
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: 'TLSv1.2'
      }
    });

    let logoBuffer = null;
    try {
      const logoPath = path.join(__dirname, '../assets/logo.png');
      if (fs.existsSync(logoPath)) {
        logoBuffer = fs.readFileSync(logoPath);
      }
    } catch (logoError) {
      console.warn('⚠️ Logo no encontrado para email de cancelación');
    }

    const attachments = [];
    if (logoBuffer) {
      attachments.push({
        filename: 'logo.png',
        content: logoBuffer,
        contentType: 'image/png',
        cid: 'la-capilla-logo@cancelacion'
      });
    }

    const checkInDate = new Date(booking.checkIn).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const checkOutDate = new Date(booking.checkOut).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const guestName = booking.guestInfo.firstName + ' ' + booking.guestInfo.lastName;
    const refundAmount = refundResult ? (refundResult.amount / 100).toFixed(2) : '0.00';
    const refundStatus = refundResult ? refundResult.status : 'no procesado';

    const mailOptions = {
      from: `"Hotel La Capilla" <${process.env.EMAIL_FROM || 'lacapillasl@gmail.com'}>`,
      to: booking.guestInfo.email,
      subject: `Confirmación de Cancelación - Reserva ${booking.bookingId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cancelación de Reserva - Hotel La Capilla</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; background-color: #f5f5f5;">

          <div style="background-color: #ffffff; padding: 30px 20px; text-align: center; border-bottom: 3px solid #d4af37;">
            ${logoBuffer
              ? `<img src="cid:la-capilla-logo@cancelacion" alt="Hotel La Capilla" style="max-width: 200px; height: auto; display: block; margin: 0 auto;">`
              : `<h1 style="color: #1a1a1a; margin: 0; font-size: 24px; font-family: Georgia, serif;">HOTEL LA CAPILLA</h1>`
            }
          </div>

          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 50px;">

            <p style="font-size: 16px; color: #1a1a1a; margin-bottom: 20px; font-family: Georgia, serif;">
              Estimado/a <strong>${guestName || 'Huésped'}</strong>,
            </p>

            <p style="font-size: 14px; color: #1a1a1a; line-height: 1.8; margin: 25px 0; font-family: Georgia, serif;">
              Reciba un cordial saludo de parte de La Capilla Hotel.
            </p>

            <p style="font-size: 14px; color: #1a1a1a; line-height: 1.8; margin: 25px 0; font-family: Georgia, serif;">
              Nos comunicamos con usted en relación con su reciente reserva realizada para las fechas <strong>${checkInDate} al ${checkOutDate}</strong>. Lamentablemente, debido a un error en nuestro sistema de verificación de disponibilidad, su reservación fue confirmada cuando ya no contábamos con habitaciones disponibles (sold out) para esas fechas.
            </p>

            <p style="font-size: 14px; color: #1a1a1a; line-height: 1.8; margin: 25px 0; font-family: Georgia, serif;">
              Le ofrecemos una sincera disculpa por este inconveniente. Entendemos que esta situación puede afectar su planificación y realmente lamentamos lo sucedido.
            </p>

            <div style="background-color: #e8f5e9; border: 1px solid #2e7d32; padding: 20px; margin: 25px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #2e7d32; font-weight: bold;">
                Reembolso Procesado
              </p>
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #1a1a1a;">
                Queremos informarle que hemos procedido con el reembolso total del importe pagado a través de Stripe.
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666;">
                Dependiendo de su entidad bancaria, el monto podría verse reflejado en su cuenta en un plazo de 5 a 10 días hábiles.
              </p>
            </div>

            <p style="font-size: 14px; color: #1a1a1a; line-height: 1.8; margin: 25px 0; font-family: Georgia, serif;">
              Si lo desea, estaremos encantados de ayudarle a encontrar disponibilidad en fechas alternativas o asistirle con cualquier otra gestión que necesite.
            </p>

            <p style="font-size: 14px; color: #1a1a1a; line-height: 1.8; margin: 25px 0; font-family: Georgia, serif;">
              Agradecemos su comprensión y esperamos poder recibirle en una próxima oportunidad para brindarle la experiencia que merece.
            </p>

            <p style="font-size: 14px; color: #1a1a1a; line-height: 1.8; margin: 30px 0; font-family: Georgia, serif;">
              Quedamos atentos a cualquier consulta.
            </p>

            <div style="margin-top: 35px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #1a1a1a; font-weight: bold; font-family: Georgia, serif;">
                Atentamente,
              </p>
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #1a1a1a; font-weight: bold; font-family: Georgia, serif;">
                Alejandro López Lizárraga
              </p>
              <p style="margin: 0 0 5px 0; font-size: 12px; color: #666666; font-family: Georgia, serif;">
                Dueño del Hotel
              </p>
              <p style="margin: 0 0 15px 0; font-size: 14px; color: #d4af37; font-weight: bold; font-family: Georgia, serif;">
                La Capilla Hotel
              </p>
              <p style="margin: 0; font-size: 13px; color: #666666;">
                📞 +52 4777 347474 | ✉️ lacapillasl@gmail.com
              </p>
            </div>

          </div>

          <div style="background-color: #f5f5f5; padding: 30px 20px; text-align: center; border-top: 1px solid #cccccc;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #1a1a1a; font-weight: bold; font-family: Georgia, serif;">
              HOTEL LA CAPILLA
            </p>
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #666666;">
              lacapillasl@gmail.com | +52 4777 347474
            </p>
            <p style="margin: 15px 0 0 0; font-size: 11px; color: #999999;">
              © ${new Date().getFullYear()} Hotel La Capilla - Todos los derechos reservados
            </p>
          </div>

        </body>
        </html>
      `,
      text: 'HOTEL LA CAPILLA - Confirmacion de Cancelacion\n\n' +
        'Estimado/a ' + (guestName || 'Huesped') + ',\n\n' +
        'Reciba un cordial saludo de parte de La Capilla Hotel.\n\n' +
        'Nos comunicamos con usted en relacion con su reciente reserva realizada para las fechas ' + checkInDate + ' al ' + checkOutDate + '. Lamentablemente, debido a un error en nuestro sistema de verificacion de disponibilidad, su reservacion fue confirmada cuando ya no contabamos con habitaciones disponibles (sold out) para esas fechas.\n\n' +
        'Le ofrecemos una sincera disculpa por este inconvenience. Entendemos que esta situacion puede afectar su planificacion y realmente lamentamos lo sucedido.\n\n' +
        ' queremos informarle que hemos procedido con el reembolso total del importe pagado a traves de Stripe. Dependiendo de su entidad bancaria, el monto podria verse reflejado en su cuenta en un plazo de 5 a 10 dias habiles.\n\n' +
        'Si lo desea, estaremos encantados de ayudarle a encontrar disponibilidad en fechas alternativas o asistirle con cualquier otra gestion que necesite.\n\n' +
        'Agradecemos su compresion y esperamos poder recibirle en una proxima oportunidad para brindarle la experiencia que merece.\n\n' +
        'Quedamos atentos a cualquier consulta.\n\n' +
        'Atentamente,\n\n' +
        'Alejandro Lopez Lizarraga\n' +
        'Dueno del Hotel\n' +
        'La Capilla Hotel\n\n' +
        '+52 4777 347474\n' +
        'lacapillasl@gmail.com',
      attachments: attachments
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ EMAIL DE CANCELACIÓN ENVIADO a ${booking.guestInfo.email}:`, result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`❌ Error enviando email de cancelación:`, error.message);
    throw error;
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
      filter.createdAt = { $gte: start, $lte: end };
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
      match.createdAt = { $gte: start, $lte: end };
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
    const { roomId, checkIn, checkOut, discountCode } = req.query;

    if (!roomId || !checkIn || !checkOut) {
      return res.status(400).json({ message: 'Se requieren roomId, checkIn y checkOut' });
    }

    const start = formatDateWithTimezone(checkIn);
    const end = formatDateWithTimezone(checkOut);

    if (end <= start) {
      return res.status(400).json({ message: 'La fecha de salida debe ser posterior a la fecha de entrada' });
    }

    let ignoreBlocksForAvailability = false;
    if (discountCode && discountCode.trim()) {
      const discountCodeCheck = await DiscountCode.findOne({
        code: discountCode.toUpperCase().trim(),
        active: true
      });
      if (discountCodeCheck) {
        ignoreBlocksForAvailability = true;
        console.log('🎟️ Código de descuento válido en verificación de disponibilidad - ignorando bloqueos');
      }
    }

    const availability = await checkRoomAvailabilityInternal(roomId, start, end, { ignoreBlocks: ignoreBlocksForAvailability });

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
      return res.status(400).json({ message: 'Se requieren checkIn y checkOut' });
    }

    const start = formatDateWithTimezone(checkIn);
    const end = formatDateWithTimezone(checkOut);

    if (end <= start) {
      return res.status(400).json({ message: 'La fecha de salida debe ser posterior a la fecha de entrada' });
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
        price: room.price,
        capacity: room.capacity,
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
      return res.status(400).json({ message: 'Se requiere un monto válido' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      metadata: { integration_check: 'accept_a_payment' }
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

// Crear reserva
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
      advancePayment,
      paymentIntentId,
      paymentMethodId,
      specialRequests,
      discountCode,
      chargeFullPrice
    } = req.body;

    console.log('=== CREANDO RESERVA ===');
    console.log('Check-in recibido:', checkIn);
    console.log('Check-out recibido:', checkOut);
    console.log('Código de descuento recibido:', discountCode);
    console.log('Charge full price:', chargeFullPrice);
    console.log('Email del huésped:', guestInfo?.email);
    console.log('Usuario que crea la reserva:', req.user?.email, '| Rol:', req.user?.role);

    if (!roomId || !guestInfo || !checkIn || !checkOut || !nights || !pricePerNight) {
      return res.status(400).json({
        message: 'Faltan datos requeridos',
        error: 'Missing required fields'
      });
    }

    if (!guestInfo.email || guestInfo.email.trim() === '') {
      return res.status(400).json({
        message: 'El email del huésped es requerido',
        error: 'Email required'
      });
    }

    const startDate = formatDateWithTimezone(checkIn);
    const endDate = formatDateWithTimezone(checkOut);

    console.log('Fechas formateadas:');
    console.log('  - Check-in:', startDate);
    console.log('  - Check-out:', endDate);

    if (endDate <= startDate) {
      return res.status(400).json({ message: 'La fecha de salida debe ser posterior a la fecha de entrada' });
    }

    const isAdmin = req.user && req.user.role === 'admin';

    let hasValidDiscountCode = false;
    if (discountCode && discountCode.trim()) {
      const preCheckDiscountCode = await DiscountCode.findOne({
        code: discountCode.toUpperCase().trim(),
        active: true
      });
      if (preCheckDiscountCode) {
        hasValidDiscountCode = true;
        console.log('🎟️ Código de descuento válido detectado - se ignorarán bloqueos de habitación');
      }
    }

    const shouldIgnoreBlocks = isAdmin || hasValidDiscountCode;

    if (isAdmin) console.log('🔓 ADMIN DETECTADO - IGNORANDO BLOQUEOS DE HABITACIÓN');
    if (hasValidDiscountCode) console.log('🔓 CÓDIGO DE DESCUENTO VÁLIDO - IGNORANDO BLOQUEOS DE HABITACIÓN');

    const availability = await checkRoomAvailabilityInternal(roomId, startDate, endDate, { ignoreBlocks: shouldIgnoreBlocks });

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

    let discountAmount = 0;
    let discountCodeDoc = null;
    const originalSubtotal = pricePerNight * nights;
    const originalTotal = originalSubtotal * 1.20;

    let finalTotal;
    let isPrecioManual = false;
    let finalSubtotal;
    let finalTax;
    let finalMunicipalTax;

    if (isAdmin && totalPrice && typeof totalPrice === 'number' && totalPrice > 0) {
      // PRECIO MANUAL - el precio ingresado es el total, sin impuestos adicionales
      finalTotal = totalPrice;
      isPrecioManual = true;
      finalSubtotal = totalPrice;
      finalTax = 0;
      finalMunicipalTax = 0;

      console.log('💰 Usando PRECIO MANUAL (sin impuestos):');
      console.log('  - Total recibido:', finalTotal);
    } else {
      // PRECIO AUTOMÁTICO
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

        // FIX: usar availability.room.price en lugar de variable `room` no definida
        const roomPricePerNight = availability.room.price || 0;
        finalTotal = discountCodeDoc.calculateFinalPrice(originalTotal, Number(nights), roomPricePerNight);
        discountAmount = originalTotal - finalTotal;

        console.log('💰 Descuento aplicado:');
        console.log('  - Precio original (con impuestos):', originalTotal);
        console.log('  - Precio por noche:', roomPricePerNight);
        console.log('  - Noches:', nights);
        console.log('  - Cobrar precio completo:', discountCodeDoc.chargeFullPrice || false);
        console.log('  - Precio final (código):', finalTotal);
        console.log('  - Descuento total:', discountAmount);

        finalSubtotal = finalTotal;
        finalTax = 0;
        finalMunicipalTax = 0;
      } else {
        // Sin código de descuento - calcular impuestos normalmente
        finalSubtotal = originalSubtotal;
        finalTax = finalSubtotal * (16 / 100);
        finalMunicipalTax = finalSubtotal * (4 / 100);
        finalTotal = finalSubtotal + finalTax + finalMunicipalTax;
      }
    }

    console.log('📊 Cálculo final:');
    console.log('  - Subtotal:', finalSubtotal.toFixed(2));
    console.log('  - IVA 16%:', finalTax.toFixed(2));
    console.log('  - Impuesto Municipal 4%:', finalMunicipalTax.toFixed(2));
    console.log('  - Total:', finalTotal.toFixed(2));

    let initialPayment, secondNightPayment;
    const adminAdvancePayment = advancePayment && advancePayment > 0 ? advancePayment : null;

    if (Number(nights) === 1 || chargeFullPrice === true || (adminAdvancePayment && adminAdvancePayment >= finalTotal)) {
      initialPayment = adminAdvancePayment ? Math.min(adminAdvancePayment, finalTotal) : finalTotal;
      secondNightPayment = 0;
      if (adminAdvancePayment && adminAdvancePayment >= finalTotal) {
        console.log('💰 PAGO COMPLETO detectado por anticipo del admin:', adminAdvancePayment, '>=', finalTotal);
      }
    } else if (adminAdvancePayment && adminAdvancePayment > 0) {
      initialPayment = adminAdvancePayment;
      secondNightPayment = Math.max(0, finalTotal - adminAdvancePayment);
      console.log('💰 ANTICIPO PARCIAL del admin:', adminAdvancePayment, '| Resta:', secondNightPayment);
    } else {
      initialPayment = finalTotal * 0.5;
      secondNightPayment = finalTotal * 0.5;
    }

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
      if (adminAdvancePayment && adminAdvancePayment > 0) {
        paymentStatus = adminAdvancePayment >= finalTotal ? 'completed' : 'partial';
        console.log('💰 Reserva admin con anticipo - paymentStatus:', paymentStatus);
      } else {
        console.log('⚠️ Creando reserva sin Payment Intent - estado: pending');
        paymentStatus = 'pending';
      }
    }

    const bookingId = generateBookingId();

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
    if (newBooking.adminOverride) console.log(`🔓 Reserva creada con ADMIN OVERRIDE (ignoró bloqueos)`);
    if (isPrecioManual) console.log(`💰 Reserva creada con PRECIO MANUAL: ${formatMXN(finalTotal)}`);

    if (discountCodeDoc) {
      console.log('📈 Incrementando uso del código:', discountCodeDoc.code);
      discountCodeDoc.currentUses = (discountCodeDoc.currentUses || 0) + 1;
      await discountCodeDoc.save();
    }

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
      return res.status(404).json({ error: 'Booking not found', message: 'Reserva no encontrada' });
    }

    const isAdmin = req.user && req.user.role === 'admin';
    const shouldIgnoreBlocks = isAdmin;

    if ((checkIn && checkOut) || roomId) {
      const newRoomId = roomId || booking.roomId;
      const newCheckIn = formatDateWithTimezone(checkIn || booking.checkIn);
      const newCheckOut = formatDateWithTimezone(checkOut || booking.checkOut);

      const availability = await checkRoomAvailabilityInternal(newRoomId, newCheckIn, newCheckOut, { ignoreBlocks: shouldIgnoreBlocks });

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

      if (booking.discountCodeId) {
        const discountCodeDoc = await DiscountCode.findById(booking.discountCodeId);
        if (discountCodeDoc && discountCodeDoc.active) {
          const roomForValidation = await Room.findById(booking.roomId);
          const validation = discountCodeDoc.isValidForBooking({
            checkIn: startDate,
            checkOut: endDate,
            nights: newNights,
            subtotal: newSubtotal,
            roomId: booking.roomId,
            roomLugar: roomForValidation ? roomForValidation.lugar : null
          });

          if (validation.valid) {
            const roomForPrice = await Room.findById(booking.roomId);
            const roomPricePerNight = roomForPrice?.price || 0;
            const finalPrice = discountCodeDoc.calculateFinalPrice(newSubtotal, newNights, roomPricePerNight);
            const discountAmount = discountCodeDoc.calculateDiscountAmount(newSubtotal, newNights, roomPricePerNight);
            newSubtotal = finalPrice;

            booking.subtotalBeforeDiscount = booking.pricePerNight * newNights;
            booking.discountAmount = discountAmount;
            booking.subtotal = newSubtotal;
            booking.tax = 0;
            booking.municipalTax = 0;
            booking.totalPrice = newSubtotal;

            const isFullPriceCode = discountCodeDoc?.chargeFullPrice === true;
            if (newNights === 1 || isFullPriceCode) {
              booking.initialPayment = newSubtotal;
              booking.secondNightPayment = 0;
            } else {
              booking.initialPayment = newSubtotal * 0.5;
              booking.secondNightPayment = newSubtotal * 0.5;
            }
          } else {
            booking.discountCode = null;
            booking.discountCodeId = null;
            booking.discountAmount = 0;

            const newTax = newSubtotal * 0.16;
            const newMunicipalTax = newSubtotal * 0.04;
            const newTotalPrice = newSubtotal + newTax + newMunicipalTax;

            booking.subtotalBeforeDiscount = booking.pricePerNight * newNights;
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
        }
      }
    }

    if (guestInfo) {
      booking.guestInfo = { ...booking.guestInfo.toObject(), ...guestInfo };
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
    const { reason, processRefund = true } = req.body;

    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'La reserva ya está cancelada' });
    }

    let refundResult = null;
    if (processRefund && (booking.stripeChargeId || booking.paymentIntentId) && booking.initialPayment > 0) {
      try {
        console.log(`💰 Procesando reembolso para reserva ${booking.bookingId}...`);
        console.log(`💰 Monto a reembolsar: ${booking.initialPayment}`);
        console.log(`💰 Stripe Charge ID: ${booking.stripeChargeId}`);
        console.log(`💰 Payment Intent ID: ${booking.paymentIntentId}`);

        const chargeIdToRefund = booking.stripeChargeId ||
          (booking.paymentIntentId ? `ch_${booking.paymentIntentId.slice(3)}` : null);

        if (chargeIdToRefund && !chargeIdToRefund.startsWith('ch_TEST')) {
          refundResult = await stripe.refunds.create({
            payment_intent: booking.paymentIntentId,
            amount: Math.round(booking.initialPayment * 100)
          });
          booking.refundId = refundResult.id;
          booking.refundStatus = refundResult.status;
          console.log(`✅ Reembolso procesado: ${refundResult.id} - Estado: ${refundResult.status}`);
        } else if (chargeIdToRefund && chargeIdToRefund.startsWith('ch_TEST')) {
          console.log('⚠️ Modo prueba - simulando reembolso');
          booking.refundId = `refund_test_${Date.now()}`;
          booking.refundStatus = 'succeeded';
        } else {
          console.log('⚠️ No se encontró ID de cargo para reembolsar');
        }
      } catch (stripeError) {
        console.error('❌ Error procesando reembolso:', stripeError);
        booking.refundError = stripeError.message;
      }
    }

    booking.status = 'cancelled';
    booking.cancellationReason = reason || 'Cancelado por el huésped';
    booking.cancelledAt = Date.now();
    booking.updatedAt = Date.now();

    await booking.save();
    await booking.populate('roomId', 'name type totalUnits');
    await booking.populate('discountCodeId', 'code description');

    try {
      await sendCancellationEmail(booking, refundResult);
    } catch (emailError) {
      console.error('❌ Error enviando email de cancelación:', emailError);
    }

    res.json({
      success: true,
      message: refundResult ? 'Reserva cancelada y reembolso procesado exitosamente' : 'Reserva cancelada exitosamente',
      refund: refundResult ? {
        id: refundResult.id,
        status: refundResult.status,
        amount: refundResult.amount / 100
      } : null,
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
      return res.status(404).json({ error: 'Booking not found', message: 'Reserva no encontrada' });
    }

    if (booking.secondNightPayment === 0) {
      return res.status(400).json({ message: 'Esta reserva no tiene pago de segunda noche pendiente' });
    }

    if (booking.secondNightPaid || booking.secondNightNotePaid) {
      return res.status(400).json({ error: 'Already paid', message: 'La segunda noche ya fue marcada como pagada' });
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

    if (!signature) return res.status(400).json({ message: 'Se requiere la firma del huésped' });
    if (!ciudad) return res.status(400).json({ message: 'Se requiere la ciudad' });
    if (!estado) return res.status(400).json({ message: 'Se requiere el estado' });

    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    try {
      const pdfBuffer = await generateCheckinPDF(booking, signature, ciudad, estado, breakfastBoolean);

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
      return res.status(404).json({ error: 'Booking not found', message: 'Reserva no encontrada' });
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
      return res.status(404).json({ error: 'Booking not found', message: 'Reserva no encontrada' });
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
      return res.status(400).json({ message: 'Se requiere un email de destino' });
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
      tls: { rejectUnauthorized: false }
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
          <p style="color: #666; font-size: 12px;">Fecha: ${new Date().toLocaleString('es-MX')}</p>
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
  checkRoomAvailability: exports.checkAvailability,
  checkMultipleAvailability: exports.checkMultipleAvailability,
  generateCheckin: exports.generateCheckin,
  downloadVoucher: exports.downloadVoucher,
  resendBookingEmail: exports.resendBookingEmail,
  sendTestEmailToExistingBooking: exports.sendTestEmailToExistingBooking,
  testEmail: exports.testEmail
};
