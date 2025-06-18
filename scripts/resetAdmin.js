const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

// Importar el modelo de Admin
const Admin = require('../models/Admin');

// Función para reiniciar administrador
async function resetAdmin() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://nateravivi:7l8FK20TtFeWhzeP@cluster0.vrk8zps.mongodb.net/voting-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB conectado correctamente');
    
    // Eliminar todos los administradores existentes
    await Admin.deleteMany({});
    console.log('Administradores anteriores eliminados');
    
    // Credenciales del administrador
    const adminData = {
      name: 'Katriel Castillo Encarnacion',
      username: 'katriel',
      password: 'FMR2F7Qg@',
      permissions: {
        canManageElections: true,
        canManageVoters: true,
        canViewStatistics: true,
        systemConfig: true
      }
    };
    
    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminData.password, salt);
    
    // Crear nuevo administrador
    const newAdmin = new Admin({
      name: adminData.name,
      username: adminData.username,
      password: hashedPassword,
      permissions: adminData.permissions
    });
    
    await newAdmin.save();
    console.log('Administrador recreado correctamente');
    
    // Mostrar información de acceso
    console.log('Información de acceso:');
    console.log('Usuario: ' + adminData.username);
    console.log('Contraseña: ' + adminData.password);
    console.log('Nombre completo: ' + adminData.name);
    
    // Cerrar conexión
    mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
  } catch (error) {
    console.error('Error al reiniciar administrador:', error);
  }
}

// Ejecutar función
resetAdmin();
