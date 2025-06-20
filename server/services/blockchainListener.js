const { ethers } = require('ethers');
const Election = require('../models/Election');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Función para obtener el ABI del contrato
const getContractABI = () => {
  const contractArtifactPath = path.join(__dirname, '..', '..', 'artifacts', 'contracts', 'VotingSystem.sol', 'VotingSystem.json');
  if (fs.existsSync(contractArtifactPath)) {
    const artifactFileContent = fs.readFileSync(contractArtifactPath, 'utf8');
    return JSON.parse(artifactFileContent).abi;
  } else {
    // Fallback a un ABI guardado manualmente si el artefacto no existe
    const abiUtilPath = path.join(__dirname, '..', 'utils', 'VotingSystemABI.json');
    if(fs.existsSync(abiUtilPath)) {
        const abiFileContent = fs.readFileSync(abiUtilPath, 'utf8');
        const parsedAbiJson = JSON.parse(abiFileContent);
        return Array.isArray(parsedAbiJson) ? parsedAbiJson : parsedAbiJson.abi;
    }
  }
  throw new Error('No se pudo encontrar el ABI del contrato.');
};

const listenForElections = () => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const contractABI = getContractABI();

  if (!contractAddress || !contractABI) {
    console.error('La dirección del contrato o el ABI no están configurados. El listener de eventos no se iniciará.');
    return;
  }

  const contract = new ethers.Contract(contractAddress, contractABI, provider);

  console.log('Escuchando eventos de ElectionCreated...');

  contract.on('ElectionCreated', async (electionId, title, description, creator, startTime, endTime) => {
    console.log(`Evento ElectionCreated detectado para la elección ID: ${electionId}`);

    try {
      // Verificar si la elección ya existe en la base de datos
      const existingElection = await Election.findOne({ blockchainId: electionId.toString() });

      if (existingElection) {
        console.log(`La elección con ID ${electionId} ya existe en la base de datos. No se requiere acción.`);
        return;
      }

      // Crear una nueva instancia del modelo Election
      const newElection = new Election({
        blockchainId: electionId.toString(),
        title: title,
        description: description,
        creatorAddress: creator,
        startDate: new Date(startTime.toNumber() * 1000),
        endDate: new Date(endTime.toNumber() * 1000),
        status: 'active', // O determinar el estado basado en las fechas
        level: 'presidencial', // Asignar un nivel por defecto o extraerlo si está disponible
        contractAddress: contractAddress
      });

      await newElection.save();
      console.log(`Nueva elección con ID ${electionId} guardada en la base de datos.`);

    } catch (error) {
      console.error(`Error al procesar el evento ElectionCreated para la elección ID ${electionId}:`, error);
    }
  });
};

module.exports = { listenForElections };
