const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Modelo para estadísticas detalladas de elecciones
 * Este modelo almacena métricas y análisis de participación
 * para facilitar la generación de informes y dashboards administrativos
 */
const electionStatisticsSchema = new Schema({
  // Referencia a la elección
  election: {
    type: Schema.Types.ObjectId,
    ref: 'Election',
    required: true,
    unique: true
  },
  
  // Estadísticas generales
  totalEligibleVoters: {
    type: Number,
    default: 0
  },
  totalVotesCast: {
    type: Number,
    default: 0
  },
  participationRate: {
    type: Number,
    default: 0 // Porcentaje
  },
  abstentions: {
    type: Number,
    default: 0
  },
  
  // Distribución temporal
  votingTimeline: [{
    date: {
      type: Date
    },
    count: {
      type: Number,
      default: 0
    }
  }],
  hourlyDistribution: {
    type: Map,
    of: Number,
    default: {}
  },
  peakVotingTime: {
    hour: Number,
    count: Number
  },
  
  // Distribución demográfica
  demographicDistribution: {
    ageGroups: {
      "18-24": { type: Number, default: 0 },
      "25-34": { type: Number, default: 0 },
      "35-44": { type: Number, default: 0 },
      "45-54": { type: Number, default: 0 },
      "55-64": { type: Number, default: 0 },
      "65+": { type: Number, default: 0 }
    },
    gender: {
      male: { type: Number, default: 0 },
      female: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      undisclosed: { type: Number, default: 0 }
    }
  },
  
  // Distribución geográfica
  geographicDistribution: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Dispositivos usados
  deviceStats: {
    mobile: { type: Number, default: 0 },
    desktop: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  
  // Categorías y candidatos
  categoryStats: [{
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ElectoralCategory'
    },
    name: String,
    votesDistribution: [{
      candidateId: {
        type: Schema.Types.ObjectId,
        ref: 'Candidate'
      },
      candidateName: String,
      votes: Number,
      percentage: Number
    }]
  }],
  
  // Verificación de integridad
  blockchainVerification: {
    verifiedCount: {
      type: Number,
      default: 0
    },
    unverifiedCount: {
      type: Number,
      default: 0
    },
    verificationRate: {
      type: Number,
      default: 0 // Porcentaje
    },
    lastVerifiedBlock: Number,
    lastVerificationTime: Date
  },
  
  // Metadatos
  generatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  reportGenerated: {
    type: Boolean,
    default: false
  },
  reportGeneratedAt: Date
}, {
  timestamps: true
});

// Índices para consultas frecuentes
electionStatisticsSchema.index({ election: 1 });
electionStatisticsSchema.index({ 'votingTimeline.date': 1 });
electionStatisticsSchema.index({ createdAt: 1 });

/**
 * Método para actualizar las estadísticas
 * @param {Object} data - Datos actualizados para las estadísticas
 */
electionStatisticsSchema.methods.updateStats = async function(data) {
  // Actualizar campos con los datos proporcionados
  Object.assign(this, data);
  
  // Actualizar tasa de participación
  if (this.totalEligibleVoters > 0) {
    this.participationRate = (this.totalVotesCast / this.totalEligibleVoters) * 100;
  }
  
  // Actualizar tasa de verificación blockchain
  if (this.blockchainVerification) {
    const totalVotes = this.blockchainVerification.verifiedCount + this.blockchainVerification.unverifiedCount;
    if (totalVotes > 0) {
      this.blockchainVerification.verificationRate = 
        (this.blockchainVerification.verifiedCount / totalVotes) * 100;
    }
  }
  
  // Actualizar timestamp
  this.lastUpdated = new Date();
  
  return this.save();
};

/**
 * Método para generar resumen de participación
 * @returns {Object} Resumen estadístico
 */
electionStatisticsSchema.methods.generateSummary = function() {
  const summary = {
    election: this.election,
    participation: {
      rate: this.participationRate,
      totalVoters: this.totalEligibleVoters,
      totalVotes: this.totalVotesCast,
      abstentions: this.abstentions
    },
    timeline: {
      peak: this.peakVotingTime,
      hourly: Object.fromEntries(this.hourlyDistribution)
    },
    categories: this.categoryStats.map(cat => ({
      name: cat.name,
      candidates: cat.votesDistribution.map(c => ({
        name: c.candidateName,
        votes: c.votes,
        percentage: c.percentage
      }))
    })),
    verification: {
      rate: this.blockchainVerification.verificationRate,
      lastVerified: this.blockchainVerification.lastVerificationTime
    }
  };
  
  return summary;
};

const ElectionStatistics = mongoose.model('ElectionStatistics', electionStatisticsSchema);

module.exports = ElectionStatistics;
