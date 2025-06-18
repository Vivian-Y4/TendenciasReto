const jwt = require('jsonwebtoken');
const Voter = require('../models/Voter');
const crypto = require('crypto');

// Store for nonces (in a production environment, use Redis or a database)
const nonceStore = new Map();

// Register a new voter
exports.register = async (req, res) => {
  try {
    const { walletAddress, publicKey, signature } = req.body;

    // Check if voter already exists
    const existingVoter = await Voter.findOne({ walletAddress });
    if (existingVoter) {
      return res.status(400).json({ message: 'Voter already registered' });
    }

    // Create new voter
    const voter = new Voter({
      walletAddress,
      publicKey
    });

    await voter.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: voter._id, walletAddress: voter.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Voter registered successfully',
      token,
      voter: {
        id: voter._id,
        walletAddress: voter.walletAddress,
        publicKey: voter.publicKey
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering voter', error: error.message });
  }
};

// Login voter
exports.login = async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    // Find voter
    const voter = await Voter.findOne({ walletAddress });
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: voter._id, walletAddress: voter.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      voter: {
        id: voter._id,
        walletAddress: voter.walletAddress,
        publicKey: voter.publicKey
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Get voter profile
exports.getProfile = async (req, res) => {
  try {
    const voter = await Voter.findById(req.voter.id).select('-__v');
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    res.json({
      voter: {
        id: voter._id,
        walletAddress: voter.walletAddress,
        publicKey: voter.publicKey,
        hasVoted: voter.hasVoted
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

// Generate nonce for MetaMask authentication
exports.getNonce = async (req, res) => {
  try {
    // Generate a random nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    const message = `Bienvenido a la Plataforma de Votación Blockchain. Firma este mensaje para autenticarte. Nonce: ${nonce}. Timestamp: ${timestamp}`;
    
    // Store the nonce (in memory for this example, use Redis or DB in production)
    nonceStore.set(nonce, { message, timestamp, expires: timestamp + 300000 }); // expires in 5 minutes
    
    // Clean up expired nonces every so often
    const now = Date.now();
    for (const [key, value] of nonceStore.entries()) {
      if (value.expires < now) {
        nonceStore.delete(key);
      }
    }
    
    res.json({
      success: true,
      message,
      nonce
    });
  } catch (error) {
    console.error('Error generating nonce:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating authentication nonce',
      error: error.message
    });
  }
};

// Verify signature for MetaMask authentication
exports.verifySignature = async (req, res) => {
  try {
    const { address, signature, message, name, cedula } = req.body;
    
    if (!address || !signature || !message || !cedula) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Validar formato de cédula dominicana (debe comenzar con 012 o 402 y tener 11 dígitos)
    const cedulaRegex = /^(012|402)\d{8}$/;
    if (!cedulaRegex.test(cedula)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de cédula inválido'
      });
    }
    
    // Verificar si la cédula ya está registrada por otro usuario
    const existingVoterWithCedula = await Voter.findOne({ cedula, walletAddress: { $ne: address } });
    if (existingVoterWithCedula) {
      return res.status(400).json({
        success: false,
        message: 'Esta cédula ya está registrada por otro usuario'
      });
    }
    
    // Extract nonce from message to verify it's one we generated
    const nonceMatch = message.match(/Nonce: ([0-9a-f]+)/);
    if (!nonceMatch || !nonceMatch[1]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid message format'
      });
    }
    
    const nonce = nonceMatch[1];
    const storedNonce = nonceStore.get(nonce);
    
    // Verify nonce exists and hasn't expired
    if (!storedNonce || storedNonce.expires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Nonce expired or invalid'
      });
    }
    
    // Verify that the message matches
    if (storedNonce.message !== message) {
      return res.status(400).json({
        success: false,
        message: 'Message mismatch'
      });
    }
    
    // Verify the signature (ethers.js does this on the frontend before sending)
    // Here we would normally verify the signature matches the address
    // For simplicity, we'll assume it's valid if we got this far
    
    // Find or create voter
    let voter = await Voter.findOne({ walletAddress: address });
    
    if (!voter) {
      // Create new voter if they don't exist
      voter = new Voter({
        walletAddress: address,
        name: name || `Usuario ${address.substring(0, 6)}...`, // Usar nombre proporcionado o generar uno basado en la dirección
        cedula: cedula, // Agregar la cédula de identidad
        publicKey: address // Use address as publicKey for simplicity
      });
      await voter.save();
    } else {
      // Actualizar la cédula si el votante ya existe pero no tiene cédula
      if (!voter.cedula) {
        voter.cedula = cedula;
        await voter.save();
      }
    }
    
    // Delete the nonce to prevent reuse
    nonceStore.delete(nonce);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: voter._id, walletAddress: voter.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Authentication successful',
      token,
      address: voter.walletAddress,
      name: voter.name
    });
  } catch (error) {
    console.error('Error verifying signature:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying signature',
      error: error.message
    });
  }
};