const express = require('express');
const router = express.Router();
const candidateAdminController = require('../controllers/candidateAdminController');
const adminAuth = require('../middlewares/adminAuth');
const { imageUpload } = require('../config/upload');

/**
 * @route   POST /api/admin/candidates
 * @desc    Crear un nuevo candidato
 * @access  Privado (Admin)
 */
router.post('/', adminAuth, imageUpload.single('photo'), candidateAdminController.createCandidate);

/**
 * @route   GET /api/admin/candidates
 * @desc    Obtener todos los candidatos con filtros y paginación
 * @access  Privado (Admin)
 */
router.get('/', adminAuth, candidateAdminController.getCandidates);

/**
 * @route   GET /api/admin/candidates/:id
 * @desc    Obtener un candidato por ID
 * @access  Privado (Admin)
 */
router.get('/:id', adminAuth, candidateAdminController.getCandidateById);

/**
 * @route   PUT /api/admin/candidates/:id
 * @desc    Actualizar un candidato
 * @access  Privado (Admin)
 */
router.put('/:id', adminAuth, imageUpload.single('photo'), candidateAdminController.updateCandidate);

/**
 * @route   DELETE /api/admin/candidates/:id
 * @desc    Eliminar un candidato
 * @access  Privado (Admin)
 */
router.delete('/:id', adminAuth, candidateAdminController.deleteCandidate);

/**
 * @route   GET /api/admin/elections/:electionId/candidates
 * @desc    Obtener candidatos por elección
 * @access  Privado (Admin)
 */
router.get('/elections/:electionId/candidates', adminAuth, candidateAdminController.getCandidatesByElection);

/**
 * @route   PATCH /api/admin/elections/:electionId/candidates/reorder
 * @desc    Reordenar candidatos
 * @access  Privado (Admin)
 */
router.patch('/elections/:electionId/candidates/reorder', adminAuth, candidateAdminController.reorderCandidates);

module.exports = router;
