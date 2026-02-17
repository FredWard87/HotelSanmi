// models/DiscountCode.js
const mongoose = require('mongoose');

const DiscountCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  // 🆕 SIMPLIFICADO: Solo precio fijo final para 2 noches
  finalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  // Fechas de validez del cupón (para check-in)
  validFrom: {
    type: Date,
    required: true
  },
  validUntil: {
    type: Date,
    required: true
  },
  // 🆕 SIMPLIFICADO: Para bodas siempre son 2 noches
  nights: {
    type: Number,
    default: 2,
    min: 2
  },
  // 🆕 SIMPLIFICADO: Aplicable a todas las habitaciones o solo lugar
  applicableTo: {
    type: String,
    enum: ['all', 'casaHotel', 'boutique'],
    default: 'all'
  },
  // 🆕 NUEVO: Vincular código de descuento a un Guest Assignment (evento de boda)
  guestAssignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GuestAssignment',
    default: null
  },
  // 🆕 NUEVO: Nombre del evento al que pertenece el código
  eventName: {
    type: String,
    default: ''
  },
  // Estado
  active: {
    type: Boolean,
    default: true
  },
  // Contador de usos
  uses: {
    type: Number,
    default: 0
  },
  currentUses: {
    type: Number,
    default: 0
  },
  // Metadatos
  createdBy: {
    type: String,
    default: 'admin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Índices
DiscountCodeSchema.index({ code: 1, active: 1 });
DiscountCodeSchema.index({ validFrom: 1, validUntil: 1 });

// Pre-save hook
DiscountCodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 🔥 CORREGIDO: Validación simplificada - sin validar fechas de check-in
// Permite reservar con anticipación para cualquier fecha futura
DiscountCodeSchema.methods.isValidForBooking = function(bookingData) {
  const { nights, roomLugar } = bookingData;
  
  console.log('🔍 VALIDANDO CÓDIGO DE DESCUENTO');
  console.log('Código:', this.code);
  console.log('Activo:', this.active);
  console.log('Noches de la reserva:', nights);
  console.log('Lugar de la habitación:', roomLugar);
  
  // 1. Verificar si está activo
  if (!this.active) {
    console.log('❌ Código desactivado');
    return { valid: false, reason: 'Código desactivado' };
  }
  
  console.log('✅ Código activo');
  
  // 2. Verificar que sea para 2 noches (bodas)
  if (nights !== 2) {
    console.log('❌ No son 2 noches');
    return { valid: false, reason: 'Este código solo aplica para reservas de 2 noches' };
  }
  
  console.log('✅ Son 2 noches');
  
  // 3. Verificar lugar aplicable
  if (this.applicableTo !== 'all' && roomLugar && roomLugar !== this.applicableTo) {
    console.log('❌ Lugar no aplicable');
    return { 
      valid: false, 
      reason: `Código solo aplicable para ${this.applicableTo === 'casaHotel' ? 'Casa Hotel' : 'Boutique'}` 
    };
  }
  
  console.log('✅ Lugar aplicable');
  console.log('✅ Código válido para esta reserva');
  
  return { valid: true };
};

// 🆕 SIMPLIFICADO: Calcular descuento (precio final fijo)
DiscountCodeSchema.methods.calculateFinalPrice = function(originalTotal) {
  // Retorna el precio final fijo
  return this.finalPrice;
};

// 🆕 SIMPLIFICADO: Calcular descuento aplicado
DiscountCodeSchema.methods.calculateDiscountAmount = function(originalTotal) {
  return originalTotal - this.finalPrice;
};

module.exports = mongoose.model('DiscountCode', DiscountCodeSchema);
