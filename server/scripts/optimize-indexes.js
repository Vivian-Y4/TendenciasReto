/**
 * Script para optimizar y actualizar u00edndices de MongoDB
 * 
 * Este script analiza el uso de u00edndices y sugiere optimizaciones
 * basadas en pasu00f3 patrones de consulta detectados
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Configuraciu00f3n
const config = {
  mongoUri: 'mongodb+srv://nateravivi:7l8FK20TtFeWhzeP@cluster0.vrk8zps.mongodb.net/voting-platform',
  // Umbral de utilizaciu00f3n de u00edndices para considerar eliminar un u00edndice
  unusedIndexThreshold: 0, // u00edndices con 0 usos
  // Umbral para considerar crear u00edndices
  queryThreshold: 100, // consultas que se ejecutan mu00e1s de 100 veces
  // Colleciones a analizar
  collectionsToAnalyze: [
    'users',
    'electionmetas',
    'candidatemetas',
    'votingstatistics'
  ]
};

/**
 * Conecta a la base de datos
 */
async function connectDatabase() {
  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Conexiu00f3n a MongoDB establecida');
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    throw error;
  }
}

/**
 * Desconecta de la base de datos
 */
async function disconnectDatabase() {
  await mongoose.disconnect();
  console.log('Conexiu00f3n a MongoDB cerrada');
}

/**
 * Obtiene estadu00edsticas de u00edndices para una colecciu00f3n
 */
async function getIndexStats(collection) {
  const db = mongoose.connection.db;
  
  try {
    // Obtener estadu00edsticas de u00edndices
    const indexStats = await db.command({ 
      aggregate: collection, 
      pipeline: [
        { $indexStats: {} }
      ],
      cursor: { batchSize: 1000 }
    });
    
    return indexStats.cursor.firstBatch;
  } catch (error) {
    console.error(`Error al obtener estadu00edsticas de u00edndices para ${collection}:`, error);
    return [];
  }
}

/**
 * Obtiene estadu00edsticas de consultas lentas
 */
async function getSlowQueries(collection) {
  const db = mongoose.connection.db;
  
  try {
    // Esto requiere que se habilite el profiler de MongoDB
    // db.setProfilingLevel(1, 100); // Nivel 1 registra consultas lentas > 100ms
    
    const slowQueries = await db.collection('system.profile')
      .find({ 
        ns: `${db.databaseName}.${collection}`,
        millis: { $gt: 100 } 
      })
      .sort({ millis: -1 })
      .limit(20)
      .toArray();
    
    return slowQueries;
  } catch (error) {
    console.error(`Error al obtener consultas lentas para ${collection}:`, error);
    return [];
  }
}

/**
 * Analiza y sugiere optimizaciones para u00edndices
 */
async function analyzeIndexes(collection) {
  console.log(`\nAnalizando u00edndices para la colecciu00f3n: ${collection}`);
  
  // Obtener estadu00edsticas de u00edndices
  const indexStats = await getIndexStats(collection);
  if (indexStats.length === 0) {
    console.log(`  No se encontraron estadu00edsticas de u00edndices para ${collection}`);
    return;
  }
  
  console.log(`  u00cdndices encontrados: ${indexStats.length}`);
  
  // Analizar u00edndices sin uso o con poco uso
  const unusedIndexes = indexStats.filter(stat => 
    stat.accesses.ops <= config.unusedIndexThreshold && 
    stat.name !== '_id_' // Ignorar el u00edndice primario _id
  );
  
  if (unusedIndexes.length > 0) {
    console.log(`  u00cdndices sin uso o con poco uso (${unusedIndexes.length}):`);
    unusedIndexes.forEach(idx => {
      console.log(`    - ${idx.name}: ${idx.accesses.ops} accesos`);
      console.log(`      Sugerencia: Considerar eliminar este u00edndice si no es necesario para restricciones u00fanicas o integridad de datos.`);
    });
  } else {
    console.log(`  No se encontraron u00edndices sin uso.`);
  }
  
  // Obtener consultas lentas
  const slowQueries = await getSlowQueries(collection);
  if (slowQueries.length > 0) {
    console.log(`  Consultas lentas detectadas (${slowQueries.length}):`);
    
    // Agrupar por patru00f3n de consulta
    const queryPatterns = {};
    slowQueries.forEach(query => {
      const queryShape = JSON.stringify(query.query || query.command || {});
      if (!queryPatterns[queryShape]) {
        queryPatterns[queryShape] = { count: 0, avgTime: 0, examples: [] };
      }
      
      queryPatterns[queryShape].count++;
      queryPatterns[queryShape].avgTime += query.millis;
      if (queryPatterns[queryShape].examples.length < 2) {
        queryPatterns[queryShape].examples.push(query);
      }
    });
    
    // Calcular promedios y mostrar patrones
    Object.entries(queryPatterns).forEach(([pattern, stats]) => {
      stats.avgTime = Math.round(stats.avgTime / stats.count);
      
      if (stats.count >= config.queryThreshold) {
        console.log(`    - Patru00f3n de consulta: ${pattern}`);
        console.log(`      Ejecuciones: ${stats.count}, Tiempo promedio: ${stats.avgTime}ms`);
        console.log(`      Sugerencia: Considerar crear un u00edndice para este patru00f3n de consulta.`);
      }
    });
  } else {
    console.log(`  No se detectaron consultas lentas.`);
  }
}

/**
 * Presenta recomendaciones generales
 */
function showGeneralRecommendations() {
  console.log('\nRECOMENDACIONES GENERALES PARA OPTIMIZACIU00d3N DE U00cdNDICES:');
  console.log('1. Evite u00edndices duplicados o que cubren los mismos campos.');
  console.log('2. Utilice u00edndices compuestos para consultas que filtran por mu00faltiples campos.');
  console.log('3. Considere la cardinalidad de los campos al crear u00edndices (priorizar campos con alta cardinalidad).');
  console.log('4. Limite el tamau00f1o de u00edndices para mejorar rendimiento de escritura.');
  console.log('5. Para consultas de texto, utilice u00edndices de texto en lugar de expresiones regulares.');
  console.log('6. Configure TTL (Time-To-Live) u00edndices para datos que expiran autumu00e1ticamente.');
}

/**
 * Funciun de punto de entrada principal
 */
async function main() {
  console.log('=== OPTIMIZADOR DE u00cdNDICES DE MONGODB ===');
  console.log(`Fecha y hora: ${new Date().toISOString()}`);
  
  try {
    await connectDatabase();
    
    // Analizar cada colecciun
    for (const collection of config.collectionsToAnalyze) {
      await analyzeIndexes(collection);
    }
    
    // Mostrar recomendaciones generales
    showGeneralRecommendations();
    
  } catch (error) {
    console.error('Error en el proceso de optimizaciu00f3n:', error);
  } finally {
    await disconnectDatabase();
  }
}

// Ejecutar el script
main();
