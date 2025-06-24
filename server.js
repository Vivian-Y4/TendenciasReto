const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const electionRoutes = require('./routes/elections');
const adminRoutes = require('./server/routes/admin');
const userWalletRoutes = require('./server/routes/userWallet');
const adminStatsRoutes = require('./server/routes/adminStatistics');
const adminActivityRoutes = require('./server/routes/activityLog');
const jceVoterRegistryRoutes = require('./server/routes/jceVoterRegistry'); // Added JCE routes
const candidateAdminRoutes = require('./server/routes/candidateAdmin');
const { listenForElections } = require('./server/services/blockchainListener');
const adminVoterRoutes = require('./server/routes/adminVoter');
const electionAdminRoutes = require('./server/routes/electionAdmin'); // ¡LA RUTA CORRECTA!

const app = express();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Permitir cualquier origen en desarrollo
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://nateravivi:7l8FK20TtFeWhzeP@cluster0.vrk8zps.mongodb.net/voting-platform')
.then(() => {
  console.log('MongoDB Connected');
  listenForElections(); // Iniciar el listener de eventos de la blockchain
})
.catch(err => console.log('MongoDB Connection Error:', err));

// --- RUTAS PRINCIPALES ---
app.use('/api/auth', authRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/admin/statistics', adminStatsRoutes);
app.use('/api/admin/activity', adminActivityRoutes);
app.use('/api/admin/candidates', candidateAdminRoutes);
app.use('/api/admin/voters', adminVoterRoutes);
app.use('/api/admin/elections', electionAdminRoutes); // ¡USANDO LA RUTA CORRECTA!

// Resto de rutas admin
app.use('/api/admin', adminRoutes);
app.use('/api/wallet', userWalletRoutes);
app.use('/api/jce-registry', jceVoterRegistryRoutes); // Use JCE routes

// Ruta básica para /api (útil para pruebas y evitar 404)
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API de Blockchain Voting Platform funcionando correctamente',
    endpoints: [
      '/api/auth',
      '/api/admin',
      '/api/elections',
      '/api/wallet',
      '/api/jce-registry' // Added JCE endpoint to list
    ]
  });
});

// Verificación básica de funcionamiento
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working correctly' });
});

// --- MANEJO DE ERRORES (siempre al final) ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start server
const PORT = 3333; // Puerto fijo para evitar conflictos
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Test the connection by visiting http://localhost:${PORT}/test`);
});