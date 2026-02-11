const WeddingVisit = require('../models/WeddingVisit');
const nodemailer = require('nodemailer');

// Optional: setup transporter using existing transporter in pdfService? To keep isolated, create simple transporter using env
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

exports.createVisit = async (req, res, next) => {
  try {
    const { fullName, email, phone, guests, eventDate, message } = req.body;
    if (!fullName || !email || !eventDate) {
      return res.status(400).json({ error: 'fullName, email and eventDate are required' });
    }

    const visit = new WeddingVisit({ fullName, email, phone, guests, eventDate: new Date(eventDate), message });
    await visit.save();

    // Send professional confirmation email
    try {
      const eventDateFormatted = new Date(eventDate).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
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
                    Agradecemos sinceramente tu interés en La Capilla Hotel para tu evento especial. Hemos recibido tu solicitud de visita y nos complace confirmar que tu información ha sido registrada correctamente.
                  </div>
                </div>

                <div class="details">
                  <div class="detail-row">
                    <span class="detail-label">Nombre</span>
                    <span class="detail-value">${fullName}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Fecha de Evento</span>
                    <span class="detail-value">${eventDateFormatted.charAt(0).toUpperCase() + eventDateFormatted.slice(1)}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Número de Invitados</span>
                    <span class="detail-value">${guests || 'No especificado'}</span>
                  </div>
                  ${phone ? `<div class="detail-row">
                    <span class="detail-label">Teléfono</span>
                    <span class="detail-value">${phone}</span>
                  </div>` : ''}
                </div>

                <div class="section">
                  <div class="section-title">Próximos Pasos</div>
                  <div class="section-text">
                    Nuestro equipo de especialistas en eventos se pondrá en contacto contigo en las próximas 24 horas para confirmar la disponibilidad y coordinar tu visita a nuestras instalaciones. Te mostraremos todos los espacios y servicios que ofrecemos para hacer de tu evento una experiencia inolvidable.
                  </div>
                </div>

                <div class="section">
                  <div class="section-title">Preguntas o Cambios</div>
                  <div class="section-text">
                    Si necesitas hacer algún cambio en tu solicitud o tienes preguntas antes de que nos comuniquemos, por favor responde a este correo o contáctanos directamente.
                  </div>
                </div>

                <div class="footer-divider"></div>
                
                <div class="footer-text">
                  <strong>LA CAPILLA HOTEL</strong><br>
                  Creando momentos extraordinarios<br><br>
                  <a href="tel:+524777347474" class="contact-link">+52 4777 34 7474</a><br>
                  <a href="mailto:lacapillasl@gmail.com" class="contact-link">lacapillasl@gmail.com</a><br><br>
                  Este es un correo automático. Por favor no respondas directamente a esta dirección.
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USERNAME || 'audit3674@gmail.com',
        to: email,
        subject: 'Confirmación de Solicitud de Visita - La Capilla Hotel',
        html: htmlContent,
      };
      transporter.sendMail(mailOptions).catch(err => console.warn('Email not sent:', err.message));
    } catch (emailErr) {
      console.warn('Email error:', emailErr.message);
    }

    res.status(201).json({ success: true, visit });
  } catch (err) {
    next(err);
  }
};

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
    if (!['pending','confirmed','cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const visit = await WeddingVisit.findByIdAndUpdate(id, { status }, { new: true });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    res.json({ success: true, visit });
  } catch (err) {
    next(err);
  }
};

// Admin: update any visit fields
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

// Admin: delete a visit
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
