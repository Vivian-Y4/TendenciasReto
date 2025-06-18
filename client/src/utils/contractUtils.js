import { ethers } from 'ethers';

// ABI simplificado del contrato VotingSystem
// Normalmente esto vendría de los artefactos compilados, pero los incluimos directamente
// para evitar problemas de importación fuera del directorio src
const VotingSystemArtifact = {
  abi: [
    // Eventos
    "event ElectionCreated(uint256 electionId, string title, uint256 startTime, uint256 endTime)",
    "event VoteCast(uint256 electionId, address voter, uint256 candidateId)",
    "event ElectionEnded(uint256 electionId, uint256 winningCandidateId)",
    
    // Funciones
    "function createElection(string memory _title, string memory _description, uint256 _startTime, uint256 _endTime) public returns (uint256)",
    "function addCandidate(uint256 _electionId, string memory _name, string memory _description) public",
    "function registerVoter(uint256 _electionId, address _voter) public",
    "function castVote(uint256 _electionId, uint256 _candidateId) public",
    "function endElection(uint256 _electionId) public",
    "function getElectionDetails(uint256 _electionId) public view returns (string memory, string memory, uint256, uint256, bool, uint256)",
    "function getCandidateCount(uint256 _electionId) public view returns (uint256)",
    "function getCandidate(uint256 _electionId, uint256 _candidateId) public view returns (string memory, string memory, uint256)",
    "function getVoterStatus(uint256 _electionId, address _voter) public view returns (bool, bool, uint256)"
  ]
};

export const getContractInstance = async (provider, signerOrProvider = null) => {
  try {
    // Contract address would normally be loaded from environment variables or a config file
    const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
    
    if (!contractAddress) {
      console.error('Contract address not found');
      return null;
    }
    
    // Use either the provided signer/provider or the default provider
    const contract = new ethers.Contract(
      contractAddress,
      VotingSystemArtifact.abi,
      signerOrProvider || provider
    );
    
    return contract;
  } catch (error) {
    console.error('Error creating contract instance:', error);
    return null;
  }
};

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
