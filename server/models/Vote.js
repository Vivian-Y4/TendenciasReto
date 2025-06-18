const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  electionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true
  },
  voterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voter',
    required: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  blockchainTxId: {
    type: String,
    required: true,
    unique: true
  },
  voteHash: {
    type: String,
    required: true,
    unique: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending'
  },
  blockNumber: {
    type: Number,
    default: null
  },
  verificationData: {
    signature: String,
    publicKey: String,
    nonce: String
  }
}, {
  timestamps: true
});

// Índices redundantes comentados para evitar duplicados si ya existen en db
// voteSchema.index({ electionId: 1, voterId: 1 }, { unique: true });
// voteSchema.index({ blockchainTxId: 1 });
// voteSchema.index({ voteHash: 1 });
// voteSchema.index({ timestamp: 1 });

// Method to verify vote integrity
voteSchema.methods.verifyIntegrity = function() {
  return this.status === 'confirmed' && this.blockNumber !== null;
};

// Method to mark vote as confirmed
voteSchema.methods.confirmVote = async function(blockNumber) {
  this.status = 'confirmed';
  this.blockNumber = blockNumber;
  return this.save();
};

const Vote = mongoose.model('Vote', voteSchema);

module.exports = Vote; 