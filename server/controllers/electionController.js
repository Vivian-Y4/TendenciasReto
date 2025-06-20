const { ethers } = require('ethers'); // Still needed for BigNumber, utils if used elsewhere
const fs = require('fs'); // Using synchronous fs
const path = require('path');
const { AppError } = require('../middlewares/errorHandler');
const Election = require('../models/Election'); // Import Election model
const blockchainService = require('../utils/blockchainService'); // Import blockchainService

let localContractABI = null; // Cache ABI - May still be needed for other functions like getElection, getElectionResults

/**
 * Configura la conexión al proveedor Ethereum y obtiene el contrato
 * This function might still be used by other controller methods (getElection, getElectionResults).
 * If those are also switched to DB, this can be removed or refactored.
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
    console.error('Error fatal en setupProvider (electionController):', error.message, error.stack);
    if (error instanceof AppError) throw error;
    throw new AppError(`Error crítico al configurar la conexión blockchain: ${error.message}`, 500);
  }
};

/**
 * @desc    Obtener todas las elecciones (filtradas por provincia/nivel si aplica)
 * @route   GET /api/elections
 * @access  Público (con comportamiento de filtro si usuario autenticado)
 */
const getElections = async (req, res, next) => {
  console.log('[ElectionCtrl] getElections endpoint hit (MongoDB version).');
  try {
    const baseQuery = { status: 'active' }; // Default to active elections
    let electionQuery = {};

    // req.user is populated by the authenticate middleware
    if (req.user && req.user.province) {
      const userProvince = req.user.province;
      console.log(`[ElectionCtrl] Authenticated user. Province: ${userProvince}`);
      electionQuery = {
        ...baseQuery,
        $or: [
          { level: 'presidencial' },
          {
            level: { $in: ['senatorial', 'diputados', 'municipal'] },
            province: userProvince
          }
        ]
      };
    } else {
      // User not authenticated or no province information in token
      console.log('[ElectionCtrl] Unauthenticated user or no province in token.');
      electionQuery = {
        ...baseQuery,
        level: 'presidencial',
        // isPublic: true, // Consider adding an isPublic field to your Election model if needed
      };
    }

    const elections = await Election.find(electionQuery)
      .sort({ startDate: 1 })
      .select('_id title description level province startDate endDate status contractAddress blockchainId additionalInfo') // Select specific fields
      .lean(); // Use .lean() for faster queries if not modifying the docs

    res.json({
      success: true,
      message: "Lista de elecciones obtenida.",
      count: elections.length,
      data: elections
    });
  } catch (error) {
    console.error(`[ElectionCtrl] Error en getElections (MongoDB): ${error.message}`, error.stack);
    next(new AppError(`Error al obtener elecciones: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener una elección por ID desde el contrato
 * @route   GET /api/elections/:id
 * @access  Público
 */
const getElection = async (req, res, next) => {
  const idParam = req.params.id;
  console.log(`[ElectionCtrl] getElection endpoint hit for ID param: ${idParam}.`);

  // If the ID consists only of digits, treat it as a blockchain election ID
  if (/^\d+$/.test(idParam)) {
    try {
      const numericId = parseInt(idParam, 10);
      const summary = await blockchainService.getElectionSummary(numericId);
      const candidates = await blockchainService.getAllCandidates(numericId);
      return res.json({
        success: true,
        data: {
          ...summary,
          candidates,
        },
      });
    } catch (error) {
      console.error(`[ElectionCtrl] Error fetching blockchain election ${idParam}:`, error);
      return next(new AppError(`Error al obtener elección ${idParam} desde blockchain: ${error.message}`, 500));
    }
  }

  const mongoElectionId = idParam;
  console.log(`[ElectionCtrl] getElection endpoint hit for MongoDB ID: ${mongoElectionId}.`);

  let contract; // For contract interactions if any

  try {
    const election = await Election.findById(mongoElectionId).lean();

    if (!election) {
      return next(new AppError('Elección no encontrada en la base de datos.', 404));
    }

    let candidatesFromContract = [];
    let contractSummaryData = {};

    // If there's a blockchainId, try to fetch supplementary data from contract
    if (election.blockchainId) {
      console.log(`[ElectionCtrl] Fetching supplementary contract data for blockchainId: ${election.blockchainId}`);
      try {
        const numericBlockchainId = ethers.BigNumber.from(election.blockchainId);
        const { provider, contractABI, contractAddress } = setupProvider(); // setupProvider might be reused
        contract = new ethers.Contract(contractAddress, contractABI, provider);

    // --- Validación temprana para evitar reverts del contrato ---
    const electionCount = (await contract.electionCount()).toNumber();
    const idNumber = numericBlockchainId.toNumber();
    if (idNumber === 0 || idNumber > electionCount) {
      return next(new AppError(`La elección con ID ${idNumber} no existe.`, 404));
    }

        const summary = await contract.getElectionSummary(numericBlockchainId);

        // Populate contractSummaryData from summary
        contractSummaryData = {
          // id: summary.id.toString(), // This would be blockchainId, already in election doc
          // title: summary.title, // Prefer DB version
          // description: summary.description, // Prefer DB version
          startTimeContract: summary.startTime.toString(), // Distinguish from DB startDate
          endTimeContract: summary.endTime.toString(), // Distinguish from DB endDate
          isActiveContract: summary.isActive,
          candidateCountContract: summary.candidateCount.toString(),
          totalVotesContract: summary.totalVotes.toString(),
          resultsFinalizedContract: summary.resultsFinalized,
          creatorContract: summary.creator,
        };

        const candidateCount = summary.candidateCount.toNumber();
        for (let i = 0; i < candidateCount; i++) {
          const candidateData = await contract.getCandidate(numericBlockchainId, i);
          candidatesFromContract.push({
            id: i, // Candidate index in contract
            name: candidateData[0],
            description: candidateData[1],
            voteCount: candidateData[2].toString(),
          });
        }
      } catch (contractError) {
        console.warn(`[ElectionCtrl] Could not fetch supplementary data from contract for election ${mongoElectionId} (blockchainId ${election.blockchainId}): ${contractError.message}`);
        // Do not fail the request if contract data is unavailable, but log it.
        // The primary data source is MongoDB.
      }
    }
    
    // Combine MongoDB data with contract data (candidates)
    const responseData = {
      ...election, // Spread MongoDB election document (includes _id, title, description, merkleRoot, etc.)
      candidates: candidatesFromContract.length > 0 ? candidatesFromContract : election.candidates || [], // Prioritize contract candidates if available
      // Optionally, include other specific contract data if needed, e.g., contractSummaryData
    };
    // Ensure _id is stringified if not already by .lean() and spread
    responseData._id = responseData._id.toString();

    res.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error(`[ElectionCtrl] Error en getElection (ID: ${mongoElectionId}): ${error.message}`, error.stack);
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
        return next(new AppError('ID de elección con formato inválido.', 400));
    }
    // Attempt to parse contract error if it happened and contract object is defined
    if (error.data && contract) {
        try {
            const reason = contract.interface.parseError(error.data).name;
            return next(new AppError(`Error de contrato al obtener detalles de elección ${mongoElectionId}: ${reason}`, 500));
        } catch (parseError) { /* ignore */ }
    }
    next(new AppError(`Error al obtener detalles de elección ${mongoElectionId}: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener resultados de una elección desde el contrato
 * @route   GET /api/elections/:id/results
 * @access  Público
 */
const getElectionResults = async (req, res, next) => {
    const { id: electionIdParam } = req.params;
    console.log(`[ElectionCtrl] getElectionResults endpoint hit for ID: ${electionIdParam} (contract version).`);

    let contract;
    try {
        const numericElectionId = ethers.BigNumber.from(electionIdParam);
        const { provider, contractABI, contractAddress } = setupProvider();
        contract = new ethers.Contract(contractAddress, contractABI, provider);

        // First, check if results are available (election ended or finalized)
        const summary = await contract.getElectionSummary(numericElectionId);
        if (!summary.resultsFinalized && summary.isActive && ethers.BigNumber.from(summary.endTime).gt(Math.floor(Date.now() / 1000))) {
             return next(new AppError('Los resultados de la elección aún no están disponibles (elección activa y no finalizada).', 403));
        }

        const resultsData = await contract.getElectionResults(numericElectionId); // Returns uint256[] vote counts

        const candidatesWithResults = [];
        const candidateCount = summary.candidateCount.toNumber();

        if (resultsData.length !== candidateCount) {
            console.warn(`[ElectionCtrl] Mismatch between results length (${resultsData.length}) and candidate count (${candidateCount}) for election ${numericElectionId}.`);
            // Fallback or error, for now, try to process what we have or rely on candidate iteration.
        }

        for (let i = 0; i < candidateCount; i++) {
            try {
                const candidateDetails = await contract.getCandidate(numericElectionId, i);
                candidatesWithResults.push({
                    candidateId: i, // Index as ID
                    name: candidateDetails[0],
                    description: candidateDetails[1],
                    voteCount: resultsData[i] ? resultsData[i].toString() : '0' // Get vote count from results array
                });
            } catch (loopError) {
                 console.error(`[ElectionCtrl] Error fetching details for candidate ID ${i} during results assembly for election ${numericElectionId}:`, loopError.message);
                 // Add placeholder if a candidate fetch fails
                 candidatesWithResults.push({
                    candidateId: i,
                    name: `Candidato ${i} (Error al cargar)`,
                    description: "",
                    voteCount: resultsData[i] ? resultsData[i].toString() : '0'
                 });
            }
        }

        candidatesWithResults.sort((a, b) => parseInt(b.voteCount) - parseInt(a.voteCount));

        res.json({
            success: true,
            data: {
                electionId: numericElectionId.toString(),
                resultsFinalized: summary.resultsFinalized,
                candidates: candidatesWithResults,
                totalVotesReportedByContract: summary.totalVotes.toString()
                // Note: totalVotes in summary should match sum of resultsData if contract logic is consistent.
            }
        });
    } catch (error) {
        console.error(`[ElectionCtrl] Error en getElectionResults (ID: ${electionIdParam}, contract): ${error.message}`, error.stack);
        if (error.data && contract) {
            try {
                const reason = contract.interface.parseError(error.data).name;
                return next(new AppError(`Error de contrato al obtener resultados para elección ${electionIdParam}: ${reason}`, 500));
            } catch (parseError) { /* ignore */ }
        }
        next(new AppError(`Error al obtener resultados para elección ${electionIdParam} desde blockchain: ${error.message}`, 500));
    }
};

/**
 * @desc    Revelar un voto para una elección usando su compromiso
 * @route   POST /api/elections/:electionId/reveal
 * @access  Privado (Usuario Autenticado)
 */
const revealVoteOnContract = async (req, res, next) => {
  const { electionId: electionIdParam } = req.params;
  const { candidateId, voteCommitment } = req.body;
  const user = req.user; // From verifyToken middleware

  console.log(`[ElectionCtrl] revealVoteOnContract endpoint hit for Election ID: ${electionIdParam}`);
  console.log(`[ElectionCtrl] User: ${user?.id || user?.address}, Candidate ID: ${candidateId}, Commitment: ${voteCommitment}`);

  if (!electionIdParam || candidateId === undefined || !voteCommitment) {
    return next(new AppError('Election ID, Candidate ID, and Vote Commitment son obligatorios.', 400));
  }
  if (!ethers.utils.isHexString(voteCommitment, 32)) {
    return next(new AppError('Formato de Vote Commitment inválido. Debe ser un bytes32 hex string.', 400));
  }

  let contract; // Define contract here to be available in catch block for error parsing
  try {
    const numericElectionId = ethers.BigNumber.from(electionIdParam);
    const numericCandidateId = ethers.BigNumber.from(candidateId);

    const { provider, contractABI, contractAddress } = setupProvider();

    // Using ADMIN_SIGNER_PRIVATE_KEY for simplicity in pilot.
    // This means the backend's admin account submits the reveal transaction.
    // The user must be authenticated to reach this endpoint.
    if (!process.env.ADMIN_SIGNER_PRIVATE_KEY) {
        return next(new AppError("Clave privada del administrador/operador no configurada en el servidor.", 500));
    }
    const adminWallet = new ethers.Wallet(process.env.ADMIN_SIGNER_PRIVATE_KEY, provider);
    contract = new ethers.Contract(contractAddress, contractABI, adminWallet);

    console.log(`[ElectionCtrl] Calling 'VotingSystem.sol' -> revealVote() from ${adminWallet.address}`);
    console.log(`   Params: ElectionID=${numericElectionId}, CandidateID=${numericCandidateId}, VoteCommitment=${voteCommitment}`);

    const tx = await contract.revealVote(numericElectionId, numericCandidateId, voteCommitment);
    console.log(`[ElectionCtrl] revealVote TX sent. Hash: ${tx.hash}. Waiting for confirmation...`);
    const receipt = await tx.wait();
    console.log(`[ElectionCtrl] revealVote TX confirmed. Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed.toString()}`);

    // Optionally log this activity
    // await ActivityLog.logActivity({ user: {id: user._id, ...}, action: 'vote_reveal', ... });

    res.status(200).json({
      success: true,
      data: {
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        electionId: numericElectionId.toString(),
        candidateId: numericCandidateId.toString(),
        voteCommitment: voteCommitment
      }
    });

  } catch (error) {
    console.error(`[ElectionCtrl] Error en revealVoteOnContract (ElectionID: ${electionIdParam}):`, error);
    let revertReason = error.message;
    if (error.data && contract) { // contract might not be defined if setupProvider failed
        try { revertReason = contract.interface.parseError(error.data).name; } catch (e) { /* ignore */ }
    } else if (error.reason) {
        revertReason = error.reason;
    }
    return next(new AppError(`Error al revelar voto en blockchain: ${revertReason}`, 500, error.transactionHash));
  }
};

// Re-export existing and new functions
module.exports = {
  getElections,
  getElection,
  getElectionResults,
  revealVoteOnContract, // Added new controller function
  // createElection,
  // updateElection,
  // finalizeElection,
  // getElectionStatistics,
  // castVote,
  // getResults
};
