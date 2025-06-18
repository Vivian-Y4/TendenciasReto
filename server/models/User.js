const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  // Dirección de wallet (principal identificador)
  address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
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
    match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Por favor ingrese un correo electrónico válido']
  },
  province: {
    type: String,
    trim: true,
    index: true,
    default: null // Provincia de la República Dominicana
  },
  
  // Roles y permisos
  isAdmin: {
    type: Boolean,
    default: false
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
    default: false
  },
  nonce: {
    type: String,
    default: () => crypto.randomBytes(16).toString('hex')
  },
  nonceUsed: {
    type: Boolean,
    default: false
  },
  lastNonceCreatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  registrationDate: {
    type: Date,
    default: Date.now
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

/**
 * Método para generar un token JWT
 */
UserSchema.methods.generateAuthToken = function() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET no está configurado en variables de entorno');
  }
  
  return jwt.sign(
    { 
      address: this.address,
      isAdmin: this.isAdmin,
      roles: this.roles 
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * Método para regenerar un nonce criptográficamente seguro
 */
UserSchema.methods.generateNonce = function() {
  this.nonce = crypto.randomBytes(16).toString('hex');
  this.lastNonceCreatedAt = Date.now();
  this.nonceUsed = false;
  return this.nonce;
};

/**
 * Método para verificar si un nonce es válido (reciente y no usado)
 */
UserSchema.methods.isNonceValid = function() {
  const tenMinutes = 10 * 60 * 1000;
  return !this.nonceUsed && (Date.now() - this.lastNonceCreatedAt) < tenMinutes;
};

/**
 * Método para marcar un nonce como usado
 */
UserSchema.methods.markNonceAsUsed = function() {
  this.nonceUsed = true;
  return this;
};

module.exports = mongoose.model('User', UserSchema);
