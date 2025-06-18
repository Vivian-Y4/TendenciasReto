const mongoose = require('mongoose');

const VotingStatisticsSchema = new mongoose.Schema({
  electionId: {
    type: Number,
    required: true,
    unique: true,
    index: true // u00cdndice principal
  },
  // Estadu00edsticas generadas desde la blockchain pero almacenadas aquu00ed para consulta ru00e1pida
  participationRate: {
    type: Number,
    default: 0 // Porcentaje de participaciu00f3n
  },
  totalEligibleVoters: {
    type: Number,
    default: 0
  },
  totalVotesCast: {
    type: Number,
    default: 0,
    index: true // u00cdndice para ordenar por participaciu00f3n
  },
  votingTimestamps: [{
    // Momentos en que se registraron votos (anu00f3nimos)
    timestamp: {
      type: Date,
      index: true // u00cdndice para anu00e1lisis temporal
    }
  }],
  hourlyDistribution: {
    // Distribuciu00f3n por hora del du00eda (para anu00e1lisis de patrones)
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
  // Datos adicionales para anu00e1lisis
  electionStatus: {
    type: String,
    enum: ['active', 'ended', 'finalized'],
    default: 'active',
    index: true // u00cdndice para filtrar por estado
  },
  // Fecha de u00faltima actualizaciu00f3n de estadu00edsticas
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true // u00cdndice para frescura de datos
  }
}, {
  timestamps: true
});

// u00cdndice compuesto para bu00fasquedas por estado y participaciu00f3n
VotingStatisticsSchema.index({ electionStatus: 1, participationRate: -1 });

// u00cdndice para consultas de tendencias
VotingStatisticsSchema.index({ 'votingTimestamps.timestamp': -1 });

/**
 * Mu00e9todo para encontrar elecciones con mayor participaciu00f3n
 */
VotingStatisticsSchema.statics.findHighestParticipation = function(limit = 10) {
  return this.find()
    .sort({ participationRate: -1 })
    .limit(limit);
};

/**
 * Mu00e9todo para obtener estadu00edsticas de participaciu00f3n en un periodo
 */
VotingStatisticsSchema.statics.getParticipationByTimeRange = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        'votingTimestamps.timestamp': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$votingTimestamps.timestamp' } },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

/**
 * Mu00e9todo para actualizar estadu00edsticas desde la blockchain
 */
VotingStatisticsSchema.statics.updateFromBlockchain = function(electionId, stats) {
  return this.findOneAndUpdate(
    { electionId },
    {
      $set: {
        participationRate: stats.participationRate,
        totalVotesCast: stats.totalVotesCast,
        totalEligibleVoters: stats.totalEligibleVoters,
        lastUpdated: new Date()
      }
    },
    { new: true, upsert: true }
  );
};

/**
 * Mu00e9todo para registrar un nuevo voto en las estadu00edsticas
 */
VotingStatisticsSchema.statics.recordVote = function(electionId, deviceType, location) {
  const updates = {
    $inc: { totalVotesCast: 1 },
    $push: { votingTimestamps: { timestamp: new Date() } },
    $set: { lastUpdated: new Date() }
  };
  
  // Incrementar contador de dispositivo
  if (deviceType && ['mobile', 'desktop', 'tablet'].includes(deviceType)) {
    updates.$inc[`deviceStats.${deviceType}`] = 1;
  }
  
  // Registrar ubicaciu00f3n si estu00e1 disponible
  if (location) {
    updates.$inc[`geographicDistribution.${location}`] = 1;
  }
  
  return this.findOneAndUpdate(
    { electionId },
    updates,
    { new: true, upsert: true }
  );
};

module.exports = mongoose.model('VotingStatistics', VotingStatisticsSchema);
