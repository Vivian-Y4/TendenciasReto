import React, { useState, useEffect } from 'react';
import { Card, Spinner, Form, Button } from 'react-bootstrap';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import axios from 'axios';
import { toast } from 'react-toastify';

// Register Chart.js components
Chart.register(...registerables);

const ElectionStats = ({ electionId }) => {
  const [electionStats, setElectionStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedElection, setSelectedElection] = useState(electionId || '');
  const [elections, setElections] = useState([]);

  // Fetch elections list for dropdown
  useEffect(() => {
    const fetchElections = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const response = await axios.get('/api/admin/elections', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          const list = response.data.elections || response.data.data || [];
          setElections(list);
          if (!selectedElection && list.length > 0) {
            setSelectedElection(list[0]._id);
          }
        }
      } catch (error) {
        console.error('Error fetching elections:', error);
      }
    };

    fetchElections();
  }, [selectedElection]);

  // Fetch statistics for selected election
  useEffect(() => {
    const fetchElectionStats = async () => {
      if (!selectedElection) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        const response = await axios.get(`/api/admin/statistics/elections/${selectedElection}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setElectionStats(response.data.data);
        } else {
          toast.error('Error al cargar estadísticas de la elección');
        }
      } catch (error) {
        console.error('Error fetching election statistics:', error);
        toast.error('Error al cargar estadísticas de la elección: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchElectionStats();
  }, [selectedElection]);

  const handleGenerateStats = async () => {
    if (!selectedElection) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      await axios.post(`/api/admin/statistics/elections/${selectedElection}/generate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Estadísticas generadas correctamente');
      
      // Reload stats
      const response = await axios.get(`/api/admin/statistics/elections/${selectedElection}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setElectionStats(response.data.data);
      }
    } catch (error) {
      console.error('Error generating election statistics:', error);
      toast.error('Error al generar estadísticas: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Cargando estadísticas...</span>
        </Spinner>
      </div>
    );
  }

  // Prepare chart data
  const prepareVoteDistributionData = () => {
    if (!electionStats || !electionStats.candidateVotes) return null;
    
    const candidates = electionStats.candidateVotes;
    return {
      labels: candidates.map(c => c.name),
      datasets: [{
        label: 'Votos por Candidato',
        data: candidates.map(c => c.voteCount),
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(153, 102, 255, 0.7)',
          'rgba(255, 159, 64, 0.7)',
          'rgba(199, 199, 199, 0.7)',
          'rgba(83, 102, 255, 0.7)',
          'rgba(40, 159, 64, 0.7)',
          'rgba(210, 99, 132, 0.7)'
        ],
        borderWidth: 1
      }]
    };
  };

  const prepareVotingTimelineData = () => {
    if (!electionStats || !electionStats.votingTimeline) return null;
    
    const timeline = electionStats.votingTimeline;
    return {
      labels: timeline.map(item => item.date),
      datasets: [{
        label: 'Votos por Día',
        data: timeline.map(item => item.count),
        fill: false,
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }]
    };
  };

  const prepareHourlyDistributionData = () => {
    if (!electionStats || !electionStats.hourlyDistribution) return null;
    
    const hourLabels = Array.from({length: 24}, (_, i) => `${i}:00`);
    const hourlyData = hourLabels.map(hour => {
      const hourNumber = parseInt(hour);
      return electionStats.hourlyDistribution[hourNumber] || 0;
    });
    
    return {
      labels: hourLabels,
      datasets: [{
        label: 'Votos por Hora',
        data: hourlyData,
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgb(54, 162, 235)',
        borderWidth: 1
      }]
    };
  };

  const deviceDistributionData = {
    labels: ['Móvil', 'Escritorio', 'Tablet', 'Otros'],
    datasets: [{
      label: 'Distribución por Dispositivo',
      data: electionStats?.deviceStats ? 
        [
          electionStats.deviceStats.mobile || 0,
          electionStats.deviceStats.desktop || 0,
          electionStats.deviceStats.tablet || 0,
          electionStats.deviceStats.other || 0
        ] : [0, 0, 0, 0],
      backgroundColor: [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)'
      ],
      borderWidth: 1
    }]
  };

  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Header className="bg-white border-0 pt-4 pb-3">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Estadísticas de Elección</h5>
          <div className="d-flex align-items-center">
            <Form.Select 
              className="me-2"
              value={selectedElection}
              onChange={(e) => setSelectedElection(e.target.value)}
              style={{ maxWidth: '250px' }}
            >
              <option value="">Seleccionar elección</option>
              {elections.map(election => (
                <option key={election._id} value={election._id}>{election.title}</option>
              ))}
            </Form.Select>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={handleGenerateStats}
              disabled={!selectedElection}
            >
              Generar Estadísticas
            </Button>
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        {!electionStats ? (
          <div className="text-center py-4">
            <p className="text-muted">Selecciona una elección para ver sus estadísticas</p>
          </div>
        ) : (
          <>
            <div className="stats-summary mb-4">
              <div className="d-flex justify-content-between text-center">
                <div className="px-3">
                  <h3>{electionStats.totalVotesCast}</h3>
                  <p className="text-muted">Votos Totales</p>
                </div>
                <div className="px-3">
                  <h3>{electionStats.participationRate?.toFixed(2) || '0.00'}%</h3>
                  <p className="text-muted">Participación</p>
                </div>
                <div className="px-3">
                  <h3>{electionStats.abstentions || 0}</h3>
                  <p className="text-muted">Abstenciones</p>
                </div>
                <div className="px-3">
                  <h3>{electionStats.peakHour !== undefined ? `${electionStats.peakHour}:00` : 'N/A'}</h3>
                  <p className="text-muted">Hora Pico</p>
                </div>
              </div>
            </div>

            <div className="row mb-4">
              <div className="col-md-6 mb-4">
                <h6 className="text-muted mb-3">Distribución de Votos por Candidato</h6>
                {prepareVoteDistributionData() ? (
                  <Doughnut data={prepareVoteDistributionData()} options={{ maintainAspectRatio: false }} height={250} />
                ) : (
                  <p className="text-muted">No hay datos disponibles</p>
                )}
              </div>
              <div className="col-md-6 mb-4">
                <h6 className="text-muted mb-3">Distribución por Dispositivo</h6>
                <Doughnut data={deviceDistributionData} options={{ maintainAspectRatio: false }} height={250} />
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-4">
                <h6 className="text-muted mb-3">Línea de Tiempo de Votación</h6>
                {prepareVotingTimelineData() ? (
                  <Line data={prepareVotingTimelineData()} options={{ maintainAspectRatio: false }} height={250} />
                ) : (
                  <p className="text-muted">No hay datos disponibles</p>
                )}
              </div>
              <div className="col-md-6 mb-4">
                <h6 className="text-muted mb-3">Distribución por Hora del Día</h6>
                {prepareHourlyDistributionData() ? (
                  <Bar data={prepareHourlyDistributionData()} options={{ maintainAspectRatio: false }} height={250} />
                ) : (
                  <p className="text-muted">No hay datos disponibles</p>
                )}
              </div>
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default ElectionStats;
