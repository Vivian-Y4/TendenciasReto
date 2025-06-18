const mongoose = require('mongoose');

const CandidateMetaSchema = new mongoose.Schema({
  // Referencias a datos blockchain
  electionId: {
    type: Number,
    required: true
  },
  candidateId: {
    type: Number,
    required: true
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
  socialLinks: {
    twitter: String,
    linkedin: String,
    website: String
  },
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
  }
}, {
  timestamps: true
});

// Índice compuesto para garantizar unicidad de candidatos en una elección
CandidateMetaSchema.index({ electionId: 1, candidateId: 1 }, { unique: true });

module.exports = mongoose.model('CandidateMeta', CandidateMetaSchema);
