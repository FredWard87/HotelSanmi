import React, { useState, useEffect, useRef } from 'react';
import '../css/RoomCard.css';
import { formatMXN } from '../../services/roomData';

const RoomCard = ({ room, onViewDetails, isRecommended = false, priority = false }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    // Si la tarjeta tiene prioridad (ej. es de las primeras), 
    // la marcamos como visible de inmediato sin esperar al IntersectionObserver
    if (priority) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect(); // Una vez visible, dejamos de observar
          }
        });
      },
      { 
        threshold: 0.01, 
        rootMargin: '200px' // Carga la imagen 200px antes de que entre en pantalla
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Lógica para determinar si la habitación está disponible (opcional según tu backend)
  const isAvailable = room.status !== 'unavailable';

  return (
    <div
      ref={cardRef}
      className={`room-card ${isRecommended ? 'recommended' : ''} ${isVisible ? 'visible' : 'reveal'} ${!isAvailable ? 'unavailable' : ''}`}
    >
      {/* Badge de Recomendado */}
      {isRecommended && <div className="recommended-badge">RECOMENDADO</div>}

      {/* Badge de Disponibilidad */}
      <div className={`availability-badge ${isAvailable ? 'available' : 'unavailable'}`}>
        {isAvailable ? (
          <span className="available-text">● Disponible</span>
        ) : (
          <span className="unavailable-text">● No Disponible</span>
        )}
      </div>

      <div className="room-image-container">
        {isVisible ? (
          <img
            src={room.images && room.images[0] ? room.images[0] : 'https://via.placeholder.com/800x600?text=No+Image'}
            alt={room.name}
            className={`room-image ${imageLoaded ? 'loaded' : ''} ${!isAvailable ? 'grayscale' : ''}`}
            onLoad={() => setImageLoaded(true)}
            // Optimización nativa del navegador
            loading={priority ? "eager" : "lazy"} 
            fetchpriority={priority ? "high" : "low"}
            decoding="async"
          />
        ) : (
          <div className="image-placeholder"></div>
        )}
        
        {/* Efecto Shimmer/Pulse mientras carga la imagen */}
        {!imageLoaded && isVisible && <div className="image-placeholder"></div>}
      </div>

      <div className="room-info-panel">
        <div className="room-header">
          <span className="room-type-label">HABITACIÓN {room.type || 'PREMIUM'}</span>
          <h3 className="room-title">
            {room.name.includes('Suite') ? room.name : `${room.name}`}
          </h3>
        </div>

        <div className="room-specs">
          <p className="room-capacity">
            <span className="spec-icon">👥</span> {room.capacity} Adultos
          </p>
          <p className="room-size">
            <span className="spec-icon">📐</span> {room.size}
          </p>
        </div>


        <div className="price-display">
          <div className="price-group">
            <span className="price-value price-small">{formatMXN(room.price)}</span>
          </div>
          <span className="price-period">POR NOCHE</span>
        </div>

        {!isAvailable && (
          <div className="unavailable-notice">Agotada para las fechas seleccionadas</div>
        )}

        <button 
          className={`reserve-btn ${!isAvailable ? 'disabled' : ''}`} 
          onClick={() => isAvailable && onViewDetails(room)}
          disabled={!isAvailable}
        >
          {isAvailable ? 'MÁS INFORMACIÓN' : 'NO DISPONIBLE'}
        </button>
      </div>
    </div>
  );
};

export default RoomCard;