const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  election: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Election',
    required: true
  },
  voter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voter',
    required: true
  },
  candidateId: {
    type: Number,
    required: true
  },
  signature: {
    type: String,
    required: true
  },
  transactionHash: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a voter can only vote once per election
voteSchema.index({ election: 1, voter: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema); 