const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Configura la conexión al proveedor Ethereum y obtiene el contrato
 */
const setupProvider = () => {
  // En producción, conectaríamos a una red real o nodo
  // Para pruebas locales, conectamos al nodo local de hardhat
  const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'http://localhost:8545');
  
  // Obtener ABI del contrato y dirección
  const contractABIPath = path.join(__dirname, '../../artifacts/contracts/VotingSystem.sol/VotingSystem.json');
  const contractABI = JSON.parse(fs.readFileSync(contractABIPath)).abi;
  
  // La dirección del contrato debe estar en .env o en config
  const contractAddress = process.env.CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    throw new AppError('Dirección del contrato no encontrada', 500);
  }
  
  return { provider, contractABI, contractAddress };
};

/**
 * @desc    Obtener todos los votantes registrados para una elección
 * @route   GET /api/elections/:electionId/voters
 * @access  Privado (Admin)
 */
const getVoters = async (req, res, next) => {
  try {
    const { provider, contractABI, contractAddress } = setupProvider();
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    const electionId = req.params.electionId;
    
    // Verificar que la elección existe
    await contract.getElectionSummary(electionId);
    
    // Esta función depende de la implementación del contrato
    // Asumimos que hay una función para obtener votantes registrados
    const registeredVoters = await contract.getRegisteredVoters(electionId);
    
    // Obtener información adicional de cada votante desde la base de datos
    const voters = [];
    for (const address of registeredVoters) {
      const user = await User.findOne({ address: address.toLowerCase() })
        .select('address name email')
        .lean();
      
      voters.push({
        address,
        name: user?.name || '',
        email: user?.email || '',
        registered: true
      });
    }
    
    res.json({
      success: true,
      voters,
      count: voters.length
    });
  } catch (error) {
    next(new AppError(`Error al obtener votantes: ${error.message}`, 500));
  }
};

/**
 * @desc    Registrar múltiples votantes para una elección
 * @route   POST /api/elections/:electionId/voters
 * @access  Privado (Admin)
 */
const registerVoters = async (req, res, next) => {
  try {
    const { provider, contractABI, contractAddress } = setupProvider();
    
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      return next(new AppError('Credenciales de administrador no configuradas', 500));
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);
    
    const electionId = req.params.electionId;
    const { voters } = req.body; // Array de direcciones de wallets
    
    // Verificar que la elección existe y está activa
    const election = await contract.getElectionSummary(electionId);
    if (!election.isActive) {
      return next(new AppError('No se pueden registrar votantes en una elección inactiva', 400));
    }
    
    // Verificar que la elección no ha finalizado
    const currentTime = Math.floor(Date.now() / 1000);
    if (election.endTime <= currentTime) {
      return next(new AppError('No se pueden registrar votantes en una elección finalizada', 400));
    }
    
    // Registrar cada votante
    const results = [];
    for (const address of voters) {
      try {
        // Verificar si ya está registrado
        const isRegistered = await contract.isRegisteredVoter(electionId, address);
        if (isRegistered) {
          results.push({
            address,
            success: false,
            message: 'Ya está registrado'
          });
          continue;
        }
        
        // Registrar el votante
        const tx = await contract.registerVoter(electionId, address);
        await tx.wait();
        
        results.push({
          address,
          success: true,
          message: 'Registrado exitosamente'
        });
        
        // Crear o actualizar el usuario en la base de datos si no existe
        await User.findOneAndUpdate(
          { address: address.toLowerCase() },
          { $setOnInsert: { address: address.toLowerCase() } },
          { upsert: true, new: true }
        );
      } catch (error) {
        console.error(`Error registrando votante ${address}:`, error);
        results.push({
          address,
          success: false,
          message: `Error: ${error.message}`
        });
      }
    }
    
    res.json({
      success: true,
      results,
      successCount: results.filter(r => r.success).length,
      failCount: results.filter(r => !r.success).length
    });
  } catch (error) {
    next(new AppError(`Error al registrar votantes: ${error.message}`, 500));
  }
};

/**
 * @desc    Eliminar un votante de una elección
 * @route   DELETE /api/elections/:electionId/voters/:voterAddress
 * @access  Privado (Admin)
 */
const removeVoter = async (req, res, next) => {
  try {
    const { provider, contractABI, contractAddress } = setupProvider();
    
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      return next(new AppError('Credenciales de administrador no configuradas', 500));
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);
    
    const electionId = req.params.electionId;
    const voterAddress = req.params.voterAddress;
    
    // Verificar que la elección existe y está activa
    const election = await contract.getElectionSummary(electionId);
    if (!election.isActive) {
      return next(new AppError('No se pueden modificar votantes en una elección inactiva', 400));
    }
    
    // Verificar que la elección no ha comenzado
    const currentTime = Math.floor(Date.now() / 1000);
    if (election.startTime <= currentTime) {
      return next(new AppError('No se pueden eliminar votantes en una elección que ya ha comenzado', 400));
    }
    
    // Verificar si está registrado
    const isRegistered = await contract.isRegisteredVoter(electionId, voterAddress);
    if (!isRegistered) {
      return next(new AppError('El votante no está registrado en esta elección', 400));
    }
    
    // Eliminar el votante
    const tx = await contract.removeVoter(electionId, voterAddress);
    await tx.wait();
    
    res.json({
      success: true,
      message: 'Votante eliminado exitosamente'
    });
  } catch (error) {
    next(new AppError(`Error al eliminar votante: ${error.message}`, 500));
  }
};

/**
 * @desc    Verificar si un votante está registrado en una elección
 * @route   POST /api/elections/:electionId/voters/verify
 * @access  Público
 */
const verifyVoter = async (req, res, next) => {
  try {
    const { provider, contractABI, contractAddress } = setupProvider();
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    const electionId = req.params.electionId;
    const { address } = req.body;
    
    // Verificar que la elección existe
    await contract.getElectionSummary(electionId);
    
    // Verificar si está registrado
    const isRegistered = await contract.isRegisteredVoter(electionId, address);
    
    // Verificar si ya ha votado
    const hasVoted = await contract.hasVoted(electionId, address);
    
    res.json({
      success: true,
      isRegistered,
      hasVoted,
      address
    });
  } catch (error) {
    next(new AppError(`Error al verificar votante: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener estadísticas de los votantes para una elección
 * @route   GET /api/elections/:electionId/voters/stats
 * @access  Privado (Admin)
 */
const getVoterStats = async (req, res, next) => {
  try {
    const { provider, contractABI, contractAddress } = setupProvider();
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    const electionId = req.params.electionId;
    
    // Verificar que la elección existe
    const election = await contract.getElectionSummary(electionId);
    
    // Obtener conteo de votantes registrados
    const registeredVoters = await contract.getRegisteredVoterCount(electionId);
    
    // Obtener información de votos
    let votedCount = 0;
    try {
      // Esta función depende de la implementación del contrato
      votedCount = await contract.getVotedCount(electionId);
    } catch (error) {
      console.error('Error obteniendo conteo de votos:', error);
      // Usamos el total de votos como estimación
      votedCount = parseInt(election.totalVotes.toString());
    }
    
    // Calcular estadísticas
    const stats = {
      electionId: parseInt(electionId),
      title: election.title,
      registeredVoters: parseInt(registeredVoters.toString()),
      votedCount: parseInt(votedCount.toString()),
      participationRate: registeredVoters > 0 ? (votedCount / registeredVoters) * 100 : 0,
      remainingVoters: parseInt(registeredVoters.toString()) - parseInt(votedCount.toString()),
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    next(new AppError(`Error al obtener estadísticas de votantes: ${error.message}`, 500));
  }
};

module.exports = {
  getVoters,
  registerVoters,
  removeVoter,
  verifyVoter,
  getVoterStats
};
