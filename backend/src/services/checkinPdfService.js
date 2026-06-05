// services/checkinPdfService.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Genera un PDF de check-in de 3 páginas:
 * Página 1: Formato de reservación (check-in) CON firma del huésped
 * Página 2: Políticas del hotel parte 1 (SIN firma)
 * Página 3: Políticas del hotel parte 2 (SIN firma)
 *
 * @param {Object} booking - Datos de la reserva desde MongoDB
 * @param {String} signatureBase64 - Firma del check-in (solo página 1) en base64
 * @param {String} ciudad - Ciudad del huésped
 * @param {String} estado - Estado del huésped
 * @param {Boolean} includeBreakfast - Si incluye desayuno
 * @returns {Promise<Buffer>} - Buffer del PDF generado
 */
async function generateCheckinPDF(booking, signatureBase64, ciudad, estado, includeBreakfast) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 40, bottom: 40, left: 50, right: 50 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const logoPath = path.join(__dirname, '../assets/logo.png');
      const hasLogo = fs.existsSync(logoPath);

      // =====================================================================
      // ======================== PÁGINA 1: CHECK-IN =========================
      // =====================================================================

      // ===== ENCABEZADO =====
      doc.rect(40, 30, 532, 30).stroke();
      doc.fontSize(14).font('Helvetica-Bold')
         .text('RESERVACIÓN LA CAPILLA HOTEL', 40, 40, { align: 'center', width: 532 });

      if (hasLogo) {
        doc.image(logoPath, 50, 75, { width: 80 });
      }

      doc.fontSize(9).font('Helvetica')
         .text('Bienvenidos a La Capilla Hotel, es para nosotros un gusto recibirlos. Favor de verificar en este', 120, 85)
         .text('documento que los datos previamente proporcionados al momento de realizar su reserva sean los', 120, 97)
         .text('correctos.', 120, 109);

      const formatDateFull = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      };

      doc.fontSize(9).font('Helvetica-Bold')
         .text('ENTRADA: ', 120, 125);
      doc.font('Helvetica')
         .text(formatDateFull(booking.checkIn), 170, 125);

      doc.font('Helvetica-Bold')
         .text('SALIDA: ', 370, 125);
      doc.font('Helvetica')
         .text(formatDateFull(booking.checkOut), 415, 125);

      // Datos del huésped
      const guestY = 150;
      doc.fontSize(10).font('Helvetica-Bold')
         .text('Nombre: ', 50, guestY);
      const guestFirstName = booking.guestInfo?.firstName || '';
      const guestLastName = booking.guestInfo?.lastName || '';
      doc.font('Helvetica')
         .text(`${guestFirstName} ${guestLastName}`, 110, guestY);

      doc.font('Helvetica-Bold')
         .text('Ciudad: ', 50, guestY + 20);
      doc.font('Helvetica')
         .text(ciudad || 'No especificado', 110, guestY + 20);

      doc.font('Helvetica-Bold')
         .text('Estado: ', 270, guestY + 20);
      doc.font('Helvetica')
         .text(estado || 'No especificado', 320, guestY + 20);

      doc.font('Helvetica-Bold')
         .text('Tel: ', 440, guestY + 20);
      doc.font('Helvetica')
         .text(booking.guestInfo?.phone || 'No especificado', 465, guestY + 20);

      doc.font('Helvetica-Bold')
         .text('Correo electrónico (opcional): ', 50, guestY + 40);
      doc.font('Helvetica')
         .text(booking.guestInfo?.email || 'No especificado', 205, guestY + 40);

      // ===== TABLA DE HABITACIONES =====
      const tableY = 235;
      const tableHeight = 90;

      doc.rect(40, tableY, 532, tableHeight).stroke();

      const colStandard = 40;
      const colStandardW = 50;
      const colJunior = colStandard + colStandardW;
      const colJuniorW = 50;
      const colMaster = colJunior + colJuniorW;
      const colMasterW = 50;
      const colCabana = colMaster + colMasterW;
      const colCabanaW = 50;
      const colOtroServicio = colCabana + colCabanaW;
      const colOtroServicioW = 72;
      const colFechas = colOtroServicio + colOtroServicioW;
      const colFechasW = 110;
      const colDesayuno = colFechas + colFechasW;
      const colDesayunoW = 100;

      const headerLine1 = tableY + 15;
      doc.moveTo(40, headerLine1).lineTo(572, headerLine1).stroke();

      const headerSplitY = tableY + 45;
      doc.moveTo(40, headerSplitY).lineTo(572, headerSplitY).stroke();

      doc.moveTo(colOtroServicio, tableY).lineTo(colOtroServicio, tableY + tableHeight).stroke();
      doc.moveTo(colFechas, tableY).lineTo(colFechas, tableY + tableHeight).stroke();
      doc.moveTo(colDesayuno, tableY).lineTo(colDesayuno, tableY + tableHeight).stroke();

      doc.moveTo(colJunior, headerLine1).lineTo(colJunior, tableY + tableHeight).stroke();
      doc.moveTo(colMaster, headerLine1).lineTo(colMaster, tableY + tableHeight).stroke();
      doc.moveTo(colCabana, headerLine1).lineTo(colCabana, tableY + tableHeight).stroke();

      const colLlegada = colFechas + (colFechasW / 2);
      doc.moveTo(colLlegada, headerLine1).lineTo(colLlegada, tableY + tableHeight).stroke();

      const desayunoLine1 = headerLine1;
      const colIncluye = colDesayuno + (colDesayunoW / 2);
      doc.moveTo(colIncluye, desayunoLine1).lineTo(colIncluye, tableY + tableHeight).stroke();

      doc.fontSize(8).font('Helvetica-Bold')
         .text('Tipo de habitación', colStandard, tableY + 5, {
           width: colOtroServicio - colStandard,
           align: 'center'
         });

      doc.text('Otro servicio', colOtroServicio, tableY + 22, {
           width: colOtroServicioW,
           align: 'center'
         })
         .text('Fechas', colFechas, tableY + 5, {
           width: colFechasW,
           align: 'center'
         })
         .text('Desayuno', colDesayuno, tableY + 5, {
           width: colDesayunoW,
           align: 'center'
         });

      doc.fontSize(7).font('Helvetica')
         .text('Standard', colStandard, tableY + 22, {
           width: colStandardW,
           align: 'center'
         })
         .text('Junior\nSuite', colJunior, tableY + 20, {
           width: colJuniorW,
           align: 'center'
         })
         .text('Master\nSuite', colMaster, tableY + 20, {
           width: colMasterW,
           align: 'center'
         })
         .text('Cabaña', colCabana, tableY + 22, {
           width: colCabanaW,
           align: 'center'
         });

      doc.text('Llegada', colFechas, tableY + 25, {
        width: colFechasW / 2,
        align: 'center'
      })
      .text('Salida', colLlegada, tableY + 25, {
        width: colFechasW / 2,
        align: 'center'
      });

      doc.fontSize(7).font('Helvetica')
         .text('Incluye', colDesayuno, tableY + 20, {
           width: colDesayunoW / 2,
           align: 'center'
         })
         .text('No incluye', colIncluye, tableY + 20, {
           width: colDesayunoW / 2,
           align: 'center'
         });

      const contentY = headerSplitY + 5;

       // Determine room type from the populated room object
       const roomTypeEnum = booking.roomId?.type || 'STANDARD'; // Default to STANDARD if not available
       let roomTypeDisplay;
       switch (roomTypeEnum) {
         case 'STANDARD':
           roomTypeDisplay = 'Standard';
           break;
         case 'SUITE':
           roomTypeDisplay = 'Junior Suite';
           break;
         case 'MASTER':
           roomTypeDisplay = 'Master Suite';
           break;
         default:
           roomTypeDisplay = 'Standard'; // fallback
       }

       const roomTypePositions = {
         'Standard': colStandard + (colStandardW / 2) - 5,
         'Junior Suite': colJunior + (colJuniorW / 2) - 5,
         'Master Suite': colMaster + (colMasterW / 2) - 5,
         'Cabaña': colCabana + (colCabanaW / 2) - 5
       };

       const roomX = roomTypePositions[roomTypeDisplay] || roomTypePositions['Standard'];
       doc.fontSize(16).font('Helvetica-Bold')
          .text('X', roomX, contentY + 15);



      const formatDateSpanish = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('es-MX', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      };

      doc.fontSize(7).font('Helvetica')
         .text(formatDateSpanish(booking.checkIn), colFechas, contentY + 20, {
           width: colFechasW / 2,
           align: 'center'
         })
         .text(formatDateSpanish(booking.checkOut), colLlegada, contentY + 20, {
           width: colFechasW / 2,
           align: 'center'
         });

      let hasBreakfast = Boolean(
        includeBreakfast === true ||
        includeBreakfast === 'true' ||
        includeBreakfast === 1 ||
        includeBreakfast === '1' ||
        (typeof includeBreakfast === 'string' && includeBreakfast.toLowerCase() === 'true')
      );

      if (hasBreakfast) {
        doc.fontSize(16).font('Helvetica-Bold')
           .text('X', colDesayuno + (colDesayunoW / 4) - 8, contentY + 18);
      } else {
        doc.fontSize(16).font('Helvetica-Bold')
           .text('X', colIncluye + (colDesayunoW / 4) - 8, contentY + 18);
      }

      // ===== FORMA DE PAGO =====
      const paymentY = tableY + tableHeight + 25;
      doc.fontSize(10).font('Helvetica-Bold')
         .text('FORMA DE PAGO:', 50, paymentY);

      const paymentCheckY = paymentY + 25;

      doc.rect(50, paymentCheckY - 2, 12, 12).stroke();
      doc.fontSize(10).text('X', 53, paymentCheckY - 1);
      doc.fontSize(9).font('Helvetica')
         .text('Tarjeta de crédito/débito', 70, paymentCheckY);
      doc.fontSize(7).font('Helvetica-Oblique')
         .text('*No cabina como una garantía del 4% sobre el monto total', 70, paymentCheckY + 12);

      doc.rect(250, paymentCheckY - 2, 12, 12).stroke();
      doc.fontSize(9).font('Helvetica')
         .text('Efectivo', 270, paymentCheckY);

      doc.rect(400, paymentCheckY - 2, 12, 12).stroke();
      if (booking.paymentStatus === 'completed' || booking.secondNightNotePaid) {
        doc.fontSize(10).text('X', 403, paymentCheckY - 1);
      }
      doc.fontSize(9).font('Helvetica')
         .text('Transferencia', 420, paymentCheckY);

      // ===== DATOS DE IMPORTE =====
      const importY = paymentCheckY + 45;
      doc.fontSize(10).font('Helvetica-Bold')
         .text('Datos de importe', 40, importY, { align: 'center', width: 532 });

      const importTableY = importY + 25;
      const importTableH = 60;

      doc.rect(40, importTableY, 532, importTableH).stroke();

      const colTotal = 40;
      const colTotalW = 177;
      const colAnticipo = colTotal + colTotalW;
      const colAnticipoW = 177.5;
      const colSaldo = colAnticipo + colAnticipoW;
      const colSaldoW = 177.5;

      doc.moveTo(colAnticipo, importTableY).lineTo(colAnticipo, importTableY + importTableH).stroke();
      doc.moveTo(colSaldo, importTableY).lineTo(colSaldo, importTableY + importTableH).stroke();

      const importMidY = importTableY + 30;
      doc.moveTo(40, importMidY).lineTo(572, importMidY).stroke();

      doc.fontSize(9).font('Helvetica-Bold')
         .text('Costo total de los servicios contratados', colTotal, importTableY + 10, {
           width: colTotalW,
           align: 'center'
         })
         .text('Anticipo', colAnticipo, importTableY + 10, {
           width: colAnticipoW,
           align: 'center'
         })
         .text('Saldo pendiente', colSaldo, importTableY + 10, {
           width: colSaldoW,
           align: 'center'
         });

      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN'
        }).format(amount || 0);
      };

       const totalAmount = Number(booking.totalPrice || 0);
       // initialPayment represents the advance/deposit paid before check-in
       // advancePayment (new field) would be used for payments made separately, but for now use initialPayment
       const anticipoAmount = Number(booking.advancePayment || booking.initialPayment || 0);
       const pendingAmount = Math.max(0, totalAmount - anticipoAmount);
      const isPaymentComplete = booking.paymentStatus === 'completed' || booking.secondNightNotePaid;

      doc.fontSize(12).font('Helvetica-Bold')
         .text(formatCurrency(totalAmount), colTotal, importMidY + 12, {
           width: colTotalW,
           align: 'center'
         });

      doc.fontSize(12).font('Helvetica-Bold')
         .text(formatCurrency(anticipoAmount), colAnticipo, importMidY + 12, {
           width: colAnticipoW,
           align: 'center'
         });

      if (isPaymentComplete) {
        doc.fontSize(12)
           .text('PAGADO', colSaldo, importMidY + 5, {
             width: colSaldoW,
             align: 'center'
           })
           .fontSize(10)
           .text('-', colSaldo, importMidY + 22, {
             width: colSaldoW,
             align: 'center'
           });
      } else {
        doc.fontSize(12)
           .text(formatCurrency(pendingAmount), colSaldo, importMidY + 12, {
             width: colSaldoW,
             align: 'center'
           });
      }

      // ===== FIRMA DEL HUÉSPED (SOLO EN PÁGINA 1 - CHECK-IN) =====
      const signatureY = importTableY + importTableH + 25;
      const signatureBoxH = 130;
      const signatureBoxW = 394;
      doc.rect(40, signatureY, signatureBoxW, signatureBoxH).stroke();

      doc.fontSize(11).font('Helvetica-Bold')
         .text('FIRMA DEL HUÉSPED', 40, signatureY + 8, {
           align: 'center',
           width: signatureBoxW
         });

      if (signatureBase64) {
        try {
          const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, '');
          const signatureBuffer = Buffer.from(base64Data, 'base64');
          doc.image(signatureBuffer, 60, signatureY + 30, {
            width: 354,
            height: 50,
            align: 'center'
          });
        } catch (err) {
          console.error('Error al cargar firma:', err);
          doc.fontSize(9).font('Helvetica-Oblique')
             .text('(Firma no disponible)', 60, signatureY + 50, {
               align: 'center',
               width: 354
             });
        }
      } else {
        doc.fontSize(9).font('Helvetica-Oblique')
           .text('(Sin firma)', 60, signatureY + 50, {
             align: 'center',
             width: 354
           });
      }

      doc.moveTo(60, signatureY + 88).lineTo(414, signatureY + 88).stroke();

      doc.fontSize(9).font('Helvetica-Bold')
         .text('En pleno uso de mis facultades, libre y voluntariamente, declaro que', 40, signatureY + 95, {
           width: signatureBoxW,
           align: 'center'
         })
         .text('he sido debidamente informado acerca de mis servicios contratados', 40, signatureY + 107, {
           width: signatureBoxW,
           align: 'center'
         });

      doc.fontSize(8).font('Helvetica-Bold')
         .text('y de los términos en La Capilla Hotel.', 40, signatureY + 119, {
           width: signatureBoxW,
           align: 'center'
         });

      // ===== PIE DE PÁGINA PÁGINA 1 =====
      const footerY = signatureY + signatureBoxH + 10;
      const footerH = 75;
      doc.rect(40, footerY, 532, footerH).stroke();

      if (hasLogo) {
        doc.image(logoPath, 50, footerY + 8, { width: 70 });
      }

      doc.fontSize(9).font('Helvetica-Bold')
         .text('LA CAPILLA HOTEL', 130, footerY + 10, {
           align: 'center',
           width: 370
         });

      doc.fontSize(7).font('Helvetica')
         .text('Dolores Hidalgo – San Miguel de Allende 378/4, El Durazno Gto. Ciudad de', 130, footerY + 24, {
           align: 'center',
           width: 370
         })
         .text('los 80, a 2 horas de la Ciudad de México y 45 minutos de San Miguel de Allende.', 130, footerY + 36, {
           align: 'center',
           width: 370
         })
         .text('Cel. 413 117 00 99 | Email: reservaciones@hotelacapilla.com | www.hotelacapilla.com', 130, footerY + 52, {
           align: 'center',
           width: 370
         });

      // =====================================================================
      // ================== PÁGINA 2: POLÍTICAS PARTE 1 =====================
      // =====================================================================
      doc.addPage();

      _drawPoliciesPage1(doc, booking, hasLogo, logoPath, formatDateFull, guestFirstName, guestLastName);

      // =====================================================================
      // ================== PÁGINA 3: POLÍTICAS PARTE 2 =====================
      // =====================================================================
      doc.addPage();

      _drawPoliciesPage2(doc, booking, hasLogo, logoPath, formatDateFull, guestFirstName, guestLastName, signatureBase64);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// =====================================================================
// ========== FUNCIÓN: POLÍTICAS PÁGINA 1 (puntos 1 al 7) =============
// =====================================================================
function _drawPoliciesPage1(doc, booking, hasLogo, logoPath, formatDateFull, guestFirstName, guestLastName) {
  const pageWidth = 532;
  const leftMargin = 40;

  // Encabezado
  doc.rect(leftMargin, 30, pageWidth, 30).stroke();
  doc.fontSize(13).font('Helvetica-Bold')
     .text('POLÍTICAS LA CAPILLA HOTEL', leftMargin, 40, { align: 'center', width: pageWidth });

  // Logo + introducción
  if (hasLogo) {
    doc.image(logoPath, leftMargin + 10, 70, { width: 60 });
  }

  doc.fontSize(8).font('Helvetica')
     .text(
       'Un gusto saludarte y esperamos que te encuentres muy bien, gracias por escogernos como destino para realizar tu viaje, esperamos con ansias tu llegada, asimismo te adjuntamos tu confirmación de reserva y políticas del establecimiento, si hay algún error en la misma, estamos a tus órdenes para aclarar cualquier inconveniente.',
       leftMargin + 75, 75,
       { width: pageWidth - 75, align: 'justify' }
     );

  let currentY = 130;

  // Función auxiliar para sección
  const drawSection = (title, items, y) => {
    doc.fontSize(9).font('Helvetica-Bold')
       .text(title, leftMargin, y);
    let lineY = y + 14;
    items.forEach(item => {
      if (item.sub) {
        doc.fontSize(8).font('Helvetica')
           .text(`       ${item.text}`, leftMargin, lineY, { width: pageWidth });
      } else {
        doc.fontSize(8).font('Helvetica-Bold')
           .text(`   ${item.text}`, leftMargin, lineY, { width: pageWidth });
      }
      lineY += 12;
    });
    return lineY + 4;
  };

  // 1. Check-in / Check-out
  currentY = drawSection('1- Check-in / Check-out', [
    { text: '• El check-in es a partir de las 15:00 hrs (sujeto a disponibilidad en caso de ingreso anticipado).', sub: true },
    { text: '• El check-out es a las 12:00 hrs.', sub: true },
    { text: '• Salida tardía:', sub: false },
    { text: '• De 12:30 a 17:00 hrs: $500.00 MXN por persona.', sub: true },
    { text: '• A partir de las 17:01 hrs: se cobrará una noche completa.', sub: true },
    { text: '• Todo late check-out está sujeto a disponibilidad.', sub: true },
  ], currentY);

  // 2. Pagos y cancelaciones
  currentY = drawSection('2- Pagos y cancelaciones', [
    { text: '• El total de la reservación deberá liquidarse al momento del check-in.', sub: true },
    { text: '• Cancelaciones con al menos 48 horas de anticipación reciben reembolso del 100% (3 a 5 días hábiles).', sub: true },
    { text: '• Cancelaciones con menos de 48 horas generan una penalización del 50% del total de la reservación.', sub: true },
    { text: '• En temporada alta (Semana Santa, días festivos y fechas especiales), se requiere aviso con al menos 15 días hábiles.', sub: true },
    { text: '• Las políticas pueden variar según temporada y serán confirmadas al momento de la reservación.', sub: true },
  ], currentY);

  // 3. Conducta del huésped
  currentY = drawSection('3- Conducta del huésped', [
    { text: '• Las habitaciones y espacios cerrados son 100% libres de humo.', sub: true },
    { text: '• No se permite ruido excesivo a partir de las 22:00 hrs en habitaciones, pasillos y áreas comunes.', sub: true },
    { text: '• No se permite el uso de bocinas o equipos de audio a alto volumen dentro de las habitaciones.', sub: true },
    { text: '• No se permite realizar reuniones o fiestas no autorizadas dentro del hotel.', sub: true },
    { text: '• No se permite el consumo de sustancias ilegales dentro de las instalaciones.', sub: true },
    { text: '• En caso de incumplimiento, el hotel podrá cancelar la estancia sin derecho a reembolso y solicitar el retiro inmediato del huésped.', sub: true },
  ], currentY);

  // 4. Derecho de admisión
  currentY = drawSection('4- Derecho de admisión y permanencia', [
    { text: '• La Capilla Hotel se reserva el derecho de admisión y permanencia.', sub: true },
    { text: '• En caso de conductas agresivas, faltas de respeto al personal, daños a instalaciones o afectación a otros huéspedes,', sub: true },
    { text: '  el hotel podrá cancelar la estancia sin reembolso, solicitar el retiro inmediato y aplicar cargos correspondientes.', sub: true },
  ], currentY);

  // 5. Responsabilidad por daños
  currentY = drawSection('5- Responsabilidad por daños', [
    { text: '• Cualquier daño causado a habitaciones, mobiliario, jardín, piscina, jacuzzi o instalaciones será responsabilidad del titular.', sub: true },
    { text: '• El huésped se compromete a cubrir el costo total de reparación o reposición.', sub: true },
  ], currentY);

  // 6. Autorización de cargo a tarjeta
  currentY = drawSection('6- Autorización de cargo a tarjeta', [
    { text: '• El huésped autoriza expresamente a La Capilla Hotel a realizar cargos a la tarjeta proporcionada como garantía en caso de:', sub: true },
    { text: '  daños a instalaciones, servicios adicionales no liquidados, penalizaciones por incumplimiento o limpieza profunda o especializada.', sub: true },
  ], currentY);

  // 7. Uso de instalaciones
  currentY = drawSection('7- Uso de instalaciones', [
    { text: '• El uso de piscina y jacuzzi es bajo responsabilidad del huésped.', sub: true },
    { text: '• No se permite arrojar objetos, alimentos, bebidas o cualquier elemento que dañe los sistemas o instalaciones.', sub: true },
    { text: '• El hotel podrá restringir el uso de estas áreas en caso de mal uso.', sub: true },
  ], currentY);

  currentY += 8;

  // Declaración final (SIN FIRMA)
  doc.fontSize(8).font('Helvetica')
     .text(
       'Declaro haber leído y aceptado las políticas de estancia de La Capilla Hotel, así como mi responsabilidad sobre el cumplimiento de las mismas.',
       leftMargin, currentY,
       { width: pageWidth, align: 'justify' }
     );

  // ===== PIE DE PÁGINA PÁGINA 2 =====
  const footerY = currentY + 25;
  const footerH = 65;
  const remainingSpace = 792 - 40 - footerY;

  if (remainingSpace >= footerH) {
    doc.rect(leftMargin, footerY, pageWidth, footerH).stroke();

    if (hasLogo) {
      doc.image(logoPath, leftMargin + 10, footerY + 8, { width: 60 });
    }

    doc.fontSize(9).font('Helvetica-Bold')
       .text('LA CAPILLA HOTEL', leftMargin + 75, footerY + 8, {
         align: 'center',
         width: pageWidth - 75
       });

    doc.fontSize(7).font('Helvetica')
       .text('Dolores Hidalgo – San Miguel de Allende 378/4, El Durazno Gto. Ciudad de', leftMargin + 75, footerY + 22, {
         align: 'center',
         width: pageWidth - 75
       })
       .text('los 80, a 2 horas de la Ciudad de México y 45 minutos de San Miguel de Allende.', leftMargin + 75, footerY + 32, {
         align: 'center',
         width: pageWidth - 75
       })
       .text('Cel. 413 117 00 99 | Email: reservaciones@hotelacapilla.com | www.hotelacapilla.com', leftMargin + 75, footerY + 44, {
         align: 'center',
         width: pageWidth - 75
       });
  }
}

// =====================================================================
// ========== FUNCIÓN: POLÍTICAS PÁGINA 2 (puntos 8 al 13) ============
// =====================================================================
function _drawPoliciesPage2(doc, booking, hasLogo, logoPath, formatDateFull, guestFirstName, guestLastName, signatureBase64) {
  const pageWidth = 532;
  const leftMargin = 40;

  // Encabezado
  doc.rect(leftMargin, 30, pageWidth, 30).stroke();
  doc.fontSize(13).font('Helvetica-Bold')
     .text('POLÍTICAS LA CAPILLA HOTEL (Continuación)', leftMargin, 40, { align: 'center', width: pageWidth });

  let currentY = 80;

  const drawSection = (title, items, y) => {
    doc.fontSize(9).font('Helvetica-Bold')
       .text(title, leftMargin, y);
    let lineY = y + 14;
    items.forEach(item => {
      if (item.sub) {
        doc.fontSize(8).font('Helvetica')
           .text(`       ${item.text}`, leftMargin, lineY, { width: pageWidth });
      } else {
        doc.fontSize(8).font('Helvetica-Bold')
           .text(`   ${item.text}`, leftMargin, lineY, { width: pageWidth });
      }
      lineY += 12;
    });
    return lineY + 4;
  };

  // 8. Alimentos y bebidas
  currentY = drawSection('8- Alimentos y bebidas externas', [
    { text: '• No se permite el ingreso de alimentos o bebidas externas, salvo autorización expresa del hotel.', sub: true },
    { text: '• El incumplimiento podrá generar cargos adicionales o cancelación de la estancia.', sub: true },
  ], currentY);

  // 9. Capacidad
  currentY = drawSection('9- Capacidad y personas adicionales', [
    { text: '• Se deberá respetar la capacidad máxima de cada habitación.', sub: true },
    { text: '• Se cobrará $500.00 MXN por persona adicional por la noche.', sub: true },
  ], currentY);

  // 10. Mascotas
  currentY = drawSection('10- Mascotas', [
    { text: '• No se aceptan mascotas dentro de las instalaciones.', sub: true },
  ], currentY);

  // 11. Responsabilidad sobre pertenencias
  currentY = drawSection('11- Responsabilidad sobre pertenencias', [
    { text: '• La Capilla Hotel no se hace responsable por robo, pérdida o daño de pertenencias personales.', sub: true },
    { text: '• El hotel no se hace responsable por daños a vehículos dentro del estacionamiento.', sub: true },
    { text: '• La Capilla Hotel no se hace responsable por objetos olvidados, extraviados o dejados dentro de las instalaciones o habitaciones.', sub: true },
    { text: '• En caso de localizar algún objeto, el hotel podrá resguardarlo por un periodo máximo de 15 días naturales.', sub: true },
    { text: '  Transcurrido dicho plazo, el hotel podrá disponer de los objetos sin responsabilidad alguna.', sub: true },
    { text: '• El envío o recuperación de dichos objetos será responsabilidad del huésped, incluyendo costos de mensajería o traslado.', sub: true },
  ], currentY);

  // 12. Menores de edad
  currentY = drawSection('12- Menores de edad', [
    { text: '• Los menores de edad deberán estar supervisados en todo momento por un adulto.', sub: true },
    { text: '• El hotel no se hace responsable por accidentes derivados de falta de supervisión.', sub: true },
  ], currentY);

  // 13. Servicios adicionales
  currentY = drawSection('13- Servicios adicionales', [
    { text: '• Los servicios adicionales requieren supervisión previa.', sub: true },
    { text: '• Cancelaciones con menos de 2 horas de anticipación generarán cargo completo.', sub: true },
  ], currentY);

  currentY += 8;

  // ===== FIRMA DEL HUÉSPED EN PÁGINA 3 =====
  const signatureY = currentY + 10;
  const signatureBoxH = 110;
  const signatureBoxW = 394;
  
  doc.rect(leftMargin, signatureY, signatureBoxW, signatureBoxH).stroke();

  doc.fontSize(10).font('Helvetica-Bold')
     .text('FIRMA FINAL DEL HUÉSPED', leftMargin, signatureY + 5, {
       align: 'center',
       width: signatureBoxW
     });

  if (signatureBase64) {
    try {
      const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, '');
      const signatureBuffer = Buffer.from(base64Data, 'base64');
      doc.image(signatureBuffer, leftMargin + 20, signatureY + 20, {
        width: signatureBoxW - 40,
        height: 45,
        align: 'center'
      });
    } catch (err) {
      console.error('Error al cargar firma en página 3:', err);
      doc.fontSize(9).font('Helvetica-Oblique')
         .text('(Firma no disponible)', leftMargin + 20, signatureY + 40, {
           align: 'center',
           width: signatureBoxW - 40
         });
    }
  } else {
    doc.fontSize(9).font('Helvetica-Oblique')
       .text('(Sin firma)', leftMargin + 20, signatureY + 40, {
         align: 'center',
         width: signatureBoxW - 40
       });
  }

  doc.moveTo(leftMargin + 20, signatureY + 70).lineTo(leftMargin + signatureBoxW - 20, signatureY + 70).stroke();

  doc.fontSize(8).font('Helvetica')
     .text('Firma del huésped', leftMargin + 20, signatureY + 72, {
       align: 'center',
       width: signatureBoxW - 40
     });

  // ===== PIE DE PÁGINA PÁGINA 3 =====
  const footerY = signatureY + signatureBoxH + 10;
  const footerH = 65;
  const remainingSpace = 792 - 40 - footerY;

  if (remainingSpace >= footerH) {
    doc.rect(leftMargin, footerY, pageWidth, footerH).stroke();

    if (hasLogo) {
      doc.image(logoPath, leftMargin + 10, footerY + 8, { width: 60 });
    }

    doc.fontSize(9).font('Helvetica-Bold')
       .text('LA CAPILLA HOTEL', leftMargin + 75, footerY + 8, {
         align: 'center',
         width: pageWidth - 75
       });

    doc.fontSize(7).font('Helvetica')
       .text('Dolores Hidalgo – San Miguel de Allende 378/4, El Durazno Gto. Ciudad de', leftMargin + 75, footerY + 22, {
         align: 'center',
         width: pageWidth - 75
       })
       .text('los 80, a 2 horas de la Ciudad de México y 45 minutos de San Miguel de Allende.', leftMargin + 75, footerY + 32, {
         align: 'center',
         width: pageWidth - 75
       })
       .text('Cel. 413 117 00 99 | Email: reservaciones@hotelacapilla.com | www.hotelacapilla.com', leftMargin + 75, footerY + 44, {
         align: 'center',
         width: pageWidth - 75
       });
  }
}

module.exports = {
  generateCheckinPDF
};
