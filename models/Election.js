const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: String,
  description: String,
  votes: { type: Number, default: 0 },
});

const electionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: { type: String, required: true },
  description: String,
  startDate: Date,
  endDate: Date,
  candidates: [candidateSchema],
  contractAddress: String,
  participants: [String],
});

module.exports = mongoose.model('Election', electionSchema);