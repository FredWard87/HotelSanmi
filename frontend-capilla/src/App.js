// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import ReservaHome from './components/Reserva/ReservaHome';
import Home from './components/Home/home';
import { AnimationProvider } from './context/AnimationContext';
import './App.css';
import Boutique from './components/ReservaBoutique/ReservaHomeBoutique';
import Bodas from './components/Bodas/Bodas';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navigation/Navbar';
import Dashboard from './components/dashboard/Dashboard';

// Componente wrapper para manejar la lógica del Navbar
function AppContent() {
  const location = useLocation();
  
  // Rutas donde NO queremos mostrar el Navbar
  const hideNavbarRoutes = ['/dashboard',];
  
  // Verificar si la ruta actual debe ocultar el Navbar
  const shouldHideNavbar = hideNavbarRoutes.some(route => 
    location.pathname.startsWith(route)
  );

  return (
    <div className="App">
      {/* Solo mostrar Navbar si NO estamos en rutas de dashboard */}
      {!shouldHideNavbar && <Navbar />}
      
      <ScrollToTop />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/reservas" element={<ReservaHome />} />
        <Route path="/boutique" element={<Boutique />} />
        <Route path="/bodas" element={<Bodas />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AnimationProvider>
      <Router>
        <AppContent />
      </Router>
    </AnimationProvider>
  );
}

export default App;