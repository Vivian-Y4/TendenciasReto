const mongoose = require('mongoose');

const VotingStatisticsSchema = new mongoose.Schema({
  electionId: {
    type: Number,
    required: true,
    unique: true
  },
  // Estadísticas generadas desde la blockchain pero almacenadas aquí para consulta rápida
  participationRate: {
    type: Number,
    default: 0 // Porcentaje de participación
  },
  totalEligibleVoters: {
    type: Number,
    default: 0
  },
  totalVotesCast: {
    type: Number,
    default: 0
  },
  votingTimestamps: [{
    // Momentos en que se registraron votos (anónimos)
    timestamp: Date
  }],
  hourlyDistribution: {
    // Distribución por hora del día (para análisis de patrones)
    type: Map,
    of: Number
  },
  deviceStats: {
    mobile: { type: Number, default: 0 },
    desktop: { type: Number, default: 0 },
    tablet: { type: Number, default: 0 }
  },
  geographicDistribution: {
    type: Map,
    of: Number
  },
  // Fecha de última actualización de estadísticas
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VotingStatistics', VotingStatisticsSchema);
