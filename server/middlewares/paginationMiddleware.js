/**
 * Middleware para manejar paginaciu00f3n y filtros en las consultas de API
 * Proporciona una forma estandarizada de implementar estos patrones en toda la aplicaciu00f3n
 */

/**
 * Middleware para manejar paru00e1metros de paginaciu00f3n y filtrado
 * @param {Object} options - Opciones de configuraciu00f3n
 */
const paginationMiddleware = (options = {}) => {
  const {
    defaultLimit = 10,
    maxLimit = 100,
    defaultPage = 1,
    defaultSort = { createdAt: -1 }
  } = options;
  
  return (req, res, next) => {
    // Configuraciu00f3n de paginaciu00f3n
    const page = Math.max(1, parseInt(req.query.page) || defaultPage);
    let limit = parseInt(req.query.limit) || defaultLimit;
    
    // Asegurar que el lu00edmite no exceda el mu00e1ximo
    limit = Math.min(limit, maxLimit);
    
    // Calcular skipeo para paginaciu00f3n
    const skip = (page - 1) * limit;
    
    // Manejo de orden
    let sort = defaultSort;
    if (req.query.sort) {
      try {
        // Formato esperado: "field:direction" (ej. "createdAt:desc")
        const sortParts = req.query.sort.split(':');
        const field = sortParts[0];
        const direction = sortParts[1] === 'asc' ? 1 : -1;
        sort = { [field]: direction };
      } catch (error) {
        // Si hay un error, mantener el orden predeterminado
        console.error('Error parseando paru00e1metro de ordenamiento:', error);
      }
    }
    
    // Au00f1adir los paru00e1metros de paginaciu00f3n al objeto de solicitud
    req.pagination = {
      page,
      limit,
      skip,
      sort
    };
    
    // Configuraciu00f3n de filtros
    // Manejar filtros bu00e1sicos (exact match)
    req.filters = {};
    
    // Procesar filtros avanzados si se proporcionan
    if (req.query.filters) {
      try {
        // Intentar parsear JSON
        const filterObj = JSON.parse(req.query.filters);
        
        // Filtrar campos null o undefined
        Object.keys(filterObj).forEach(key => {
          if (filterObj[key] !== null && filterObj[key] !== undefined) {
            req.filters[key] = filterObj[key];
          }
        });
      } catch (error) {
        console.error('Error parseando filtros JSON:', error);
      }
    } else {
      // Filtros simples por paru00e1metros individuales
      Object.keys(req.query).forEach(key => {
        // Ignorar paru00e1metros de paginaciu00f3n y ordenamiento
        if (!['page', 'limit', 'sort', 'filters'].includes(key) && 
            req.query[key] !== null && 
            req.query[key] !== undefined) {
          req.filters[key] = req.query[key];
        }
      });
    }
    
    // Funciu00f3n auxiliar para formatear respuesta paginada
    res.paginate = (data, totalItems) => {
      const totalPages = Math.ceil(totalItems / limit);
      
      return res.json({
        success: true,
        data,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });
    };
    
    next();
  };
};

module.exports = { paginationMiddleware };
