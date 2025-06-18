const express = require('express');
const router = express.Router();
const electionSettingsController = require('../controllers/electionSettingsController');
const adminAuth = require('../middlewares/adminAuth');

/**
 * @route   POST /api/admin/settings
 * @desc    Crear una nueva configuración de elección
 * @access  Privado (Admin)
 */
router.post('/', adminAuth, electionSettingsController.createSettings);

/**
 * @route   GET /api/admin/settings
 * @desc    Obtener todas las configuraciones de elecciones
 * @access  Privado (Admin)
 */
router.get('/', adminAuth, electionSettingsController.getAllSettings);

/**
 * @route   GET /api/admin/settings/default
 * @desc    Obtener la configuración predeterminada
 * @access  Privado (Admin)
 */
router.get('/default', adminAuth, electionSettingsController.getDefaultSettings);

/**
 * @route   GET /api/admin/settings/:id
 * @desc    Obtener una configuración de elección por ID
 * @access  Privado (Admin)
 */
router.get('/:id', adminAuth, electionSettingsController.getSettingsById);

/**
 * @route   PUT /api/admin/settings/:id
 * @desc    Actualizar una configuración de elección
 * @access  Privado (Admin)
 */
router.put('/:id', adminAuth, electionSettingsController.updateSettings);

/**
 * @route   PATCH /api/admin/settings/:id/default
 * @desc    Establecer una configuración como predeterminada
 * @access  Privado (Admin)
 */
router.patch('/:id/default', adminAuth, electionSettingsController.setAsDefault);

/**
 * @route   DELETE /api/admin/settings/:id
 * @desc    Eliminar una configuración de elección
 * @access  Privado (Admin)
 */
router.delete('/:id', adminAuth, electionSettingsController.deleteSettings);

/**
 * @route   POST /api/admin/settings/:id/duplicate
 * @desc    Duplicar una configuración existente
 * @access  Privado (Admin)
 */
router.post('/:id/duplicate', adminAuth, electionSettingsController.duplicateSettings);

module.exports = router;
