// ReservaHome.js - COMPLETO CON OPTIMIZACIONES
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../App.css';
import RoomCard from './RoomCard';
import BookingModal from './BookingModal';
import ContactModal from '../ContactModal/ContactModal';
import { fetchRooms, processPayment } from '../../services/roomData';
import '../css/RoomCard.css';
import '../css/BookingModal.css';
import { useAnimation } from '../../context/AnimationContext'; 
import img1 from '../../assets2/1.webp';
import img2 from '../../assets2/2.webp';
import img3 from '../../assets2/3.webp';
import img4 from '../../assets2/4.webp';
import img5 from '../../assets2/5.webp';
import img6 from '../../assets2/6.webp';
import img7 from '../../assets2/7.webp';
import portada from '../../assets2/portadashome/1.jpg';
import whatsIcon from '../../assets2/whats.jpg';
import homeLogo from '../../assets2/La-capilla-Hotel.png';

import footerImg from '../../assets2/La-Capialla-Hotel-Vector-scaled.png';


const images = [img1, img2, img3, img4, img5, img6, img7];

// Componente para el Panel de Búsqueda
const SearchPanel = () => {
  const [arrivalDate, setArrivalDate] = useState('');
  const [checkoutDate, setCheckoutDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  const handleSearch = (e) => {
  e.preventDefault();
  alert(
    `Buscando disponibilidad:
Llegada: ${arrivalDate}
Salida: ${checkoutDate}
Adultos: ${adults}
Niños: ${children}

Desplázate hacia abajo para ver las habitaciones`
  );
};


  return (
    <form className="luxury-search-panel" onSubmit={handleSearch}>
      <div className="search-field">
        <label htmlFor="arrivalDate">Fecha de llegada</label>
        <input 
          type="date" 
          id="arrivalDate" 
          value={arrivalDate} 
          onChange={(e) => setArrivalDate(e.target.value)} 
          required 
        />
      </div>
      <div className="search-field">
        <label htmlFor="checkoutDate">Fecha de Check-out</label>
        <input 
          type="date" 
          id="checkoutDate" 
          value={checkoutDate} 
          onChange={(e) => setCheckoutDate(e.target.value)} 
          required 
        />
      </div>
      <div className="search-field select-field">
        <label htmlFor="adults">Adultos</label>
        <select id="adults" value={adults} onChange={(e) => setAdults(e.target.value)}>
          {[...Array(5).keys()].map(i => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
      </div>
      <div className="search-field select-field">
        <label htmlFor="children">Niños</label>
        <select id="children" value={children} onChange={(e) => setChildren(e.target.value)}>
          {[...Array(5).keys()].map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>
      <button type="submit" className="search-btn">
        BUSCAR
      </button>
    </form>
  );
};

// Componente del Carrusel que responde al Context - VERSIÓN OPTIMIZADA
const LuxuryCarousel = () => {
  const { animationsPaused } = useAnimation(); 
  const [isHovered, setIsHovered] = useState(false);
  const [isCarouselVisible, setIsCarouselVisible] = useState(false);
  const carouselRef = useRef(null);

  const shouldPause = animationsPaused || isHovered;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsCarouselVisible(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    if (carouselRef.current) {
      observer.observe(carouselRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section className="luxury-carousel-section" ref={carouselRef}>
      <div className="luxury-text-top">
        <h2>El alma de un hogar, el respiro que necesitabas.</h2>
      </div>

      <div 
        className="luxury-carousel-wrapper"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div 
          className="luxury-carousel-track"
          style={{ 
            animationPlayState: shouldPause ? 'paused' : 'running' 
          }}
        >
          {isCarouselVisible ? (
            <>
              {images.map((src, index) => (
                <div key={index} className={`luxury-slide slide-${index + 1}`}>
                  <img 
                    src={src} 
                    alt={`Suite ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}

              {images.map((src, index) => (
                <div key={`dup-${index}`} className={`luxury-slide slide-${index + 1}`}>
                  <img 
                    src={src} 
                    alt={`Suite ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </>
          ) : (
            <div className="carousel-placeholder">
              <div className="carousel-loading">Cargando galería...</div>
            </div>
          )}
        </div>
      </div>

      <div className="luxury-text-bottom">
        <h3>Conoce la Casa Hotel</h3>
      </div>
    </section>
  );
};

function ReservaHome() {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactData, setContactData] = useState({ label: '', number: '' });
  const navigate = useNavigate();

  useEffect(() => {
    setLoaded(true);
    // Cargar habitaciones desde la API
    (async () => {
      try {
        const data = await fetchRooms();
        setRooms(data);
      } catch (err) {
        console.error('Error cargando habitaciones:', err);
      }
    })();

    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewDetails = (room) => {
    setSelectedRoom(room);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRoom(null);
  };

  const handleBook = async (bookingData) => {
    try {
      const result = await processPayment(bookingData.paymentInfo);
      
      if (result.success) {
        setTimeout(() => {
          handleCloseModal();
          alert(`🏨 ¡Reserva Confirmada en La Capilla!\n\n📋 ID de Reserva: ${result.bookingId}\n💳 Transacción: ${result.transactionId}\n💰 Total: $${bookingData.total.toLocaleString()} MXN\n📧 Confirmación enviada a: ${bookingData.guestInfo.email}\n\n¡Esperamos brindarle una experiencia excepcional!`);
        }, 1000);
      }
    } catch (error) {
      alert(`❌ Transacción Declinada\n\n${error.message}\n\nPor favor, verifique los datos de su tarjeta o utilice otro método de pago.`);
      throw error;
    }
  };

  const handleBackToMain = () => {
    navigate('/');
  };

  const handleGoToBoutique = () => {
    navigate('/boutique');
  };

  // Maneja la opción de llamar o copiar número
  const handleContactChoice = (number, label, e) => {
    e.preventDefault();
    setContactData({ label, number });
    setContactModalOpen(true);
  };

  const handleCallClick = () => {
    window.location.href = `tel:${contactData.number}`;
    setContactModalOpen(false);
  };

  const handleCopyClick = () => {
    const text = contactData.number;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text)
        .then(() => {
          setContactModalOpen(false);
          alert(`${text} copiado al portapapeles`);
        })
        .catch(() => alert('No se pudo copiar el número'));
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      try { document.execCommand('copy'); setContactModalOpen(false); alert(`${text} copiado al portapapeles`); } catch { alert('No se pudo copiar el número'); }
      document.body.removeChild(el);
    }
  };

  return (
    <div className={`App ${loaded ? 'loaded' : ''}`}>
      <header className="luxury-hero new-hero">
        <div 
          className="hero-background-luxury new-hero-bg"
          style={{
            background: `linear-gradient(135deg, rgba(26, 26, 26, 0.4) 0%, rgba(45, 45, 45, 0.4) 100%), url(${portada}) center/cover`
          }}
        ></div>
        <div className="hero-overlay new-hero-overlay"></div>
        
        <div className="hero-content-luxury new-hero-content">
          <div className="new-tagline-small">
            UN REFUGIO CÁLIDO EN EL CORAZÓN DEL BAJÍO
          </div>
          
          <h1 className="new-hero-title">
            Donde cada rincón te hace sentir en casa
          </h1>
          
          <SearchPanel />
        </div>
      </header>

      <LuxuryCarousel />

      <main className="luxury-main">
        <section id="suites" className="suites-section">
          <div className="section-header-luxury">
            <div className="section-ornament"></div>
            <h2 className="section-title-luxury">Nuestras Suites</h2>
            <p className="section-subtitle-luxury">
              Descubre nuestra colección de suites donde el lujo se encuentra con la comodidad, 
              y cada detalle está meticulosamente diseñado para su placer.
            </p>
            <div className="section-ornament"></div>
          </div>

          <div className="suites-list"> 
            {rooms.map((room) => (
              <RoomCard
                key={room._id || room.id}
                room={room}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        </section>
      </main>

      <section className="boutique-section">
        <div className="boutique-content">
          <p className="boutique-text">
            ¿Buscas una experiencia diferente? Descubre nuestro <strong>HOTEL BOUTIQUE</strong>, donde la elegancia y la calma transforman cada instante.
          </p>
          <button className="boutique-btn" onClick={handleGoToBoutique}>
            Ver Hotel Boutique
          </button>
        </div>
      </section>

      <footer className="luxury-footer">
        <div className="footer-content-luxury">
          
          <div className="footer-left">
            <div className="footer-brand">
              <div className="footer-logo-image">
                <img src={footerImg} alt="La Capilla Hotel Logo" className="luxury-logo" />
              </div>
            </div>
            
            <div className="footer-contact-list">
              <a href="https://wa.me/524777347474" className="footer-contact-item">
                <span className="contact-icon">
                  <img 
                    src={whatsIcon} 
                    alt="WhatsApp" 
                    style={{ width: '20px', height: '20px', verticalAlign: 'middle' }} 
                  />
                </span>
                <span>+52 4777 34 7474</span>
              </a>
              <a href="#" className="footer-contact-item" onClick={(e) => handleContactChoice('+524181789398', 'Lobby', e)}>
                <span className="contact-icon" style={{ color: '#000' }}>✆</span>
                <span>Lobby</span>
              </a>
              <a href="#" className="footer-contact-item" onClick={(e) => handleContactChoice('+524181324886', 'Bodas', e)}>
                <span className="contact-icon" style={{ color: '#000' }}>✆</span>
                <span>Bodas</span>
              </a>
              <a href="mailto:lacapillasl@gmail.com" className="footer-contact-item">
                <span className="contact-icon" style={{ color: '#000' }}>✉️</span>
                <span>lacapillasl@gmail.com</span>
              </a>
            </div>
          </div>
          
          <div className="map-container-large">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3721.528157656598!2d-100.85089992496557!3d21.131369580543762!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x842b396ed04be78f%3A0x762e7b72784e7cc5!2sLa%20Capilla%20Hotel!5e0!3m2!1ses-419!2smx!4v1762517651261!5m2!1ses-419!2smx"
              width="100%"
              height="100%"
              style={{border:0}}
              allowFullScreen=""
              loading="lazy"
              title="La Capilla Hotel Location"
            ></iframe>
          </div>    
        </div>

        <div className="footer-bottom-luxury">
          <p>© COPYRIGHT LA CAPILLA HOTEL 2025</p>
        </div>
      </footer>

      {showScrollTop && (
        <button className="luxury-scroll-top" onClick={scrollToTop}>
          <span className="scroll-icon">↑</span>
        </button>
      )}

      <BookingModal
        room={selectedRoom}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onBook={handleBook}
      />
      <ContactModal
        isOpen={contactModalOpen}
        label={contactData.label}
        number={contactData.number}
        onCall={handleCallClick}
        onCopy={handleCopyClick}
        onClose={() => setContactModalOpen(false)}
      />
    </div>
  );
}
export default ReservaHome;