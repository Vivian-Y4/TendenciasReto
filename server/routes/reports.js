const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/auth');
const reportController = require('../controllers/reportController');

/**
 * @route   GET /api/reports/elections/:electionId
 * @desc    Generar reporte detallado de una elección
 * @access  Privado (Admin)
 */
router.get('/elections/:electionId', [
  verifyToken,
  isAdmin
], reportController.generateElectionReport);

/**
 * @route   GET /api/reports/voters/:electionId
 * @desc    Generar reporte de participación de votantes
 * @access  Privado (Admin)
 */
router.get('/voters/:electionId', [
  verifyToken,
  isAdmin
], reportController.generateVoterParticipationReport);

/**
 * @route   GET /api/reports/trends
 * @desc    Generar reporte de tendencias y análisis
 * @access  Privado (Admin)
 */
router.get('/trends', [
  verifyToken,
  isAdmin
], reportController.generateTrendsReport);

module.exports = router;
