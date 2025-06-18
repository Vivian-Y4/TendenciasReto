const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Asegurar que los directorios de uploads existan
const createUploadDirectories = () => {
  const dirs = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../uploads/candidates'),
    path.join(__dirname, '../../uploads/voters'),
    path.join(__dirname, '../../uploads/temp')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

// Crear directorios al iniciar la aplicación
createUploadDirectories();

// Configuración para carga de imágenes
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter: (req, file, cb) => {
    // Verificar que sea una imagen
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  }
});

// Configuración para carga de archivos CSV
const csvUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../../uploads/temp'));
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'import-' + uniqueSuffix + '.csv');
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Verificar que sea un CSV
    if (file.mimetype === 'text/csv' || 
        file.originalname.endsWith('.csv') || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'), false);
    }
  }
});

// Exportar configuraciones
module.exports = {
  imageUpload,
  csvUpload
};
