/**
 * Script para crear un administrador inicial en la base de datos
 * Ejecutar con: node server/scripts/createAdmin.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Admin = require('../models/Admin');

// Cargar variables de entorno desde el .env raíz
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Configurar conexión a MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://nateravivi:7l8FK20TtFeWhzeP@cluster0.vrk8zps.mongodb.net/voting-platform');
    console.log(`MongoDB conectado: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error de conexión a MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Crear administrador inicial
const createInitialAdmin = async () => {
  try {
    const connection = await connectDB();

    // Verificar si ya existe un administrador
    const existingAdmin = await Admin.findOne({ username: 'katriel' });

    if (existingAdmin) {
      console.log('Ya existe un administrador con el usuario "katriel"');

      // Preguntar si se desea restablecer la contraseña
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      readline.question('¿Desea restablecer la contraseña? (s/n): ', async (answer) => {
        if (answer.toLowerCase() === 's') {
          // Actualizar contraseña
          existingAdmin.password = 'VotingAdmin2023';
          await existingAdmin.save();
          console.log('Contraseña restablecida exitosamente');
        } else {
          console.log('No se realizaron cambios');
        }

        readline.close();
        await mongoose.disconnect();
        process.exit(0);
      });
    } else {
      // Crear administrador inicial
      const adminData = {
        name: 'Katriel Administrador',
        username: 'katriel',
        password: 'VotingAdmin2023',
        walletAddress: '', // Se puede añadir una dirección específica si se desea
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

      console.log('Administrador inicial creado exitosamente:');
      console.log(`- Nombre: ${admin.name}`);
      console.log(`- Usuario: ${admin.username}`);
      console.log(`- Contraseña: VotingAdmin2023`);

      await mongoose.disconnect();
      process.exit(0);
    }
  } catch (error) {
    console.error(`Error al crear administrador inicial: ${error.message}`);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Ejecutar función principal
createInitialAdmin();