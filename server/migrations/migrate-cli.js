#!/usr/bin/env node

/**
 * CLI para gestionar migraciones de base de datos
 * Permite crear nuevas migraciones, aplicarlas y revertirlas
 */

const MigrationManager = require('./migration-manager');
const fs = require('fs');
const path = require('path');

// Crear instancia del gestor de migraciones
const migrationManager = new MigrationManager();

// Obtener argumentos de la línea de comandos
const args = process.argv.slice(2);
const command = args[0];

/**
 * Muestra la ayuda del comando
 */
function showHelp() {
  console.log('\nSistema de Migración de Base de Datos para Blockchain Voting Platform');
  console.log('=================================================================\n');
  console.log('Comandos disponibles:');
  console.log('  create [nombre]     Crea un nuevo archivo de migración con el nombre especificado');
  console.log('  up                  Aplica todas las migraciones pendientes');
  console.log('  down                Revierte la última migración aplicada');
  console.log('  status              Muestra el estado actual de las migraciones');
  console.log('  help                Muestra esta ayuda\n');
  console.log('Ejemplos:');
  console.log('  node migrate-cli.js create "añadir-campo-votante"');
  console.log('  node migrate-cli.js up');
  console.log('  node migrate-cli.js down\n');
}

/**
 * Muestra el estado actual de las migraciones
 */
async function showStatus() {
  try {
    await migrationManager.connect();
    
    const files = await migrationManager.getMigrationFiles();
    const applied = await migrationManager.getAppliedMigrations();
    const pending = await migrationManager.getPendingMigrations();
    
    console.log('\nEstado actual de migraciones:\n');
    console.log(`Total de archivos de migración: ${files.length}`);
    console.log(`Migraciones aplicadas: ${applied.length}`);
    console.log(`Migraciones pendientes: ${pending.length}\n`);
    
    if (applied.length > 0) {
      console.log('Migraciones aplicadas:');
      applied.forEach(migration => {
        console.log(` - ${migration.name} (${new Date(migration.appliedAt).toLocaleString()})`);
      });
      console.log();
    }
    
    if (pending.length > 0) {
      console.log('Migraciones pendientes:');
      pending.forEach(file => {
        console.log(` - ${file}`);
      });
      console.log();
    }
  } catch (error) {
    console.error('Error al mostrar el estado:', error);
  } finally {
    await migrationManager.disconnect();
  }
}

/**
 * Punto de entrada principal
 */
async function main() {
  try {
    switch (command) {
      case 'create':
        if (!args[1]) {
          console.error('Error: Debe especificar un nombre para la migración');
          showHelp();
          process.exit(1);
        }
        
        const filePath = migrationManager.createMigrationFile(args[1]);
        console.log(`\nMigración creada exitosamente: ${filePath}`);
        console.log('Edite este archivo para implementar los cambios deseados.');
        break;
      
      case 'up':
        await migrationManager.migrateUp();
        break;
      
      case 'down':
        await migrationManager.migrateDown();
        break;
      
      case 'status':
        await showStatus();
        break;
      
      case 'help':
        showHelp();
        break;
      
      default:
        console.error(`Error: Comando desconocido '${command}'`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Ejecutar el comando
main();
