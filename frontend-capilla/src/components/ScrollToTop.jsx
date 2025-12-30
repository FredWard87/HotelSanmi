import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll al inicio cada vez que cambia la ruta
    window.scrollTo(0, 0);
  }, [pathname]); // Se ejecuta cada vez que cambia la ruta

  return null; // Este componente no renderiza nada
}

export default ScrollToTop;