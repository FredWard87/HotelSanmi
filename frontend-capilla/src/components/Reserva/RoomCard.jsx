import React, { useState, useEffect, useRef } from 'react';
import '../css/RoomCard.css';
import { formatMXN } from '../../services/roomData';

const RoomCard = ({ room, onViewDetails, isRecommended = false }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const cardRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Solo cargar la imagen cuando la tarjeta es visible
            if (room.images && room.images[0]) {
              setImageSrc(room.images[0]);
            }
            observer.disconnect();
          }
        });
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Comenzar a cargar un poco antes
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [room.images]);

  return (
    <div
      ref={cardRef}
      className={`room-card ${isRecommended ? 'recommended' : ''} ${isVisible ? 'visible' : 'reveal'}`}
    >
      <div className="room-image-container">
        {isVisible ? (
          <img
            ref={imageRef}
            src={imageSrc}
            alt={room.name}
            className={`room-image ${imageLoaded ? 'loaded' : ''}`}
            onLoad={() => setImageLoaded(true)}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="image-placeholder"></div>
        )}
      </div>

      <div className="room-info-panel">
        <h3 className="room-title">
          {room.name.includes('Suite') ? room.name : `${room.name} `}
        </h3>

        <p className="room-capacity">{room.capacity} Adultos</p>
        <p className="room-size">{room.size}</p>

        <div className="price-display">
          <div className="price-group">
            {/* 🔥 PRECIO REDUCIDO 60% - Nueva clase */}
            <span className="price-value price-small">{formatMXN(room.price)}</span>
          </div>
          <span className="price-period">POR NOCHE</span>
        </div>

        <button className="reserve-btn" onClick={() => onViewDetails(room)}>
          MÁS INFORMACIÓN
        </button>
      </div>
    </div>
  );
};

export default RoomCard;