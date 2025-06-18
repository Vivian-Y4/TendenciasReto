/**
 * Controlador de votantes mejorado
 * Implementa funcionalidades avanzadas como verificaciu00f3n en lote y gestiun de identidad
 */

const blockchainService = require('../utils/blockchainService');
const User = require('../models/User');
const VotingStatistics = require('../models/VotingStatistics');
const { AppError } = require('../middlewares/errorHandler');
const crypto = require('crypto');
const ethers = require('ethers');

/**
 * @desc    Registrar un votante para una elecciu00f3n
 * @route   POST /api/elections/:id/voters
 * @access  Privado (Admin)
 */
const registerVoter = async (req, res, next) => {
  try {
    const electionId = parseInt(req.params.id);
    const { voterAddress, voterIdentity, metadata } = req.body;
    
    // Validar datos
    if (!voterAddress || !ethers.utils.isAddress(voterAddress)) {
      return next(new AppError('Direcciu00f3n de votante invu00e1lida', 400));
    }
    
    // Generar hash de identidad para privacidad
    let voterHash;
    if (voterIdentity) {
      voterHash = crypto.createHash('sha256').update(voterIdentity).digest('hex');
    } else {
      // Si no se proporciona identidad, usar direcciu00f3n como base
      voterHash = crypto.createHash('sha256').update(voterAddress.toLowerCase()).digest('hex');
    }
    
    // Registrar en blockchain
    const contract = await blockchainService.getAdminContract();
    const tx = await contract.registerVoter(electionId, voterAddress, '0x' + voterHash);
    await tx.wait();
    
    // Actualizar o crear usuario en la base de datos
    const user = await User.findOneAndUpdate(
      { address: voterAddress.toLowerCase() },
      { 
        $set: { isVerified: true },
        $push: { 
          roles: { $each: ['voter'] },
          participatedElections: { electionId, votedAt: null }
        }
      },
      { new: true, upsert: true }
    );
    
    // Actualizar estadu00edsticas
    await VotingStatistics.findOneAndUpdate(
      { electionId },
      { $inc: { totalEligibleVoters: 1 } },
      { new: true, upsert: true }
    );
    
    // Devolver resultado
    res.json({
      success: true,
      message: 'Votante registrado exitosamente',
      voter: {
        address: voterAddress,
        registeredFor: electionId
      }
    });
  } catch (error) {
    next(new AppError(`Error al registrar votante: ${error.message}`, 500));
  }
};

/**
 * @desc    Registrar mu00faltiples votantes en lote
 * @route   POST /api/elections/:id/voters/batch
 * @access  Privado (Admin)
 */
const registerVotersBatch = async (req, res, next) => {
  try {
    const electionId = parseInt(req.params.id);
    const { voters } = req.body;
    
    if (!Array.isArray(voters) || voters.length === 0) {
      return next(new AppError('Se requiere un array de votantes', 400));
    }
    
    // Verificar que no supere el lu00edmite mu00e1ximo para procesamiento por lotes
    if (voters.length > 100) {
      return next(new AppError('Excede el lu00edmite de 100 votantes por operaciu00f3n', 400));
    }
    
    const contract = await blockchainService.getAdminContract();
    const results = { success: [], errors: [] };
    
    // Procesar cada votante
    for (const voter of voters) {
      try {
        if (!voter.address || !ethers.utils.isAddress(voter.address)) {
          results.errors.push({
            address: voter.address,
            error: 'Direcciu00f3n de wallet invu00e1lida'
          });
          continue;
        }
        
        // Generar hash
        let voterHash;
        if (voter.identity) {
          voterHash = crypto.createHash('sha256').update(voter.identity).digest('hex');
        } else {
          voterHash = crypto.createHash('sha256').update(voter.address.toLowerCase()).digest('hex');
        }
        
        // Registrar en blockchain
        const tx = await contract.registerVoter(electionId, voter.address, '0x' + voterHash);
        await tx.wait();
        
        // Actualizar o crear usuario en BD
        await User.findOneAndUpdate(
          { address: voter.address.toLowerCase() },
          { 
            $set: { isVerified: true },
            $push: { 
              roles: { $each: ['voter'] },
              participatedElections: { electionId, votedAt: null }
            }
          },
          { new: true, upsert: true }
        );
        
        results.success.push({
          address: voter.address,
          registeredFor: electionId
        });
      } catch (error) {
        results.errors.push({
          address: voter.address,
          error: error.message
        });
      }
    }
    
    // Actualizar estadu00edsticas
    await VotingStatistics.findOneAndUpdate(
      { electionId },
      { $inc: { totalEligibleVoters: results.success.length } },
      { new: true, upsert: true }
    );
    
    res.json({
      success: true,
      message: `${results.success.length} votantes registrados, ${results.errors.length} errores`,
      results
    });
  } catch (error) {
    next(new AppError(`Error en registro por lotes: ${error.message}`, 500));
  }
};

/**
 * @desc    Verificar si un votante estu00e1 registrado para una elecciu00f3n
 * @route   GET /api/elections/:id/voters/verify/:address
 * @access  Pu00fablico
 */
const verifyVoter = async (req, res, next) => {
  try {
    const electionId = parseInt(req.params.id);
    const address = req.params.address;
    
    if (!address || !ethers.utils.isAddress(address)) {
      return next(new AppError('Direcciu00f3n de wallet invu00e1lida', 400));
    }
    
    const contract = await blockchainService.getContract();
    const isRegistered = await contract.isVoterRegistered(electionId, address);
    
    // Si estu00e1 registrado, verificar si ya ha votado
    let hasVoted = false;
    if (isRegistered) {
      hasVoted = await contract.hasVoted(electionId, address);
    }
    
    res.json({
      success: true,
      isRegistered,
      hasVoted,
      electionId,
      address
    });
  } catch (error) {
    next(new AppError(`Error al verificar votante: ${error.message}`, 500));
  }
};

/**
 * @desc    Emitir un voto en una elecciu00f3n
 * @route   POST /api/elections/:id/vote
 * @access  Privado (Voter)
 */
const castVote = async (req, res, next) => {
  try {
    const electionId = parseInt(req.params.id);
    const { candidateId, deviceInfo } = req.body;
    
    if (candidateId === undefined) {
      return next(new AppError('Se requiere el ID del candidato', 400));
    }
    
    // Verificar si la elecciu00f3n estu00e1 activa
    const election = await blockchainService.getElectionSummary(electionId);
    if (!election.isActive) {
      return next(new AppError('La elecciu00f3n no estu00e1 activa', 400));
    }
    
    // Verificar si el votante estu00e1 registrado
    const contract = await blockchainService.getContract();
    const isRegistered = await contract.isVoterRegistered(electionId, req.user.address);
    
    if (!isRegistered) {
      return next(new AppError('No estu00e1s registrado para esta elecciu00f3n', 403));
    }
    
    // Verificar si ya ha votado
    const hasVoted = await contract.hasVoted(electionId, req.user.address);
    if (hasVoted) {
      return next(new AppError('Ya has emitido tu voto en esta elecciu00f3n', 400));
    }
    
    // Emitir voto usando la wallet del votante
    const privateKey = req.body.privateKey;
    if (!privateKey) {
      return next(new AppError('Se requiere clave privada para firmar la transacciu00f3n', 400));
    }
    
    // Firmar transacciu00f3n con wallet del votante
    const voterContract = blockchainService.getSignedContract(privateKey);
    
    const tx = await voterContract.castVote(electionId, candidateId);
    const receipt = await tx.wait();
    
    // Actualizar registro de usuario
    await User.findOneAndUpdate(
      { 
        address: req.user.address,
        'participatedElections.electionId': electionId 
      },
      { 
        $set: { 'participatedElections.$.votedAt': new Date() }
      }
    );
    
    // Actualizar estadu00edsticas
    const statsUpdate = {
      $inc: { totalVotesCast: 1 },
      $push: { votingTimestamps: { timestamp: new Date() } },
      $set: { lastUpdated: new Date() }
    };
    
    // Au00f1adir datos de dispositivo si se proporcionan
    if (deviceInfo) {
      if (deviceInfo.type && ['mobile', 'desktop', 'tablet'].includes(deviceInfo.type)) {
        statsUpdate.$inc[`deviceStats.${deviceInfo.type}`] = 1;
      }
      
      if (deviceInfo.location) {
        statsUpdate.$inc[`geographicDistribution.${deviceInfo.location}`] = 1;
      }
      
      // Actualizar distribución horaria
      const hour = new Date().getHours();
      statsUpdate.$inc[`hourlyDistribution.${hour}`] = 1;
    }
    
    await VotingStatistics.findOneAndUpdate(
      { electionId },
      statsUpdate,
      { new: true, upsert: true }
    );
    
    // Recalcular tasa de participación
    const stats = await VotingStatistics.findOne({ electionId });
    if (stats && stats.totalEligibleVoters > 0) {
      stats.participationRate = (stats.totalVotesCast / stats.totalEligibleVoters) * 100;
      await stats.save();
    }
    
    res.json({
      success: true,
      message: 'Voto emitido exitosamente',
      transactionHash: receipt.transactionHash,
      electionId,
      candidateId
    });
  } catch (error) {
    next(new AppError(`Error al emitir voto: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener votantes registrados para una elecciu00f3n
 * @route   GET /api/elections/:id/voters
 * @access  Privado (Admin)
 */
const getVoters = async (req, res, next) => {
  try {
    const electionId = parseInt(req.params.id);
    const { page, limit, skip, sort } = req.pagination;
    
    // Obtener usuarios que tienen esta elecciu00f3n en su array de participatedElections
    const voters = await User.find({ 'participatedElections.electionId': electionId })
      .select('address name email participatedElections.$.votedAt isVerified')
      .sort(sort)
      .skip(skip)
      .limit(limit);
    
    // Contar total
    const total = await User.countDocuments({ 'participatedElections.electionId': electionId });
    
    // Obtener datos adicionales de la blockchain
    const votersWithBlockchainData = await Promise.all(
      voters.map(async (voter) => {
        try {
          const hasVoted = await blockchainService.contract.hasVoted(electionId, voter.address);
          
          // Obtener información de participación en esta elección específica
          const participation = voter.participatedElections.find(
            p => p.electionId === electionId
          );
          
          return {
            address: voter.address,
            name: voter.name,
            email: voter.email,
            isVerified: voter.isVerified,
            hasVoted,
            votedAt: participation ? participation.votedAt : null
          };
        } catch (error) {
          console.error(`Error obteniendo datos de votante ${voter.address}:`, error);
          return {
            address: voter.address,
            name: voter.name,
            email: voter.email,
            isVerified: voter.isVerified,
            error: 'Error obteniendo datos de blockchain'
          };
        }
      })
    );
    
    return res.paginate(votersWithBlockchainData, total);
  } catch (error) {
    next(new AppError(`Error al obtener votantes: ${error.message}`, 500));
  }
};

/**
 * @desc    Eliminar un votante de una elecciu00f3n
 * @route   DELETE /api/elections/:id/voters/:address
 * @access  Privado (Admin)
 */
const removeVoter = async (req, res, next) => {
  try {
    const electionId = parseInt(req.params.id);
    const address = req.params.address;
    
    if (!address || !ethers.utils.isAddress(address)) {
      return next(new AppError('Direcciu00f3n de wallet invu00e1lida', 400));
    }
    
    // Verificar si la elecciu00f3n ya ha comenzado
    const election = await blockchainService.getElectionSummary(electionId);
    if (election.isActive) {
      return next(new AppError('No se puede eliminar votantes de una elecciu00f3n activa', 400));
    }
    
    // Eliminar en blockchain
    const contract = await blockchainService.getAdminContract();
    const tx = await contract.removeVoter(electionId, address);
    await tx.wait();
    
    // Actualizar BD
    await User.findOneAndUpdate(
      { address: address.toLowerCase() },
      { $pull: { participatedElections: { electionId } } }
    );
    
    // Actualizar estadu00edsticas
    await VotingStatistics.findOneAndUpdate(
      { electionId },
      { $inc: { totalEligibleVoters: -1 } }
    );
    
    res.json({
      success: true,
      message: 'Votante eliminado exitosamente',
      electionId,
      address
    });
  } catch (error) {
    next(new AppError(`Error al eliminar votante: ${error.message}`, 500));
  }
};

/**
 * @desc    Importar votantes desde CSV/JSON
 * @route   POST /api/elections/:id/voters/import
 * @access  Privado (Admin)
 */
const importVoters = async (req, res, next) => {
  try {
    const electionId = parseInt(req.params.id);
    const { voters, format } = req.body;
    
    if (!voters || !Array.isArray(voters)) {
      return next(new AppError('Formato de datos inválido', 400));
    }
    
    // Verificar límite máximo para importación
    if (voters.length > 500) {
      return next(new AppError('Excede el límite de 500 votantes por importación', 400));
    }
    
    // Procesar votantes
    const parsedVoters = voters.map(voter => {
      // Estructurar según formato (CSV/JSON)
      let address;
      let identity;
      
      if (format === 'csv') {
        const fields = voter.split(',');
        address = fields[0].trim();
        identity = fields[1] ? fields[1].trim() : null;
      } else {
        address = voter.address;
        identity = voter.identity;
      }
      
      return { address, identity };
    }).filter(voter => {
      // Filtrar direcciones inválidas
      return voter.address && ethers.utils.isAddress(voter.address);
    });
    
    // Usar el método de registro por lotes
    req.body.voters = parsedVoters;
    return registerVotersBatch(req, res, next);
    
  } catch (error) {
    next(new AppError(`Error al importar votantes: ${error.message}`, 500));
  }
};

/**
 * @desc    Exportar lista de votantes
 * @route   GET /api/elections/:id/voters/export
 * @access  Privado (Admin)
 */
const exportVoters = async (req, res, next) => {
  try {
    const electionId = parseInt(req.params.id);
    const format = req.query.format || 'json';
    
    // Obtener todos los votantes sin paginación
    const voters = await User.find({ 'participatedElections.electionId': electionId })
      .select('address name email participatedElections');
    
    // Preparar datos para exportación
    const exportData = await Promise.all(
      voters.map(async (voter) => {
        const participation = voter.participatedElections.find(
          p => p.electionId === electionId
        );
        
        let hasVoted = false;
        try {
          hasVoted = await blockchainService.contract.hasVoted(electionId, voter.address);
        } catch (error) {
          console.error(`Error verificando voto para ${voter.address}:`, error);
        }
        
        return {
          address: voter.address,
          name: voter.name || '',
          email: voter.email || '',
          registered: true,
          hasVoted,
          votedAt: participation && participation.votedAt ? participation.votedAt : null
        };
      })
    );
    
    // Exportar en el formato solicitado
    if (format === 'csv') {
      const { Parser } = require('json2csv');
      const fields = ['address', 'name', 'email', 'registered', 'hasVoted', 'votedAt'];
      const parser = new Parser({ fields });
      const csv = parser.parse(exportData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=voters-election-${electionId}.csv`);
      return res.send(csv);
    }
    
    // Por defecto, devolver JSON
    res.json({
      success: true,
      electionId,
      voters: exportData,
      count: exportData.length
    });
  } catch (error) {
    next(new AppError(`Error al exportar votantes: ${error.message}`, 500));
  }
};

module.exports = {
  registerVoter,
  registerVotersBatch,
  verifyVoter,
  castVote,
  getVoters,
  removeVoter,
  importVoters,
  exportVoters
};
