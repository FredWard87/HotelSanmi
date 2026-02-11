// controllers/guestAssignmentController.js
const GuestAssignment = require('../models/GuestAssignment');
const AssignmentRoom = require('../models/AssignmentRoom');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const ASSIGNMENT_ROOMS_SEED = require('../data/assignmentRoomsSeed');

// Configurar transporter de email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME || 'audit3674@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'xarv ywnv gdkv jofm',
  },
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
          // Actualizar campos existentes
          await AssignmentRoom.findByIdAndUpdate(existing._id, roomData);
          results.updated++;
        } else {
          // Crear nuevo
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
    const { eventName, brideEmail, brideName, bridePhone } = req.body;

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

    // Obtener habitaciones desde la base de datos
    const casaHotelRooms = await getCasaHotelRooms();
    const boutiqueRooms = await getBoutiqueRooms();

    // Inicializar con estructuras vacías
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
      eventName,
      brideEmail,
      brideName,
      bridePhone: bridePhone || '',
      token,
      casaHotelRooms: casaHotelAssignments,
      boutiqueRooms: boutiqueAssignments,
      status: 'pending',
      invitationSentAt: null
    });

    await assignment.save();

    // 🔥 SIEMPRE intentar enviar email
    let emailSent = false;
    let emailError = null;
    
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const accessUrl = `${frontendUrl}/guest-assignment/${token}`;
      
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

    res.status(201).json({
      success: true,
      message: emailSent 
        ? 'Asignación creada y email enviado exitosamente' 
        : 'Asignación creada (el email no pudo ser enviado)',
      data: {
        _id: assignment._id.toString(),
        __v: assignment.__v,
        eventName: assignment.eventName,
        brideEmail: assignment.brideEmail,
        brideName: assignment.brideName,
        bridePhone: assignment.bridePhone,
        token: assignment.token,
        casaHotelRooms: assignment.casaHotelRooms,
        boutiqueRooms: assignment.boutiqueRooms,
        status: assignment.status,
        createdAt: assignment.createdAt,
        updatedAt: assignment.updatedAt,
        invitationSentAt: assignment.invitationSentAt,
        emailSent,
        emailError,
        stats: {
          totalRooms,
          filledRooms: 0,
          percentage: 0
        }
      }
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

    const casaRooms = assignment.casaHotelRooms || [];
    const boutiqueRooms = assignment.boutiqueRooms || [];
    const totalRooms = casaRooms.length + boutiqueRooms.length;
    const filledRooms = [...casaRooms, ...boutiqueRooms].filter(r => r.guestName && r.guestName.trim()).length;

    res.json({
      success: true,
      data: {
        ...assignment,
        stats: {
          totalRooms,
          filledRooms,
          percentage: totalRooms > 0 ? Math.round((filledRooms / totalRooms) * 100) : 0
        }
      }
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
      return res.status(400).json({ error: 'No se proporcionaron asignaciones' });
    }

    const casaHotelRooms = await getCasaHotelRooms();
    const boutiqueRooms = await getBoutiqueRooms();

    const results = { created: 0, emailsSent: 0, errors: [] };

    for (const item of assignments) {
      try {
        const { evento, email, nombre, telefono } = item;

        if (!evento || !email || !nombre) {
          results.errors.push({ item, error: 'Faltan datos requeridos' });
          continue;
        }

        // Validar email
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          results.errors.push({ item, error: 'Email inválido' });
          continue;
        }

        const token = crypto.randomBytes(32).toString('hex');

        const casaAssignments = casaHotelRooms.map(room => ({
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
          casaHotelRooms: casaAssignments,
          boutiqueRooms: boutiqueAssignments,
          status: 'pending',
          invitationSentAt: null
        });

        await assignment.save();
        results.created++;

        // Enviar email
        try {
          const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
          const accessUrl = `${frontendUrl}/guest-assignment/${token}`;
          
          await sendInvitationEmail(email, nombre, accessUrl, evento);
          
          assignment.invitationSentAt = new Date();
          await assignment.save();
          
          results.emailsSent++;
        } catch (emailError) {
          console.error(`❌ Error enviando email a ${email}:`, emailError.message);
        }

      } catch (err) {
        results.errors.push({ item, error: err.message });
      }
    }

    res.json({
      success: true,
      message: `✅ Procesadas: ${results.created} | 📧 Emails enviados: ${results.emailsSent}`,
      results
    });
  } catch (error) {
    console.error('Error bulk upload:', error);
    res.status(500).json({ error: 'Error en carga masiva', message: error.message });
  }
};

// Mantenimiento: Reparar índices
exports.fixIndexes = async (req, res) => {
  try {
    await GuestAssignment.collection.dropIndexes();
    res.json({ success: true, message: 'Índices reparados' });
  } catch (error) {
    console.error('Error fixing indexes:', error);
    res.status(500).json({ error: 'Error al reparar índices', message: error.message });
  }
};

// PÚBLICO: Obtener asignación por token
exports.getAssignmentByToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    const assignment = await GuestAssignment.findOne({ token }).lean();

    if (!assignment) {
      return res.status(404).json({ error: 'No encontrada', message: 'Asignación no encontrada' });
    }

    const casaHotelRooms = assignment.casaHotelRooms || [];
    const boutiqueRooms = assignment.boutiqueRooms || [];
    const totalRooms = casaHotelRooms.length + boutiqueRooms.length;
    const filledRooms = [...casaHotelRooms, ...boutiqueRooms].filter(r => r.guestName && r.guestName.trim()).length;

    res.json({
      success: true,
      data: {
        ...assignment,
        stats: {
          totalRooms,
          filledRooms,
          percentage: totalRooms > 0 ? Math.round((filledRooms / totalRooms) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error('Error getting assignment by token:', error);
    res.status(500).json({ error: 'Error al obtener la asignación' });
  }
};

// PÚBLICO: Guardar asignación
exports.saveAssignment = async (req, res) => {
  try {
    const { token } = req.params;
    const { casaHotelRooms, boutiqueRooms, brideInfo } = req.body;
    
    const assignment = await GuestAssignment.findOne({ token });
    
    if (!assignment) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Asignación no encontrada'
      });
    }
    
    // Actualizar solo si vienen datos
    if (assignment.casaHotelRooms.length === 0) {
      const dbCasaRooms = await getCasaHotelRooms();
      assignment.casaHotelRooms = dbCasaRooms.map(room => ({
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
    }
    
    if (assignment.boutiqueRooms.length === 0) {
      const dbBoutiqueRooms = await getBoutiqueRooms();
      assignment.boutiqueRooms = dbBoutiqueRooms.map(room => ({
        roomId: room.roomId,
        name: room.name,
        number: room.number,
        bed: room.bed,
        capacity: room.capacity,
        description: room.description,
        guestName: '',
        guestWhatsapp: ''
      }));
    }
    
    if (brideInfo) {
      if (brideInfo.name && brideInfo.name.trim()) assignment.brideName = brideInfo.name.trim();
      if (brideInfo.email && brideInfo.email.trim()) assignment.brideEmail = brideInfo.email.trim();
      if (brideInfo.phone && brideInfo.phone.trim()) assignment.bridePhone = brideInfo.phone.trim();
    }
    
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
