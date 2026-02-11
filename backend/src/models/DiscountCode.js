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

// 🔥 CORREGIDO: Validación para bodas - valida contra fechas de CHECK-IN, no fecha actual
DiscountCodeSchema.methods.isValidForBooking = function(bookingData) {
  const { nights, roomLugar, checkIn } = bookingData;
  
  console.log('🔍 VALIDANDO CÓDIGO DE DESCUENTO');
  console.log('Código:', this.code);
  console.log('Activo:', this.active);
  console.log('Válido desde:', this.validFrom);
  console.log('Válido hasta:', this.validUntil);
  console.log('Noches de la reserva:', nights);
  console.log('Check-in de la reserva (string):', checkIn);
  
  // 1. Verificar si está activo
  if (!this.active) {
    console.log('❌ Código desactivado');
    return { valid: false, reason: 'Código desactivado' };
  }
  
  // 2. 🔥 CORREGIDO: Crear fecha en zona local para evitar desfase
  // Si checkIn viene como "2026-02-25", creamos la fecha a las 12:00 hora local
  let checkInDate;
  if (checkIn) {
    if (typeof checkIn === 'string' && checkIn.includes('-')) {
      // Formato YYYY-MM-DD
      const [year, month, day] = checkIn.split('T')[0].split('-');
      checkInDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
    } else {
      checkInDate = new Date(checkIn);
    }
  } else {
    checkInDate = new Date();
  }
  
  console.log('Check-in procesado:', checkInDate.toLocaleDateString('es-MX'));
  
  // Normalizar fechas del código a medianoche para comparación justa
  const validFromNormalized = new Date(this.validFrom);
  validFromNormalized.setHours(0, 0, 0, 0);
  
  const validUntilNormalized = new Date(this.validUntil);
  validUntilNormalized.setHours(23, 59, 59, 999);
  
  const checkInNormalized = new Date(checkInDate);
  checkInNormalized.setHours(12, 0, 0, 0);
  
  if (checkInNormalized < validFromNormalized) {
    console.log('❌ Check-in antes de la fecha de inicio del código');
    return { 
      valid: false, 
      reason: `Código válido desde ${this.validFrom.toLocaleDateString('es-MX')}. Tu check-in es ${checkInDate.toLocaleDateString('es-MX')}.` 
    };
  }
  
  if (checkInNormalized > validUntilNormalized) {
    console.log('❌ Check-in después de la fecha de fin del código');
    return { 
      valid: false, 
      reason: `Código válido hasta ${this.validUntil.toLocaleDateString('es-MX')}. Tu check-in es ${checkInDate.toLocaleDateString('es-MX')}.` 
    };
  }
  
  console.log('✅ Check-in dentro del rango válido');
  
  // 3. Verificar que sea para 2 noches (bodas)
  if (nights !== 2) {
    console.log('❌ No son 2 noches');
    return { valid: false, reason: 'Este código solo aplica para reservas de 2 noches' };
  }
  
  console.log('✅ Son 2 noches');
  
  // 4. Verificar lugar aplicable
  if (this.applicableTo !== 'all' && roomLugar && roomLugar !== this.applicableTo) {
    console.log('❌ Lugar no aplicable');
    return { 
      valid: false, 
      reason: `Código solo aplicable para ${this.applicableTo === 'casaHotel' ? 'Casa Hotel' : 'Boutique'}` 
    };
  }
  
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
