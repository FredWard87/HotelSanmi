const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
require('dotenv').config();

// Importar rutas
const indexRoutes = require('./routes/index');
const Room = require('./models/Room');
const seedRooms = require('./data/roomsSeed');

class App {
  constructor() {
    this.app = express();
    this.connectDB(); // Conectar a la DB al iniciar
    this.config();
    this.routes();
  }

  async connectDB() {
    // Evitar múltiples conexiones en serverless
    if (mongoose.connection.readyState >= 1) return;

    try {
      console.log('🔗 Intentando conectar a MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB conectado');
      
      // Lógica de Seed rápida para producción
      const count = await Room.countDocuments();
      if (count === 0) {
        console.log('🌱 Sembrando datos iniciales...');
        await Room.insertMany(seedRooms);
      }
    } catch (err) {
      console.error('❌ Error de conexión:', err.message);
    }
  }

  config() {
    this.app.use(cors());
    this.app.use(morgan('dev'));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  routes() {
    this.app.use('/api', indexRoutes);

    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'OK', 
        dbState: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
      });
    });

    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Ruta no encontrada', path: req.originalUrl });
    });

    this.app.use((error, req, res, next) => {
      res.status(500).json({ error: 'Error interno' });
    });
  }

  getApp() {
    return this.app;
  }
}

const myApp = new App();
module.exports = myApp.getApp();
