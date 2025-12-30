import { useState, useEffect, useRef } from 'react';

/**
 * Hook personalizado para cargar imágenes de forma optimizada
 * Solo carga cuando el elemento es visible en viewport
 */
export const useOptimizedImage = (src, options = {}) => {
  const [imageSrc, setImageSrc] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const imageRef = useRef(null);

  const {
    threshold = 0.1,
    rootMargin = '50px'
  } = options;

  useEffect(() => {
    if (!imageRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(imageRef.current);

    return () => observer.disconnect();
  }, [src, threshold, rootMargin]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return {
    imageRef,
    imageSrc,
    isLoaded,
    isVisible,
    handleLoad
  };
};

/**
 * Hook para precargar múltiples imágenes
 * Útil para galerías y carruseles
 */
export const useImagePreloader = (images = []) => {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [allLoaded, setAllLoaded] = useState(false);

  useEffect(() => {
    if (!images.length) return;

    let loaded = 0;
    const imagePromises = images.map((src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          loaded++;
          setLoadedImages((prev) => new Set([...prev, src]));
          resolve();
        };
        img.onerror = () => {
          loaded++;
          resolve();
        };
        img.src = src;
      });
    });

    Promise.all(imagePromises).then(() => {
      setAllLoaded(true);
    });
  }, [images]);

  return {
    loadedImages,
    allLoaded,
    progress: images.length > 0 ? (loadedImages.size / images.length) * 100 : 0
  };
};

export default useOptimizedImage;