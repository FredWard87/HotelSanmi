const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Importar rutas
const indexRoutes = require('./routes/index');

class App {
  constructor() {
    this.app = express();
    this.config();
    this.routes();
  }

  config() {
    // Middlewares
    this.app.use(cors());
    this.app.use(morgan('dev'));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  routes() {
    // Rutas principales
    this.app.use('/api', indexRoutes);

    // Ruta de prueba
    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString()
      });
    });

    // Manejo de rutas no encontradas
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Ruta no encontrada',
        path: req.originalUrl
      });
    });

    // Manejo de errores global
    this.app.use((error, req, res, next) => {
      console.error('Error global:', error);
      res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal'
      });
    });
  }

  getApp() {
    return this.app;
  }
}

module.exports = App;