/**
 * Middleware de caché para optimizar respuestas y mejorar rendimiento
 * Implementa un sistema de caché en memoria con TTL configurable
 */

const NodeCache = require('node-cache');

// Instancia de caché con TTL predeterminado de 5 minutos (300 segundos)
const cache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60, // Verificar expiración cada 60 segundos
  maxKeys: 1000 // Máximo número de claves para prevenir fugas de memoria
});

/**
 * Middleware para cachear respuestas de API
 * @param {number} ttl - Tiempo de vida en segundos (0 = sin expiración)
 * @param {Function} customKey - Función opcional para generar clave de caché personalizada
 */
const cacheMiddleware = (ttl = 300, customKey = null) => {
  return (req, res, next) => {
    // Si hay parámetros de no-caché, omitir caché
    if (req.query.noCache === 'true' || req.get('Cache-Control') === 'no-cache') {
      return next();
    }
    
    // Generar clave de caché
    const key = customKey ? 
      customKey(req) : 
      `${req.originalUrl || req.url}-${JSON.stringify(req.body)}`;
    
    // Verificar si la respuesta está en caché
    const cachedResponse = cache.get(key);
    
    if (cachedResponse) {
      // Añadir encabezado indicando que es respuesta cacheada
      res.set('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }
    
    // Capturar la respuesta para cachearla
    const originalJson = res.json;
    res.json = function(body) {
      // Solo cachear respuestas exitosas
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, ttl);
      }
      
      // Indicar que la respuesta no estaba en caché
      res.set('X-Cache', 'MISS');
      
      // Llamar al método original
      return originalJson.call(this, body);
    };
    
    next();
  };
};

/**
 * Invalida todas las claves de caché
 */
const invalidateAllCache = () => {
  cache.flushAll();
  console.log('Caché completamente invalidada');
};

/**
 * Invalida claves de caché por patrón
 * @param {string} pattern - Patrón para coincidir con claves de caché
 */
const invalidateCacheByPattern = (pattern) => {
  const keys = cache.keys();
  const regex = new RegExp(pattern);
  
  let invalidatedCount = 0;
  keys.forEach(key => {
    if (regex.test(key)) {
      cache.del(key);
      invalidatedCount++;
    }
  });
  
  console.log(`${invalidatedCount} claves de caché invalidadas con patrón: ${pattern}`);
  return invalidatedCount;
};

/**
 * Estadísticas de uso de caché
 */
const getCacheStats = () => {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    ksize: cache.getStats().ksize,
    vsize: cache.getStats().vsize
  };
};

module.exports = {
  cacheMiddleware,
  invalidateAllCache,
  invalidateCacheByPattern,
  getCacheStats
};
