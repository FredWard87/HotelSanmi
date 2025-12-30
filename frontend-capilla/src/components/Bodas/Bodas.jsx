// Bodas.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Bodas.css';
import VisitModal from './VisitModal';
import ContactModal from '../ContactModal/ContactModal';

import heroImage from '../../assets2/Bodas/9.jpg'; // Imagen del encabezado
import boda1 from '../../assets2/Bodas/1.jpeg';
import boda2 from '../../assets2/Bodas/2.JPG';
import boda3 from '../../assets2/Bodas/3.jpg';
import boda4 from '../../assets2/Bodas/4.jpg';
import boda5 from '../../assets2/Bodas/5.jpg';
import boda6 from '../../assets2/Bodas/6.jpg';
import destacado1 from '../../assets2/Bodas/7.jpeg';
import destacado2 from '../../assets2/Bodas/8.jpg';
import galeria1 from '../../assets2/Bodas/extra/1.jpg';
import galeria2 from '../../assets2/Bodas/extra/2.jpg';
import galeria3 from '../../assets2/Bodas/extra/4.jpg';
import galeria4 from '../../assets2/Bodas/extra/5.jpg';
import galeria5 from '../../assets2/Bodas/extra/7.jpg';
import galeria6 from '../../assets2/Bodas/extra/9.jpg';
import galeria7 from '../../assets2/Bodas/extra/10.jpg';
import galeria8 from '../../assets2/Bodas/compartida/2.jpg';
import galeria9 from '../../assets2/Bodas/compartida/4.jpg';
import momento1 from '../../assets2/Bodas/extra/3.jpg';
import momento2 from '../../assets2/Bodas/compartida/3.jpg';
import whatsIcon from '../../assets2/whats.jpg';
import homeLogo from '../../assets2/La-capilla-Hotel.png';

import footerImg from '../../assets2/La-Capialla-Hotel-Vector-scaled.png';
// Imagen para CTA Final
import ctaBackground from '../../assets2/Bodas/extra/1.jpg';

// Use project SVG assets for icons
import IconCeremonia from '../../assets2/iconossvg/Recurso-3.svg';
import IconStaff from '../../assets2/iconossvg/Recurso-8.svg';
import IconValet from '../../assets2/iconossvg/Recurso-17.svg';
import IconHotel from '../../assets2/iconossvg/Recurso-24.svg';
import IconJardin from '../../assets2/iconossvg/Recurso-25.svg';
import IconCoctel from '../../assets2/iconossvg/Recurso-27.svg';

const MenuIcon = () => (
  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

// Importar useAnimation del contexto si lo tienes, si no, crear un estado local
// const { animationsPaused } = useAnimation();

// Todas las imágenes excepto la 9 van en el carrusel
const images = [boda1, boda2, boda3, boda4, boda5, boda6, destacado1, destacado2];

// Componente del Carrusel (igual al de ReservaHome)
const LuxuryCarousel = () => {
  // Si tienes el contexto, descomenta esta línea:
  // const { animationsPaused } = useAnimation(); 
  const [isHovered, setIsHovered] = useState(false);
  const [animationsPaused] = useState(false); // Estado temporal si no tienes el contexto

  const shouldPause = animationsPaused || isHovered;

  return (
    <section className="luxury-carousel-section">
      <div className="luxury-text-top">
        <h2>
          Hay <span className="highlight">momentos</span> que se viven mejor rodeado de tus
          seres queridos. En <span className="highlight">La Capilla</span>, tu y tus invitados
          celebran, descansan y crean recuerdos sin moverse de lugar.
        </h2>
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
          {images.map((src, index) => (
            <div key={index} className={`luxury-slide slide-${index + 1}`}>
              <img 
                src={src} 
                alt={`Boda ${index + 1}`}
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}

          {images.map((src, index) => (
            <div key={`dup-${index}`} className={`luxury-slide slide-${index + 1}`}>
              <img 
                src={src} 
                alt={`Boda ${index + 1}`}
                loading="lazy"
                decoding="async"
              />
            </div>
          ))}
        </div>
      </div>

      
    </section>
  );
};

function Bodas() {
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
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

  const handleReservacion = () => {
    // Open Visit modal instead of navigating
    setShowVisitModal(true);
  };

  return (
    <div className={`App ${loaded ? 'loaded' : ''}`}>
      {/* Hero Section con imagen de fondo */}
      <header className="luxury-hero new-hero">
        <div 
          className="hero-background-luxury new-hero-bg"
          style={{
            background: `linear-gradient(135deg, rgba(26, 26, 26, 0.4) 0%, rgba(45, 45, 45, 0.4) 100%), url(${heroImage}) center/cover`
          }}
        ></div>
        <div className="hero-overlay new-hero-overlay"></div>
        
        <div className="hero-content-luxury new-hero-content">
          <div className="new-tagline-small">
            PLANIFICA TU BODA
          </div>
          
          <h1 className="new-hero-title">
            El lugar donde reúnes a quienes más amas para celebrar el día más importante de tu vida
          </h1>
        </div>
      </header>

      {/* Carrusel igual al de ReservaHome */}
      <LuxuryCarousel />

      

      {/* Momentos Section */}
      <section className="momentos-section">
        <h2 className="momentos-title">MOMENTOS INOLVIDABLES</h2>
      </section>

      {/* Destacados Section */}
      <section className="destacados-section">
        <div className="destacados-container">
          <div className="section-title-container">
            <div className="title-line"></div>
            <h2 className="section-title">Destacados</h2>
            <div className="title-line"></div>
          </div>

          <h3 className="destacados-subtitle">
            Un escenario diseñado para<br />celebrar tu gran día
          </h3>

          {/* Features Grid EN 3 COLUMNAS Y 2 FILAS */}
          <div className="features-grid-3x2">
            {/* Fila 1 */}
            <div className="feature-item-3x2">
              <img src={IconHotel} className="feature-icon" alt="Hotel Capacidad" />
              <h4 className="feature-title-3x2">Hotel Capacidad 88 personas</h4>
            </div>
            <div className="feature-item-3x2">
              <img src={IconStaff} className="feature-icon" alt="Staff" />
              <h4 className="feature-title-3x2">Staff de Limpieza</h4>
            </div>
            <div className="feature-item-3x2">
              <img src={IconJardin} className="feature-icon" alt="Jardín" />
              <h4 className="feature-title-3x2">Jardín Principal</h4>
            </div>
            
            {/* Fila 2 */}
            <div className="feature-item-3x2">
              <img src={IconCoctel} className="feature-icon" alt="Cóctel" />
              <h4 className="feature-title-3x2">Cóctel de Bienvenida 1 hora</h4>
            </div>
            <div className="feature-item-3x2">
              <img src={IconCeremonia} className="feature-icon" alt="Ceremonia" />
              <h4 className="feature-title-3x2">Ceremonia 1 Hora</h4>
            </div>
            <div className="feature-item-3x2">
              <img src={IconValet} className="feature-icon" alt="Valet Parking" />
              <h4 className="feature-title-3x2">Valet Parking</h4>
            </div>
          </div>

          {/* Images Grid */}
          <div className="images-grid">
            <div className="image-container">
              <img src={boda1} alt="Espacio para eventos 1" />
            </div>
            <div className="image-container">
              <img src={boda2} alt="Espacio para eventos 2" />
            </div>
          </div>
        </div>
      </section>

      <section className="galeria-momentos-section">
        <div className="galeria-momentos-container">
          {/* Título */}
          <div className="galeria-momentos-header">
            <h2 className="galeria-momentos-title">Cada momento es único</h2>
            <p className="galeria-momentos-text">
              Descubre los espacios donde tus sueños cobran vida
            </p>
          </div>

          {/* Grid de imágenes - Diseño masonry mejorado */}
          <div className="galeria-momentos-grid">
            <div className="galeria-momentos-item galeria-item-large">
              <img src={galeria1} alt="Momento 1" />
              <div className="galeria-momentos-overlay"></div>
            </div>
            
            <div className="galeria-momentos-item">
              <img src={galeria2} alt="Momento 2" />
              <div className="galeria-momentos-overlay"></div>
            </div>
            
            <div className="galeria-momentos-item">
              <img src={galeria3} alt="Momento 3" />
              <div className="galeria-momentos-overlay"></div>
            </div>
            
            <div className="galeria-momentos-item galeria-item-tall">
              <img src={galeria4} alt="Momento 4" />
              <div className="galeria-momentos-overlay"></div>
            </div>
            
            <div className="galeria-momentos-item">
              <img src={galeria5} alt="Momento 5" />
              <div className="galeria-momentos-overlay"></div>
            </div>
            
            <div className="galeria-momentos-item">
              <img src={galeria6} alt="Momento 6" />
              <div className="galeria-momentos-overlay"></div>
            </div>
            
            <div className="galeria-momentos-item">
              <img src={galeria7} alt="Momento 7" />
              <div className="galeria-momentos-overlay"></div>
            </div>
            
            <div className="galeria-momentos-item galeria-item-wide">
              <img src={galeria8} alt="Momento 8" />
              <div className="galeria-momentos-overlay"></div>
            </div>
            
            <div className="galeria-momentos-item">
              <img src={galeria9} alt="Momento 9" />
              <div className="galeria-momentos-overlay"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección de 2 imágenes con texto */}
      <section className="momentos-destacados-section">
        <div className="momentos-destacados-grid">
          <div className="momento-destacado-card">
            <div className="momento-destacado-image">
              <img src={momento1} alt="Ceremonia" />
            </div>
            <div className="momento-destacado-content">
              <h3 className="momento-destacado-title">Tu ceremonia soñada</h3>
              <p className="momento-destacado-description">
                Un espacio mágico donde cada promesa se convierte en un recuerdo eterno
              </p>
            </div>
          </div>
          
          <div className="momento-destacado-card">
            <div className="momento-destacado-image">
              <img src={momento2} alt="Recuerdos" />
            </div>
            <div className="momento-destacado-content">
              <h3 className="momento-destacado-title">Recuerdos eternos</h3>
              <p className="momento-destacado-description">
                Momentos que vivirán en tu corazón para siempre
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bodas-cta-section">
        <div 
          className="bodas-cta-background"
          style={{ backgroundImage: `url(${ctaBackground})` }}
        >
          <div className="bodas-cta-overlay"></div>
          <div className="bodas-cta-content">
            <h2 className="bodas-cta-title">Comienza a escribir tu historia</h2>
            <p className="bodas-cta-text">
              Tu día especial merece un lugar extraordinario
            </p>
            <button className="bodas-cta-button" onClick={handleReservacion}>
              Agenda tu visita
            </button>
          </div>
        </div>
      </section>

        {/* 🔥 FOOTER ACTUALIZADO CON MAPA GRANDE E ÍCONOS NEGROS */}
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
     </span>                <span>+52 4777 34 7474</span>
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

      <VisitModal isOpen={showVisitModal} onClose={() => setShowVisitModal(false)} />
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

export default Bodas;