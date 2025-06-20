const jwt = require('jsonwebtoken');
const Voter = require('../models/Voter'); // Se utilizará solo cuando el usuario emita un voto
const User = require('../server/models/User'); // Ajuste de ruta al modelo User
const crypto = require('crypto');
const { ethers } = require('ethers');

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

    try {
      await voter.save();
    } catch (err) {
      // Manejar error de clave duplicada (índice compuesto nationalId + province o walletAddress único)
      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'La cédula ya está registrada en esa provincia o la billetera ya existe.'
        });
      }
      throw err;
    }

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
    const { address, signature, message, name, cedula, provincia } = req.body;

    if (!address || !signature || !message || !cedula || !provincia) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros requeridos, incluyendo la provincia.'
      });
    }

    const cedulaRegex = /^(012|402)\d{8}$/;
    if (!cedulaRegex.test(cedula)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de cédula inválido'
      });
    }

    console.log('Verificando firma con los siguientes datos:', req.body);

    // Buscar coincidencias en la colección de usuarios
    const existingUser = await User.findOne({ 
      $or: [{ nationalId: cedula }, { address: address.toLowerCase() }] 
    });

    console.log('Usuario existente encontrado:', existingUser);

    if (existingUser) {
      // Si la misma wallet está asociada a otra cédula
      if (existingUser.nationalId !== cedula) {
        return res.status(409).json({
          success: false,
          message: 'Esta billetera ya está registrada con una cédula diferente.'
        });
      }
      // Si la misma cédula está asociada a otra wallet
      if (existingUser.address.toLowerCase() !== address.toLowerCase()) {
        return res.status(409).json({
          success: false,
          message: 'Esta cédula ya está registrada con una billetera diferente.'
        });
      }
      // Si la provincia no coincide
      if (existingUser.province !== provincia) {
        return res.status(409).json({
          success: false,
          message: 'Esta cédula ya está registrada en una provincia diferente.'
        });
      }
    }

    // Verificar la firma
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ success: false, message: 'Firma inválida.' });
    }

    let user = existingUser;
    if (!user) {
      // Si el usuario no existe, se crea uno nuevo
      console.log('Creando nuevo usuario...');
      user = new User({
        address: address.toLowerCase(),
        name,
        nationalId: cedula,
        province: provincia,
        isVerified: true,
        roles: 'voter', // Role simple
      });
      console.log('Intentando guardar usuario en MongoDB:', user.toObject());
      try {
        await user.save();
        console.log('Usuario guardado correctamente.');
      } catch (err) {
        console.error('Error guardando User:', err);
        // Manejar error de clave duplicada (índice compuesto nationalId + province o walletAddress único)
        if (err.code === 11000) {
          return res.status(409).json({
            success: false,
            message: 'La cédula ya está registrada en esa provincia o la billetera ya existe.'
          });
        }
        throw err;
      }
      console.log('Nuevo usuario guardado exitosamente:', user);
    }

    // Generar token JWT para la sesión
    const token = jwt.sign(
      { id: (existingUser ? existingUser._id : user._id), walletAddress: address.toLowerCase() },
      process.env.JWT_SECRET,
      { expiresIn: '1h',
      }
    );

    res.status(200).json({
      success: true,
      message: 'Autenticación exitosa.',
      token,
      user: {
        id: (existingUser ? existingUser._id : user._id),
        name: (existingUser ? existingUser.name : user.name),
        roles: (existingUser ? existingUser.roles : user.roles),
      },
    });

  } catch (error) {
    console.error('Error al verificar la firma:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor al verificar la firma',
      error: error.message,
    });
  }
};