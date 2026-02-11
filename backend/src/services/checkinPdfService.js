// services/checkinPdfService.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Genera un PDF de check-in (formato de reservación La Capilla Hotel)
 * @param {Object} booking - Datos de la reserva desde MongoDB
 * @param {String} signatureBase64 - Firma del huésped en base64
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

      // Logo path (ajusta según tu estructura)
      const logoPath = path.join(__dirname, '../assets/logo.png');
      const hasLogo = fs.existsSync(logoPath);

      // ===== ENCABEZADO =====
      doc.rect(40, 30, 532, 30).stroke();
      doc.fontSize(14).font('Helvetica-Bold')
         .text('RESERVACIÓN LA CAPILLA HOTEL', 40, 40, { align: 'center', width: 532 });

      // Logo más grande (si existe)
      if (hasLogo) {
        doc.image(logoPath, 50, 75, { width: 80 });
      }

      // Texto de bienvenida con fechas
      doc.fontSize(9).font('Helvetica')
         .text('Bienvenidos a La Capilla Hotel, es para nosotros un gusto recibirlos. Favor de verificar en este', 120, 85)
         .text('documento que los datos previamente proporcionados al momento de realizar su reserva sean los', 120, 97)
         .text('correctos.', 120, 109);

      // Fechas de ENTRADA y SALIDA
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

      // CIUDAD - Asegurarse de mostrar el valor que llega
      doc.font('Helvetica-Bold')
         .text('Ciudad: ', 50, guestY + 20);
      // Usar el valor que viene del parámetro, no de booking
      doc.font('Helvetica')
         .text(ciudad || 'No especificado', 110, guestY + 20);

      // ESTADO - Asegurarse de mostrar el valor que llega
      doc.font('Helvetica-Bold')
         .text('Estado: ', 270, guestY + 20);
      // Usar el valor que viene del parámetro, no de booking
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
      
      // Rectángulo principal de la tabla
      doc.rect(40, tableY, 532, tableHeight).stroke();
      
      // Definir columnas con anchos exactos y balanceados
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

      // ===== LÍNEAS HORIZONTALES PARA SEPARAR TÍTULOS DE SUB-ENCABEZADOS =====
      // Línea que separa títulos principales de sub-encabezados (para toda la tabla)
      const headerLine1 = tableY + 15;
      doc.moveTo(40, headerLine1).lineTo(572, headerLine1).stroke();

      // Línea horizontal que separa encabezados de contenido
      const headerSplitY = tableY + 45;
      doc.moveTo(40, headerSplitY).lineTo(572, headerSplitY).stroke();

      // Líneas verticales principales que van de arriba a abajo (completas)
      doc.moveTo(colOtroServicio, tableY).lineTo(colOtroServicio, tableY + tableHeight).stroke();
      doc.moveTo(colFechas, tableY).lineTo(colFechas, tableY + tableHeight).stroke();
      doc.moveTo(colDesayuno, tableY).lineTo(colDesayuno, tableY + tableHeight).stroke();

      // Líneas verticales de tipo de habitación - empiezan después del título
      doc.moveTo(colJunior, headerLine1).lineTo(colJunior, tableY + tableHeight).stroke();
      doc.moveTo(colMaster, headerLine1).lineTo(colMaster, tableY + tableHeight).stroke();
      doc.moveTo(colCabana, headerLine1).lineTo(colCabana, tableY + tableHeight).stroke();

      // Líneas verticales dentro de "Fechas"
      const colLlegada = colFechas + (colFechasW / 2);
      doc.moveTo(colLlegada, headerLine1).lineTo(colLlegada, tableY + tableHeight).stroke();

      // ===== SECCIÓN DE DESAYUNO =====
      const desayunoLine1 = headerLine1;

      // Línea vertical dentro de Desayuno (separa "Incluye" de "No incluye")
      const colIncluye = colDesayuno + (colDesayunoW / 2);
      doc.moveTo(colIncluye, desayunoLine1).lineTo(colIncluye, tableY + tableHeight).stroke();

      // Encabezado "Tipo de habitación" - centrado en la parte superior
      doc.fontSize(8).font('Helvetica-Bold')
         .text('Tipo de habitación', colStandard, tableY + 5, { 
           width: colOtroServicio - colStandard, 
           align: 'center' 
         });

      // Otros encabezados principales
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

      // Sub-encabezados de tipo de habitación
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

      // Sub-encabezados de Fechas
      doc.text('Llegada', colFechas, tableY + 25, { 
        width: colFechasW / 2, 
        align: 'center' 
      })
      .text('Salida', colLlegada, tableY + 25, { 
        width: colFechasW / 2, 
        align: 'center' 
      });

      // Sub-encabezados de Desayuno
      doc.fontSize(7).font('Helvetica')
         .text('Incluye', colDesayuno, tableY + 20, { 
           width: colDesayunoW / 2, 
           align: 'center' 
         })
         .text('No incluye', colIncluye, tableY + 20, { 
           width: colDesayunoW / 2, 
           align: 'center' 
         });

      // ===== CONTENIDO DE LA TABLA =====
      const contentY = headerSplitY + 5;

      // Determinar el tipo de habitación basado en booking.roomName
      const roomName = booking.roomName || '';
      let roomType = 'Junior Suite'; // valor por defecto
      
      // Mapear nombres de habitación a las opciones de la tabla
      const roomMapping = {
        'Standard': 'Standard',
        'Standard Suite': 'Standard',
        'Standard Deluxe': 'Standard',
        'Junior Suite': 'Junior Suite',
        'Master Suite': 'Master Suite',
        'Cabaña': 'Cabaña',
        'Cabaña Suite': 'Cabaña'
      };

      roomType = roomMapping[roomName] || 'Junior Suite';

      // Marcar tipo de habitación con X
      const roomTypePositions = {
        'Standard': colStandard + (colStandardW / 2) - 5,
        'Junior Suite': colJunior + (colJuniorW / 2) - 5,
        'Master Suite': colMaster + (colMasterW / 2) - 5,
        'Cabaña': colCabana + (colCabanaW / 2) - 5
      };
      
      const roomX = roomTypePositions[roomType] || roomTypePositions['Junior Suite'];
      doc.fontSize(16).font('Helvetica-Bold')
         .text('X', roomX, contentY + 15);

      // Si es Junior Suite, también mostrar el número de unidades como (07)
      if (roomType === 'Junior Suite') {
        doc.fontSize(8).font('Helvetica')
           .text('(07)', colJunior, contentY + 32, { 
             width: colJuniorW, 
             align: 'center' 
           });
      }

      // Formato de fecha en español para la tabla
      const formatDateSpanish = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('es-MX', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        });
      };

      // Fechas en la tabla - formato español
      doc.fontSize(7).font('Helvetica')
         .text(formatDateSpanish(booking.checkIn), colFechas, contentY + 20, { 
           width: colFechasW / 2, 
           align: 'center' 
         })
         .text(formatDateSpanish(booking.checkOut), colLlegada, contentY + 20, { 
           width: colFechasW / 2, 
           align: 'center' 
         });

      // ===== DESAYUNO - PROCESAR CORRECTAMENTE =====
      // Convertir a booleano explícitamente
      let hasBreakfast = Boolean(includeBreakfast === true || includeBreakfast === 'true' || includeBreakfast === 1 || includeBreakfast === '1' || (typeof includeBreakfast === 'string' && includeBreakfast.toLowerCase() === 'true'));

      // Marcar X en la columna de Desayuno según includeBreakfast
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
      
      // Checkbox de tarjeta
      doc.rect(50, paymentCheckY - 2, 12, 12).stroke();
      doc.fontSize(10).text('X', 53, paymentCheckY - 1);
      doc.fontSize(9).font('Helvetica')
         .text('Tarjeta de crédito/débito', 70, paymentCheckY);
      doc.fontSize(7).font('Helvetica-Oblique')
         .text('*No cabina como una garantía del 4% sobre el monto total', 70, paymentCheckY + 12);

      // Checkbox de efectivo
      doc.rect(250, paymentCheckY - 2, 12, 12).stroke();
      doc.fontSize(9).font('Helvetica')
         .text('Efectivo', 270, paymentCheckY);

      // Checkbox de transferencia - MARCADO si el pago está completo
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
      
      // Rectángulo principal
      doc.rect(40, importTableY, 532, importTableH).stroke();
      
      // Líneas verticales para dividir las columnas
      const colTotal = 40;
      const colTotalW = 177;
      const colAnticipo = colTotal + colTotalW;
      const colAnticipoW = 177.5;
      const colSaldo = colAnticipo + colAnticipoW;
      const colSaldoW = 177.5;

      doc.moveTo(colAnticipo, importTableY).lineTo(colAnticipo, importTableY + importTableH).stroke();
      doc.moveTo(colSaldo, importTableY).lineTo(colSaldo, importTableY + importTableH).stroke();

      // Línea horizontal en medio
      const importMidY = importTableY + 30;
      doc.moveTo(40, importMidY).lineTo(572, importMidY).stroke();

      // Encabezados
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

      // Valores
      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', { 
          style: 'currency', 
          currency: 'MXN' 
        }).format(amount || 0);
      };

      doc.fontSize(12).font('Helvetica-Bold')
         .text(formatCurrency(booking.totalPrice || 0), colTotal, importMidY + 12, { 
           width: colTotalW, 
           align: 'center' 
         });

      // Si el pago está completo, mostrar valores, sino guiones
      const isPaymentComplete = booking.paymentStatus === 'completed' || booking.secondNightNotePaid;
      if (isPaymentComplete) {
        doc.fontSize(12)
           .text('-', colAnticipo, importMidY + 12, { 
             width: colAnticipoW, 
             align: 'center' 
           })
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
           .text('-', colAnticipo, importMidY + 12, { 
             width: colAnticipoW, 
             align: 'center' 
           })
           .text('-', colSaldo, importMidY + 12, { 
             width: colSaldoW, 
             align: 'center' 
           });
      }

      // ===== FIRMA DEL HUÉSPED =====
      const signatureY = importTableY + importTableH + 25;
      const signatureBoxH = 130;
      const signatureBoxW = 394;
      doc.rect(40, signatureY, signatureBoxW, signatureBoxH).stroke();

      doc.fontSize(11).font('Helvetica-Bold')
         .text('FIRMA DEL HUÉSPED', 40, signatureY + 8, { 
           align: 'center', 
           width: signatureBoxW 
         });

      // Agregar firma si existe
      if (signatureBase64) {
        try {
          // Remover el prefijo data:image/png;base64, si existe
          const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, '');
          const signatureBuffer = Buffer.from(base64Data, 'base64');
          
          doc.image(signatureBuffer, 60, signatureY + 30, { 
            width: 354, 
            height: 50,
            align: 'center'
          });
        } catch (err) {
          doc.fontSize(9).font('Helvetica-Oblique')
             .text('(Firma no disponible)', 60, signatureY + 50, { 
               align: 'center', 
               width: 354 
             });
        }
      }

      // Línea para la firma
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

      // ===== PIE DE PÁGINA =====
      const footerY = signatureY + signatureBoxH + 10;
      const footerH = 75;
      doc.rect(40, footerY, 532, footerH).stroke();

      // Logo en pie de página
      if (hasLogo) {
        doc.image(logoPath, 50, footerY + 8, { width: 70 });
      }

      doc.fontSize(10).font('Helvetica-Bold')
         .text('LA CAPILLA HOTEL', 130, footerY + 10, { 
           align: 'center', 
           width: 370 
         });

      doc.fontSize(8).font('Helvetica')
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

      // Finalizar el PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateCheckinPDF
};
