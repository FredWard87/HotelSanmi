import React, { useState } from 'react';
import '../css/SecondNightVoucher.css';
import { formatMXN } from '../../services/roomData';

const SecondNightVoucher = ({ booking, onClose }) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!booking) return null;

  const checkOutDate = new Date(booking.checkOut).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const checkInDate = new Date(booking.checkIn).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/bookings/download/${booking.bookingId}`
      );
      
      if (!response.ok) throw new Error('Error descargando PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Voucher_${booking.bookingId}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error descargando PDF:', error);
      alert('Error descargando el voucher. Intenta de nuevo.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="voucher-overlay" onClick={onClose}>
      <div className="voucher-container" onClick={(e) => e.stopPropagation()}>
        <button className="voucher-close no-print" onClick={onClose}>×</button>

        <div className="voucher-content">
          {/* HEADER PREMIUM */}
          <div className="voucher-header-premium">
            <div className="voucher-logo-section">
              <div className="voucher-logo">LA CAPILLA</div>
              <div className="voucher-subtitle-luxury">Hotel Boutique</div>
            </div>
            <div className="voucher-badge">
              <span className="badge-label">VOUCHER DE PAGO</span>
              <span className="badge-value">50% PENDIENTE</span>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="voucher-divider-premium"></div>

          {/* RESERVATION ID - DESTACADO */}
          <div className="voucher-booking-id">
            <div className="id-label">NÚMERO DE RESERVA</div>
            <div className="id-value">{booking.bookingId}</div>
          </div>

          {/* SECCIÓN 1: INFORMACIÓN DEL HUÉSPED */}
          <div className="voucher-section">
            <h3 className="voucher-section-title">👤 INFORMACIÓN DEL HUÉSPED</h3>
            
            <div className="voucher-row">
              <span className="voucher-label">Nombre:</span>
              <span className="voucher-value">
                {booking.guestInfo.firstName} {booking.guestInfo.lastName}
              </span>
            </div>

            <div className="voucher-row">
              <span className="voucher-label">Email:</span>
              <span className="voucher-value">{booking.guestInfo.email}</span>
            </div>

            <div className="voucher-row">
              <span className="voucher-label">Teléfono:</span>
              <span className="voucher-value">{booking.guestInfo.phone || 'No registrado'}</span>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="voucher-divider"></div>

          {/* SECCIÓN 2: DETALLES DE LA ESTANCIA */}
          <div className="voucher-section">
            <h3 className="voucher-section-title">🛏️ DETALLES DE LA ESTANCIA</h3>
            
            <div className="voucher-row">
              <span className="voucher-label">Habitación:</span>
              <span className="voucher-value-highlight">{booking.roomName}</span>
            </div>

            <div className="voucher-row">
              <span className="voucher-label">Check-in:</span>
              <span className="voucher-value">{checkInDate}</span>
            </div>

            <div className="voucher-row">
              <span className="voucher-label">Check-out:</span>
              <span className="voucher-value">{checkOutDate}</span>
            </div>

            <div className="voucher-row">
              <span className="voucher-label">Noches:</span>
              <span className="voucher-value">{booking.nights}</span>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="voucher-divider"></div>

          {/* SECCIÓN 3: DESGLOSE DE PAGOS */}
          <div className="voucher-section">
            <h3 className="voucher-section-title">💳 DESGLOSE DEL PAGO</h3>
            
            <div className="voucher-price-row">
              <span>Subtotal ({booking.nights} noches)</span>
              <span>{formatMXN(booking.subtotal)}</span>
            </div>

            <div className="voucher-price-row">
              <span>Impuestos (IVA 16%)</span>
              <span>{formatMXN(booking.tax)}</span>
            </div>

            <div className="voucher-price-total">
              <span>TOTAL DE RESERVA</span>
              <span>{formatMXN(booking.totalPrice)}</span>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="voucher-divider"></div>

          {/* SECCIÓN 4: ESTADO DE PAGOS */}
          <div className="voucher-section">
            <h3 className="voucher-section-title">✓ ESTADO DE PAGOS</h3>
            
            <div className="payment-box completed">
              <div className="payment-status">
                <span className="payment-status-icon">✓</span>
                <span className="payment-status-text">PAGO INICIAL REALIZADO</span>
              </div>
              <div className="payment-details">
                <span>{formatMXN(booking.initialPayment)}</span>
                <span className="payment-method">Stripe (Tarjeta)</span>
              </div>
            </div>

            {booking.secondNightPayment > 0 && (
              <div className="payment-box pending">
                <div className="payment-status">
                  <span className="payment-status-icon">📋</span>
                  <span className="payment-status-text">PENDIENTE - PAGAR EN RECEPCIÓN</span>
                </div>
                <div className="payment-details pending-amount">
                  <span className="amount-highlight">{formatMXN(booking.secondNightPayment)}</span>
                  <span className="payment-date">Día: {checkOutDate}</span>
                </div>
              </div>
            )}
          </div>

          {/* DIVIDER */}
          <div className="voucher-divider"></div>

          {/* SECCIÓN 5: INSTRUCCIONES */}
          <div className="voucher-section">
            <h3 className="voucher-section-title">📌 INSTRUCCIONES IMPORTANTES</h3>
            
            <ol className="voucher-instructions">
              <li>Presenta este voucher <strong>impreso o en pantalla</strong> en la recepción</li>
              <li>Realiza el pago del <strong>50% restante</strong> en el momento del check-out</li>
              <li>Aceptamos: <strong>efectivo, crédito y débito</strong></li>
              <li>Recibe tu recibo final como comprobante del pago</li>
              <li>Conserva ambos documentos (inicial + final) para tus registros</li>
            </ol>
          </div>

          {/* DIVIDER */}
          <div className="voucher-divider"></div>

          {/* SECCIÓN 6: CONTACTO */}
          <div className="voucher-section">
            <h3 className="voucher-section-title">☎️ ¿PREGUNTAS O CAMBIOS?</h3>
            
            <div className="voucher-contact">
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <span>+52 4777 347474</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">💬</span>
                <span>WhatsApp: +52 4777 347474</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <span>lacapillasl@gmail.com</span>
              </div>
            </div>
          </div>

          {/* DIVIDER */}
          <div className="voucher-divider"></div>

          {/* FOOTER */}
          <div className="voucher-footer">
            <p className="footer-text">
              ✨ <strong>Este documento es tu comprobante oficial de pago</strong> ✨
            </p>
            <p className="footer-date">
              Generado: {new Date().toLocaleString('es-MX')}
            </p>
          </div>

          {/* BOTONES DE ACCIÓN - NO IMPRIMIR */}
          <div className="voucher-actions no-print">
            <button 
              className="btn-download"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <span className="spinner-small"></span>
                  Descargando...
                </>
              ) : (
                <>
                  📥 Descargar PDF
                </>
              )}
            </button>

            <button 
              className="btn-print"
              onClick={handlePrint}
            >
              🖨️ Imprimir
            </button>

            <button 
              className="btn-close-voucher"
              onClick={onClose}
            >
              ✓ Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecondNightVoucher;
