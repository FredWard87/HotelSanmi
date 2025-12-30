// components/StripePaymentModal.js
import React, { useState, useCallback } from 'react';
import { loadStripe } from '@stripe/js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import '../css/StripePaymentModal.css';
import { createPaymentIntent, createBooking } from '../../services/bookingService';
import { formatMXN } from '../../services/roomData';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// Función auxiliar para calcular impuestos con municipal
const calculateTaxes = (subtotal) => {
  const tax = subtotal * 0.16; // IVA 16%
  const municipalTax = subtotal * 0.04; // Impuesto municipal 4%
  const totalPrice = subtotal + tax + municipalTax;
  
  return {
    tax,
    municipalTax,
    totalPrice
  };
};

const CardPaymentForm = ({ amount, bookingData, onSuccess, onError, isProcessing, setIsProcessing }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState(null);

  // Calcular impuestos para mostrar en resumen
  const taxes = calculateTaxes(bookingData.subtotal);

  const handlePayment = useCallback(async (e) => {
    e.preventDefault();
    setCardError(null);

    if (!stripe || !elements) {
      setCardError('Stripe no está cargado. Intenta de nuevo.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Crear Payment Intent en backend con el monto actualizado
      const { clientSecret, paymentIntentId } = await createPaymentIntent(amount);

      // 2. Confirmar pago con Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: `${bookingData.guestInfo.firstName} ${bookingData.guestInfo.lastName}`,
            email: bookingData.guestInfo.email,
          },
        },
      });

      if (error) {
        setCardError(error.message);
        setIsProcessing(false);
        return;
      }

      if (paymentIntent.status === 'succeeded') {
        // 3. Preparar datos de booking con impuestos municipales
        const bookingWithTaxes = {
          ...bookingData,
          subtotal: bookingData.subtotal,
          tax: taxes.tax, // IVA 16%
          municipalTax: taxes.municipalTax, // Impuesto municipal 4%
          totalPrice: taxes.totalPrice, // Total con ambos impuestos
          paymentIntentId: paymentIntent.id,
        };

        // 4. Crear reserva en BD con pago confirmado
        const bookingResponse = await createBooking(bookingWithTaxes);

        onSuccess(bookingResponse);
      } else {
        setCardError(`Estado del pago: ${paymentIntent.status}`);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Error en pago:', err);
      setCardError(err.message || 'Error procesando el pago');
      setIsProcessing(false);
      onError(err);
    }
  }, [stripe, elements, amount, bookingData, taxes, onSuccess, onError, setIsProcessing]);

  return (
    <form onSubmit={handlePayment} className="stripe-payment-form">
      <div className="form-group">
        <label className="input-label">Información de Tarjeta</label>
        <div className="card-element-container">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': { color: '#aab7c4' },
                },
                invalid: { color: '#fa755a' },
              },
            }}
          />
        </div>
      </div>

      {cardError && <div className="error-message">❌ {cardError}</div>}

      <div className="payment-summary">
        <h4>Resumen de Pago</h4>
        <div className="summary-line">
          <span>Subtotal ({bookingData.nights} noches × {formatMXN(bookingData.pricePerNight)})</span>
          <span>{formatMXN(bookingData.subtotal)}</span>
        </div>
        <div className="summary-line">
          <span>IVA (16%)</span>
          <span>{formatMXN(taxes.tax)}</span>
        </div>
        <div className="summary-line">
          <span>Impuesto Municipal (4%)</span> {/* NUEVO */}
          <span>{formatMXN(taxes.municipalTax)}</span> {/* NUEVO */}
        </div>
        <div className="summary-line total">
          <span>Total</span>
          <span>{formatMXN(taxes.totalPrice)}</span>
        </div>
        <div className="summary-line highlight">
          <span>💳 Pago Ahora (50%)</span>
          <span>{formatMXN(amount)}</span>
        </div>
        <div className="summary-line info">
          <span>📝 Pagar en Recepción (50%)</span>
          <span>{formatMXN(taxes.totalPrice - amount)}</span>
        </div>
      </div>

      <button type="submit" className="luxury-pay-btn stripe-pay-btn" disabled={!stripe || isProcessing}>
        {isProcessing ? (
          <>
            <div className="luxury-spinner"></div>
            Procesando con Stripe...
          </>
        ) : (
          `Pagar ${formatMXN(amount)} con Tarjeta`
        )}
      </button>
    </form>
  );
};

const StripePaymentModal = ({ isOpen, bookingData, onClose, onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !bookingData) return null;

  // Calcular impuestos para determinar el pago inicial
  const taxes = calculateTaxes(bookingData.subtotal);
  const initialPayment = taxes.totalPrice * 0.5;

  return (
    <div className="modal-overlay stripe-overlay" onClick={onClose}>
      <div className="modal-container stripe-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header stripe-header">
          <div className="luxury-brand">
            <div className="brand-divider"></div>
            <span className="brand-text">LA CAPILLA - PAGO SEGURO</span>
            <div className="brand-divider"></div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <span>×</span>
          </button>
        </div>

        <div className="modal-content stripe-content">
          <div className="payment-info">
            <h3>Reserva en {bookingData.roomName}</h3>
            <p className="payment-subtitle">
              Pago seguro con Stripe • Se cobrará el 50% inicial • Paga el resto en recepción
            </p>
          </div>

          <Elements stripe={stripePromise}>
            <CardPaymentForm
              amount={initialPayment}
              bookingData={bookingData}
              onSuccess={onSuccess}
              onError={(err) => {
                console.error('Error:', err);
              }}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          </Elements>

          <div className="security-info">
            <div className="security-badge">🔒 Pago 100% Seguro</div>
            <p>
              Tu información de tarjeta es procesada por Stripe, el líder en seguridad de pagos.
              Nunca almacenamos tus datos de tarjeta.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripePaymentModal;