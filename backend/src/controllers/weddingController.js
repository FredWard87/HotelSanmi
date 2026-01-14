const WeddingVisit = require('../models/WeddingVisit');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIGURACIÓN DE TRANSPORTE (OPTIMIZADA PARA VERCEL)
// ============================================================
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS (STARTTLS)
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    // Necesario para evitar bloqueos en entornos de nube/serverless
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },
  // Evita que Mongoose/Node se rinda antes de que Gmail responda el "saludo"
  connectionTimeout: 15000, 
  greetingTimeout: 15000,   
});

// Leer el logo una sola vez
let logoBuffer = null;
try {
  const logoPath = path.join(__dirname, '../assets/logo.png');
  if (fs.existsSync(logoPath)) {
    logoBuffer = fs.readFileSync(logoPath);
    console.log('✅ Logo cargado correctamente para emails de visitas');
  } else {
    console.warn('⚠️ Logo no encontrado en:', logoPath);
  }
} catch (logoError) {
  console.error('❌ Error cargando logo:', logoError.message);
}

const LOGO_CID = 'la-capilla-logo-visitas@reserva';

// ============================================================
// CREAR SOLICITUD DE VISITA (CON ENVÍO DE EMAIL)
// ============================================================
exports.createVisit = async (req, res, next) => {
  try {
    const { fullName, email, phone, guests, eventDate, message } = req.body;

    // Validación básica
    if (!fullName || !email || !eventDate) {
      return res.status(400).json({ error: 'fullName, email and eventDate are required' });
    }

    // 1. Guardar en MongoDB Atlas
    const visit = new WeddingVisit({ 
      fullName, 
      email, 
      phone, 
      guests: Number(guests), 
      eventDate: new Date(eventDate), 
      message 
    });
    await visit.save();

    // 2. Proceso de envío de Email (Bloque try/catch independiente)
    try {
      const eventDateFormatted = new Date(eventDate).toLocaleDateString('es-MX', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Preparar adjuntos (logo)
      const attachments = [];
      if (logoBuffer) {
        attachments.push({
          filename: 'logo.png',
          content: logoBuffer,
          contentType: 'image/png',
          cid: LOGO_CID
        });
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
              .header { 
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); 
                color: #fff; 
                padding: 40px 20px 30px 20px; 
                text-align: center; 
                position: relative;
                border-bottom: 3px solid #C9A961;
              }
              .logo-container {
                margin-bottom: 20px;
              }
              .logo-img {
                max-width: 324px;
                height: auto;
                margin: 0 auto;
                display: block;
              }
              .header-text { 
                text-align: center; 
                margin-top: 15px; 
              }
              .header-text h1 { 
                margin: 10px 0 5px 0; 
                font-size: 28px; 
                letter-spacing: 0.5px; 
                color: #fff;
                font-weight: bold;
              }
              .header-text h2 { 
                margin: 0; 
                font-size: 16px; 
                opacity: 0.9; 
                color: #C9A961;
                font-weight: normal;
              }
              .confirmation-text {
                font-size: 14px;
                color: #4CAF50;
                margin-top: 10px;
                font-weight: bold;
              }
              .content { padding: 40px 30px; }
              .greeting { font-size: 18px; color: #1a1a1a; margin-bottom: 20px; }
              .section { margin: 25px 0; }
              .section-title { 
                font-size: 14px; 
                color: #C9A961; 
                font-weight: 700; 
                letter-spacing: 0.5px; 
                margin-bottom: 12px; 
                text-transform: uppercase; 
                border-bottom: 2px solid #C9A961;
                padding-bottom: 8px;
              }
              .section-text { font-size: 14px; color: #555; line-height: 1.7; }
              .details { 
                background: #f9f9f9; 
                border-left: 4px solid #C9A961; 
                padding: 20px; 
                margin: 20px 0; 
                border-radius: 4px; 
              }
              .detail-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 12px; }
              .detail-label { color: #666; font-weight: 600; }
              .detail-value { color: #1a1a1a; font-weight: 500; }
              .footer-divider { height: 1px; background: #e0e0e0; margin: 30px 0; }
              .footer-text { font-size: 13px; color: #999; text-align: center; line-height: 1.6; }
              .contact-link { color: #C9A961; text-decoration: none; font-weight: 600; }
              .whatsapp-button {
                display: inline-block;
                background: #25D366;
                color: white;
                padding: 10px 20px;
                border-radius: 5px;
                text-decoration: none;
                margin-top: 10px;
                font-weight: bold;
              }
              .alert-box {
                background: #FFF3E0;
                border-left: 4px solid #FF6F00;
                padding: 15px;
                margin: 20px 0;
                border-radius: 5px;
              }
              .alert-title {
                font-weight: bold;
                color: #FF6F00;
                margin-bottom: 8px;
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
                  <h1>LA CAPILLA HOTEL</h1>
                  <h2>Solicitud de Visita para Evento</h2>
                  <div class="confirmation-text">Confirmación de Solicitud Recibida</div>
                </div>
              </div>
              <div class="content">
                <div class="greeting">Estimado(a) ${fullName},</div>
                <div class="section">
                  <div class="section-title">Solicitud Recibida</div>
                  <div class="section-text">
                    Agradecemos sinceramente tu interés en <strong>La Capilla Hotel</strong>. Hemos recibido tu solicitud de visita para tu evento especial y nos complace confirmar que tu información ha sido registrada correctamente.
                  </div>
                </div>
                
                <div class="alert-box">
                  <div class="alert-title">Importante</div>
                  <div class="section-text">
                    Nuestro equipo se pondrá en contacto contigo en las próximas <strong>24 horas</strong> para coordinar todos los detalles de tu visita y responder cualquier pregunta que puedas tener.
                  </div>
                </div>
                
                <div class="section">
                  <div class="section-title">Detalles de tu Solicitud</div>
                  <div class="details">
                    <div class="detail-row">
                      <span class="detail-label">Nombre Completo</span>
                      <span class="detail-value">${fullName}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Fecha de Evento</span>
                      <span class="detail-value">${eventDateFormatted.charAt(0).toUpperCase() + eventDateFormatted.slice(1)}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Número de Invitados</span>
                      <span class="detail-value">${guests || 'Por confirmar'}</span>
                    </div>
                    ${phone ? `
                    <div class="detail-row">
                      <span class="detail-label">Teléfono de Contacto</span>
                      <span class="detail-value">${phone}</span>
                    </div>` : ''}
                    ${message ? `
                    <div class="detail-row" style="flex-direction: column; align-items: flex-start;">
                      <span class="detail-label">Mensaje Adicional</span>
                      <span class="detail-value" style="margin-top: 5px; font-style: italic;">"${message}"</span>
                    </div>` : ''}
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Próximos Pasos</div>
                  <div class="section-text">
                    <ol style="margin-left: 20px;">
                      <li>Nuestro coordinador de eventos te contactará para confirmar el horario de tu visita.</li>
                      <li>Durante la visita, conocerás nuestras instalaciones y opciones disponibles.</li>
                      <li>Recibirás una propuesta personalizada para tu evento.</li>
                      <li>Resolveremos todas tus dudas sobre paquetes, menús y servicios adicionales.</li>
                    </ol>
                  </div>
                </div>
                
                <div class="section">
                  <div class="section-title">Recomendaciones para tu Visita</div>
                  <div class="section-text">
                    • Trae ideas o inspiración para tu evento<br>
                    • Considera las fechas alternativas que podrían funcionar<br>
                    • Prepara cualquier pregunta específica que tengas<br>
                    • Si vienes en grupo, avísanos para prepararnos adecuadamente
                  </div>
                </div>

                <div class="footer-divider"></div>
                
                <div class="section">
                  <div class="section-title">¿Necesitas contactarnos?</div>
                  <div class="footer-text">
                    <strong>LA CAPILLA HOTEL - COORDINACIÓN DE EVENTOS</strong><br><br>
                    📞 <strong>Teléfono:</strong> <a href="tel:+524777347474" class="contact-link">+52 4777 34 7474</a><br>
                    💬 <strong>WhatsApp:</strong> <a href="https://wa.me/524777347474" class="contact-link">+52 4777 34 7474</a><br>
                    📧 <strong>Email:</strong> <a href="mailto:lacapillasl@gmail.com" class="contact-link">lacapillasl@gmail.com</a><br>
                    📍 <strong>Dirección:</strong> Calle Principal #123, San Luis de la Paz, Gto.
                  </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                  <a href="https://wa.me/524777347474?text=Hola,%20tengo%20una%20consulta%20sobre%20mi%20visita%20programada%20para%20${encodeURIComponent(eventDateFormatted)}" class="whatsapp-button" target="_blank">
                    💬 Contactar por WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: `"La Capilla Hotel - Eventos" <${process.env.EMAIL_USERNAME}>`,
        to: email,
        cc: ['lacapillasl@gmail.com', 'fredyesparza08@gmail.com'], // Agregados los CC solicitados
        subject: 'Confirmación de Solicitud de Visita para Evento - La Capilla Hotel',
        html: htmlContent,
        attachments: attachments
      };

      // VITAL: 'await' asegura que la función de Vercel no termine hasta enviar el correo
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email de visita para evento enviado:', {
        messageId: info.messageId,
        to: email,
        cc: mailOptions.cc
      });

    } catch (emailErr) {
      // Registramos el error en Vercel Logs para que puedas verlo
      console.error('❌ Error enviando email de visita para evento:', emailErr);
      // No re-lanzamos el error para no afectar la respuesta al frontend
    }

    // 3. Respuesta de éxito al Frontend
    res.status(201).json({ 
      success: true, 
      visit,
      message: 'Solicitud de visita registrada exitosamente. Recibirás un correo de confirmación.'
    });

  } catch (err) {
    console.error('❌ Error crítico en createVisit:', err);
    next(err);
  }
};

// ============================================================
// MÉTODOS DE ADMINISTRACIÓN (DASHBOARD)
// ============================================================

exports.listVisits = async (req, res, next) => {
  try {
    const visits = await WeddingVisit.find().sort({ createdAt: -1 });
    res.json(visits);
  } catch (err) {
    next(err);
  }
};

exports.getVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const visit = await WeddingVisit.findById(id);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json(visit);
  } catch (err) {
    next(err);
  }
};

exports.updateVisitStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['pending','confirmed','cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const visit = await WeddingVisit.findByIdAndUpdate(id, { status }, { new: true });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json({ success: true, visit });
  } catch (err) {
    next(err);
  }
};

exports.updateVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const allowed = ['fullName','email','phone','guests','eventDate','message','status'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowed.includes(key)) updates[key] = req.body[key];
    });

    if (updates.eventDate) updates.eventDate = new Date(updates.eventDate);

    const visit = await WeddingVisit.findByIdAndUpdate(id, updates, { new: true });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json({ success: true, visit });
  } catch (err) {
    next(err);
  }
};

exports.deleteVisit = async (req, res, next) => {
  try {
    const { id } = req.params;
    const visit = await WeddingVisit.findByIdAndDelete(id);
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
