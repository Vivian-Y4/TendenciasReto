import React, { useState, useEffect } from 'react';
import { Card, Spinner, Table } from 'react-bootstrap';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import axios from 'axios';
import { toast } from 'react-toastify';

// Register Chart.js components
Chart.register(...registerables);

const SystemStats = () => {
  const [systemStats, setSystemStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSystemStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        const response = await axios.get('/api/admin/statistics/system', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setSystemStats(response.data.data);
        } else {
          toast.error('Error al cargar estadísticas del sistema');
        }
      } catch (error) {
        console.error('Error fetching system statistics:', error);
        toast.error('Error al cargar estadísticas del sistema: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchSystemStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Cargando estadísticas del sistema...</span>
        </Spinner>
      </div>
    );
  }

  if (!systemStats) {
    return (
      <div className="text-center py-4">
        <p className="text-muted">No hay estadísticas del sistema disponibles</p>
      </div>
    );
  }

  // Prepare chart data for admin activity
  const adminActivityData = {
    labels: systemStats.adminActivity ? systemStats.adminActivity.map(item => item._id) : [],
    datasets: [{
      label: 'Acciones por Tipo',
      data: systemStats.adminActivity ? systemStats.adminActivity.map(item => item.count) : [],
      backgroundColor: 'rgba(54, 162, 235, 0.5)',
      borderColor: 'rgb(54, 162, 235)',
      borderWidth: 1
    }]
  };

  // Prepare chart data for admin user activity
  const adminUserActivityData = {
    labels: systemStats.adminUserActivity ? systemStats.adminUserActivity.map(item => item._id) : [],
    datasets: [{
      label: 'Actividad por Administrador',
      data: systemStats.adminUserActivity ? systemStats.adminUserActivity.map(item => item.count) : [],
      backgroundColor: [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)'
      ],
      borderWidth: 1
    }]
  };

  // Prepare hourly activity data
  const hourlyActivityData = {
    labels: Array.from({length: 24}, (_, i) => `${i}:00`),
    datasets: [{
      label: 'Actividad por Hora',
      data: systemStats.hourlyActivity || new Array(24).fill(0),
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
      borderColor: 'rgb(75, 192, 192)',
      borderWidth: 1
    }]
  };

  return (
    <Card className="border-0 shadow-sm mb-4">
      <Card.Header className="bg-white border-0 pt-4 pb-0">
        <h5 className="mb-0">Estadísticas del Sistema</h5>
      </Card.Header>
      <Card.Body>
        <div className="stats-summary mb-4">
          <h6 className="text-muted mb-3">Métricas de Blockchain</h6>
          <div className="d-flex justify-content-between text-center">
            <div className="px-3">
              <h3>{systemStats.blockchain?.transactions.toLocaleString() || 0}</h3>
              <p className="text-muted">Transacciones</p>
            </div>
            <div className="px-3">
              <h3>{systemStats.blockchain?.uniqueBlocks.toLocaleString() || 0}</h3>
              <p className="text-muted">Bloques Únicos</p>
            </div>
            <div className="px-3">
              <h3>{systemStats.blockchain?.averageVotesPerBlock.toFixed(2) || '0.00'}</h3>
              <p className="text-muted">Votos/Bloque</p>
            </div>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-6 mb-4">
            <h6 className="text-muted mb-3">Actividad por Tipo de Acción</h6>
            <Bar data={adminActivityData} options={{ 
              maintainAspectRatio: false,
              indexAxis: 'y'
            }} height={300} />
          </div>
          <div className="col-md-6 mb-4">
            <h6 className="text-muted mb-3">Actividad por Administrador</h6>
            <Pie data={adminUserActivityData} options={{ maintainAspectRatio: false }} height={300} />
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-12">
            <h6 className="text-muted mb-3">Actividad por Hora del Día</h6>
            <Bar data={hourlyActivityData} options={{ maintainAspectRatio: false }} height={250} />
          </div>
        </div>

        {systemStats.adminActivity && systemStats.adminActivity.length > 0 && (
          <div className="row">
            <div className="col-md-12">
              <h6 className="text-muted mb-3">Acciones Administrativas Principales</h6>
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>Acción</th>
                    <th>Cantidad</th>
                    <th>Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {systemStats.adminActivity.map((action, index) => {
                    const total = systemStats.adminActivity.reduce((acc, curr) => acc + curr.count, 0);
                    const percentage = (action.count / total * 100).toFixed(2);
                    
                    return (
                      <tr key={index}>
                        <td>{action._id}</td>
                        <td>{action.count}</td>
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

export default SystemStats;
