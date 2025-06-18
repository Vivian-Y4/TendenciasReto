// server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
dotenv.config();

// Importa el modelo Admin ya definido en models/Admin.js
const Admin = require('./models/Admin');

// Si tienes otros modelos, impórtalos aquí
const userWalletRoutes = require('./routes/userWallet');
// ...importa aquí otras rutas si las tienes...

// Conexión a MongoDB
const mongoURI = process.env.MONGODB_URI || 'mongodb+srv://nateravivi:7l8FK20TtFeWhzeP@cluster0.vrk8zps.mongodb.net/voting-platform';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globales
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Origin', 'Authorization']
}));
app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de autenticación para rutas admin protegidas
const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ success: false, message: 'No hay token, autorización denegada' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'blockchain_secret_key');
    if (decoded.type !== 'admin') return res.status(403).json({ success: false, message: 'Token inválido, se requiere un token de administrador' });
    const admin = await Admin.findById(decoded.id);
    if (!admin) return res.status(401).json({ success: false, message: 'Administrador no encontrado' });
    req.user = { id: admin._id, username: admin.username, isAdmin: true, permissions: admin.permissions };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'El token ha expirado, inicie sesión nuevamente' });
    }
    res.status(401).json({ success: false, message: 'Token inválido' });
  }
};

// Rutas principales
app.use('/api/wallet', userWalletRoutes);
// ...aquí puedes agregar otras rutas, por ejemplo:
// app.use('/api/elections', require('./routes/elections'));
// app.use('/api/loquesea', require('./routes/loquesea'));

// Endpoint de login de admin
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Se requiere nombre de usuario y contraseña' });
    const admin = await Admin.findOne({ username: username.toLowerCase() });
    if (!admin) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    const token = admin.generateAuthToken();
    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        username: admin.username,
        walletAddress: admin.walletAddress,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// Endpoint para obtener el perfil del admin autenticado
app.get('/api/admin/profile', adminAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Administrador no encontrado' });
    res.json({
      success: true,
      admin: {
        id: admin._id,
        name: admin.name,
        username: admin.username,
        walletAddress: admin.walletAddress,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// Crear admin inicial si no existe
const createInitialAdmin = async () => {
  try {
    const count = await Admin.countDocuments();
    if (count === 0) {
      const adminData = {
        name: 'Katriel Administrador',
        username: 'katriel',
        password: 'VotingAdmin2023',
        permissions: {
          canViewDashboard: true,
          canCreateElections: true,
          canManageElections: true,
          canManageVoters: true,
          canFinalizeResults: true,
          canViewReports: true,
          canManageAdmins: true,
          canManageSettings: true,
          canViewActivity: true
        }
      };
      const admin = new Admin(adminData);
      await admin.save();
      console.log('Initial admin created:', { name: admin.name, username: admin.username });
    }
  } catch (error) {
    console.error('Error creating initial admin:', error);
  }
};

// Ruta de estado y test
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'API funcionando correctamente', timestamp: new Date() });
});

// Servir frontend en producción
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
  });
}

// Iniciar servidor y crear admin inicial si es necesario
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Servidor Express iniciado en el puerto ${PORT}`);
  await createInitialAdmin();
});
server.on('error', (error) => {
  console.error('Error al iniciar el servidor Express:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya está en uso. Intente con otro puerto.`);
  }
});