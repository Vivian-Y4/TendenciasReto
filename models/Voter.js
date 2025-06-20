const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  firstName: { 
    type: String,
    required: true,
    trim: true,
    default: 'Usuario'
  },
  nationalId: { 
    type: String,
    required: true,
    trim: true,
    match: [/^(012|402)\d{8}$/, 'Formato de cédula inválido']
  },
  province: { 
    type: String,
    required: true,
    trim: true
  },
  country: {
    type: String,
    required: true,
    default: 'Republica Dominicana'
  },
  publicKey: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  hasVoted: {
    type: Boolean,
    default: false
  }
}, { timestamps: true }); 

// Índice compuesto para garantizar que la combinación cédula + provincia sea única
voterSchema.index({ nationalId: 1, province: 1 }, { unique: true });

module.exports = mongoose.models.Voter || mongoose.model('Voter', voterSchema);