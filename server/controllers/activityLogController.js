const ActivityLog = require('../models/ActivityLog');
const { AppError } = require('../middlewares/errorHandler');

/**
 * @desc    Registra una nueva actividad administrativa
 * @route   POST /api/admin/activity
 * @access  Privado (Admin)
 */
const logActivity = async (req, res, next) => {
  try {
    const { action, resource, details, changes, metadata } = req.body;

    // Obtener información del usuario desde el middleware de autenticación
    const user = {
      id: req.user?._id,
      model: 'Admin',
      username: req.user?.username,
      name: req.user?.name || req.user?.username
    };

    // Validaciones básicas
    if (!action) {
      return next(new AppError('El campo "action" es requerido para el log de actividad.', 400));
    }
    if (!resource || !resource.type) {
      return next(new AppError('El campo "resource.type" es requerido para el log de actividad.', 400));
    }
    if (!user.id || !user.username) {
      return next(new AppError('Información de usuario incompleta para el log de actividad.', 400));
    }

    // Crear el registro de actividad
    let activityLog;
    try {
      activityLog = await ActivityLog.logActivity({
        user,
        action,
        resource,
        details,
        changes,
        metadata: {
          ...metadata,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        }
      });
    } catch (dbError) {
      console.error('Error guardando log de actividad en la base de datos:', dbError);
      return next(new AppError('Error guardando log de actividad en la base de datos.', 500));
    }
    res.status(201).json({
      success: true,
      data: activityLog
    });
  } catch (error) {
    console.error('Error inesperado en logActivity:', error);
    next(new AppError(`Error al registrar actividad: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtiene un listado de actividades administrativas recientes
 * @route   GET /api/admin/activity
 * @access  Privado (Admin)
 */
const getActivityLogs = async (req, res, next) => {
  try {
    const { 
      limit = 20, 
      page = 1, 
      action, 
      userId, 
      resourceType, 
      resourceId,
      startDate,
      endDate
    } = req.query;
    
    // Construir filtro basado en parámetros de consulta
    const filter = {};
    
    if (action) filter.action = action;
    if (userId) filter['user.id'] = userId;
    if (resourceType) filter['resource.type'] = resourceType;
    if (resourceId) filter['resource.id'] = resourceId;
    
    // Filtro por rango de fechas
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }
    
    // Paginación
    const skip = (page - 1) * limit;
    
    // Obtener registros de actividad con paginación
    const logs = await ActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    // Obtener conteo total para paginación
    const total = await ActivityLog.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: logs
    });
  } catch (error) {
    next(new AppError(`Error al obtener registros de actividad: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtiene un registro de actividad específico por ID
 * @route   GET /api/admin/activity/:id
 * @access  Privado (Admin)
 */
const getActivityLogById = async (req, res, next) => {
  try {
    const activityLog = await ActivityLog.findById(req.params.id);
    
    if (!activityLog) {
      return next(new AppError('Registro de actividad no encontrado', 404));
    }
    
    res.status(200).json({
      success: true,
      data: activityLog
    });
  } catch (error) {
    next(new AppError(`Error al obtener registro de actividad: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtiene un resumen de actividad para el panel de administración
 * @route   GET /api/admin/activity/summary
 * @access  Privado (Admin)
 */
const getActivitySummary = async (req, res, next) => {
  try {
    // Obtener fecha de hace 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Resumen de actividad por tipo
    const actionSummary = await ActivityLog.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // Resumen de actividad por usuario (top 10 más activos)
    const userSummary = await ActivityLog.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$user.id', username: { $first: '$user.username' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Actividad por día (últimos 30 días)
    const dailyActivity = await ActivityLog.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Formatear actividad diaria para fácil visualización
    const formattedDailyActivity = dailyActivity.map(item => ({
      date: new Date(item._id.year, item._id.month - 1, item._id.day).toISOString().split('T')[0],
      count: item.count
    }));
    
    res.status(200).json({
      success: true,
      data: {
        actionSummary,
        userSummary,
        dailyActivity: formattedDailyActivity
      }
    });
  } catch (error) {
    next(new AppError(`Error al obtener resumen de actividad: ${error.message}`, 500));
  }
};

/**
 * Middleware para registrar automáticamente actividades administrativas
 * @param {String} action - Tipo de acción realizada
 * @param {Object} resourceMapper - Función para extraer información del recurso
 */
const autoLogActivity = (action, resourceMapper) => {
  return async (req, res, next) => {
    // Store the original send method
    const originalSend = res.send;
    
    // Override the send method
    res.send = function(data) {
      // Only log successful operations
      const statusCode = res.statusCode;
      if (statusCode >= 200 && statusCode < 300 && req.user) {
        try {
          const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
          const resource = resourceMapper(req, parsedData);
          
          ActivityLog.logActivity({
            user: {
              id: req.user._id,
              model: 'Admin',
              username: req.user.username,
              name: req.user.name || req.user.username
            },
            action,
            resource,
            details: {
              method: req.method,
              path: req.path,
              params: req.params,
              query: req.query
            },
            metadata: {
              ip: req.ip,
              userAgent: req.headers['user-agent']
            }
          }).catch(err => console.error('Error logging activity:', err));
        } catch (error) {
          console.error('Error in autoLogActivity middleware:', error);
        }
      }
      
      // Call the original send method
      return originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  logActivity,
  getActivityLogs,
  getActivityLogById,
  getActivitySummary,
  autoLogActivity
};
