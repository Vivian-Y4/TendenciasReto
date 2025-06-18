const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { AppError } = require('../middlewares/errorHandler'); // Assuming AppError is in this path

// Mock JCE Data Interface
const mockJCEData = {
  "001-0000001-1": {
    name: "Juan Ejemplo Perez",
    dob: "1990-01-15",
    canVote: true,
    province: "Distrito Nacional",
  },
  "001-0000002-2": {
    name: "Maria Modelo Rodriguez",
    dob: "1985-05-20",
    canVote: true,
    province: "Santiago",
  },
  "001-0000003-3": {
    name: "Pedro Prueba Santana",
    dob: "2005-10-02", // Example of someone who might be too young or has other restrictions
    canVote: false,
    province: "Santo Domingo",
  },
};

/**
 * Simulates fetching voter data from JCE based on Cédula.
 * @param {string} cedula - The Cédula number to look up.
 * @returns {Promise<object|null>} - A promise that resolves with voter data or null if not found.
 */
const fetchVoterDataFromJCE = async (cedula) => {
  console.log(`[JCE Mock] Attempting to fetch data for Cédula: ${cedula}`);
  if (mockJCEData[cedula]) {
    console.log(`[JCE Mock] Data found for Cédula: ${cedula}`, mockJCEData[cedula]);
    return Promise.resolve(mockJCEData[cedula]);
  } else {
    console.log(`[JCE Mock] No data found for Cédula: ${cedula}`);
    return Promise.resolve(null);
  }
};

/**
 * Controller function to handle voter registration.
 * (Now interacts with the smart contract)
 */
const registerVotersBatch = async (req, res, next) => {
  // Destructure expected data from request body
  const { voterIdentifiers, electionId, cedulas } = req.body; // Expecting an array of identifiers and optional cedulas

  console.log(`[jceVoterRegistryController] Received request to register voters batch.`);
  console.log("[jceVoterRegistryController] Request body:", req.body);

  if (!voterIdentifiers || !Array.isArray(voterIdentifiers) || voterIdentifiers.length === 0 || !electionId) {
    return next(new AppError("Missing voterIdentifiers (array), or electionId", 400));
  }

  // Optional: Process cedulas if provided for pre-verification against JCE mock data
  if (cedulas && Array.isArray(cedulas) && cedulas.length === voterIdentifiers.length) {
    for (let i = 0; i < cedulas.length; i++) {
      const cedula = cedulas[i];
      const voterId = voterIdentifiers[i]; // Corresponding identifier
      if (cedula) { // If a cedula is provided for this identifier
        try {
          const jceData = await fetchVoterDataFromJCE(cedula);
          if (jceData) {
            console.log(`[jceVoterRegistryController] JCE Data for Cédula ${cedula} (maps to ${voterId}):`, jceData);
            if (!jceData.canVote) {
              console.warn(`[jceVoterRegistryController] Voter with Cédula ${cedula} (maps to ${voterId}) is not eligible per JCE mock data. This identifier might still be registered if pre-authorized.`);
              // Depending on policy, this could be an error or just a warning.
              // For now, we'll allow registration to proceed, assuming the voterIdentifier is the source of truth for the contract.
            }
          } else {
            console.log(`[jceVoterRegistryController] No JCE Data found for Cédula ${cedula} (maps to ${voterId}). Proceeding with provided voterIdentifier.`);
          }
        } catch (error) {
          console.error(`[jceVoterRegistryController] Error fetching JCE data for ${cedula}:`, error);
          // Decide if one error should halt the whole batch. For now, log and continue.
        }
      }
    }
  }

  // Validate voterIdentifiers format (should be bytes32 hex strings)
  for (const id of voterIdentifiers) {
    if (!ethers.utils.isHexString(id, 32)) {
      return next(new AppError(`Invalid voterIdentifier format: ${id}. Must be a 32-byte hex string.`, 400));
    }
  }

  const { provider, contractABI, contractAddress } = setupProvider();
  if (!process.env.ADMIN_SIGNER_PRIVATE_KEY) {
      return next(new AppError("Clave privada del administrador (JCE Operator) no configurada en el servidor.", 500));
  }
  const adminWallet = new ethers.Wallet(process.env.ADMIN_SIGNER_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(contractAddress, contractABI, adminWallet);

  console.log(`[jceVoterRegistryController] Calling smart contract 'VotingSystem.sol' -> batchRegisterVoters()`);
  console.log(`[jceVoterRegistryController] Election ID: ${electionId}`);
  console.log(`[jceVoterRegistryController] Voter Identifiers:`, voterIdentifiers);
  console.log(`[jceVoterRegistryController] Transaction will be sent from: ${adminWallet.address}`);

  try {
    const tx = await contract.batchRegisterVoters(electionId, voterIdentifiers);
    console.log(`[jceVoterRegistryController] Transaction sent. TX Hash: ${tx.hash}. Waiting for confirmation...`);

    const receipt = await tx.wait(); // Wait for 1 confirmation by default
    console.log(`[jceVoterRegistryController] Transaction confirmed. Block: ${receipt.blockNumber}, Gas used: ${receipt.gasUsed.toString()}`);

    const successfullyRegisteredCountOnChain = receipt.events?.filter(e => e.event === 'VoterRegistered').length || 0;
    console.log(`[jceVoterRegistryController] ${successfullyRegisteredCountOnChain} VoterRegistered events found in transaction receipt.`);

    // ---- Store voter identifiers in backend database ----
    // Assuming RegisteredVoter model is available
    const RegisteredVoter = require('../models/RegisteredVoter'); // Assuming model path
    let dbSuccessCount = 0;
    let dbErrorCount = 0;
    const registrationTimestamp = new Date();

    for (const identifier of voterIdentifiers) {
      try {
        // Use updateOne with upsert to avoid duplicates if this logic is ever re-run for the same set.
        // Or use create if strict "must not exist before" is desired (contract call would likely fail first).
        await RegisteredVoter.updateOne(
          { electionId: electionId.toString(), identifier: identifier },
          { $setOnInsert: { electionId: electionId.toString(), identifier: identifier, registeredAt: registrationTimestamp } },
          { upsert: true }
        );
        dbSuccessCount++;
      } catch (dbError) {
        console.error(`[jceVoterRegistryController] Error saving voterIdentifier ${identifier} for election ${electionId} to DB:`, dbError);
        dbErrorCount++;
        // Decide if one DB error should halt the response or just be logged.
        // For now, log and continue, then report aggregate status.
      }
    }
    console.log(`[jceVoterRegistryController] DB Storage: ${dbSuccessCount} identifiers stored/updated, ${dbErrorCount} failed.`);
    // ---- End of DB Storage ----

    let responseMessage = `Lote de votantes procesado. ${successfullyRegisteredCountOnChain} de ${voterIdentifiers.length} eventos 'VoterRegistered' encontrados en la blockchain.`;
    if (dbErrorCount > 0) {
      responseMessage += ` Error al guardar ${dbErrorCount} identificadores en la base de datos local.`;
    } else {
      responseMessage += ` Todos los ${dbSuccessCount} identificadores procesados fueron guardados en la base de datos local.`;
    }

    res.status(201).json({
      success: true,
      message: responseMessage,
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      data: {
        electionId,
        processedIdentifiers: voterIdentifiers,
        blockchainEvents: successfullyRegisteredCountOnChain,
        dbStoredCount: dbSuccessCount,
        dbErrorCount: dbErrorCount
      }
    });

  } catch (error) {
    console.error("[jceVoterRegistryController] Error calling smart contract (batchRegisterVoters):", error);
    // Attempt to decode revert reason if available
    let revertReason = error.message;
    if (error.data) {
        try {
            revertReason = contract.interface.parseError(error.data).name;
        } catch (e) {
            console.error("Could not parse revert reason from error.data:", e);
        }
    } else if (error.reason) {
        revertReason = error.reason;
    }
    return next(new AppError(`Error al registrar votantes en blockchain: ${revertReason}`, 500, error.transactionHash));
  }
};


const setupProvider = () => {
  try {
    const provider = new ethers.providers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL || 'http://localhost:8545');
    const contractAddress = process.env.CONTRACT_ADDRESS;

    if (!contractAddress) {
      console.error('CONTRACT_ADDRESS not found in environment variables.');
      throw new AppError('Dirección del contrato VotingSystem no configurada en el servidor.', 500);
    }

    const contractArtifactPath = path.join(__dirname, '..', '..', 'artifacts', 'contracts', 'VotingSystem.sol', 'VotingSystem.json');
    let contractABI;

    if (fs.existsSync(contractArtifactPath)) {
      const artifactFileContent = fs.readFileSync(contractArtifactPath, 'utf8');
      contractABI = JSON.parse(artifactFileContent).abi;
    } else {
      const abiUtilPath = path.join(__dirname, '..', 'utils', 'VotingSystemABI.json');
      if (fs.existsSync(abiUtilPath)) {
        console.warn(`Artifact not found at ${contractArtifactPath}, using ABI from ${abiUtilPath}. Ensure this is the correct ABI.`);
        const abiFileContent = fs.readFileSync(abiUtilPath, 'utf8');
        const parsedAbiJson = JSON.parse(abiFileContent);
        if (Array.isArray(parsedAbiJson)) {
            contractABI = parsedAbiJson;
        } else if (parsedAbiJson && parsedAbiJson.abi) {
            contractABI = parsedAbiJson.abi;
        } else {
            console.error(`ABI in ${abiUtilPath} is not in a recognized format.`);
            throw new AppError('ABI del contrato VotingSystem (utils) no tiene el formato esperado.', 500);
        }
      } else {
        console.error(`ABI file for VotingSystem not found at either ${contractArtifactPath} or ${abiUtilPath}`);
        throw new AppError('ABI del contrato VotingSystem no encontrado en el servidor.', 500);
      }
    }

    if (!contractABI || contractABI.length === 0) {
        console.error('VotingSystem ABI loaded is empty or invalid.');
        throw new AppError('ABI del VotingSystem es inválido o está vacío.', 500);
    }

    return { provider, contractABI, contractAddress };
  } catch (error) {
    console.error('Error fatal en setupProvider (jceVoterRegistryController):', error.message, error.stack);
    if (error instanceof AppError) throw error;
    throw new AppError(`Error crítico al configurar la conexión blockchain: ${error.message}`, 500);
  }
};


module.exports = {
  registerVotersBatch, // Updated function name
  fetchVoterDataFromJCE,
};
