/**
 * Migraciu00f3n: Au00f1adir campo de estado a elecciones
 * Versiu00f3n: 0001
 * Fecha de creaciu00f3n: 2025-05-21T21:35:00.000Z
 */

module.exports = {
  description: "Au00f1adir campo de estado a las elecciones para mejor tracking",
  
  /**
   * Aplicar la migraciu00f3n
   * @param {Object} mongoose - Instancia de mongoose
   * @param {Object} session - Sesiu00f3n de MongoDB para transacciones
   */
  async up(mongoose, session) {
    const db = mongoose.connection.db;
    
    // Au00f1adir el campo status a todos los documentos en la colecciu00f3n ElectionMeta
    await db.collection('electionmetas').updateMany(
      { status: { $exists: false } },
      { 
        $set: { 
          status: 'active', // Valor por defecto para registros existentes
        } 
      },
      { session }
    );
    
    console.log('Campo de estado au00f1adido a todas las elecciones existentes');
  },
  
  /**
   * Revertir la migraciu00f3n
   * @param {Object} mongoose - Instancia de mongoose
   * @param {Object} session - Sesiu00f3n de MongoDB para transacciones
   */
  async down(mongoose, session) {
    const db = mongoose.connection.db;
    
    // Eliminar el campo status de todos los documentos
    await db.collection('electionmetas').updateMany(
      {},
      { $unset: { status: "" } },
      { session }
    );
    
    console.log('Campo de estado eliminado de todas las elecciones');
  }
};
