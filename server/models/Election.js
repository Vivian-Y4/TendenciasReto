const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Esquema para categorías en una elección
 * Esto representa las categorías específicas para esta elección,
 * que pueden ser diferentes a las categorías globales en ElectoralCategory
 */
const electionCategorySchema = new Schema({
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: 'ElectoralCategory'
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  maxSelections: {
    type: Number,
    default: 1,
    min: 1
  },
  minSelections: {
    type: Number,
    default: 1,
    min: 0
  },
  weight: {
    type: Number,
    default: 1,
    min: 0
  },
  description: String,
  displayOrder: {
    type: Number,
    default: 0
  }
});

/**
 * Esquema para resultados de candidatos
 * Utilizado en el objeto de resultados de la elección
 */
const candidateResultSchema = new Schema({
  candidateId: {
    type: Schema.Types.ObjectId,
    ref: 'Candidate'
  },
  name: String,
  party: String,
  category: String,
  voteCount: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  position: {
    type: Number
  }
});

/**
 * Esquema para requisitos de elegibilidad de votantes
 */
const eligibilityRequirementsSchema = new Schema({
  ageMinimum: Number,
  residencyRequired: Boolean,
  identificationRequired: Boolean,
  registrationRequired: Boolean,
  allowedDistricts: [String],
  allowedGroups: [String],
  additionalRequirements: [String]
});

/**
 * Esquema principal para elecciones
 */
const electionSchema = new mongoose.Schema({
  // Información básica
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  
  // Fechas
  startDate: {
    type: Date,
    required: true,
    index: true
  },
  endDate: {
    type: Date,
    required: true,
    index: true
  },
  registrationDeadline: {
    type: Date
  },
  actualEndDate: {
    type: Date
  },
  
  // Estado
  status: {
    type: String,
    enum: ['draft', 'active', 'suspended', 'closed', 'canceled'],
    default: 'draft',
    index: true
  },
  
  // Configuración y categorías
  settings: {
    type: Schema.Types.ObjectId,
    ref: 'ElectionSettings'
  },
  categories: [electionCategorySchema],
  
  // Votantes autorizados
  allowedVoters: [{
    type: Schema.Types.ObjectId,
    ref: 'Voter'
  }],
  
  // Contadores
  totalVotes: {
    type: Number,
    default: 0
  },
  totalRegisteredVoters: {
    type: Number,
    default: 0
  },
  
  // Configuración de acceso
  isPublic: {
    type: Boolean,
    default: true
  },
  requiresRegistration: {
    type: Boolean,
    default: true
  },
  allowAbstention: {
    type: Boolean,
    default: true
  },
  
  // Requisitos de elegibilidad
  eligibilityRequirements: eligibilityRequirementsSchema,
  
  // Metadatos administrativos
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Información blockchain
  contractAddress: {
    type: String,
    trim: true
  },
  blockchainId: {
    type: String,
    trim: true
  },
  deploymentTxHash: {
    type: String,
    trim: true
  },
  deploymentBlockNumber: {
    type: Number
  },
  finalizationTxHash: {
    type: String,
    trim: true
  },
  lastBlockchainSync: Date,
  
  // Resultados
  results: {
    totalVotes: {
      type: Number,
      default: 0
    },
    abstentions: {
      type: Number,
      default: 0
    },
    candidateResults: [candidateResultSchema],
    lastUpdated: Date
  },
  
  // Publicación de resultados
  resultsPublished: {
    type: Boolean,
    default: false
  },
  resultsPublishedAt: Date,
  officialStatement: String,
  
  // Información adicional
  additionalInfo: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Índices para consultas frecuentes
electionSchema.index({ startDate: 1, endDate: 1 });
electionSchema.index({ status: 1, isPublic: 1 });
electionSchema.index({ 'categories.categoryId': 1 });

/**
 * Método para verificar si una elección está activa
 * @returns {Boolean} true si la elección está activa según fechas y estado
 */
electionSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && now >= this.startDate && now <= this.endDate;
};

/**
 * Método para verificar si una elección está abierta para votación
 * @returns {Boolean} true si los votantes pueden emitir votos actualmente
 */
electionSchema.methods.isOpenForVoting = function() {
  const now = new Date();
  return this.isActive() && now >= this.startDate && now <= this.endDate;
};

/**
 * Método para verificar si un votante es elegible para esta elección
 * @param {Object} voter - El objeto votante a verificar
 * @returns {Boolean} true si el votante es elegible
 */
electionSchema.methods.isVoterEligible = function(voter) {
  // Verificar si el votante está en la lista de permitidos
  if (this.allowedVoters.length > 0) {
    return this.allowedVoters.some(id => id.toString() === voter._id.toString());
  }
  
  // Si no hay lista explícita, verificar requisitos generales
  if (!voter.isVerified) return false;
  if (voter.status !== 'active') return false;
  
  // Verificar requisitos específicos si existen
  if (this.eligibilityRequirements) {
    // Verificar distrito si está configurado
    if (this.eligibilityRequirements.allowedDistricts && 
        this.eligibilityRequirements.allowedDistricts.length > 0) {
      if (!voter.district || !this.eligibilityRequirements.allowedDistricts.includes(voter.district)) {
        return false;
      }
    }
    
    // Verificar grupos si está configurado
    if (this.eligibilityRequirements.allowedGroups && 
        this.eligibilityRequirements.allowedGroups.length > 0) {
      if (!voter.voterGroups || !voter.voterGroups.some(group => 
        this.eligibilityRequirements.allowedGroups.includes(group))) {
        return false;
      }
    }
  }
  
  return true;
};

/**
 * Método para actualizar los resultados de la elección
 * @param {Array} results - Resultados de la votación (array de objetos con candidateId y voteCount)
 */
electionSchema.methods.updateResults = function(results) {
  // Calcular total de votos
  const totalVotes = results.reduce((sum, result) => sum + (result.voteCount || 0), 0);
  
  // Crear array de resultados de candidatos
  const candidateResults = results.map(result => ({
    candidateId: result.candidateId,
    name: result.name,
    party: result.party,
    category: result.category,
    voteCount: result.voteCount || 0,
    percentage: totalVotes > 0 ? ((result.voteCount || 0) / totalVotes) * 100 : 0,
    position: result.position
  }));
  
  // Ordenar por número de votos (descendente)
  candidateResults.sort((a, b) => b.voteCount - a.voteCount);
  
  // Actualizar resultados
  this.results = {
    totalVotes,
    abstentions: results.abstentions || 0,
    candidateResults,
    lastUpdated: new Date()
  };
  
  // Actualizar contador general
  this.totalVotes = totalVotes;
  
  return this.save();
};

/**
 * Método para cambiar el estado de una elección
 * @param {String} newStatus - Nuevo estado de la elección
 * @param {Object} admin - Administrador que realiza el cambio
 */
electionSchema.methods.changeStatus = function(newStatus, admin) {
  // Validar estado
  if (!['draft', 'active', 'suspended', 'closed', 'canceled'].includes(newStatus)) {
    throw new Error('Estado de elección inválido');
  }
  
  // Si se está cerrando la elección, establecer fecha de cierre
  if (newStatus === 'closed' && this.status !== 'closed') {
    this.actualEndDate = new Date();
  }
  
  // Actualizar estado
  this.status = newStatus;
  
  // Registrar quién realizó el cambio
  if (admin) {
    this.lastModifiedBy = admin._id;
  }
  
  return this.save();
};

/**
 * Método estático para obtener elecciones activas
 * @returns {Promise} Promesa que resuelve a un array de elecciones activas
 */
electionSchema.statics.getActiveElections = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    startDate: { $lte: now },
    endDate: { $gte: now },
    isPublic: true
  }).sort({ endDate: 1 });
};

/**
 * Método estático para obtener elecciones por estado
 * @param {String} status - Estado de las elecciones a buscar
 * @returns {Promise} Promesa que resuelve a un array de elecciones
 */
electionSchema.statics.getElectionsByStatus = function(status) {
  return this.find({ status });
};

const Election = mongoose.model('Election', electionSchema);

module.exports = Election;