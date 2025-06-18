const mongoose = require('mongoose');

const userWalletSchema = new mongoose.Schema({
  address: { type: String, unique: true, required: true },
  hasToken: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserWallet', userWalletSchema);