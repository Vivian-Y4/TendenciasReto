const express = require('express');
const cors = require('cors');

// Create a simple Express app
const app = express();
const PORT = process.env.PORT || 3333;

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-auth-token', 'Origin', 'Authorization']
}));

// Parse JSON request bodies
app.use(express.json());

// Test route
app.get('/api/test', (req, res) => {
  console.log('Test endpoint called');
  res.json({
    success: true,
    message: 'Test API funcionando correctamente',
    timestamp: new Date()
  });
});

// Simple login endpoint
app.post('/api/admin/login', (req, res) => {
  console.log('Login attempt:', req.body);
  
  const { username, password } = req.body;
  
  // Simple validation
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Se requiere nombre de usuario y contraseña'
    });
  }
  
  // Simple hardcoded check
  if (username === 'katriel' && password === 'VotingAdmin2023') {
    console.log('Login successful');
    return res.json({
      success: true,
      token: 'test-token-123456',
      admin: {
        id: '1',
        name: 'Katriel Administrador',
        username: 'katriel',
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
      }
    });
  } else {
    console.log('Login failed: Invalid credentials');
    return res.status(401).json({
      success: false,
      message: 'Credenciales inválidas'
    });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/test`);
});
