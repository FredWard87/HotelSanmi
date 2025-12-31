const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const Room = require('../models/Room');

// Configurar transporte de email
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // false para puerto 587
  auth: {
    user: process.env.EMAIL_USERNAME || 'audit3674@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'xarv ywnv gdkv jofm',
  },
  tls: {
    rejectUnauthorized: false, // Vital para evitar bloqueos en Vercel
    minVersion: 'TLSv1.2'
  },
  connectionTimeout: 10000, // 10 segundos para conectar
  greetingTimeout: 10000,   // 10 segundos para esperar el saludo de Gmail
});

// Leer el logo una sola vez
let logoBuffer = null;
try {
  const logoPath = path.join(__dirname, '../assets/logo.png');
  if (fs.existsSync(logoPath)) {
    logoBuffer = fs.readFileSync(logoPath);
    console.log('✅ Logo cargado correctamente para emails');
  } else {
    console.warn('⚠️ Logo no encontrado en:', logoPath);
  }
} catch (logoError) {
  console.error('❌ Error cargando logo:', logoError.message);
}

// Generar un CID único para el logo
const LOGO_CID = 'la-capilla-logo@reserva';

/**
 * Generar PDF del voucher - PAGO COMPLETO (1 noche o pago total)
 */
function generateFullPaymentVoucherPDF(booking) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Paleta de colores profesional
      const gold = '#C9A961';
      const darkGold = '#B8984E';
      const charcoal = '#1A1A1A';
      const darkGray = '#2C2C2C';
      const mediumGray = '#666666';
      const lightGray = '#F8F8F8';
      const successGreen = '#2E7D32';
      const successBg = '#E8F5E9';

      const pageWidth = 595.28;
      const margin = 50;
      const contentWidth = pageWidth - (margin * 2);

      // Calcular impuesto municipal si no existe en booking
      const municipalTax = booking.municipalTax || (booking.subtotal * 0.04);
      const totalWithTaxes = (booking.subtotal || 0) + (booking.tax || 0) + municipalTax;

      // ===== HEADER ELEGANTE =====
      doc.rect(0, 0, pageWidth, 100).fill(charcoal);
      doc.rect(0, 0, pageWidth, 3).fill(gold);
      doc.rect(margin - 10, 25, contentWidth + 20, 1).fill(gold);
      
      // Logo en lugar de texto (20% más grande)
      try {
        const logoPath = path.join(__dirname, '../assets/logo.png');
        if (fs.existsSync(logoPath)) {
          // Centrar el logo en el header - 20% más grande
          const logoWidth = 216; // 180 * 1.2 = 216
          const logoHeight = 72; // 60 * 1.2 = 72
          const logoX = (pageWidth - logoWidth) / 2;
          const logoY = 15; // Un poco más arriba por el tamaño mayor
          
          doc.image(logoPath, logoX, logoY, {
            width: logoWidth,
            height: logoHeight
          });
        } else {
          console.warn('⚠️ Logo no encontrado en:', logoPath);
          // Fallback a texto si no hay logo
          doc.fontSize(13).fillColor(gold).font('Helvetica');
          doc.text('CONFIRMACIÓN DE RESERVA', margin, 35, { 
            align: 'center', 
            width: contentWidth 
          });
          
          doc.fontSize(11).fillColor('#CCCCCC').font('Helvetica');
          doc.text('PAGO COMPLETADO', margin, 55, { 
            align: 'center', 
            width: contentWidth 
          });
        }
      } catch (logoError) {
        console.error('❌ Error cargando logo:', logoError.message);
        // Fallback a texto si hay error
        doc.fontSize(13).fillColor(gold).font('Helvetica');
        doc.text('CONFIRMACIÓN DE RESERVA', margin, 35, { 
          align: 'center', 
          width: contentWidth 
        });
        
        doc.fontSize(11).fillColor('#CCCCCC').font('Helvetica');
        doc.text('PAGO COMPLETADO', margin, 55, { 
          align: 'center', 
          width: contentWidth 
        });
      }
      
      doc.moveDown(2.5);

      // ===== ID DE RESERVA =====
      const bookingIdY = doc.y;
      doc.rect(margin - 5, bookingIdY, contentWidth + 10, 55).fill(lightGray);
      doc.rect(margin, bookingIdY + 5, contentWidth, 45).fill('white');
      doc.rect(margin, bookingIdY + 5, contentWidth, 45).lineWidth(2).stroke(gold);
      
      doc.fontSize(9).font('Helvetica').fillColor(mediumGray);
      doc.text('NÚMERO DE RESERVA', margin + 15, bookingIdY + 12, { 
        characterSpacing: 1 
      });
      
      doc.fontSize(18).font('Helvetica-Bold').fillColor(gold);
      doc.text(booking.bookingId, margin + 15, bookingIdY + 25);
      
      doc.moveDown(2);

      // ===== DETALLES DE LA HABITACIÓN (RESUMEN) =====
      const roomInfo = booking.room || {};
      const roomSummaryY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('DETALLES DE LA HABITACIÓN', margin, roomSummaryY);
      doc.rect(margin, roomSummaryY + 14, 70, 1.5).fill(gold);
      doc.moveDown(0.8);

      const roomStartY = doc.y;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(mediumGray);
      doc.text('HABITACIÓN', margin, roomStartY);
      doc.text('TAMAÑO', margin, roomStartY + 16);
      doc.text('CAPACIDAD', margin, roomStartY + 32);
      doc.text('TIPO DE CAMA', margin, roomStartY + 48);

      doc.fontSize(9).font('Helvetica').fillColor(charcoal);
      doc.text(booking.roomName || roomInfo.name || '—', margin + 110, roomStartY, { width: contentWidth - 130 });
      doc.text(roomInfo.size || '—', margin + 110, roomStartY + 16);
      doc.text(roomInfo.capacity ? `${roomInfo.capacity} huésped(es)` : '—', margin + 110, roomStartY + 32);
      doc.text(roomInfo.bedType || '—', margin + 110, roomStartY + 48);

      doc.moveDown(2);
      if (roomInfo.description) {
        const shortDesc = roomInfo.description.length > 200 ? roomInfo.description.slice(0, 197) + '...' : roomInfo.description;
        doc.fontSize(9).font('Helvetica').fillColor(mediumGray);
        doc.text(shortDesc, margin, doc.y, { width: contentWidth });
        doc.moveDown(1.5);
      }

      // ===== INFORMACIÓN DEL HUÉSPED =====
      const guestInfoY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('INFORMACIÓN DEL HUÉSPED', margin, guestInfoY);
      doc.rect(margin, guestInfoY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(1);
      
      const infoStartY = doc.y;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(mediumGray);
      
      doc.text('NOMBRE COMPLETO', margin, infoStartY);
      doc.text('EMAIL', margin, infoStartY + 16);
      doc.text('TELÉFONO', margin, infoStartY + 32);
      
      doc.fontSize(9).font('Helvetica').fillColor(charcoal);
      doc.text(`${booking.guestInfo.firstName} ${booking.guestInfo.lastName}`, margin + 120, infoStartY, { width: contentWidth - 140 });
      doc.text(booking.guestInfo.email, margin + 120, infoStartY + 16, { width: contentWidth - 140 });
      doc.text(booking.guestInfo.phone || 'No registrado', margin + 120, infoStartY + 32, { width: contentWidth - 140 });
      
      doc.moveDown(2);

      // ===== DETALLES DE LA ESTANCIA =====
      const stayDetailsY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('DETALLES DE LA ESTANCIA', margin, stayDetailsY);
      doc.rect(margin, stayDetailsY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(1);
      
      const cardY = doc.y;
      doc.roundedRect(margin, cardY, contentWidth, 75, 5).fill(lightGray);
      
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

      const detailsStartY = cardY + 12;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(mediumGray);
      
      doc.text('HABITACIÓN', margin + 15, detailsStartY);
      doc.text('CHECK-IN', margin + 15, detailsStartY + 18);
      doc.text('CHECK-OUT', margin + 15, detailsStartY + 36);
      doc.text('NOCHES', margin + 15, detailsStartY + 54);
      
      doc.fontSize(9).font('Helvetica').fillColor(charcoal);
      doc.text(booking.roomName, margin + 110, detailsStartY, { width: contentWidth - 130 });
      doc.text(checkInDate, margin + 110, detailsStartY + 18, { width: contentWidth - 130 });
      doc.text(checkOutDate, margin + 110, detailsStartY + 36, { width: contentWidth - 130 });
      doc.text(`${booking.nights} ${booking.nights === 1 ? 'noche' : 'noches'}`, margin + 110, detailsStartY + 54);
      
      doc.moveDown(4);

      // ===== DESGLOSE DE PAGOS =====
      const paymentBreakdownY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('DESGLOSE DEL PAGO', margin, paymentBreakdownY);
      doc.rect(margin, paymentBreakdownY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(1);

      const tableY = doc.y;
      const lineHeight = 25;
      const labelX = margin + 15;
      const valueX = margin + contentWidth - 100;

      // Ajustar altura de la tabla para 4 líneas (subtotal, IVA, municipal, total)
      doc.roundedRect(margin, tableY, contentWidth, lineHeight * 4 + 8, 5).fill(lightGray);
      
      doc.fontSize(9).font('Helvetica').fillColor(charcoal);
      
      doc.text('Subtotal', labelX, tableY + 8);
      doc.text(`$${(booking.subtotal || 0).toFixed(2)} MXN`, valueX, tableY + 8, { 
        width: 90, 
        align: 'right' 
      });

      doc.text('IVA (16%)', labelX, tableY + lineHeight + 8);
      doc.text(`$${(booking.tax || 0).toFixed(2)} MXN`, valueX, tableY + lineHeight + 8, { 
        width: 90, 
        align: 'right' 
      });

      doc.text('Impuesto Municipal (4%)', labelX, tableY + lineHeight * 2 + 8);
      doc.text(`$${municipalTax.toFixed(2)} MXN`, valueX, tableY + lineHeight * 2 + 8, { 
        width: 90, 
        align: 'right' 
      });

      const dividerY = tableY + lineHeight * 3 + 4;
      doc.moveTo(margin + 15, dividerY).lineTo(margin + contentWidth - 15, dividerY)
         .lineWidth(1.5).stroke(gold);
      
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('TOTAL PAGADO', labelX, tableY + lineHeight * 3 + 12);
      doc.fontSize(13).fillColor(gold);
      doc.text(`$${totalWithTaxes.toFixed(2)} MXN`, valueX, tableY + lineHeight * 3 + 10, { 
        width: 90, 
        align: 'right' 
      });
      
      doc.moveDown(3.5);

      // ===== ESTADO DE PAGO COMPLETO =====
      const paymentStatusY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('ESTADO DE PAGO', margin, paymentStatusY);
      doc.rect(margin, paymentStatusY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(1);

      const cardPaymentY = doc.y;
      doc.roundedRect(margin, cardPaymentY, contentWidth, 75, 8)
         .lineWidth(2).strokeColor(successGreen).fillAndStroke(successBg, successGreen);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor(successGreen);
      doc.text('PAGO COMPLETO REALIZADO', margin + 15, cardPaymentY + 16);
      
      doc.fontSize(8.5).font('Helvetica').fillColor(darkGray);
      doc.text(`Monto total: $${totalWithTaxes.toFixed(2)} MXN`, margin + 15, cardPaymentY + 32);
      doc.text(`Fecha de pago: ${new Date(booking.createdAt).toLocaleDateString('es-MX', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      })}`, margin + 15, cardPaymentY + 45);
      doc.text(`Método de pago: Stripe (Tarjeta)`, margin + 15, cardPaymentY + 58);
      
      doc.moveDown(4);

      // ===== INSTRUCCIONES =====
      const instructionsY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('INFORMACIÓN IMPORTANTE', margin, instructionsY);
      doc.rect(margin, instructionsY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(0.8);

      const boxY = doc.y;
      const boxHeight = 60;
      doc.roundedRect(margin, boxY, contentWidth, boxHeight, 5).fill(lightGray);
      
      doc.fontSize(8.5).font('Helvetica').fillColor(charcoal);
      const instructionsStartY = boxY + 10;
      const lineSpacing = 12;
      
      const instructions = [
        'Presenta este voucher en recepción al momento del check-in',
        'Tu reserva está completamente pagada, no requiere pagos adicionales',
        'Conserva este documento como comprobante oficial de tu reserva',
        'Para cualquier duda o cambio, contáctanos directamente'
      ];
      
      instructions.forEach((instruction, index) => {
        doc.fontSize(7.5).fillColor(gold).text('•', margin + 12, instructionsStartY + (index * lineSpacing));
        doc.fontSize(8.5).fillColor(charcoal).text(
          instruction, 
          margin + 20, 
          instructionsStartY + (index * lineSpacing),
          { width: contentWidth - 35 }
        );
      });
      
      doc.moveDown(4);

      // ===== INFORMACIÓN DE CONTACTO =====
      const contactY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('INFORMACIÓN DE CONTACTO', margin, contactY);
      doc.rect(margin, contactY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(0.8);

      const contactBoxY = doc.y;
      doc.roundedRect(margin, contactBoxY, contentWidth, 60, 8)
         .lineWidth(1).strokeColor(gold).fillAndStroke(lightGray, gold);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('La Capilla Hotel ', margin + 15, contactBoxY + 12);
      
      doc.fontSize(8.5).font('Helvetica').fillColor(darkGray);
      const contactInfoY = contactBoxY + 28;
      
      doc.text('Teléfono:', margin + 15, contactInfoY);
      doc.text('+52 4777 347474', margin + 70, contactInfoY);
      
      doc.text('WhatsApp:', margin + 220, contactInfoY);
      doc.text('+52 4777 347474', margin + 280, contactInfoY);
      
      doc.text('Email:', margin + 15, contactInfoY + 14);
      doc.text('lacapillasl@gmail.com', margin + 70, contactInfoY + 14);
      
      doc.moveDown(3.5);

      // ===== FOOTER =====
      const footerY = doc.y + 15;
      doc.moveTo(margin, footerY).lineTo(margin + contentWidth, footerY)
         .lineWidth(1).stroke(gold);
      
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('Este documento es tu comprobante oficial de reserva', margin, footerY + 12, {
        align: 'center',
        width: contentWidth
      });
      
      doc.fontSize(7).font('Helvetica').fillColor(mediumGray);
      const timestamp = new Date().toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(
        `Documento generado: ${timestamp} | Reserva: ${booking.bookingId}`, 
        margin, 
        footerY + 25, 
        { align: 'center', width: contentWidth }
      );
      
      doc.moveTo(margin, footerY + 42).lineTo(margin + contentWidth, footerY + 42)
         .lineWidth(1.5).stroke(gold);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generar PDF del voucher - PAGO PARCIAL (50% pagado, 50% pendiente)
 */
function generatePartialPaymentVoucherPDF(booking) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        bufferPages: true,
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('error', reject);
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Paleta de colores profesional
      const gold = '#C9A961';
      const darkGold = '#B8984E';
      const charcoal = '#1A1A1A';
      const darkGray = '#2C2C2C';
      const mediumGray = '#666666';
      const lightGray = '#F8F8F8';
      const successGreen = '#2E7D32';
      const successBg = '#E8F5E9';
      const warningOrange = '#F57C00';
      const warningBg = '#FFF8E1';

      const pageWidth = 595.28;
      const margin = 50;
      const contentWidth = pageWidth - (margin * 2);

      // Calcular impuesto municipal si no existe en booking
      const municipalTax = booking.municipalTax || (booking.subtotal * 0.04);
      const totalWithTaxes = (booking.subtotal || 0) + (booking.tax || 0) + municipalTax;
      const initialPayment = booking.initialPayment || (totalWithTaxes * 0.5);
      const secondNightPayment = totalWithTaxes - initialPayment;

      // ===== HEADER ELEGANTE =====
      doc.rect(0, 0, pageWidth, 100).fill(charcoal);
      doc.rect(0, 0, pageWidth, 3).fill(gold);
      doc.rect(margin - 10, 25, contentWidth + 20, 1).fill(gold);
      
      // Logo en lugar de texto (20% más grande)
      try {
        const logoPath = path.join(__dirname, '../assets/logo.png');
        if (fs.existsSync(logoPath)) {
          // Centrar el logo en el header - 20% más grande
          const logoWidth = 216; // 180 * 1.2 = 216
          const logoHeight = 72; // 60 * 1.2 = 72
          const logoX = (pageWidth - logoWidth) / 2;
          const logoY = 15; // Un poco más arriba por el tamaño mayor
          
          doc.image(logoPath, logoX, logoY, {
            width: logoWidth,
            height: logoHeight
          });
        } else {
          console.warn('⚠️ Logo no encontrado en:', logoPath);
          // Fallback a texto si no hay logo
          doc.fontSize(13).fillColor(gold).font('Helvetica');
          doc.text('CONFIRMACIÓN DE RESERVA', margin, 35, { 
            align: 'center', 
            width: contentWidth 
          });
          
          doc.fontSize(11).fillColor('#CCCCCC').font('Helvetica');
          doc.text('PAGO PARCIAL - 50% BALANCE PENDIENTE', margin, 55, { 
            align: 'center', 
            width: contentWidth 
          });
        }
      } catch (logoError) {
        console.error('❌ Error cargando logo:', logoError.message);
        // Fallback a texto si hay error
        doc.fontSize(13).fillColor(gold).font('Helvetica');
        doc.text('CONFIRMACIÓN DE RESERVA', margin, 35, { 
          align: 'center', 
          width: contentWidth 
        });
        
        doc.fontSize(11).fillColor('#CCCCCC').font('Helvetica');
        doc.text('PAGO PARCIAL - 50% BALANCE PENDIENTE', margin, 55, { 
          align: 'center', 
            width: contentWidth 
        });
      }
      
      doc.moveDown(2.5);

      // ===== ID DE RESERVA =====
      const bookingIdY = doc.y;
      doc.rect(margin - 5, bookingIdY, contentWidth + 10, 55).fill(lightGray);
      doc.rect(margin, bookingIdY + 5, contentWidth, 45).fill('white');
      doc.rect(margin, bookingIdY + 5, contentWidth, 45).lineWidth(2).stroke(gold);
      
      doc.fontSize(9).font('Helvetica').fillColor(mediumGray);
      doc.text('NÚMERO DE RESERVA', margin + 15, bookingIdY + 12, { 
        characterSpacing: 1 
      });
      
      doc.fontSize(18).font('Helvetica-Bold').fillColor(gold);
      doc.text(booking.bookingId, margin + 15, bookingIdY + 25);
      
      doc.moveDown(2);

      // ===== INFORMACIÓN DEL HUÉSPED =====
      const guestInfoY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('INFORMACIÓN DEL HUÉSPED', margin, guestInfoY);
      doc.rect(margin, guestInfoY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(1);
      
      const infoStartY = doc.y;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(mediumGray);
      
      doc.text('NOMBRE COMPLETO', margin, infoStartY);
      doc.text('EMAIL', margin, infoStartY + 16);
      doc.text('TELÉFONO', margin, infoStartY + 32);
      
      doc.fontSize(9).font('Helvetica').fillColor(charcoal);
      doc.text(`${booking.guestInfo.firstName} ${booking.guestInfo.lastName}`, margin + 120, infoStartY, { width: contentWidth - 140 });
      doc.text(booking.guestInfo.email, margin + 120, infoStartY + 16, { width: contentWidth - 140 });
      doc.text(booking.guestInfo.phone || 'No registrado', margin + 120, infoStartY + 32, { width: contentWidth - 140 });
      
      doc.moveDown(2);

      // ===== DETALLES DE LA ESTANCIA =====
      const stayDetailsY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('DETALLES DE LA ESTANCIA', margin, stayDetailsY);
      doc.rect(margin, stayDetailsY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(1);
      
      const cardY = doc.y;
      doc.roundedRect(margin, cardY, contentWidth, 75, 5).fill(lightGray);
      
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

      const detailsStartY = cardY + 12;
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(mediumGray);
      
      doc.text('HABITACIÓN', margin + 15, detailsStartY);
      doc.text('CHECK-IN', margin + 15, detailsStartY + 18);
      doc.text('CHECK-OUT', margin + 15, detailsStartY + 36);
      doc.text('NOCHES', margin + 15, detailsStartY + 54);
      
      doc.fontSize(9).font('Helvetica').fillColor(charcoal);
      doc.text(booking.roomName, margin + 110, detailsStartY, { width: contentWidth - 130 });
      doc.text(checkInDate, margin + 110, detailsStartY + 18, { width: contentWidth - 130 });
      doc.text(checkOutDate, margin + 110, detailsStartY + 36, { width: contentWidth - 130 });
      doc.text(`${booking.nights} noches`, margin + 110, detailsStartY + 54);
      
      doc.moveDown(4);

      // ===== DESGLOSE DE PAGOS =====
      const paymentBreakdownY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('DESGLOSE DEL PAGO', margin, paymentBreakdownY);
      doc.rect(margin, paymentBreakdownY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(1);

      const tableY = doc.y;
      const lineHeight = 25;
      const labelX = margin + 15;
      const valueX = margin + contentWidth - 100;

      // Ajustar altura de la tabla para 4 líneas (subtotal, IVA, municipal, total)
      doc.roundedRect(margin, tableY, contentWidth, lineHeight * 4 + 8, 5).fill(lightGray);
      
      doc.fontSize(9).font('Helvetica').fillColor(charcoal);
      
      doc.text('Subtotal', labelX, tableY + 8);
      doc.text(`$${(booking.subtotal || 0).toFixed(2)} MXN`, valueX, tableY + 8, { 
        width: 90, 
        align: 'right' 
      });

      doc.text('IVA (16%)', labelX, tableY + lineHeight + 8);
      doc.text(`$${(booking.tax || 0).toFixed(2)} MXN`, valueX, tableY + lineHeight + 8, { 
        width: 90, 
        align: 'right' 
      });

      doc.text('Impuesto Municipal (4%)', labelX, tableY + lineHeight * 2 + 8);
      doc.text(`$${municipalTax.toFixed(2)} MXN`, valueX, tableY + lineHeight * 2 + 8, { 
        width: 90, 
        align: 'right' 
      });

      const dividerY = tableY + lineHeight * 3 + 4;
      doc.moveTo(margin + 15, dividerY).lineTo(margin + contentWidth - 15, dividerY)
         .lineWidth(1.5).stroke(gold);
      
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('TOTAL DE RESERVA', labelX, tableY + lineHeight * 3 + 12);
      doc.fontSize(13).fillColor(gold);
      doc.text(`$${totalWithTaxes.toFixed(2)} MXN`, valueX, tableY + lineHeight * 3 + 10, { 
        width: 90, 
        align: 'right' 
      });
      
      doc.moveDown(3.5);

      // ===== ESTADO DE PAGOS =====
      const paymentStatusY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('ESTADO DE PAGOS', margin, paymentStatusY);
      doc.rect(margin, paymentStatusY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(1);

      // TARJETA 1: PAGO COMPLETADO
      const card1Y = doc.y;
      const cardHeight1 = 60;
      doc.roundedRect(margin, card1Y, contentWidth, cardHeight1, 8)
         .lineWidth(2).strokeColor(successGreen).fillAndStroke(successBg, successGreen);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor(successGreen);
      doc.text('PAGO INICIAL REALIZADO (50%)', margin + 15, card1Y + 14);
      
      doc.fontSize(8.5).font('Helvetica').fillColor(darkGray);
      doc.text(`Cantidad: $${initialPayment.toFixed(2)} MXN`, margin + 15, card1Y + 28);
      doc.text(`Fecha: ${new Date(booking.createdAt).toLocaleDateString('es-MX', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      })}`, margin + 15, card1Y + 40);
      doc.text(`Método: Stripe (Tarjeta)`, margin + 250, card1Y + 40);
      
      doc.moveDown(3.5);

      // TARJETA 2: PAGO PENDIENTE
      const card2Y = doc.y;
      const cardHeight2 = 75;
      doc.roundedRect(margin, card2Y, contentWidth, cardHeight2, 8)
         .lineWidth(2).strokeColor(warningOrange).fillAndStroke(warningBg, warningOrange);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor(warningOrange);
      doc.text('PENDIENTE: PAGO EN RECEPCIÓN (50%)', margin + 15, card2Y + 18);
      
      doc.fontSize(16).font('Helvetica-Bold').fillColor(warningOrange);
      doc.text(`$${secondNightPayment.toFixed(2)} MXN`, margin + 15, card2Y + 38);
      
      doc.fontSize(8.5).font('Helvetica').fillColor(darkGray);
      doc.text(`Fecha límite: ${checkOutDate}`, margin + 15, card2Y + 58);
      doc.text(`Métodos: Efectivo, Tarjeta`, margin + 250, card2Y + 58);
      
      doc.moveDown(4.5);

      // ===== INSTRUCCIONES =====
      const instructionsY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('INSTRUCCIONES IMPORTANTES', margin, instructionsY);
      doc.rect(margin, instructionsY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(0.8);

      const boxY = doc.y;
      const boxHeight = 70;
      doc.roundedRect(margin, boxY, contentWidth, boxHeight, 5).fill(lightGray);
      
      doc.fontSize(8.5).font('Helvetica').fillColor(charcoal);
      const instructionsStartY = boxY + 10;
      const lineSpacing = 11;
      
      const instructions = [
        'Presenta este voucher digital en recepción al momento del check-in',
        'El pago del 50% restante debe realizarse al momento del check-in',
        'Métodos aceptados: Efectivo, tarjetas de crédito y débito',
        'Conserva este documento como comprobante oficial de tu reserva',
        'Para cualquier duda o cambio, contáctanos directamente'
      ];
      
      instructions.forEach((instruction, index) => {
        doc.fontSize(7.5).fillColor(gold).text('•', margin + 12, instructionsStartY + (index * lineSpacing));
        doc.fontSize(8.5).fillColor(charcoal).text(
          instruction, 
          margin + 20, 
          instructionsStartY + (index * lineSpacing),
          { width: contentWidth - 35 }
        );
      });
      
      doc.moveDown(4);

      // ===== INFORMACIÓN DE CONTACTO =====
      const contactY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('INFORMACIÓN DE CONTACTO', margin, contactY);
      doc.rect(margin, contactY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(0.8);

      const contactBoxY = doc.y;
      const contactBoxHeight = 55;
      doc.roundedRect(margin, contactBoxY, contentWidth, contactBoxHeight, 8)
         .lineWidth(1).strokeColor(gold).fillAndStroke(lightGray, gold);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('La Capilla Hotel ', margin + 15, contactBoxY + 10);
      
      doc.fontSize(8.5).font('Helvetica').fillColor(darkGray);
      const contactInfoY = contactBoxY + 25;
      
      doc.text('Teléfono:', margin + 15, contactInfoY);
      doc.text('+52 4777 347474', margin + 70, contactInfoY);
      
      doc.text('WhatsApp:', margin + 220, contactInfoY);
      doc.text('+52 4777 347474', margin + 280, contactInfoY);
      
      doc.text('Email:', margin + 15, contactInfoY + 12);
      doc.text('lacapillasl@gmail.com', margin + 70, contactInfoY + 12);
      
      doc.moveDown(3.5);

      // ===== FOOTER =====
      const footerY = doc.y + 15;
      doc.moveTo(margin, footerY).lineTo(margin + contentWidth, footerY)
         .lineWidth(1).stroke(gold);
      
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('Este documento es tu comprobante oficial de reserva', margin, footerY + 12, {
        align: 'center',
        width: contentWidth
      });
      
      doc.fontSize(7).font('Helvetica').fillColor(mediumGray);
      const timestamp = new Date().toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(
        `Documento generado: ${timestamp} | Reserva: ${booking.bookingId}`, 
        margin, 
        footerY + 25, 
        { align: 'center', width: contentWidth }
      );
      
      doc.moveTo(margin, footerY + 42).lineTo(margin + contentWidth, footerY + 42)
         .lineWidth(1.5).stroke(gold);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generar PDF apropiado según tipo de pago
 */
function generateVoucherPDF(booking) {
  // Si es 1 noche o pago completo
  if (booking.nights === 1 || booking.initialPayment >= booking.totalPrice) {
    return generateFullPaymentVoucherPDF(booking);
  }
  // Si son 2+ noches con pago parcial (50%)
  return generatePartialPaymentVoucherPDF(booking);
}

/**
 * Enviar voucher por email - PAGO COMPLETO
 */
async function sendFullPaymentEmail(booking, pdfBuffer) {
  try {
    // Calcular impuesto municipal si no existe
    const municipalTax = booking.municipalTax || (booking.subtotal * 0.04);
    const totalWithTaxes = (booking.subtotal || 0) + (booking.tax || 0) + municipalTax;

    // Preparar adjuntos
    const attachments = [
      {
        filename: `Voucher_${booking.bookingId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    ];

    // Si tenemos el logo, adjuntarlo también para usar como imagen incrustada
    if (logoBuffer) {
      attachments.push({
        filename: 'logo.png',
        content: logoBuffer,
        contentType: 'image/png',
        cid: LOGO_CID // Content ID para referenciar en el HTML
      });
    }

    const mailOptions = {
      from: process.env.EMAIL_USERNAME || 'audit3674@gmail.com',
      to: booking.guestInfo.email,
      subject: `Reserva Confirmada - La Capilla Hotel | ${booking.bookingId}`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; }
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; }
            .header { 
              background: linear-gradient(135deg, #2C2C2C 0%, #1a1a1a 100%); 
              padding: 25px 30px; 
              text-align: center; 
            }
            .logo-container {
              text-align: center;
              margin: 0 auto;
            }
            .logo-img {
              max-width: 216px; /* 20% más grande */
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .fallback-text {
              color: #C9A961;
              text-align: center;
              margin: 0;
            }
            .fallback-text h1 {
              font-size: 28px;
              margin: 0;
              padding: 0;
            }
            .fallback-text p {
              font-size: 12px;
              color: #bbb;
              margin-top: 5px;
            }
            .content { padding: 30px; background: white; }
            .section { margin-bottom: 25px; }
            .section-title { 
              color: #C9A961; 
              font-size: 14px; 
              font-weight: bold; 
              text-transform: uppercase; 
              border-bottom: 2px solid #C9A961; 
              padding-bottom: 10px; 
              margin-bottom: 15px; 
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              padding: 8px 0; 
              border-bottom: 1px solid #eee; 
            }
            .booking-id { 
              background: #f0f0f0; 
              padding: 15px; 
              border-left: 4px solid #C9A961; 
              margin: 20px 0; 
              font-size: 16px; 
              font-weight: bold; 
              border-radius: 5px;
              text-align: center;
            }
            .payment-status { 
              background: #E8F5E9; 
              padding: 15px; 
              border-radius: 5px; 
              margin: 15px 0; 
              border-left: 4px solid #2E7D32;
            }
            .status-badge { 
              display: inline-block; 
              padding: 5px 12px; 
              border-radius: 20px; 
              font-size: 12px; 
              font-weight: bold; 
              background: #4CAF50; 
              color: white; 
            }
            .footer { 
              background: #f0f0f0; 
              padding: 20px; 
              text-align: center; 
              font-size: 12px; 
              color: #666; 
              border-top: 1px solid #ddd; 
            }
            .divider { 
              height: 1px; 
              background: #C9A961; 
              margin: 20px 0; 
            }
            ul { margin-left: 20px; }
            li { margin: 8px 0; }
            .contact-info { 
              background: #F8F8F8; 
              padding: 15px; 
              border-radius: 5px; 
              margin-top: 20px; 
              border: 1px solid #E0E0E0;
            }
            .contact-item {
              margin-bottom: 15px;
              line-height: 1.8;
            }
            .contact-item:last-child {
              margin-bottom: 0;
            }
            .contact-label {
              font-weight: bold;
              display: block;
              margin-bottom: 2px;
              color: #333;
            }
            .contact-value {
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-container">
                ${logoBuffer ? 
                  `<img src="cid:${LOGO_CID}" alt="La Capilla Hotel" class="logo-img">` : 
                  `<div class="fallback-text">
                    <h1>LA CAPILLA</h1>
                    <p>HOTEL</p>
                  </div>`
                }
              </div>
            </div>

            <div class="content">
              <p style="font-size: 14px; margin-bottom: 20px;">
                Hola <strong>${booking.guestInfo.firstName}</strong>,
              </p>
              
              <p style="margin-bottom: 15px;">
                ¡Gracias por tu reserva en <strong>La Capilla Hotel</strong>! Tu pago ha sido procesado correctamente y tu reserva está confirmada.
              </p>

              <div class="booking-id">
                NÚMERO DE RESERVA: ${booking.bookingId}
              </div>

              <div class="section">
                <div class="section-title">Información de tu Estancia</div>
                <div class="info-row">
                  <span>Habitación:</span>
                  <strong>${booking.roomName}</strong>
                </div>
                <div class="info-row">
                  <span>Check-in:</span>
                  <strong>${new Date(booking.checkIn).toLocaleDateString('es-MX', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</strong>
                </div>
                <div class="info-row">
                  <span>Check-out:</span>
                  <strong>${new Date(booking.checkOut).toLocaleDateString('es-MX', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</strong>
                </div>
                <div class="info-row">
                  <span>Noches:</span>
                  <strong>${booking.nights}</strong>
                </div>
              </div>

              <div class="divider"></div>

              <div class="section">
                <div class="section-title">Estado de Pago</div>
                
                <div class="payment-status">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-weight: bold;">Pago Completo</span>
                    <span class="status-badge">COMPLETADO</span>
                  </div>
                  <div style="font-size: 13px; color: #666;">
                    Monto total: <strong>$${totalWithTaxes.toFixed(2)} MXN</strong>
                    <div style="font-size: 11px; color: #888; margin-top: 5px;">
                      Incluye IVA (16%) e Impuesto Municipal (4%)
                    </div>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Tu Voucher</div>
                <p>Se adjunta tu voucher de confirmación. Presenta este documento en recepción al momento del check-in.</p>
              </div>

              <div class="divider"></div>

              <div class="section">
                <div class="section-title">¿Preguntas?</div>
                <p>Estamos aquí para ayudarte:</p>
                <div class="contact-info">
                  <div class="contact-item">
                    <span class="contact-label">Teléfono:</span>
                    <span class="contact-value">+52 4777 347474</span>
                  </div>
                  <div class="contact-item">
                    <span class="contact-label">WhatsApp:</span>
                    <span class="contact-value">+52 4777 347474</span>
                  </div>
                  <div class="contact-item">
                    <span class="contact-label">Email:</span>
                    <span class="contact-value">lacapillasl@gmail.com</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="footer">
              <p><strong>La Capilla Hotel</strong></p>
              <p>Nos vemos pronto. ¡Esperamos tu llegada!</p>
              <p style="margin-top: 15px; color: #999; font-size: 11px;">
                Este es un email automatizado. No responda directamente a este mensaje.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: attachments
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado:', result.response);
    return result;
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw error;
  }
}

/**
 * Enviar voucher por email - PAGO PARCIAL
 */
async function sendPartialPaymentEmail(booking, pdfBuffer) {
  try {
    // Calcular impuesto municipal si no existe
    const municipalTax = booking.municipalTax || (booking.subtotal * 0.04);
    const totalWithTaxes = (booking.subtotal || 0) + (booking.tax || 0) + municipalTax;
    const initialPayment = booking.initialPayment || (totalWithTaxes * 0.5);
    const secondNightPayment = totalWithTaxes - initialPayment;

    // Preparar adjuntos
    const attachments = [
      {
        filename: `Voucher_${booking.bookingId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    ];

    // Si tenemos el logo, adjuntarlo también para usar como imagen incrustada
    if (logoBuffer) {
      attachments.push({
        filename: 'logo.png',
        content: logoBuffer,
        contentType: 'image/png',
        cid: LOGO_CID // Content ID para referenciar en el HTML
      });
    }

    const mailOptions = {
      from: process.env.EMAIL_USERNAME || 'audit3674@gmail.com',
      to: booking.guestInfo.email,
      subject: `Reserva Confirmada - La Capilla Hotel | ${booking.bookingId}`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; }
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; }
            .header { 
              background: linear-gradient(135deg, #2C2C2C 0%, #1a1a1a 100%); 
              padding: 25px 30px; 
              text-align: center; 
            }
            .logo-container {
              text-align: center;
              margin: 0 auto;
            }
            .logo-img {
              max-width: 216px; /* 20% más grande */
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .fallback-text {
              color: #C9A961;
              text-align: center;
              margin: 0;
            }
            .fallback-text h1 {
              font-size: 28px;
              margin: 0;
              padding: 0;
            }
            .fallback-text p {
              font-size: 12px;
              color: #bbb;
              margin-top: 5px;
            }
            .content { padding: 30px; background: white; }
            .section { margin-bottom: 25px; }
            .section-title { 
              color: #C9A961; 
              font-size: 14px; 
              font-weight: bold; 
              text-transform: uppercase; 
              border-bottom: 2px solid #C9A961; 
              padding-bottom: 10px; 
              margin-bottom: 15px; 
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              padding: 8px 0; 
              border-bottom: 1px solid #eee; 
            }
            .booking-id { 
              background: #f0f0f0; 
              padding: 15px; 
              border-left: 4px solid #C9A961; 
              margin: 20px 0; 
              font-size: 16px; 
              font-weight: bold; 
              border-radius: 5px;
              text-align: center;
            }
            .payment-status { 
              padding: 15px; 
              border-radius: 5px; 
              margin: 15px 0; 
            }
            .payment-status.completed { 
              background: #E8F5E9; 
              border-left: 4px solid #2E7D32;
            }
            .payment-status.pending { 
              background: #FFF3E0; 
              border-left: 4px solid #FF6F00;
            }
            .status-badge { 
              display: inline-block; 
              padding: 5px 12px; 
              border-radius: 20px; 
              font-size: 12px; 
              font-weight: bold; 
            }
            .status-badge.completed { background: #4CAF50; color: white; }
            .status-badge.pending { background: #FF9800; color: white; }
            .footer { 
              background: #f0f0f0; 
              padding: 20px; 
              text-align: center; 
              font-size: 12px; 
              color: #666; 
              border-top: 1px solid #ddd; 
            }
            .divider { 
              height: 1px; 
              background: #C9A961; 
              margin: 20px 0; 
            }
            .alert { 
              background: #FFF3E0; 
              border-left: 4px solid #FF6F00; 
              padding: 15px; 
              margin: 15px 0; 
              border-radius: 5px;
            }
            .alert-title { 
              font-weight: bold; 
              color: #FF6F00; 
              margin-bottom: 8px; 
            }
            ul { margin-left: 20px; }
            li { margin: 8px 0; }
            .contact-info { 
              background: #F8F8F8; 
              padding: 15px; 
              border-radius: 5px; 
              margin-top: 20px; 
              border: 1px solid #E0E0E0;
            }
            .contact-item {
              margin-bottom: 15px;
              line-height: 1.8;
            }
            .contact-item:last-child {
              margin-bottom: 0;
            }
            .contact-label {
              font-weight: bold;
              display: block;
              margin-bottom: 2px;
              color: #333;
            }
            .contact-value {
              color: #666;
            }
            ol { margin-left: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo-container">
                ${logoBuffer ? 
                  `<img src="cid:${LOGO_CID}" alt="La Capilla Hotel" class="logo-img">` : 
                  `<div class="fallback-text">
                    <h1>LA CAPILLA</h1>
                    <p>HOTEL</p>
                  </div>`
                }
              </div>
            </div>

            <div class="content">
              <p style="font-size: 14px; margin-bottom: 20px;">
                Hola <strong>${booking.guestInfo.firstName}</strong>,
              </p>
              
              <p style="margin-bottom: 15px;">
                ¡Gracias por tu reserva en <strong>La Capilla Hotel</strong>! Tu pago del 50% inicial ha sido procesado correctamente.
              </p>

              <div class="booking-id">
                NÚMERO DE RESERVA: ${booking.bookingId}
              </div>

              <div class="section">
                <div class="section-title">Información de tu Estancia</div>
                <div class="info-row">
                  <span>Habitación:</span>
                  <strong>${booking.roomName}</strong>
                </div>
                <div class="info-row">
                  <span>Check-in:</span>
                  <strong>${new Date(booking.checkIn).toLocaleDateString('es-MX', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</strong>
                </div>
                <div class="info-row">
                  <span>Check-out:</span>
                  <strong>${new Date(booking.checkOut).toLocaleDateString('es-MX', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</strong>
                </div>
                <div class="info-row">
                  <span>Noches:</span>
                  <strong>${booking.nights}</strong>
                </div>
              </div>

              <div class="divider"></div>

              <div class="section">
                <div class="section-title">Estado de Pagos</div>
                
                <div class="payment-status completed">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-weight: bold;">Pago Inicial (50%)</span>
                    <span class="status-badge completed">COMPLETADO</span>
                  </div>
                  <div style="font-size: 13px; color: #666;">
                    Cantidad: <strong>$${initialPayment.toFixed(2)} MXN</strong>
                  </div>
                </div>

                <div class="payment-status pending">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-weight: bold;">Balance Pendiente (50%)</span>
                    <span class="status-badge pending">PENDIENTE</span>
                  </div>
                  <div style="font-size: 13px; color: #FF6F00;">
                    <strong>$${secondNightPayment.toFixed(2)} MXN</strong> a pagar en recepción
                  </div>
                </div>
                
                <div style="font-size: 11px; color: #888; margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
                  <strong>Nota:</strong> Todos los pagos incluyen IVA (16%) e Impuesto Municipal (4%)
                </div>
              </div>

              <div class="alert">
                <div class="alert-title">IMPORTANTE</div>
                <p>Se adjunta tu <strong>Voucher de Pago</strong> para presentar en recepción. Este documento prueba que has pagado el 50% inicial y muestra el monto pendiente a liquidar.</p>
              </div>

              <div class="section">
                <div class="section-title">Cómo Completar tu Pago</div>
                <ol style="margin-left: 20px;">
                  <li>Presenta este correo electrónico de forma digital en recepción</li>
                  <li>El día del check-in, realiza el pago del 50% restante</li>
                  <li>Aceptamos: efectivo, tarjeta de crédito y débito</li>
                  <li>Recibirás tu recibo final al momento del pago</li>
                </ol>
              </div>

              <div class="divider"></div>

              <div class="section">
                <div class="section-title">¿Preguntas?</div>
                <p>Estamos aquí para ayudarte:</p>
                <div class="contact-info">
                  <div class="contact-item">
                    <span class="contact-label">Teléfono:</span>
                    <span class="contact-value">+52 4777 347474</span>
                  </div>
                  <div class="contact-item">
                    <span class="contact-label">WhatsApp:</span>
                    <span class="contact-value">+52 4777 347474</span>
                  </div>
                  <div class="contact-item">
                    <span class="contact-label">Email:</span>
                    <span class="contact-value">lacapillasl@gmail.com</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="footer">
              <p><strong>La Capilla Hotel</strong></p>
              <p>Nos vemos pronto. ¡Esperamos tu llegada!</p>
              <p style="margin-top: 15px; color: #999; font-size: 11px;">
                Este es un email automatizado. No responda directamente a este mensaje.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      attachments: attachments
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email enviado:', result.response);
    return result;
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw error;
  }
}

/**
 * Enviar email apropiado según tipo de pago
 */
async function sendVoucherEmail(booking, pdfBuffer) {
  if (booking.nights === 1 || booking.initialPayment >= booking.totalPrice) {
    return sendFullPaymentEmail(booking, pdfBuffer);
  }
  return sendPartialPaymentEmail(booking, pdfBuffer);
}

/**
 * Función principal que genera PDF y envía email
 */
async function generateAndSendVoucher(booking) {
  try {
    console.log('🎫 Generando voucher PDF...');

    // Intentar enriquecer la reserva con datos de la habitación
    let roomDetails = null;
    try {
      if (booking.roomId) {
        roomDetails = await Room.findById(booking.roomId).lean();
      }
    } catch (roomErr) {
      console.warn('⚠️ No se pudo obtener info de Room para el voucher:', roomErr.message);
    }

    // Pasar un objeto plano que incluya room details para el generador
    const bookingPayload = booking.toObject ? booking.toObject() : { ...booking };
    if (roomDetails) bookingPayload.room = roomDetails;

    const pdfBuffer = await generateVoucherPDF(bookingPayload);

    console.log('📧 Enviando email con voucher...');
    await sendVoucherEmail(bookingPayload, pdfBuffer);

    console.log('✅ Voucher generado y enviado exitosamente');
    return { success: true, pdfBuffer };
  } catch (error) {
    console.error('❌ Error en generateAndSendVoucher:', error);
    throw error;
  }
}

module.exports = {
  generateVoucherPDF,
  sendVoucherEmail,
  generateAndSendVoucher,
  generateFullPaymentVoucherPDF,
  generatePartialPaymentVoucherPDF,
  sendFullPaymentEmail,
  sendPartialPaymentEmail
};
