const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Importar el modelo de Admin
const Admin = require('../models/Admin');

// Función para verificar administrador
async function checkAdmin() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://nateravivi:7l8FK20TtFeWhzeP@cluster0.vrk8zps.mongodb.net/voting-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB conectado correctamente');
    
    // Buscar todos los administradores
    const admins = await Admin.find({});
    
    if (admins.length === 0) {
      console.log('No hay administradores en la base de datos');
      return;
    }
    
    console.log(`Encontrados ${admins.length} administradores:`);
    
    // Mostrar información de cada administrador
    admins.forEach((admin, index) => {
      console.log(`\n--- Administrador ${index + 1} ---`);
      console.log(`ID: ${admin._id}`);
      console.log(`Nombre: ${admin.name}`);
      console.log(`Usuario: ${admin.username}`);
      console.log(`Wallet: ${admin.walletAddress || 'No configurada'}`);
      console.log('Permisos:', admin.permissions);
    });
    
    // Verificar específicamente el administrador "katriel"
    const katriel = await Admin.findOne({ username: 'katriel' });
    
    if (katriel) {
      console.log('\n--- Verificando administrador katriel ---');
      console.log(`ID: ${katriel._id}`);
      console.log(`Nombre: ${katriel.name}`);
      console.log(`Usuario: ${katriel.username}`);
      console.log(`Contraseña hasheada: ${katriel.password?.substring(0, 20)}... (${katriel.password?.length} caracteres)`);
      console.log('Permisos:', JSON.stringify(katriel.permissions, null, 2));
      console.log(`Fecha de creación: ${katriel.createdAt}`);
    } else {
      console.log('\nNo se encontró el administrador con usuario "katriel"');
    }
    
    // Cerrar conexión
    mongoose.connection.close();
    console.log('\nConexión a MongoDB cerrada');
  } catch (error) {
    console.error('Error al verificar administrador:', error);
  }
}

// Ejecutar función
checkAdmin();
