const Election = require('../models/Election'); // Keep for now for other functions, may remove if not used
const ElectionSettings = require('../models/ElectionSettings'); // Keep for now
const ElectoralCategory = require('../models/ElectoralCategory'); // Keep for now
const Candidate = require('../models/Candidate'); // Keep for now
const Voter = require('../models/Voter'); // Keep for now
const ActivityLog = require('../models/ActivityLog'); // Keep for now, for logging user actions
const { AppError } = require('../middlewares/errorHandler');
const mongoose = require('mongoose'); // Keep for now, might be used by other functions or session management
const { ethers } = require('ethers');
const fs = require('fs'); // Using synchronous fs for setupProvider
const path = require('path');

let localContractABI = null; // Cache ABI

/**
 * Configura la conexión al proveedor Ethereum y obtiene el contrato.
 * This function is primarily for loading contract ABI and address.
 */
const setupProvider = () => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'http://localhost:8545');
    const contractAddress = process.env.CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      console.error('CONTRACT_ADDRESS not found in environment variables.');
      throw new AppError('Dirección del contrato VotingSystem no configurada en el servidor.', 500);
    }
    
    if (!localContractABI) { // Load ABI only if not cached
        const contractArtifactPath = path.join(__dirname, '..', '..', 'artifacts', 'contracts', 'VotingSystem.sol', 'VotingSystem.json');
        if (fs.existsSync(contractArtifactPath)) {
          const artifactFileContent = fs.readFileSync(contractArtifactPath, 'utf8');
          localContractABI = JSON.parse(artifactFileContent).abi;
        } else {
          const abiUtilPath = path.join(__dirname, '..', 'utils', 'VotingSystemABI.json');
          if (fs.existsSync(abiUtilPath)) {
            console.warn(`Artifact not found at ${contractArtifactPath}, using ABI from ${abiUtilPath}. Ensure this is the correct ABI.`);
            const abiFileContent = fs.readFileSync(abiUtilPath, 'utf8');
            const parsedAbiJson = JSON.parse(abiFileContent);
            if (Array.isArray(parsedAbiJson)) {
                localContractABI = parsedAbiJson;
            } else if (parsedAbiJson && parsedAbiJson.abi) {
                localContractABI = parsedAbiJson.abi;
            } else {
                console.error(`ABI in ${abiUtilPath} is not in a recognized format.`);
                throw new AppError('ABI del contrato VotingSystem (utils) no tiene el formato esperado.', 500);
            }
          } else {
            console.error(`ABI file for VotingSystem not found at either ${contractArtifactPath} or ${abiUtilPath}`);
            throw new AppError('ABI del contrato VotingSystem no encontrado en el servidor.', 500);
          }
        }
        if (!localContractABI || localContractABI.length === 0) {
            console.error('VotingSystem ABI loaded is empty or invalid.');
            throw new AppError('ABI del VotingSystem es inválido o está vacío.', 500);
        }
    }

    return { provider, contractABI: localContractABI, contractAddress };
  } catch (error) {
    console.error('Error fatal en setupProvider:', error.message, error.stack);
    if (error instanceof AppError) throw error;
    throw new AppError(`Error crítico al configurar la conexión blockchain: ${error.message}`, 500);
  }
};

const getAdminWallet = (provider) => {
    if (!process.env.ADMIN_SIGNER_PRIVATE_KEY) {
        console.error("[AdminWallet] CRITICAL: ADMIN_SIGNER_PRIVATE_KEY is not set.");
        throw new AppError("Clave privada del administrador para firmar transacciones no configurada.", 500);
    }
    return new ethers.Wallet(process.env.ADMIN_SIGNER_PRIVATE_KEY, provider);
};

const handleContractError = (error, contract, next, transactionHash = null) => {
    console.error("[ContractCallError] Details:", error);
    let revertReason = error.message;
    if (error.data && contract) {
        try {
            revertReason = contract.interface.parseError(error.data).name;
        } catch (e) { console.error("Could not parse revert reason from error.data:", e); }
    } else if (error.reason) {
        revertReason = error.reason;
    }
    return next(new AppError(`Error en contrato: ${revertReason}`, 500, transactionHash || error.transactionHash));
};


/**
 * @desc    Crear una nueva elección
 * @route   POST /api/admin/elections
 * @access  Privado (Admin)
 */
const createElection = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      title,
      description,
      electoralLevel, // Added field
      province, // Added field
      startDate,
      endDate,
      registrationDeadline,
      isPublic = true,
      requiresRegistration = true,
      categories: categoryIds,
      settings: settingsData
    } = req.body;

    if (!title || !description || !electoralLevel || !startDate || !endDate) {
      throw new AppError('Título, descripción, nivel electoral, fecha de inicio y fin son obligatorios.', 400);
    }

    const newElection = new Election({
      title,
      description,
      electoralLevel, // Save the field
      province, // Save the field
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      isPublic,
      requiresRegistration,
      createdBy: req.user.id,
      status: 'draft',
    });

    await newElection.save({ session });

    await ActivityLog.logActivity({
        user: { id: req.user.id, username: req.user.username, name: req.user.name, model: 'Admin' },
        action: 'election_create',
        resource: { type: 'Election', id: newElection._id, name: newElection.title },
        details: `Elección creada en estado 'borrador'.`
    }, { session });

    await session.commitTransaction();
    res.status(201).json({ success: true, message: 'Elección creada exitosamente.', data: newElection });

  } catch (error) {
    await session.abortTransaction();
    next(error instanceof AppError ? error : new AppError('Error al crear la elección: ' + error.message, 500));
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Añadir un candidato a una elección
 * @route   POST /api/admin/elections/:electionId/candidates
 * @access  Privado (Admin)
 */
const addCandidateToElection = async (req, res, next) => {
  const { electionId } = req.params;
  const { name, description } = req.body;

  console.log(`[ElectionAdminCtrl] addCandidateToElection for electionId: ${electionId}`);
  console.log('[ElectionAdminCtrl] Admin user:', req.user ? req.user.username : 'N/A');

  if (!name || !description) return next(new AppError('Nombre y descripción del candidato son obligatorios.', 400));
  if (!electionId) return next(new AppError('ID de la elección es obligatorio.', 400));

  const numericElectionId = ethers.BigNumber.from(electionId);
  console.log(`[ElectionAdminCtrl] Calling 'VotingSystem.sol' -> addCandidate() with params: ElectionID=${numericElectionId}, Name=${name}, Desc=${description}`);

  let contract;
  try {
    const { provider, contractABI, contractAddress } = setupProvider();
    const adminWallet = getAdminWallet(provider);
    contract = new ethers.Contract(contractAddress, contractABI, adminWallet);

    const tx = await contract.addCandidate(numericElectionId, name, description);
    console.log(`[ElectionAdminCtrl] addCandidate TX sent. Hash: ${tx.hash}. Waiting...`);
    const receipt = await tx.wait();
    console.log(`[ElectionAdminCtrl] addCandidate TX confirmed. Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed.toString()}`);
      
    const event = receipt.events?.find(e => e.event === 'CandidateAdded');
    const blockchainCandidateId = event && event.args ? (event.args.candidateId ? event.args.candidateId.toString() : (event.args[1] ? event.args[1].toString() : null)) : null;
    console.log(`[ElectionAdminCtrl] Blockchain Candidate ID: ${blockchainCandidateId}`);
      
    if (req.user && ActivityLog) {
        try {
            await ActivityLog.logActivity({
                user: { id: req.user._id || req.user.id, username: req.user.username, name: req.user.name, model: 'Admin' },
                action: 'election_add_candidate_blockchain',
                resource: { type: 'BlockchainCandidate', id: blockchainCandidateId, name: name },
                details: { electionId: numericElectionId.toString(), transactionHash: tx.hash, blockNumber: receipt.blockNumber }
            });
        } catch (logError) {
            console.error("[ElectionAdminCtrl] Failed to log activity for addCandidate:", logError);
        }
    }

    res.status(201).json({
      success: true,
      message: "Candidato añadido exitosamente a la elección en la blockchain.",
      data: {
        electionId: numericElectionId.toString(),
        blockchainCandidateId,
        name,
        description,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      }
    });
  } catch (error) {
    return handleContractError(error, contract, next);
  }
};


/**
 * @desc    Finalizar una elección en la blockchain
 * @route   POST /api/admin/elections/:electionId/end-election
 * @access  Privado (Admin)
 */
const endElectionEndpoint = async (req, res, next) => {
  const { electionId } = req.params;
  console.log(`[ElectionAdminCtrl] endElectionEndpoint for electionId: ${electionId}`);
  console.log('[ElectionAdminCtrl] Admin user:', req.user ? req.user.username : 'N/A');

  if (!electionId) return next(new AppError('ID de la elección es obligatorio.', 400));

  const numericElectionId = ethers.BigNumber.from(electionId);
  console.log(`[ElectionAdminCtrl] Calling 'VotingSystem.sol' -> endElection() for ElectionID=${numericElectionId}`);

  let contract;
  try {
    const { provider, contractABI, contractAddress } = setupProvider();
    const adminWallet = getAdminWallet(provider);
    contract = new ethers.Contract(contractAddress, contractABI, adminWallet);

    const tx = await contract.endElection(numericElectionId);
    console.log(`[ElectionAdminCtrl] endElection TX sent. Hash: ${tx.hash}. Waiting...`);
    const receipt = await tx.wait();
    console.log(`[ElectionAdminCtrl] endElection TX confirmed. Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed.toString()}`);

    if (req.user && ActivityLog) {
        try {
            await ActivityLog.logActivity({
                user: { id: req.user._id || req.user.id, username: req.user.username, name: req.user.name, model: 'Admin' },
                action: 'election_end_blockchain',
                resource: { type: 'BlockchainElection', id: numericElectionId.toString(), name: `Election ${numericElectionId.toString()}` },
                details: { transactionHash: tx.hash, blockNumber: receipt.blockNumber }
            });
        } catch (logError) {
            console.error("[ElectionAdminCtrl] Failed to log activity for endElection:", logError);
        }
    }

    res.status(200).json({
        success: true,
        message: "Elección finalizada en blockchain.",
        data: {
            electionId: numericElectionId.toString(),
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
        }
    });
  } catch (error) {
    return handleContractError(error, contract, next);
  }
};

/**
 * @desc    Finalizar resultados de una elección en la blockchain
 * @route   POST /api/admin/elections/:electionId/finalize-results
 * @access  Privado (Admin)
 */
const finalizeResultsEndpoint = async (req, res, next) => {
  const { electionId } = req.params;
  console.log(`[ElectionAdminCtrl] finalizeResultsEndpoint for electionId: ${electionId}`);
  console.log('[ElectionAdminCtrl] Admin user:', req.user ? req.user.username : 'N/A');

  if (!electionId) return next(new AppError('ID de la elección es obligatorio.', 400));

  const numericElectionId = ethers.BigNumber.from(electionId);
  console.log(`[ElectionAdminCtrl] Calling 'VotingSystem.sol' -> finalizeResults() for ElectionID=${numericElectionId}`);

  let contract;
  try {
    const { provider, contractABI, contractAddress } = setupProvider();
    const adminWallet = getAdminWallet(provider);
    contract = new ethers.Contract(contractAddress, contractABI, adminWallet);

    const tx = await contract.finalizeResults(numericElectionId);
    console.log(`[ElectionAdminCtrl] finalizeResults TX sent. Hash: ${tx.hash}. Waiting...`);
    const receipt = await tx.wait();
    console.log(`[ElectionAdminCtrl] finalizeResults TX confirmed. Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed.toString()}`);

    if (req.user && ActivityLog) {
        try {
            await ActivityLog.logActivity({
                user: { id: req.user._id || req.user.id, username: req.user.username, name: req.user.name, model: 'Admin' },
                action: 'election_finalize_results_blockchain',
                resource: { type: 'BlockchainElection', id: numericElectionId.toString(), name: `Election ${numericElectionId.toString()}` },
                details: { transactionHash: tx.hash, blockNumber: receipt.blockNumber }
            });
        } catch (logError) {
            console.error("[ElectionAdminCtrl] Failed to log activity for finalizeResults:", logError);
        }
    }

    res.status(200).json({
        success: true,
        message: "Resultados de la elección finalizados en blockchain.",
        data: {
            electionId: numericElectionId.toString(),
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
        }
    });
  } catch (error) {
    return handleContractError(error, contract, next);
  }
};


// --- Existing complex functions - to be reviewed/simplified/commented out for this subtask ---
// (These functions like getElections, getElectionById, updateElection, etc. are heavily MongoDB-dependent)
// (For this subtask, we are focusing on the direct blockchain interaction for core admin tasks)

/**
 * @desc    Obtener todas las elecciones con filtros (MongoDB based)
 */
const getElections = async (req, res, next) => {
  console.log("[ElectionAdminCtrl] getElections (MongoDB) called. This is not using direct contract data for listing.");
  try {
    const {
      page = 1, limit = 10, status, search, startAfter, endBefore, isPublic, sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (isPublic === 'true') filter.isPublic = true;
    if (isPublic === 'false') filter.isPublic = false;
    if (startAfter) filter.startDate = { $gte: new Date(startAfter) };
    if (endBefore) filter.endDate = { $lte: new Date(endBefore) };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const elections = await Election.find(filter)
      .populate('createdBy', 'username name')
      .populate('settings', 'name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Election.countDocuments(filter);
    // Simplified enrichment for brevity for this phase
    const enrichedElections = elections.map(e => ({ ...e.toObject(), candidateCount: 0, voterCount: 0, currentStatus: e.status }));

    res.status(200).json({
      success: true, count: elections.length, total, page: parseInt(page), pages: Math.ceil(total / limit), data: enrichedElections
    });
  } catch (error) {
    next(new AppError(`Error al obtener elecciones (MongoDB): ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener una elección por ID (MongoDB based)
 */
const getElectionById = async (req, res, next) => {
  console.log(`[ElectionAdminCtrl] getElectionById (MongoDB) for ID: ${req.params.id}. Not direct contract data.`);
  try {
    const election = await Election.findById(req.params.id)
      .populate('createdBy', 'username name')
      .populate('settings', 'name votingSystem authenticationMethod');
    if (!election) return next(new AppError('Elección no encontrada (MongoDB)', 404));
    
    // Simplified data for this phase
    res.status(200).json({
      success: true, data: { ...election.toObject(), candidates: [], voterCount: 0, votesCount: 0, currentStatus: election.status }
    });
  } catch (error) {
    next(new AppError(`Error al obtener elección (MongoDB): ${error.message}`, 500));
  }
};

/**
 * @desc    Actualizar una elección existente (MongoDB based)
 * @route   PUT /api/admin/elections/:electionId
 * @access  Privado (Admin)
 */
const updateElection = async (req, res, next) => {
  const { electionId } = req.params;
  const { title, description, electoralLevel, province, candidates } = req.body;
  
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const election = await Election.findById(electionId).session(session);
    if (!election) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Elección no encontrada.', 404));
    }

    // Update election properties
    const electionUpdateData = {};
    if (title !== undefined) electionUpdateData.title = title;
    if (description !== undefined) electionUpdateData.description = description;
    if (electoralLevel !== undefined) electionUpdateData.electoralLevel = electoralLevel;

    // Determine the final electoral level to correctly handle the province
    const finalElectoralLevel = electoralLevel !== undefined ? electoralLevel : election.electoralLevel;

    if (['Municipal', 'Congresual'].includes(finalElectoralLevel)) {
      // If the province is explicitly being updated, apply the change.
      if (province !== undefined) {
        electionUpdateData.province = province;
      }
    } else {
      // If the final level is 'Presidencial', the province must be cleared.
      electionUpdateData.province = undefined;
    }
    Object.assign(election, electionUpdateData);

    // Handle candidate deletions, additions, and updates
    if (candidates && Array.isArray(candidates)) {
      const newCandidateIds = candidates.map(c => c.id).filter(Boolean);
      const existingCandidateIds = election.candidates.map(id => id.toString());

      // 1. Find and delete candidates that were removed
      const candidatesToDelete = existingCandidateIds.filter(id => !newCandidateIds.includes(id));
      if (candidatesToDelete.length > 0) {
        await Candidate.deleteMany({ _id: { $in: candidatesToDelete } }, { session });
      }

      // 2. Update existing candidates
      for (const candData of candidates) {
        if (candData.id && existingCandidateIds.includes(candData.id)) {
          const candidateUpdateData = {};
          if (candData.name) {
            const nameParts = candData.name.trim().split(' ');
            candidateUpdateData.firstName = nameParts.shift() || '';
            candidateUpdateData.lastName = nameParts.join(' ') || '';
          }
          if (candData.description !== undefined) {
            candidateUpdateData.politicalParty = candData.description;
          }

          if (Object.keys(candidateUpdateData).length > 0) {
            await Candidate.findByIdAndUpdate(candData.id, candidateUpdateData, { session });
          }
        }
      }
      
      // 3. Update the election's list of candidates to the new list
      election.candidates = newCandidateIds;
    }

    const updatedElection = await election.save({ session });

    if (req.user && ActivityLog) {
      try {
        const changesForLog = { ...electionUpdateData };
        if (candidates) {
          changesForLog.candidatesUpdated = candidates.length;
        }
        await ActivityLog.logActivity({
            user: { id: req.user.id, username: req.user.username, name: req.user.name, model: 'Admin' },
            action: 'election_updated',
            resource: { type: 'Election', id: updatedElection._id, name: updatedElection.title },
            details: { changes: changesForLog }
        }, { session });
      } catch (logError) {
          console.error("[ElectionAdminCtrl] Failed to log activity for updateElection:", logError);
      }
    }

    await session.commitTransaction();
    session.endSession();

    const finalElection = await Election.findById(updatedElection._id).populate('candidates');

    res.status(200).json({
      success: true,
      message: 'Elección actualizada exitosamente.',
      data: finalElection
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error al actualizar la elección:', error);
    next(new AppError('Error al actualizar la elección.', 500));
  }
};
// remain heavily MongoDB-dependent and are more complex than simple contract interactions.
// They are not updated for direct contract calls in this pass to keep focus.

module.exports = {
  createElection,
  addCandidateToElection,
  endElectionEndpoint,
  finalizeResultsEndpoint,
  setVerifierAddress,
  setElectionMerkleRoot,
  getElections,
  getElectionById,
  updateElection,
  // updateElectionStatus,
  // deployElectionToBlockchain,
  // syncElectionResults,
  // publishElectionResults
};

/**
 * @desc    Establecer la dirección del contrato Verifier ZK-SNARK
 * @route   POST /api/admin/contract-admin/verifier
 * @access  Privado (Owner) - Ensure ADMIN_SIGNER_PRIVATE_KEY is owner for this
 */
const setVerifierAddress = async (req, res, next) => {
  const { verifierAddress } = req.body;
  console.log(`[ElectionAdminCtrl] setVerifierAddress called with address: ${verifierAddress}`);

  if (!verifierAddress || !ethers.utils.isAddress(verifierAddress)) {
    return next(new AppError('Dirección de Verifier inválida o no proporcionada.', 400));
  }

  let contract;
  try {
    const { provider, contractABI, contractAddress: votingSystemAddress } = setupProvider();
    // IMPORTANT: This action is typically `onlyOwner`. Ensure the adminWallet used here IS the contract owner.
    // If ADMIN_SIGNER_PRIVATE_KEY is for a general operator, a different key/wallet setup is needed for this.
    const adminWallet = getAdminWallet(provider);
    contract = new ethers.Contract(votingSystemAddress, contractABI, adminWallet);

    console.log(`[ElectionAdminCtrl] Calling 'VotingSystem.sol' -> setVerifier(${verifierAddress}) from ${adminWallet.address}`);
    const tx = await contract.setVerifier(verifierAddress);
    console.log(`[ElectionAdminCtrl] setVerifier TX sent. Hash: ${tx.hash}. Waiting...`);
    const receipt = await tx.wait();
    console.log(`[ElectionAdminCtrl] setVerifier TX confirmed. Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed.toString()}`);

    if (req.user && ActivityLog) {
        try {
            await ActivityLog.logActivity({
                user: { id: req.user.id, username: req.user.username, name: req.user.name, model: 'Admin' },
                action: 'contract_set_verifier',
                resource: { type: 'VotingSystemContract', id: votingSystemAddress, name: 'VotingSystem' },
                details: { verifierAddress: verifierAddress, transactionHash: tx.hash }
            });
        } catch (logError) {
            console.error("[ElectionAdminCtrl] Failed to log activity for setVerifierAddress:", logError);
        }
    }

    res.status(200).json({
      success: true,
      message: `Dirección del Verifier establecida exitosamente a ${verifierAddress}.`,
      data: { transactionHash: receipt.transactionHash }
    });
  } catch (error) {
    return handleContractError(error, contract, next);
  }
};

/**
 * @desc    Establecer la Merkle root para una elección
 * @route   POST /api/admin/elections/:electionId/merkle-root
 * @access  Privado (Admin/Operator)
 */
const setElectionMerkleRoot = async (req, res, next) => {
  const { electionId } = req.params;
  const { merkleRoot } = req.body;
  console.log(`[ElectionAdminCtrl] setElectionMerkleRoot for electionId: ${electionId} with root: ${merkleRoot}`);

  if (!electionId) return next(new AppError('ID de la elección es obligatorio.', 400));
  if (!merkleRoot || !ethers.utils.isHexString(merkleRoot, 32)) {
    return next(new AppError('Merkle root inválida o no proporcionada. Debe ser un bytes32 hex string.', 400));
  }

  const numericElectionId = ethers.BigNumber.from(electionId);
  let contract;
  try {
    const { provider, contractABI, contractAddress } = setupProvider();
    const adminWallet = getAdminWallet(provider); // Operator key is fine for this
    contract = new ethers.Contract(contractAddress, contractABI, adminWallet);

    console.log(`[ElectionAdminCtrl] Calling 'VotingSystem.sol' -> setMerkleRoot(${numericElectionId}, ${merkleRoot}) from ${adminWallet.address}`);
    const tx = await contract.setMerkleRoot(numericElectionId, merkleRoot);
    console.log(`[ElectionAdminCtrl] setMerkleRoot TX sent. Hash: ${tx.hash}. Waiting...`);
    const receipt = await tx.wait();
    console.log(`[ElectionAdminCtrl] setMerkleRoot TX confirmed. Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed.toString()}`);

    // Update the election model in DB if you store merkleRoot there as well
    const updatedElection = await Election.findOneAndUpdate(
        { contractElectionId: numericElectionId.toString() }, // Assuming you have a field to map contract ID to DB ID
        { merkleRoot: merkleRoot, updatedAt: new Date() },
        { new: true }
    );
    // If not found by contractElectionId, you might need to find by _id if electionId param is MongoDB _id
    // For now, this assumes a mapping or that electionId is the DB identifier.

    if (req.user && ActivityLog) {
        try {
            await ActivityLog.logActivity({
                user: { id: req.user.id, username: req.user.username, name: req.user.name, model: 'Admin' },
                action: 'election_set_merkle_root',
                resource: { type: 'BlockchainElection', id: numericElectionId.toString(), name: `Election ${numericElectionId.toString()}` },
                details: { merkleRoot: merkleRoot, transactionHash: tx.hash }
            });
        } catch (logError) {
            console.error("[ElectionAdminCtrl] Failed to log activity for setElectionMerkleRoot:", logError);
        }
    }

    res.status(200).json({
      success: true,
      message: `Merkle root para la elección ${numericElectionId} establecida exitosamente.`,
      data: { transactionHash: receipt.transactionHash, dbElectionUpdate: updatedElection ? 'synced' : 'not_synced_or_not_found' }
    });
  } catch (error) {
    return handleContractError(error, contract, next);
  }
};

// Re-export existing and new functions
module.exports = {
  createElection,
  addCandidateToElection,
  endElectionEndpoint,
  finalizeResultsEndpoint,
  setVerifierAddress,
  setElectionMerkleRoot,
  getElections,
  getElectionById,
  updateElection,
  // updateElectionStatus,
  // deployElectionToBlockchain,
  // syncElectionResults,
  // publishElectionResults
};
