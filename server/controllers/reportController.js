const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const json2csv = require('json2csv').Parser;
const ElectionMeta = require('../models/ElectionMeta');
const CandidateMeta = require('../models/CandidateMeta');
const VotingStatistics = require('../models/VotingStatistics');
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
 * @desc    Generar reporte detallado de una elecciu00f3n
 * @route   GET /api/reports/elections/:electionId
 * @access  Privado (Admin)
 */
const generateElectionReport = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;
    const format = req.query.format || 'json';
    
    const { provider, contractABI, contractAddress } = setupProvider();
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    // Obtener informaciu00f3n de la elecciu00f3n
    const election = await contract.getElectionSummary(electionId);
    
    // Obtener todos los candidatos y sus votos
    const candidates = [];
    for (let i = 0; i < election.candidateCount; i++) {
      try {
        const candidate = await contract.getCandidate(electionId, i);
        const voteCount = candidate[2].toString();
        
        // Obtener metadata adicional
        const candidateMeta = await CandidateMeta.findOne({ electionId, candidateId: i }).lean();
        
        candidates.push({
          id: i,
          name: candidate[0],
          description: candidate[1],
          voteCount: parseInt(voteCount),
          metadata: candidateMeta || {}
        });
      } catch (error) {
        console.error(`Error obteniendo datos del candidato ${i}:`, error);
      }
    }
    
    // Obtener metadata adicional de la elecciu00f3n
    const electionMeta = await ElectionMeta.findOne({ electionId }).lean();
    
    // Obtener estadu00edsticas de votaciu00f3n
    const votingStats = await VotingStatistics.findOne({ electionId }).lean();
    
    // Calcular estadu00edsticas adicionales
    const totalVotes = parseInt(election.totalVotes.toString());
    const candidatesWithPercentage = candidates.map(candidate => ({
      ...candidate,
      percentage: totalVotes > 0 ? (candidate.voteCount / totalVotes) * 100 : 0
    }));
    
    // Preparar datos del reporte
    const reportData = {
      electionId: parseInt(electionId),
      title: election.title,
      description: election.description,
      startTime: new Date(parseInt(election.startTime.toString()) * 1000).toISOString(),
      endTime: new Date(parseInt(election.endTime.toString()) * 1000).toISOString(),
      isActive: election.isActive,
      resultsFinalized: election.resultsFinalized,
      totalVotes,
      candidates: candidatesWithPercentage,
      metadata: electionMeta || {},
      statistics: votingStats || {}
    };
    
    // Generar reporte en el formato solicitado
    if (format === 'csv') {
      // Preparar datos para CSV
      const candidatesCsv = candidatesWithPercentage.map(c => ({
        'Candidato ID': c.id,
        'Nombre': c.name,
        'Descripciu00f3n': c.description,
        'Votos': c.voteCount,
        'Porcentaje (%)': c.percentage.toFixed(2)
      }));
      
      const csvParser = new json2csv();
      const csvData = csvParser.parse(candidatesCsv);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_eleccion_${electionId}.csv`);
      return res.send(csvData);
    } else {
      // Formato JSON (predeterminado)
      res.json({
        success: true,
        report: reportData
      });
    }
  } catch (error) {
    next(new AppError(`Error al generar reporte: ${error.message}`, 500));
  }
};

/**
 * @desc    Generar reporte de participaciu00f3n de votantes
 * @route   GET /api/reports/voters/:electionId
 * @access  Privado (Admin)
 */
const generateVoterParticipationReport = async (req, res, next) => {
  try {
    const electionId = req.params.electionId;
    const format = req.query.format || 'json';
    
    const { provider, contractABI, contractAddress } = setupProvider();
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    // Obtener informaciu00f3n de la elecciu00f3n
    const election = await contract.getElectionSummary(electionId);
    
    // Obtener estadu00edsticas de participaciu00f3n
    let registeredVoters = 0;
    try {
      registeredVoters = await contract.getRegisteredVoterCount(electionId);
      registeredVoters = parseInt(registeredVoters.toString());
    } catch (error) {
      console.error('Error al obtener conteo de votantes registrados:', error);
    }
    
    // Obtener conteo de votos totales
    const totalVotes = parseInt(election.totalVotes.toString());
    
    // Calcular tasa de participaciu00f3n
    const participationRate = registeredVoters > 0 ? (totalVotes / registeredVoters) * 100 : 0;
    const remainingVoters = registeredVoters - totalVotes;
    
    // Obtener estadu00edsticas adicionales
    const votingStats = await VotingStatistics.findOne({ electionId }).lean();
    
    // Preparar datos del reporte
    const reportData = {
      electionId: parseInt(electionId),
      title: election.title,
      startTime: new Date(parseInt(election.startTime.toString()) * 1000).toISOString(),
      endTime: new Date(parseInt(election.endTime.toString()) * 1000).toISOString(),
      isActive: election.isActive,
      registeredVoters,
      totalVotes,
      participationRate,
      remainingVoters,
      hourlyParticipation: votingStats?.hourlyParticipation || [],
      demographicData: votingStats?.demographicData || {}
    };
    
    // Generar reporte en el formato solicitado
    if (format === 'csv') {
      // Si hay datos por hora, preparamos un CSV con esa informaciu00f3n
      let csvData;
      
      if (votingStats?.hourlyParticipation?.length > 0) {
        const hourlyData = votingStats.hourlyParticipation.map(h => ({
          'Hora': new Date(h.timestamp).toISOString(),
          'Votos Acumulados': h.cumulativeVotes,
          'Nuevos Votos': h.newVotes,
          'Tasa de Participaciu00f3n (%)': (h.cumulativeVotes / registeredVoters * 100).toFixed(2)
        }));
        
        const csvParser = new json2csv();
        csvData = csvParser.parse(hourlyData);
      } else {
        // CSV simple con resumen
        const summary = [{
          'Elecciu00f3n ID': electionId,
          'Tu00edtulo': election.title,
          'Inicio': new Date(parseInt(election.startTime.toString()) * 1000).toISOString(),
          'Fin': new Date(parseInt(election.endTime.toString()) * 1000).toISOString(),
          'Votantes Registrados': registeredVoters,
          'Votos Totales': totalVotes,
          'Participaciu00f3n (%)': participationRate.toFixed(2),
          'Votantes Pendientes': remainingVoters
        }];
        
        const csvParser = new json2csv();
        csvData = csvParser.parse(summary);
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=participacion_votantes_${electionId}.csv`);
      return res.send(csvData);
    } else {
      // Formato JSON (predeterminado)
      res.json({
        success: true,
        report: reportData
      });
    }
  } catch (error) {
    next(new AppError(`Error al generar reporte de participaciu00f3n: ${error.message}`, 500));
  }
};

/**
 * @desc    Generar reporte de tendencias y anu00e1lisis
 * @route   GET /api/reports/trends
 * @access  Privado (Admin)
 */
const generateTrendsReport = async (req, res, next) => {
  try {
    const { provider, contractABI, contractAddress } = setupProvider();
    const contract = new ethers.Contract(contractAddress, contractABI, provider);
    
    // Obtener el conteo total de elecciones
    const electionCount = await contract.electionCount();
    
    // Recopilar estadu00edsticas de todas las elecciones
    const electionStats = [];
    for (let i = 0; i < electionCount; i++) {
      try {
        const election = await contract.getElectionSummary(i);
        const totalVotes = parseInt(election.totalVotes.toString());
        
        // Obtener conteo de votantes registrados si estu00e1 disponible
        let registeredVoters = 0;
        let participationRate = 0;
        
        try {
          registeredVoters = await contract.getRegisteredVoterCount(i);
          registeredVoters = parseInt(registeredVoters.toString());
          participationRate = registeredVoters > 0 ? (totalVotes / registeredVoters) * 100 : 0;
        } catch (error) {
          console.error(`Error al obtener votantes registrados para elecciu00f3n ${i}:`, error);
        }
        
        electionStats.push({
          electionId: i,
          title: election.title,
          startTime: parseInt(election.startTime.toString()) * 1000,
          endTime: parseInt(election.endTime.toString()) * 1000,
          isActive: election.isActive,
          candidateCount: parseInt(election.candidateCount.toString()),
          totalVotes,
          registeredVoters,
          participationRate
        });
      } catch (error) {
        console.error(`Error al obtener datos para elecciu00f3n ${i}:`, error);
      }
    }
    
    // Realizar anu00e1lisis de tendencias
    
    // 1. Participaciu00f3n promedio
    const activeElections = electionStats.filter(e => !e.isActive && e.registeredVoters > 0);
    const avgParticipation = activeElections.length > 0
      ? activeElections.reduce((sum, e) => sum + e.participationRate, 0) / activeElections.length
      : 0;
    
    // 2. Tendencia de participaciu00f3n a lo largo del tiempo
    const participationTrend = activeElections
      .sort((a, b) => a.startTime - b.startTime)
      .map(e => ({
        electionId: e.electionId,
        title: e.title,
        startDate: new Date(e.startTime).toISOString().split('T')[0],
        participationRate: e.participationRate
      }));
    
    // 3. Estadu00edsticas de tamau00f1o de elecciones
    const electionSizeStats = {
      averageCandidateCount: electionStats.length > 0
        ? electionStats.reduce((sum, e) => sum + e.candidateCount, 0) / electionStats.length
        : 0,
      largestElection: electionStats.length > 0
        ? electionStats.reduce((max, e) => e.candidateCount > max.candidateCount ? e : max, electionStats[0])
        : null,
      smallestElection: electionStats.length > 0
        ? electionStats.reduce((min, e) => e.candidateCount < min.candidateCount ? e : min, electionStats[0])
        : null
    };
    
    // 4. Estadu00edsticas de duraciu00f3n de elecciones
    const electionDurations = electionStats.map(e => ({
      electionId: e.electionId,
      title: e.title,
      durationHours: (e.endTime - e.startTime) / (1000 * 60 * 60)
    }));
    
    const avgDuration = electionDurations.length > 0
      ? electionDurations.reduce((sum, e) => sum + e.durationHours, 0) / electionDurations.length
      : 0;
    
    // Preparar el reporte
    const reportData = {
      totalElections: electionCount.toString(),
      activeElections: electionStats.filter(e => e.isActive).length,
      completedElections: electionStats.filter(e => !e.isActive).length,
      participationStats: {
        averageParticipationRate: avgParticipation,
        participationTrend
      },
      electionSizeStats,
      durationStats: {
        averageDurationHours: avgDuration,
        electionDurations
      }
    };
    
    // Generar reporte en el formato solicitado
    const format = req.query.format || 'json';
    
    if (format === 'csv') {
      // Simplificar datos para CSV
      const trendsData = participationTrend.map(p => ({
        'Elecciu00f3n ID': p.electionId,
        'Tu00edtulo': p.title,
        'Fecha de Inicio': p.startDate,
        'Tasa de Participaciu00f3n (%)': p.participationRate.toFixed(2)
      }));
      
      const csvParser = new json2csv();
      const csvData = csvParser.parse(trendsData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=tendencias_elecciones.csv`);
      return res.send(csvData);
    } else {
      // Formato JSON (predeterminado)
      res.json({
        success: true,
        report: reportData
      });
    }
  } catch (error) {
    next(new AppError(`Error al generar reporte de tendencias: ${error.message}`, 500));
  }
};

module.exports = {
  generateElectionReport,
  generateVoterParticipationReport,
  generateTrendsReport
};
