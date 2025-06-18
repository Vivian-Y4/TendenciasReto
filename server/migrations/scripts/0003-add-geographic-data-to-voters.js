/**
 * Migraciu00f3n: Au00f1adir datos geogru00e1ficos a votantes
 * Versiu00f3n: 0003
 * Fecha de creaciu00f3n: 2025-05-21T21:37:00.000Z
 */

module.exports = {
  description: "Au00f1adir datos geogru00e1ficos anu00f3nimos para anu00e1lisis de votantes",
  
  /**
   * Aplicar la migraciu00f3n
   * @param {Object} mongoose - Instancia de mongoose
   * @param {Object} session - Sesiu00f3n de MongoDB para transacciones
   */
  async up(mongoose, session) {
    const db = mongoose.connection.db;
    
    // 1. Crear u00edndice geoespacial en la colecciu00f3n de usuarios
    await db.collection('users').createIndex(
      { 'geolocation.coordinates': '2dsphere' },
      { session }
    );
    
    // 2. Au00f1adir estructura base para datos geogru00e1ficos
    await db.collection('users').updateMany(
      { geolocation: { $exists: false } },
      { 
        $set: { 
          geolocation: {
            type: 'Point',
            coordinates: [0, 0], // [longitude, latitude] - valores por defecto
            accuracy: 0,
            anonymized: true,
            lastUpdated: new Date()
          },
          demographics: {
            region: '',
            urbanRural: '',
            timezone: '',
            anonymized: true
          }
        } 
      },
      { session }
    );
    
    // 3. Actualizar estadisticas para incluir nuevos campos
    await db.collection('votingstatistics').updateMany(
      {},
      { 
        $set: { 
          geographicAnalytics: {
            regions: {},
            urbanVsRural: {
              urban: 0,
              suburban: 0,
              rural: 0
            },
            participationByTimezone: {}
          }
        } 
      },
      { session }
    );
    
    console.log('Datos geogru00e1ficos anu00f3nimos au00f1adidos a todos los usuarios');
    console.log('u00cdndice geoespacial creado');
    console.log('Estadu00edsticas actualizadas con nuevos campos de anu00e1lisis geogru00e1fico');
  },
  
  /**
   * Revertir la migraciu00f3n
   * @param {Object} mongoose - Instancia de mongoose
   * @param {Object} session - Sesiu00f3n de MongoDB para transacciones
   */
  async down(mongoose, session) {
    const db = mongoose.connection.db;
    
    // 1. Eliminar los campos geogru00e1ficos de los usuarios
    await db.collection('users').updateMany(
      {},
      { 
        $unset: { 
          geolocation: "",
          demographics: ""
        } 
      },
      { session }
    );
    
    // 2. Eliminar el u00edndice geoespacial
    try {
      await db.collection('users').dropIndex('geolocation.coordinates_2dsphere');
    } catch (error) {
      console.warn('No se pudo eliminar el u00edndice geoespacial:', error.message);
    }
    
    // 3. Eliminar los campos de anu00e1lisis geogru00e1fico de las estadu00edsticas
    await db.collection('votingstatistics').updateMany(
      {},
      { $unset: { geographicAnalytics: "" } },
      { session }
    );
    
    console.log('Datos geogru00e1ficos y demografu00eda eliminados de todos los usuarios');
    console.log('Campos de anu00e1lisis geogru00e1fico eliminados de las estadu00edsticas');
  }
};
