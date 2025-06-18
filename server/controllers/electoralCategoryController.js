const ElectoralCategory = require('../models/ElectoralCategory');
const ActivityLog = require('../models/ActivityLog');
const { AppError } = require('../middlewares/errorHandler');
const mongoose = require('mongoose');

/**
 * @desc    Crea una nueva categoría electoral
 * @route   POST /api/admin/categories
 * @access  Privado (Admin)
 */
const createCategory = async (req, res, next) => {
  try {
    const {
      name,
      description,
      maxSelectableOptions,
      minSelectableOptions,
      selectionType,
      level,
      displayOrder,
      parentCategory,
      applicableRegions,
      termLength
    } = req.body;

    // Validar nombre único
    const existingCategory = await ElectoralCategory.findOne({ name });
    if (existingCategory) {
      return next(new AppError('Ya existe una categoría con ese nombre', 400));
    }

    // Validar categoría padre si se proporciona
    if (parentCategory) {
      const parent = await ElectoralCategory.findById(parentCategory);
      if (!parent) {
        return next(new AppError('La categoría padre especificada no existe', 400));
      }
    }

    // Crear nueva categoría
    const category = await ElectoralCategory.create({
      name,
      description,
      maxSelectableOptions,
      minSelectableOptions,
      selectionType,
      level,
      displayOrder,
      parentCategory,
      applicableRegions,
      termLength,
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
      action: 'election_category_create',
      resource: {
        type: 'ElectoralCategory',
        id: category._id,
        name: category.name
      },
      details: {
        category: {
          name: category.name,
          level: category.level,
          selectionType: category.selectionType
        }
      }
    });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(new AppError(`Error al crear categoría electoral: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtiene todas las categorías electorales
 * @route   GET /api/admin/categories
 * @access  Privado (Admin)
 */
const getCategories = async (req, res, next) => {
  try {
    const { active, level, parent, format } = req.query;
    
    // Construir filtro basado en parámetros
    const filter = {};
    
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;
    if (level) filter.level = parseInt(level);
    
    if (parent === 'root') {
      filter.parentCategory = null;
    } else if (parent) {
      if (!mongoose.Types.ObjectId.isValid(parent)) {
        return next(new AppError('ID de categoría padre inválido', 400));
      }
      filter.parentCategory = parent;
    }
    
    // Si se solicita formato jerárquico
    if (format === 'hierarchy') {
      const hierarchy = await ElectoralCategory.getHierarchy();
      
      return res.status(200).json({
        success: true,
        count: hierarchy.length,
        data: hierarchy
      });
    }
    
    // Consulta regular
    const categories = await ElectoralCategory.find(filter)
      .sort({ level: 1, displayOrder: 1 })
      .populate('parentCategory', 'name level');
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    next(new AppError(`Error al obtener categorías electorales: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtiene una categoría electoral por ID
 * @route   GET /api/admin/categories/:id
 * @access  Privado (Admin)
 */
const getCategoryById = async (req, res, next) => {
  try {
    const category = await ElectoralCategory.findById(req.params.id)
      .populate('parentCategory', 'name level');
    
    if (!category) {
      return next(new AppError('Categoría electoral no encontrada', 404));
    }
    
    // Obtener subcategorías relacionadas
    const subcategories = await ElectoralCategory.find({ parentCategory: category._id })
      .select('name level displayOrder');
    
    res.status(200).json({
      success: true,
      data: {
        ...category.toObject(),
        subcategories
      }
    });
  } catch (error) {
    next(new AppError(`Error al obtener categoría electoral: ${error.message}`, 500));
  }
};

/**
 * @desc    Actualiza una categoría electoral
 * @route   PUT /api/admin/categories/:id
 * @access  Privado (Admin)
 */
const updateCategory = async (req, res, next) => {
  try {
    const {
      name,
      description,
      maxSelectableOptions,
      minSelectableOptions,
      selectionType,
      level,
      displayOrder,
      parentCategory,
      applicableRegions,
      termLength,
      isActive
    } = req.body;
    
    // Validar categoría existente
    const category = await ElectoralCategory.findById(req.params.id);
    if (!category) {
      return next(new AppError('Categoría electoral no encontrada', 404));
    }
    
    // Verificar que no hay ciclos en la jerarquía al cambiar la categoría padre
    if (parentCategory && parentCategory !== category.parentCategory?.toString()) {
      // Verificar que la nueva categoría padre existe
      const parent = await ElectoralCategory.findById(parentCategory);
      if (!parent) {
        return next(new AppError('La categoría padre especificada no existe', 400));
      }
      
      // Verificar que no se está creando un ciclo
      if (parentCategory === req.params.id) {
        return next(new AppError('Una categoría no puede ser su propia categoría padre', 400));
      }
      
      // Verificar recursivamente para evitar ciclos más profundos
      let currentParent = parent.parentCategory;
      while (currentParent) {
        if (currentParent.toString() === req.params.id) {
          return next(new AppError('No se puede crear un ciclo en la jerarquía de categorías', 400));
        }
        
        const nextParent = await ElectoralCategory.findById(currentParent);
        if (!nextParent) break;
        
        currentParent = nextParent.parentCategory;
      }
    }
    
    // Capturar estado antes del cambio para el registro de actividad
    const previousState = category.toObject();
    
    // Actualizar categoría
    category.name = name || category.name;
    category.description = description !== undefined ? description : category.description;
    category.maxSelectableOptions = maxSelectableOptions || category.maxSelectableOptions;
    category.minSelectableOptions = minSelectableOptions !== undefined ? minSelectableOptions : category.minSelectableOptions;
    category.selectionType = selectionType || category.selectionType;
    category.level = level !== undefined ? level : category.level;
    category.displayOrder = displayOrder !== undefined ? displayOrder : category.displayOrder;
    category.parentCategory = parentCategory !== undefined ? parentCategory : category.parentCategory;
    category.applicableRegions = applicableRegions || category.applicableRegions;
    category.termLength = termLength || category.termLength;
    category.isActive = isActive !== undefined ? isActive : category.isActive;
    category.lastModifiedBy = req.user._id;
    
    const updatedCategory = await category.save();
    
    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'election_category_update',
      resource: {
        type: 'ElectoralCategory',
        id: updatedCategory._id,
        name: updatedCategory.name
      },
      changes: {
        before: previousState,
        after: updatedCategory.toObject()
      }
    });
    
    res.status(200).json({
      success: true,
      data: updatedCategory
    });
  } catch (error) {
    next(new AppError(`Error al actualizar categoría electoral: ${error.message}`, 500));
  }
};

/**
 * @desc    Elimina una categoría electoral
 * @route   DELETE /api/admin/categories/:id
 * @access  Privado (Admin)
 */
const deleteCategory = async (req, res, next) => {
  try {
    // Verificar categoría existente
    const category = await ElectoralCategory.findById(req.params.id);
    if (!category) {
      return next(new AppError('Categoría electoral no encontrada', 404));
    }
    
    // Verificar si hay subcategorías dependientes
    const hasSubcategories = await ElectoralCategory.findOne({ parentCategory: req.params.id });
    if (hasSubcategories) {
      return next(new AppError('No se puede eliminar la categoría porque tiene subcategorías dependientes', 400));
    }
    
    // Verificar si hay elecciones asociadas (implementar lógica si hay un modelo de elección relacionado)
    // const hasElections = await Election.findOne({ categories: req.params.id });
    // if (hasElections) {
    //   return next(new AppError('No se puede eliminar la categoría porque está siendo utilizada en elecciones', 400));
    // }
    
    // Eliminar categoría
    await category.remove();
    
    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'election_category_delete',
      resource: {
        type: 'ElectoralCategory',
        id: req.params.id,
        name: category.name
      },
      details: {
        category: category.toObject()
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Categoría electoral eliminada correctamente'
    });
  } catch (error) {
    next(new AppError(`Error al eliminar categoría electoral: ${error.message}`, 500));
  }
};

/**
 * @desc    Reordena las categorías electorales
 * @route   PATCH /api/admin/categories/reorder
 * @access  Privado (Admin)
 */
const reorderCategories = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { orderUpdates } = req.body;
    
    if (!Array.isArray(orderUpdates) || orderUpdates.length === 0) {
      return next(new AppError('Se requiere un array de actualizaciones de orden', 400));
    }
    
    // Validar formato del array de actualizaciones
    for (const update of orderUpdates) {
      if (!update.id || !mongoose.Types.ObjectId.isValid(update.id) || update.displayOrder === undefined) {
        return next(new AppError('Formato inválido para las actualizaciones de orden', 400));
      }
    }
    
    // Aplicar actualizaciones de orden
    const updatePromises = orderUpdates.map(update => 
      ElectoralCategory.findByIdAndUpdate(
        update.id,
        { displayOrder: update.displayOrder, lastModifiedBy: req.user._id },
        { new: true, session }
      )
    );
    
    const updatedCategories = await Promise.all(updatePromises);
    
    // Verificar si todas las actualizaciones fueron exitosas
    if (updatedCategories.some(result => !result)) {
      await session.abortTransaction();
      return next(new AppError('No se encontraron todas las categorías para reordenar', 404));
    }
    
    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'election_category_reorder',
      resource: {
        type: 'ElectoralCategory',
        id: null,
        name: 'Multiple Categories'
      },
      details: {
        updates: orderUpdates
      }
    });
    
    await session.commitTransaction();
    
    res.status(200).json({
      success: true,
      message: 'Categorías reordenadas correctamente',
      data: updatedCategories
    });
  } catch (error) {
    await session.abortTransaction();
    next(new AppError(`Error al reordenar categorías: ${error.message}`, 500));
  } finally {
    session.endSession();
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  reorderCategories
};
