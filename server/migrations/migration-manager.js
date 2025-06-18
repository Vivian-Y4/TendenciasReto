/**
 * Sistema de migraciu00f3n de base de datos
 * Permite gestionar cambios en el esquema de forma ordenada y con posibilidad de rollback
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Modelo para llevar registro de migraciones aplicadas
const MigrationSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  appliedAt: { type: Date, default: Date.now },
  version: { type: Number, required: true },
  description: String,
  hash: String // Hash del contenido para verificar integridad
});

const Migration = mongoose.model('Migration', MigrationSchema);

// Clase para gestionar migraciones
class MigrationManager {
  constructor() {
    this.mongoUri = process.env.MONGO_URI || 'mongodb+srv://nateravivi:7l8FK20TtFeWhzeP@cluster0.vrk8zps.mongodb.net/voting-platform';
    this.migrationsDir = path.join(__dirname, 'scripts');
    this.verbose = true;
  }

  /**
   * Inicializa la conexiu00f3n a la base de datos
   */
  async connect() {
    this.log('Conectando a la base de datos...');
    
    try {
      await mongoose.connect(this.mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useFindAndModify: false,
        useCreateIndex: true
      });
      this.log('Conexiu00f3n establecida correctamente.');
    } catch (error) {
      console.error('Error al conectar a MongoDB:', error);
      throw error;
    }
  }

  /**
   * Cierra la conexiu00f3n a la base de datos
   */
  async disconnect() {
    await mongoose.disconnect();
    this.log('Conexiu00f3n a la base de datos cerrada.');
  }

  /**
   * Escanea el directorio de migraciones y retorna los scripts disponibles
   */
  async getMigrationFiles() {
    // Crear directorio si no existe
    if (!fs.existsSync(this.migrationsDir)) {
      fs.mkdirSync(this.migrationsDir, { recursive: true });
      this.log(`Directorio de migraciones creado: ${this.migrationsDir}`);
      return [];
    }
    
    const files = fs.readdirSync(this.migrationsDir);
    
    // Filtrar archivos de migraciu00f3n y ordenarlos por versiu00f3n
    return files
      .filter(file => /^\d{4}-.*\.js$/.test(file)) // Formato: 0001-nombre-migracion.js
      .sort((a, b) => {
        const versionA = parseInt(a.split('-')[0]);
        const versionB = parseInt(b.split('-')[0]);
        return versionA - versionB;
      });
  }

  /**
   * Obtiene las migraciones ya aplicadas desde la base de datos
   */
  async getAppliedMigrations() {
    const applied = await Migration.find().sort({ version: 1 });
    return applied;
  }

  /**
   * Determina quu00e9 migraciones necesitan ser aplicadas
   */
  async getPendingMigrations() {
    const files = await this.getMigrationFiles();
    const applied = await this.getAppliedMigrations();
    const appliedNames = applied.map(m => m.name);
    
    return files.filter(file => !appliedNames.includes(file));
  }

  /**
   * Ejecuta una migraciu00f3n especu00edfica
   */
  async runMigration(filename) {
    const filePath = path.join(this.migrationsDir, filename);
    const version = parseInt(filename.split('-')[0]);
    
    this.log(`Ejecutando migraciu00f3n: ${filename} (versiu00f3n ${version})`);
    
    try {
      // Importar el script de migraciu00f3n
      const migration = require(filePath);
      
      // Verificar que tenga los mu00e9todos requeridos
      if (typeof migration.up !== 'function') {
        throw new Error(`La migraciu00f3n ${filename} no tiene un mu00e9todo 'up' vu00e1lido`);
      }
      
      // Ejecutar la migraciu00f3n
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        await migration.up(mongoose, session);
        
        // Registrar la migraciu00f3n como aplicada
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const hash = require('crypto').createHash('md5').update(fileContent).digest('hex');
        
        await Migration.create([{
          name: filename,
          version,
          description: migration.description || '',
          hash
        }], { session });
        
        await session.commitTransaction();
        this.log(`Migraciu00f3n ${filename} aplicada correctamente.`);
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      console.error(`Error en migraciu00f3n ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Revierte una migraciu00f3n especu00edfica
   */
  async revertMigration(migrationDoc) {
    const filename = migrationDoc.name;
    const filePath = path.join(this.migrationsDir, filename);
    
    this.log(`Revirtiendo migraciu00f3n: ${filename} (versiu00f3n ${migrationDoc.version})`);
    
    try {
      // Importar el script de migraciu00f3n
      const migration = require(filePath);
      
      // Verificar que tenga mu00e9todo down para revertir
      if (typeof migration.down !== 'function') {
        throw new Error(`La migraciu00f3n ${filename} no tiene un mu00e9todo 'down' vu00e1lido para revertir`);
      }
      
      // Revertir la migraciu00f3n
      const session = await mongoose.startSession();
      session.startTransaction();
      
      try {
        await migration.down(mongoose, session);
        
        // Eliminar el registro de la migraciu00f3n
        await Migration.deleteOne({ _id: migrationDoc._id }, { session });
        
        await session.commitTransaction();
        this.log(`Migraciu00f3n ${filename} revertida correctamente.`);
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        session.endSession();
      }
    } catch (error) {
      console.error(`Error al revertir migraciu00f3n ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Aplica todas las migraciones pendientes
   */
  async migrateUp() {
    await this.connect();
    
    try {
      const pendingMigrations = await this.getPendingMigrations();
      
      if (pendingMigrations.length === 0) {
        this.log('No hay migraciones pendientes por aplicar.');
        return;
      }
      
      this.log(`Se aplicaru00e1n ${pendingMigrations.length} migraciones:`);
      pendingMigrations.forEach(file => this.log(` - ${file}`));
      
      // Ejecutar migraciones en orden
      for (const file of pendingMigrations) {
        await this.runMigration(file);
      }
      
      this.log('\nTodas las migraciones se han aplicado correctamente.');
    } catch (error) {
      console.error('Error durante la migraciu00f3n:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Revierte la u00faltima migraciu00f3n aplicada
   */
  async migrateDown() {
    await this.connect();
    
    try {
      const appliedMigrations = await this.getAppliedMigrations();
      
      if (appliedMigrations.length === 0) {
        this.log('No hay migraciones aplicadas para revertir.');
        return;
      }
      
      // Obtener la u00faltima migraciu00f3n aplicada
      const lastMigration = appliedMigrations[appliedMigrations.length - 1];
      this.log(`Revirtiendo la u00faltima migraciu00f3n: ${lastMigration.name}`);
      
      await this.revertMigration(lastMigration);
      
      this.log('\nMigraciu00f3n revertida correctamente.');
    } catch (error) {
      console.error('Error durante la reversiu00f3n:', error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Crea un nuevo archivo de migraciu00f3n
   */
  createMigrationFile(name) {
    if (!name) {
      throw new Error('Debe proporcionar un nombre para la migraciu00f3n');
    }
    
    // Normalizar nombre: convertir espacios y caracteres especiales a guiones
    const normalizedName = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Obtener la versiu00f3n mu00e1s alta actual y aumentar en 1
    let highestVersion = 0;
    const files = fs.readdirSync(this.migrationsDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && /^\d{4}-.*\.js$/.test(dirent.name))
      .map(dirent => dirent.name);
    
    if (files.length > 0) {
      highestVersion = Math.max(...files.map(file => parseInt(file.split('-')[0])));
    }
    
    const newVersion = (highestVersion + 1).toString().padStart(4, '0');
    const filename = `${newVersion}-${normalizedName}.js`;
    const filePath = path.join(this.migrationsDir, filename);
    
    // Plantilla para el nuevo archivo de migraciu00f3n
    const template = `/**
 * Migraciu00f3n: ${name}
 * Versiu00f3n: ${newVersion}
 * Fecha de creaciu00f3n: ${new Date().toISOString()}
 */

module.exports = {
  description: "${name}",
  
  /**
   * Aplicar la migraciu00f3n
   * @param {Object} mongoose - Instancia de mongoose
   * @param {Object} session - Sesiu00f3n de MongoDB para transacciones
   */
  async up(mongoose, session) {
    // Implementar los cambios al esquema aquu00ed
    
    // Ejemplo:
    // const db = mongoose.connection.db;
    // await db.collection('users').updateMany(
    //   { /* condiciu00f3n */ },
    //   { $set: { /* nuevos campos */ } },
    //   { session }
    // );
  },
  
  /**
   * Revertir la migraciu00f3n
   * @param {Object} mongoose - Instancia de mongoose
   * @param {Object} session - Sesiu00f3n de MongoDB para transacciones
   */
  async down(mongoose, session) {
    // Implementar la lu00f3gica para revertir los cambios
    
    // Ejemplo:
    // const db = mongoose.connection.db;
    // await db.collection('users').updateMany(
    //   { /* condiciu00f3n */ },
    //   { $unset: { /* eliminar campos */ } },
    //   { session }
    // );
  }
};
`;
    
    fs.writeFileSync(filePath, template);
    this.log(`Archivo de migraciu00f3n creado: ${filePath}`);
    
    return filePath;
  }

  /**
   * Imprime un mensaje en la consola si el modo verbose estu00e1 activado
   */
  log(message) {
    if (this.verbose) {
      console.log(message);
    }
  }
}

module.exports = MigrationManager;
