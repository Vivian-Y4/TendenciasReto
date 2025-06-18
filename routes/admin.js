const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

// Rutas públicas para autenticación de administrador
router.post('/login', adminController.login);
router.get('/nonce', adminController.getNonce);
router.post('/verify-signature', adminController.verifySignature);

// Rutas protegidas (requieren autenticación de administrador)
router.get('/profile', adminAuth, adminController.getProfile);
router.post('/create', adminAuth, adminController.createAdmin); // Idealmente esto debe estar más protegido
router.put('/update/:id', adminAuth, adminController.updateAdmin);

module.exports = router;
