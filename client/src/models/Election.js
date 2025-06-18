const mongoose = require("mongoose")
const Schema = mongoose.Schema

// Esquema para candidatos
const CandidateSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    default: "",
  },
  voteCount: {
    type: Number,
    default: 0,
  },
})

// Esquema principal de elección
const ElectionSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
  },
  startTime: {
    type: Number,
    required: true,
  },
  endTime: {
    type: Number,
    required: true,
  },
  candidates: [CandidateSchema],
  voters: [
    {
      type: Schema.Types.ObjectId,
      ref: "Voter",
    },
  ],
  totalVotes: {
    type: Number,
    default: 0,
  },
  resultsFinalized: {
    type: Boolean,
    default: false,
  },
  blockchainTxHash: {
    type: String,
    default: "",
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "Admin",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Método para verificar si una elección está activa
ElectionSchema.methods.isActive = function () {
  const now = Math.floor(Date.now() / 1000)
  return now >= this.startTime && now <= this.endTime
}

// Método para verificar si una elección ha terminado
ElectionSchema.methods.hasEnded = function () {
  const now = Math.floor(Date.now() / 1000)
  return now > this.endTime
}

// Método para obtener el candidato ganador
ElectionSchema.methods.getWinner = function () {
  if (!this.hasEnded() || !this.resultsFinalized) {
    return null
  }

  if (this.candidates.length === 0) {
    return null
  }

  return this.candidates.reduce((prev, current) => (prev.voteCount > current.voteCount ? prev : current))
}

// Middleware pre-save para actualizar la fecha de modificación
ElectionSchema.pre("save", function (next) {
  this.updatedAt = Date.now()
  next()
})

module.exports = mongoose.model("Election", ElectionSchema)
