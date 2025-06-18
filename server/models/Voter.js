const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

// Esquema para información de verificación de identidad
const identityVerificationSchema = new Schema({
  method: {
    type: String,
    enum: ['document', 'biometric', 'phone', 'email', 'admin', 'thirdParty', 'none'],
    default: 'none'
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'expired'],
    default: 'pending'
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  verificationDate: Date,
  expirationDate: Date,
  documentType: {
    type: String,
    enum: ['id', 'passport', 'driverLicense', 'other', ''],
    default: ''
  },
  documentNumber: {
    type: String,
    trim: true
  },
  verificationNotes: String,
  verificationToken: String,
  verificationTokenExpires: Date,
  verificationAttempts: {
    type: Number,
    default: 0
  }
});

// Esquema principal de votante
const voterSchema = new mongoose.Schema({
  // Información de blockchain/wallet
  walletAddress: {
    type: String,
    unique: true,
    sparse: true, // Permite que sea null/undefined
    trim: true,
    lowercase: true
  },
  publicKey: {
    type: String,
    unique: true,
    sparse: true, // Permite que sea null/undefined
    trim: true
  },
  
  // Información personal
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    unique: true,
    sparse: true // Permite que sea null/undefined
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: Date,
  nationalId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // Permite que sea null/undefined
  },
  
  // Información de autenticación
  username: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // Permite que sea null/undefined
  },
  password: {
    type: String,
    select: false // No incluir en consultas por defecto
  },
  
  // Información geográfica/administrativa
  district: {
    type: String,
    trim: true,
    index: true
  },
  region: {
    type: String,
    trim: true
  },
  province: {
    type: String,
    trim: true,
    index: true,
    default: null
  },
  country: {
    type: String,
    trim: true,
    default: 'México'
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String
  },
  
  // Información de voto
  votingHistory: [{
    election: {
      type: Schema.Types.ObjectId,
      ref: 'Election'
    },
    voteDate: Date,
    voteSignature: String,
    blockchainTxHash: String
  }],
  hasVoted: {
    type: Boolean,
    default: false
  },
  currentVoteSignature: {
    type: String,
    default: null
  },
  
  // Estado y verificación
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending',
    index: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  lastVoteDate: {
    type: Date,
    default: null
  },
  lastLoginDate: Date,
  isVerified: {
    type: Boolean,
    default: false
  },
  identityVerification: identityVerificationSchema,
  
  // Categorización y permisos
  voterGroups: [{
    type: String,
    trim: true
  }],
  eligibleElections: [{
    type: Schema.Types.ObjectId,
    ref: 'Election'
  }],
  registeredBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  notes: String
}, {
  timestamps: true
});

// Índices únicos ya se crean por las propiedades `unique`, por lo que no es necesario duplicarlos
//voterSchema.index({ walletAddress: 1 });
//voterSchema.index({ publicKey: 1 });

// Method to check if voter is eligible
voterSchema.methods.isEligible = function() {
  return this.isVerified && !this.hasVoted;
};

// Method to mark vote as cast
voterSchema.methods.castVote = function(signature) {
  this.hasVoted = true;
  this.voteSignature = signature;
  this.lastVoteDate = new Date();
  return this.save();
};

const Voter = mongoose.model('Voter', voterSchema);

module.exports = Voter; 