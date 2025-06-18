const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const crypto = require('crypto');

// Store for nonces (in a production environment, use Redis or a database)
const adminNonceStore = new Map();

// Login administrador con credenciales
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    console.log('Intento de login:', { username, password });

    // Busca el admin en minúsculas
    const admin = await Admin.findOne({ username: username.toLowerCase() });
    console.log('Admin encontrado:', admin);

    if (!admin) {
      console.log('No existe admin');
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const isMatch = await admin.comparePassword(password);
    console.log('Password match:', isMatch);

    if (isMatch) {
      // Generar token
      const token = jwt.sign(
        {
          id: admin._id,
          username: admin.username,
          name: admin.name,
          role: 'admin',
          permissions: admin.permissions
        },
        process.env.JWT_SECRET,
        { expiresIn: '12h' }
      );
    
      // Respuesta exitosa
      return res.json({
        success: true,
        message: 'Login exitoso',
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          name: admin.name,
          permissions: admin.permissions
        }
      });
    }

    // RESPONDE SI EL PASSWORD NO COINCIDE
    return res.status(401).json({ success: false, message: 'Credenciales inválidas' });

  } catch (error) {
    next(new Error('Error en login de administrador'));
  }
};

// Obtener perfil del administrador
exports.getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Administrador no encontrado' });
    }

    res.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        walletAddress: admin.walletAddress,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil de administrador:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error de servidor', 
      error: error.message 
    });
  }
};

// Generar nonce para autenticación con MetaMask (opcional)
exports.getNonce = async (req, res) => {
  try {
    // Generar un nonce aleatorio
    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = Date.now();
    const message = `Bienvenido al Panel de Administración de la Plataforma de Votación. Firma este mensaje para autenticarte como administrador. Nonce: ${nonce}. Timestamp: ${timestamp}`;
    
    // Almacenar el nonce
    adminNonceStore.set(nonce, { message, timestamp, expires: timestamp + 300000 }); // expira en 5 minutos
    
    // Limpiar nonces expirados
    const now = Date.now();
    for (const [key, value] of adminNonceStore.entries()) {
      if (value.expires < now) {
        adminNonceStore.delete(key);
      }
    }
    
    res.json({
      success: true,
      message,
      nonce
    });
  } catch (error) {
    console.error('Error al generar nonce para admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error generando nonce de autenticación',
      error: error.message
    });
  }
};

// Verificar firma de MetaMask para autenticación de administrador
exports.verifySignature = async (req, res) => {
  try {
    const { address, signature, message } = req.body;
    
    if (!address || !signature || !message) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros requeridos'
      });
    }
    
    // Extraer nonce del mensaje
    const nonceMatch = message.match(/Nonce: ([0-9a-f]+)/);
    if (!nonceMatch || !nonceMatch[1]) {
      return res.status(400).json({
        success: false,
        message: 'Formato de mensaje inválido'
      });
    }
    
    const nonce = nonceMatch[1];
    const storedNonce = adminNonceStore.get(nonce);
    
    // Verificar nonce
    if (!storedNonce || storedNonce.expires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Nonce expirado o inválido'
      });
    }
    
    // Verificar que el mensaje coincide
    if (storedNonce.message !== message) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje no coincide'
      });
    }
    
    // Buscar administrador por dirección de wallet
    const admin = await Admin.findOne({ walletAddress: address });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Esta dirección no está registrada como administrador.'
      });
    }
    
    // Actualizar último login
    admin.lastLogin = Date.now();
    await admin.save();
    
    // Eliminar el nonce para prevenir reutilización
    adminNonceStore.delete(nonce);
    
    // Generar token
    const token = jwt.sign(
      { 
        id: admin._id, 
        username: admin.username,
        name: admin.name,
        walletAddress: address,
        role: 'admin',
        permissions: admin.permissions
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' }
    );
    
    res.json({
      success: true,
      message: 'Autenticación exitosa',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        walletAddress: address,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Error verificando firma de administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error verificando firma',
      error: error.message
    });
  }
};

// Crear administrador (solo para desarrollo/inicialización)
exports.createAdmin = async (req, res) => {
  try {
    // En producción, esto debería estar protegido o deshabilitado
    const { username, password, name, walletAddress, permissions } = req.body;
    
    // Verificar si ya existe
    const existingAdmin = await Admin.findOne({ 
      $or: [
        { username },
        walletAddress ? { walletAddress } : { _id: null }
      ]
    });
    
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un administrador con ese nombre de usuario o dirección de wallet'
      });
    }
    
    // Crear nuevo administrador
    const admin = new Admin({
      username,
      password, // Se hasheará automáticamente por el middleware
      name,
      walletAddress,
      permissions: permissions || {}
    });
    
    await admin.save();
    
    res.status(201).json({
      success: true,
      message: 'Administrador creado exitosamente',
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        walletAddress: admin.walletAddress,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Error creando administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando administrador',
      error: error.message
    });
  }
};

// Actualizar administrador
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, walletAddress, permissions } = req.body;
    
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrador no encontrado'
      });
    }
    
    // Actualizar campos
    if (name) admin.name = name;
    if (walletAddress) admin.walletAddress = walletAddress;
    if (permissions) admin.permissions = { ...admin.permissions, ...permissions };
    
    await admin.save();
    
    res.json({
      success: true,
      message: 'Administrador actualizado exitosamente',
      admin: {
        id: admin._id,
        username: admin.username,
        name: admin.name,
        walletAddress: admin.walletAddress,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Error actualizando administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error actualizando administrador',
      error: error.message
    });
  }
};