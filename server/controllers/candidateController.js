const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const CandidateMeta = require('../models/CandidateMeta');
const { AppError } = require('../middlewares/errorHandler');

/**
 * Configura la conexiu00f3n al proveedor Ethereum y obtiene el contrato
 */
const setupProvider = () => {
  // En producciu00f3n, conectaru00edamos a una red real o nodo
  // Para pruebas locales, conectamos al nodo local de hardhat
  const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'http://localhost:8545');
  
  // Obtener ABI del contrato y direcciu00f3n
  const contractABIPath = path.join(__dirname, '../../artifacts/contracts/VotingSystem.sol/VotingSystem.json');
  const contractABI = JSON.parse(fs.readFileSync(contractABIPath)).abi;
  
  // La direcciu00f3n del contrato debe estar en .env o en config
  const contractAddress = process.env.CONTRACT_ADDRESS;
  
  if (!contractAddress) {
    throw new AppError('Direcciu00f3n del contrato no encontrada', 500);
  }
  
  return { provider, contractABI, contractAddress };
};

/**
 * @desc    Obtener todos los candidatos de una elecciu00f3n
 * @route   GET /api/elections/:electionId/candidates
 * @access  Pu00fablico
 */
const getCandidates = async (req, res, next) => {
  try {
    const { provider, contractABI, contractAddress } = setupProvider();
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    const electionId = req.params.electionId;
    
    // Verificar que la elecciu00f3n existe
    const election = await contract.getElectionSummary(electionId);
    
    // Obtener todos los candidatos para esta elecciu00f3n
    const candidates = [];
    for (let i = 0; i < election.candidateCount; i++) {
      try {
        const candidate = await contract.getCandidate(electionId, i);
        
        // Buscar metadata adicional del candidato
        let candidateMeta = {};
        const candidateMetaDB = await CandidateMeta.findOne({ electionId, candidateId: i });
        if (candidateMetaDB) {
          candidateMeta = {
            imageUrl: candidateMetaDB.imageUrl,
            bio: candidateMetaDB.bio,
            socialMedia: candidateMetaDB.socialMedia,
            additionalInfo: candidateMetaDB.additionalInfo
          };
        }
        
        candidates.push({
          id: i,
          name: candidate[0],
          description: candidate[1],
          voteCount: election.resultsFinalized ? candidate[2].toString() : null,
          metadata: candidateMeta
        });
      } catch (error) {
        console.error(`Error obteniendo datos del candidato ${i}:`, error);
        // Continuamos con el siguiente candidato si hay error en uno
      }
    }
    
    res.json({
      success: true,
      candidates,
      count: candidates.length,
      electionTitle: election.title
    });
  } catch (error) {
    next(new AppError(`Error al obtener candidatos: ${error.message}`, 500));
  }
};

/**
 * @desc    Au00f1adir un nuevo candidato a una elecciu00f3n
 * @route   POST /api/elections/:electionId/candidates
 * @access  Privado (Admin)
 */
const addCandidate = async (req, res, next) => {
  try {
    const { provider, contractABI, contractAddress } = setupProvider();
    
    const privateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!privateKey) {
      return next(new AppError('Credenciales de administrador no configuradas', 500));
    }
    
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, contractABI, wallet);
    
    const electionId = req.params.electionId;
    const { name, description, imageUrl, bio, socialMedia, additionalInfo } = req.body;
    
    // Verificar que la elecciu00f3n existe y no ha comenzado
    const election = await contract.getElectionSummary(electionId);
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (election.startTime <= currentTime) {
      return next(new AppError('No se pueden au00f1adir candidatos a una elecciu00f3n que ya ha comenzado', 400));
    }
    
    // Au00f1adir el candidato al blockchain
    const tx = await contract.addCandidate(electionId, name, description);
    const receipt = await tx.wait();
    
    // Buscar el evento para obtener el ID del candidato
    const event = receipt.events.find(e => e.event === 'CandidateAdded');
    const candidateId = event ? event.args.candidateId.toNumber() : null;
    
    // Si no se puede obtener el ID por evento, obtener el candidateCount - 1
    if (candidateId === null) {
      const updatedElection = await contract.getElectionSummary(electionId);
      candidateId = updatedElection.candidateCount.toNumber() - 1;
    }
    
    // Guardar metadata adicional del candidato
    const metadata = {
      electionId: parseInt(electionId),
      candidateId,
      imageUrl,
      bio,
      socialMedia,
      additionalInfo
    };
    
    await CandidateMeta.findOneAndUpdate(
      { electionId, candidateId },
      metadata,
      { upsert: true, new: true }
    );
    
    res.status(201).json({
      success: true,
      message: 'Candidato au00f1adido exitosamente',
      candidateId
    });
  } catch (error) {
    next(new AppError(`Error al au00f1adir candidato: ${error.message}`, 500));
  }
};

/**
 * @desc    Actualizar informaciu00f3n de un candidato
 * @route   PUT /api/elections/:electionId/candidates/:candidateId
 * @access  Privado (Admin)
 */
const updateCandidate = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;
    const candidateId = req.params.candidateId;
    const { name, description, imageUrl, bio, socialMedia, additionalInfo } = req.body;
    
    // Verificar que el candidato existe en el blockchain
    const { provider, contractABI, contractAddress } = setupProvider();
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    // Verificar que la elecciu00f3n existe y no ha comenzado
    const election = await contract.getElectionSummary(electionId);
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (election.startTime <= currentTime) {
      return next(new AppError('No se pueden modificar candidatos de una elecciu00f3n que ya ha comenzado', 400));
    }
    
    if (candidateId >= election.candidateCount) {
      return next(new AppError('Candidato no encontrado', 404));
    }
    
    // Si se actualizan los datos en blockchain (nombre o descripciu00f3n)
    if (name || description) {
      const privateKey = process.env.ADMIN_PRIVATE_KEY;
      if (!privateKey) {
        return next(new AppError('Credenciales de administrador no configuradas', 500));
      }
      
      const wallet = new ethers.Wallet(privateKey, provider);
      const contractWithSigner = new ethers.Contract(contractAddress, contractABI, wallet);
      
      // Esta funciu00f3n depende de la implementaciu00f3n del contrato
      // Asumimos que hay una funciu00f3n para actualizar candidatos
      const candidate = await contract.getCandidate(electionId, candidateId);
      
      const tx = await contractWithSigner.updateCandidate(
        electionId,
        candidateId,
        name || candidate[0],
        description || candidate[1]
      );
      await tx.wait();
    }
    
    // Actualizar metadata en la base de datos
    const metadata = {};
    if (imageUrl !== undefined) metadata.imageUrl = imageUrl;
    if (bio !== undefined) metadata.bio = bio;
    if (socialMedia !== undefined) metadata.socialMedia = socialMedia;
    if (additionalInfo !== undefined) metadata.additionalInfo = additionalInfo;
    
    // Solo actualizar si hay cambios en metadata
    if (Object.keys(metadata).length > 0) {
      await CandidateMeta.findOneAndUpdate(
        { electionId, candidateId },
        { $set: metadata },
        { upsert: true, new: true }
      );
    }
    
    res.json({
      success: true,
      message: 'Candidato actualizado exitosamente'
    });
  } catch (error) {
    next(new AppError(`Error al actualizar candidato: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener un candidato especu00edfico por ID
 * @route   GET /api/elections/:electionId/candidates/:candidateId
 * @access  Pu00fablico
 */
const getCandidate = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;
    const candidateId = req.params.candidateId;
    
    const { provider, contractABI, contractAddress } = setupProvider();
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    // Verificar que la elecciu00f3n existe
    const election = await contract.getElectionSummary(electionId);
    
    if (candidateId >= election.candidateCount) {
      return next(new AppError('Candidato no encontrado', 404));
    }
    
    // Obtener candidato del blockchain
    const candidate = await contract.getCandidate(electionId, candidateId);
    
    // Buscar metadata adicional del candidato
    let candidateMeta = {};
    const candidateMetaDB = await CandidateMeta.findOne({ electionId, candidateId });
    if (candidateMetaDB) {
      candidateMeta = {
        imageUrl: candidateMetaDB.imageUrl,
        bio: candidateMetaDB.bio,
        socialMedia: candidateMetaDB.socialMedia,
        additionalInfo: candidateMetaDB.additionalInfo
      };
    }
    
    res.json({
      success: true,
      candidate: {
        id: parseInt(candidateId),
        name: candidate[0],
        description: candidate[1],
        voteCount: election.resultsFinalized ? candidate[2].toString() : null,
        metadata: candidateMeta
      }
    });
  } catch (error) {
    next(new AppError(`Error al obtener candidato: ${error.message}`, 500));
  }
};

module.exports = {
  getCandidates,
  addCandidate,
  updateCandidate,
  getCandidate
};
