import React, { useState } from 'react';
import { updateVisit, updateVisitStatus } from '../../../../services/weddingService';

export default function WeddingEditModal({ visit, onClose }) {
  const [form, setForm] = useState({
    fullName: visit.fullName || '',
    email: visit.email || '',
    phone: visit.phone || '',
    guests: visit.guests || '',
    eventDate: visit.eventDate ? new Date(visit.eventDate).toISOString().slice(0,10) : '',
    message: visit.message || '',
    status: visit.status || 'pending'
  });
  const [saving, setSaving] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async () => {
    setSaving(true);
    try {
      await updateVisit(visit._id, form);
      onClose();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const changeStatus = async (s) => {
    try {
      await updateVisitStatus(visit._id, s);
      onClose();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="wa-modal-backdrop">
      <div className="wa-modal">
        <header>
          <h3>Editar Solicitud</h3>
        </header>
        <div className="wa-modal-body">
          <label>Nombre</label>
          <input name="fullName" value={form.fullName} onChange={handle} />
          <label>Email</label>
          <input name="email" value={form.email} onChange={handle} />
          <label>Teléfono</label>
          <input name="phone" value={form.phone} onChange={handle} />
          <label>Invitados</label>
          <input name="guests" value={form.guests} onChange={handle} />
          <label>Fecha de Evento</label>
          <input type="date" name="eventDate" value={form.eventDate} onChange={handle} />
          <label>Mensaje</label>
          <textarea name="message" value={form.message} onChange={handle} />
          <label>Estado</label>
          <select name="status" value={form.status} onChange={handle}>
            <option value="pending">Pendiente</option>
            <option value="confirmed">Confirmado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        <footer className="wa-modal-footer">
          <button className="wa-btn" onClick={() => onClose()}>Cancelar</button>
          <button className="wa-btn" onClick={() => changeStatus('confirmed')}>Marcar Confirmado</button>
          <button className="wa-btn wa-primary" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </footer>
      </div>
    </div>
  );
}
