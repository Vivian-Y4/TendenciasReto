const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

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
    
    // Verificar que el token sea de un administrador
    if (!decoded.role || decoded.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acceso denegado. Se requieren privilegios de administrador.' 
      });
    }

    // Verificar que el administrador siga existiendo en la base de datos
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token no válido. Administrador no encontrado.' 
      });
    }

    // Adjuntar información del administrador a la solicitud
    req.admin = decoded;
    next();
  } catch (error) {
    console.error('Error en middleware de autenticación de administrador:', error);
    
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
