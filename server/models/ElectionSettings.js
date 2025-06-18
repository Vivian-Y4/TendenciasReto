const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Modelo para configuraciones globales de elecciones
 * Este modelo permite definir reglas y parámetros predeterminados
 * que se pueden aplicar a múltiples elecciones
 */
const electionSettingsSchema = new Schema({
  // Información básica
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Configuración del sistema de votación
  votingSystem: {
    type: String,
    enum: ['majority', 'proportional', 'ranked', 'approval', 'custom'],
    default: 'majority'
  },
  
  // Configuración de autenticación
  authenticationMethod: {
    type: String,
    enum: ['wallet', 'credentials', 'dual', 'custom'],
    default: 'wallet'
  },
  
  // Reglas de participación
  allowVoterRegistration: {
    type: Boolean,
    default: false
  },
  minimumParticipation: {
    type: Number, // Porcentaje mínimo de participación requerido
    default: 0,
    min: 0,
    max: 100
  },
  allowAbstention: {
    type: Boolean,
    default: true
  },
  requireMajority: {
    type: Boolean, // Si se requiere mayoría absoluta
    default: false
  },
  
  // Reglas para empates
  tiebreaker: {
    type: String,
    enum: ['random', 'timestamp', 'admin', 'none'],
    default: 'none'
  },
  
  // Configuración de blockchain
  blockchainSettings: {
    networkId: {
      type: String,
      default: '1' // Mainnet Ethereum por defecto
    },
    contractTemplate: {
      type: String,
      enum: ['standard', 'weighted', 'multi-round', 'custom'],
      default: 'standard'
    },
    gasLimit: {
      type: Number,
      default: 5000000
    },
    confirmations: {
      type: Number,
      default: 3
    }
  },
  
  // Configuración de privacidad
  privacySettings: {
    showProgressDuringElection: {
      type: Boolean,
      default: false
    },
    anonymizeVoters: {
      type: Boolean,
      default: true
    },
    allowPartialResults: {
      type: Boolean,
      default: false
    }
  },
  
  // Configuración de notificaciones
  notificationSettings: {
    sendStartNotification: {
      type: Boolean,
      default: true
    },
    sendEndNotification: {
      type: Boolean,
      default: true
    },
    sendResultsNotification: {
      type: Boolean,
      default: true
    },
    reminderFrequency: {
      type: String,
      enum: ['none', 'daily', 'once'],
      default: 'once'
    }
  },
  
  // Configuración de interfaz
  uiSettings: {
    theme: {
      type: String,
      default: 'default'
    },
    showCandidatePhotos: {
      type: Boolean,
      default: true
    },
    showCandidateDescription: {
      type: Boolean,
      default: true
    },
    randomizeCandidateOrder: {
      type: Boolean,
      default: false
    }
  },
  
  // Metadatos administrativos
  isDefault: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Reglas personalizadas adicionales
  customRules: {
    type: Map,
    of: Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Asegurar que solo puede haber una configuración por defecto
electionSettingsSchema.pre('save', async function(next) {
  if (this.isDefault) {
    // Si esta configuración está marcada como predeterminada,
    // desmarcar cualquier otra que lo esté
    await this.constructor.updateMany(
      { _id: { $ne: this._id }, isDefault: true },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Método para obtener la configuración predeterminada
electionSettingsSchema.statics.getDefault = async function() {
  let defaultSettings = await this.findOne({ isDefault: true });
  
  // Si no existe una configuración predeterminada, crear una
  if (!defaultSettings) {
    defaultSettings = await this.create({
      name: 'Configuración Predeterminada',
      description: 'Configuración global predeterminada para elecciones',
      isDefault: true
    });
  }
  
  return defaultSettings;
};

const ElectionSettings = mongoose.model('ElectionSettings', electionSettingsSchema);

module.exports = ElectionSettings;
