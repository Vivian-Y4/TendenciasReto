const ElectionSettings = require('../models/ElectionSettings');
const ActivityLog = require('../models/ActivityLog');
const { AppError } = require('../middlewares/errorHandler');

/**
 * @desc    Crea una nueva configuración de elección
 * @route   POST /api/admin/settings
 * @access  Privado (Admin)
 */
const createSettings = async (req, res, next) => {
  try {
    const {
      name,
      description,
      votingSystem,
      authenticationMethod,
      allowVoterRegistration,
      minimumParticipation,
      allowAbstention,
      requireMajority,
      tiebreaker,
      blockchainSettings,
      privacySettings,
      notificationSettings,
      uiSettings,
      isDefault,
      customRules
    } = req.body;

    // Validar nombre único
    const existingSettings = await ElectionSettings.findOne({ name });
    if (existingSettings) {
      return next(new AppError('Ya existe una configuración con ese nombre', 400));
    }

    // Crear nueva configuración
    const settings = await ElectionSettings.create({
      name,
      description,
      votingSystem,
      authenticationMethod,
      allowVoterRegistration,
      minimumParticipation,
      allowAbstention,
      requireMajority,
      tiebreaker,
      blockchainSettings,
      privacySettings,
      notificationSettings,
      uiSettings,
      isDefault,
      customRules,
      createdBy: req.user._id,
      lastModifiedBy: req.user._id
    });

    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'election_settings_create',
      resource: {
        type: 'ElectionSettings',
        id: settings._id,
        name: settings.name
      },
      details: {
        isDefault: settings.isDefault,
        votingSystem: settings.votingSystem
      }
    });

    res.status(201).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(new AppError(`Error al crear configuración de elección: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtiene todas las configuraciones de elecciones
 * @route   GET /api/admin/settings
 * @access  Privado (Admin)
 */
const getAllSettings = async (req, res, next) => {
  try {
    const { active, default: isDefaultQuery } = req.query;
    
    // Construir filtro basado en parámetros
    const filter = {};
    
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;
    if (isDefaultQuery === 'true') filter.isDefault = true;
    
    // Consulta regular
    const settings = await ElectionSettings.find(filter)
      .populate('createdBy', 'username name')
      .populate('lastModifiedBy', 'username name')
      .sort({ isDefault: -1, name: 1 });
    
    res.status(200).json({
      success: true,
      count: settings.length,
      data: settings
    });
  } catch (error) {
    next(new AppError(`Error al obtener configuraciones de elección: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtiene la configuración predeterminada
 * @route   GET /api/admin/settings/default
 * @access  Privado (Admin)
 */
const getDefaultSettings = async (req, res, next) => {
  try {
    const defaultSettings = await ElectionSettings.getDefault();
    
    res.status(200).json({
      success: true,
      data: defaultSettings
    });
  } catch (error) {
    next(new AppError(`Error al obtener configuración predeterminada: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtiene una configuración de elección por ID
 * @route   GET /api/admin/settings/:id
 * @access  Privado (Admin)
 */
const getSettingsById = async (req, res, next) => {
  try {
    const settings = await ElectionSettings.findById(req.params.id)
      .populate('createdBy', 'username name')
      .populate('lastModifiedBy', 'username name');
    
    if (!settings) {
      return next(new AppError('Configuración de elección no encontrada', 404));
    }
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(new AppError(`Error al obtener configuración de elección: ${error.message}`, 500));
  }
};

/**
 * @desc    Actualiza una configuración de elección
 * @route   PUT /api/admin/settings/:id
 * @access  Privado (Admin)
 */
const updateSettings = async (req, res, next) => {
  try {
    const {
      name,
      description,
      votingSystem,
      authenticationMethod,
      allowVoterRegistration,
      minimumParticipation,
      allowAbstention,
      requireMajority,
      tiebreaker,
      blockchainSettings,
      privacySettings,
      notificationSettings,
      uiSettings,
      isDefault,
      isActive,
      customRules
    } = req.body;
    
    // Validar configuración existente
    const settings = await ElectionSettings.findById(req.params.id);
    if (!settings) {
      return next(new AppError('Configuración de elección no encontrada', 404));
    }
    
    // Si se cambia el nombre, verificar que no exista otra configuración con ese nombre
    if (name && name !== settings.name) {
      const existingSettings = await ElectionSettings.findOne({ name });
      if (existingSettings) {
        return next(new AppError('Ya existe una configuración con ese nombre', 400));
      }
    }
    
    // Capturar estado antes del cambio para el registro de actividad
    const previousState = settings.toObject();
    
    // Actualizar configuración
    settings.name = name || settings.name;
    settings.description = description !== undefined ? description : settings.description;
    settings.votingSystem = votingSystem || settings.votingSystem;
    settings.authenticationMethod = authenticationMethod || settings.authenticationMethod;
    settings.allowVoterRegistration = allowVoterRegistration !== undefined ? allowVoterRegistration : settings.allowVoterRegistration;
    settings.minimumParticipation = minimumParticipation !== undefined ? minimumParticipation : settings.minimumParticipation;
    settings.allowAbstention = allowAbstention !== undefined ? allowAbstention : settings.allowAbstention;
    settings.requireMajority = requireMajority !== undefined ? requireMajority : settings.requireMajority;
    settings.tiebreaker = tiebreaker || settings.tiebreaker;
    
    // Actualizar configuraciones anidadas
    if (blockchainSettings) {
      settings.blockchainSettings = {
        ...settings.blockchainSettings,
        ...blockchainSettings
      };
    }
    
    if (privacySettings) {
      settings.privacySettings = {
        ...settings.privacySettings,
        ...privacySettings
      };
    }
    
    if (notificationSettings) {
      settings.notificationSettings = {
        ...settings.notificationSettings,
        ...notificationSettings
      };
    }
    
    if (uiSettings) {
      settings.uiSettings = {
        ...settings.uiSettings,
        ...uiSettings
      };
    }
    
    if (customRules) {
      settings.customRules = customRules;
    }
    
    settings.isDefault = isDefault !== undefined ? isDefault : settings.isDefault;
    settings.isActive = isActive !== undefined ? isActive : settings.isActive;
    settings.lastModifiedBy = req.user._id;
    
    const updatedSettings = await settings.save();
    
    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'election_settings_update',
      resource: {
        type: 'ElectionSettings',
        id: updatedSettings._id,
        name: updatedSettings.name
      },
      changes: {
        before: previousState,
        after: updatedSettings.toObject()
      }
    });
    
    res.status(200).json({
      success: true,
      data: updatedSettings
    });
  } catch (error) {
    next(new AppError(`Error al actualizar configuración de elección: ${error.message}`, 500));
  }
};

/**
 * @desc    Establece una configuración como predeterminada
 * @route   PATCH /api/admin/settings/:id/default
 * @access  Privado (Admin)
 */
const setAsDefault = async (req, res, next) => {
  try {
    const settings = await ElectionSettings.findById(req.params.id);
    
    if (!settings) {
      return next(new AppError('Configuración de elección no encontrada', 404));
    }
    
    // Si ya es la predeterminada, no hacer nada
    if (settings.isDefault) {
      return res.status(200).json({
        success: true,
        message: 'Esta configuración ya es la predeterminada',
        data: settings
      });
    }
    
    // Establecer como predeterminada (el hook pre-save se encargará de desmarcar las demás)
    settings.isDefault = true;
    settings.lastModifiedBy = req.user._id;
    
    const updatedSettings = await settings.save();
    
    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'election_settings_set_default',
      resource: {
        type: 'ElectionSettings',
        id: updatedSettings._id,
        name: updatedSettings.name
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Configuración establecida como predeterminada',
      data: updatedSettings
    });
  } catch (error) {
    next(new AppError(`Error al establecer configuración predeterminada: ${error.message}`, 500));
  }
};

/**
 * @desc    Elimina una configuración de elección
 * @route   DELETE /api/admin/settings/:id
 * @access  Privado (Admin)
 */
const deleteSettings = async (req, res, next) => {
  try {
    // Verificar configuración existente
    const settings = await ElectionSettings.findById(req.params.id);
    if (!settings) {
      return next(new AppError('Configuración de elección no encontrada', 404));
    }
    
    // No permitir eliminar configuración predeterminada
    if (settings.isDefault) {
      return next(new AppError('No se puede eliminar la configuración predeterminada', 400));
    }
    
    // Verificar si hay elecciones asociadas (implementar lógica si hay un modelo de elección relacionado)
    // const hasElections = await Election.findOne({ electionSettings: req.params.id });
    // if (hasElections) {
    //   return next(new AppError('No se puede eliminar la configuración porque está siendo utilizada en elecciones', 400));
    // }
    
    // Eliminar configuración
    await settings.remove();
    
    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'election_settings_delete',
      resource: {
        type: 'ElectionSettings',
        id: req.params.id,
        name: settings.name
      },
      details: {
        settings: settings.toObject()
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Configuración de elección eliminada correctamente'
    });
  } catch (error) {
    next(new AppError(`Error al eliminar configuración de elección: ${error.message}`, 500));
  }
};

/**
 * @desc    Duplica una configuración existente
 * @route   POST /api/admin/settings/:id/duplicate
 * @access  Privado (Admin)
 */
const duplicateSettings = async (req, res, next) => {
  try {
    const { newName } = req.body;
    
    if (!newName) {
      return next(new AppError('Se requiere un nombre para la nueva configuración', 400));
    }
    
    // Verificar configuración existente
    const originalSettings = await ElectionSettings.findById(req.params.id);
    if (!originalSettings) {
      return next(new AppError('Configuración de elección no encontrada', 404));
    }
    
    // Verificar que el nuevo nombre no exista
    const existingSettings = await ElectionSettings.findOne({ name: newName });
    if (existingSettings) {
      return next(new AppError('Ya existe una configuración con ese nombre', 400));
    }
    
    // Duplicar configuración
    const settingsCopy = originalSettings.toObject();
    
    // Modificar propiedades para la nueva configuración
    delete settingsCopy._id;
    delete settingsCopy.createdAt;
    delete settingsCopy.updatedAt;
    delete settingsCopy.__v;
    
    settingsCopy.name = newName;
    settingsCopy.description = `${settingsCopy.description || 'Copia de configuración'} (copia de ${originalSettings.name})`;
    settingsCopy.isDefault = false;
    settingsCopy.createdBy = req.user._id;
    settingsCopy.lastModifiedBy = req.user._id;
    
    // Crear nueva configuración
    const newSettings = await ElectionSettings.create(settingsCopy);
    
    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'election_settings_duplicate',
      resource: {
        type: 'ElectionSettings',
        id: newSettings._id,
        name: newSettings.name
      },
      details: {
        originalId: originalSettings._id,
        originalName: originalSettings.name
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'Configuración duplicada correctamente',
      data: newSettings
    });
  } catch (error) {
    next(new AppError(`Error al duplicar configuración de elección: ${error.message}`, 500));
  }
};

module.exports = {
  createSettings,
  getAllSettings,
  getDefaultSettings,
  getSettingsById,
  updateSettings,
  setAsDefault,
  deleteSettings,
  duplicateSettings
};
