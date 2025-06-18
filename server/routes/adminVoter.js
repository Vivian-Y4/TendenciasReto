const express = require('express');
const router = express.Router();
const adminVoterController = require('../controllers/adminVoterController');
const adminVoterAdditional = require('../controllers/adminVoterController_additional');
const adminAuth = require('../middlewares/adminAuth');
const { csvUpload } = require('../config/upload');

/**
 * @route   POST /api/admin/voters
 * @desc    Crear un nuevo votante
 * @access  Privado (Admin)
 */
router.post('/', adminAuth, adminVoterController.createVoter);

/**
 * @route   GET /api/admin/voters
 * @desc    Obtener todos los votantes con filtros y paginación
 * @access  Privado (Admin)
 */
router.get('/', adminAuth, adminVoterController.getVoters);

/**
 * @route   GET /api/admin/voters/:id
 * @desc    Obtener un votante por ID
 * @access  Privado (Admin)
 */
router.get('/:id', adminAuth, adminVoterController.getVoterById);

/**
 * @route   PUT /api/admin/voters/:id
 * @desc    Actualizar un votante
 * @access  Privado (Admin)
 */
router.put('/:id', adminAuth, adminVoterController.updateVoter);

/**
 * @route   PATCH /api/admin/voters/:id/verify
 * @desc    Verificar la identidad de un votante
 * @access  Privado (Admin)
 */
router.patch('/:id/verify', adminAuth, adminVoterAdditional.verifyVoter);

/**
 * @route   POST /api/admin/voters/import
 * @desc    Importar votantes desde un archivo CSV
 * @access  Privado (Admin)
 */
router.post('/import', adminAuth, csvUpload.single('csvFile'), adminVoterAdditional.importVotersFromCSV);

/**
 * @route   POST /api/admin/voters/invite
 * @desc    Enviar invitaciones a votantes
 * @access  Privado (Admin)
 */
router.post('/invite', adminAuth, adminVoterAdditional.sendVoterInvitations);

/**
 * @route   GET /api/admin/voters/stats
 * @desc    Obtener estadísticas de votantes
 * @access  Privado (Admin)
 */
router.get('/stats', adminAuth, adminVoterAdditional.getVoterStats);

/**
 * @route   POST /api/admin/elections/:electionId/assign-voters
 * @desc    Asignar votantes a una elección
 * @access  Privado (Admin)
 */
router.post('/elections/:electionId/assign-voters', adminAuth, adminVoterAdditional.assignVotersToElection);

module.exports = router;
