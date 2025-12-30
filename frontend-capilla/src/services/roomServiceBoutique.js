// Servicio para obtener habitaciones boutique desde la API
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

async function fetchAllRooms() {
  const res = await fetch(`${API_BASE}/api/rooms`);
  return res.json();
}

export async function fetchBoutiqueRooms() {
  const all = await fetchAllRooms();
  return all
    .filter((r) => r.lugar === 'boutique') // Solo habitaciones de boutique
    .map((room) => {
      // Resolver imágenes igual que en roomData.js
      function buildImagesMap() {
        try {
          const req = require.context('../assets2', true, /\.(png|jpe?g|svg|mp4)$/);
          const map = {};
          req.keys().forEach((key) => {
            map[key.replace('./', '')] = req(key);
          });
          return map;
        } catch (err) {
          return {};
        }
      }
      const imagesMap = buildImagesMap();
      return {
        ...room,
        images: Array.isArray(room.images)
          ? room.images.map((p) => imagesMap[p] ? imagesMap[p].default || imagesMap[p] : p)
          : [],
      };
    });
}

// Mantenemos processPayment local (simulación)
export const processPayment = (paymentData) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.05) {
        reject({
          success: false,
          message: 'Transacción declinada. Por favor verifique los datos de su tarjeta o utilice otro método de pago.',
        });
      } else {
        resolve({
          success: true,
          bookingId: `LC-${Date.now()}`,
          transactionId: `TXN-${Math.random().toString(36).substr(2, 12).toUpperCase()}`,
          message: 'Pago procesado exitosamente. Su reserva ha sido confirmada.',
          timestamp: new Date().toISOString(),
        });
      }
    }, 2500);
  });
};