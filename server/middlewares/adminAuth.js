const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

/**
 * Middleware para autenticación de administradores
 * Verifica el token JWT y asegura que el usuario sea un administrador
 */
const adminAuth = async (req, res, next) => {
  try {
    // Obtener token del header, soportando 'x-auth-token' y 'Authorization: Bearer <token>'
    let token = req.header('x-auth-token');
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Verificar si no hay token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No hay token, autorización denegada'
      });
    }
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'blockchain_secret_key');
    
    // Verificar que sea un token de administrador
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Token inválido, se requiere un token de administrador'
      });
    }
    
    // Buscar administrador en la base de datos
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Administrador no encontrado'
      });
    }
    
    // Agregar información del usuario a la solicitud
    req.user = {
      id: admin._id,
      _id: admin._id, // Ensure compatibility with controllers expecting _id
      username: admin.username,
      isAdmin: true,
      permissions: admin.permissions
    };
    
    next();
  } catch (err) {
    console.error('Error en middleware de autenticación de administrador:', err);
    
    // Si el error es de expiración del token
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'El token ha expirado, inicie sesión nuevamente'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

module.exports = adminAuth;
