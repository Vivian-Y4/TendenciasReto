const express = require('express');
const router = express.Router();
const { register, login, getProfile, getNonce, verifySignature } = require('../controllers/authController');
const { protect } = require('../middlewares/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/nonce', getNonce);
router.post('/verify-signature', verifySignature);

// Protected routes
router.get('/profile', protect, getProfile);

module.exports = router;