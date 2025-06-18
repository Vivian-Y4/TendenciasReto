/**
 * Script para realizar backups automu00e1ticos de la base de datos
 * Este script puede configurarse para ejecutarse periu00f3dicamente mediante cron o Windows Task Scheduler
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Configuraciu00f3n
const config = {
  // MongoDB URI (desde variables de entorno)
  mongoUri: process.env.MONGO_URI || 'mongodb+srv://nateravivi:7l8FK20TtFeWhzeP@cluster0.vrk8zps.mongodb.net/voting-platform',
  // Directorio para almacenar backups
  backupDir: path.join(__dirname, '..', '..', 'database-backups'),
  // Nombre de la base de datos (extrau00eddo del MongoDB URI)
  dbName: (process.env.MONGO_URI || 'mongodb+srv://nateravivi:7l8FK20TtFeWhzeP@cluster0.vrk8zps.mongodb.net/voting-platform').split('/').pop() || 'blockchain-voting',
  // Retenciu00f3n de backups (en du00edas)
  retentionDays: 30,
  // Prefijo para los archivos de backup
  backupPrefix: 'voting-platform-backup-',
  // Comprimir backup
  compress: true
};

/**
 * Crea el directorio de backups si no existe
 */
const ensureBackupDir = () => {
  if (!fs.existsSync(config.backupDir)) {
    console.log(`Creando directorio de backups: ${config.backupDir}`);
    fs.mkdirSync(config.backupDir, { recursive: true });
  }
};

/**
 * Genera un nombre de archivo u00fanico para el backup
 */
const generateBackupFilename = () => {
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, '-');
  return `${config.backupPrefix}${timestamp}`;
};

/**
 * Elimina backups antiguos segu00fan la polu00edtica de retenciu00f3n
 */
const cleanupOldBackups = () => {
  console.log('Verificando backups antiguos...');
  const files = fs.readdirSync(config.backupDir);
  
  const backupFiles = files.filter(file => 
    file.startsWith(config.backupPrefix) && 
    (file.endsWith('.archive') || file.endsWith('.gz'))
  );
  
  const now = new Date();
  const retentionTime = config.retentionDays * 24 * 60 * 60 * 1000; // du00edas a milisegundos
  
  backupFiles.forEach(file => {
    const filePath = path.join(config.backupDir, file);
    const stats = fs.statSync(filePath);
    const fileAge = now - stats.mtime;
    
    if (fileAge > retentionTime) {
      console.log(`Eliminando backup antiguo: ${file}`);
      fs.unlinkSync(filePath);
    }
  });
};

/**
 * Ejecuta el backup de la base de datos
 */
const performBackup = () => {
  ensureBackupDir();
  const backupFilename = generateBackupFilename();
  const backupPath = path.join(config.backupDir, backupFilename);
  
  // Comando de mongodump
  let mongodumpCmd = `mongodump --uri="${config.mongoUri}" --out="${backupPath}.archive"`;
  
  // Au00f1adir compresiu00f3n si estu00e1 habilitada
  if (config.compress) {
    mongodumpCmd += ` --gzip`;
  }
  
  console.log(`Iniciando backup de la base de datos ${config.dbName}...`);
  console.log(`Comando: ${mongodumpCmd}`);
  
  // Ejecutar el comando de backup
  exec(mongodumpCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error durante el backup: ${error.message}`);
      return;
    }
    
    if (stderr) {
      console.error(`Advertencias durante el backup: ${stderr}`);
    }
    
    console.log(`Backup completado exitosamente: ${backupPath}.archive${config.compress ? '.gz' : ''}`);
    console.log('Tamau00f1o del backup:', getFileSize(`${backupPath}.archive${config.compress ? '.gz' : ''}`));
    
    // Limpiar backups antiguos
    cleanupOldBackups();
  });
};

/**
 * Obtiene el tamau00f1o de un archivo en formato legible
 */
const getFileSize = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
    return `${fileSizeInMB.toFixed(2)} MB`;
  } catch (error) {
    return 'No se pudo determinar';
  }
};

/**
 * Punto de entrada
 */
const main = () => {
  console.log('=== SISTEMA DE BACKUP DE BASE DE DATOS ===');
  console.log(`Fecha y hora: ${new Date().toISOString()}`);
  console.log(`Base de datos: ${config.dbName}`);
  console.log(`Polu00edtica de retenciu00f3n: ${config.retentionDays} du00edas`);
  
  try {
    performBackup();
  } catch (error) {
    console.error('Error fatal durante el proceso de backup:', error);
    process.exit(1);
  }
};

// Ejecutar el backup
main();
