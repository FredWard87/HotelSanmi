// controllers/guestAssignmentController.js
const GuestAssignment = require('../models/GuestAssignment');
const AssignmentRoom = require('../models/AssignmentRoom');
const Room = require('../models/Room');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const ASSIGNMENT_ROOMS_SEED = require('../data/assignmentRoomsSeed');

// Configurar transporter para emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Configurar Twilio para WhatsApp
let twilioClient = null;
try {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && 
      process.env.TWILIO_PHONE_NUMBER) {
    twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio configurado para enviar mensajes de WhatsApp');
  } else {
    console.warn('⚠️ Twilio no configurado. Los mensajes de WhatsApp no se enviarán.');
  }
} catch (err) {
  console.warn('⚠️ Error configurando Twilio:', err.message);
}

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

// Generar CID único para el logo
const LOGO_CID = 'la-capilla-logo@assignment';

// Función para enviar email de asignación de habitaciones
async function sendInvitationEmail(toEmail, toName, accessUrl, eventName) {
  try {
    const attachments = [];

    if (logoBuffer) {
      attachments.push({
        filename: 'logo.png',
        content: logoBuffer,
        contentType: 'image/png',
        cid: LOGO_CID
      });
    }

    const mailOptions = {
      from: `"Hotel La Capilla" <${process.env.EMAIL_FROM || 'lacapillasl@gmail.com'}>`,
      to: toEmail,
      subject: `${eventName} - Asignación de Habitaciones`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Asignación de Habitaciones - Hotel La Capilla</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Georgia, 'Times New Roman', serif; background-color: #ffffff;">
           
          <!-- Header con logo -->
          <div style="background-color: #ffffff; padding: 30px 20px; text-align: center; border-bottom: 1px solid #d4af37;">
            ${logoBuffer ? 
              `<img src="cid:${LOGO_CID}" alt="Hotel La Capilla" style="max-width: 216px; height: auto; display: block; margin: 0 auto;">` : 
              `<h1 style="color: #000000; margin: 0; font-size: 22px; font-family: Georgia, serif;">HOTEL LA CAPILLA</h1>
               <p style="color: #000000; margin: 5px 0 0 0; font-size: 12px;">ASIGNACIÓN DE HABITACIONES</p>`
            }
          </div>
           
          <!-- Contenido principal -->
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 50px;">
             
            <!-- Saludo -->
            <p style="font-size: 16px; color: #000000; margin-bottom: 20px; font-family: Georgia, serif;">
              Estimada ${toName},
            </p>
             
            <!-- Evento -->
            <div style="border-left: 3px solid #000000; padding-left: 20px; margin: 30px 0;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #666666; text-transform: uppercase; letter-spacing: 1px;">
                Ha sido invitada a asignar los huéspedes para
              </p>
              <p style="margin: 0; font-size: 20px; color: #000000; font-weight: bold; font-style: italic;">
                ${eventName}
              </p>
            </div>
             
            <!-- Instrucciones -->
            <div style="margin: 35px 0;">
              <h3 style="color: #000000; font-size: 14px; margin-bottom: 15px; border-bottom: 1px solid #cccccc; padding-bottom: 10px; font-family: Georgia, serif;">
                Instrucciones
              </h3>
              <ol style="color: #000000; line-height: 2; padding-left: 20px; margin: 0; font-size: 14px;">
                <li>Haga clic en el botón de abajo para acceder al formulario</li>
                <li>En cada habitación, escriba el nombre del huésped</li>
                <li>Opcionalmente, agregue su número de WhatsApp</li>
                <li>Guarde los cambios cuando haya terminado</li>
              </ol>
            </div>
             
            <!-- Botón -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${accessUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 35px; text-decoration: none; font-size: 14px; font-weight: bold;">
                ACCEDER AL FORMULARIO
              </a>
            </div>
             
            <!-- Link alternativo -->
            <div style="background-color: #f5f5f5; padding: 15px; margin: 25px 0;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666666;">
                O copie y pegue este enlace en su navegador:
              </p>
              <p style="margin: 0; font-size: 12px; color: #000000; word-break: break-all; font-family: monospace;">
                ${accessUrl}
              </p>
            </div>
             
            <!-- Nota -->
            <div style="border: 1px solid #cccccc; padding: 15px; margin: 25px 0;">
              <p style="margin: 0; font-size: 12px; color: #333333;">
                <strong>Nota:</strong> Este enlace es personal y único. No lo comparta con terceros.
              </p>
            </div>
             
          </div>
           
          <!-- Footer -->
          <div style="background-color: #f5f5f5; padding: 30px 20px; text-align: center; border-top: 1px solid #cccccc;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #000000; font-weight: bold; font-family: Georgia, serif;">
              HOTEL LA CAPILLA
            </p>
            <p style="margin: 0; font-size: 12px; color: #666666;">
              lacapillasl@gmail.com | +52 4777 347474
            </p>
            <p style="margin: 15px 0 0 0; font-size: 11px; color: #999999;">
              © ${new Date().getFullYear()} Hotel La Capilla - Todos los derechos reservados
            </p>
          </div>
          
        </body>
        </html>
      `,
      text: `HOTEL LA CAPILLA

Estimada ${toName},

Ha sido invitada a asignar los huéspedes para:
${eventName}

INSTRUCCIONES:
1. Acceda al formulario usando el enlace de abajo
2. En cada habitación, escriba el nombre del huésped
3. Opcionalmente, agregue su número de WhatsApp
4. Guarde los cambios cuando haya terminado

ENLACE: ${accessUrl}

Nota: Este enlace es personal y único. No lo comparta con terceros.

--
HOTEL LA CAPILLA
lacapillasl@gmail.com
+52 4777 347474
© ${new Date().getFullYear()}`,
      attachments: attachments
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado a ${toEmail}:`, result.messageId);
    return result;
  } catch (error) {
    console.error(`❌ Error enviando email a ${toEmail}:`, error.message);
    throw error;
  }
}

// Función para obtener habitaciones desde la base de datos
async function getCasaHotelRooms() {
  return await AssignmentRoom.find({ type: 'casa_hotel', isActive: true }).sort({ order: 1 });
}

async function getBoutiqueRooms() {
  return await AssignmentRoom.find({ type: 'boutique', isActive: true }).sort({ order: 1 });
}

// ADMIN: Seed de habitaciones
exports.seedAssignmentRooms = async (req, res) => {
  try {
    const results = { created: 0, updated: 0, errors: [] };

    for (const roomData of ASSIGNMENT_ROOMS_SEED) {
      try {
        const existing = await AssignmentRoom.findOne({ roomId: roomData.roomId });
        
        if (existing) {
          await AssignmentRoom.findByIdAndUpdate(existing._id, roomData);
          results.updated++;
        } else {
          await AssignmentRoom.create(roomData);
          results.created++;
        }
      } catch (err) {
        results.errors.push({ roomId: roomData.roomId, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Seed completado: ${results.created} creadas, ${results.updated} actualizadas`,
      results
    });
  } catch (error) {
    console.error('Error en seed:', error);
    res.status(500).json({ error: 'Error al ejecutar seed', message: error.message });
  }
};

// ADMIN: Obtener todas las habitaciones
exports.getAllAssignmentRooms = async (req, res) => {
  try {
    const { type, active } = req.query;
    const filter = {};
    
    if (type) filter.type = type;
    if (active !== undefined) filter.isActive = active === 'true';

    const rooms = await AssignmentRoom.find(filter).sort({ type: 1, order: 1 });
    
    res.json({ success: true, data: rooms });
  } catch (error) {
    console.error('Error getting rooms:', error);
    res.status(500).json({ error: 'Error al obtener habitaciones' });
  }
};

// ADMIN: Crear nueva asignación
exports.createAssignment = async (req, res) => {
  try {
    const { eventName, brideEmail, brideName, bridePhone, hotelType } = req.body;

    // Validaciones
    if (!eventName || !brideEmail || !brideName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Nombre del evento, email y nombre de la novia son requeridos'
      });
    }

    // Validar email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brideEmail)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Por favor ingresa un email válido'
      });
    }

    // Generar token único
    const token = crypto.randomBytes(32).toString('hex');


    // Obtener habitaciones según hotelType
    let casaHotelAssignments = [];
    let boutiqueAssignments = [];
    if (!hotelType || hotelType === 'all') {
      const casaHotelRooms = await getCasaHotelRooms();
      const boutiqueRooms = await getBoutiqueRooms();
      casaHotelAssignments = casaHotelRooms.map(room => ({
        roomId: room.roomId,
        name: room.name,
        number: room.number,
        m2: room.m2,
        bed: room.bed,
        capacity: room.capacity,
        description: room.description,
        guestName: '',
        guestWhatsapp: ''
      }));
      boutiqueAssignments = boutiqueRooms.map(room => ({
        roomId: room.roomId,
        name: room.name,
        number: room.number,
        bed: room.bed,
        capacity: room.capacity,
        description: room.description,
        guestName: '',
        guestWhatsapp: ''
      }));
    } else if (hotelType === 'casa') {
      const casaHotelRooms = await getCasaHotelRooms();
      casaHotelAssignments = casaHotelRooms.map(room => ({
        roomId: room.roomId,
        name: room.name,
        number: room.number,
        m2: room.m2,
        bed: room.bed,
        capacity: room.capacity,
        description: room.description,
        guestName: '',
        guestWhatsapp: ''
      }));
      boutiqueAssignments = [];
    } else if (hotelType === 'boutique') {
      const boutiqueRooms = await getBoutiqueRooms();
      boutiqueAssignments = boutiqueRooms.map(room => ({
        roomId: room.roomId,
        name: room.name,
        number: room.number,
        bed: room.bed,
        capacity: room.capacity,
        description: room.description,
        guestName: '',
        guestWhatsapp: ''
      }));
      casaHotelAssignments = [];
    }

    const assignment = new GuestAssignment({
      eventName,
      brideEmail,
      brideName,
      bridePhone: bridePhone || '',
      token,
      casaHotelRooms: casaHotelAssignments,
      boutiqueRooms: boutiqueAssignments,
      status: 'pending',
      invitationSentAt: null,
      hotelType: hotelType || 'all'
    });

    await assignment.save();

    // SIEMPRE intentar enviar email
    let emailSent = false;
    let emailError = null;
    
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const accessUrl = `${frontendUrl}guest-assignment/${token}`;
      
      await sendInvitationEmail(brideEmail, brideName, accessUrl, eventName);
      
      // Actualizar fecha de envío
      assignment.invitationSentAt = new Date();
      await assignment.save();
      
      emailSent = true;
    } catch (error) {
      emailError = error.message;
      console.error('❌ Error enviando email:', error.message);
    }

    const totalRooms = casaHotelAssignments.length + boutiqueAssignments.length;

    // Solo incluir el arreglo de habitaciones correspondiente al hotelType
    let responseData = {
      _id: assignment._id.toString(),
      __v: assignment.__v,
      eventName: assignment.eventName,
      brideEmail: assignment.brideEmail,
      brideName: assignment.brideName,
      bridePhone: assignment.bridePhone,
      token: assignment.token,
      status: assignment.status,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
      invitationSentAt: assignment.invitationSentAt,
      emailSent,
      emailError,
      hotelType: assignment.hotelType,
      stats: {
        totalRooms,
        filledRooms: 0,
        percentage: 0
      }
    };
    if (assignment.hotelType === 'all') {
      responseData.casaHotelRooms = assignment.casaHotelRooms;
      responseData.boutiqueRooms = assignment.boutiqueRooms;
    } else if (assignment.hotelType === 'casa') {
      responseData.casaHotelRooms = assignment.casaHotelRooms;
    } else if (assignment.hotelType === 'boutique') {
      responseData.boutiqueRooms = assignment.boutiqueRooms;
    }
    res.status(201).json({
      success: true,
      message: emailSent 
        ? 'Asignación creada y email enviado exitosamente' 
        : 'Asignación creada (el email no pudo ser enviado)',
      data: responseData
    });
  } catch (error) {
    console.error('❌ Error creating assignment:', error);
    res.status(500).json({ error: 'Error al crear asignación', message: error.message });
  }
};

// ADMIN: Obtener todas las asignaciones
exports.getAllAssignments = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const filter = {};
    if (search) {
      filter.$or = [
        { eventName: { $regex: search, $options: 'i' } },
        { brideName: { $regex: search, $options: 'i' } },
        { brideEmail: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [assignments, total] = await Promise.all([
      GuestAssignment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      GuestAssignment.countDocuments(filter)
    ]);

    // Calcular estadísticas para cada asignación
    const assignmentsWithStats = assignments.map(a => {
      const casaRooms = a.casaHotelRooms || [];
      const boutiqueRooms = a.boutiqueRooms || [];
      const allRooms = [...casaRooms, ...boutiqueRooms];
      const filledRooms = allRooms.filter(r => r.guestName && r.guestName.trim()).length;
      const totalRooms = allRooms.length;

      return {
        ...a,
        stats: {
          totalRooms,
          filledRooms,
          percentage: totalRooms > 0 ? Math.round((filledRooms / totalRooms) * 100) : 0
        }
      };
    });

    res.json({
      success: true,
      data: assignmentsWithStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting assignments:', error);
    res.status(500).json({ error: 'Error al obtener asignaciones' });
  }
};

// ADMIN: Obtener detalles de asignación
exports.getAssignmentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await GuestAssignment.findById(id).lean();

    if (!assignment) {
      return res.status(404).json({ error: 'No encontrada', message: 'Asignación no encontrada' });
    }

    // Solo incluir el arreglo de habitaciones correspondiente al hotelType
    let responseData = {
      ...assignment,
      stats: {}
    };
    let casaRooms = assignment.casaHotelRooms || [];
    let boutiqueRooms = assignment.boutiqueRooms || [];
    if (assignment.hotelType === 'all') {
      // ambos
      responseData.casaHotelRooms = casaRooms;
      responseData.boutiqueRooms = boutiqueRooms;
    } else if (assignment.hotelType === 'casa') {
      responseData.casaHotelRooms = casaRooms;
      delete responseData.boutiqueRooms;
      boutiqueRooms = [];
    } else if (assignment.hotelType === 'boutique') {
      responseData.boutiqueRooms = boutiqueRooms;
      delete responseData.casaHotelRooms;
      casaRooms = [];
    }
    const totalRooms = casaRooms.length + boutiqueRooms.length;
    const filledRooms = [...casaRooms, ...boutiqueRooms].filter(r => r.guestName && r.guestName.trim()).length;
    responseData.stats = {
      totalRooms,
      filledRooms,
      percentage: totalRooms > 0 ? Math.round((filledRooms / totalRooms) * 100) : 0
    };
    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error getting assignment details:', error);
    res.status(500).json({ error: 'Error al obtener detalles' });
  }
};

// ADMIN: Reenviar email de invitación
exports.resendInvitationEmail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const assignment = await GuestAssignment.findById(id);
    
    if (!assignment) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Asignación no encontrada'
      });
    }
    
    // Generar URL de acceso
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const accessUrl = `${frontendUrl}/guest-assignment/${assignment.token}`;
    
    // Enviar email
    await sendInvitationEmail(
      assignment.brideEmail,
      assignment.brideName,
      accessUrl,
      assignment.eventName
    );
    
    // Actualizar fecha de envío
    assignment.invitationSentAt = new Date();
    assignment.updatedAt = new Date();
    await assignment.save();
    
    res.json({
      success: true,
      message: `Email reenviado exitosamente a ${assignment.brideEmail}`
    });
    
  } catch (error) {
    console.error('❌ Error reenviando email:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Error al reenviar el email'
    });
  }
};

// ADMIN: Eliminar asignación
exports.deleteAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const assignment = await GuestAssignment.findByIdAndDelete(id);
    
    if (!assignment) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Asignación no encontrada'
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Asignación eliminada exitosamente' 
    });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    res.status(500).json({ error: 'Error al eliminar asignación' });
  }
};

// ADMIN: Exportar a CSV
exports.exportAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await GuestAssignment.findById(id).lean();

    if (!assignment) {
      return res.status(404).json({ error: 'No encontrada' });
    }

    let csv = 'Tipo,Habitación,Número,Cama,Metros,Capacidad,Descripción,Huésped,WhatsApp\n';

    [...assignment.casaHotelRooms, ...assignment.boutiqueRooms].forEach(room => {
      const tipo = room.roomId.startsWith('CH') ? 'Casa Hotel' : 'Boutique';
      csv += `"${tipo}","${room.name}","${room.number || ''}","${room.bed || ''}","${room.m2 || ''}","${room.capacity || ''}","${room.description || ''}","${room.guestName || ''}","${room.guestWhatsapp || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=asignacion-${assignment.eventName.replace(/[^a-z0-9]/gi, '-')}.csv`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Error exporting:', error);
    res.status(500).json({ error: 'Error al exportar' });
  }
};

// ADMIN: Carga masiva desde Excel
exports.bulkUpload = async (req, res) => {
  try {
    const { assignments } = req.body;
    
    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        error: 'No data',
        message: 'No se proporcionaron asignaciones para crear'
      });
    }

    const results = {
      created: 0,
      failed: 0,
      errors: []
    };

    for (const data of assignments) {
      try {
        const { evento, email, nombre, telefono } = data;
        
        if (!evento || !email || !nombre) {
          results.failed++;
          results.errors.push({ data, error: 'Faltan campos requeridos' });
          continue;
        }

        // Generar token único
        const token = crypto.randomBytes(32).toString('hex');

        // Obtener habitaciones
        const casaHotelRooms = await getCasaHotelRooms();
        const boutiqueRooms = await getBoutiqueRooms();

        // Crear estructuras
        const casaHotelAssignments = casaHotelRooms.map(room => ({
          roomId: room.roomId,
          name: room.name,
          number: room.number,
          m2: room.m2,
          bed: room.bed,
          capacity: room.capacity,
          description: room.description,
          guestName: '',
          guestWhatsapp: ''
        }));

        const boutiqueAssignments = boutiqueRooms.map(room => ({
          roomId: room.roomId,
          name: room.name,
          number: room.number,
          bed: room.bed,
          capacity: room.capacity,
          description: room.description,
          guestName: '',
          guestWhatsapp: ''
        }));

        const assignment = new GuestAssignment({
          eventName: evento,
          brideEmail: email,
          brideName: nombre,
          bridePhone: telefono || '',
          token,
          casaHotelRooms: casaHotelAssignments,
          boutiqueRooms: boutiqueAssignments,
          status: 'pending'
        });

        await assignment.save();
        
        // Intentar enviar email
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const accessUrl = `${frontendUrl}/guest-assignment/${token}`;
          await sendInvitationEmail(email, nombre, accessUrl, evento);
          assignment.invitationSentAt = new Date();
          await assignment.save();
        } catch (emailErr) {
          console.error('Error enviando email en bulk:', emailErr.message);
        }
        
        results.created++;
      } catch (err) {
        results.failed++;
        results.errors.push({ data, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `Carga masiva completada: ${results.created} creadas, ${results.failed} fallidas`,
      results
    });
  } catch (error) {
    console.error('Error en bulk upload:', error);
    res.status(500).json({ error: 'Error en carga masiva', message: error.message });
  }
};

// ADMIN: Reparar índices
exports.fixIndexes = async (req, res) => {
  try {
    await GuestAssignment.collection.dropIndexes();
    await GuestAssignment.collection.createIndex({ eventName: 1 });
    await GuestAssignment.collection.createIndex({ brideEmail: 1 });
    await GuestAssignment.collection.createIndex({ token: 1 });
    
    res.json({
      success: true,
      message: 'Índices reparados correctamente'
    });
  } catch (error) {
    console.error('Error fixing indexes:', error);
    res.status(500).json({ error: 'Error al reparar índices' });
  }
};

// PUBLICO: Obtener asignación por token
exports.getAssignmentByToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    const assignment = await GuestAssignment.findOne({ token }).lean();
    
    if (!assignment) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Asignación no encontrada o enlace expirado'
      });
    }

    // Calcular progreso
    const allRooms = [...(assignment.casaHotelRooms || []), ...(assignment.boutiqueRooms || [])];
    const filledRooms = allRooms.filter(room => room.guestName && room.guestName.trim()).length;
    
    res.json({
      success: true,
      data: {
        ...assignment,
        stats: {
          totalRooms: allRooms.length,
          filledRooms,
          percentage: allRooms.length > 0 ? Math.round((filledRooms / allRooms.length) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting assignment:', error);
    res.status(500).json({ error: 'Error al obtener asignación' });
  }
};

// PUBLICO: Guardar asignación
exports.saveAssignment = async (req, res) => {
  try {
    const { token } = req.params;
    const { casaHotelRooms, boutiqueRooms, brideInfo } = req.body;
    
    const assignment = await GuestAssignment.findOne({ token });
    
    if (!assignment) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Asignación no encontrada o enlace expirado'
      });
    }

    // Actualizar datos de la novia
    if (brideInfo) {
      assignment.brideName = brideInfo.name || assignment.brideName;
      assignment.brideEmail = brideInfo.email || assignment.brideEmail;
      assignment.bridePhone = brideInfo.phone || assignment.bridePhone;
    }

    // Actualizar habitaciones
    if (casaHotelRooms && Array.isArray(casaHotelRooms)) {
      assignment.casaHotelRooms = assignment.casaHotelRooms.map(existingRoom => {
        const updatedRoom = casaHotelRooms.find(r => r.roomId === existingRoom.roomId);
        if (updatedRoom) {
          return {
            ...existingRoom,
            guestName: updatedRoom.guestName ? updatedRoom.guestName.trim() : '',
            guestWhatsapp: updatedRoom.guestWhatsapp ? updatedRoom.guestWhatsapp.trim() : ''
          };
        }
        return existingRoom;
      });
    }
    
    if (boutiqueRooms && Array.isArray(boutiqueRooms)) {
      assignment.boutiqueRooms = assignment.boutiqueRooms.map(existingRoom => {
        const updatedRoom = boutiqueRooms.find(r => r.roomId === existingRoom.roomId);
        if (updatedRoom) {
          return {
            ...existingRoom,
            guestName: updatedRoom.guestName ? updatedRoom.guestName.trim() : '',
            guestWhatsapp: updatedRoom.guestWhatsapp ? updatedRoom.guestWhatsapp.trim() : ''
          };
        }
        return existingRoom;
      });
    }
    
    assignment.status = 'completed';
    assignment.completedAt = new Date();
    assignment.updatedAt = new Date();
    
    await assignment.save();
    
    const casaRooms = assignment.casaHotelRooms || [];
    const boutiqueRoomsArray = assignment.boutiqueRooms || [];
    const totalRooms = casaRooms.length + boutiqueRoomsArray.length;
    const filledRooms = [...casaRooms, ...boutiqueRoomsArray].filter(room => room && room.guestName && room.guestName.trim()).length;

    res.json({
      success: true,
      message: 'Asignación guardada exitosamente',
      data: {
        ...assignment.toObject ? assignment.toObject() : assignment,
        stats: {
          totalRooms,
          filledRooms,
          percentage: totalRooms > 0 ? Math.round((filledRooms / totalRooms) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error saving assignment:', error);
    res.status(500).json({ error: 'Error al guardar', message: error.message });
  }
};

// ADMIN: Obtener códigos de descuento disponibles para un evento
exports.getDiscountCodesForAssignment = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que la asignación existe
    const assignment = await GuestAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Asignación no encontrada'
      });
    }
    
    // Buscar códigos de descuento asociados a este evento o códigos generales
    const DiscountCode = require('../models/DiscountCode');
    const discountCodes = await DiscountCode.find({
      $or: [
        { guestAssignmentId: id },
        { guestAssignmentId: null, active: true }
      ],
      active: true
    }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: discountCodes
    });
  } catch (error) {
    console.error('Error getting discount codes:', error);
    res.status(500).json({ error: 'Error al obtener códigos de descuento' });
  }
};

// ADMIN: Enviar código de descuento por WhatsApp a todos los huéspedes
exports.sendDiscountCodeWhatsApp = async (req, res) => {
  try {
    const { id } = req.params;
    const { discountCodeId } = req.body;
    
    // Verificar que la asignación existe
    const assignment = await GuestAssignment.findById(id);
    if (!assignment) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Asignación no encontrada'
      });
    }
    
    // Buscar el código de descuento
    const DiscountCode = require('../models/DiscountCode');
    const discountCode = await DiscountCode.findById(discountCodeId);
    if (!discountCode) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Código de descuento no encontrado'
      });
    }
    
    // Recopilar todos los números de WhatsApp de los huéspedes
    const allRooms = [...(assignment.casaHotelRooms || []), ...(assignment.boutiqueRooms || [])];
    const guestsWithWhatsapp = allRooms.filter(room => 
      room.guestWhatsapp && room.guestWhatsapp.trim() !== ''
    );
    
    if (guestsWithWhatsapp.length === 0) {
      return res.status(400).json({
        error: 'No guests',
        message: 'No hay huéspedes con número de WhatsApp registrado'
      });
    }
    
    console.log(`📱 Enviando código de descuento ${discountCode.code} a ${guestsWithWhatsapp.length} huéspedes...`);
    
    // Enviar mensaje a cada huésped via WhatsApp
    const results = {
      total: guestsWithWhatsapp.length,
      sent: 0,
      failed: 0,
      errors: []
    };
    
    // Función para formatear número de teléfono
    const formatPhoneNumber = (phone) => {
      // Limpiar el número de caracteres no numéricos
      let cleaned = phone.replace(/[^0-9]/g, '');
      
      // Si es un número de México (10 dígitos) sin prefijo, agregar +52
      if (cleaned.length === 10) {
        return '+52' + cleaned;
      }
      // Si ya tiene prefijo internacional, asegurar que tenga +
      if (cleaned.length > 10 && !phone.startsWith('+')) {
        return '+' + cleaned;
      }
      return phone.startsWith('+') ? phone : '+' + cleaned;
    };
    
    for (const guest of guestsWithWhatsapp) {
      try {
        // Formatear el número de teléfono
        const formattedPhone = formatPhoneNumber(guest.guestWhatsapp);
        
        // Determinar el tipo de habitación y enlace correspondiente
        const isBoutique = guest.roomId && guest.roomId.startsWith('BT');
        // 🆕 Usar URL base configurable según entorno
        const baseUrl = process.env.FRONTEND_URL 
          ? `${process.env.FRONTEND_URL}${isBoutique ? 'boutique' : 'reservas'}`
          : (isBoutique 
            ? 'https://lacapillahotel.com/boutique' 
            : 'https://lacapillahotel.com/reservas');
        const hotelType = isBoutique ? 'Boutique' : 'Casa Hotel';
        
        // Obtener nombre de la novia
        const brideName = assignment.brideName || 'la pareja';
        const roomName = guest.name || guest.roomId || 'Habitacion asignada';
        
        // Generar enlace directo con parámetros de reserva
        const checkInDate = new Date(discountCode.validFrom).toISOString().split('T')[0];
        const checkOutDate = new Date(discountCode.validUntil).toISOString().split('T')[0];
        
        // 🆕 Obtener el Room _id basado en el tipo de habitación
        let roomMongoId = guest.roomId; // Default fallback
        try {
          // Buscar la habitación asignada para obtener su tipo
          const assignedRoom = await AssignmentRoom.findOne({ roomId: guest.roomId });
          if (assignedRoom && assignedRoom.roomType) {
            // Buscar el Room correspondiente por tipo y lugar
            const roomType = assignedRoom.roomType.type;
            const lugar = assignedRoom.roomType.lugar;
            const roomDoc = await Room.findOne({ type: roomType, lugar: lugar });
            if (roomDoc) {
              roomMongoId = roomDoc._id.toString();
              console.log(`🔗 Mapeando ${guest.roomId} -> Room ${roomDoc.name} (_id: ${roomMongoId})`);
            }
          }
        } catch (err) {
          console.error(`⚠️ Error mapeando roomId a Room _id:`, err.message);
        }
        
        // Construir URL con parámetros
        const bookingParams = new URLSearchParams({
          room: roomMongoId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          code: discountCode.code
        });
        
        const bookingLink = `${baseUrl}?${bookingParams.toString()}`;
        
const message = `Hola ${guest.guestName}, muy buen día 

Nos da mucho gusto saber que formarás parte de la celebración de ${brideName}.

Hemos preparado un acceso exclusivo para tu hospedaje dentro del recinto:

*Detalles de tu reservación asignada:*

- Habitación: ${roomName}
- Tipo de alojamiento: ${hotelType}
- Tarifa preferencial 2 noches: $${discountCode.finalPrice.toFixed(2)} MXN
- Código de acceso: ${discountCode.code}
- Vigencia: ${new Date(discountCode.validFrom).toLocaleDateString('es-MX')} al ${new Date(discountCode.validUntil).toLocaleDateString('es-MX')}

Para confirmar tu estancia, solo debes ingresar al siguiente enlace (la habitación ya está preseleccionada para ti):

${bookingLink}

Al aplicar el código indicado, se reflejará automáticamente la tarifa especial correspondiente al evento.

Te recomendamos realizar tu reservación a la brevedad, ya que el acceso es exclusivo y por tiempo limitado.

Será un placer recibirte en La Capilla.

Atentamente,
*Hotel La Capilla*`;

        // Generar enlace de WhatsApp con mensaje prellenado
        const encodedMessage = encodeURIComponent(message);
        const whatsappLink = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
        
        // Agregar el enlace a los resultados
        results.links = results.links || [];
        results.links.push({
          guestName: guest.guestName || 'Invitado',
          phone: formattedPhone,
          link: whatsappLink,
          message: message
        });
        
        console.log(`📱 Enlace generado para ${formattedPhone} (${guest.guestName})`);
        results.sent++;
      } catch (err) {
        console.error(`❌ Error enviando a ${guest.guestWhatsapp}:`, err.message);
        results.failed++;
        results.errors.push({ whatsapp: guest.guestWhatsapp, error: err.message });
      }
    }
    
    console.log(`✅ Envío completado: ${results.sent} enviados, ${results.failed} fallidos`);
    
    res.json({
      success: true,
      message: `Código de descuento enviado a ${results.sent} huéspedes`,
      results
    });
  } catch (error) {
    console.error('Error sending discount code:', error);
    res.status(500).json({ error: 'Error al enviar código de descuento' });
  }
};
