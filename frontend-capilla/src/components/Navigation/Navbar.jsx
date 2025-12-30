import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import homeLogo from "../../assets2/La-capilla-Hotel.png";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const isActive = (path) => location.pathname === path;

  const handleNavigation = (path) => {
    navigate(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className={`navbar ${isMobileMenuOpen ? "menu-open" : ""}`}>
      <div className="navbar-container">
        <div className="navbar-logo" onClick={() => handleNavigation("/")}>
          <img src={homeLogo} alt="La Capilla Hotel" className="navbar-logo-img" />
        </div>

        <div 
          className={`hamburger ${isMobileMenuOpen ? "active" : ""}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div className={`navbar-menu ${isMobileMenuOpen ? "open" : ""}`}>
          <div
            className={`nav-item ${isActive("/boutique") ? "active" : ""}`}
            onClick={() => handleNavigation("/boutique")}
          >
            <span className="nav-text">HOTEL BOUTIQUE</span>
          </div>

           <div
            className={`nav-item ${isActive("/reservas") ? "active" : ""}`}
            onClick={() => handleNavigation("/reservas")}
          >
            <span className="nav-text">CASA HOTEL</span>
          </div>

          <div
            className={`nav-item ${isActive("/bodas") ? "active" : ""}`}
            onClick={() => handleNavigation("/bodas")}
          >
            <span className="nav-text">BODAS</span>
          </div>


          <div className="navbar-divider"></div>
          <div className="navbar-social">
            <a href="https://www.facebook.com/p/La-Capilla-Hotel-100064031587652/" target="_blank" rel="noopener noreferrer" className="social-link">
              <span className="social-icon" aria-hidden="true">f</span>
              <span className="social-text">Facebook</span>
            </a>
            <a href="https://www.instagram.com/lacapilla.hotel/" target="_blank" rel="noopener noreferrer" className="social-link">
              <span className="social-icon" aria-hidden="true">
                {/* Instagram SVG Icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" stroke="#C9A961" strokeWidth="1.4" />
                  <path d="M12 7.2a4.8 4.8 0 100 9.6 4.8 4.8 0 000-9.6z" stroke="#C9A961" strokeWidth="1.4"/>
                  <circle cx="17.5" cy="6.5" r="0.8" fill="#C9A961" />
                </svg>
              </span>
              <span className="social-text">Instagram</span>
            </a>

            <div className="navbar-contact">
              <span className="contact-label">Lobby:</span>
              <a className="contact-number" href="tel:+524181789398">+52 41817 89398</a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
