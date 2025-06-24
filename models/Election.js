const mongoose = require('mongoose');

// Subesquema para los candidatos de una elección
const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  votes: { type: Number, default: 0 }
});

// Esquema principal para las elecciones
const electionSchema = new mongoose.Schema({
  blockchainId: { type: String, required: true, unique: true }, // ID numérico de la elección en el contrato
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  candidates: [candidateSchema],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  electoralLevel: {
    type: String,
    required: true,
    enum: ['Presidencial', 'Senatorial', 'Municipal', 'Diputados'],
  },
  province: {
    type: String,
    // Requerido solo si el nivel electoral no es 'Presidencial'
    required: function() { return this.electoralLevel !== 'Presidencial'; }
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'finalized', 'archived'], // Estados posibles de la elección
    default: 'upcoming',
  },
  tokenAddress: { type: String, required: false }, // Opcional: dirección del token ERC20 para votar
  merkleRoot: { type: String, required: false },   // Opcional: raíz de Merkle para votación ZK
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' } // Referencia al admin que la creó
}, {
  timestamps: true // Añade createdAt y updatedAt automáticamente
});

module.exports = mongoose.model('Election', electionSchema);