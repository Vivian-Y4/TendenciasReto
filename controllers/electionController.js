const { ethers } = require('ethers');
const fs = require('fs'); // Using synchronous fs
const path = require('path');
const { AppError } = require('../middlewares/errorHandler');

let localContractABI = null; // Cache ABI

/**
 * Configura la conexión al proveedor Ethereum y obtiene el contrato
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
 * @desc    Obtener todas las elecciones públicas desde el contrato
 * @route   GET /api/elections
 * @access  Público
 */
const getElections = async (req, res, next) => {
  console.log('[ElectionCtrl] getElections endpoint hit (contract version).');
  try {
    const { provider, contractABI, contractAddress } = setupProvider();
    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    const electionCountBigNum = await contract.electionCount();
    const electionCount = electionCountBigNum.toNumber();
    console.log(`[ElectionCtrl] Found ${electionCount} elections in contract.`);

    const elections = [];
    for (let i = 0; i < electionCount; i++) {
      try {
        const summary = await contract.getElectionSummary(i);
        // The summary from contract is a struct, convert its BigNumber fields
        elections.push({
          id: summary.id.toString(),
          title: summary.title,
          description: summary.description,
          startTime: summary.startTime.toString(),
          endTime: summary.endTime.toString(),
          isActive: summary.isActive,
          candidateCount: summary.candidateCount.toString(),
          totalVotes: summary.totalVotes.toString(),
          resultsFinalized: summary.resultsFinalized,
          creator: summary.creator, // address
          // No off-chain metadata in this version
        });
      } catch (loopError) {
        console.error(`[ElectionCtrl] Error fetching summary for election ID ${i}:`, loopError.message);
        // Optionally skip this election or add an error placeholder
      }
    }

    res.json({
      success: true,
      message: "Lista de elecciones obtenida desde la blockchain.",
      count: elections.length,
      data: elections
    });
  } catch (error) {
    console.error(`[ElectionCtrl] Error en getElections (contract): ${error.message}`, error.stack);
    next(new AppError(`Error al obtener elecciones desde blockchain: ${error.message}`, 500));
  }
};

/**
 * @desc    Obtener una elección por ID desde el contrato
 * @route   GET /api/elections/:id
 * @access  Público
 */
const getElection = async (req, res, next) => {
  const electionIdParam = req.params.id;
  console.log(`[ElectionCtrl] getElection endpoint hit for ID: ${electionIdParam} (contract version).`);

  let contract;
  try {
    const numericElectionId = ethers.BigNumber.from(electionIdParam);
    const { provider, contractABI, contractAddress } = setupProvider();
    contract = new ethers.Contract(contractAddress, contractABI, provider);

    // --- Validación temprana para evitar reverts del contrato ---
    const electionCount = (await contract.electionCount()).toNumber();
    const idNumber = numericElectionId.toNumber();
    if (idNumber === 0 || idNumber > electionCount) {
      return next(new AppError(`La elección con ID ${idNumber} no existe.`, 404));
    }

    const summary = await contract.getElectionSummary(numericElectionId);
    // Basic check if title exists (implies election was found, though getElectionSummary might not revert for out of bounds)
    // The contract's electionExists modifier should handle out of bounds for most direct calls.
    // Here, we rely on the summary having a title if it's a valid initialized election.
    if (!summary.title && summary.id.eq(0) && summary.startTime.eq(0)) { // Heuristic for uninitialized/non-existent
        return next(new AppError('Elección no encontrada en la blockchain.', 404));
    }
    
    const candidates = [];
    const candidateCount = summary.candidateCount.toNumber();
    for (let i = 0; i < candidateCount; i++) {
      try {
        const candidateData = await contract.getCandidate(numericElectionId, i);
        candidates.push({
          id: i, // This is the candidate's index within the election
          name: candidateData[0],
          description: candidateData[1],
          voteCount: candidateData[2].toString(),
        });
      } catch (loopError) {
        console.error(`[ElectionCtrl] Error fetching candidate ID ${i} for election ${numericElectionId}:`, loopError.message);
      }
    }
    
    res.json({
      success: true,
      message: "Detalles de la elección obtenidos desde la blockchain.",
      data: {
        id: summary.id.toString(),
        title: summary.title,
        description: summary.description,
        startTime: summary.startTime.toString(),
        endTime: summary.endTime.toString(),
        isActive: summary.isActive,
        candidateCount: summary.candidateCount.toString(),
        totalVotes: summary.totalVotes.toString(),
        resultsFinalized: summary.resultsFinalized,
        creator: summary.creator,
        candidates
      }
    });
  } catch (error) {
    console.error(`[ElectionCtrl] Error en getElection (ID: ${electionIdParam}, contract): ${error.message}`, error.stack);
    // Attempt to parse contract error if possible
    if (error.data && contract) {
        try {
            const reason = contract.interface.parseError(error.data).name;
            return next(new AppError(`Error de contrato al obtener elección ${electionIdParam}: ${reason}`, 500));
        } catch (parseError) { /* ignore */ }
    }
    next(new AppError(`Error al obtener elección ${electionIdParam} desde blockchain: ${error.message}`, 500));
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
            message: `Resultados de la elección ${numericElectionId.toString()} obtenidos desde la blockchain.`,
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

module.exports = {
  getElections,
  getElection,
  getElectionResults,
  // Functions below are commented out as they are either admin-specific (handled by electionAdminController)
  // or part of a more complex MongoDB-dependent system not in the current scope of direct contract integration.
  // createElection,
  // updateElection,
  // finalizeElection,
  // getElectionStatistics,
  // castVote,
  // getResults
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
      message: "Voto revelado exitosamente y será contado.",
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