// Mapeo centralizado de todas las imágenes
// Estructura: { nombreLocal: 'URL en Firebase' }
// Esto permite fácil mantenimiento y actualización de URLs

export const imageUrls = {
  // Portadas y generales
  whats: 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Fwhats.jpg',
  'La-capilla-Hotel': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2FLa-capilla-Hotel.png',
  'La-Capialla-Hotel-Vector-scaled': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2FLa-Capialla-Hotel-Vector-scaled.png',
  
  // Carrusel principal
  '1': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2F1.jpg',
  '2': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2F2.jpeg',
  '3': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2F3.jpeg',
  '4': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2F4.jpg',
  '5': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2F5.jpg',
  '6': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2F6.jpg',
  '7': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2F7.jpg',
  
  // Portadas
  'portada-home': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Fportadashome%2F1.jpg',
  'portada-bodas': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Fportadashome%2F9.jpg',
  'portada-boutique': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2FportadashomesPORTADAHOTELBOUTIQUE.jpg',
  
  // Icono SVG
  'recurso-3': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Ficonossvg%2FRecurso-3.svg',
  'recurso-8': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Ficonossvg%2FRecurso-8.svg',
  'recurso-17': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Ficonossvg%2FRecurso-17.svg',
  'recurso-24': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Ficonossvg%2FRecurso-24.svg',
  'recurso-25': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Ficonossvg%2FRecurso-25.svg',
  'recurso-27': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Ficonossvg%2FRecurso-27.svg',
  
  // Amenidades habitaciones (PNG)
  'amenities-wifi': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Fhabitaciones%2Fnoun_wifi_4115433.png',
  'amenities-tv': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Fhabitaciones%2Fnoun_TV_1485615.png',
  'amenities-shower': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Fhabitaciones%2Fnoun_Shower_2884186.png',
  'amenities-bed': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Fhabitaciones%2Fnoun_Bed_1135101.png',
  'amenities-room': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Fhabitaciones%2Fnoun_room_2578943.png',
  'amenities-city': 'https://firebasestorage.googleapis.com/v0/b/[PROJECT_ID]/o/assets2%2Fhabitaciones%2Fnoun_City_4117559.png',
};

/**
 * Obtiene la URL de Firebase para una imagen
 * @param {string} imageName - Nombre clave de la imagen en imageUrls
 * @returns {string} URL de Firebase
 */
export const getImageUrl = (imageName) => {
  return imageUrls[imageName] || null;
};

export default imageUrls;
