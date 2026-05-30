// controllers/bookingController.js
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const RoomBlock = require('../models/RoomBlock');
const DiscountCode = require('../models/DiscountCode');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { generateAndSendVoucher, generateAndSendMultipleVouchers } = require('../services/pdfService');
const { generateCheckinPDF } = require('../services/checkinPdfService');
const crypto = require('crypto');

const CHECKIN_SIGNATURE_SECRET = process.env.CHECKIN_SIGNATURE_SECRET;
const CHECKIN_SIGNATURE_KEY = crypto.createHash('sha256').update(CHECKIN_SIGNATURE_SECRET).digest();

function encryptSignature(signatureBase64) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', CHECKIN_SIGNATURE_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(signatureBase64, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

function decryptSignature(encryptedBase64, ivBase64, authTagBase64) {
  const iv = Buffer.from(ivBase64, 'base64');
  const authTag = Buffer.from(authTagBase64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', CHECKIN_SIGNATURE_KEY, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedBase64, 'base64')), decipher.final()]);
  return decrypted.toString('utf8');
}

// ─────────────────────────────────────────────
// FUNCIONES AUXILIARES
// ─────────────────────────────────────────────

const generateBookingId = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substr(2, 9).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  return `LC-${year}-${timestamp}${random.substr(0, 3)}`;
};

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

const toBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  if (typeof value === 'number') return value !== 0;
  return Boolean(value);
};

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
  const { ignoreBlocks = false, ignoreBookings = false } = options;

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

  const overlappingBookings = ignoreBookings ? 0 : await Booking.countDocuments({
    roomId: room._id,
    status: 'active',
    $or: [
      { checkIn: { $lt: end }, checkOut: { $gt: start } }
    ]
  });

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

    const result = await generateAndSendVoucher(booking);

    if (result && result.success) {
      console.log(`✅ EMAIL ENVIADO EXITOSAMENTE a ${booking.guestInfo.email}`);
    } else {
      console.log(`⚠️ Email enviado pero sin confirmación de éxito`);
    }

    console.log(`📧 ===== FIN ENVÍO DE EMAIL =====\n`);
    return { success: true, ...result };
  } catch (error) {
    console.error(`\n❌ ===== ERROR ENVIANDO EMAIL =====`);
    console.error(`❌ Para: ${booking.guestInfo.email}`);
    console.error(`❌ Error:`, error.message);
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
              Le ofrecemos una sincera disculpa por este inconveniente.
            </p>

            <div style="background-color: #e8f5e9; border: 1px solid #2e7d32; padding: 20px; margin: 25px 0; text-align: center;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #2e7d32; font-weight: bold;">
                Reembolso Procesado
              </p>
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #1a1a1a;">
                Hemos procedido con el reembolso total del importe pagado a través de Stripe.
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666;">
                El monto podría verse reflejado en su cuenta en un plazo de 5 a 10 días hábiles.
              </p>
            </div>

            <p style="font-size: 14px; color: #1a1a1a; line-height: 1.8; margin: 25px 0; font-family: Georgia, serif;">
              Agradecemos su comprensión y esperamos poder recibirle en una próxima oportunidad.
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

exports.getAllBookings = async (req, res, next) => {
  try {
    const { status, startDate, endDate, limit } = req.query;
    const isAdmin = req.user && req.user.role === 'admin';

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

    console.log('[getAllBookings] user:', req.user?.email || 'anon', '| filter:', JSON.stringify(filter), '| limit:', limit || (isAdmin ? 'sin límite' : '500'));

    const query = Booking.find(filter)
      .populate('roomId', 'name type totalUnits')
      .populate('discountCodeId', 'code description discountType discountValue')
      .sort({ createdAt: -1 });

    // Si se pasa limit explícito en query params, usarlo
    // Si es admin sin limit explícito → sin límite (trae todas)
    // Si no es admin sin limit explícito → límite de 500
    if (limit !== undefined && limit !== null && limit !== '') {
      query.limit(Number(limit));
    } else if (!isAdmin) {
      query.limit(500);
    }
    // admin sin limit explícito → sin .limit() → trae todas

    const bookings = await query;

    console.log('[getAllBookings] → returning', bookings.length, 'bookings');

    const ellen = bookings.find(b => b.bookingId === 'LC-2026-378565JM1');
    console.log('[getAllBookings] Ellen booking found?', !!ellen,
      ellen ? `| status:${ellen.status} | roomName:${ellen.roomName}` : '');

    res.json(bookings);
  } catch (error) {
    console.error('[getAllBookings] ERROR:', error);
    next(error);
  }
};

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

// ─────────────────────────────────────────────
// CREAR RESERVA — con fix de isFree
// ─────────────────────────────────────────────

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
      chargeFullPrice,
      isFree,
    } = req.body;

    console.log('=== CREANDO RESERVA ===');
    console.log('Check-in recibido:', checkIn);
    console.log('Check-out recibido:', checkOut);
    console.log('Código de descuento recibido:', discountCode);
    console.log('Charge full price:', chargeFullPrice);
    console.log('isFree:', isFree);
    console.log('Email del huésped:', guestInfo?.email);
    console.log('Usuario que crea la reserva:', req.user?.email, '| Rol:', req.user?.role);

    if (!roomId || !guestInfo || !checkIn || !checkOut || !nights || !pricePerNight && !isFree) {
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
      }
    }

    const shouldIgnoreBlocks = isAdmin || hasValidDiscountCode;
    const shouldIgnoreBookings = isAdmin;

    if (isAdmin) {
      console.log('🔓 ADMIN DETECTADO - IGNORANDO DISPONIBILIDAD Y BLOQUEOS DE HABITACIÓN');
    }
    if (hasValidDiscountCode) {
      console.log('🔓 CÓDIGO DE DESCUENTO VÁLIDO - IGNORANDO BLOQUEOS');
    }

    const availability = await checkRoomAvailabilityInternal(roomId, startDate, endDate, {
      ignoreBlocks: shouldIgnoreBlocks,
      ignoreBookings: shouldIgnoreBookings,
    });

    if (!availability.available) {
      let message = `No disponible para estas fechas`;
      if (availability.error) message = availability.error;

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

    if (shouldIgnoreBookings && availability.bookedUnits > 0) {
      console.log(`⚠️ ADMIN OVERRIDE: Se ignoraron ${availability.bookedUnits} unidades reservadas`);
    }
    if (shouldIgnoreBlocks && availability.blockedUnits > 0) {
      console.log(`⚠️ ADMIN OVERRIDE: Se ignoraron ${availability.blockedUnits} unidades bloqueadas`);
    }

    let discountAmount = 0;
    let discountCodeDoc = null;
    const originalSubtotal = (pricePerNight || 0) * nights;
    const originalTotal = originalSubtotal * 1.20;

    let finalTotal;
    let isPrecioManual = false;
    let finalSubtotal;
    let finalTax;
    let finalMunicipalTax;

    if (isFree === true) {
      finalTotal = 0;
      isPrecioManual = true;
      finalSubtotal = 0;
      finalTax = 0;
      finalMunicipalTax = 0;
      console.log('🎁 Reserva GRATUITA detectada — precio: $0.00');
    } else if (isAdmin && typeof totalPrice === 'number' && totalPrice > 0) {
      finalTotal = totalPrice;
      isPrecioManual = true;
      finalSubtotal = totalPrice;
      finalTax = 0;
      finalMunicipalTax = 0;
      console.log('💰 Usando PRECIO MANUAL (sin impuestos):');
      console.log('  - Total recibido:', finalTotal);
    } else {
      finalTotal = originalTotal;

      if (discountCode && discountCode.trim()) {
        console.log('🎟️ Validando código de descuento:', discountCode);

        discountCodeDoc = await DiscountCode.findOne({
          code: discountCode.toUpperCase().trim(),
          active: true
        });

        if (!discountCodeDoc) {
          return res.status(404).json({
            error: 'Discount code not found',
            message: 'Código de descuento no encontrado o inactivo'
          });
        }

        const validation = discountCodeDoc.isValidForBooking({
          nights: Number(nights),
          roomLugar: availability.room.lugar
        });

        if (!validation.valid) {
          return res.status(400).json({
            error: 'Invalid discount code',
            message: validation.reason
          });
        }

        const roomPricePerNight = availability.room.price || 0;
        finalTotal = discountCodeDoc.calculateFinalPrice(originalTotal, Number(nights), roomPricePerNight);
        discountAmount = originalTotal - finalTotal;

        finalSubtotal = finalTotal;
        finalTax = 0;
        finalMunicipalTax = 0;
      } else {
        finalSubtotal = originalSubtotal;
        finalTax = finalSubtotal * (16 / 100);
        finalMunicipalTax = finalSubtotal * (4 / 100);
        finalTotal = finalSubtotal + finalTax + finalMunicipalTax;
      }
    }

    console.log('📊 Cálculo final:');
    console.log('  - Subtotal:', (finalSubtotal || 0).toFixed(2));
    console.log('  - IVA 16%:', (finalTax || 0).toFixed(2));
    console.log('  - Impuesto Municipal 4%:', (finalMunicipalTax || 0).toFixed(2));
    console.log('  - Total:', finalTotal.toFixed(2));

    let initialPayment, secondNightPayment;
    const adminAdvancePayment = advancePayment && advancePayment > 0 ? advancePayment : null;

    if (isFree === true) {
      initialPayment = 0;
      secondNightPayment = 0;
      console.log('🎁 Reserva gratuita — initialPayment y secondNightPayment = 0');
    } else if (Number(nights) === 1 || chargeFullPrice === true || (adminAdvancePayment && adminAdvancePayment >= finalTotal)) {
      initialPayment = adminAdvancePayment ? Math.min(adminAdvancePayment, finalTotal) : finalTotal;
      secondNightPayment = 0;
    } else if (adminAdvancePayment && adminAdvancePayment > 0) {
      initialPayment = adminAdvancePayment;
      secondNightPayment = Math.max(0, finalTotal - adminAdvancePayment);
    } else {
      initialPayment = finalTotal * 0.5;
      secondNightPayment = finalTotal * 0.5;
    }

    let stripeChargeId = null;
    let paymentStatus = 'pending';

    if (paymentIntentId) {
      try {
        if (paymentIntentId.startsWith('pi_TEST_')) {
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
      if (isFree === true) {
        paymentStatus = 'completed';
        console.log('🎁 Reserva gratuita — paymentStatus: completed');
      } else if (adminAdvancePayment && adminAdvancePayment > 0) {
        paymentStatus = adminAdvancePayment >= finalTotal ? 'completed' : 'partial';
        console.log('💰 Reserva admin con anticipo - paymentStatus:', paymentStatus);
      } else {
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
      pricePerNight: pricePerNight || 0,
      subtotalBeforeDiscount: originalSubtotal,
      discountCode: discountCodeDoc ? discountCodeDoc.code : null,
      discountCodeId: discountCodeDoc ? discountCodeDoc._id : null,
      discountAmount,
      subtotal: finalSubtotal || 0,
      tax: finalTax || 0,
      municipalTax: finalMunicipalTax || 0,
      totalPrice: finalTotal,
      initialPayment,
         secondNightPayment,
         advancePayment: advance,
         secondNightPaid: false,
      paymentStatus,
      paymentIntentId: paymentIntentId || null,
      stripePaymentIntentId: paymentIntentId || null,
      stripeChargeId: stripeChargeId || null,
       secondNightNoteId: secondNightPayment > 0 ? `NOTE-${bookingId}-2ND-NIGHT` : null,
       advancePayment: Number(advancePayment) || 0,
       status: 'active',
      specialRequests: specialRequests || '',
      createdBy: req.user ? req.user._id : null,
      createdByRole: req.user ? req.user.role : 'guest',
      adminOverride: shouldIgnoreBlocks && availability.blockedUnits > 0,
      isPrecioManual: isPrecioManual,
      isFree: isFree === true,
    });

    await newBooking.save();

    console.log(`✅ Reserva creada: ${newBooking.bookingId} para ${guestInfo.email}`);
    if (newBooking.adminOverride) console.log(`🔓 Reserva creada con ADMIN OVERRIDE`);
    if (isFree) console.log(`🎁 Reserva GRATUITA creada`);
    if (isPrecioManual && !isFree) console.log(`💰 Reserva con PRECIO MANUAL: ${formatMXN(finalTotal)}`);

    if (discountCodeDoc) {
      discountCodeDoc.currentUses = (discountCodeDoc.currentUses || 0) + 1;
      await discountCodeDoc.save();
    }

    console.log(`\n📧 Preparando envío de email a ${guestInfo.email}...`);
    let emailResult = null;
    try {
      emailResult = await generateAndSendVoucher(newBooking);
    } catch (emailError) {
      console.error(`❌ Error crítico enviando email:`, emailError);
    }

    let successMessage = '✅ Reserva creada exitosamente. Revisa tu email para el voucher.';
    if (isFree) {
      successMessage = `✅ Reserva GRATUITA creada para ${guestInfo.firstName} ${guestInfo.lastName}.`;
    } else if (discountAmount > 0) {
      successMessage = `✅ Reserva confirmada con descuento de ${formatMXN(discountAmount)} aplicado.`;
    } else if (isPrecioManual) {
      successMessage = `✅ Reserva creada con precio personalizado de ${formatMXN(finalTotal)}.`;
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
      isFree: isFree === true,
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

exports.createBulkBookings = async (req, res, next) => {
  try {
    const { guestInfo, bookings, origin } = req.body;

    if (!guestInfo || !guestInfo.email || guestInfo.email.trim() === '') {
      return res.status(400).json({
        message: 'Información del huésped es requerida',
        error: 'Guest info required'
      });
    }

    if (!Array.isArray(bookings) || bookings.length === 0) {
      return res.status(400).json({
        message: 'Debe enviar al menos una reserva',
        error: 'No bookings provided'
      });
    }

    if (bookings.length > 10) {
      return res.status(400).json({
        message: 'No se pueden crear más de 10 reservas en un solo envío',
        error: 'Too many bookings'
      });
    }

    const isAdmin = req.user && req.user.role === 'admin';
    const createdBookings = [];

    for (let index = 0; index < bookings.length; index += 1) {
      const item = bookings[index];
      const {
        roomId,
        roomName,
        checkIn,
        checkOut,
        nights,
        pricePerNight,
        totalPrice,
        advancePayment,
        paymentIntentId,
        specialRequests,
        isFree,
        manualPrice,
      } = item;

      if (!roomId || !checkIn || !checkOut || !nights || nights <= 0) {
        return res.status(400).json({
          message: `Reserva ${index + 1} incompleta: roomId, checkIn, checkOut y nights son requeridos`,
          error: 'Missing booking fields',
          bookingIndex: index
        });
      }

      const startDate = formatDateWithTimezone(checkIn);
      const endDate = formatDateWithTimezone(checkOut);

      if (!startDate || !endDate || endDate <= startDate) {
        return res.status(400).json({
          message: `Reserva ${index + 1}: check-out debe ser posterior a check-in`,
          error: 'Invalid dates',
          bookingIndex: index
        });
      }

      const availability = await checkRoomAvailabilityInternal(roomId, startDate, endDate, {
        ignoreBlocks: isAdmin,
        ignoreBookings: isAdmin,
      });

      if (!availability.available) {
        let message = `Reserva ${index + 1} no disponible para estas fechas`;
        if (availability.error) message = availability.error;

        return res.status(409).json({
          message,
          error: 'Room not available',
          bookingIndex: index,
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

      const room = availability.room;
      const shouldUseManualPrice = manualPrice !== undefined && manualPrice !== null && manualPrice !== '' && manualPrice !== 'gratis';
      const isManualPrice = shouldUseManualPrice && !isFree;
      const originalSubtotal = ((pricePerNight || room.price || 0) * Number(nights));

      let finalSubtotal;
      let finalTax;
      let finalMunicipalTax;
      let finalTotal;

      if (isFree === true || String(manualPrice).trim().toLowerCase() === 'gratis') {
        finalSubtotal = 0;
        finalTax = 0;
        finalMunicipalTax = 0;
        finalTotal = 0;
      } else if (isManualPrice && typeof totalPrice === 'number' && totalPrice >= 0) {
        finalSubtotal = Number(totalPrice);
        finalTax = 0;
        finalMunicipalTax = 0;
        finalTotal = Number(totalPrice);
      } else {
        finalSubtotal = originalSubtotal;
        finalTax = originalSubtotal * 0.16;
        finalMunicipalTax = originalSubtotal * 0.04;
        finalTotal = finalSubtotal + finalTax + finalMunicipalTax;
      }

       const advance = advancePayment && !Number.isNaN(Number(advancePayment)) ? Number(advancePayment) : 0;
       let initialPayment;
       let secondNightPayment;
       let paymentStatus = 'pending';

       if (isFree === true || String(manualPrice).trim().toLowerCase() === 'gratis') {
         initialPayment = 0;
         secondNightPayment = 0;
         paymentStatus = 'completed';
       } else if (advance > 0) {
         initialPayment = Math.min(advance, finalTotal);
         secondNightPayment = Math.max(0, finalTotal - initialPayment);
         paymentStatus = initialPayment >= finalTotal ? 'completed' : 'partial';
       } else {
         // No advance payment
         if (Number(nights) === 1) {
           // For 1-night stay: expect full payment at check-in
           initialPayment = finalTotal;
           secondNightPayment = 0;
           paymentStatus = 'pending';
         } else {
           // For 2+ night stay: expect 50% deposit, 50% at check-in
           initialPayment = finalTotal * 0.5;
           secondNightPayment = finalTotal * 0.5;
           paymentStatus = 'pending';
         }
       }

      const bookingId = generateBookingId();
      const finalRoomName = roomName && roomName.trim() !== '' ? roomName : availability.room.name;

      const newBooking = new Booking({
        bookingId,
        roomId: availability.room._id,
        roomName: finalRoomName,
        guestInfo,
        checkIn: startDate,
        checkOut: endDate,
        nights,
        pricePerNight: pricePerNight !== undefined ? Number(pricePerNight) : room.price,
        subtotalBeforeDiscount: originalSubtotal,
        discountCode: null,
        discountCodeId: null,
        discountAmount: 0,
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
        stripeChargeId: null,
        secondNightNoteId: secondNightPayment > 0 ? `NOTE-${bookingId}-2ND-NIGHT` : null,
        status: 'active',
        specialRequests: specialRequests || `Reserva creada por ${origin || 'ADMIN'}`,
        createdBy: req.user ? req.user._id : null,
        createdByRole: req.user ? req.user.role : 'guest',
        adminOverride: isAdmin && availability.blockedUnits > 0,
        isPrecioManual: isManualPrice,
        isFree: isFree === true || String(manualPrice).trim().toLowerCase() === 'gratis',
      });

      await newBooking.save();
      createdBookings.push(newBooking);
    }

    let emailResult = null;
    try {
      if (createdBookings.length === 1) {
        emailResult = await generateAndSendVoucher(createdBookings[0]);
      } else {
        emailResult = await generateAndSendMultipleVouchers(createdBookings);
      }
    } catch (emailError) {
      console.error('❌ Error enviando email de reservas en lote:', emailError);
    }

    res.status(201).json({
      success: true,
      message: createdBookings.length === 1
        ? `Se creó 1 reserva. Se envió el correo de confirmación estándar a ${guestInfo.email}.`
        : `Se crearon ${createdBookings.length} reservas. Se envió un solo correo de confirmación a ${guestInfo.email}.`,
      bookings: createdBookings.map(b => ({
        bookingId: b.bookingId,
        roomName: b.roomName,
        totalPrice: b.totalPrice,
        status: b.status
      })),
      emailSent: !!emailResult,
      emailError: emailResult ? null : 'No se pudo enviar el correo de confirmación'
    });
  } catch (error) {
    console.error('Error al crear reservas en lote:', error);
    next(error);
  }
};

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

      if (!isAdmin) {
        const availability = await checkRoomAvailabilityInternal(newRoomId, newCheckIn, newCheckOut, { ignoreBlocks: shouldIgnoreBlocks });

        if (!availability.available) {
          return res.status(409).json({
            error: 'Room not available',
            message: `No disponible para estas fechas`,
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
      } else {
        if (roomId && roomId !== booking.roomId.toString()) {
          const room = await Room.findById(newRoomId);
          if (!room) {
            return res.status(404).json({ error: 'Room not found', message: 'Habitación no encontrada' });
          }
          booking.roomId = newRoomId;
          booking.roomName = room.name;
        }
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
        const chargeIdToRefund = booking.stripeChargeId ||
          (booking.paymentIntentId ? `ch_${booking.paymentIntentId.slice(3)}` : null);

        if (chargeIdToRefund && !chargeIdToRefund.startsWith('ch_TEST')) {
          refundResult = await stripe.refunds.create({
            payment_intent: booking.paymentIntentId,
            amount: Math.round(booking.initialPayment * 100)
          });
          booking.refundId = refundResult.id;
          booking.refundStatus = refundResult.status;
        } else if (chargeIdToRefund && chargeIdToRefund.startsWith('ch_TEST')) {
          booking.refundId = `refund_test_${Date.now()}`;
          booking.refundStatus = 'succeeded';
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

exports.unmarkSecondNightPaid = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found', message: 'Reserva no encontrada' });
    }

    if (!booking.secondNightPaid && !booking.secondNightNotePaid) {
      return res.status(400).json({ message: 'La segunda noche no está marcada como pagada' });
    }

    if (booking.secondNightPayment === 0) {
      return res.status(400).json({ message: 'Esta reserva no tiene pago de segunda noche pendiente' });
    }

    booking.secondNightPaid = false;
    booking.secondNightNotePaid = false;
    booking.paymentStatus = booking.initialPayment < booking.totalPrice ? 'partial' : 'completed';
    booking.updatedAt = Date.now();

    await booking.save();
    await booking.populate('roomId', 'name type totalUnits');
    await booking.populate('discountCodeId', 'code description');

    res.json({
      success: true,
      message: '✅ Pago de segunda noche anulado. La reserva vuelve a estado parcial.',
      booking
    });
  } catch (error) {
    console.error('Error al anular pago de segunda noche:', error);
    next(error);
  }
};

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

    const booking = await Booking.findOne({ bookingId }).populate('roomId');
    if (!booking) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const encrypted = encryptSignature(signature);
    booking.checkinSignatureEncrypted = encrypted.encrypted;
    booking.checkinSignatureIV = encrypted.iv;
    booking.checkinSignatureAuthTag = encrypted.authTag;
    booking.checkinCity = ciudad;
    booking.checkinState = estado;
    booking.checkinIncludeBreakfast = breakfastBoolean;
    booking.checkinSignedAt = new Date();
    booking.checkinSignedBy = req.user?.email || 'unknown';
    booking.updatedAt = Date.now();
    await booking.save();

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

exports.getSignedCheckins = async (req, res, next) => {
  try {
    const signedRecords = await Booking.find({ checkinSignatureEncrypted: { $exists: true, $ne: null } })
      .sort({ checkinSignedAt: -1 })
      .select('bookingId roomName guestInfo checkIn checkOut totalPrice paymentStatus status checkinSignedAt checkinSignedBy');

    res.json(signedRecords);
  } catch (error) {
    console.error('Error obteniendo check-ins firmados:', error);
    next(error);
  }
};

exports.downloadSignedCheckin = async (req, res, next) => {
   try {
     const { bookingId } = req.params;
     const booking = await Booking.findOne({ bookingId }).populate('roomId');
     if (!booking) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }
    if (!booking.checkinSignatureEncrypted || !booking.checkinSignatureIV || !booking.checkinSignatureAuthTag) {
      return res.status(404).json({ message: 'Check-in firmado no encontrado para esta reserva' });
    }
    const signature = decryptSignature(
      booking.checkinSignatureEncrypted,
      booking.checkinSignatureIV,
      booking.checkinSignatureAuthTag
    );

    const pdfBuffer = await generateCheckinPDF(
      booking,
      signature,
      booking.checkinCity || '',
      booking.checkinState || '',
      Boolean(booking.checkinIncludeBreakfast)
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="SignedCheckin_${bookingId}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error descargando check-in firmado:', error);
    next(error);
  }
};

exports.deleteSignedCheckin = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId });
    if (!booking) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }
    if (!booking.checkinSignatureEncrypted) {
      return res.status(404).json({ message: 'No hay check-in firmado para eliminar' });
    }

    booking.checkinSignatureEncrypted = null;
    booking.checkinSignatureIV = null;
    booking.checkinSignatureAuthTag = null;
    booking.checkinCity = null;
    booking.checkinState = null;
    booking.checkinIncludeBreakfast = null;
    booking.checkinSignedAt = null;
    booking.checkinSignedBy = null;

    await booking.save();

    res.json({
      success: true,
      message: 'Check-in firmado eliminado correctamente',
      bookingId
    });
  } catch (error) {
    console.error('Error eliminando check-in firmado:', error);
    next(error);
  }
};

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

exports.resendBookingEmail = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found', message: 'Reserva no encontrada' });
    }

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

exports.sendTestEmailToExistingBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found', message: 'Reserva no encontrada' });
    }

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
// EXPORTAR
// ─────────────────────────────────────────────

module.exports = {
  createPaymentIntent: exports.createPaymentIntent,
  createBooking: exports.createBooking,
  createBulkBookings: exports.createBulkBookings,
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
  getSignedCheckins: exports.getSignedCheckins,
  downloadSignedCheckin: exports.downloadSignedCheckin,
  deleteSignedCheckin: exports.deleteSignedCheckin,
  unmarkSecondNightPaid: exports.unmarkSecondNightPaid,
  downloadVoucher: exports.downloadVoucher,
  resendBookingEmail: exports.resendBookingEmail,
  sendTestEmailToExistingBooking: exports.sendTestEmailToExistingBooking,
  testEmail: exports.testEmail
};
