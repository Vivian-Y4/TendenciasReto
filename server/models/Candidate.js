const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Modelo para candidatos en elecciones
 * Este modelo almacena la información completa de candidatos
 * y sus relaciones con elecciones y categorías
 */
const candidateSchema = new Schema({
  // Información personal
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  party: {
    type: String,
    trim: true
  },
  
  // Información de candidatura
  election: {
    type: Schema.Types.ObjectId,
    ref: 'Election',
    required: true,
    index: true
  },
  category: {
    type: Schema.Types.ObjectId,
    ref: 'ElectoralCategory'
  },
  position: {
    type: Number,
    default: 0 // Posición para ordenamiento
  },
  
  // Información detallada
  biography: {
    type: String,
    maxlength: 5000
  },
  manifesto: {
    type: String,
    maxlength: 10000
  },
  credentials: {
    type: String,
    maxlength: 2000
  },
  achievements: [String],
  
  // Información de contacto
  contactInfo: {
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  
  // Redes sociales
  socialMedia: {
    twitter: String,
    facebook: String,
    instagram: String,
    linkedin: String,
    youtube: String
  },
  
  // Blockchain
  walletAddress: {
    type: String,
    trim: true,
    lowercase: true
  },
  
  // Medios
  photoUrl: String,
  bannerUrl: String,
  videoUrl: String,
  
  // Metadatos y estados
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  registeredBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verificationDate: Date,
  
  // Referencias a blockchain
  blockchainId: String,
  registrationTxHash: String,
  
  // Contenido traducido (i18n)
  translations: {
    type: Map,
    of: {
      firstName: String,
      lastName: String,
      party: String,
      biography: String,
      manifesto: String,
      credentials: String
    }
  },
  
  // Estadísticas y resultados
  votes: {
    type: Number,
    default: 0
  },
  votePercentage: {
    type: Number,
    default: 0
  },
  blockchainVotes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índices para consultas frecuentes
candidateSchema.index({ election: 1, category: 1, position: 1 });
candidateSchema.index({ election: 1, isActive: 1 });
candidateSchema.index({ election: 1, lastName: 1 });

// Método para nombre completo
candidateSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Método para actualizar votos
candidateSchema.methods.updateVotes = function(votes, totalVotes) {
  this.votes = votes;
  this.votePercentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
  return this.save();
};

// Método para marcar candidato como inactivo
candidateSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

// Método para obtener todos los candidatos activos de una elección
candidateSchema.statics.getActiveByElection = async function(electionId) {
  return this.find({
    election: electionId,
    isActive: true
  }).sort({ category: 1, position: 1, lastName: 1 });
};

// Método para obtener candidatos por categoría
candidateSchema.statics.getByCategoryInElection = async function(electionId, categoryId) {
  return this.find({
    election: electionId,
    category: categoryId,
    isActive: true
  }).sort({ position: 1, lastName: 1 });
};

// Transformar antes de enviar como JSON
candidateSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

const Candidate = mongoose.model('Candidate', candidateSchema);

module.exports = Candidate;
