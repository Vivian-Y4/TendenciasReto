const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const adminController = require('../controllers/adminController');

/**
 * Basic validation middleware to reduce dependency on express-validator
 */
const validateLoginRequest = (req, res, next) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Se requiere nombre de usuario y contraseña'
    });
  }
  next();
};

const validateSignatureRequest = (req, res, next) => {
  const { address, signature, message } = req.body;
  if (!address || !signature || !message) {
    return res.status(400).json({
      success: false,
      message: 'Se requieren dirección, firma y mensaje'
    });
  }
  // Simple Ethereum address validation
  const ethAddressPattern = /^0x[a-fA-F0-9]{40}$/;
  if (!ethAddressPattern.test(address)) {
    return res.status(400).json({
      success: false,
      message: 'Dirección Ethereum inválida'
    });
  }
  next();
};

/**
 * Custom simple auth middleware
 */
const adminAuth = async (req, res, next) => {
  try {
    // Aceptar token desde 'x-auth-token' o cabecera estándar 'Authorization: Bearer <token>'
    let token = req.header('x-auth-token');
    if (!token) {
      const authHeader = req.header('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No hay token, autorización denegada'
      });
    }
    try {
      // Verificamos y decodificamos el token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Hacemos disponible en ambas propiedades por compatibilidad
      req.user = { id: decoded.id };
      req.admin = { id: decoded.id };
      next();
    } catch (jwtErr) {
      console.error('Error verificando token JWT:', jwtErr);
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
  } catch (err) {
    console.error('Error en autenticación:', err);
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

/**
 * @route   POST /api/admin/login
 * @desc    Login de administrador con credenciales
 * @access  Público
 */
router.post('/login', validateLoginRequest, adminController.login);

/**
 * @route   GET /api/admin/nonce
 * @desc    Obtener nonce para autenticación con MetaMask
 * @access  Público
 */
router.get('/nonce', adminController.getNonce);

/**
 * @route   POST /api/admin/verify-signature
 * @desc    Verificar firma de MetaMask
 * @access  Público
 */
router.post('/verify-signature', validateSignatureRequest, adminController.verifySignature);

/**
 * @route   GET /api/admin/profile
 * @desc    Obtener perfil del administrador
 * @access  Privado (solo admin)
 */
router.get('/profile', adminAuth, adminController.getProfile);

/**
 * @route   GET /api/admin/test
 * @desc    Ruta de prueba para verificar que la API de admin funciona
 * @access  Público
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'API de administración funcionando correctamente',
    timestamp: new Date()
  });
});

/**
 * @route   GET /api/admin/test-endpoint
 * @desc    Ruta de prueba para depuración
 * @access  Público
 */
router.get('/test-endpoint', (req, res) => {
  res.json({ success: true, message: 'Admin test endpoint works!' });
});

// --- ESTADÍSTICAS ---
router.get('/statistics/dashboard', adminAuth, adminController.getDashboardStats);
router.get('/statistics/voters', adminAuth, adminController.getVoterStats);
router.get('/statistics/system', adminAuth, adminController.getSystemStats);

// --- ELECCIONES ---
router.get('/elections', adminAuth, adminController.listElections);
router.post('/elections', adminAuth, adminController.createElection);
router.get('/elections/:id', adminAuth, adminController.getElection);
router.put('/elections/:id', adminAuth, adminController.updateElection);
router.delete('/elections/:id', adminAuth, adminController.deleteElection);

// --- VOTANTES ---
router.get('/voters', adminAuth, adminController.listVoters);
router.post('/voters', adminAuth, adminController.addVoter);
router.put('/voters/:id', adminAuth, adminController.updateVoter);
router.delete('/voters/:id', adminAuth, adminController.deleteVoter);

console.log('Admin routes loaded');

module.exports = router;

// --- VOTANTES ---
router.get('/voters', adminAuth, adminController.listVoters);
router.post('/voters', adminAuth, adminController.addVoter);
router.put('/voters/:id', adminAuth, adminController.updateVoter);
router.delete('/voters/:id', adminAuth, adminController.deleteVoter);

console.log('Admin routes loaded');

module.exports = router;