import React, { useEffect, useState } from 'react';
import { listVisits, getVisit, updateVisitStatus, deleteVisit } from '../../../../services/weddingService';
import WeddingEditModal from './WeddingEditModal';

export default function WeddingsList() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const data = await listVisits();
      setVisits(data);
    } catch (err) {
      console.error('Error loading visits', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleOpen = async (id) => {
    try {
      const v = await getVisit(id);
      setSelected(v);
      setShowEdit(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await updateVisitStatus(id, status);
      fetch();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta solicitud de visita? Esto no se puede deshacer.')) return;
    try {
      await deleteVisit(id);
      fetch();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="wa-list">
      {loading ? <div>Cargando...</div> : (
        <table className="wa-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Fecha Evento</th>
              <th>Invitados</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visits.map(v => (
              <tr key={v._id}>
                <td>{v.fullName}</td>
                <td>{new Date(v.eventDate).toLocaleDateString()}</td>
                <td>{v.guests || '—'}</td>
                <td>
                  <span className={`wa-badge wa-${v.status}`}>{v.status}</span>
                </td>
                <td>
                  <button className="wa-btn" onClick={() => handleOpen(v._id)}>Ver / Editar</button>
                  <button className="wa-btn wa-danger" onClick={() => handleDelete(v._id)}>Eliminar</button>
                  <select className="wa-select" value={v.status} onChange={(e) => handleStatus(v._id, e.target.value)}>
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showEdit && selected && (
        <WeddingEditModal visit={selected} onClose={() => { setShowEdit(false); setSelected(null); fetch(); }} />
      )}
    </div>
  );
}
