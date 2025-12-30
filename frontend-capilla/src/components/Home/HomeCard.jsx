import React from 'react';
import '../css/LuxuryHome.css';

const HomeCard = ({ title, description, imageURL, onClick }) => {
  return (
    <div className="home-card-new-style" onClick={onClick}>
      <div className="card-image-container-new">
        <img 
          src={imageURL} 
          alt={`Imagen de ${title}`} 
          className="card-image-new"
        />
      </div>
      <div className="card-content-new">
        <h3 className="card-title-new">{title}</h3>
        <p className="card-description-new">{description}</p>
        <button className="card-cta-new">
          Ver Habitaciones
        </button>
      </div>
    </div>
  );
};

export default HomeCard;