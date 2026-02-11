// services/discountCodeService.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Crear un nuevo código de descuento (simplificado)
 */
export async function createDiscountCode(codeData) {
  try {
    const res = await axios.post(`${API_BASE}/api/discount-codes`, codeData);
    return res.data;
  } catch (err) {
    console.error('Error creando código de descuento:', err);
    const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Error al crear código de descuento';
    throw new Error(errorMessage);
  }
}

/**
 * Obtener todos los códigos de descuento
 */
export async function getAllDiscountCodes(filters = {}) {
  try {
    const res = await axios.get(`${API_BASE}/api/discount-codes`, {
      params: filters // { active }
    });
    return res.data;
  } catch (err) {
    console.error('Error obteniendo códigos de descuento:', err);
    throw err;
  }
}

/**
 * 🔥 ACTUALIZADO: Validar código de descuento para una reserva
 * Ahora requiere checkIn y checkOut para validar contra las fechas de la reserva
 */
export async function validateDiscountCode(codeData) {
  try {
    console.log('📤 Enviando validación de código:', {
      code: codeData.code,
      nights: codeData.nights,
      totalPrice: codeData.totalPrice,
      roomId: codeData.roomId,
      checkIn: codeData.checkIn, // 🔥 AGREGADO
      checkOut: codeData.checkOut // 🔥 AGREGADO
    });

    const res = await axios.post(`${API_BASE}/api/discount-codes/validate`, {
      code: codeData.code,
      nights: codeData.nights,
      totalPrice: codeData.totalPrice,
      roomId: codeData.roomId,
      checkIn: codeData.checkIn, // 🔥 AGREGADO: Necesario para validar fechas de la reserva
      checkOut: codeData.checkOut // 🔥 AGREGADO: Necesario para validar fechas de la reserva
    });

    console.log('✅ Respuesta de validación:', res.data);
    
    return res.data;
  } catch (err) {
    console.error('Error validando código de descuento:', err);
    
    return {
      valid: false,
      message: err.response?.data?.message || 'Error al validar código de descuento'
    };
  }
}

/**
 * Actualizar código de descuento
 */
export async function updateDiscountCode(id, updateData) {
  try {
    const res = await axios.patch(`${API_BASE}/api/discount-codes/${id}`, updateData);
    return res.data;
  } catch (err) {
    console.error('Error actualizando código de descuento:', err);
    const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Error al actualizar código de descuento';
    throw new Error(errorMessage);
  }
}

/**
 * Eliminar código de descuento
 */
export async function deleteDiscountCode(id) {
  try {
    const res = await axios.delete(`${API_BASE}/api/discount-codes/${id}`);
    return res.data;
  } catch (err) {
    console.error('Error eliminando código de descuento:', err);
    const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Error al eliminar código de descuento';
    throw new Error(errorMessage);
  }
}
