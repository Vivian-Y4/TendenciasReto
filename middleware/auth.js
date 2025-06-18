const jwt = require('jsonwebtoken');
const Voter = require('../models/Voter');

module.exports = async (req, res, next) => {
  try {
    // Verificar si hay token en el header
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No hay token, acceso denegado' 
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el votante sigue existiendo en la base de datos
    const voter = await Voter.findById(decoded.id);
    if (!voter) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token no válido. Usuario no encontrado.' 
      });
    }

    // Adjuntar información del usuario a la solicitud
    req.voter = decoded;
    next();
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token no válido' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expirado' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error de servidor', 
      error: error.message 
    });
  }
};
