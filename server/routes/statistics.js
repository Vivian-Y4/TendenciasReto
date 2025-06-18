const express = require('express');
const router = express.Router();
const { 
  generateElectionStatistics,
  getElectionStatistics,
  getDashboardStatistics,
  getVoterStatistics,
  getSystemStatistics
} = require('../controllers/statisticsController');
const { protect, isAdmin } = require('../middlewares/auth');

// Todas las rutas en este archivo requieren autenticación y rol de administrador
router.use(protect);
router.use(isAdmin);

// Rutas para estadísticas de elecciones específicas
router.route('/elections/:id/generate')
  .post(generateElectionStatistics);

router.route('/elections/:id')
  .get(getElectionStatistics);

// Rutas para estadísticas generales
router.route('/dashboard')
  .get(getDashboardStatistics);

router.route('/voters')
  .get(getVoterStatistics);

router.route('/system')
  .get(getSystemStatistics);

module.exports = router;
