import React from 'react';
import '../css/LuxuryHome.css'; 

const ReasonGridItem = ({ title, imageURL }) => {
  return (
    <div className="reason-grid-item">
      <img 
        src={imageURL} 
        alt={title} 
        className="reason-image"
      />
      <div className="reason-overlay">
        <h4 className="reason-title">{title}</h4>
      </div>
    </div>
  );
};

export default ReasonGridItem;