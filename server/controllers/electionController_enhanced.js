/**
 * Controlador de elecciones mejorado
 * Implementa funcionalidades avanzadas como paginaciu00f3n, cachu00e9 y filtrado
 */

const blockchainService = require('../utils/blockchainService');
const ElectionMeta = require('../models/ElectionMeta');
const CandidateMeta = require('../models/CandidateMeta');
const VotingStatistics = require('../models/VotingStatistics');
const { AppError } = require('../middlewares/errorHandler');
const { cacheMiddleware, invalidateCacheByPattern } = require('../middlewares/cacheMiddleware');

/**
 * @desc    Obtener todas las elecciones con paginaciu00f3n y filtrado avanzado
 * @route   GET /api/elections
 * @access  Pu00fablico
 */
const getElections = async (req, res, next) => {
  try {
    // Obtener paru00e1metros de paginaciu00f3n (configurados por el middleware)
    const { page, limit, skip, sort } = req.pagination;
    const filters = req.filters;
    
    // Obtener elecciones desde blockchain
    const allElections = await blockchainService.getAllElections();
    
    // Obtener metadatos para todas estas elecciones
    const electionIds = allElections.map(e => parseInt(e.id));
    const metadataList = await ElectionMeta.find({ electionId: { $in: electionIds } });
    
    // Crear mapa de metadatos para acceso ru00e1pido
    const metadataMap = {};
    metadataList.forEach(meta => {
      metadataMap[meta.electionId] = meta;
    });
    
    // Combinar datos de blockchain con metadatos
    let combinedElections = allElections.map(election => {
      const metadata = metadataMap[election.id] || {};
      return {
        ...election,
        category: metadata.category || 'other',
        location: metadata.location || '',
        tags: metadata.tags || [],
        viewCount: metadata.viewCount || 0,
        coverImage: metadata.coverImage || ''
      };
    });
    
    // Aplicar filtros de MongoDB (para metadatos)
    if (filters) {
      combinedElections = combinedElections.filter(election => {
        let matches = true;
        
        // Filtrar por categoru00eda
        if (filters.category && election.category !== filters.category) {
          matches = false;
        }
        
        // Filtrar por ubicaciu00f3n
        if (filters.location && (!election.location || !election.location.includes(filters.location))) {
          matches = false;
        }
        
        // Filtrar por tags
        if (filters.tag && (!election.tags || !election.tags.includes(filters.tag))) {
          matches = false;
        }
        
        // Filtrar por estado
        if (filters.status) {
          if (filters.status === 'active' && !election.isActive) {
            matches = false;
          } else if (filters.status === 'ended' && election.isActive) {
            matches = false;
          } else if (filters.status === 'finalized' && !election.resultsFinalized) {
            matches = false;
          }
        }
        
        // Bu00fasqueda por texto en tu00edtulo o descripciu00f3n
        if (filters.search) {
          const searchTerm = filters.search.toLowerCase();
          if (!election.title.toLowerCase().includes(searchTerm) && 
              !election.description.toLowerCase().includes(searchTerm)) {
            matches = false;
          }
        }
        
        return matches;
      });
    }
    
    // Contar total de items despuu00e9s de filtrar
    const totalItems = combinedElections.length;
    
    // Aplicar ordenamiento
    if (sort) {
      const [field, direction] = Object.entries(sort)[0];
      const sortMultiplier = direction === 1 ? 1 : -1;
      
      combinedElections.sort((a, b) => {
        // Manejar propiedades anidadas o campos especiales
        let valueA, valueB;
        
        if (field === 'startTime' || field === 'endTime') {
          valueA = parseInt(a[field]);
          valueB = parseInt(b[field]);
        } else {
          valueA = a[field];
          valueB = b[field];
        }
        
        // Ordenar como nu00fameros si ambos son nu00fameros
        if (!isNaN(valueA) && !isNaN(valueB)) {
          return (valueA - valueB) * sortMultiplier;
        }
        
        // Ordenar como strings en caso contrario
        return String(valueA).localeCompare(String(valueB)) * sortMultiplier;
      });
    }
    
    // Aplicar paginaciu00f3n
    const paginatedElections = combinedElections.slice(skip, skip + limit);
    
    // Usar el helper de paginaciu00f3n del middleware para la respuesta
    return res.paginate(paginatedElections, totalItems);
  } catch (error) {
    next(new AppError(`Error al obtener elecciones: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener una elecciu00f3n por ID con datos completos
 * @route   GET /api/elections/:id
 * @access  Pu00fablico
 */
const getElection = async (req, res, next) => {
  try {
    const electionId = req.params.id;
    
    // Obtener datos de blockchain
    const election = await blockchainService.getElectionSummary(electionId);
    
    // Buscar metadata adicional en MongoDB
    const electionMeta = await ElectionMeta.findOne({ electionId });
    
    // Incrementar contador de vistas
    if (electionMeta) {
      electionMeta.viewCount += 1;
      await electionMeta.save();
    }
    
    // Obtener todos los candidatos
    const candidates = await blockchainService.getAllCandidates(electionId);
    
    // Obtener metadata para cada candidato
    const candidatesWithMeta = await Promise.all(candidates.map(async (candidate) => {
      const meta = await CandidateMeta.findOne({ 
        electionId, 
        candidateId: candidate.id 
      });
      
      return {
        ...candidate,
        metadata: meta ? {
          profileImage: meta.profileImage,
          biography: meta.biography,
          credentials: meta.credentials,
          socialLinks: meta.socialLinks,
          translations: meta.translations
        } : {}
      };
    }));
    
    // Preparar datos adicionales
    const metadata = electionMeta ? {
      category: electionMeta.category,
      location: electionMeta.location,
      tags: electionMeta.tags,
      viewCount: electionMeta.viewCount,
      coverImage: electionMeta.coverImage,
      extendedDescription: electionMeta.extendedDescription,
      translations: electionMeta.translations,
      createdAt: electionMeta.createdAt,
      updatedAt: electionMeta.updatedAt
    } : {};
    
    // Comprobar si el usuario ha votado (si estu00e1 autenticado)
    let userHasVoted = false;
    if (req.user) {
      try {
        userHasVoted = await blockchainService.contract.hasVoted(
          electionId, 
          req.user.address
        );
      } catch (error) {
        console.error('Error verificando si el usuario ha votado:', error);
      }
    }
    
    // Construir respuesta completa
    const completeElection = {
      ...election,
      metadata,
      candidates: candidatesWithMeta,
      userHasVoted
    };
    
    res.json({
      success: true,
      election: completeElection
    });
  } catch (error) {
    next(new AppError(`Error al obtener elecciu00f3n: ${error.message}`, 500));
  }
};

/**
 * @desc    Crear una nueva elecciu00f3n
 * @route   POST /api/elections
 * @access  Privado (Admin)
 */
const createElection = async (req, res, next) => {
  try {
    const { 
      title, 
      description, 
      startTime, 
      endTime, 
      candidates, 
      metadata 
    } = req.body;
    
    // Validar campos requeridos
    if (!title || !description || !startTime || !endTime) {
      return next(new AppError('Faltan campos requeridos', 400));
    }
    
    // Crear elecciu00f3n en la blockchain
    const result = await blockchainService.createElection({
      title,
      description,
      startTime,
      endTime
    });
    
    const { electionId, transactionHash } = result;
    
    // Guardar metadata adicional en MongoDB
    if (metadata) {
      const electionMeta = new ElectionMeta({
        electionId,
        ...metadata,
        createdBy: req.user.address
      });
      
      await electionMeta.save();
    }
    
    // Au00f1adir candidatos si se proporcionan
    if (candidates && candidates.length > 0) {
      const contract = await blockchainService.getAdminContract();
      
      for (const candidate of candidates) {
        // Au00f1adir candidato a la blockchain
        const tx = await contract.addCandidate(
          electionId,
          candidate.name,
          candidate.description
        );
        await tx.wait();
        
        // Obtener ID del candidato 
        const candidateCount = await contract.getCandidateCount(electionId);
        const candidateId = candidateCount.toNumber() - 1;
        
        // Guardar metadata del candidato si se proporciona
        if (candidate.metadata) {
          const candidateMeta = new CandidateMeta({
            electionId,
            candidateId,
            ...candidate.metadata
          });
          
          await candidateMeta.save();
        }
      }
    }
    
    // Crear registro de estadu00edsticas inicial
    const statistics = new VotingStatistics({
      electionId,
      participationRate: 0,
      totalEligibleVoters: 0,
      totalVotesCast: 0
    });
    
    await statistics.save();
    
    // Invalidar cachu00e9 de listado de elecciones
    invalidateCacheByPattern('elections');
    
    res.status(201).json({
      success: true,
      election: {
        id: electionId,
        transactionHash
      },
      message: 'Elecciu00f3n creada exitosamente'
    });
  } catch (error) {
    next(new AppError(`Error al crear elecciu00f3n: ${error.message}`, 500));
  }
};

/**
 * @desc    Actualizar una elecciu00f3n existente
 * @route   PUT /api/elections/:id
 * @access  Privado (Admin)
 */
const updateElection = async (req, res, next) => {
  try {
    const electionId = parseInt(req.params.id);
    const { title, description, candidates, metadata } = req.body;
    
    // Obtener datos actuales de la elecciu00f3n
    const election = await blockchainService.getElectionSummary(electionId);
    
    // Verificar que la elecciu00f3n existe
    if (!election) {
      return next(new AppError('Elecciu00f3n no encontrada', 404));
    }
    
    // Verificar que la elecciu00f3n no estu00e1 finalizada
    if (election.resultsFinalized) {
      return next(new AppError('No se puede modificar una elecciu00f3n finalizada', 400));
    }
    
    // Actualizar datos en blockchain si se proporcionan tu00edtulo o descripciu00f3n
    if (title || description) {
      await blockchainService.updateElection(electionId, {
        title: title || election.title,
        description: description || election.description
      });
    }
    
    // Actualizar metadatos en MongoDB si se proporcionan
    if (metadata) {
      await ElectionMeta.findOneAndUpdate(
        { electionId },
        { $set: metadata },
        { new: true, upsert: true }
      );
    }
    
    // Actualizar candidatos si se proporcionan
    if (candidates && candidates.length > 0) {
      for (const candidate of candidates) {
        if (candidate.id !== undefined && candidate.metadata) {
          await CandidateMeta.findOneAndUpdate(
            { electionId, candidateId: candidate.id },
            { $set: candidate.metadata },
            { new: true, upsert: true }
          );
        }
      }
    }
    
    // Invalidar cachu00e9 relacionado
    invalidateCacheByPattern(`election-${electionId}`);
    invalidateCacheByPattern('elections');
    
    res.json({
      success: true,
      message: 'Elecciu00f3n actualizada exitosamente'
    });
  } catch (error) {
    next(new AppError(`Error al actualizar elecciu00f3n: ${error.message}`, 500));
  }
};

/**
 * @desc    Finalizar una elecciu00f3n (cerrar votaciu00f3n y publicar resultados)
 * @route   PUT /api/elections/:id/finalize
 * @access  Privado (Admin)
 */
const finalizeElection = async (req, res, next) => {
  try {
    const electionId = parseInt(req.params.id);
    
    // Finalizar en blockchain
    const result = await blockchainService.finalizeElection(electionId);
    
    // Actualizar metadatos
    await ElectionMeta.findOneAndUpdate(
      { electionId },
      { $set: { status: 'finalized' } }
    );
    
    // Calcular y guardar estadu00edsticas finales
    const statistics = await blockchainService.getElectionStatistics(electionId);
    
    await VotingStatistics.findOneAndUpdate(
      { electionId },
      { 
        $set: {
          participationRate: statistics.participationRate,
          totalEligibleVoters: statistics.registeredVoters,
          totalVotesCast: statistics.totalVotes,
          lastUpdated: new Date()
        }
      },
      { new: true, upsert: true }
    );
    
    // Invalidar cachu00e9
    invalidateCacheByPattern(`election-${electionId}`);
    invalidateCacheByPattern('elections');
    
    res.json({
      success: true,
      message: 'Elecciu00f3n finalizada exitosamente',
      transactionHash: result.transactionHash
    });
  } catch (error) {
    next(new AppError(`Error al finalizar elecciu00f3n: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener estadu00edsticas detalladas de una elecciu00f3n
 * @route   GET /api/elections/:id/statistics
 * @access  Pu00fablico
 */
const getElectionStatistics = async (req, res, next) => {
  try {
    const electionId = parseInt(req.params.id);
    
    // Obtener estadu00edsticas de blockchain
    const blockchainStats = await blockchainService.getElectionStatistics(electionId);
    
    // Obtener estadu00edsticas adicionales de MongoDB
    const dbStats = await VotingStatistics.findOne({ electionId });
    
    // Combinar estadu00edsticas
    const combinedStats = {
      ...blockchainStats,
      hourlyDistribution: dbStats ? dbStats.hourlyDistribution : {},
      deviceStats: dbStats ? dbStats.deviceStats : { mobile: 0, desktop: 0, tablet: 0 },
      geographicDistribution: dbStats ? dbStats.geographicDistribution : {},
      lastUpdated: dbStats ? dbStats.lastUpdated : new Date()
    };
    
    res.json({
      success: true,
      statistics: combinedStats
    });
  } catch (error) {
    next(new AppError(`Error al obtener estadu00edsticas: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener elecciones populares o destacadas
 * @route   GET /api/elections/featured
 * @access  Pu00fablico
 */
const getFeaturedElections = async (req, res, next) => {
  try {
    // Obtener elecciones activas con mayor participaciu00f3n
    const featuredElections = await ElectionMeta.aggregate([
      // Unir con estadu00edsticas para obtener datos de participaciu00f3n
      { $lookup: {
        from: 'votingstatistics',
        localField: 'electionId',
        foreignField: 'electionId',
        as: 'statistics'
      }},
      // Desenrollar estadu00edsticas
      { $unwind: { path: '$statistics', preserveNullAndEmptyArrays: true } },
      // Filtrar solo elecciones activas
      { $match: { status: { $in: ['active', 'pending'] } } },
      // Calcular puntuaciu00f3n basada en vistas y participaciu00f3n
      { $addFields: {
        score: {
          $add: [
            { $ifNull: ['$viewCount', 0] },
            { $multiply: [{ $ifNull: ['$statistics.totalVotesCast', 0] }, 5] }
          ]
        }
      }},
      // Ordenar por puntuaciu00f3n descendente
      { $sort: { score: -1 } },
      // Limitar a 5 elecciones
      { $limit: 5 },
      // Proyectar solo campos necesarios
      { $project: {
        electionId: 1,
        category: 1,
        coverImage: 1,
        viewCount: 1,
        score: 1
      }}
    ]);
    
    // Obtener datos completos de blockchain para estas elecciones
    const featuredWithBlockchainData = await Promise.all(
      featuredElections.map(async (featured) => {
        try {
          const election = await blockchainService.getElectionSummary(featured.electionId);
          return {
            ...election,
            category: featured.category,
            coverImage: featured.coverImage,
            viewCount: featured.viewCount,
            score: featured.score
          };
        } catch (error) {
          console.error(`Error obteniendo datos de elecciu00f3n ${featured.electionId}:`, error);
          return null;
        }
      })
    );
    
    // Filtrar posibles null values
    const validFeatured = featuredWithBlockchainData.filter(e => e !== null);
    
    res.json({
      success: true,
      featured: validFeatured
    });
  } catch (error) {
    next(new AppError(`Error al obtener elecciones destacadas: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener estadu00edsticas generales de participaciu00f3n
 * @route   GET /api/elections/participation-stats
 * @access  Pu00fablico
 */
const getParticipationStats = async (req, res, next) => {
  try {
    // Obtener estadu00edsticas generales
    const stats = await VotingStatistics.aggregate([
      // Calcular estadu00edsticas globales
      { $group: {
        _id: null,
        totalElections: { $sum: 1 },
        totalVotes: { $sum: '$totalVotesCast' },
        totalVoters: { $sum: '$totalEligibleVoters' },
        avgParticipation: { $avg: '$participationRate' }
      }},
      // Proyectar resultados
      { $project: {
        _id: 0,
        totalElections: 1,
        totalVotes: 1,
        totalVoters: 1,
        avgParticipation: { $round: ['$avgParticipation', 2] }
      }}
    ]);
    
    // Obtener tendencia de participaciu00f3n por categoru00eda
    const categoryStats = await ElectionMeta.aggregate([
      // Unir con estadu00edsticas
      { $lookup: {
        from: 'votingstatistics',
        localField: 'electionId',
        foreignField: 'electionId',
        as: 'statistics'
      }},
      // Desenrollar estadu00edsticas
      { $unwind: { path: '$statistics', preserveNullAndEmptyArrays: true } },
      // Agrupar por categoru00eda
      { $group: {
        _id: '$category',
        electionCount: { $sum: 1 },
        totalVotes: { $sum: '$statistics.totalVotesCast' },
        avgParticipation: { $avg: '$statistics.participationRate' }
      }},
      // Ordenar por participaciu00f3n
      { $sort: { avgParticipation: -1 } },
      // Renombrar _id a category
      { $project: {
        _id: 0,
        category: '$_id',
        electionCount: 1,
        totalVotes: 1,
        avgParticipation: { $round: ['$avgParticipation', 2] }
      }}
    ]);
    
    res.json({
      success: true,
      globalStats: stats[0] || {
        totalElections: 0,
        totalVotes: 0,
        totalVoters: 0,
        avgParticipation: 0
      },
      categoryStats
    });
  } catch (error) {
    next(new AppError(`Error al obtener estadu00edsticas de participaciu00f3n: ${error.message}`, 500));
  }
};

/**
 * @desc    Buscar elecciones por texto
 * @route   GET /api/elections/search
 * @access  Pu00fablico
 */
const searchElections = async (req, res, next) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return next(new AppError('Se requiere un tu00e9rmino de bu00fasqueda', 400));
    }
    
    // Buscar en metadata utilizando u00edndice de texto
    const metadataResults = await ElectionMeta.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);
    
    // Obtener IDs de resultados
    const electionIds = metadataResults.map(result => result.electionId);
    
    // Obtener datos completos de estas elecciones
    const elections = await Promise.all(
      electionIds.map(async (id) => {
        try {
          const election = await blockchainService.getElectionSummary(id);
          const metadata = metadataResults.find(m => m.electionId === id);
          
          return {
            ...election,
            category: metadata.category,
            location: metadata.location,
            tags: metadata.tags,
            viewCount: metadata.viewCount,
            coverImage: metadata.coverImage,
            score: metadata._doc.score // Puntuaciu00f3n de relevancia de bu00fasqueda
          };
        } catch (error) {
          console.error(`Error obteniendo datos de elecciu00f3n ${id}:`, error);
          return null;
        }
      })
    );
    
    // Filtrar posibles nulls
    const validResults = elections.filter(e => e !== null);
    
    res.json({
      success: true,
      results: validResults,
      count: validResults.length,
      query
    });
  } catch (error) {
    next(new AppError(`Error en bu00fasqueda de elecciones: ${error.message}`, 500));
  }
};

module.exports = {
  getElections,
  getElection,
  createElection,
  updateElection,
  finalizeElection,
  getElectionStatistics,
  getFeaturedElections,
  getParticipationStats,
  searchElections
};
