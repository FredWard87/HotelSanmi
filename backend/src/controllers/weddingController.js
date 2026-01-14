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
              body { 
                font-family: 'Arial', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                margin: 0; 
                padding: 0; 
                background-color: #f9f9f9;
              }
              .container { 
                max-width: 600px; 
                margin: 20px auto; 
                background: #fff; 
                border-radius: 10px; 
                overflow: hidden; 
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
              }
              .header { 
                background: #ffffff; 
                color: #1a1a1a; 
                padding: 40px 20px 30px 20px; 
                text-align: center; 
                border-bottom: 4px solid #C9A961;
              }
              .logo-container {
                margin-bottom: 25px;
              }
              .logo-img {
                max-width: 280px;
                height: auto;
                margin: 0 auto;
                display: block;
              }
              .hotel-title {
                text-align: center;
                margin-bottom: 20px;
              }
              .hotel-title .main-title {
                font-size: 32px;
                font-weight: 700;
                color: #1a1a1a;
                margin: 0;
                letter-spacing: 1px;
                line-height: 1.1;
              }
              .hotel-title .subtitle {
                font-size: 24px;
                font-weight: 300;
                color: #1a1a1a;
                margin: 5px 0 0 0;
                letter-spacing: 0.5px;
              }
              .confirmation-section {
                background: #f8f8f8;
                padding: 15px;
                border-radius: 8px;
                margin: 20px auto;
                max-width: 500px;
                border-left: 4px solid #C9A961;
              }
              .confirmation-title {
                font-size: 20px;
                color: #1a1a1a;
                font-weight: 600;
                margin: 0 0 5px 0;
                text-align: center;
              }
              .confirmation-text {
                font-size: 16px;
                color: #C9A961;
                font-weight: 500;
                margin: 0;
                text-align: center;
              }
              .content { padding: 40px 30px; }
              .greeting { 
                font-size: 18px; 
                color: #1a1a1a; 
                margin-bottom: 25px; 
                font-weight: 500;
              }
              .section { margin: 30px 0; }
              .section-title { 
                font-size: 16px; 
                color: #1a1a1a; 
                font-weight: 700; 
                letter-spacing: 0.5px; 
                margin-bottom: 15px; 
                text-transform: uppercase; 
                border-bottom: 2px solid #C9A961;
                padding-bottom: 10px;
              }
              .section-text { 
                font-size: 15px; 
                color: #555; 
                line-height: 1.7; 
                margin-bottom: 15px;
              }
              .details { 
                background: #f9f9f9; 
                border: 1px solid #e0e0e0; 
                padding: 25px; 
                margin: 25px 0; 
                border-radius: 8px; 
                border-left: 4px solid #C9A961;
              }
              .detail-row { 
                display: flex; 
                justify-content: space-between; 
                font-size: 15px; 
                margin-bottom: 15px; 
                padding-bottom: 15px;
                border-bottom: 1px solid #eee;
              }
              .detail-row:last-child {
                border-bottom: none;
                margin-bottom: 0;
                padding-bottom: 0;
              }
              .detail-label { 
                color: #666; 
                font-weight: 600; 
                width: 45%;
              }
              .detail-value { 
                color: #1a1a1a; 
                font-weight: 500; 
                width: 50%;
                text-align: right;
              }
              .footer-divider { 
                height: 1px; 
                background: #e0e0e0; 
                margin: 40px 0; 
              }
              .footer-text { 
                font-size: 14px; 
                color: #666; 
                text-align: center; 
                line-height: 1.7; 
                margin-bottom: 20px;
              }
              .contact-link { 
                color: #C9A961; 
                text-decoration: none; 
                font-weight: 600; 
              }
              .contact-link:hover {
                text-decoration: underline;
              }
              .whatsapp-button {
                display: inline-block;
                background: #25D366;
                color: white;
                padding: 12px 25px;
                border-radius: 6px;
                text-decoration: none;
                margin-top: 15px;
                font-weight: bold;
                font-size: 15px;
                transition: background 0.3s ease;
              }
              .whatsapp-button:hover {
                background: #1da851;
              }
              .alert-box {
                background: #FFF9F0;
                border: 1px solid #FFD699;
                padding: 20px;
                margin: 25px 0;
                border-radius: 8px;
                border-left: 4px solid #FFA726;
              }
              .alert-title {
                font-weight: 700;
                color: #E65100;
                margin-bottom: 10px;
                font-size: 16px;
              }
              .contact-info {
                background: #f8f8f8;
                padding: 25px;
                border-radius: 8px;
                margin-top: 30px;
                text-align: center;
                border: 1px solid #e0e0e0;
              }
              .contact-info-title {
                font-size: 18px;
                color: #1a1a1a;
                font-weight: 600;
                margin-bottom: 20px;
              }
              .contact-item {
                margin-bottom: 15px;
                line-height: 1.8;
              }
              .contact-item:last-child {
                margin-bottom: 0;
              }
              .contact-label {
                font-weight: 600;
                color: #1a1a1a;
                margin-bottom: 5px;
              }
              .contact-value {
                color: #666;
              }
              .footer {
                background: #f5f5f5;
                padding: 25px;
                text-align: center;
                border-top: 1px solid #e0e0e0;
              }
              .footer p {
                margin: 10px 0;
                color: #777;
                font-size: 13px;
              }
              .footer strong {
                color: #1a1a1a;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo-container">
                  ${logoBuffer ? 
                    `<img src="cid:${LOGO_CID}" alt="La Capilla Hotel" class="logo-img">` : 
                    `<div class="hotel-title">
                      <h1 class="main-title">LA CAPILLA</h1>
                      <h2 class="subtitle">HOTEL</h2>
                    </div>`
                  }
                </div>
                
                <div class="confirmation-section">
                  <h3 class="confirmation-title">LA CAPILLA HOTEL</h3>
                  <p class="confirmation-text">Solicitud de Visita para Evento</p>
                  <p class="confirmation-text" style="color: #4CAF50; margin-top: 10px;">Confirmación de Solicitud Recibida</p>
                </div>
              </div>
              
              <div class="content">
                <div class="greeting">Estimado(a) <strong>${fullName}</strong>,</div>
                
                <div class="section">
                  <div class="section-text">
                    Agradecemos sinceramente tu interés en <strong>La Capilla Hotel</strong> para tu evento especial. Hemos recibido tu solicitud de información y nos pondremos en contacto contigo a la brevedad para brindarte todos los detalles, resolver tus dudas y coordinar una visita personalizada a nuestras instalaciones.
                  </div>
                  
                  <div class="section-text">
                    Nos complace saber que estás considerando nuestro hotel para celebrar esta ocasión tan importante. Nuestro equipo está comprometido en hacer de tu evento una experiencia memorable y única.
                  </div>
                </div>
                
                <div class="alert-box">
                  <div class="alert-title">¿Qué sigue?</div>
                  <div class="section-text">
                    Un miembro de nuestro equipo de eventos se comunicará contigo en las próximas <strong>24-48 horas</strong> para:
                    <ul style="margin: 10px 0 0 20px;">
                      <li>Confirmar la disponibilidad para tu fecha</li>
                      <li>Agendar una visita guiada a nuestras instalaciones</li>
                      <li>Presentarte nuestras opciones de paquetes y servicios</li>
                      <li>Resolver cualquier pregunta específica que tengas</li>
                    </ul>
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
                      <span class="detail-label">Fecha del Evento</span>
                      <span class="detail-value">${eventDateFormatted.charAt(0).toUpperCase() + eventDateFormatted.slice(1)}</span>
                    </div>
                    <div class="detail-row">
                      <span class="detail-label">Número de Invitados</span>
                      <span class="detail-value">${guests || 'Por confirmar'}</span>
                    </div>
                    ${email ? `
                    <div class="detail-row">
                      <span class="detail-label">Correo Electrónico</span>
                      <span class="detail-value">${email}</span>
                    </div>` : ''}
                    ${phone ? `
                    <div class="detail-row">
                      <span class="detail-label">Teléfono</span>
                      <span class="detail-value">${phone}</span>
                    </div>` : ''}
                    ${message ? `
                    <div class="detail-row" style="flex-direction: column; align-items: flex-start;">
                      <span class="detail-label">Mensaje Adicional</span>
                      <span class="detail-value" style="margin-top: 10px; font-style: italic; text-align: left; width: 100%; color: #555;">"${message}"</span>
                    </div>` : ''}
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Para tu Visita</div>
                  <div class="section-text">
                    Te recomendamos considerar lo siguiente para cuando nos visiten:
                    <ul style="margin: 15px 0 0 20px;">
                      <li>Traer ideas o inspiración para la decoración</li>
                      <li>Tener en mente un presupuesto aproximado</li>
                      <li>Considerar horarios preferidos para la celebración</li>
                      <li>Pensar en necesidades especiales o requerimientos específicos</li>
                    </ul>
                  </div>
                </div>
                
                <div class="footer-divider"></div>
                
                <div class="contact-info">
                  <div class="contact-info-title">¿Necesitas contactarnos?</div>
                  
                  <div class="contact-item">
                    <div class="contact-label">WhatsApp</div>
                    <div class="contact-value">
                      <a href="https://wa.me/524181324886" class="contact-link" target="_blank">418 132 4886</a>
                    </div>
                  </div>
                  
                  <div class="contact-item">
                    <div class="contact-label">Correo Electrónico</div>
                    <div class="contact-value">
                      <a href="mailto:lacapillasl@gmail.com" class="contact-link">lacapillasl@gmail.com</a>
                    </div>
                  </div>
                  
                  <div class="contact-item">
                    <div class="contact-label">Ubicación</div>
                    <div class="contact-value">
                      Dolores Hidalgo - San Miguel De Allende,<br>
                      37814 Dolores Hidalgo Cuna de la Independencia Nacional, Gto.
                    </div>
                  </div>
                  
                  <div style="margin-top: 25px;">
                    <a href="https://wa.me/524181324886?text=Hola%20La%20Capilla%20Hotel,%20tengo%20una%20consulta%20sobre%20mi%20solicitud%20de%20visita%20para%20evento%20con%20fecha%20${encodeURIComponent(eventDateFormatted)}" 
                       class="whatsapp-button" 
                       target="_blank">
                      💬 Contáctanos por WhatsApp
                    </a>
                  </div>
                </div>
              </div>
              
              <div class="footer">
                <p><strong>La Capilla Hotel</strong></p>
                <p>Dolores Hidalgo - San Miguel De Allende, 37814 Dolores Hidalgo Cuna de la Independencia Nacional, Gto.</p>
                <p style="margin-top: 20px; color: #999; font-size: 12px;">
                  Este es un mensaje automático de confirmación. Para consultas específicas, responde directamente a este correo.
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: `"La Capilla Hotel - Eventos" <${process.env.EMAIL_USERNAME}>`,
        to: email,
        cc: ['lacapillasl@gmail.com', 'fredyesparza08@gmail.com'],
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
