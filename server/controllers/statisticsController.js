const Election = require('../models/Election');
const ElectionStatistics = require('../models/ElectionStatistics');
const Voter = require('../models/Voter');
const Candidate = require('../models/Candidate');
const Vote = require('../models/Vote');
const ActivityLog = require('../models/ActivityLog');
const { AppError } = require('../middlewares/errorHandler');
const mongoose = require('mongoose');

/**
 * @desc    Generar o actualizar estadísticas para una elección específica
 * @route   POST /api/admin/statistics/elections/:id/generate
 * @access  Privado (Admin)
 */
const generateElectionStatistics = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Verificar si la elección existe
    const election = await Election.findById(id)
      .populate('categories.categoryId')
      .populate('settings');
    
    if (!election) {
      return next(new AppError('Elección no encontrada', 404));
    }
    
    // Buscar si ya existen estadísticas para esta elección
    let statistics = await ElectionStatistics.findOne({ election: id });
    
    // Si no existen, crear nuevo objeto de estadísticas
    if (!statistics) {
      statistics = new ElectionStatistics({
        election: id,
        generatedBy: req.user._id
      });
    }
    
    // Contar votantes elegibles
    const totalEligibleVoters = election.allowedVoters.length > 0 
      ? election.allowedVoters.length 
      : await Voter.countDocuments({ isVerified: true, status: 'active' });
    
    // Contar votos emitidos
    const totalVotesCast = await Vote.countDocuments({ 
      electionId: id, 
      status: 'confirmed' 
    });
    
    // Contar abstenciones (votos explícitamente registrados como abstenciones)
    const abstentions = await Vote.countDocuments({ 
      electionId: id, 
      status: 'confirmed',
      candidateId: null,
      'verificationData.isAbstention': true
    });
    
    // Obtener distribución de votos por hora
    const votesByHour = await Vote.aggregate([
      { $match: { electionId: mongoose.Types.ObjectId(id), status: 'confirmed' } },
      { 
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // Convertir a formato Map
    const hourlyDistribution = {};
    votesByHour.forEach(hourData => {
      hourlyDistribution[hourData._id] = hourData.count;
    });
    
    // Determinar hora pico
    let peakHour = 0;
    let peakCount = 0;
    
    votesByHour.forEach(hourData => {
      if (hourData.count > peakCount) {
        peakCount = hourData.count;
        peakHour = hourData._id;
      }
    });
    
    // Obtener distribución de votos por día
    const votesByDay = await Vote.aggregate([
      { $match: { electionId: mongoose.Types.ObjectId(id), status: 'confirmed' } },
      { 
        $group: {
          _id: { 
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Formatear para línea de tiempo
    const votingTimeline = votesByDay.map(dayData => ({
      date: new Date(dayData._id.year, dayData._id.month - 1, dayData._id.day),
      count: dayData.count
    }));
    
    // Obtener estadísticas de dispositivos (si están disponibles)
    const deviceStats = {
      mobile: await Vote.countDocuments({ 
        electionId: id, 
        status: 'confirmed',
        'verificationData.deviceType': 'mobile'
      }),
      desktop: await Vote.countDocuments({ 
        electionId: id, 
        status: 'confirmed',
        'verificationData.deviceType': 'desktop'
      }),
      tablet: await Vote.countDocuments({ 
        electionId: id, 
        status: 'confirmed',
        'verificationData.deviceType': 'tablet'
      }),
      other: await Vote.countDocuments({ 
        electionId: id, 
        status: 'confirmed',
        'verificationData.deviceType': { $nin: ['mobile', 'desktop', 'tablet'] }
      })
    };
    
    // Obtener estadísticas de distribución geográfica (si están disponibles)
    const geoVotes = await Vote.aggregate([
      { $match: { electionId: mongoose.Types.ObjectId(id), status: 'confirmed' } },
      { 
        $lookup: {
          from: 'voters',
          localField: 'voterId',
          foreignField: '_id',
          as: 'voter'
        }
      },
      { $unwind: '$voter' },
      { 
        $group: {
          _id: '$voter.district',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Convertir a formato Map
    const geographicDistribution = {};
    geoVotes.forEach(geoData => {
      if (geoData._id) {
        geographicDistribution[geoData._id] = geoData.count;
      }
    });
    
    // Obtener estadísticas por categoría y candidato
    const categoryStats = [];
    
    // Para cada categoría en la elección
    for (const category of election.categories || []) {
      // Obtener candidatos de esta categoría
      const candidates = await Candidate.find({ 
        election: id,
        category: category.categoryId,
        isActive: true
      });
      
      // Contar votos por candidato
      const candidateVotes = [];
      let totalCategoryVotes = 0;
      
      for (const candidate of candidates) {
        const votes = await Vote.countDocuments({ 
          electionId: id, 
          candidateId: candidate._id,
          status: 'confirmed'
        });
        
        totalCategoryVotes += votes;
        
        candidateVotes.push({
          candidateId: candidate._id,
          candidateName: `${candidate.firstName} ${candidate.lastName}`,
          votes: votes,
          percentage: 0 // Se calculará después
        });
      }
      
      // Calcular porcentajes
      candidateVotes.forEach(candidate => {
        candidate.percentage = totalCategoryVotes > 0 
          ? (candidate.votes / totalCategoryVotes) * 100 
          : 0;
      });
      
      // Ordenar por número de votos (descendente)
      candidateVotes.sort((a, b) => b.votes - a.votes);
      
      categoryStats.push({
        categoryId: category.categoryId,
        name: category.name,
        votesDistribution: candidateVotes
      });
    }
    
    // Obtener información de verificación blockchain
    const blockchainVerification = {
      verifiedCount: await Vote.countDocuments({ 
        electionId: id, 
        status: 'confirmed',
        blockNumber: { $ne: null }
      }),
      unverifiedCount: await Vote.countDocuments({ 
        electionId: id, 
        status: 'confirmed',
        blockNumber: null
      }),
      verificationRate: 0,
      lastVerifiedBlock: null,
      lastVerificationTime: null
    };
    
    // Calcular tasa de verificación
    const totalVerifiableVotes = blockchainVerification.verifiedCount + blockchainVerification.unverifiedCount;
    if (totalVerifiableVotes > 0) {
      blockchainVerification.verificationRate = 
        (blockchainVerification.verifiedCount / totalVerifiableVotes) * 100;
    }
    
    // Obtener último bloque verificado
    const lastVerifiedVote = await Vote.findOne({ 
      electionId: id, 
      status: 'confirmed',
      blockNumber: { $ne: null }
    }).sort({ blockNumber: -1 });
    
    if (lastVerifiedVote) {
      blockchainVerification.lastVerifiedBlock = lastVerifiedVote.blockNumber;
      blockchainVerification.lastVerificationTime = lastVerifiedVote.updatedAt;
    }
    
    // Actualizar el objeto de estadísticas
    await statistics.updateStats({
      totalEligibleVoters,
      totalVotesCast,
      participationRate: totalEligibleVoters > 0 ? (totalVotesCast / totalEligibleVoters) * 100 : 0,
      abstentions,
      votingTimeline,
      hourlyDistribution,
      peakVotingTime: {
        hour: peakHour,
        count: peakCount
      },
      deviceStats,
      geographicDistribution,
      categoryStats,
      blockchainVerification,
      lastUpdated: new Date(),
      generatedBy: req.user._id
    });
    
    // Registrar actividad
    await ActivityLog.logActivity({
      user: {
        id: req.user._id,
        model: 'Admin',
        username: req.user.username,
        name: req.user.name || req.user.username
      },
      action: 'statistics_generate',
      resource: {
        type: 'Election',
        id: election._id,
        name: election.title
      },
      details: {
        participationRate: statistics.participationRate.toFixed(2) + '%',
        totalVotes: statistics.totalVotesCast
      }
    });
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(new AppError(`Error al generar estadísticas: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener estadísticas de una elección
 * @route   GET /api/admin/statistics/elections/:id
 * @access  Privado (Admin)
 */
const getElectionStatistics = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Buscar estadísticas existentes
    const statistics = await ElectionStatistics.findOne({ election: id })
      .populate('election', 'title startDate endDate status')
      .populate('generatedBy', 'username name');
    
    if (!statistics) {
      return next(new AppError('Estadísticas no encontradas para esta elección', 404));
    }
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    next(new AppError(`Error al obtener estadísticas: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener resumen de estadísticas para dashboard
 * @route   GET /api/admin/statistics/dashboard
 * @access  Privado (Admin)
 */
const getDashboardStatistics = async (req, res, next) => {
  try {
    // 1. Estadísticas generales
    const totalElections = await Election.countDocuments();
    const activeElections = await Election.countDocuments({ 
      status: 'active',
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    });
    const totalVoters = await Voter.countDocuments();
    const verifiedVoters = await Voter.countDocuments({ isVerified: true });
    const totalVotes = await Vote.countDocuments({ status: 'confirmed' });
    
    // 2. Tendencias de participación (últimas 5 elecciones finalizadas)
    const recentElections = await Election.find({ 
      status: 'closed',
      resultsPublished: true
    })
    .sort({ endDate: -1 })
    .limit(5)
    .select('title totalVotes totalRegisteredVoters');
    
    const participationTrend = recentElections.map(election => ({
      title: election.title,
      participationRate: election.totalRegisteredVoters > 0 
        ? (election.totalVotes / election.totalRegisteredVoters) * 100 
        : 0
    }));
    
    // 3. Actividad administrativa reciente
    const recentActivity = await ActivityLog.find()
      .sort({ timestamp: -1 })
      .limit(10);
    
    // 4. Próximas elecciones programadas
    const upcomingElections = await Election.find({
      startDate: { $gt: new Date() },
      status: { $in: ['draft', 'active'] }
    })
    .sort({ startDate: 1 })
    .limit(5)
    .select('title startDate endDate status');
    
    // 5. Distribución de estados de elecciones
    const electionStatusDistribution = await Election.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // 6. Estadísticas de verificación blockchain
    const verifiedVotes = await Vote.countDocuments({ 
      status: 'confirmed',
      blockNumber: { $ne: null }
    });
    
    const verificationRate = totalVotes > 0 
      ? (verifiedVotes / totalVotes) * 100 
      : 0;
    
    // 7. Actividad por día (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyActivity = await Vote.aggregate([
      { $match: { timestamp: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Formatear actividad diaria
    const formattedDailyActivity = dailyActivity.map(item => ({
      date: new Date(item._id.year, item._id.month - 1, item._id.day).toISOString().split('T')[0],
      count: item.count
    }));
    
    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalElections,
          activeElections,
          totalVoters,
          verifiedVoters,
          totalVotes
        },
        participationTrend,
        recentActivity,
        upcomingElections,
        electionStatusDistribution,
        blockchain: {
          verifiedVotes,
          verificationRate
        },
        dailyActivity: formattedDailyActivity
      }
    });
  } catch (error) {
    next(new AppError(`Error al obtener estadísticas del dashboard: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener estadísticas de votantes
 * @route   GET /api/admin/statistics/voters
 * @access  Privado (Admin)
 */
const getVoterStatistics = async (req, res, next) => {
  try {
    // 1. Distribución por estado
    const statusDistribution = await Voter.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // 2. Distribución por distrito
    const districtDistribution = await Voter.aggregate([
      { $match: { district: { $ne: null, $ne: '' } } },
      { $group: { _id: '$district', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // 3. Distribución por verificación
    const verificationDistribution = await Voter.aggregate([
      { $group: { _id: '$isVerified', count: { $sum: 1 } } }
    ]);
    
    // 4. Tendencia de registros (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const registrationTrend = await Voter.aggregate([
      { $match: { registrationDate: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$registrationDate' },
            month: { $month: '$registrationDate' },
            day: { $dayOfMonth: '$registrationDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    
    // Formatear tendencia
    const formattedTrend = registrationTrend.map(item => ({
      date: new Date(item._id.year, item._id.month - 1, item._id.day).toISOString().split('T')[0],
      count: item.count
    }));
    
    // 5. Votantes más activos (con más elecciones votadas)
    const activeVoters = await Voter.aggregate([
      { $match: { 'votingHistory.0': { $exists: true } } },
      { 
        $project: {
          firstName: 1,
          lastName: 1,
          district: 1,
          votingCount: { $size: '$votingHistory' }
        }
      },
      { $sort: { votingCount: -1 } },
      { $limit: 10 }
    ]);
    
    // 6. Distribución por método de verificación
    const verificationMethodDistribution = await Voter.aggregate([
      { $match: { 'identityVerification.method': { $ne: null } } },
      { $group: { _id: '$identityVerification.method', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        statusDistribution,
        districtDistribution,
        verificationDistribution: {
          verified: verificationDistribution.find(item => item._id === true)?.count || 0,
          notVerified: verificationDistribution.find(item => item._id === false)?.count || 0
        },
        registrationTrend: formattedTrend,
        activeVoters,
        verificationMethodDistribution
      }
    });
  } catch (error) {
    next(new AppError(`Error al obtener estadísticas de votantes: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener estadísticas del sistema
 * @route   GET /api/admin/statistics/system
 * @access  Privado (Admin)
 */
const getSystemStatistics = async (req, res, next) => {
  try {
    // 1. Actividad administrativa
    const adminActivity = await ActivityLog.aggregate([
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // 2. Actividad por administrador
    const adminUserActivity = await ActivityLog.aggregate([
      { $match: { 'user.model': 'Admin' } },
      { $group: { _id: '$user.username', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // 3. Estadísticas de blockchain
    const blockchainTransactions = await Vote.countDocuments({ 
      blockchainTxId: { $ne: null } 
    });
    
    const blockNumbers = await Vote.distinct('blockNumber', { blockNumber: { $ne: null } });
    const uniqueBlocks = blockNumbers.length;
    
    // 4. Eficiencia del sistema
    const averageVotesPerBlock = uniqueBlocks > 0 ? blockchainTransactions / uniqueBlocks : 0;
    
    // 5. Tendencias de actividad por hora del día
    const hourlySystemActivity = await ActivityLog.aggregate([
      { 
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // Formatear actividad por hora
    const formattedHourlyActivity = new Array(24).fill(0);
    hourlySystemActivity.forEach(item => {
      formattedHourlyActivity[item._id] = item.count;
    });
    
    res.status(200).json({
      success: true,
      data: {
        adminActivity,
        adminUserActivity,
        blockchain: {
          transactions: blockchainTransactions,
          uniqueBlocks,
          averageVotesPerBlock
        },
        hourlyActivity: formattedHourlyActivity
      }
    });
  } catch (error) {
    next(new AppError(`Error al obtener estadísticas del sistema: ${error.message}`, 500));
  }
};

module.exports = {
  generateElectionStatistics,
  getElectionStatistics,
  getDashboardStatistics,
  getVoterStatistics,
  getSystemStatistics
};
