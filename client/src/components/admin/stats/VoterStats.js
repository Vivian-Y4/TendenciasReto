import React, { useState, useEffect } from 'react';
import { Card, Spinner, Table } from 'react-bootstrap';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import axios from 'axios';
import { toast } from 'react-toastify';

// Register Chart.js components
Chart.register(...registerables);

const VoterStats = () => {
  const [voterStats, setVoterStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVoterStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        const response = await axios.get('/api/admin/statistics/voters', {
          headers: { 'x-auth-token': token }
        });
        
        if (response.data.success) {
          setVoterStats(response.data.data);
        } else {
          toast.error('Error al cargar estadísticas de votantes');
        }
      } catch (error) {
        console.error('Error fetching voter statistics:', error);
        toast.error('Error al cargar estadísticas de votantes: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchVoterStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Cargando estadísticas de votantes...</span>
        </Spinner>
      </div>
    );
  }

  if (!voterStats) {
    return (
      <div className="text-center py-4">
        <p className="text-muted">No hay estadísticas de votantes disponibles</p>
      </div>
    );
  }

  // Prepare chart data for status distribution
  const statusDistributionData = {
    labels: Object.keys(voterStats.statusDistribution || {}),
    datasets: [{
      label: 'Distribución por Estado',
      data: Object.values(voterStats.statusDistribution || {}),
      backgroundColor: [
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 99, 132, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
      ],
      borderWidth: 1
    }]
  };

  // Prepare chart data for district distribution
  const districtLabels = voterStats.districtDistribution ? 
    voterStats.districtDistribution.map(d => d._id).slice(0, 10) : [];
  const districtValues = voterStats.districtDistribution ? 
    voterStats.districtDistribution.map(d => d.count).slice(0, 10) : [];

  const districtDistributionData = {
    labels: districtLabels,
    datasets: [{
      label: 'Votantes por Distrito',
      data: districtValues,
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgb(54, 162, 235)',
      borderWidth: 1
    }]
  };

  // Prepare chart data for verification distribution
  const verificationDistributionData = {
    labels: ['Verificados', 'No Verificados'],
    datasets: [{
      label: 'Estado de Verificación',
      data: [
        voterStats.verificationDistribution?.verified || 0,
        voterStats.verificationDistribution?.notVerified || 0
      ],
      backgroundColor: [
        'rgba(75, 192, 192, 0.7)',
        'rgba(255, 99, 132, 0.7)'
      ],
      borderWidth: 1
    }]
  };

  // Prepare registration trend data
  const registrationTrendData = {
    labels: voterStats.registrationTrend ? voterStats.registrationTrend.map(item => item.date) : [],
    datasets: [{
      label: 'Registro de Votantes',
      data: voterStats.registrationTrend ? voterStats.registrationTrend.map(item => item.count) : [],
      fill: false,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1
    }]
  };

  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Header className="bg-white border-0 pt-4 pb-0">
        <h5 className="mb-0">Estadísticas de Votantes</h5>
      </Card.Header>
      <Card.Body>
        <div className="row mb-4">
          <div className="col-md-6 mb-4">
            <h6 className="text-muted mb-3">Distribución por Estado</h6>
            <Pie data={statusDistributionData} options={{ maintainAspectRatio: false }} height={250} />
          </div>
          <div className="col-md-6 mb-4">
            <h6 className="text-muted mb-3">Estado de Verificación</h6>
            <Pie data={verificationDistributionData} options={{ maintainAspectRatio: false }} height={250} />
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-12">
            <h6 className="text-muted mb-3">Registro de Votantes (Tendencia)</h6>
            <Bar data={registrationTrendData} options={{ maintainAspectRatio: false }} height={250} />
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-12">
            <h6 className="text-muted mb-3">Distribución por Distrito (Top 10)</h6>
            <Bar data={districtDistributionData} options={{ maintainAspectRatio: false }} height={250} />
          </div>
        </div>

        {voterStats.activeVoters && voterStats.activeVoters.length > 0 && (
          <div className="row mb-4">
            <div className="col-md-12">
              <h6 className="text-muted mb-3">Votantes Más Activos</h6>
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nombre</th>
                    <th>Distrito</th>
                    <th>Elecciones Votadas</th>
                  </tr>
                </thead>
                <tbody>
                  {voterStats.activeVoters.map((voter, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{voter.firstName} {voter.lastName}</td>
                      <td>{voter.district || 'N/A'}</td>
                      <td>{voter.votingCount}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </div>
        )}

        {voterStats.verificationMethodDistribution && voterStats.verificationMethodDistribution.length > 0 && (
          <div className="row">
            <div className="col-md-12">
              <h6 className="text-muted mb-3">Métodos de Verificación</h6>
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>Método</th>
                    <th>Cantidad</th>
                    <th>Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {voterStats.verificationMethodDistribution.map((method, index) => {
                    const total = voterStats.verificationMethodDistribution.reduce((acc, curr) => acc + curr.count, 0);
                    const percentage = (method.count / total * 100).toFixed(2);
                    
                    return (
                      <tr key={index}>
                        <td>{method._id || 'Sin método'}</td>
                        <td>{method.count}</td>
                        <td>{percentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default VoterStats;
