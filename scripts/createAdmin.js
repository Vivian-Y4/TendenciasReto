const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

// Importar el modelo de Admin
const Admin = require('../models/Admin');

// Función para crear administrador
async function createAdmin() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://nateravivi:7l8FK20TtFeWhzeP@cluster0.vrk8zps.mongodb.net/voting-platform', {
      // Las siguientes opciones ya no son necesarias en Mongoose 6+, pero no afectan si las dejas
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('MongoDB conectado correctamente');

    // Credenciales del administrador
    const adminData = {
      name: 'Katriel Castillo Encarnacion',
      username: 'katriel',
      password: 'FMR2F7Qg@',
      permissions: {
        canManageElections: true,
        canManageVoters: true,
        canViewStatistics: true
      }
    };

    // Eliminar cualquier admin previo con el mismo username (opcional pero recomendable para evitar duplicados)
    await Admin.deleteMany({ username: adminData.username });

    // Crear nuevo administrador
    const newAdmin = new Admin({
      name: adminData.name,
      username: adminData.username,
      password: adminData.password, // TEXTO PLANO, el modelo lo hashea
      permissions: adminData.permissions
    });

    await newAdmin.save();
    console.log('Administrador creado correctamente');

    // Mostrar información de acceso
    console.log('Información de acceso:');
    console.log('Usuario: ' + adminData.username);
    console.log('Contraseña: ' + adminData.password);
    console.log('Nombre completo: ' + adminData.name);

    // Cerrar conexión
    mongoose.connection.close();
    console.log('Conexión a MongoDB cerrada');
  } catch (error) {
    console.error('Error al crear administrador:', error);
  }
}

// Ejecutar función
createAdmin();