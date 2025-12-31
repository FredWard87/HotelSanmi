const WeddingVisit = require('../models/WeddingVisit');
const nodemailer = require('nodemailer');

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

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); color: #fff; padding: 40px 20px; text-align: center; }
              .header h1 { margin: 0; font-size: 28px; letter-spacing: 0.5px; }
              .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; }
              .content { padding: 40px 30px; }
              .greeting { font-size: 18px; color: #1a1a1a; margin-bottom: 20px; }
              .section { margin: 25px 0; }
              .section-title { font-size: 14px; color: #C9A961; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px; text-transform: uppercase; }
              .section-text { font-size: 14px; color: #555; line-height: 1.7; }
              .details { background: #f9f9f9; border-left: 4px solid #C9A961; padding: 16px; margin: 20px 0; border-radius: 4px; }
              .detail-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 10px; }
              .detail-label { color: #999; font-weight: 600; }
              .detail-value { color: #1a1a1a; font-weight: 500; }
              .footer-divider { height: 1px; background: #e0e0e0; margin: 30px 0; }
              .footer-text { font-size: 13px; color: #999; text-align: center; line-height: 1.6; }
              .contact-link { color: #C9A961; text-decoration: none; font-weight: 600; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>LA CAPILLA HOTEL</h1>
                <p>Confirmación de Solicitud de Visita</p>
              </div>
              <div class="content">
                <div class="greeting">Estimado ${fullName},</div>
                <div class="section">
                  <div class="section-title">Solicitud Recibida</div>
                  <div class="section-text">
                    Agradecemos sinceramente tu interés en La Capilla Hotel. Hemos recibido tu solicitud de visita y nos complace confirmar que tu información ha sido registrada correctamente.
                  </div>
                </div>
                <div class="details">
                  <div class="detail-row"><span class="detail-label">Nombre</span><span class="detail-value">${fullName}</span></div>
                  <div class="detail-row">
                    <span class="detail-label">Fecha de Evento</span>
                    <span class="detail-value">${eventDateFormatted.charAt(0).toUpperCase() + eventDateFormatted.slice(1)}</span>
                  </div>
                  <div class="detail-row"><span class="detail-label">Invitados</span><span class="detail-value">${guests || 'No especificado'}</span></div>
                  ${phone ? `<div class="detail-row"><span class="detail-label">Teléfono</span><span class="detail-value">${phone}</span></div>` : ''}
                </div>
                <div class="section">
                  <div class="section-title">Próximos Pasos</div>
                  <div class="section-text">
                    Nuestro equipo se pondrá en contacto contigo en las próximas 24 horas para coordinar tu visita.
                  </div>
                </div>
                <div class="footer-divider"></div>
                <div class="footer-text">
                  <strong>LA CAPILLA HOTEL</strong><br>
                  <a href="tel:+524777347474" class="contact-link">+52 4777 34 7474</a><br>
                  <a href="mailto:lacapillasl@gmail.com" class="contact-link">lacapillasl@gmail.com</a>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: `La Capilla Hotel <${process.env.EMAIL_USERNAME}>`,
        to: email,
        subject: 'Confirmación de Solicitud de Visita - La Capilla Hotel',
        html: htmlContent,
      };

      // VITAL: 'await' asegura que la función de Vercel no termine hasta enviar el correo
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email de boda enviado:', info.messageId);

    } catch (emailErr) {
      // Registramos el error en Vercel Logs para que puedas verlo
      console.error('❌ Error enviando email de boda:', emailErr);
    }

    // 3. Respuesta de éxito al Frontend
    res.status(201).json({ success: true, visit });

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
