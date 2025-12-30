import React from 'react';
import WeddingsList from './WeddingsList';
import './WeddingsAdmin.css';

export default function WeddingsAdmin() {
  return (
    <div className="weddings-admin">
      <header className="wa-header">
        <h2>Administración de Visitas - Bodas</h2>
        <p className="wa-sub">Ver, editar estado y eliminar solicitudes de visita</p>
      </header>
      <main>
        <WeddingsList />
      </main>
    </div>
  );
}
