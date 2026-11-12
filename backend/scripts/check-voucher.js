// Verifica qué correo/PDF sale según el estado de pago. No envía correos reales.
// Uso: node scripts/check-voucher.js
const path = require('path');
const B = path.join(__dirname, '..');
const req = (m) => require(require.resolve(m, { paths: [B] }));
const sent = [];
req('nodemailer').createTransport = () => ({ sendMail: async (o) => { sent.push(o); return {}; }, verify: () => {} });
const PDFDocument = req('pdfkit');
const texts = []; const orig = PDFDocument.prototype.text;
PDFDocument.prototype.text = function (t, ...a) { texts.push(String(t)); return orig.call(this, t, ...a); };
const svc = require(path.join(B, 'src/services/pdfService.js'));

const base = { bookingId: 'LC-TEST', roomName: 'Junior Suite', checkIn: '2026-12-01', checkOut: '2026-12-03',
  guestInfo: { firstName: 'Ana', lastName: 'Prueba', email: 'x@example.com' }, subtotal: 5000, tax: 800, municipalTax: 200,
  totalPrice: 6000, createdAt: new Date() };

// [nombre, datos, textos que DEBEN salir (PDF o correo), regex que NO debe salir]
const cases = [
  ['2 noches sin anticipo (pending)', { nights: 2, paymentStatus: 'pending', initialPayment: 3000 },
    ['PAGO PENDIENTE', 'TOTAL A PAGAR'], /PAGADO|REALIZADO|Stripe|COMPLETADO|procesado/],
  ['1 noche sin pago (pending)', { nights: 1, paymentStatus: 'pending', initialPayment: 6000 },
    ['PAGO PENDIENTE'], /PAGADO|REALIZADO|Stripe|COMPLETADO|procesado/],
  ['anticipo con tarjeta 50%', { nights: 2, paymentStatus: 'partial', initialPayment: 3000, stripePaymentIntentId: 'pi_x' },
    ['PAGO INICIAL REALIZADO (50%)', 'Método: Stripe (Tarjeta)'], /Registrado en recepción/],
  ['anticipo en recepción 33%', { nights: 2, paymentStatus: 'partial', initialPayment: 2000 },
    ['PAGO INICIAL REALIZADO (33%)', 'PENDIENTE: PAGO EN RECEPCIÓN (67%)', 'Método: Registrado en recepción'], /Stripe|\(50%\)|50% restante/], // "penalización del 50%" es política, no pago
  ['pagada completa con tarjeta', { nights: 2, paymentStatus: 'completed', initialPayment: 6000, paymentIntentId: 'pi_y' },
    ['PAGO COMPLETO REALIZADO', 'Método de pago: Stripe (Tarjeta)'], /PAGO PENDIENTE/],
  ['gratuita', { nights: 2, paymentStatus: 'completed', isFree: true, initialPayment: 0, subtotal: 0, tax: 0, municipalTax: 0, totalPrice: 0 },
    ['RESERVA SIN COSTO', 'Esta reserva no requiere ningún pago'], /PAGADO|Stripe|REALIZADO/],
];

(async () => {
  let fail = 0;
  for (const [name, extra, must, mustNot] of cases) {
    sent.length = 0; texts.length = 0;
    const b = { ...base, ...extra };
    const pdf = await svc.generateVoucherPDF(b);
    await svc.sendVoucherEmail(b, pdf);
    const html = (sent[0]?.html || '').replace(/<style[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ');
    const all = texts.join('\n') + '\n' + html;
    const missing = must.filter((t) => !all.includes(t));
    const bad = all.match(mustNot);
    const ok = !missing.length && !bad;
    console.log(ok ? 'OK  ' : 'FAIL', name, missing.length ? `| falta: ${missing}` : '', bad ? `| sobra: ${bad[0]}` : '');
    if (!ok) fail++;
  }
  process.exit(fail ? 1 : 0);
})();
