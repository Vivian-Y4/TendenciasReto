const express = require('express');
const router = express.Router();
const electionAdminController = require('../controllers/electionAdminController');
const candidateAdminController = require('../controllers/candidateAdminController'); // Added
const adminAuth = require('../middlewares/adminAuth');

/**
 * @route   POST /api/admin/elections
 * @desc    Crear una nueva elección
 * @access  Privado (Admin)
 */
router.post('/', adminAuth, electionAdminController.createElection);

/**
 * @route   POST /api/admin/elections/:electionId/candidates
 * @desc    Añadir un candidato a una elección
 * @access  Privado (Admin)
 */
router.post('/:electionId/candidates', adminAuth, electionAdminController.addCandidateToElection);

/**
 * @route   POST /api/admin/elections/:electionId/end-election
 * @desc    Finalizar una elección en la blockchain
 * @access  Privado (Admin)
 */
router.post('/:electionId/end-election', adminAuth, electionAdminController.endElectionEndpoint);

/**
 * @route   POST /api/admin/elections/:electionId/finalize-results
 * @desc    Finalizar resultados de una elección en la blockchain
 * @access  Privado (Admin)
 */
router.post('/:electionId/finalize-results', adminAuth, electionAdminController.finalizeResultsEndpoint);

/**
 * @route   POST /api/admin/elections/contract/verifier
 * @desc    Establecer la dirección del contrato Verifier ZK-SNARK
 * @access  Privado (Admin/Owner) - Controller logic should ensure owner if necessary
 */
router.post('/contract/verifier', adminAuth, electionAdminController.setVerifierAddress);

/**
 * @route   POST /api/admin/elections/:electionId/merkle-root
 * @desc    Establecer la Merkle root para una elección
 * @access  Privado (Admin)
 */
router.post('/:electionId/merkle-root', adminAuth, electionAdminController.setElectionMerkleRoot);

/**
 * @route   GET /api/admin/elections/:electionId/candidates
 * @desc    Obtener candidatos por elección
 * @access  Privado (Admin)
 */
router.get('/:electionId/candidates', adminAuth, candidateAdminController.getCandidatesByElection);


// --- Commenting out routes for functions that are currently stubbed or too complex for this subtask ---
// /**
//  * @route   GET /api/admin/elections
//  * @desc    Obtener todas las elecciones con filtros
//  * @access  Privado (Admin)
//  */
// router.get('/', adminAuth, electionAdminController.getElections);

// /**
//  * @route   GET /api/admin/elections/:id
//  * @desc    Obtener una elección por ID
//  * @access  Privado (Admin)
//  */
// router.get('/:id', adminAuth, electionAdminController.getElectionById);

/**
 * @route   PUT /api/admin/elections/:id
 * @desc    Actualizar una elección
 * @access  Privado (Admin)
 */
router.put('/:id', adminAuth, electionAdminController.updateElection);

// /**
//  * @route   PATCH /api/admin/elections/:id/status
//  * @desc    Cambiar estado de una elección
//  * @access  Privado (Admin)
//  */
// router.patch('/:id/status', adminAuth, electionAdminController.updateElectionStatus);

// /**
//  * @route   POST /api/admin/elections/:id/deploy
//  * @desc    Desplegar elección en blockchain
//  * @access  Privado (Admin)
//  */
// router.post('/:id/deploy', adminAuth, electionAdminController.deployElectionToBlockchain);

// /**
//  * @route   POST /api/admin/elections/:id/sync
//  * @desc    Sincronizar resultados desde blockchain
//  * @access  Privado (Admin)
//  */
// router.post('/:id/sync', adminAuth, electionAdminController.syncElectionResults);

// /**
//  * @route   POST /api/admin/elections/:id/publish-results
//  * @desc    Publicar resultados oficiales
//  * @access  Privado (Admin)
//  */
// router.post('/:id/publish-results', adminAuth, electionAdminController.publishElectionResults);

module.exports = router;
