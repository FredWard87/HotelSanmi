const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const Room = require('../models/Room');

// 🔥 Configurar transporte de email con configuración robusta
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
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  debug: true,
  logger: true
});

// 🔥 Verificar conexión al inicio con mejor logging
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Error en configuración de email:', error);
    console.error('❌ Error details:', {
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode
    });
  } else {
    console.log('✅ Servidor de email listo para enviar mensajes');
    console.log('✅ Configuración:', {
      host: 'smtp.gmail.com',
      port: 587,
      user: process.env.EMAIL_USERNAME,
      secure: false
    });
  }
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

const LOGO_CID = 'la-capilla-logo@reserva';

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

      const gold = '#C9A961';
      const charcoal = '#1A1A1A';
      const mediumGray = '#666666';
      const lightGray = '#F8F8F8';
      const successGreen = '#2E7D32';
      const successBg = '#E8F5E9';

      const pageWidth = 595.28;
      const margin = 50;
      const contentWidth = pageWidth - (margin * 2);

      const municipalTax = booking.municipalTax || (booking.subtotal * 0.04);
      const totalWithTaxes = (booking.subtotal || 0) + (booking.tax || 0) + municipalTax;

      // ENCABEZADO
      doc.rect(0, 0, pageWidth, 120).fill('white');
      doc.rect(0, 0, pageWidth, 3).fill(gold);
      
      try {
        const logoPath = path.join(__dirname, '../assets/logo.png');
        if (fs.existsSync(logoPath)) {
          const logoWidth = 324;
          const logoHeight = 108;
          const logoX = (pageWidth - logoWidth) / 2;
          const logoY = 25;
          
          doc.image(logoPath, logoX, logoY, {
            width: logoWidth,
            height: logoHeight
          });
          
          doc.fontSize(13).fillColor(gold).font('Helvetica-Bold');
          doc.text('CONFIRMACIÓN DE RESERVA', margin, logoY + logoHeight + 15, { 
            align: 'center', 
            width: contentWidth 
          });
          
          doc.fontSize(11).fillColor(mediumGray).font('Helvetica');
          doc.text('PAGO COMPLETADO', margin, logoY + logoHeight + 35, { 
            align: 'center', 
            width: contentWidth 
          });
        } else {
          doc.fontSize(13).fillColor(gold).font('Helvetica');
          doc.text('CONFIRMACIÓN DE RESERVA', margin, 35, { 
            align: 'center', 
            width: contentWidth 
          });
          
          doc.fontSize(11).fillColor(mediumGray).font('Helvetica');
          doc.text('PAGO COMPLETADO', margin, 55, { 
            align: 'center', 
            width: contentWidth 
          });
        }
      } catch (logoError) {
        doc.fontSize(13).fillColor(gold).font('Helvetica');
        doc.text('CONFIRMACIÓN DE RESERVA', margin, 35, { 
          align: 'center', 
          width: contentWidth 
        });
        
        doc.fontSize(11).fillColor(mediumGray).font('Helvetica');
        doc.text('PAGO COMPLETADO', margin, 55, { 
          align: 'center', 
          width: contentWidth 
        });
      }
      
      doc.moveDown(2.5);

      // NÚMERO DE RESERVA
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

      // INFORMACIÓN DEL HUÉSPED (1 NOCHE - NO TIENE DETALLES DE HABITACIÓN)
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

      // DETALLES DE LA ESTANCIA
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

      // DESGLOSE DEL PAGO
      const paymentBreakdownY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('DESGLOSE DEL PAGO', margin, paymentBreakdownY);
      doc.rect(margin, paymentBreakdownY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(1);

      const tableY = doc.y;
      const lineHeight = 25;
      const labelX = margin + 15;
      const valueX = margin + contentWidth - 100;

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

      // ESTADO DE PAGO
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
      
      doc.fontSize(8.5).font('Helvetica').fillColor(mediumGray);
      doc.text(`Monto total: $${totalWithTaxes.toFixed(2)} MXN`, margin + 13, cardPaymentY + 30);
      doc.text(`Fecha de pago: ${new Date(booking.createdAt).toLocaleDateString('es-MX', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      })}`, margin + 15, cardPaymentY + 45);
      
      doc.moveDown(4);

      // INFORMACIÓN IMPORTANTE
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
      
      // Verificar si hay espacio para políticas
      if (doc.y + 250 > 842) {
        doc.addPage();
        doc.y = margin;
      }

      // POLÍTICAS DEL HOTEL
      const policiesY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('POLÍTICAS DEL HOTEL', margin, policiesY);
      doc.rect(margin, policiesY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(0.8);

      const policiesBoxY = doc.y;
      const policiesBoxHeight = 230;
      doc.roundedRect(margin, policiesBoxY, contentWidth, policiesBoxHeight, 5).fill(lightGray);
      
      doc.fontSize(7.5).font('Helvetica').fillColor(charcoal);
      const policiesStartY = policiesBoxY + 12;
      const policiesLineSpacing = 9;
      
      const policies = [
        { number: '1.', text: 'EL CHECK IN DEBERÁ REALIZARSE A PARTIR DE LAS 15 HRS. (SI DESEA INGRESAR ANTES PREGUNTAR POR DISPONIBILIDAD).' },
        { number: '2.', text: 'EL CHECK OUT ES A LAS 12 HRS CON UN MÁXIMO DE TOLERANCIA DE 30 MIN. A PARTIR DE LAS 12:30 PM SE COBRARÁ UNA NOCHE EXTRA. (PREGUNTAR POR COSTO DE LATE CHECK OUT).' },
        { number: '3.', text: 'SE DEBERÁ CUBRIR EL RESTANTE DEL TOTAL DE LA RESERVACIÓN AL MOMENTO DE REALIZAR CHECK IN.' },
        { number: '4.', text: 'EL HORARIO DE USO DE LA ALBERCA ES DE 9:00 A 19:00 HRS.' },
        { number: '5.', text: 'NO SE PERMITEN INGRESAR BEBIDAS NI ALIMENTOS AL ESTABLECIMIENTO.' },
        { number: '6.', text: 'LAS ÁREAS COMUNES DEL HOTEL CUENTAN CON UN HORARIO DE 9:00 AM HRS A 20:00 PM.' },
        { number: '7.', text: 'EL HORARIO DEL RESTAURANTE:' },
        { number: '', text: '   DESAYUNO - 9 AM – 11:30 AM' },
        { number: '', text: '   COMIDA - CENA - 12:00 - 6:00 PM' },
        { number: '8.', text: 'NO RUIDO A PARTIR DE LAS 10:00 PM DENTRO LA CAPILLA HOTEL. (PASILLOS, APARATOS ELECTRÓNICOS, ÁREAS COMUNES DEL HOTEL).' },
        { number: '9.', text: 'SI HAY DAÑOS A LAS HABITACIONES Y/O INSTALACIONES SERÁ PENALIZADO DEPENDIENDO DEL DAÑO.' },
        { number: '10.', text: 'EN DADO CASO DE CANCELACIÓN DEBERÁ NOTIFICARSE CON 72 HRS DE ANTICIPACIÓN. (REEMBOLSO DEL 100% DE 5 A 7 DÍAS HÁBILES).' },
        { number: '11.', text: 'CANCELACIONES EN TEMPORADA ALTA, SE DEBERÁ REALIZAR CON UNA ANTICIPACIÓN DEL MÍNIMO DE 15 DÍAS HÁBILES ANTES DE SU FECHA DE LLEGADA.' },
        { number: '12.', text: 'CANCELACIONES MENORES A 72 HRS (15 DÍAS TEMPORADA ALTA) DE ANTICIPACIÓN SE COBRARÁ UNA PENALIZACIÓN DEL 50% O LA PRIMER NOCHE DE LA RESERVA CONFIRMADA.' },
        { number: '13.', text: 'NO SE ACEPTAN MASCOTAS EN LA CAPILLA HOTEL.' },
        { number: '14.', text: 'FAVOR DE SOLICITAR FACTURA AL MOMENTO DE REALIZAR SU RESERVACIÓN.' },
        { number: '15.', text: 'NO SE PERMITEN EL CONSUMO DE SUSTANCIAS ILEGALES O FUMAR DENTRO DE LAS HABITACIONES (PENALIZACIÓN DE $6,000.00 PESOS MEXICANOS A QUIEN SEA SORPRENDIDO), ADEMÁS QUE SE REMITIRÁ A LAS AUTORIDADES FEDERALES.' }
      ];
      
      let currentY = policiesStartY;
      policies.forEach((policy, index) => {
        const bulletX = margin + 10;
        const textX = margin + 20;
        const textWidth = contentWidth - 30;
        
        if (policy.number === '') {
          doc.fontSize(7).fillColor(mediumGray).text(policy.text, textX, currentY, {
            width: textWidth,
            indent: 10
          });
          currentY += policiesLineSpacing - 2;
        } else {
          doc.fontSize(7).fillColor(gold).font('Helvetica-Bold').text(policy.number, bulletX, currentY);
          doc.fontSize(7).fillColor(charcoal).font('Helvetica').text(policy.text, textX, currentY, {
            width: textWidth
          });
          
          const lines = Math.ceil(doc.widthOfString(policy.text, { width: textWidth }) / textWidth);
          currentY += (lines * policiesLineSpacing);
        }
      });
      
      doc.moveDown(4);

      // INFORMACIÓN DE CONTACTO
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
      
      doc.fontSize(8.5).font('Helvetica').fillColor(mediumGray);
      const contactInfoY = contactBoxY + 28;
      
      doc.text('Teléfono:', margin + 15, contactInfoY);
      doc.text('+52 4777 347474', margin + 70, contactInfoY);
      
      doc.text('WhatsApp:', margin + 220, contactInfoY);
      doc.text('+52 4777 347474', margin + 280, contactInfoY);
      
      doc.text('Email:', margin + 15, contactInfoY + 14);
      doc.text('lacapillasl@gmail.com', margin + 70, contactInfoY + 14);
      
      doc.moveDown(3.5);

      // FOOTER
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

      const gold = '#C9A961';
      const charcoal = '#1A1A1A';
      const mediumGray = '#666666';
      const lightGray = '#F8F8F8';
      const successGreen = '#2E7D32';
      const successBg = '#E8F5E9';
      const warningOrange = '#F57C00';
      const warningBg = '#FFF8E1';

      const pageWidth = 595.28;
      const margin = 50;
      const contentWidth = pageWidth - (margin * 2);

      const municipalTax = booking.municipalTax || (booking.subtotal * 0.04);
      const totalWithTaxes = (booking.subtotal || 0) + (booking.tax || 0) + municipalTax;
      const initialPayment = booking.initialPayment || (totalWithTaxes * 0.5);
      const pendingPayment = totalWithTaxes - initialPayment;

      // PRIMERA PÁGINA - HASTA DESGLOSE DE PAGO
      
      // ENCABEZADO
      doc.rect(0, 0, pageWidth, 120).fill('white');
      doc.rect(0, 0, pageWidth, 3).fill(gold);
      
      try {
        const logoPath = path.join(__dirname, '../assets/logo.png');
        if (fs.existsSync(logoPath)) {
          const logoWidth = 324;
          const logoHeight = 108;
          const logoX = (pageWidth - logoWidth) / 2;
          const logoY = 25;
          
          doc.image(logoPath, logoX, logoY, {
            width: logoWidth,
            height: logoHeight
          });
          
          doc.fontSize(13).fillColor(gold).font('Helvetica-Bold');
          doc.text('CONFIRMACIÓN DE RESERVA', margin, logoY + logoHeight + 15, { 
            align: 'center', 
            width: contentWidth 
          });
          
          doc.fontSize(11).fillColor(mediumGray).font('Helvetica');
          doc.text('PAGO PARCIAL - 50% BALANCE PENDIENTE', margin, logoY + logoHeight + 35, { 
            align: 'center', 
            width: contentWidth 
          });
        } else {
          doc.fontSize(13).fillColor(gold).font('Helvetica');
          doc.text('CONFIRMACIÓN DE RESERVA', margin, 35, { 
            align: 'center', 
            width: contentWidth 
          });
          
          doc.fontSize(11).fillColor(mediumGray).font('Helvetica');
          doc.text('PAGO PARCIAL - 50% BALANCE PENDIENTE', margin, 55, { 
            align: 'center', 
            width: contentWidth 
          });
        }
      } catch (logoError) {
        doc.fontSize(13).fillColor(gold).font('Helvetica');
        doc.text('CONFIRMACIÓN DE RESERVA', margin, 35, { 
          align: 'center', 
          width: contentWidth 
        });
        
        doc.fontSize(11).fillColor(mediumGray).font('Helvetica');
        doc.text('PAGO PARCIAL - 50% BALANCE PENDIENTE', margin, 55, { 
          align: 'center', 
          width: contentWidth 
        });
      }
      
      doc.moveDown(2.5);

      // NÚMERO DE RESERVA
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

      // DETALLES DE LA HABITACIÓN (SOLO PARA 2+ NOCHES)
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

      // INFORMACIÓN DEL HUÉSPED
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

      // DETALLES DE LA ESTANCIA
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

      // DESGLOSE DEL PAGO - MANDAR A SEGUNDA PÁGINA SI ES NECESARIO
      if (doc.y + 250 > 842) {
        doc.addPage();
        doc.y = margin;
      }

      const paymentBreakdownY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('DESGLOSE DEL PAGO', margin, paymentBreakdownY);
      doc.rect(margin, paymentBreakdownY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(1);

      const tableY = doc.y;
      const lineHeight = 25;
      const labelX = margin + 15;
      const valueX = margin + contentWidth - 100;

      doc.roundedRect(margin, tableY, contentWidth, lineHeight * 5 + 8, 5).fill(lightGray);
      
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

      // ESTADO DE PAGOS - SI NO HAY ESPACIO, MANDAR A SEGUNDA PÁGINA
      if (doc.y + 250 > 842) {
        doc.addPage();
        doc.y = margin;
      }

      const paymentStatusY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('ESTADO DE PAGOS', margin, paymentStatusY);
      doc.rect(margin, paymentStatusY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(1);

      const card1Y = doc.y;
      const cardHeight1 = 60;
      doc.roundedRect(margin, card1Y, contentWidth, cardHeight1, 8)
         .lineWidth(2).strokeColor(successGreen).fillAndStroke(successBg, successGreen);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor(successGreen);
      doc.text('PAGO INICIAL REALIZADO (50%)', margin + 15, card1Y + 14);
      
      doc.fontSize(8.5).font('Helvetica').fillColor(mediumGray);
      doc.text(`Cantidad: $${initialPayment.toFixed(2)} MXN`, margin + 15, card1Y + 28);
      doc.text(`Fecha: ${new Date(booking.createdAt).toLocaleDateString('es-MX', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      })}`, margin + 15, card1Y + 40);
      doc.text(`Método: Stripe (Tarjeta)`, margin + 250, card1Y + 40);
      
      doc.moveDown(3.5);

      const card2Y = doc.y;
      const cardHeight2 = 75;
      doc.roundedRect(margin, card2Y, contentWidth, cardHeight2, 8)
         .lineWidth(2).strokeColor(warningOrange).fillAndStroke(warningBg, warningOrange);
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor(warningOrange);
      doc.text('PENDIENTE: PAGO EN RECEPCIÓN (50%)', margin + 15, card2Y + 18);
      
      doc.fontSize(16).font('Helvetica-Bold').fillColor(warningOrange);
      doc.text(`$${pendingPayment.toFixed(2)} MXN`, margin + 15, card2Y + 38);
      
      doc.fontSize(8.5).font('Helvetica').fillColor(mediumGray);
      doc.text(`Fecha límite: ${checkOutDate}`, margin + 15, card2Y + 58);
      doc.text(`Métodos: Efectivo, Tarjeta`, margin + 250, card2Y + 58);
      
      doc.moveDown(4.5);

      // INSTRUCCIONES IMPORTANTES - SI NO HAY ESPACIO, MANDAR A SEGUNDA PÁGINA
      if (doc.y + 200 > 842) {
        doc.addPage();
        doc.y = margin;
      }

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
      
      // CREAR SEGUNDA PÁGINA PARA POLÍTICAS OBLIGATORIAMENTE
      doc.addPage();
      doc.y = margin;

      // POLÍTICAS DEL HOTEL EN SEGUNDA PÁGINA
      const policiesY = doc.y;
      doc.fontSize(11).font('Helvetica-Bold').fillColor(charcoal);
      doc.text('POLÍTICAS DEL HOTEL', margin, policiesY);
      doc.rect(margin, policiesY + 14, 70, 1.5).fill(gold);
      
      doc.moveDown(0.8);

      const policiesBoxY = doc.y;
      const policiesBoxHeight = 600; // Altura máxima para la página
      doc.roundedRect(margin, policiesBoxY, contentWidth, policiesBoxHeight, 5).fill(lightGray);
      
      doc.fontSize(7.5).font('Helvetica').fillColor(charcoal);
      const policiesStartY = policiesBoxY + 12;
      const policiesLineSpacing = 9;
      
      const policies = [
        { number: '1.', text: 'EL CHECK IN DEBERÁ REALIZARSE A PARTIR DE LAS 15 HRS. (SI DESEA INGRESAR ANTES PREGUNTAR POR DISPONIBILIDAD).' },
        { number: '2.', text: 'EL CHECK OUT ES A LAS 12 HRS CON UN MÁXIMO DE TOLERANCIA DE 30 MIN. A PARTIR DE LAS 12:30 PM SE COBRARÁ UNA NOCHE EXTRA. (PREGUNTAR POR COSTO DE LATE CHECK OUT).' },
        { number: '3.', text: 'SE DEBERÁ CUBRIR EL RESTANTE DEL TOTAL DE LA RESERVACIÓN AL MOMENTO DE REALIZAR CHECK IN.' },
        { number: '4.', text: 'EL HORARIO DE USO DE LA ALBERCA ES DE 9:00 A 19:00 HRS.' },
        { number: '5.', text: 'NO SE PERMITEN INGRESAR BEBIDAS NI ALIMENTOS AL ESTABLECIMIENTO.' },
        { number: '6.', text: 'LAS ÁREAS COMUNES DEL HOTEL CUENTAN CON UN HORARIO DE 9:00 AM HRS A 20:00 PM.' },
        { number: '7.', text: 'EL HORARIO DEL RESTAURANTE:' },
        { number: '', text: '   DESAYUNO - 9 AM – 11:30 AM' },
        { number: '', text: '   COMIDA - CENA - 12:00 - 6:00 PM' },
        { number: '8.', text: 'NO RUIDO A PARTIR DE LAS 10:00 PM DENTRO LA CAPILLA HOTEL. (PASILLOS, APARATOS ELECTRÓNICOS, ÁREAS COMUNES DEL HOTEL).' },
        { number: '9.', text: 'SI HAY DAÑOS A LAS HABITACIONES Y/O INSTALACIONES SERÁ PENALIZADO DEPENDIENDO DEL DAÑO.' },
        { number: '10.', text: 'EN DADO CASO DE CANCELACIÓN DEBERÁ NOTIFICARSE CON 72 HRS DE ANTICIPACIÓN. (REEMBOLSO DEL 100% DE 5 A 7 DÍAS HÁBILES).' },
        { number: '11.', text: 'CANCELACIONES EN TEMPORADA ALTA, SE DEBERÁ REALIZAR CON UNA ANTICIPACIÓN DEL MÍNIMO DE 15 DÍAS HÁBILES ANTES DE SU FECHA DE LLEGADA.' },
        { number: '12.', text: 'CANCELACIONES MENORES A 72 HRS (15 DÍAS TEMPORADA ALTA) DE ANTICIPACIÓN SE COBRARÁ UNA PENALIZACIÓN DEL 50% O LA PRIMER NOCHE DE LA RESERVA CONFIRMADA.' },
        { number: '13.', text: 'NO SE ACEPTAN MASCOTAS EN LA CAPILLA HOTEL.' },
        { number: '14.', text: 'FAVOR DE SOLICITAR FACTURA AL MOMENTO DE REALIZAR SU RESERVACIÓN.' },
        { number: '15.', text: 'NO SE PERMITEN EL CONSUMO DE SUSTANCIAS ILEGALES O FUMAR DENTRO DE LAS HABITACIONES (PENALIZACIÓN DE $6,000.00 PESOS MEXICANOS A QUIEN SEA SORPRENDIDO), ADEMÁS QUE SE REMITIRÁ A LAS AUTORIDADES FEDERALES.' }
      ];
      
      let currentY = policiesStartY;
      policies.forEach((policy, index) => {
        const bulletX = margin + 10;
        const textX = margin + 20;
        const textWidth = contentWidth - 30;
        
        if (policy.number === '') {
          doc.fontSize(7).fillColor(mediumGray).text(policy.text, textX, currentY, {
            width: textWidth,
            indent: 10
          });
          currentY += policiesLineSpacing - 2;
        } else {
          doc.fontSize(7).fillColor(gold).font('Helvetica-Bold').text(policy.number, bulletX, currentY);
          doc.fontSize(7).fillColor(charcoal).font('Helvetica').text(policy.text, textX, currentY, {
            width: textWidth
          });
          
          const lines = Math.ceil(doc.widthOfString(policy.text, { width: textWidth }) / textWidth);
          currentY += (lines * policiesLineSpacing);
        }
      });
      
      doc.moveDown(4);

      // INFORMACIÓN DE CONTACTO EN SEGUNDA PÁGINA
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
      
      doc.fontSize(8.5).font('Helvetica').fillColor(mediumGray);
      const contactInfoY = contactBoxY + 28;
      
      doc.text('Teléfono:', margin + 15, contactInfoY);
      doc.text('+52 4777 347474', margin + 70, contactInfoY);
      
      doc.text('WhatsApp:', margin + 220, contactInfoY);
      doc.text('+52 4777 347474', margin + 280, contactInfoY);
      
      doc.text('Email:', margin + 15, contactInfoY + 14);
      doc.text('lacapillasl@gmail.com', margin + 70, contactInfoY + 14);
      
      doc.moveDown(3.5);

      // FOOTER EN SEGUNDA PÁGINA
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

function generateVoucherPDF(booking) {
  if (booking.nights === 1 || booking.initialPayment >= booking.totalPrice) {
    return generateFullPaymentVoucherPDF(booking);
  }
  return generatePartialPaymentVoucherPDF(booking);
}

async function sendFullPaymentEmail(booking, pdfBuffer) {
  try {
    console.log(`📧 Preparando email para ${booking.guestInfo.email}...`);
    
    const municipalTax = booking.municipalTax || (booking.subtotal * 0.04);
    const totalWithTaxes = (booking.subtotal || 0) + (booking.tax || 0) + municipalTax;

    const attachments = [
      {
        filename: `Voucher_${booking.bookingId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    ];

    if (logoBuffer) {
      attachments.push({
        filename: 'logo.png',
        content: logoBuffer,
        contentType: 'image/png',
        cid: LOGO_CID
      });
    }

    const mailOptions = {
      from: `"La Capilla Hotel" <${process.env.EMAIL_USERNAME}>`,
      to: booking.guestInfo.email,
      cc: ['lacapillasl@gmail.com', 'fredyesparza08@gmail.com'],
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
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { 
              background: #ffffff;
              padding: 30px 30px 20px 30px; 
              text-align: center; 
              border-bottom: 3px solid #C9A961;
            }
            .logo-container {
              text-align: center;
              margin: 0 auto 15px auto;
            }
            .logo-img {
              max-width: 324px;
              height: auto;
              display: block;
              margin: 0 auto 10px auto;
            }
            .header-text {
              text-align: center;
              margin-top: 10px;
            }
            .header-text h1 {
              font-size: 28px;
              margin: 0 0 5px 0;
              padding: 0;
              color: #C9A961;
              font-weight: bold;
            }
            .header-text h2 {
              font-size: 18px;
              margin: 0;
              padding: 0;
              color: #333;
              font-weight: normal;
            }
            .header-text .confirmation {
              font-size: 14px;
              color: #2E7D32;
              margin-top: 10px;
              font-weight: bold;
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
              background: #f9f9f9; 
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
                  `<div class="header-text">
                    <h1>LA CAPILLA</h1>
                    <h2>HOTEL</h2>
                  </div>`
                }
              </div>
              <div class="header-text">
                <div class="confirmation">Tu reservación ha sido confirmada</div>
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
                    Monto total: <strong>${totalWithTaxes.toFixed(2)} MXN</strong>
                    <div style="font-size: 11px; color: #888; margin-top: 5px;">
                      Incluye IVA (16%) e Impuesto Municipal (4%)
                    </div>
                  </div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Tu Voucher</div>
                <p>Se adjunta tu voucher de confirmación. Presenta este documento en recepción al momento del check-in.</p>
                <p><em>**Todas las políticas del hotel están detalladas en el PDF adjunto**</em></p>
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

    console.log('📤 Enviando email...');
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado exitosamente');
    return result;
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw error;
  }
}

async function sendPartialPaymentEmail(booking, pdfBuffer) {
  try {
    console.log(`📧 Preparando email de pago parcial para ${booking.guestInfo.email}...`);
    
    const municipalTax = booking.municipalTax || (booking.subtotal * 0.04);
    const totalWithTaxes = (booking.subtotal || 0) + (booking.tax || 0) + municipalTax;
    const initialPayment = booking.initialPayment || (totalWithTaxes * 0.5);
    const pendingPayment = totalWithTaxes - initialPayment;

    const attachments = [
      {
        filename: `Voucher_${booking.bookingId}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }
    ];

    if (logoBuffer) {
      attachments.push({
        filename: 'logo.png',
        content: logoBuffer,
        contentType: 'image/png',
        cid: LOGO_CID
      });
    }

    const mailOptions = {
      from: `"La Capilla Hotel" <${process.env.EMAIL_USERNAME}>`,
      to: booking.guestInfo.email,
      cc: ['lacapillasl@gmail.com', 'fredyesparza08@gmail.com'],
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
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { 
              background: #ffffff;
              padding: 30px 30px 20px 30px; 
              text-align: center; 
              border-bottom: 3px solid #C9A961;
            }
            .logo-container {
              text-align: center;
              margin: 0 auto 15px auto;
            }
            .logo-img {
              max-width: 324px;
              height: auto;
              display: block;
              margin: 0 auto 10px auto;
            }
            .header-text {
              text-align: center;
              margin-top: 10px;
            }
            .header-text h1 {
              font-size: 28px;
              margin: 0 0 5px 0;
              padding: 0;
              color: #C9A961;
              font-weight: bold;
            }
            .header-text h2 {
              font-size: 18px;
              margin: 0;
              padding: 0;
              color: #333;
              font-weight: normal;
            }
            .header-text .confirmation {
              font-size: 14px;
              color: #2E7D32;
              margin-top: 10px;
              font-weight: bold;
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
              background: #f9f9f9; 
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
                  `<div class="header-text">
                    <h1>LA CAPILLA</h1>
                    <h2>HOTEL</h2>
                  </div>`
                }
              </div>
              <div class="header-text">
                <div class="confirmation">Tu reservación ha sido confirmada</div>
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
                    Cantidad: <strong>${initialPayment.toFixed(2)} MXN</strong>
                  </div>
                </div>

                <div class="payment-status pending">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-weight: bold;">Balance Pendiente (50%)</span>
                    <span class="status-badge pending">PENDIENTE</span>
                  </div>
                  <div style="font-size: 13px; color: #FF6F00;">
                    <strong>${pendingPayment.toFixed(2)} MXN</strong> a pagar en recepción
                  </div>
                </div>
                
                <div style="font-size: 11px; color: #888; margin-top: 10px; padding: 10px; background: #f9f9f9; border-radius: 5px;">
                  <strong>Nota:</strong> Todos los pagos incluyen IVA (16%) e Impuesto Municipal (4%)
                </div>
              </div>

              <div class="alert">
                <div class="alert-title">IMPORTANTE</div>
                <p>Se adjunta tu <strong>Voucher de Pago</strong> para presentar en recepción. Este documento prueba que has pagado el 50% inicial y muestra el monto pendiente a liquidar.</p>
                <p><em>**Todas las políticas del hotel están detalladas en el PDF adjunto**</em></p>
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

    console.log('📤 Enviando email de pago parcial...');
    const result = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email enviado exitosamente');
    return result;
  } catch (error) {
    console.error('❌ Error enviando email de pago parcial:', error);
    throw error;
  }
}

function sendVoucherEmail(booking, pdfBuffer) {
  if (booking.nights === 1 || booking.initialPayment >= booking.totalPrice) {
    return sendFullPaymentEmail(booking, pdfBuffer);
  }
  return sendPartialPaymentEmail(booking, pdfBuffer);
}

async function generateAndSendVoucher(booking) {
  try {
    console.log('🎫 Generando voucher PDF...');
    console.log('📋 Detalles de la reserva:', {
      bookingId: booking.bookingId,
      email: booking.guestInfo.email,
      nights: booking.nights,
      roomName: booking.roomName
    });

    let roomDetails = null;
    try {
      if (booking.roomId) {
        roomDetails = await Room.findById(booking.roomId).lean();
        console.log('✅ Info de Room obtenida:', roomDetails?.name);
      }
    } catch (roomErr) {
      console.warn('⚠️ No se pudo obtener info de Room para el voucher:', roomErr.message);
    }

    const bookingPayload = booking.toObject ? booking.toObject() : { ...booking };
    if (roomDetails) bookingPayload.room = roomDetails;

    const pdfBuffer = await generateVoucherPDF(bookingPayload);
    
    console.log('✅ PDF generado, tamaño:', pdfBuffer.length, 'bytes');

    console.log('📧 Enviando email con voucher...');
    await sendVoucherEmail(bookingPayload, pdfBuffer);

    console.log('✅ Voucher generado y enviado exitosamente');
    return { success: true, pdfBuffer };
  } catch (error) {
    console.error('❌ Error en generateAndSendVoucher:', error);
    console.error('❌ Error stack:', error.stack);
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
