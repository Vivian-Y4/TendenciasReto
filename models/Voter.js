const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    default: 'Usuario' // Nombre por defecto
  },
  cedula: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: [/^(012|402)\d{8}$/, 'Formato de cédula inválido']
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
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = require(require('path').join(__dirname, '..', 'server', 'models', 'Voter'));