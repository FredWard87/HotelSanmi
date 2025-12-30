const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
require('dotenv').config();

// Importar rutas y modelos
const indexRoutes = require('./routes/index');
const Room = require('./models/Room');
const User = require('./models/User'); // Importamos el modelo de Usuario
const seedRooms = require('./data/roomsSeed');

class App {
  constructor() {
    this.app = express();
    this.connectDB();
    this.config();
    this.routes();
  }

  async connectDB() {
    if (mongoose.connection.readyState >= 1) return;

    try {
      console.log('🔗 Intentando conectar a MongoDB...');
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('✅ MongoDB conectado');
      
      // 1. Seed de Habitaciones
      const roomCount = await Room.countDocuments();
      if (roomCount === 0) {
        console.log('🌱 Sembrando habitaciones...');
        await Room.insertMany(seedRooms);
      }

      // 2. Seed de Usuarios (Admin y Empleado)
      await this.seedUsers();

    } catch (err) {
      console.error('❌ Error de conexión:', err.message);
    }
  }

  async seedUsers() {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@lacapillahotel.com';
      const adminPass = process.env.ADMIN_PASSWORD || 'admin1234';
      const employeeEmail = process.env.EMPLOYEE_EMAIL || 'employee@lacapillahotel.com';
      const employeePass = process.env.EMPLOYEE_PASSWORD || 'employee1234';

      // Crear Admin si no existe
      const adminExists = await User.findOne({ email: adminEmail.toLowerCase() });
      if (!adminExists) {
        await User.create({ name: 'Admin', email: adminEmail, password: adminPass, role: 'admin' });
        console.log(`🌱 Usuario admin creado: ${adminEmail}`);
      }

      // Crear Empleado si no existe
      const empExists = await User.findOne({ email: employeeEmail.toLowerCase() });
      if (!empExists) {
        await User.create({ name: 'Empleado', email: employeeEmail, password: employeePass, role: 'employee' });
        console.log(`🌱 Usuario empleado creado: ${employeeEmail}`);
      }
    } catch (error) {
      console.error('❌ Error en seed de usuarios:', error.message);
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
      res.status(404).json({ error: 'Ruta no encontrada' });
    });
  }

  getApp() {
    return this.app;
  }
}

const myApp = new App();
module.exports = myApp.getApp();
