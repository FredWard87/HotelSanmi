import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnimation } from '../../context/AnimationContext';
import HomeCard from './HomeCard';
import ReasonGridItem from './ReasonGridItem';
import ContactModal from '../ContactModal/ContactModal';
import '../css/LuxuryHome.css';
import '../../App.css'; 
import luxuryVideo from '../../assets2/V9 CAPILLA CUARTOS.mp4'; 
import whatsIcon from '../../assets2/whats.jpg';

import imgCarr1 from '../../assets2/1 FRONT PAGE/CARRUSEL FRONT PAGE/1.jpg';
import imgCarr3 from '../../assets2/1 FRONT PAGE/CARRUSEL FRONT PAGE/3.jpg';
import imgCarr4 from '../../assets2/1 FRONT PAGE/CARRUSEL FRONT PAGE/4.jpg';
import imgCarr5 from '../../assets2/1 FRONT PAGE/CARRUSEL FRONT PAGE/5.jpg';
import imgCarr6 from '../../assets2/1 FRONT PAGE/CARRUSEL FRONT PAGE/6.jpg';
import imgCarr7 from '../../assets2/1 FRONT PAGE/CARRUSEL FRONT PAGE/7.jpg';
import imgCarr8 from '../../assets2/1 FRONT PAGE/CARRUSEL FRONT PAGE/8.jpg';
import imgCarr9 from '../../assets2/1 FRONT PAGE/CARRUSEL FRONT PAGE/9.jpg';
import imgCarr10 from '../../assets2/1 FRONT PAGE/CARRUSEL FRONT PAGE/10.jpg';

import imgB1 from '../../assets2/1 FRONT PAGE/CARRUSEL BODAS/1.jpg';
import imgB2 from '../../assets2/1 FRONT PAGE/CARRUSEL BODAS/2.jpg';
import imgB3 from '../../assets2/1 FRONT PAGE/CARRUSEL BODAS/3.jpg';
import imgB4 from '../../assets2/1 FRONT PAGE/CARRUSEL BODAS/4.jpg';
import imgB5 from '../../assets2/1 FRONT PAGE/CARRUSEL BODAS/5.jpg';
import imgB6 from '../../assets2/1 FRONT PAGE/CARRUSEL BODAS/6.jpg';
import imgB7 from '../../assets2/1 FRONT PAGE/CARRUSEL BODAS/7.jpeg';
import imgB8 from '../../assets2/1 FRONT PAGE/CARRUSEL BODAS/8.JPG';

import imgRecorridos from '../../assets2/EXTRA/IMG_3023-min-2-scaled.jpg';
import imgAlberca from '../../assets2/EXTRA/ALBERCA/2.jpg';
import imgRutaVino from '../../assets2/1 FRONT PAGE/RUTA DEL VINO.jpg';
import imgFirePit from '../../assets2/IMAGENES/La Capilla Horizontal 3.jpg';

import bgBoutique from '../../assets2/CarruselBoutique/3.jpeg';
import bgCasa from '../../assets2/4.webp';

import footerImg from '../../assets2/La-Capialla-Hotel-Vector-scaled.png';

import iconServicio from '../../assets2/iconossvg/Recurso-23.svg';
import iconTaxi from '../../assets2/iconossvg/Recurso-17.svg';
import iconAeropuerto from '../../assets2/iconossvg/Recurso-19-1.svg';
import iconTransporte from '../../assets2/iconossvg/Recurso-18.svg';

const images = [imgCarr1, imgCarr3, imgCarr4, imgCarr5, imgCarr6, imgCarr7, imgCarr8, imgCarr9, imgCarr10];
const bodaImgs = [imgB1, imgB2, imgB3, imgB4, imgB5, imgB6, imgB7, imgB8];

const LuxuryCarousel = () => {
  const { animationsPaused } = useAnimation(); 
  const [isHovered, setIsHovered] = useState(false);

  // Combina la pausa global del context con la pausa local del hover
  const shouldPause = animationsPaused || isHovered;

  return (
    <section className="luxury-carousel-section">
      <div className="intro-section-luxury">
       <div className="luxury-text-top">
  <h2>
    Con una <span className="highlight">ubicación privilegiada</span> entre San Miguel de Allende y Dolores Hidalgo, 
    en la Ruta del Vino <span className="highlight">"Valle de la Independencia"</span>, en el Corazón de México.
  </h2>
</div>
      </div>
      {/* Carrusel que responde al estado de animaciones */}
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

          {/* Duplicamos para scroll infinito */}
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
        </div>
      </div>
      <br />
      <p className="section-subtitle-intro separation">
        <strong>DOLORES HIDALGO: SAN MIGUEL DE ALLENDE</strong>
      </p>
    </section>
  );
};

const BodaCarousel = () => {
  const { animationsPaused } = useAnimation(); 
  const [isHovered, setIsHovered] = useState(false);

  // Combina la pausa global del context con la pausa local del hover
  const shouldPause = animationsPaused || isHovered;

  return (
    <section className="luxury-carousel-section">
      <div className="section-header-intro">
        <h2 className="section-title-intro">
          Celebra tu boda en La Capilla Hotel
        </h2>
      </div>
      {/* Carrusel que responde al estado de animaciones */}
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
          {bodaImgs.map((src, index) => (
            <div key={index} className={`luxury-slide slide-${index + 1}`}>
              <img 
                src={src} 
                alt={`Suite ${index + 1}`}
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}

          {/* Duplicamos para scroll infinito */}
          {bodaImgs.map((src, index) => (
            <div key={`dup-${index}`} className={`luxury-slide slide-${index + 1}`}>
              <img 
                src={src} 
                alt={`Suite ${index + 1}`}
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
      </div>
      <p className="section-subtitle-intro">
        <strong>Planifica tu boda con nosotros</strong>
      </p>
    </section>
  );
};

function LuxuryHome() {
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactData, setContactData] = useState({ label: '', number: '' });

  useEffect(() => {
    setLoaded(true);
    
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigate = (path) => {
    navigate(path);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      
      {/* Sección 1: Video Hero */}
      <header className="separation">
        <section className="video-hero-luxury">
          <video 
            autoPlay 
            loop 
            muted 
            className="video-background-luxury"
            src={luxuryVideo} 
          >
            <source src="../../assets/V9 CAPILLA CUARTOS.mp4" type="video/mp4" />
          </video>
          <div className="hero-overlay-luxury"></div>
          
          <div className="hero-content-luxury-home">          
            <div className="luxury-brand-header-home">
              <div className="brand-ornament-home top"></div>
              <h1 className="luxury-hotel-name-home">Tu escapada entre viñedos</h1>
              <div className="brand-subtitle-home">LA CAPILLA HOTEL & VENUE</div>
              <div className="brand-ornament-home bottom"></div>
            </div>
          </div>
        </section>
      </header>

      <LuxuryCarousel />


      {/* Sección 2: Frase y Carrusel */}
      
      <main className="luxury-main-home">
        {/*<section className="intro-section-luxury">
          <div className="section-header-intro">
            <h2 className="section-title-intro">
              Con una ubicación privilegiada entre San Miguel de Allende y Dolores Hidalgo, en la Ruta del Vino "Valle de la Independencia", en el Corazón de México.
            </h2>
          </div>

          

          <p className="section-subtitle-intro">
              <strong>DOLORES HIDALGO: SAN MIGUEL DE ALLENDE</strong>
          </p>
        </section>*/}

        {/* Sección 3: Cards de Navegación */}
        <section className="events-section-luxury" style={{paddingTop: '120px'}}>
          <p className='events-description' style={{fontSize: '28px'}}> La Capilla Hotel no solo es un destino, es una experiencia en equilibrio con la naturaleza, la historia y el alma del Bajío.</p>
          <br />
          <p className='events-description' style={{fontSize: '20px'}}>Aquí encontraras un espacio donde lo cotidiano se detiene y la naturaleza toma el ritmo.</p>
        </section>

        <section className="navigation-cards-section-new">
          
          {/* Título de Referencia */}
          <div className="card-section-header">
            <h2 className="card-section-title">
              Elige tu estilo : comodidad hogareña o <br/> elegancia boutique?
            </h2>
          </div>
          
          <div className="cards-grid-new-luxury">
            <HomeCard
              title="Hotel Boutique"
              description="Hotel Boutique ofrece una experiencia sofisticada con 21 habitaciones elegantes y una experiencia más exclusiva."
              imageURL={bgBoutique}
              onClick={() => handleNavigate('/boutique')} 
            />
            <HomeCard
              title="Casa Hotel"
              description="La Casa Hotel te ofrece la calidez y la armonía de un hogar. Cuenta con 14 habitaciones acogedoras, perfectas para descansar, reconectar y disfrutar sin prisa."
              imageURL={bgCasa}
              onClick={() => handleNavigate('/reservas')}
            />
          </div>
        </section>
        <br />
        <br />
        <br />
        <br />

        <BodaCarousel />

        {/* Sección de Bodas */}
        {/*<section className="intro-section-luxury">
          <div className="section-header-intro">
            <h2 className="section-title-intro">
              Celebra tu boda en La Capilla Hotel
            </h2>
          </div>

          <div className="carousel-wrapper-home">
            
          </div>
          <p className="section-subtitle-intro">
              <strong>Planifica tu boda con nosotros</strong>
          </p>
        </section>*/}

        {/* Sección de Bodas/Eventos (Texto y Botón) */}
        <section className="events-section-luxury" style={{paddingTop: '120px'}}>
          <p className="events-description">
            Ofrecemos espacios exclusivos para ceremonias y recepciones, 
            desde jardines y terrazas hasta un elegante hotel boutique que 
            brinda el escenario perfecto para cada momento.
          </p>
          <p className="events-subtitle">
            Hospeda tus invitados con nosotros y evita traslados
          </p>
          <button 
            className="events-cta-btn"
            onClick={() => handleNavigate('/bodas')}
          >
            Ver Detalles de Bodas
          </button>
        </section>
        
        {/* Sección Más Razones para Quedarse (Grid de Imágenes) */}
        <section className="reasons-section-luxury">
          <div className="reasons-header">
            <h2 className="reasons-title">
              Más <span className="playfair-display">Razones</span> para quedarte
            </h2>
            <p className="reasons-subtitle">
              Cada amenidad y recorrido está diseñada para que vivas el momento.
            </p>
          </div>

          <div className="reasons-grid">
            {/* Fila superior, 2 columnas */}
            <ReasonGridItem title="Recorridos" imageURL={imgRecorridos} />
            <ReasonGridItem title="Alberca Climatizada" imageURL={imgAlberca} />
            
            {/* Fila inferior, 2 columnas */}
            <ReasonGridItem title="Ruta de Vino" imageURL={imgRutaVino} />
            <ReasonGridItem title="Fire Pit" imageURL={imgFirePit} />
          </div>
        </section>
        
        {/* Sección de Servicios de Lujo */}
        <section className="services-section">
          

          <div className="services-grid">
            <div className="service-card">
              <div className="service-icon">
                {/* ÍCONO PNG */}
                <img src={iconTransporte} alt="Ícono de Autobús" className="service-icon-img" /> 
              </div>
              <h3>Transporte Público</h3>
              <p>LEON 126 KM | QRO 132 KM | CDMX 349 KM</p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                {/* ÍCONO PNG */}
                <img src={iconTaxi} alt="Ícono de Taxi/Uber" className="service-icon-img" /> 
              </div>
              <h3>Taxi o Uber</h3>
              <p>Desde San Miguel de Allende & Dolores Hidalgo:: Disponibles con una duración aproximada de 20 minutos desde la central de autobuses.</p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                {/* ÍCONO PNG */}
                <img src={iconAeropuerto} alt="Ícono de Aeropuerto" className="service-icon-img" /> 
              </div>
              <h3>Aeropuerto Cercanos</h3>
              <p>Aeropuerto Internacional de Guanajuato (BJX): 68 KM, Aeropuerto Internacional de Querétaro (QRO): 89 KM</p>
            </div>
            
            <div className="service-card">
              <div className="service-icon">
                {/* ÍCONO PNG */}
                <img src={iconServicio} alt="Ícono de Equipaje/Transporte" className="service-icon-img" /> 
              </div>
              <h3>Servicio de Transporte de La Capilla</h3>
              <p>Ofrecemos traslado solo desde las centrales de autobuses de San Miguel de Allende y Dolores Hidalgo. Solicita este servicio al momento de tu reservación o en recepción, sujeto a disponibilidad (costo extra).</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer de Lujo (Reutilizado de ReservaHome) */}
      <footer className="luxury-footer">
        <div className="footer-content-luxury">
          
          {/* 1. COLUMNA IZQUIERDA - Logo y contacto */}
          <div className="footer-left">
            <div className="footer-brand">
              <div className="footer-logo-image">
                <img src={footerImg} alt="La Capilla Hotel Logo" className="luxury-logo" />
              </div>
            </div>
            
            {/* CONTACTO CON ÍCONOS NEGROS */}
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
          
          {/* 🔥 MAPA MÁS GRANDE */}
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

export default LuxuryHome;