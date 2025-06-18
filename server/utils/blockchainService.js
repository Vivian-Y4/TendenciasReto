/**
 * Servicio para interactuar con la blockchain
 * Centraliza la lógica de conexión y llamadas a smart contracts
 */

const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const { AppError } = require('../middlewares/errorHandler');

class BlockchainService {
  constructor() {
    this.provider = null;
    this.contract = null;
    this.contractAddress = null;
    this.initialized = false;
    this.adminWallet = null;
  }

  /**
   * Inicializa la conexión a la blockchain y carga el contrato
   */
  async initialize() {
    if (this.initialized) return;

    // Conectar al proveedor Ethereum
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.ETHEREUM_RPC_URL || 'http://localhost:8545'
    );

    // Cargar ABI del contrato
    try {
      const contractABIPath = path.join(
        __dirname, 
        '../../artifacts/contracts/VotingSystem.sol/VotingSystem.json'
      );
      const contractJSON = JSON.parse(fs.readFileSync(contractABIPath));
      this.contractABI = contractJSON.abi;
    } catch (error) {
      throw new AppError(`Error cargando ABI del contrato: ${error.message}`, 500);
    }

    // Obtener dirección del contrato
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    if (!this.contractAddress) {
      throw new AppError('Dirección del contrato no configurada en variables de entorno', 500);
    }

    // Crear instancia del contrato
    this.contract = new ethers.Contract(
      this.contractAddress,
      this.contractABI,
      this.provider
    );

    // Si hay clave privada de admin configurada, inicializar wallet de admin
    if (process.env.ADMIN_PRIVATE_KEY) {
      this.adminWallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, this.provider);
      this.adminContract = this.contract.connect(this.adminWallet);
    }

    this.initialized = true;
    console.log('Servicio blockchain inicializado correctamente');
  }

  /**
   * Obtiene contrato listo para llamadas de lectura
   */
  async getContract() {
    if (!this.initialized) await this.initialize();
    return this.contract;
  }

  /**
   * Obtiene contrato conectado con wallet admin para llamadas de escritura
   */
  async getAdminContract() {
    if (!this.initialized) await this.initialize();
    
    if (!this.adminContract) {
      throw new AppError('No hay wallet de administrador configurada', 403);
    }
    
    return this.adminContract;
  }

  /**
   * Obtiene contrato conectado con una wallet específica para llamadas de escritura
   * @param {string} privateKey - Clave privada de la wallet
   */
  getSignedContract(privateKey) {
    if (!this.initialized) throw new Error('Servicio no inicializado');
    
    const wallet = new ethers.Wallet(privateKey, this.provider);
    return this.contract.connect(wallet);
  }

  /**
   * Cache para datos de blockchain para reducir llamadas repetidas
   */
  _cache = {
    elections: new Map(),
    candidates: new Map(),
    electionSummaries: new Map()
  };

  /**
   * Limpia la cache o una parte específica
   * @param {string} cacheType - Tipo de cache a limpiar (opcional)
   */
  clearCache(cacheType = null) {
    if (cacheType && this._cache[cacheType]) {
      this._cache[cacheType].clear();
    } else {
      Object.keys(this._cache).forEach(key => {
        this._cache[key].clear();
      });
    }
  }

  /**
   * Obtiene todas las elecciones con caché
   */
  async getAllElections() {
    if (!this.initialized) await this.initialize();
    
    try {
      // Obtener el conteo de elecciones
      const electionCount = await this.contract.electionCount();
      const count = electionCount.toNumber();
      
      const elections = [];
      for (let i = 0; i < count; i++) {
        const election = await this.getElectionSummary(i);
        elections.push(election);
      }
      
      return elections;
    } catch (error) {
      throw new AppError(`Error obteniendo elecciones: ${error.message}`, 500);
    }
  }

  /**
   * Obtiene resumen de una elección con caché
   * @param {number} electionId - ID de la elección
   */
  async getElectionSummary(electionId) {
    if (!this.initialized) await this.initialize();
    
    const cacheKey = `summary-${electionId}`;
    if (this._cache.electionSummaries.has(cacheKey)) {
      return this._cache.electionSummaries.get(cacheKey);
    }
    
    try {
      const electionData = await this.contract.getElectionSummary(electionId);
      
      const election = {
        id: electionData.id.toString(),
        title: electionData.title,
        description: electionData.description,
        startTime: electionData.startTime.toString(),
        endTime: electionData.endTime.toString(),
        isActive: electionData.isActive,
        candidateCount: electionData.candidateCount.toString(),
        totalVotes: electionData.totalVotes.toString(),
        resultsFinalized: electionData.resultsFinalized,
        createdBy: electionData.createdBy || ''
      };
      
      // Cache por 60 segundos
      this._cache.electionSummaries.set(cacheKey, election);
      setTimeout(() => {
        this._cache.electionSummaries.delete(cacheKey);
      }, 60000);
      
      return election;
    } catch (error) {
      throw new AppError(`Error obteniendo elección ${electionId}: ${error.message}`, 500);
    }
  }

  /**
   * Obtiene un candidato de una elección
   * @param {number} electionId - ID de la elección
   * @param {number} candidateId - ID del candidato
   */
  async getCandidate(electionId, candidateId) {
    if (!this.initialized) await this.initialize();
    
    const cacheKey = `${electionId}-${candidateId}`;
    if (this._cache.candidates.has(cacheKey)) {
      return this._cache.candidates.get(cacheKey);
    }
    
    try {
      const candidateData = await this.contract.getCandidate(electionId, candidateId);
      
      const candidate = {
        id: candidateId,
        name: candidateData[0],
        description: candidateData[1],
        voteCount: candidateData[2].toString()
      };
      
      // Cache por 60 segundos
      this._cache.candidates.set(cacheKey, candidate);
      setTimeout(() => {
        this._cache.candidates.delete(cacheKey);
      }, 60000);
      
      return candidate;
    } catch (error) {
      throw new AppError(`Error obteniendo candidato ${candidateId} de elección ${electionId}: ${error.message}`, 500);
    }
  }

  /**
   * Obtiene todos los candidatos de una elección
   * @param {number} electionId - ID de la elección
   */
  async getAllCandidates(electionId) {
    if (!this.initialized) await this.initialize();
    
    try {
      const election = await this.getElectionSummary(electionId);
      const candidateCount = parseInt(election.candidateCount);
      
      const candidates = [];
      for (let i = 0; i < candidateCount; i++) {
        const candidate = await this.getCandidate(electionId, i);
        candidates.push(candidate);
      }
      
      return candidates;
    } catch (error) {
      throw new AppError(`Error obteniendo candidatos de elección ${electionId}: ${error.message}`, 500);
    }
  }

  /**
   * Crea una nueva elección
   * @param {Object} electionData - Datos de la elección
   */
  async createElection(electionData) {
    if (!this.initialized) await this.initialize();
    
    const { title, description, startTime, endTime } = electionData;
    
    try {
      const contract = await this.getAdminContract();
      
      const tx = await contract.createElection(
        title,
        description,
        startTime,
        endTime
      );
      
      const receipt = await tx.wait();
      
      // Buscar evento de creación de elección para obtener ID
      const event = receipt.events.find(e => e.event === 'ElectionCreated');
      const electionId = event.args.electionId.toString();
      
      // Limpiar caché de elecciones
      this.clearCache('electionSummaries');
      
      return { electionId, transactionHash: receipt.transactionHash };
    } catch (error) {
      throw new AppError(`Error creando elección: ${error.message}`, 500);
    }
  }

  /**
   * Actualiza una elección existente
   * @param {number} electionId - ID de la elección
   * @param {Object} updateData - Datos a actualizar
   */
  async updateElection(electionId, updateData) {
    if (!this.initialized) await this.initialize();
    
    const { title, description } = updateData;
    
    try {
      const contract = await this.getAdminContract();
      
      const tx = await contract.updateElection(
        electionId,
        title,
        description
      );
      
      const receipt = await tx.wait();
      
      // Limpiar caché de esta elección
      this._cache.electionSummaries.delete(`summary-${electionId}`);
      
      return { success: true, transactionHash: receipt.transactionHash };
    } catch (error) {
      throw new AppError(`Error actualizando elección ${electionId}: ${error.message}`, 500);
    }
  }

  /**
   * Finaliza los resultados de una elección
   * @param {number} electionId - ID de la elección
   */
  async finalizeElection(electionId) {
    if (!this.initialized) await this.initialize();
    
    try {
      const contract = await this.getAdminContract();
      
      const tx = await contract.finalizeElectionResults(electionId);
      const receipt = await tx.wait();
      
      // Limpiar caché de esta elección
      this._cache.electionSummaries.delete(`summary-${electionId}`);
      
      return { success: true, transactionHash: receipt.transactionHash };
    } catch (error) {
      throw new AppError(`Error finalizando elección ${electionId}: ${error.message}`, 500);
    }
  }

  /**
   * Verifica si una dirección es administrador
   * @param {string} address - Dirección a verificar
   */
  async isAdmin(address) {
    if (!this.initialized) await this.initialize();
    
    try {
      return await this.contract.isAdmin(address);
    } catch (error) {
      console.error(`Error verificando si ${address} es admin:`, error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas de una elección
   * @param {number} electionId - ID de la elección
   */
  async getElectionStatistics(electionId) {
    if (!this.initialized) await this.initialize();
    
    try {
      const election = await this.getElectionSummary(electionId);
      const candidates = await this.getAllCandidates(electionId);
      
      const totalVotes = parseInt(election.totalVotes);
      
      // Calcular porcentajes
      const candidatesWithPercentage = candidates.map(candidate => ({
        ...candidate,
        percentage: totalVotes > 0 ? (parseInt(candidate.voteCount) / totalVotes) * 100 : 0
      }));
      
      // Obtener conteo de votantes registrados si está disponible
      let registeredVoters = 0;
      let participationRate = 0;
      
      try {
        const voterCount = await this.contract.getRegisteredVoterCount(electionId);
        registeredVoters = voterCount.toNumber();
        participationRate = registeredVoters > 0 ? (totalVotes / registeredVoters) * 100 : 0;
      } catch (error) {
        console.error('Error obteniendo conteo de votantes registrados:', error);
        // Continuar sin esta información
      }
      
      const statistics = {
        electionId,
        title: election.title,
        description: election.description,
        totalVotes,
        registeredVoters,
        participationRate,
        isActive: election.isActive,
        resultsFinalized: election.resultsFinalized,
        startTime: election.startTime,
        endTime: election.endTime,
        candidates: candidatesWithPercentage
      };
      
      return statistics;
    } catch (error) {
      throw new AppError(`Error obteniendo estadísticas de elección ${electionId}: ${error.message}`, 500);
    }
  }
}

// Exportar instancia única
const blockchainService = new BlockchainService();
module.exports = blockchainService;
