const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Modelo para el registro de actividades administrativas
 * Este modelo permite auditar todas las acciones realizadas por administradores
 * en la plataforma, facilitando el seguimiento y la rendición de cuentas.
 */
const activityLogSchema = new Schema({
  // Actor que realizó la acción
  user: {
    id: {
      type: Schema.Types.ObjectId,
      refPath: 'userModel'
    },
    model: {
      type: String,
      enum: ['Admin', 'Voter'],
      default: 'Admin'
    },
    username: String,
    name: String
  },
  
  // Acción realizada
  action: {
    type: String,
    required: true,
    enum: [
      // Acciones relacionadas con elecciones
      'election_create', 'election_update', 'election_delete',
      'election_activate', 'election_deactivate', 'election_finalize',
      'election_publish_results',
      
      // Acciones relacionadas con candidatos
      'candidate_add', 'candidate_update', 'candidate_remove',
      
      // Acciones relacionadas con votantes
      'voter_register', 'voter_verify', 'voter_revoke',
      'voters_import', 'voter_update',
      
      // Acciones relacionadas con administradores
      'admin_create', 'admin_update', 'admin_delete',
      'admin_login', 'admin_logout', 'admin_permission_change',
      
      // Acciones de sistema
      'system_backup', 'system_restore', 'system_config_change',
      'blockchain_interaction'
    ],
    index: true
  },
  
  // Recurso afectado
  resource: {
    type: {
      type: String,
      enum: ['Election', 'Candidate', 'Voter', 'Admin', 'System'],
      required: true
    },
    id: Schema.Types.ObjectId,
    name: String
  },
  
  // Detalles de la acción
  details: {
    type: Schema.Types.Mixed,
    default: {}
  },
  
  // Cambios realizados (para operaciones de actualización)
  changes: {
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed
  },
  
  // Metadatos
  metadata: {
    ip: String,
    userAgent: String,
    deviceInfo: String
  },
  
  // Estado de la acción
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success'
  },
  
  // Timestamp (cuándo ocurrió)
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Índices para consultas frecuentes
activityLogSchema.index({ 'user.id': 1 });
activityLogSchema.index({ 'resource.id': 1 });
activityLogSchema.index({ action: 1, timestamp: -1 });

// Método para crear un nuevo log de actividad
activityLogSchema.statics.logActivity = async function(data) {
  return await this.create(data);
};

// Método para obtener actividad reciente
activityLogSchema.statics.getRecentActivity = async function(limit = 10, filter = {}) {
  return await this.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit);
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
