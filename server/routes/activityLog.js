const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');
const adminAuth = require('../middlewares/adminAuth');

/**
 * @route   POST /api/admin/activity
 * @desc    Registrar una nueva actividad administrativa
 * @access  Privado (Admin)
 */
router.post('/', adminAuth, activityLogController.logActivity);

/**
 * @route   GET /api/admin/activity
 * @desc    Obtener registros de actividad con filtros y paginación
 * @access  Privado (Admin)
 */
router.get('/', adminAuth, activityLogController.getActivityLogs);

/**
 * @route   GET /api/admin/activity/:id
 * @desc    Obtener un registro de actividad específico por ID
 * @access  Privado (Admin)
 */
router.get('/:id', adminAuth, activityLogController.getActivityLogById);

/**
 * @route   GET /api/admin/activity/summary
 * @desc    Obtener un resumen de actividades para el dashboard
 * @access  Privado (Admin)
 */
router.get('/summary', adminAuth, activityLogController.getActivitySummary);

module.exports = router;
