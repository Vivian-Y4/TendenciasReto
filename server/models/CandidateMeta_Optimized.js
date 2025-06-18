const mongoose = require('mongoose');

const CandidateMetaSchema = new mongoose.Schema({
  // Referencias a datos blockchain
  electionId: {
    type: Number,
    required: true,
    index: true // u00cdndice para bu00fasquedas por elecciu00f3n
  },
  candidateId: {
    type: Number,
    required: true
  },
  // Campo adicional para ordenamiento
  order: {
    type: Number,
    default: 0,
    index: true // u00cdndice para ordenamiento ru00e1pido
  },
  // Datos complementarios
  profileImage: {
    type: String // URL a la imagen
  },
  biography: {
    type: String,
    maxlength: 2000
  },
  credentials: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'disqualified'],
    default: 'active',
    index: true // u00cdndice para filtrar por estado
  },
  socialLinks: {
    twitter: String,
    linkedin: String,
    website: String
  },
  // Categoru00edas y etiquetas para bu00fasquedas
  category: {
    type: String,
    index: true // u00cdndice para categorizaciu00f3n
  },
  tags: [{
    type: String
  }],
  // Contenido traducido para i18n
  translations: {
    es: {
      name: String,
      description: String,
      biography: String,
      credentials: String
    },
    en: {
      name: String,
      description: String,
      biography: String,
      credentials: String
    }
  },
  // Datos estadu00edsticos para anu00e1lisis
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// u00cdndice compuesto para garantizar unicidad de candidatos en una elecciu00f3n
CandidateMetaSchema.index({ electionId: 1, candidateId: 1 }, { unique: true });

// u00cdndice para bu00fasqueda por texto en nombres y descripciones
CandidateMetaSchema.index({ 
  'translations.es.name': 'text', 
  'translations.en.name': 'text',
  'translations.es.description': 'text',
  'translations.en.description': 'text'
});

// u00cdndice para bu00fasqueda por tags
CandidateMetaSchema.index({ tags: 1 });

/**
 * Mu00e9todo para encontrar candidatos activos por elecciu00f3n
 */
CandidateMetaSchema.statics.findActiveByElection = function(electionId) {
  return this.find({ 
    electionId,
    status: 'active'
  }).sort({ order: 1 });
};

/**
 * Mu00e9todo para buscar candidatos por texto
 */
CandidateMetaSchema.statics.searchByName = function(searchText) {
  return this.find(
    { $text: { $search: searchText } },
    { score: { $meta: "textScore" } }
  ).sort({ score: { $meta: "textScore" } });
};

/**
 * Mu00e9todo para buscar candidatos por categoru00eda
 */
CandidateMetaSchema.statics.findByCategory = function(category) {
  return this.find({ category }).sort({ createdAt: -1 });
};

/**
 * Mu00e9todo para actualizar contador de vistas
 */
CandidateMetaSchema.statics.incrementViewCount = function(electionId, candidateId) {
  return this.findOneAndUpdate(
    { electionId, candidateId },
    { $inc: { viewCount: 1 } },
    { new: true }
  );
};

module.exports = mongoose.model('CandidateMeta', CandidateMetaSchema);
