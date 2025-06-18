/**
 * Script para restaurar la base de datos desde un backup
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Configuraciu00f3n
const config = {
  // MongoDB URI (desde variables de entorno)
  mongoUri: process.env.MONGO_URI || 'mongodb+srv://nateravivi:7l8FK20TtFeWhzeP@cluster0.vrk8zps.mongodb.net/voting-platform',
  // Directorio donde se almacenan los backups
  backupDir: path.join(__dirname, '..', '..', 'database-backups'),
  // Nombre de la base de datos (extrau00eddo del MongoDB URI)
  dbName: (process.env.MONGO_URI || 'mongodb+srv://nateravivi:7l8FK20TtFeWhzeP@cluster0.vrk8zps.mongodb.net/voting-platform').split('/').pop() || 'blockchain-voting',
  // Prefijo para los archivos de backup
  backupPrefix: 'voting-platform-backup-'
};

/**
 * Lista todos los backups disponibles
 */
const listBackups = () => {
  if (!fs.existsSync(config.backupDir)) {
    console.log('No se encontru00f3 el directorio de backups.');
    return [];
  }
  
  const files = fs.readdirSync(config.backupDir);
  const backupFiles = files.filter(file => 
    file.startsWith(config.backupPrefix) && 
    (file.endsWith('.archive') || file.endsWith('.gz'))
  );
  
  if (backupFiles.length === 0) {
    console.log('No se encontraron backups disponibles.');
    return [];
  }
  
  // Ordenar por fecha (mu00e1s reciente primero)
  backupFiles.sort((a, b) => {
    const statsA = fs.statSync(path.join(config.backupDir, a));
    const statsB = fs.statSync(path.join(config.backupDir, b));
    return statsB.mtime - statsA.mtime;
  });
  
  console.log('Backups disponibles:');
  backupFiles.forEach((file, index) => {
    const stats = fs.statSync(path.join(config.backupDir, file));
    const fileSizeInMB = stats.size / (1024 * 1024);
    console.log(`${index + 1}. ${file} (${fileSizeInMB.toFixed(2)} MB) - Creado: ${stats.mtime.toISOString()}`);
  });
  
  return backupFiles;
};

/**
 * Restaura una base de datos desde un archivo de backup
 */
const restoreDatabase = (backupFilePath, isCompressed) => {
  const isGzipped = backupFilePath.endsWith('.gz');
  
  // Comando de mongorestore
  let mongorestoreCmd = `mongorestore --uri="${config.mongoUri}" --archive="${backupFilePath}"`;
  
  // Au00f1adir paru00e1metro de compresiu00f3n si es necesario
  if (isGzipped) {
    mongorestoreCmd += ' --gzip';
  }
  
  console.log('\nIniciando restauraciu00f3n de la base de datos...');
  console.log(`Comando: ${mongorestoreCmd}`);
  
  exec(mongorestoreCmd, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error durante la restauraciu00f3n: ${error.message}`);
      return;
    }
    
    if (stderr) {
      console.log('Mensajes del proceso de restauraciu00f3n:');
      console.log(stderr);
    }
    
    console.log('\nu00a1Restauraciu00f3n completada exitosamente!');
  });
};

/**
 * Interfaz de lu00ednea de comandos para interactuar con el usuario
 */
const interactiveRestore = () => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('=== SISTEMA DE RESTAURACIu00d3N DE BASE DE DATOS ===');
  
  const backupFiles = listBackups();
  if (backupFiles.length === 0) {
    rl.close();
    return;
  }
  
  rl.question('\nSeleccione el nu00famero del backup a restaurar (o "q" para salir): ', (answer) => {
    if (answer.toLowerCase() === 'q') {
      console.log('Operaciu00f3n cancelada.');
      rl.close();
      return;
    }
    
    const backupIndex = parseInt(answer) - 1;
    if (isNaN(backupIndex) || backupIndex < 0 || backupIndex >= backupFiles.length) {
      console.log('Selecciu00f3n invu00e1lida.');
      rl.close();
      return;
    }
    
    const selectedBackup = backupFiles[backupIndex];
    const backupPath = path.join(config.backupDir, selectedBackup);
    const isCompressed = selectedBackup.endsWith('.gz');
    
    rl.question(`u00bfEstu00e1 seguro de que desea restaurar la base de datos desde "${selectedBackup}"? (s/n): `, (confirmation) => {
      if (confirmation.toLowerCase() === 's') {
        restoreDatabase(backupPath, isCompressed);
      } else {
        console.log('Operaciu00f3n cancelada.');
      }
      rl.close();
    });
  });
};

// Ejecutar en modo interactivo
interactiveRestore();
