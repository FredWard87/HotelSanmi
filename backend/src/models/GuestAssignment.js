// models/GuestAssignment.js - AGREGAR VALORES POR DEFECTO
const mongoose = require('mongoose');

const GuestAssignmentSchema = new mongoose.Schema({
  // Información del evento
  eventName: {
    type: String,
    required: true
  },
  brideEmail: {
    type: String,
    required: true
  },
  groomEmail: {
    type: String,
    required: false
  },
  brideName: {
    type: String,
    required: true
  },
  bridePhone: String,
  
  // Token único para el link
  token: {
    type: String,
    required: true,
    unique: true
  },
  
  // Datos de las habitaciones (basados en tu Excel)
  casaHotelRooms: {
    type: Array,
    default: function() {
      // Datos por defecto de Casa Hotel
      return [
        { roomId: 'CH1', name: 'Hab 1 San Jose', number: '1', m2: '47 m2', bed: 'QUEEN', capacity: 2, description: 'SALIDA JARDIN', guestName: '', guestWhatsapp: '', roomType: { type: 'STANDARD', lugar: 'casaHotel' } },
        { roomId: 'CH2', name: 'Hab 2 San Juan', number: '2', m2: '56 m2', bed: 'QUEEN', capacity: 2, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'casaHotel' } },
        { roomId: 'CH3', name: 'Hab 3 San Carlos*', number: '3', m2: '51 m2', bed: 'KING', capacity: 2, description: 'DOS CAMAS QUEEN SIZE', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'casaHotel' } },
        { roomId: 'CH4', name: 'Hab 4 Santa María*', number: '4', m2: '67 m2', bed: 'DOBLE', capacity: 4, description: 'CAMA KING + QUEEN SIZE', guestName: '', guestWhatsapp: '', roomType: { type: 'MASTER', lugar: 'casaHotel' } },
        { roomId: 'CH5', name: 'Hab 5 San Alejandro*', number: '5', m2: '68 m2', bed: 'DOBLE', capacity: 4, description: 'CAMA KING + QUEEN SIZE', guestName: '', guestWhatsapp: '', roomType: { type: 'MASTER', lugar: 'casaHotel' } },
        { roomId: 'CH6', name: 'Hab 6 San Rafael*', number: '6', m2: '54 m2', bed: 'DOBLE', capacity: 4, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'MASTER', lugar: 'casaHotel' } },
        { roomId: 'CH7', name: 'Hab 7 Santa Glafira*', number: '7', m2: '42 m2', bed: 'KING', capacity: 2, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'casaHotel' } },
        { roomId: 'CH8', name: 'Hab 8 Santa Trinidad*', number: '8', m2: '40 m2', bed: 'KING', capacity: 2, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'casaHotel' } },
        { roomId: 'CH9', name: 'Hab 9 Santa Socorro', number: '9', m2: '41 m2', bed: 'KING', capacity: 2, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'casaHotel' } },
        { roomId: 'CH10', name: 'Hab 10 Santa Esther', number: '10', m2: '25 m2', bed: 'QUEEN', capacity: 2, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'STANDARD', lugar: 'casaHotel' } },
        { roomId: 'CH11', name: 'Hab 11 San Jorge', number: '11', m2: '25 m2', bed: 'QUEEN', capacity: 2, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'STANDARD', lugar: 'casaHotel' } },
        { roomId: 'CH12', name: 'Hab 12 San Guillermo', number: '12', m2: '25 m2', bed: 'QUEEN', capacity: 2, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'STANDARD', lugar: 'casaHotel' } },
        { roomId: 'CH13', name: 'Hab 13 San Miguel', number: '13', m2: '25 m2', bed: 'QUEEN', capacity: 2, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'STANDARD', lugar: 'casaHotel' } },
        { roomId: 'CH14', name: 'Hab 14 San Isidro', number: '14', m2: '28 m2', bed: 'KING', capacity: 2, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'casaHotel' } },
        { roomId: 'CH15', name: 'Hab 15 San Pedro*', number: '15', m2: '59 m2', bed: 'DOBLE', capacity: 4, description: 'DOS CAMAS QUEEN SIZE', guestName: '', guestWhatsapp: '', roomType: { type: 'MASTER', lugar: 'casaHotel' } },
      ];
    }
  },
  
  boutiqueRooms: {
    type: Array,
    default: function() {
      // Datos por defecto de Hotel Boutique
      return [
        { roomId: 'BT101', name: 'Habitación 101', number: '1', bed: 'KING SIZE', capacity: 2, description: 'TERRAZA TRASERA', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'boutique' } },
        { roomId: 'BT102', name: 'Habitación 102', number: '2', bed: 'QUEEN SIZE', capacity: 2, description: 'TERRAZA TRASERA', guestName: '', guestWhatsapp: '', roomType: { type: 'STANDARD', lugar: 'boutique' } },
        { roomId: 'BT103', name: 'Habitación 103', number: '3', bed: 'KING SIZE', capacity: 2, description: 'TERRAZA TRASERA', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'boutique' } },
        { roomId: 'BT104', name: 'Habitación 104', number: '4', bed: 'KING SIZE', capacity: 2, description: 'TERRAZA TRASERA / TINA', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'boutique' } },
        { roomId: 'BT105', name: 'Habitación 105', number: '5', bed: 'QUEEN SIZE', capacity: 2, description: 'TERRAZA TRASERA', guestName: '', guestWhatsapp: '', roomType: { type: 'STANDARD', lugar: 'boutique' } },
        { roomId: 'BT106', name: 'Habitación 106', number: '6', bed: 'QUEEN SIZE', capacity: 2, description: 'TERRAZA TRASERA / TINA', guestName: '', guestWhatsapp: '', roomType: { type: 'STANDARD', lugar: 'boutique' } },
        { roomId: 'BT107', name: 'Habitación 107', number: '7', bed: 'KING SIZE', capacity: 2, description: 'TERRAZA JARDIN', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'boutique' } },
        { roomId: 'BT108', name: 'Habitación 108', number: '8', bed: 'KING SIZE', capacity: 2, description: 'TERRAZA JARDIN', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'boutique' } },
        { roomId: 'BT109', name: 'Habitación 109', number: '9', bed: 'KING SIZE', capacity: 2, description: 'TERRAZA JARDIN', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'boutique' } },
        { roomId: 'BT110', name: 'Habitación 110', number: '10', bed: 'KING SIZE', capacity: 2, description: 'TERRAZA JARDIN', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'boutique' } },
        { roomId: 'BT200', name: 'Habitación 200', number: '11', bed: 'KING SIZE', capacity: 2, description: 'TINA', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'boutique' } },
        { roomId: 'BT201', name: 'Habitación 201', number: '12', bed: 'KING SIZE', capacity: 2, description: 'TINA', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'boutique' } },
        { roomId: 'BT202', name: 'Habitación 202', number: '13', bed: 'KING SIZE', capacity: 2, description: 'TINA', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'boutique' } },
        { roomId: 'BT203', name: 'Habitación 203', number: '14', bed: 'KING SIZE', capacity: 2, description: 'TINA', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'boutique' } },
        { roomId: 'BT204', name: 'Habitación 204', number: '15', bed: 'KING SIZE', capacity: 2, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'boutique' } },
        { roomId: 'BT205', name: 'Habitación 205', number: '16', bed: 'KING SIZE', capacity: 2, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'SUITE', lugar: 'boutique' } },
        { roomId: 'BT206', name: 'Habitación 206*', number: '17', bed: '2 QUEEN SIZE', capacity: 4, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'MASTER', lugar: 'boutique' } },
        { roomId: 'BT207', name: 'Habitación 207*', number: '18', bed: '2 QUEEN SIZE', capacity: 4, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'MASTER', lugar: 'boutique' } },
        { roomId: 'BT208', name: 'Habitación 208*', number: '19', bed: '2 QUEEN SIZE', capacity: 4, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'MASTER', lugar: 'boutique' } },
        { roomId: 'BT209', name: 'Habitación 209*', number: '20', bed: '2 QUEEN SIZE', capacity: 4, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'MASTER', lugar: 'boutique' } },
        { roomId: 'BT210', name: 'Habitación 210*', number: '21', bed: '2 QUEEN SIZE', capacity: 4, description: '', guestName: '', guestWhatsapp: '', roomType: { type: 'MASTER', lugar: 'boutique' } },
      ];
    }
  },
  
  // Fechas
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  
  // Estado
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },

  // Tipo de hotel habilitado para el formulario
  hotelType: {
    type: String,
    enum: ['all', 'casa', 'boutique'],
    default: 'all'
  }
  ,
  // Grupos de fechas creados por el admin (persisten)
  dateGroups: {
    type: Array,
    default: []
  }
});

// Middleware para actualizar updatedAt
GuestAssignmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('GuestAssignment', GuestAssignmentSchema);
