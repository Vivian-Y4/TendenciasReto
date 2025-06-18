const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Modelo para categorías y puestos electorales
 * Este modelo permite definir los diferentes tipos de cargos o categorías
 * que pueden estar presentes en una elección (alcalde, concejal, etc.)
 */
const electoralCategorySchema = new Schema({
  // Información básica
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  
  // Configuración de la categoría
  maxSelectableOptions: {
    type: Number,
    default: 1,
    min: 1,
    max: 100
  },
  minSelectableOptions: {
    type: Number,
    default: 1,
    min: 0
  },
  selectionType: {
    type: String,
    enum: ['single', 'multiple', 'ranked', 'approval', 'weighted'],
    default: 'single'
  },
  
  // Jerarquía y organización
  level: {
    type: Number,
    default: 1,
    min: 1
  },
  displayOrder: {
    type: Number,
    default: 1
  },
  parentCategory: {
    type: Schema.Types.ObjectId,
    ref: 'ElectoralCategory',
    default: null
  },
  
  // Metadatos
  applicableRegions: [{
    type: String,
    trim: true
  }],
  termLength: {
    years: {
      type: Number,
      default: 4
    },
    months: {
      type: Number,
      default: 0
    },
    days: {
      type: Number,
      default: 0
    }
  },
  
  // Administración
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  lastModifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para consultas frecuentes
electoralCategorySchema.index({ name: 1, level: 1 });
electoralCategorySchema.index({ parentCategory: 1 });

// Método para obtener categorías activas
electoralCategorySchema.statics.getActiveCategories = async function() {
  return await this.find({ isActive: true }).sort({ level: 1, displayOrder: 1 });
};

// Método para obtener estructura jerárquica
electoralCategorySchema.statics.getHierarchy = async function() {
  // Obtener todas las categorías
  const categories = await this.find({ isActive: true }).sort({ level: 1, displayOrder: 1 });
  
  // Organizar en estructura jerárquica
  const rootCategories = categories.filter(c => !c.parentCategory);
  
  // Función recursiva para construir el árbol
  const buildTree = (category) => {
    const children = categories.filter(c => 
      c.parentCategory && c.parentCategory.toString() === category._id.toString()
    );
    
    return {
      ...category.toObject(),
      children: children.map(buildTree)
    };
  };
  
  return rootCategories.map(buildTree);
};

const ElectoralCategory = mongoose.model('ElectoralCategory', electoralCategorySchema);

module.exports = ElectoralCategory;
