// components/BookingModal.js - CÓDIGO COMPLETO CON ZONA HORARIA CORREGIDA
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import '../css/BookingModal.css';
import '../css/PaymentStep.css';
import { fetchRooms, formatMXN } from '../../services/roomData';
import { createBooking, checkRoomAvailability, createPaymentIntent } from '../../services/bookingService';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAnimation } from '../../context/AnimationContext';
import SecondNightVoucher from './SecondNightVoucher';

// Importar Font Awesome
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers, 
  faBath,
  faChair
} from '@fortawesome/free-solid-svg-icons';

// Habitaciones icons
import IconWifi from '../../assets2/habitaciones/noun_wifi_4115433.png';
import IconTV from '../../assets2/habitaciones/noun_TV_1485615.png';
import IconShower from '../../assets2/habitaciones/noun_Shower_2884186.png';
import IconBed from '../../assets2/habitaciones/noun_Bed_1135101.png';
import IconRoom from '../../assets2/habitaciones/noun_room_2578943.png';
import IconCity from '../../assets2/habitaciones/noun_City_4117559.png';
import Airew from '../../assets2/habitaciones/aire.svg';
import Mets from '../../assets2/habitaciones/metros.svg';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

// 🔥 FUNCIÓN PARA CONVERTIR FECHA LOCAL A ISO SIN CAMBIAR LA FECHA
const formatDateForBackend = (dateString) => {
  if (!dateString) return null;
  
  // Crear fecha en zona horaria local (sin conversión UTC)
  const [year, month, day] = dateString.split('-');
  const date = new Date(year, month - 1, day, 12, 0, 0); // Mediodía para evitar problemas
  
  return date.toISOString();
};

// 🔥 FUNCIÓN PARA MOSTRAR FECHA EN FORMATO LEGIBLE
const formatDateForDisplay = (dateString) => {
  if (!dateString) return '';
  
  const [year, month, day] = dateString.split('-');
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString('es-MX', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

// Función para verificar disponibilidad
const checkAvailability = async (roomId, checkIn, checkOut) => {
  try {
    return await checkRoomAvailability(roomId, checkIn, checkOut);
  } catch (error) {
    console.error('Error checking availability:', error);
    return { 
      available: false, 
      isAvailable: false,
      error: error.message || 'Error de conexión al verificar disponibilidad',
      totalUnits: 0,
      availableUnits: 0,
      bookedUnits: 0,
      blockedUnits: 0
    };
  }
};

// Función auxiliar para calcular impuestos CON MUNICIPAL
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

// Componente de formulario de pago con Stripe
const StripePaymentForm = ({ bookingData, onSuccess, onError, isProcessing, setIsProcessing }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState(null);

  const taxes = useMemo(() => {
    return calculateTaxes(bookingData.subtotal);
  }, [bookingData.subtotal]);

  const handlePayment = useCallback(async (e) => {
    e.preventDefault();
    setCardError(null);

    if (!stripe || !elements) {
      setCardError('Stripe no está disponible. Intenta de nuevo.');
      return;
    }

    setIsProcessing(true);

    try {
      // 🔥 CONVERTIR FECHAS A ISO MANTENIENDO LA FECHA LOCAL
      const checkInISO = formatDateForBackend(bookingData.checkIn);
      const checkOutISO = formatDateForBackend(bookingData.checkOut);

      // Verificar disponibilidad antes de procesar pago
      const availability = await checkRoomAvailability(
        bookingData.roomId,
        checkInISO,
        checkOutISO
      );

      if (!availability.isAvailable) {
        setCardError(
          availability.error || 
          `❌ Esta habitación ya no está disponible para las fechas seleccionadas. Disponibles: ${availability.availableUnits || 0}/${availability.totalUnits || 0}`
        );
        setIsProcessing(false);
        return;
      }

      // Crear Payment Intent
      const { clientSecret, paymentIntentId } = await createPaymentIntent(bookingData.initialPayment);

      // Confirmar pago con Stripe
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
        // 🔥 Crear booking con fechas ISO correctas
        const bookingResponse = await createBooking({
          roomId: bookingData.roomId,
          roomName: bookingData.roomName,
          guestInfo: bookingData.guestInfo,
          checkIn: checkInISO,  // 🔥 Fecha convertida correctamente
          checkOut: checkOutISO, // 🔥 Fecha convertida correctamente
          nights: bookingData.nights,
          pricePerNight: bookingData.pricePerNight,
          subtotal: bookingData.subtotal,
          tax: taxes.tax,
          municipalTax: taxes.municipalTax,
          totalPrice: taxes.totalPrice,
          paymentIntentId: paymentIntent.id,
        });

        onSuccess(bookingResponse);
      } else {
        setCardError(`Estado del pago: ${paymentIntent.status}`);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('Error en pago:', err);
      
      if (err.message && err.message.includes('no está disponible')) {
        setCardError('❌ ' + err.message);
      } else {
        setCardError(err.message || 'Error procesando el pago');
      }
      
      setIsProcessing(false);
      onError(err);
    }
  }, [stripe, elements, bookingData, taxes, onSuccess, onError, setIsProcessing]);

  return (
    <form onSubmit={handlePayment} className="stripe-form">
      <div className="form-group">
        <label className="input-label">Información de Tarjeta (Crédito o Débito)</label>
        <div className="card-element-wrapper">
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

      {cardError && <div className="error-alert">❌ {cardError}</div>}

      <div className="payment-breakdown">
        <div className="room-summary">
          <div className="room-thumb">
            {bookingData.roomImage ? <img src={bookingData.roomImage} alt={bookingData.roomName} /> : <div style={{width:'100%',height:'100%',background:'#eee'}} />}
          </div>
          <div className="room-meta">
            <div className="room-name">{bookingData.roomName}</div>
            <div className="room-details">{formatMXN(bookingData.pricePerNight)} / noche • {bookingData.nights} {bookingData.nights === 1 ? 'noche' : 'noches'}</div>
            {bookingData.capacity && <div className="room-extras">Capacidad: {bookingData.capacity} huésped(es)</div>}
            {bookingData.size && <div className="room-extras">Tamaño: {bookingData.size}</div>}
          </div>
        </div>

        <h4>Desglose del Pago</h4>
        <div className="breakdown-line">
          <span>Subtotal ({bookingData.nights} noches)</span>
          <span>{formatMXN(bookingData.subtotal)}</span>
        </div>
        <div className="breakdown-line">
          <span>IVA 16%</span>
          <span>{formatMXN(taxes.tax)}</span>
        </div>
        <div className="breakdown-line">
          <span>Impuesto Municipal 4%</span>
          <span>{formatMXN(taxes.municipalTax)}</span>
        </div>
        <div className="breakdown-line total">
          <span>Total de Reserva</span>
          <span>{formatMXN(taxes.totalPrice)}</span>
        </div>
        <div className="breakdown-line highlight">
          <span>{bookingData.secondNightPayment > 0 ? '💳 Pagar Ahora (50%)' : '💳 Pagar Ahora'}</span>
          <span className="amount">{formatMXN(bookingData.initialPayment)}</span>
        </div>
        {bookingData.secondNightPayment > 0 && (
          <div className="breakdown-line info">
            <span>📝 Pagar en Recepción (50%)</span>
            <span>{formatMXN(bookingData.secondNightPayment)}</span>
          </div>
        )}
      </div>

      <button type="submit" className="luxury-pay-btn stripe-btn" disabled={!stripe || isProcessing}>
        {isProcessing ? (
          <>
            <div className="spinner"></div>
            Procesando Pago Seguro...
          </>
        ) : (
          `Pagar ${formatMXN(bookingData.initialPayment)} con Stripe`
        )}
      </button>

      <p className="security-note">🔒 Tu pago es procesado de forma segura por Stripe. Nunca almacenamos tu información de tarjeta.</p>
    </form>
  );
};

// Componente principal BookingModal
const BookingModal = ({ room, isOpen, onClose, onBook }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestInfo, setGuestInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialRequests: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [imageOrientations, setImageOrientations] = useState({});
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [allRooms, setAllRooms] = useState([]);
  const [bookingResult, setBookingResult] = useState(null);
  const [showVoucher, setShowVoucher] = useState(false);
  
  const [availabilityChecking, setAvailabilityChecking] = useState(false);
  const [availabilityInfo, setAvailabilityInfo] = useState(null);
  const [availabilityError, setAvailabilityError] = useState(null);

  const { pauseAnimations, resumeAnimations } = useAnimation();

  const getImageOrientation = useCallback((imageUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = function() {
        const orientation = this.width > this.height ? 'horizontal' : 'vertical';
        resolve(orientation);
      };
      img.onerror = () => resolve('vertical');
      img.src = imageUrl;
    });
  }, []);

  // Verificar disponibilidad cuando cambian las fechas
  useEffect(() => {
    const verifyAvailability = async () => {
      if (!checkIn || !checkOut || !currentRoom) {
        setAvailabilityInfo(null);
        setAvailabilityError(null);
        return;
      }

      setAvailabilityChecking(true);
      setAvailabilityError(null);

      try {
        // 🔥 Convertir fechas a ISO antes de verificar
        const checkInISO = formatDateForBackend(checkIn);
        const checkOutISO = formatDateForBackend(checkOut);

        const result = await checkAvailability(
          currentRoom._id || currentRoom.id,
          checkInISO,
          checkOutISO
        );

        setAvailabilityInfo(result);

        if (!result.isAvailable) {
          setAvailabilityError(
            result.error || 
            `⚠️ Disponibilidad limitada: ${result.availableUnits || 0} de ${result.totalUnits || 0} unidades disponibles`
          );
        }
      } catch (error) {
        console.error('Error verificando disponibilidad:', error);
        setAvailabilityError('Error al verificar disponibilidad. Por favor intenta de nuevo.');
      } finally {
        setAvailabilityChecking(false);
      }
    };

    const timeoutId = setTimeout(verifyAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [checkIn, checkOut, currentRoom]);

  useEffect(() => {
    if (isOpen && room) {
      document.body.style.overflow = 'hidden';
      pauseAnimations();

      setCurrentStep(1);
      setCurrentRoom(room);
      setSelectedImage(0);
      setIsFullscreen(false);
      setCheckIn('');
      setCheckOut('');
      setGuestInfo({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        specialRequests: ''
      });
      setLoadedImages(new Set([0]));
      setBookingResult(null);
      setAvailabilityInfo(null);
      setAvailabilityError(null);

      const detectOrientations = async () => {
        const orientations = {};
        if (room.images) {
          for (let i = 0; i < Math.min(room.images.length, 10); i++) {
            try {
              const orientation = await getImageOrientation(room.images[i]);
              orientations[i] = orientation;
            } catch (error) {
              orientations[i] = 'vertical';
            }
          }
          setImageOrientations(orientations);
        }
      };
      
      detectOrientations();
    } else {
      document.body.style.overflow = 'unset';
      resumeAnimations();
    }
    
    return () => {
      document.body.style.overflow = 'unset';
      resumeAnimations();
    };
  }, [isOpen, room, getImageOrientation, pauseAnimations, resumeAnimations]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchRooms();
        if (mounted) setAllRooms(data);
      } catch (err) {
        console.error('Error fetching rooms:', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleImageChange = useCallback((index) => {
    setSelectedImage(index);
    if (currentRoom?.images) {
      setLoadedImages(prev => new Set([...prev, index]));
    }
  }, [currentRoom]);

  const getImageOrientationClass = useCallback((index) => {
    return imageOrientations[index] === 'horizontal' ? 'horizontal' : '';
  }, [imageOrientations]);

  const calculateNights = useMemo(() => {
    if (checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      return nights > 0 ? nights : 0;
    }
    return 0;
  }, [checkIn, checkOut]);

  const subtotal = useMemo(() => {
    return calculateNights * (currentRoom?.price || 0);
  }, [calculateNights, currentRoom]);

  const taxes = useMemo(() => {
    return calculateTaxes(subtotal);
  }, [subtotal]);

  const finalTotal = useMemo(() => {
    return taxes.totalPrice;
  }, [taxes]);

  const recommendedRooms = useMemo(() => {
    if (!currentRoom) return [];
    return allRooms.filter(r => String(r._id || r.id) !== String(currentRoom._id || currentRoom.id)).slice(0, 2);
  }, [currentRoom, allRooms]);

  const hasManyImages = currentRoom?.images && currentRoom.images.length > 6;

  const handleNextStep = useCallback(() => {
    if (currentStep === 1) {
      if (!checkIn || !checkOut) {
        alert('Por favor selecciona las fechas de tu estadía');
        return;
      }
      
      if (!availabilityInfo || !availabilityInfo.isAvailable) {
        alert(availabilityError || '⚠️ Esta habitación no está disponible para las fechas seleccionadas. Por favor elige otras fechas.');
        return;
      }
    }
    
    if (currentStep === 2 && (!guestInfo.firstName || !guestInfo.lastName || !guestInfo.email)) {
      alert('Por favor completa tu información personal');
      return;
    }
    
    setCurrentStep(prev => prev + 1);
  }, [currentStep, checkIn, checkOut, guestInfo, availabilityInfo, availabilityError]);

  const handlePreviousStep = useCallback(() => setCurrentStep(prev => prev - 1), []);

  const handlePaymentSuccess = useCallback((result) => {
    setBookingResult(result);
    setShowVoucher(true);
    
    // 🔥 Formatear fechas para mostrar correctamente
    const checkInFormatted = formatDateForDisplay(checkIn);
    const checkOutFormatted = formatDateForDisplay(checkOut);
    
    setTimeout(() => {
      alert(`🎉 ¡Reserva Confirmada!\n\n📋 ID: ${result.bookingId}\n📅 Check-in: ${checkInFormatted}\n📅 Check-out: ${checkOutFormatted}\n💳 Pagado: ${formatMXN(result.booking.initialPayment)}\n📧 Confirmación enviada a: ${guestInfo.email}\n\n¡Esperamos tu llegada!`);
    }, 500);

    setTimeout(() => {
      handleClose();
    }, 2000);
  }, [guestInfo, checkIn, checkOut]);

  const handleRoomChange = useCallback((newRoom) => {
    setCurrentRoom(newRoom);
    setSelectedImage(0);
    setIsFullscreen(false);
    setCheckIn('');
    setCheckOut('');
    setCurrentStep(1);
    setLoadedImages(new Set([0]));
    setAvailabilityInfo(null);
    setAvailabilityError(null);

    const detectOrientations = async () => {
      const orientations = {};
      if (newRoom.images) {
        for (let i = 0; i < Math.min(newRoom.images.length, 10); i++) {
          try {
            const orientation = await getImageOrientation(newRoom.images[i]);
            orientations[i] = orientation;
          } catch (error) {
            orientations[i] = 'vertical';
          }
        }
        setImageOrientations(orientations);
      }
    };
    
    detectOrientations();
  }, [getImageOrientation]);

  const handleFullscreen = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const handleNextImage = useCallback(() => {
    const nextIndex = (selectedImage + 1) % currentRoom.images.length;
    handleImageChange(nextIndex);
  }, [selectedImage, currentRoom, handleImageChange]);

  const handlePrevImage = useCallback(() => {
    const prevIndex = (selectedImage - 1 + currentRoom.images.length) % currentRoom.images.length;
    handleImageChange(prevIndex);
  }, [selectedImage, currentRoom, handleImageChange]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isFullscreen) return;
      
      if (e.key === 'Escape') {
        handleCloseFullscreen();
      } else if (e.key === 'ArrowRight') {
        handleNextImage();
      } else if (e.key === 'ArrowLeft') {
        handlePrevImage();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, handleCloseFullscreen, handleNextImage, handlePrevImage]);

  const handleImageLoad = useCallback((index, type = 'main') => {
    setLoadedImages(prev => new Set([...prev, index]));
    
    if (!imageOrientations[index] && currentRoom?.images[index]) {
      getImageOrientation(currentRoom.images[index]).then(orientation => {
        setImageOrientations(prev => ({
          ...prev,
          [index]: orientation
        }));
      });
    }
  }, [imageOrientations, currentRoom, getImageOrientation]);

  const handleClose = () => {
    setShowVoucher(false);
    setBookingResult(null);
    onClose();
  };

  if (!isOpen || !room || !currentRoom) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="luxury-brand">
              <div className="brand-divider"></div>
              <span className="brand-text">LA CAPILLA</span>
              <div className="brand-divider"></div>
            </div>

            <div className="steps-indicator">
              <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
                <div className="step-circle">1</div>
                <span className="step-label">Fechas</span>
              </div>
              <div className="step-connector"></div>
              <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
                <div className="step-circle">2</div>
                <span className="step-label">Huésped</span>
              </div>
              <div className="step-connector"></div>
              <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
                <div className="step-circle">3</div>
                <span className="step-label">Pago Stripe</span>
              </div>
            </div>

            <button className="close-btn" onClick={handleClose}><span>×</span></button>
          </div>

          <div className="modal-content">
            {currentStep === 1 && (
              <>
                <div className="step-content">
                  <div className="suite-gallery">
                    <div className="main-image-container" onClick={handleFullscreen}>
                      <img
                        src={currentRoom.images[selectedImage]}
                        alt={currentRoom.name}
                        className={`main-image ${getImageOrientationClass(selectedImage)} ${
                          loadedImages.has(selectedImage) ? 'loaded' : 'loading'
                        }`}
                        onLoad={() => handleImageLoad(selectedImage, 'main')}
                        loading="eager"
                        decoding="async"
                      />
                      <div className="image-counter">
                        {selectedImage + 1} / {currentRoom.images.length}
                      </div>
                      <div className="fullscreen-indicator">
                        <span className="fullscreen-icon">⛶</span>
                        Click para pantalla completa
                      </div>
                    </div>
                    
                    <div className={`thumbnail-strip ${hasManyImages ? 'many-images' : ''}`}>
                      {currentRoom.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`${currentRoom.name} ${index + 1}`}
                          className={`thumbnail ${selectedImage === index ? 'active' : ''} ${
                            loadedImages.has(index) ? 'loaded' : 'loading'
                          }`}
                          onClick={() => handleImageChange(index)}
                          onLoad={() => handleImageLoad(index, 'thumbnail')}
                          loading="lazy"
                          decoding="async"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="booking-details">
                    <div className="suite-header">
                      <h1 className="suite-title">{currentRoom.name}</h1>
                      <div className="suite-price">
                        <span className="price-amount">{formatMXN(currentRoom.price)}</span>
                        <span className="price-period"> POR NOCHE</span>
                      </div>
                    </div>

                    <div className="luxury-divider"></div>

                    <div className="date-selection-section">
                      <h3 className="section-title">SELECCIONA TUS FECHAS</h3>

                      <div className="date-inputs-luxury">
                        <div className="date-input-group">
                          <label className="input-label">CHECK-IN</label>
                          <div className="input-container">
                            <input
                              type="date"
                              value={checkIn}
                              onChange={(e) => setCheckIn(e.target.value)}
                              min={new Date().toISOString().split('T')[0]}
                              className="luxury-date-input"
                            />
                            <span className="input-icon">📅</span>
                          </div>
                        </div>

                        <div className="date-input-group">
                          <label className="input-label">CHECK-OUT</label>
                          <div className="input-container">
                            <input
                              type="date"
                              value={checkOut}
                              onChange={(e) => setCheckOut(e.target.value)}
                              min={checkIn || new Date().toISOString().split('T')[0]}
                              className="luxury-date-input"
                            />
                            <span className="input-icon">📅</span>
                          </div>
                        </div>
                      </div>

                      {availabilityChecking && (
                        <div className="availability-status checking">
                          <div className="spinner-small"></div>
                          <span>Verificando disponibilidad...</span>
                        </div>
                      )}

                      {availabilityInfo && !availabilityChecking && (
                        <div className={`availability-status ${availabilityInfo.isAvailable ? 'available' : 'unavailable'}`}>
                          {availabilityInfo.isAvailable ? (
                            <>
                              <span className="status-icon">✓</span>
                              <span>
                                ¡Disponible! {availabilityInfo.availableUnits} de {availabilityInfo.totalUnits} unidades disponibles
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="status-icon">✗</span>
                              <div className="unavailable-details">
                                <strong>No disponible para estas fechas</strong>
                                <div className="availability-breakdown">
                                  <div>Total de unidades: {availabilityInfo.totalUnits}</div>
                                  <div>Reservadas: {availabilityInfo.bookedUnits}</div>
                                  <div>Bloqueadas: {availabilityInfo.blockedUnits}</div>
                                  <div>Disponibles: {availabilityInfo.availableUnits}</div>
                                </div>
                                {availabilityInfo.blocks && availabilityInfo.blocks.length > 0 && (
                                  <div className="block-reasons">
                                    <strong>Motivos:</strong>
                                    {availabilityInfo.blocks.map((block, idx) => (
                                      <div key={idx} className="block-reason">
                                        • {block.reason || block.type}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {calculateNights > 0 && availabilityInfo?.isAvailable && (
                        <div className="luxury-summary">
                          <h4 className="summary-title">RESUMEN DE ESTADIA</h4>
                          <div className="summary-items">
                            <div className="summary-item">
                              <span>{formatMXN(currentRoom.price)} × {calculateNights} noches</span>
                              <span>{formatMXN(subtotal)}</span>
                            </div>
                            <div className="summary-item">
                              <span>IVA 16%</span>
                              <span>{formatMXN(taxes.tax)}</span>
                            </div>
                            <div className="summary-item">
                              <span>Impuesto Municipal 4%</span>
                              <span>{formatMXN(taxes.municipalTax)}</span>
                            </div>
                            <div className="summary-total">
                              <span>Total</span>
                              <span>{formatMXN(finalTotal)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      <button 
                        className="luxury-next-btn" 
                        onClick={handleNextStep}
                        disabled={!availabilityInfo?.isAvailable || availabilityChecking}
                      >
                        <span className="btn-text">CONTINUAR CON LA RESERVA</span>
                        <span className="btn-arrow">→</span>
                      </button>
                    </div>

                    <div className="services-included-section">
                      <div className="services-header">
                        <div className="services-ornament-left"></div>
                        <h3 className="services-title">Servicios Incluidos</h3>
                        <div className="services-ornament-right"></div>
                      </div>
                      
                      <div className="services-grid-minimal">
                        {currentRoom.amenities.map((amenity, index) => (
                          <div key={index} className="service-item-minimal">
                            <div className="service-icon-minimal">
                              {getAmenityIcon(amenity)}
                            </div>
                            <span className="service-name-minimal">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {recommendedRooms.length > 0 && (
                  <div className="recommended-rooms-section">
                    <div className="recommended-header">
                      <h3 className="recommended-title">Otras Suites que te pueden interesar</h3>
                      <p className="recommended-subtitle">Descubre más opciones exclusivas</p>
                    </div>
                    <div className="recommended-rooms-grid">
                      {recommendedRooms.map(recRoom => (
                        <div
                          key={recRoom._id || recRoom.id}
                          className="recommended-room-card"
                          onClick={() => handleRoomChange(recRoom)}
                        >
                          <img 
                            src={recRoom.images[0]} 
                            alt={recRoom.name} 
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="recommended-room-info">
                            <h4>{recRoom.name}</h4>
                            <div className="recommended-meta">
                              <span>{recRoom.size}</span>
                              <span>•</span>
                              <span>{recRoom.capacity} HUÉSPEDES</span>
                            </div>
                            <div className="recommended-price">
                              {formatMXN(recRoom.price)} / noche
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {currentStep === 2 && (
              <div className="step-content guest-step">
                <h3 className="section-title">INFORMACIÓN DEL HUESPED</h3>
                <div className="guest-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="input-label">Nombre</label>
                      <input
                        type="text"
                        value={guestInfo.firstName}
                        onChange={(e) => setGuestInfo({...guestInfo, firstName: e.target.value})}
                        className="luxury-input"
                        placeholder="Ingresa tu nombre"
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Apellido</label>
                      <input
                        type="text"
                        value={guestInfo.lastName}
                        onChange={(e) => setGuestInfo({...guestInfo, lastName: e.target.value})}
                        className="luxury-input"
                        placeholder="Ingresa tu apellido"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="input-label">Email</label>
                      <input
                        type="email"
                        value={guestInfo.email}
                        onChange={(e) => setGuestInfo({...guestInfo, email: e.target.value})}
                        className="luxury-input"
                        placeholder="tu@email.com"
                      />
                    </div>
                    <div className="form-group">
                      <label className="input-label">Teléfono</label>
                      <input
                        type="tel"
                        value={guestInfo.phone}
                        onChange={(e) => setGuestInfo({...guestInfo, phone: e.target.value})}
                        className="luxury-input"
                        placeholder="+52 123 456 7890"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="input-label">Solicitudes Especiales (Opcional)</label>
                    <textarea
                      value={guestInfo.specialRequests}
                      onChange={(e) => setGuestInfo({...guestInfo, specialRequests: e.target.value})}
                      className="luxury-textarea"
                      placeholder="¿Alguna petición especial para tu estancia?"
                      rows="4"
                    />
                  </div>
                </div>
                <div className="step-actions">
                  <button className="luxury-back-btn" onClick={handlePreviousStep}>
                    ← Anterior
                  </button>
                  <button className="luxury-next-btn" onClick={handleNextStep}>
                    <span className="btn-text">CONTINUAR A PAGO</span>
                    <span className="btn-arrow">→</span>
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="step-content payment-step">
                <h3 className="section-title">Pago Seguro con Stripe (50% INICIAL EN CASO 2 O MÁS NOCHES)</h3>
                {
                  (() => {
                    const initialPaymentVal = calculateNights === 1 ? finalTotal : finalTotal * 0.5;
                    const secondNightPaymentVal = calculateNights === 1 ? 0 : finalTotal * 0.5;
                    
                    return (
                      <Elements stripe={stripePromise}>
                        <StripePaymentForm
                          bookingData={{
                            roomId: currentRoom._id || currentRoom.id,
                            roomName: currentRoom.name,
                            roomImage: currentRoom.images && currentRoom.images[0],
                            capacity: currentRoom.capacity,
                            size: currentRoom.size,
                            description: currentRoom.description,
                            guestInfo,
                            checkIn, // 🔥 Mantener en formato YYYY-MM-DD
                            checkOut, // 🔥 Mantener en formato YYYY-MM-DD
                            nights: calculateNights,
                            pricePerNight: currentRoom.price,
                            subtotal: subtotal,
                            tax: taxes.tax,
                            totalPrice: finalTotal,
                            initialPayment: initialPaymentVal,
                            secondNightPayment: secondNightPaymentVal,
                          }}
                          onSuccess={handlePaymentSuccess}
                          onError={(err) => console.error('Payment error:', err)}
                          isProcessing={isProcessing}
                          setIsProcessing={setIsProcessing}
                        />
                      </Elements>
                    );
                  })()
                }

                <div className="step-actions">
                  <button className="luxury-back-btn" onClick={handlePreviousStep}>
                    ← Anterior
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isFullscreen && (
        <div className="fullscreen-overlay" onClick={handleCloseFullscreen}>
          <div className="fullscreen-container" onClick={(e) => e.stopPropagation()}>
            <button className="fullscreen-close-btn" onClick={handleCloseFullscreen}>
              <span>×</span>
            </button>
            
            <button className="fullscreen-nav-btn prev-btn" onClick={handlePrevImage}>
              ‹
            </button>
            
            <div className="fullscreen-image-container">
              <img
                src={currentRoom.images[selectedImage]}
                alt={currentRoom.name}
                className="fullscreen-image"
              />
              <div className="fullscreen-counter">
                {selectedImage + 1} / {currentRoom.images.length}
              </div>
            </div>
            
            <button className="fullscreen-nav-btn next-btn" onClick={handleNextImage}>
              ›
            </button>

            <div className="fullscreen-thumbnails">
              {currentRoom.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${currentRoom.name} ${index + 1}`}
                  className={`fullscreen-thumbnail ${selectedImage === index ? 'active' : ''}`}
                  onClick={() => handleImageChange(index)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {showVoucher && bookingResult && (
        <SecondNightVoucher
          booking={bookingResult.booking}
          onClose={handleClose}
        />
      )}
    </>
  );
};

const getAmenityIcon = (amenity) => {
  const lowerAmenity = (amenity || '').toLowerCase();
  
  const iconStyle = {
    width: '24px',
    height: '24px',
    filter: 'brightness(0) saturate(100%)',
    objectFit: 'contain'
  };

  const faStyle = {
    fontSize: '24px',
    color: '#000000ff',
    width: '24px',
    height: '24px'
  };

  if (lowerAmenity.includes('wifi') || lowerAmenity.includes('wi-fi')) 
    return <img src={IconWifi} alt="wifi" style={iconStyle} />;
  
  if (lowerAmenity.includes('tv') || lowerAmenity.includes('televisión') || lowerAmenity.includes('television') || lowerAmenity.includes('smart')) 
    return <img src={IconTV} alt="tv" style={iconStyle} />;
  
  if (lowerAmenity.includes('ducha') || lowerAmenity.includes('shower') || lowerAmenity.includes('baño') || lowerAmenity.includes('bath')) 
    return <img src={IconShower} alt="shower" style={iconStyle} />;
  
  if (lowerAmenity.includes('tina') || lowerAmenity.includes('bañera') || lowerAmenity.includes('bathtub') || lowerAmenity.includes('jacuzzi') || 
      lowerAmenity.includes('spa') || (lowerAmenity.includes('bath') && !lowerAmenity.includes('room'))) 
    return <FontAwesomeIcon icon={faBath} style={faStyle} />;
  
  if (lowerAmenity.includes('cama') || lowerAmenity.includes('bed') || lowerAmenity.includes('queen') || lowerAmenity.includes('king') || lowerAmenity.includes('sleep')) 
    return <img src={IconBed} alt="bed" style={iconStyle} />;
  
  if (lowerAmenity.includes('pax') || lowerAmenity.includes('huésped') || lowerAmenity.includes('huesped') || lowerAmenity.includes('capacidad') || 
      lowerAmenity.includes('person') || lowerAmenity.includes('people') || lowerAmenity.includes('guest') || 
      (lowerAmenity.includes('2') && (lowerAmenity.includes('person') || lowerAmenity.includes('pax') || lowerAmenity.includes('capacity')))) 
    return <FontAwesomeIcon icon={faUsers} style={faStyle} />;
  
  if (lowerAmenity.includes('ciudad') || lowerAmenity.includes('ubicación') || lowerAmenity.includes('city') || lowerAmenity.includes('location') || lowerAmenity.includes('view')) 
    return <img src={IconCity} alt="city" style={iconStyle} />;
  
  if (lowerAmenity.includes('terraza') || lowerAmenity.includes('balcón') || lowerAmenity.includes('balcon') || 
      lowerAmenity.includes('terrace') || lowerAmenity.includes('patio') || lowerAmenity.includes('deck') || 
      lowerAmenity.includes('outdoor') || lowerAmenity.includes('garden')) 
    return <FontAwesomeIcon icon={faChair} style={faStyle} />;
  
  if (lowerAmenity.includes('aire') || lowerAmenity.includes('acondicionado') || lowerAmenity.includes('air') || lowerAmenity.includes('conditioning') || lowerAmenity.includes('ac')) 
    return <img src={Airew} alt="aire acondicionado" style={{
      ...iconStyle,
      filter: 'invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(0%) contrast(100%)'
    }} />;
  
  if (lowerAmenity.includes('m²') || lowerAmenity.includes('m2') || lowerAmenity.includes('metros') || lowerAmenity.includes('tamaño') || 
      lowerAmenity.includes('size') || lowerAmenity.includes('sq') || lowerAmenity.includes('square') || 
      lowerAmenity.includes('45') || lowerAmenity.includes('50') || lowerAmenity.includes('25')) 
    return <img src={Mets} alt="metros cuadrados" style={{
      ...iconStyle,
      filter: 'invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(0%) contrast(100%)'
    }} />;
  
  if (lowerAmenity.includes('house') || lowerAmenity.includes('keeping') || lowerAmenity.includes('limpieza') || 
      lowerAmenity.includes('cleaning') || lowerAmenity.includes('service') || lowerAmenity.includes('maid')) 
    return <img src={IconRoom} alt="house keeping" style={iconStyle} />;

  return <img src={IconRoom} alt="amenity" style={iconStyle} />;
};

export default BookingModal;