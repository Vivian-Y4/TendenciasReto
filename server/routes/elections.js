const express = require('express');
const router = express.Router();
const { electionValidators } = require('../middlewares/validators');
const { verifyToken, isAdmin, protect } = require('../middlewares/auth');
const electionController = require('../controllers/electionController');
const voterController = require('../controllers/voterController');
const candidateController = require('../controllers/candidateController');

/**
 * Rutas para gestión de elecciones
 */

// Obtener todas las elecciones (público)
router.get('/', electionController.getElections);

// Obtener una elección específica por ID (público)
router.get('/:id', electionValidators.getById, electionController.getElection);

// Obtener resultados de una elección (público)
router.get('/:id/results', electionController.getElectionResults);

/**
 * @route   POST /api/elections/:electionId/reveal
 * @desc    Revelar un voto para una elección usando su compromiso
 * @access  Privado (Usuario Autenticado)
 */
router.post('/:electionId/reveal', verifyToken, electionController.revealVoteOnContract);

// --- Commenting out routes for functions no longer directly handled by electionController or are admin specific ---
// // Crear una nueva elección (administrador) - Moved to electionAdminController
// router.post('/', protect, electionController.createElection);

// // Actualizar una elección existente (administrador) - Moved to electionAdminController
// router.put('/:id', [
//   verifyToken,
//   isAdmin,
//   ...electionValidators.update
// ], electionController.updateElection);

// // Finalizar los resultados de una elección (administrador) - Moved to electionAdminController
// router.put('/:id/finalize', [
//   verifyToken,
//   isAdmin,
//   electionValidators.getById
// ], electionController.finalizeElection);

// // Obtener estadísticas de una elección (público) - Can be re-added or merged with getElectionResults
// router.get('/:id/statistics', electionValidators.getById, electionController.getElectionStatistics);

/**
 * Rutas para gestión de votantes
 */

// Obtener todos los votantes registrados para una elección (administrador)
router.get('/:electionId/voters', [
  verifyToken, 
  isAdmin
], voterController.getVoters);

// Registrar múltiples votantes para una elección (administrador)
router.post('/:electionId/voters', [
  verifyToken,
  isAdmin,
  ...electionValidators.getById
], voterController.registerVoters);

// Eliminar un votante de una elección (administrador)
router.delete('/:electionId/voters/:voterAddress', [
  verifyToken,
  isAdmin
], voterController.removeVoter);

// Verificar si un votante está registrado/ha votado (público)
router.post('/:electionId/voters/verify', voterController.verifyVoter);

// Obtener estadísticas de votantes (administrador)
router.get('/:electionId/voters/stats', [
  verifyToken,
  isAdmin
], voterController.getVoterStats);

/**
 * Rutas para gestión de candidatos
 */

// Obtener todos los candidatos de una elección (público)
router.get('/:electionId/candidates', candidateController.getCandidates);

// Obtener un candidato específico (público)
router.get('/:electionId/candidates/:candidateId', candidateController.getCandidate);

// Añadir un nuevo candidato (administrador)
router.post('/:electionId/candidates', [
  verifyToken,
  isAdmin
], candidateController.addCandidate);

// Actualizar un candidato existente (administrador)
router.put('/:electionId/candidates/:candidateId', [
  verifyToken,
  isAdmin
], candidateController.updateCandidate);

// // Cast a vote for a candidate in an election (protected) - Voting mechanism to be reviewed, likely direct contract interaction
// router.post('/:id/vote', protect, electionController.castVote);

module.exports = router;
