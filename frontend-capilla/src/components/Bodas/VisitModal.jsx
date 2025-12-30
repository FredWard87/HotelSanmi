import React, { useState } from 'react';
import '../../components/css/VisitModal.css';
import { createVisit } from '../../services/weddingService';

const VisitModal = ({ isOpen, onClose }) => {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', guests: 50, eventDate: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); setSuccess(null); setLoading(true);
    try {
      const payload = { ...form, guests: Number(form.guests) };
      await createVisit(payload);
      setSuccess('Solicitud recibida. Nos pondremos en contacto pronto.');
      setForm({ fullName: '', email: '', phone: '', guests: 50, eventDate: '', message: '' });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Error enviando la solicitud');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="visit-modal-overlay" onClick={onClose}>
      <div className="visit-modal" onClick={e => e.stopPropagation()}>
        <button className="visit-close" onClick={onClose}>×</button>
        <h2>Agenda tu visita</h2>
        <p className="visit-sub">Completa los datos y te contactamos para confirmar la visita</p>

        <form className="visit-form" onSubmit={handleSubmit}>
          <div className="row">
            <label>Nombre completo</label>
            <input name="fullName" value={form.fullName} onChange={handleChange} required />
          </div>
          <div className="row">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="row">
            <label>Teléfono</label>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </div>
          <div className="row">
            <label>Número de invitados</label>
            <input name="guests" type="number" min={1} value={form.guests} onChange={handleChange} />
          </div>
          <div className="row">
            <label>Fecha de evento</label>
            <input name="eventDate" type="date" value={form.eventDate} onChange={handleChange} required />
          </div>
          <div className="row">
            <label>Mensaje (opcional)</label>
            <textarea name="message" value={form.message} onChange={handleChange} />
          </div>

          {error && <div className="visit-error">{error}</div>}
          {success && <div className="visit-success">{success}</div>}

          <div className="visit-actions">
            <button type="button" className="visit-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="visit-submit" disabled={loading}>{loading ? 'Enviando...' : 'Enviar solicitud'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VisitModal;
