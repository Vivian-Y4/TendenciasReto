const User = require('../models/User');
const ElectionMeta = require('../models/ElectionMeta');
const CandidateMeta = require('../models/CandidateMeta');
const VotingStatistics = require('../models/VotingStatistics');
const ethers = require('ethers');

// Carga el ABI del contrato de votación
const contractABI = require('../utils/VotingSystemABI.json');
const contractAddress = process.env.CONTRACT_ADDRESS;

/**
 * Sincroniza una elección desde la blockchain a MongoDB
 * @param {Number} electionId - ID de la elección en la blockchain
 */
exports.syncElection = async (req, res) => {
  try {
    const { electionId } = req.params;
    
    // Conectar con la blockchain
    const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    // Obtener datos de la elección desde la blockchain
    const electionData = await contract.getElection(electionId);
    
    // Buscar si ya existe metadata de esta elección
    let electionMeta = await ElectionMeta.findOne({ electionId });
    
    if (!electionMeta) {
      // Si no existe, crear un nuevo registro
      electionMeta = new ElectionMeta({
        electionId,
        createdBy: electionData.creator,
        // Inicializa con datos básicos
        translations: {
          es: {
            title: electionData.title,
            description: electionData.description
          },
          en: {
            title: electionData.title,
            description: electionData.description
          }
        }
      });
    } else {
      // Si existe, actualizar estadísticas
      electionMeta.viewCount += 1;
    }
    
    // Guardar o actualizar
    await electionMeta.save();
    
    // Sincronizar estadísticas de votación
    await syncVotingStats(electionId, contract);
    
    // Sincronizar candidatos
    await syncCandidates(electionId, contract);
    
    res.status(200).json({
      success: true,
      message: 'Elección sincronizada correctamente',
      data: electionMeta
    });
    
  } catch (error) {
    console.error('Error al sincronizar elección:', error);
    res.status(500).json({
      success: false,
      message: 'Error al sincronizar datos con la blockchain',
      error: error.message
    });
  }
};

/**
 * Función auxiliar para sincronizar estadísticas de votación
 */
async function syncVotingStats(electionId, contract) {
  try {
    // Obtener datos básicos de la elección
    const electionData = await contract.getElection(electionId);
    const votersCount = await contract.getRegisteredVotersCount(electionId);
    const votesCount = await contract.getVotesCount(electionId);
    
    // Buscar o crear estadísticas
    let stats = await VotingStatistics.findOne({ electionId });
    
    if (!stats) {
      stats = new VotingStatistics({
        electionId,
        totalEligibleVoters: parseInt(votersCount),
        totalVotesCast: parseInt(votesCount)
      });
    } else {
      // Actualizar conteos
      stats.totalEligibleVoters = parseInt(votersCount);
      stats.totalVotesCast = parseInt(votesCount);
    }
    
    // Calcular tasa de participación
    if (stats.totalEligibleVoters > 0) {
      stats.participationRate = (stats.totalVotesCast / stats.totalEligibleVoters) * 100;
    }
    
    stats.lastUpdated = new Date();
    await stats.save();
    
    return stats;
  } catch (error) {
    console.error('Error al sincronizar estadísticas:', error);
    throw error;
  }
}

/**
 * Función auxiliar para sincronizar candidatos
 */
async function syncCandidates(electionId, contract) {
  try {
    // Obtener los candidatos de la elección
    const candidatesCount = await contract.getCandidatesCount(electionId);
    
    // Para cada candidato, sincronizar metadata
    for (let i = 0; i < candidatesCount; i++) {
      const candidateData = await contract.getCandidate(electionId, i);
      
      // Buscar si ya existe metadata para este candidato
      let candidateMeta = await CandidateMeta.findOne({ 
        electionId,
        candidateId: i
      });
      
      if (!candidateMeta) {
        // Crear metadata básica si no existe
        candidateMeta = new CandidateMeta({
          electionId,
          candidateId: i,
          translations: {
            es: {
              name: candidateData.name,
              description: candidateData.description
            },
            en: {
              name: candidateData.name,
              description: candidateData.description
            }
          }
        });
        
        await candidateMeta.save();
      }
    }
  } catch (error) {
    console.error('Error al sincronizar candidatos:', error);
    throw error;
  }
}

/**
 * Registra un nuevo usuario o actualiza uno existente
 */
exports.registerUser = async (req, res) => {
  try {
    const { walletAddress, name, email, preferredLanguage } = req.body;
    
    // Verificar si el usuario ya existe
    let user = await User.findOne({ walletAddress });
    
    if (user) {
      // Actualizar campos
      user.name = name || user.name;
      user.email = email || user.email;
      user.preferredLanguage = preferredLanguage || user.preferredLanguage;
      user.lastLogin = new Date();
    } else {
      // Crear nuevo usuario
      user = new User({
        walletAddress,
        name,
        email,
        preferredLanguage,
        lastLogin: new Date()
      });
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: user._id ? 'Usuario actualizado correctamente' : 'Usuario registrado correctamente',
      data: user
    });
    
  } catch (error) {
    console.error('Error al registrar/actualizar usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar/actualizar usuario',
      error: error.message
    });
  }
};

/**
 * Actualiza las preferencias de idioma del usuario
 */
exports.updateLanguagePreference = async (req, res) => {
  try {
    const { walletAddress, preferredLanguage } = req.body;
    
    if (!['en', 'es'].includes(preferredLanguage)) {
      return res.status(400).json({
        success: false,
        message: 'Idioma no soportado. Use "en" o "es".'
      });
    }
    
    const user = await User.findOneAndUpdate(
      { walletAddress },
      { preferredLanguage },
      { new: true, upsert: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Preferencia de idioma actualizada',
      data: user
    });
    
  } catch (error) {
    console.error('Error al actualizar preferencia de idioma:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar preferencia de idioma',
      error: error.message
    });
  }
};

/**
 * Obtiene estadísticas de votación
 */
exports.getVotingStatistics = async (req, res) => {
  try {
    const { electionId } = req.params;
    
    const stats = await VotingStatistics.findOne({ electionId });
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'No se encontraron estadísticas para esta elección'
      });
    }
    
    res.status(200).json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas de votación',
      error: error.message
    });
  }
};
