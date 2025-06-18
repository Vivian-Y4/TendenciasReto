const mongoose = require('mongoose');

const ElectionMetaSchema = new mongoose.Schema({
  // Blockchain election ID to link with on-chain data
  electionId: {
    type: Number,
    required: true,
    unique: true
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
    default: 'other'
  },
  // Provincia para elecciones regionales/municipales (o 'nacional' para nacionales)
  location: {
    type: String
  },
  tags: [{
    type: String
  }],
  createdBy: {
    type: String, // Admin wallet address
    required: true
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

module.exports = mongoose.model('ElectionMeta', ElectionMetaSchema);
