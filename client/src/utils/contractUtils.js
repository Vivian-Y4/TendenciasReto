import { ethers } from 'ethers';
// Importa el ABI correcto desde el archivo JSON generado por Hardhat/Truffle
import VotingSystemTokenArtifact from '../abis/VotingSystem_WithToken.json';

// Dirección del contrato VotingSystem_WithToken desplegado
// Esta dirección debe coincidir con la del contrato que estás usando en tu red de desarrollo (Hardhat, Ganache, etc.)
const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;

/**
 * Obtiene una instancia del contrato VotingSystem_WithToken conectada a un signer
 * @param {ethers.Signer} signer - El signer para interactuar con el contrato
 * @returns {ethers.Contract | null}
 */
export const getContractInstance = async (signer) => {
  if (!signer) {
    console.error("Se requiere un signer para obtener la instancia del contrato");
    return null;
  }
  try {
    // Usa el ABI importado del artefacto JSON correcto
    const contract = new ethers.Contract(contractAddress, VotingSystemTokenArtifact.abi, signer);
    return contract;
  } catch (error) {
    console.error("Error al obtener la instancia del contrato:", error);
    return null;
  }
};

// Helper functions

export const formatTimestamp = (timestamp) => {
  if (timestamp === null || timestamp === undefined || timestamp === '') return 'N/A';

  // If timestamp is a string that is not numeric, attempt Date parsing directly
  if (typeof timestamp === 'string' && isNaN(timestamp)) {
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
  }

  // Convert to number
  const tsNum = Number(timestamp);
  if (isNaN(tsNum)) return 'N/A';

  // Detect if value is in seconds or milliseconds
  const millis = tsNum > 1e12 ? tsNum : tsNum * 1000;
  const date = new Date(millis);
  return isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
};

export const formatAddress = (address) => {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const toSeconds = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (!isNaN(value)) {
    const num = Number(value);
    return num > 1e12 ? Math.floor(num / 1000) : num; // ms -> s
  }
  const ms = Date.parse(value);
  return isNaN(ms) ? 0 : Math.floor(ms / 1000);
};

export const isElectionActive = (election) => {
  if (!election) return false;

  const now = Math.floor(Date.now() / 1000);
  const start = toSeconds(election.startTime ?? election.startDate);
  const end = toSeconds(election.endTime ?? election.endDate);

  if (!start || !end) return false;

  return now >= start && now <= end && !hasElectionEnded(election);
};

export const hasElectionEnded = (election) => {
  if (!election) return false;

  const now = Math.floor(Date.now() / 1000);
  const end = toSeconds(election.endTime ?? election.endDate);

  if (!end) return false;

  return now > end || election.resultsFinalized === true;
};

export const canViewResults = (election) => {
  if (!election) return false;
  
  return election.resultsFinalized || hasElectionEnded(election);
};
