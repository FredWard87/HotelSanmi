import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Servicio para obtener URLs de imágenes desde Firebase Storage
 */
class ImageService {
  /**
   * Obtiene la URL de descarga de una imagen desde Firebase Storage
   * @param {string} imagePath - Ruta de la imagen en Storage (ej: 'assets2/whats.jpg')
   * @returns {Promise<string>} URL de descarga
   */
  static async getImageUrl(imagePath) {
    try {
      const imageRef = ref(storage, imagePath);
      const url = await getDownloadURL(imageRef);
      return url;
    } catch (error) {
      console.error(`Error obteniendo URL para ${imagePath}:`, error);
      // Retorna una imagen placeholder en caso de error
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ccc" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EError%3C/text%3E%3C/svg%3E';
    }
  }

  /**
   * Obtiene múltiples URLs en paralelo
   * @param {string[]} imagePaths - Array de rutas
   * @returns {Promise<Object>} Objeto con rutas como claves y URLs como valores
   */
  static async getMultipleImageUrls(imagePaths) {
    try {
      const promises = imagePaths.map(path =>
        this.getImageUrl(path).catch(() => null)
      );
      const results = await Promise.all(promises);
      
      const urlMap = {};
      imagePaths.forEach((path, index) => {
        urlMap[path] = results[index];
      });
      
      return urlMap;
    } catch (error) {
      console.error('Error obteniendo múltiples URLs:', error);
      return {};
    }
  }
}

export default ImageService;
