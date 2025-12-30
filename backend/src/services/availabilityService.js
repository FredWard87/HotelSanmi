// services/availabilityService.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Verificar disponibilidad para un rango de fechas
export const checkAvailability = async (checkIn, checkOut, lugar = null) => {
  try {
    let url = `${API_URL}/rooms/availability?checkIn=${checkIn}&checkOut=${checkOut}`;
    if (lugar) {
      url += `&lugar=${lugar}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Error al verificar disponibilidad');
    }
    return await response.json();
  } catch (error) {
    console.error('Error en checkAvailability:', error);
    throw error;
  }
};

// Obtener habitaciones disponibles
export const getAvailableRooms = async (checkIn, checkOut, lugar = null) => {
  try {
    let url = `${API_URL}/rooms/available-rooms?checkIn=${checkIn}&checkOut=${checkOut}`;
    if (lugar) {
      url += `&lugar=${lugar}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Error al obtener habitaciones disponibles');
    }
    return await response.json();
  } catch (error) {
    console.error('Error en getAvailableRooms:', error);
    throw error;
  }
};

// Verificar disponibilidad específica de una habitación
export const checkRoomAvailability = async (roomId, checkIn, checkOut) => {
  try {
    const response = await fetch(
      `${API_URL}/rooms/admin/${roomId}/availability?start=${checkIn}&end=${checkOut}`
    );
    if (!response.ok) {
      throw new Error('Error al verificar disponibilidad de la habitación');
    }
    return await response.json();
  } catch (error) {
    console.error('Error en checkRoomAvailability:', error);
    throw error;
  }
};