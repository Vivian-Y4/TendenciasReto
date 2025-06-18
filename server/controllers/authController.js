const { ethers } = require('ethers');
const User = require('../models/User');
const { AppError } = require('../middlewares/errorHandler');
const Voter = require('../models/Voter');
const jwt = require('jsonwebtoken');

/**
 * @desc    Obtener un nonce para que el usuario firme
 * @route   GET /api/auth/nonce
 * @access  Público
 */
const getNonce = async (req, res, next) => {
  try {
    const { address } = req.query;
    
    if (!address) {
      return next(new AppError('Se requiere una dirección de wallet', 400));
    }
    
    // Buscar si el usuario ya existe, si no, crear uno nuevo
    let user = await User.findOne({ address: address.toLowerCase() });
    const { province } = req.body || req.query || {};
    
    if (!user) {
      // Primer acceso del usuario - lo registramos
      user = new User({
        address: address.toLowerCase(),
        registrationDate: Date.now(),
        province: province || null
      });
    } else {
      // Usuario existente - regeneramos su nonce
      user.generateNonce();
      // Si provincia viene y es diferente, actualiza
      if (province && user.province !== province) {
        user.province = province;
      }
    }
    
    await user.save();
    
    // Crear mensaje para firmar
    const message = `Firme este mensaje para autenticarse en la Plataforma de Votación: ${user.nonce}`;
    
    res.json({
      success: true,
      message,
      nonce: user.nonce
    });
  } catch (error) {
    next(new AppError(`Error al generar nonce: ${error.message}`, 500));
  }
};

/**
 * @desc    Verificar firma para autenticar al usuario
 * @route   POST /api/auth/verify-signature
 * @access  Público
 */
const verifySignature = async (req, res, next) => {
  try {
    const { address, signature, message, province: clientSelectedProvince, cedula, name: userNameFromRequest } = req.body; // Added clientSelectedProvince, cedula, userNameFromRequest

    // Verificar que la firma sea válida
    const signerAddr = ethers.utils.verifyMessage(message, signature);
    
    // Verificar que la dirección recuperada coincida con la proporcionada
    if (signerAddr.toLowerCase() !== address.toLowerCase()) {
      return next(new AppError('Firma inválida', 401));
    }
    
    // Buscar usuario por dirección
    const user = await User.findOne({ address: address.toLowerCase() });
    
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }
    
    // Verificar que el nonce usado en el mensaje corresponde con el nonce del usuario
    // y que no ha expirado (10 minutos) y no ha sido usado previamente
    if (!user.isNonceValid()) {
      return next(new AppError('Nonce expirado o ya utilizado, solicite uno nuevo', 401));
    }
    
    // Actualizar usuario
    user.lastLogin = Date.now();
    // Si clientSelectedProvince viene y es diferente en el User, actualiza (puede ser redundante si el Voter actualiza)
    if (clientSelectedProvince && user.province !== clientSelectedProvince) {
      user.province = clientSelectedProvince;
    }
    // Marcar el nonce actual como usado
    user.markNonceAsUsed();
    // Generar nuevo nonce para próxima autenticación
    user.generateNonce();
    // await user.save(); // Guardar user se hará después de la lógica de Voter

    let userProvince = clientSelectedProvince; // Default to client selected
    let userVoterIdentifier = null;
    let finalUserName = user.name || userNameFromRequest; // Use User.name first, then request name

    if (cedula) {
      const voterRecord = await Voter.findOne({ nationalId: cedula });

      if (voterRecord) {
        voterRecord.province = clientSelectedProvince;
        voterRecord.walletAddress = address.toLowerCase(); // Link/update wallet address
        // voterIdentifier se asume que ya está en voterRecord si existe

        await voterRecord.save();

        userProvince = voterRecord.province;
        userVoterIdentifier = voterRecord.voterIdentifier; // Este es el ZK ID
        finalUserName = voterRecord.firstName || user.name || userNameFromRequest; // Prioritize Voter.firstName

        // Sincronizar User.province con Voter.province si es diferente
        if (user.province !== voterRecord.province) {
            user.province = voterRecord.province;
        }

      } else {
        // Voter no encontrado, usar lo que envió el cliente para provincia
        // userVoterIdentifier sigue siendo null
        // finalUserName ya está seteado
      }
    }
    
    await user.save(); // Guardar User después de cualquier posible actualización de provincia

    // Generar JWT
    const token = jwt.sign(
      {
        address: user.address,
        isAdmin: user.isAdmin,
        roles: user.roles,
        province: userProvince, // Usar la provincia resuelta
        voterIdentifier: userVoterIdentifier, // Incluir el ZK ID
        name: finalUserName // Usar el nombre resuelto
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        address: user.address,
        isAdmin: user.isAdmin,
        roles: user.roles,
        name: finalUserName, // Nombre resuelto
        email: user.email,
        preferredLanguage: user.preferredLanguage,
        province: userProvince, // Provincia resuelta
        voterIdentifier: userVoterIdentifier // ZK ID
      }
    });
  } catch (error) {
    next(new AppError(`Error en autenticación: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener perfil del usuario actual
 * @route   GET /api/auth/me
 * @access  Privado
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ address: req.user.address }).select('-nonce -lastNonceCreatedAt');
    
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(new AppError(`Error al obtener usuario: ${error.message}`, 500));
  }
};

/**
 * @desc    Actualizar información del perfil
 * @route   PUT /api/auth/profile
 * @access  Privado
 */
const updateUserProfile = async (req, res, next) => {
  try {
    const { name, email, preferredLanguage } = req.body;
    
    // Campos permitidos para actualizar
    const updateFields = {};
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (preferredLanguage) updateFields.preferredLanguage = preferredLanguage;
    
    const user = await User.findOneAndUpdate(
      { address: req.user.address },
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-nonce -lastNonceCreatedAt');
    
    if (!user) {
      return next(new AppError('Usuario no encontrado', 404));
    }
    
    res.json({
      success: true,
      user
    });
  } catch (error) {
    next(new AppError(`Error al actualizar perfil: ${error.message}`, 500));
  }
};

// Register new voter
const registerVoter = async (req, res) => {
  try {
    const { walletAddress, publicKey, signature } = req.body;

    // Verify wallet ownership
    const message = `Register for voting platform: ${walletAddress}`;
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({ message: 'Invalid signature' });
    }

    // Check if voter already exists
    const existingVoter = await Voter.findOne({ walletAddress });
    if (existingVoter) {
      return res.status(400).json({ message: 'Voter already registered' });
    }

    // Create new voter
    const voter = await Voter.create({
      walletAddress,
      publicKey,
      isVerified: true // Auto-verify if signature is valid
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: voter._id, walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      token,
      voter: {
        id: voter._id,
        walletAddress: voter.walletAddress,
        isVerified: voter.isVerified
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login voter
const loginVoter = async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;

    // Verify wallet ownership
    const message = `Login to voting platform: ${walletAddress}`;
    const recoveredAddress = ethers.utils.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ message: 'Invalid signature' });
    }

    // Find voter
    const voter = await Voter.findOne({ walletAddress });
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: voter._id, walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      voter: {
        id: voter._id,
        walletAddress: voter.walletAddress,
        isVerified: voter.isVerified,
        hasVoted: voter.hasVoted
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get voter profile
const getProfile = async (req, res) => {
  try {
    const voter = await Voter.findById(req.voter.id).select('-verificationToken');
    if (!voter) {
      return res.status(404).json({ message: 'Voter not found' });
    }
    res.json({ success: true, voter });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getNonce,
  verifySignature,
  getCurrentUser,
  updateUserProfile,
  registerVoter,
  loginVoter,
  getProfile
};
