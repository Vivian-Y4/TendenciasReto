const express = require('express');
const router = express.Router();
const electoralCategoryController = require('../controllers/electoralCategoryController');
const adminAuth = require('../middlewares/adminAuth');

/**
 * @route   POST /api/admin/categories
 * @desc    Crear una nueva categoría electoral
 * @access  Privado (Admin)
 */
router.post('/', adminAuth, electoralCategoryController.createCategory);

/**
 * @route   GET /api/admin/categories
 * @desc    Obtener todas las categorías electorales
 * @access  Privado (Admin)
 */
router.get('/', adminAuth, electoralCategoryController.getCategories);

/**
 * @route   GET /api/admin/categories/:id
 * @desc    Obtener una categoría electoral por ID
 * @access  Privado (Admin)
 */
router.get('/:id', adminAuth, electoralCategoryController.getCategoryById);

/**
 * @route   PUT /api/admin/categories/:id
 * @desc    Actualizar una categoría electoral
 * @access  Privado (Admin)
 */
router.put('/:id', adminAuth, electoralCategoryController.updateCategory);

/**
 * @route   DELETE /api/admin/categories/:id
 * @desc    Eliminar una categoría electoral
 * @access  Privado (Admin)
 */
router.delete('/:id', adminAuth, electoralCategoryController.deleteCategory);

/**
 * @route   PATCH /api/admin/categories/reorder
 * @desc    Reordenar categorías electorales
 * @access  Privado (Admin)
 */
router.patch('/reorder', adminAuth, electoralCategoryController.reorderCategories);

module.exports = router;
