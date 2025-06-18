const mongoose = require('mongoose');

const ElectionMetaSchema = new mongoose.Schema({
  // Blockchain election ID to link with on-chain data
  electionId: {
    type: Number,
    required: true,
    unique: true,
    index: true // u00cdndice principal
  },
  // Additional metadata not stored on blockchain
  coverImage: {
    type: String // URL to image
  },
  extendedDescription: {
    type: String,
    maxlength: 5000
  },
  category: {
    type: String,
    enum: ['political', 'corporate', 'community', 'other'],
    default: 'other',
    index: true // u00cdndice para filtrado por categoru00eda
  },
  location: {
    type: String,
    index: true // u00cdndice para bu00fasquedas geogru00e1ficas
  },
  tags: [{
    type: String
  }],
  createdBy: {
    type: String, // Admin wallet address
    required: true,
    index: true // u00cdndice para filtrar por creador
  },
  // Campos adicionales para control temporal
  startTime: {
    type: Date,
    required: true,
    index: true // u00cdndice para consultas de elecciones activas
  },
  endTime: {
    type: Date,
    required: true,
    index: true // u00cdndice para consultas de elecciones finalizadas
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'ended', 'finalized'],
    default: 'pending',
    index: true // u00cdndice para filtrado por estado
  },
  // Statistics and analytics data
  viewCount: {
    type: Number,
    default: 0
  },
  voterDemographics: {
    type: mongoose.Schema.Types.Mixed
  },
  // Translated content for i18n
  translations: {
    es: {
      title: String,
      description: String
    },
    en: {
      title: String,
      description: String
    }
  }
}, {
  timestamps: true
});

// u00cdndice para bu00fasqueda por texto en tu00edtulos
ElectionMetaSchema.index({ 'translations.es.title': 'text', 'translations.en.title': 'text' });

// u00cdndice compuesto para consultas de elecciones activas por categoru00eda
ElectionMetaSchema.index({ status: 1, category: 1 });

// u00cdndice compuesto para filtrado temporal
ElectionMetaSchema.index({ startTime: 1, endTime: 1 });

// u00cdndice para bu00fasqueda por tags
ElectionMetaSchema.index({ tags: 1 });

/**
 * Mu00e9todo para encontrar elecciones activas
 */
ElectionMetaSchema.statics.findActive = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    startTime: { $lte: now },
    endTime: { $gt: now }
  }).sort({ endTime: 1 });
};

/**
 * Mu00e9todo para encontrar elecciones terminadas pero no finalizadas
 */
ElectionMetaSchema.statics.findEnded = function() {
  const now = new Date();
  return this.find({
    status: 'active',
    endTime: { $lte: now }
  }).sort({ endTime: -1 });
};

/**
 * Mu00e9todo para buscar elecciones por categoru00eda
 */
ElectionMetaSchema.statics.findByCategory = function(category) {
  return this.find({ category }).sort({ startTime: -1 });
};

/**
 * Mu00e9todo para buscar elecciones por creador
 */
ElectionMetaSchema.statics.findByCreator = function(creatorAddress) {
  return this.find({ createdBy: creatorAddress }).sort({ createdAt: -1 });
};

/**
 * Mu00e9todo para bu00fasqueda de texto
 */
ElectionMetaSchema.statics.searchByTitle = function(searchText) {
  return this.find(
    { $text: { $search: searchText } },
    { score: { $meta: "textScore" } }
  ).sort({ score: { $meta: "textScore" } });
};

module.exports = mongoose.model('ElectionMeta', ElectionMetaSchema);
