// roomData.js - ACTUALIZADO CON DISPONIBILIDAD REAL
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Cargar todas las imágenes del directorio `src/assets2` para poder resolver
// dinámicamente las rutas que vienen desde la base de datos.
function buildImagesMap() {
  try {
    const req = require.context('../assets2', true, /\.(webp|jpe?g|svg|mp4)$/);
    const map = {};
    req.keys().forEach((key) => {
      map[key.replace('./', '')] = req(key);
    });
    return map;
  } catch (err) {
    // Si la app está en un entorno donde require.context no está disponible,
    // devolvemos un mapa vacío y las imágenes se mantendrán como rutas.
    return {};
  }
}

const imagesMap = buildImagesMap();

// ========================== HABITACIONES ==========================
export async function fetchRooms(lugar = null) {
  try {
    let url = `${API_BASE}/api/rooms`;
    if (lugar) {
      url += `?lugar=${lugar}`;
    }
    
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    
    const data = await res.json();

    // Resolver rutas de imagen
    const rooms = data.map((room) => ({
      ...room,
      images: Array.isArray(room.images)
        ? room.images.map((p) => {
            if (imagesMap[p]) {
              return imagesMap[p].default || imagesMap[p];
            }
            // Si no está en el mapa, intentar construir la ruta
            try {
              return require(`../assets2/${p}`);
            } catch {
              return p; // Mantener la ruta original
            }
          })
        : [],
    }));

    return rooms;
  } catch (error) {
    console.error('Error en fetchRooms:', error);
    return [];
  }
}

// ========================== DISPONIBILIDAD ==========================
// Verificar disponibilidad general
export const checkGeneralAvailability = async (checkIn, checkOut, lugar = null) => {
  try {
    let url = `${API_BASE}/api/rooms/availability?checkIn=${checkIn}&checkOut=${checkOut}`;
    if (lugar) {
      url += `&lugar=${lugar}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status} al verificar disponibilidad`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error en checkGeneralAvailability:', error);
    throw error;
  }
};

// Obtener habitaciones disponibles
export const fetchAvailableRooms = async (checkIn, checkOut, lugar = null) => {
  try {
    let url = `${API_BASE}/api/rooms/available-rooms?checkIn=${checkIn}&checkOut=${checkOut}`;
    if (lugar) {
      url += `&lugar=${lugar}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status} al obtener habitaciones disponibles`);
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Resolver rutas de imagen para las habitaciones disponibles
      const rooms = data.rooms.map((room) => ({
        ...room,
        images: Array.isArray(room.images)
          ? room.images.map((p) => {
              if (imagesMap[p]) {
                return imagesMap[p].default || imagesMap[p];
              }
              try {
                return require(`../assets2/${p}`);
              } catch {
                return p;
              }
            })
          : [],
      }));
      
      return {
        ...data,
        rooms
      };
    } else {
      throw new Error(data.error || 'Error en la respuesta del servidor');
    }
  } catch (error) {
    console.error('Error en fetchAvailableRooms:', error);
    throw error;
  }
};

// Verificar disponibilidad de una habitación específica
export const checkRoomAvailability = async (roomId, checkIn, checkOut) => {
  try {
    const response = await fetch(
      `${API_BASE}/api/rooms/admin/${roomId}/availability?start=${checkIn}&end=${checkOut}`
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Error ${response.status} al verificar disponibilidad`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error en checkRoomAvailability:', error);
    throw error;
  }
};

// Verificar disponibilidad alternativa (compatibilidad con código existente)
export const checkAvailability = async (roomId, checkIn, checkOut) => {
  try {
    // Primero intentamos la verificación exacta
    const result = await checkRoomAvailability(roomId, checkIn, checkOut);
    
    if (result && typeof result === 'object') {
      return {
        available: result.isAvailable || false,
        message: result.isAvailable 
          ? 'Suite disponible para las fechas seleccionadas' 
          : 'Suite no disponible para las fechas seleccionadas',
        rate: 0, // Se obtendrá del room directamente
        details: result
      };
    }
    
    // Fallback: verificar a través de fetchAvailableRooms
    const availabilityData = await fetchAvailableRooms(checkIn, checkOut);
    const room = availabilityData.rooms?.find(r => r._id === roomId || r.id === roomId);
    
    return {
      available: !!room,
      message: room ? 'Suite disponible para las fechas seleccionadas' : 'Suite no disponible para las fechas seleccionadas',
      rate: room?.price || 0,
      details: room
    };
  } catch (error) {
    console.error('Error en checkAvailability:', error);
    return {
      available: false,
      message: 'Error comprobando disponibilidad',
      rate: 0
    };
  }
};

// ========================== FORMATO DE MONEDA ==========================
export const formatMXN = (amount) => {
  if (amount === undefined || amount === null) return '$0';
  
  // Usar formato específico para México
  const formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  
  return formatter.format(amount).replace('MXN', '').trim();
};

export const formatMXNWithSymbol = (amount) => {
  if (amount === undefined || amount === null) return '$0';
  
  return `$${amount.toFixed(0).replace(/\d(?=(\d{3})+$)/g, '$&,')}`;
};

export const formatMXNSimple = (amount) => {
  if (amount === undefined || amount === null) return '$0';
  
  return `$${amount.toLocaleString('es-MX', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  })}`;
};

// Para mostrar precios con decimales cuando sea necesario
export const formatMXNWithDecimals = (amount) => {
  if (amount === undefined || amount === null) return '$0.00';
  
  return `$${amount.toLocaleString('es-MX', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

// ========================== PROCESAMIENTO DE PAGO ==========================
export const processPayment = (paymentData) => {
  return new Promise((resolve, reject) => {
    // Validación básica
    if (!paymentData || !paymentData.cardNumber || !paymentData.expiry || !paymentData.cvv) {
      reject({
        success: false,
        message: "Datos de tarjeta incompletos. Por favor, verifique la información.",
      });
      return;
    }

    // Simular procesamiento de pago
    setTimeout(() => {
      const randomSuccess = Math.random();
      
      if (randomSuccess < 0.05) { // 5% de probabilidad de fallo
        reject({
          success: false,
          message: "Transacción declinada. Por favor verifique los datos de su tarjeta o utilice otro método de pago.",
          code: "DECLINED",
          timestamp: new Date().toISOString(),
        });
      } else {
        // Generar IDs únicos
        const bookingId = `LC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        resolve({
          success: true,
          bookingId,
          transactionId,
          message: "Pago procesado exitosamente. Su reserva ha sido confirmada.",
          timestamp: new Date().toISOString(),
          details: {
            amount: paymentData.amount,
            currency: 'MXN',
            lastFour: paymentData.cardNumber.slice(-4),
            authCode: Math.random().toString(36).substr(2, 8).toUpperCase()
          }
        });
      }
    }, 2000);
  });
};

// ========================== UTILIDADES ADICIONALES ==========================

// Calcular número de noches
export const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 1;
  
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Calcular total de reserva
export const calculateTotal = (price, checkIn, checkOut) => {
  const nights = calculateNights(checkIn, checkOut);
  return price * nights;
};

// Validar fecha de llegada
export const isValidCheckInDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const checkIn = new Date(date);
  checkIn.setHours(0, 0, 0, 0);
  
  return checkIn >= today;
};

// Obtener fechas mínimas para inputs
export const getMinDates = () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return {
    today: today.toISOString().split('T')[0],
    tomorrow: tomorrow.toISOString().split('T')[0]
  };
};

// Filtrar habitaciones por lugar
export const filterRoomsByLocation = (rooms, lugar) => {
  if (!lugar) return rooms;
  return rooms.filter(room => room.lugar === lugar);
};

// Ordenar habitaciones por precio
export const sortRoomsByPrice = (rooms, ascending = true) => {
  return [...rooms].sort((a, b) => {
    return ascending ? a.price - b.price : b.price - a.price;
  });
};

// Obtener tipos únicos de habitación
export const getUniqueRoomTypes = (rooms) => {
  const types = rooms.map(room => room.type).filter(Boolean);
  return [...new Set(types)];
};

// Formatear fecha para mostrar
export const formatDateForDisplay = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Formatear fecha corta
export const formatShortDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short'
  });
};