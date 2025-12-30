import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Crear Payment Intent con Stripe en el backend
 * Retorna clientSecret para usar con Stripe Elements/Checkout
 */
export async function createPaymentIntent(amount) {
  try {
    const res = await axios.post(`${API_BASE}/api/bookings/payment-intent`, {
      amount, // En pesos mexicanos
      currency: 'mxn',
    });
    return res.data; // { clientSecret, paymentIntentId }
  } catch (err) {
    console.error('Error creando Payment Intent:', err);
    throw err;
  }
}

/**
 * Procesar reserva completa (guarda en BD y cobra 50% inicial con Stripe)
 * 🔥 ACTUALIZADO: Ahora maneja errores de disponibilidad (409)
 */
export async function createBooking(bookingData) {
  try {
    const res = await axios.post(`${API_BASE}/api/bookings`, bookingData);
    return res.data; // { success, bookingId, secondNightNote, ... }
  } catch (err) {
    console.error('Error creando booking:', err);
    
    // 🔥 Manejar error de disponibilidad específicamente
    if (err.response?.status === 409) {
      const errorMessage = err.response.data.message || 'Habitación no disponible para las fechas seleccionadas';
      throw new Error(errorMessage);
    }
    
    // Otros errores
    const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Error al crear la reserva';
    throw new Error(errorMessage);
  }
}

/**
 * Obtener detalles de una reserva por ID
 */
export async function getBooking(bookingId) {
  try {
    const res = await axios.get(`${API_BASE}/api/bookings/${bookingId}`);
    return res.data;
  } catch (err) {
    console.error('Error obteniendo booking:', err);
    throw err;
  }
}

/**
 * Marcar segunda noche como pagada (admin/recepción)
 */
export async function markSecondNightPaid(bookingId) {
  try {
    const res = await axios.patch(`${API_BASE}/api/bookings/${bookingId}/mark-paid`);
    return res.data;
  } catch (err) {
    console.error('Error marcando segunda noche como pagada:', err);
    throw err;
  }
}

/**
 * 🔥 NUEVA: Verificar disponibilidad de una habitación en tiempo real
 * Retorna información detallada sobre unidades disponibles, reservadas y bloqueadas
 */
export async function checkRoomAvailability(roomId, checkIn, checkOut) {
  try {
    const res = await axios.get(`${API_BASE}/api/bookings/availability`, {
      params: { roomId, checkIn, checkOut }
    });
    return res.data; 
    // {
    //   roomId,
    //   roomName,
    //   totalUnits,
    //   bookedUnits,
    //   blockedUnits,
    //   availableUnits,
    //   isAvailable,
    //   blocks: [...]
    // }
  } catch (err) {
    console.error('Error verificando disponibilidad:', err);
    
    // Retornar objeto con error en lugar de lanzar excepción
    return {
      available: false,
      isAvailable: false,
      error: err.response?.data?.message || 'Error al verificar disponibilidad',
      totalUnits: 0,
      availableUnits: 0,
      bookedUnits: 0,
      blockedUnits: 0
    };
  }
}

/**
 * 🔥 NUEVA: Obtener todas las reservas (admin)
 * Soporta filtros opcionales
 */
export async function getAllBookings(filters = {}) {
  try {
    const res = await axios.get(`${API_BASE}/api/bookings`, {
      params: filters // { status, startDate, endDate, limit }
    });
    return res.data;
  } catch (err) {
    console.error('Error obteniendo reservas:', err);
    throw err;
  }
}

/**
 * 🔥 NUEVA: Actualizar una reserva (admin)
 * Permite cambiar fechas, habitación, info del huésped, etc.
 */
export async function updateBooking(bookingId, updateData) {
  try {
    const res = await axios.patch(`${API_BASE}/api/bookings/${bookingId}`, updateData);
    return res.data;
  } catch (err) {
    console.error('Error actualizando booking:', err);
    
    // Manejar error de disponibilidad al cambiar fechas
    if (err.response?.status === 409) {
      const errorMessage = err.response.data.message || 'No hay disponibilidad para las nuevas fechas';
      throw new Error(errorMessage);
    }
    
    const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Error al actualizar la reserva';
    throw new Error(errorMessage);
  }
}

/**
 * 🔥 NUEVA: Cancelar una reserva
 */
export async function cancelBooking(bookingId, reason) {
  try {
    const res = await axios.delete(`${API_BASE}/api/bookings/${bookingId}/cancel`, {
      data: { reason }
    });
    return res.data;
  } catch (err) {
    console.error('Error cancelando booking:', err);
    const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Error al cancelar la reserva';
    throw new Error(errorMessage);
  }
}

/**
 * 🔥 NUEVA: Obtener estadísticas de reservas (admin)
 */
export async function getBookingStats(filters = {}) {
  try {
    const res = await axios.get(`${API_BASE}/api/bookings/stats`, {
      params: filters // { startDate, endDate }
    });
    return res.data;
  } catch (err) {
    console.error('Error obteniendo estadísticas:', err);
    throw err;
  }
}

/**
 * 🔥 NUEVA: Descargar voucher en PDF
 */
export async function downloadVoucher(bookingId) {
  try {
    const res = await axios.get(`${API_BASE}/api/bookings/download/${bookingId}`, {
      responseType: 'blob'
    });
    
    // Crear enlace de descarga
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Voucher_${bookingId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (err) {
    console.error('Error descargando voucher:', err);
    throw err;
  }
}

// 🔥 EXPORTACIONES ADICIONALES PARA GESTIÓN DE BLOQUEOS (ADMIN)

/**
 * Obtener todos los bloqueos de habitaciones
 */
export async function getAllRoomBlocks(filters = {}) {
  try {
    const res = await axios.get(`${API_BASE}/api/room-blocks`, {
      params: filters // { roomId, active, startDate, endDate }
    });
    return res.data;
  } catch (err) {
    console.error('Error obteniendo bloqueos:', err);
    throw err;
  }
}

/**
 * Obtener bloqueos de una habitación específica
 */
export async function getRoomBlocks(roomId, params = {}) {
  try {
    const res = await axios.get(`${API_BASE}/api/room-blocks/room/${roomId}`, {
      params // { active, future }
    });
    return res.data;
  } catch (err) {
    console.error('Error obteniendo bloqueos de habitación:', err);
    throw err;
  }
}

/**
 * Crear un nuevo bloqueo de habitación
 */
export async function createRoomBlock(blockData) {
  try {
    const res = await axios.post(`${API_BASE}/api/room-blocks`, blockData);
    return res.data;
  } catch (err) {
    console.error('Error creando bloqueo:', err);
    const errorMessage = err.response?.data?.message || 'Error al crear bloqueo';
    throw new Error(errorMessage);
  }
}

/**
 * Actualizar un bloqueo existente
 */
export async function updateRoomBlock(blockId, updateData) {
  try {
    const res = await axios.put(`${API_BASE}/api/room-blocks/${blockId}`, updateData);
    return res.data;
  } catch (err) {
    console.error('Error actualizando bloqueo:', err);
    const errorMessage = err.response?.data?.message || 'Error al actualizar bloqueo';
    throw new Error(errorMessage);
  }
}

/**
 * Eliminar un bloqueo
 */
export async function deleteRoomBlock(blockId) {
  try {
    const res = await axios.delete(`${API_BASE}/api/room-blocks/${blockId}`);
    return res.data;
  } catch (err) {
    console.error('Error eliminando bloqueo:', err);
    const errorMessage = err.response?.data?.message || 'Error al eliminar bloqueo';
    throw new Error(errorMessage);
  }
}

/**
 * Verificar disponibilidad considerando bloqueos
 */
export async function checkRoomBlockAvailability(roomId, startDate, endDate) {
  try {
    const res = await axios.get(`${API_BASE}/api/room-blocks/availability/${roomId}`, {
      params: { startDate, endDate }
    });
    return res.data;
  } catch (err) {
    console.error('Error verificando disponibilidad con bloqueos:', err);
    throw err;
  }
}

/**
 * Limpiar bloqueos expirados (cron job / admin)
 */
export async function cleanExpiredBlocks() {
  try {
    const res = await axios.post(`${API_BASE}/api/room-blocks/clean-expired`);
    return res.data;
  } catch (err) {
    console.error('Error limpiando bloqueos expirados:', err);
    throw err;
  }
}