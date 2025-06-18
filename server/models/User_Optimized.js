const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  // Dirección de wallet (principal identificador)
  address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true // Ya tiene índice
  },
  
  // Información personal (opcional)
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Por favor ingrese un correo electrónico válido'],
    sparse: true, // Índice sparse para permitir valores nulos
    index: true // Índice para búsquedas por email
  },
  
  // Roles y permisos
  isAdmin: {
    type: Boolean,
    default: false,
    index: true // Índice para filtrar administradores rápidamente
  },
  roles: [{
    type: String,
    enum: ['voter', 'admin', 'observer'],
    default: 'voter'
  }],
  
  // Preferencias de usuario
  preferredLanguage: {
    type: String,
    enum: ['es'],
    default: 'es'
  },
  
  // Estado y verificación
  isVerified: {
    type: Boolean,
    default: false,
    index: true // Índice para filtrar usuarios verificados
  },
  nonce: {
    type: String,
    default: () => Math.floor(Math.random() * 1000000).toString()
  },
  lastNonceCreatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    index: true // Índice para consultas de actividad reciente
  },
  registrationDate: {
    type: Date,
    default: Date.now,
    index: true // Índice para reportes de usuarios nuevos
  },
  
  // Datos adicionales
  metaData: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Votos emitidos (referencia a las elecciones en las que ha votado)
  participatedElections: [
    {
      electionId: {
        type: Number,
        required: true
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
}, {
  timestamps: true
});

// Índice compuesto para participación en elecciones
// Permite consultas rápidas de "¿qué usuarios han participado en X elección?"
UserSchema.index({ 'participatedElections.electionId': 1 });

// Índice para búsquedas por rol
UserSchema.index({ roles: 1 });

// Índice compuesto para consultas de actividad
// Permite consultas como "administradores que han iniciado sesión recientemente"
UserSchema.index({ isAdmin: 1, lastLogin: -1 });

/**
 * Método para generar un token JWT
 */
UserSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      address: this.address,
      isAdmin: this.isAdmin,
      roles: this.roles 
    },
    process.env.JWT_SECRET || 'your-temporary-jwt-secret',
    { expiresIn: '24h' }
  );
};

/**
 * Método para regenerar un nonce
 */
UserSchema.methods.generateNonce = function() {
  this.nonce = Math.floor(Math.random() * 1000000).toString();
  this.lastNonceCreatedAt = Date.now();
  return this.nonce;
};

/**
 * Método para verificar si un nonce es reciente (menos de 10 minutos)
 */
UserSchema.methods.isNonceValid = function() {
  const tenMinutes = 10 * 60 * 1000;
  return (Date.now() - this.lastNonceCreatedAt) < tenMinutes;
};

/**
 * Método para buscar usuarios por rol
 */
UserSchema.statics.findByRole = function(role) {
  return this.find({ roles: role });
};

/**
 * Método para buscar usuarios que han votado en una elección específica
 */
UserSchema.statics.findVotersInElection = function(electionId) {
  return this.find({ 'participatedElections.electionId': electionId });
};

/**
 * Método para obtener usuarios activos recientemente
 */
UserSchema.statics.findRecentlyActive = function(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  return this.find({ lastLogin: { $gte: cutoffDate } }).sort({ lastLogin: -1 });
};

module.exports = mongoose.model('User', UserSchema);
