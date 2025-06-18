const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');

// Ruta para sincronizar datos de una elección específica
router.get('/election/:electionId', syncController.syncElection);

// Ruta para registrar o actualizar información de usuario
router.post('/user', syncController.registerUser);

// Ruta para actualizar la preferencia de idioma
router.post('/language', syncController.updateLanguagePreference);

// Ruta para obtener estadísticas de votación
router.get('/stats/:electionId', syncController.getVotingStatistics);

module.exports = router;
