import React from 'react';
import './ContactModal.css';

const ContactModal = ({ isOpen, label, number, onCall, onCopy, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="contact-modal-overlay" onClick={onClose}>
      <div className="contact-modal-container" onClick={(e) => e.stopPropagation()}>
        <button className="contact-modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="contact-modal-content">
          <div className="contact-modal-icon">☎️</div>
          
          <h2 className="contact-modal-title">
            Contacto <span className="highlight">{label}</span>
          </h2>

          <div className="contact-modal-number">
            <p className="contact-modal-number-text">{number}</p>
          </div>

          <p className="contact-modal-subtitle">
            Elige cómo deseas comunicarte con nosotros
          </p>

          <div className="contact-modal-buttons">
            <button 
              className="contact-modal-btn call-btn"
              onClick={onCall}
            >
              <span className="btn-icon">📞</span>
              <span className="btn-text">Llamar</span>
            </button>

            <button 
              className="contact-modal-btn copy-btn"
              onClick={onCopy}
            >
              <span className="btn-icon">📋</span>
              <span className="btn-text">Copiar número</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
