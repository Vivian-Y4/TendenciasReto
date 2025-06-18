const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  walletAddress: {
    type: String,
    unique: true,
    sparse: true, // Permite valores nulos/undefined
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  permissions: {
    canManageElections: { type: Boolean, default: true },
    canManageVoters: { type: Boolean, default: true },
    canViewStatistics: { type: Boolean, default: true },
    systemConfig: { type: Boolean, default: false } // Solo para super admin
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});


adminSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
// Middleware para hashear la contraseña antes de guardar
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Admin', adminSchema);
