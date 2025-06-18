const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');

// Create express app
const app = express();
const PORT = process.env.PORT || 3333;

// MongoDB connection string
const mongoURI = process.env.MONGO_URI || 'mongodb+srv://nateravivi:7l8FK20TtFeWhzeP@cluster0.vrk8zps.mongodb.net/voting-platformct';

// Connect to MongoDB
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Define Admin Schema
const AdminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  walletAddress: {
    type: String,
    trim: true,
    lowercase: true
  },
  permissions: {
    canViewDashboard: { type: Boolean, default: true },
    canCreateElections: { type: Boolean, default: true },
    canManageElections: { type: Boolean, default: true },
    canManageVoters: { type: Boolean, default: true },
    canFinalizeResults: { type: Boolean, default: true },
    canViewReports: { type: Boolean, default: true },
    canManageAdmins: { type: Boolean, default: true },
    canManageSettings: { type: Boolean, default: true },
    canViewActivity: { type: Boolean, default: true }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Password hashing middleware
AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});


AdminSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate JWT token
AdminSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      username: this.username,
      type: 'admin'
    },
    process.env.JWT_SECRET || 'blockchain_secret_key',
    { expiresIn: '24h' }
  );
};

// Create Admin model
const Admin = mongoose.model('Admin', AdminSchema);

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Origin', 'Authorization']
}));
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth middleware
const adminAuth = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    
    // Check if no token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No hay token, autorización denegada'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'blockchain_secret_key');
    
    // Check if admin token
    if (decoded.type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Token inválido, se requiere un token de administrador'
      });
    }
    
    // Find admin in database
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Administrador no encontrado'
      });
    }
    
    // Add admin info to request
    req.user = {
      id: admin._id,
      username: admin.username,
      isAdmin: true,
      permissions: admin.permissions
    };
    
    next();
  } catch (err) {
    console.error('Error en middleware de autenticación de administrador:', err);
    
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

// Test route
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date()
  });
});

// Admin login route
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt:', { username });
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere nombre de usuario y contraseña'
      });
    }
    
    // Find admin by username
    const admin = await Admin.findOne({ username: username.toLowerCase() });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }
    
    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }
    
    // Generate JWT token
    const token = admin.generateAuthToken();
    
    // Send response
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
    console.error('Error en login de administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
});

// Admin profile route
app.get('/api/admin/profile', adminAuth, async (req, res) => {
  try {
    // Find admin by ID
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Administrador no encontrado'
      });
    }
    
    // Send response
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
    console.error('Error al obtener perfil de administrador:', error);
    res.status(500).json({
      success: false,
      message: 'Error en el servidor'
    });
  }
});

// Create initial admin if none exists
const createInitialAdmin = async () => {
  try {
    // Check if there are any admins
    const count = await Admin.countDocuments();
    
    if (count === 0) {
      console.log('No administrators found, creating initial admin user');
      
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
          canManageAdmins: true
        }
      };
      
      const admin = new Admin(adminData);
      await admin.save();
      
      console.log('Initial admin created:', {
        name: admin.name,
        username: admin.username
      });
    }
  } catch (error) {
    console.error('Error creating initial admin:', error);
  }
};

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Admin server running on port ${PORT}`);
  await createInitialAdmin();
});
