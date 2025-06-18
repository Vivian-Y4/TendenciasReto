/**
 * Migraciu00f3n: Au00f1adir mu00e9tricas de rendimiento a candidatos
 * Versiu00f3n: 0002
 * Fecha de creaciu00f3n: 2025-05-21T21:36:00.000Z
 */

module.exports = {
  description: "Au00f1adir mu00e9tricas de rendimiento para candidatos en elecciones",
  
  /**
   * Aplicar la migraciu00f3n
   * @param {Object} mongoose - Instancia de mongoose
   * @param {Object} session - Sesiu00f3n de MongoDB para transacciones
   */
  async up(mongoose, session) {
    const db = mongoose.connection.db;
    
    // Au00f1adir mu00e9tricas de rendimiento a todos los candidatos
    await db.collection('candidatemetas').updateMany(
      {},
      { 
        $set: { 
          performanceMetrics: {
            viewCount: 0,
            clickThroughRate: 0,
            engagementScore: 0,
            lastUpdated: new Date()
          } 
        } 
      },
      { session }
    );
    
    console.log('Mu00e9tricas de rendimiento au00f1adidas a todos los candidatos');
  },
  
  /**
   * Revertir la migraciu00f3n
   * @param {Object} mongoose - Instancia de mongoose
   * @param {Object} session - Sesiu00f3n de MongoDB para transacciones
   */
  async down(mongoose, session) {
    const db = mongoose.connection.db;
    
    // Eliminar las mu00e9tricas de rendimiento
    await db.collection('candidatemetas').updateMany(
      {},
      { $unset: { performanceMetrics: "" } },
      { session }
    );
    
    console.log('Mu00e9tricas de rendimiento eliminadas de todos los candidatos');
  }
};
