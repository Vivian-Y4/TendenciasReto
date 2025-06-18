const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Voter = require('../models/Voter');
const ethers = require('ethers');
const { AppError } = require('./errorHandler');

/**
 * Middleware para verificar token JWT
 * Este middleware verifica que el token proporcionado sea válido
 * y añade la información del usuario a req.user
 */
/**
 * Middleware unificado de autenticación
 * Verifica tokens JWT de ambos sistemas (User y Voter)
 * Compatible con ambos headers: x-auth-token y Bearer token en Authorization
 */
const authenticate = async (req, res, next) => {
  try {
    // Verificar que existe JWT_SECRET en el entorno
    if (!process.env.JWT_SECRET) {
      throw new AppError('Error de configuración del servidor: JWT_SECRET no configurado', 500);
    }
    
    // Obtener token del header (soporta ambos formatos)
    let token;
    
    // Formato x-auth-token (sistema User)
    if (req.header('x-auth-token')) {
      token = req.header('x-auth-token');
    }
    // Formato Authorization: Bearer (sistema Voter)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Verificar si no hay token
    if (!token) {
      throw new AppError('No se proporcionó token de autenticación, acceso denegado', 401);
    }
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Identificar el tipo de usuario basado en el contenido del token
    if (decoded.address) {
      // Token de User (basado en wallet)
      const user = await User.findOne({ address: decoded.address });
      
      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }
      
      req.user = user;
      req.userType = 'blockchain';
    } else if (decoded.id) {
      // Token de Voter (basado en MongoDB id)
      const voter = await Voter.findById(decoded.id);
      
      if (!voter) {
        throw new AppError('Votante no encontrado', 404);
      }
      
      req.voter = voter;
      req.user = voter; // Para compatibilidad con código existente
      req.userType = 'voter';
    } else {
      throw new AppError('Token inválido: no contiene identificación de usuario', 401);
    }
    
    next();
  } catch (error) {
    // Manejar diferentes tipos de errores
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    } else if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    } else {
      console.error('Error en autenticación:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Error interno del servidor durante autenticación'
      });
    }
  }
};

// Mantener verifyToken para compatibilidad con código existente
const verifyToken = authenticate;

/**
 * Middleware para verificar si el usuario es admin
 * Este middleware debe ser usado después de verifyToken
 */
const isAdmin = async (req, res, next) => {
  try {
    // Verificar si el usuario existe en la base de datos
    const user = await User.findOne({ address: req.user.address });
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: se requieren privilegios de administrador'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error verificando admin:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error del servidor verificando privilegios'
    });
  }
};

/**
 * Middleware mejorado para verificar firma
 * Verifica que la firma proporcionada corresponda con la dirección
 */
const verifySignature = (req, res, next) => {
  try {
    const { address, signature, message } = req.body;
    
    if (!address || !signature || !message) {
      return res.status(400).json({
        success: false,
        message: 'Se requieren dirección, firma y mensaje para verificar'
      });
    }
    
    // Verificar que la dirección tenga un formato válido
    if (!ethers.utils.isAddress(address)) {
      return res.status(400).json({
        success: false,
        message: 'Dirección Ethereum inválida'
      });
    }
    
    // Verificar que la firma sea válida
    let signerAddr;
    try {
      signerAddr = ethers.utils.verifyMessage(message, signature);
    } catch (e) {
      return res.status(401).json({
        success: false,
        message: 'Formato de firma inválido'
      });
    }
    
    // Verificar que la dirección recuperada coincida con la proporcionada
    if (signerAddr.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message: 'Firma no corresponde a la dirección proporcionada'
      });
    }
    
    // Continuar
    next();
  } catch (error) {
    console.error('Error verificando firma:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error interno verificando firma'
    });
  }
};

// protect ahora es un alias de authenticate para mantener compatibilidad
const protect = authenticate;

/**
 * Middleware para verificar si el usuario es un votante verificado
 */
const isVerifiedVoter = async (req, res, next) => {
  try {
    // Verificar que el middleware authenticate se haya ejecutado primero
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Se requiere autenticación'
      });
    }
    
    // Verificar según el tipo de usuario
    if (req.userType === 'voter') {
      if (!req.voter.isVerified) {
        return res.status(403).json({
          success: false,
          message: 'Se requiere verificación de identidad para acceder a esta ruta'
        });
      }
    } else if (req.userType === 'blockchain') {
      if (!req.user.isVerified) {
        return res.status(403).json({
          success: false,
          message: 'Se requiere verificación de identidad para acceder a esta ruta'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Error verificando estado de verificación:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error del servidor verificando estado'
    });
  }
};

module.exports = {
  authenticate,  // Nuevo middleware unificado
  verifyToken,   // Mantener para compatibilidad
  protect,       // Mantener para compatibilidad
  isAdmin,
  verifySignature,
  isVerifiedVoter // Nuevo middleware para verificar votantes
};
