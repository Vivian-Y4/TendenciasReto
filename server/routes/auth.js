const express = require('express');
const router = express.Router();
const { verifyToken, protect } = require('../middlewares/auth');
const authController = require('../controllers/authController');

/**
 * Simple validation middleware
 */
const validateSignature = (req, res, next) => {
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
 * @route   GET api/auth/nonce
 * @desc    Obtener un nonce para que el usuario firme
 * @access  Público
 */
router.get('/nonce', (req, res) => {
  // In production, generate a real random nonce per user
  res.json({ nonce: Math.floor(Math.random() * 1000000).toString() });
});

/**
 * @route   POST api/auth/verify-signature
 * @desc    Verificar firma para autenticar al usuario
 * @access  Público
 */
router.post('/verify-signature', validateSignature, authController.verifySignature);

/**
 * @route   GET api/auth/me
 * @desc    Obtener perfil del usuario actual
 * @access  Privado
 */
router.get('/me', verifyToken, authController.getCurrentUser);

/**
 * @route   PUT api/auth/profile
 * @desc    Actualizar perfil del usuario
 * @access  Privado
 */
router.put('/profile', verifyToken, authController.updateUserProfile);

// Public routes
router.post('/register', authController.registerVoter);
router.post('/login', authController.loginVoter);

// Protected routes
router.get('/profile', protect, authController.getProfile);

module.exports = router;
