import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'react-toastify';

const StatsOverview = () => {
  const { t } = useTranslation();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        const response = await axios.get('/api/admin/statistics/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setDashboardStats(response.data.data);
        } else {
          toast.error('Error al cargar estadísticas del dashboard');
        }
      } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
        toast.error('Error al cargar estadísticas del dashboard: ' + (error.response?.data?.message || error.message));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Cargando estadísticas...</span>
        </Spinner>
      </div>
    );
  }

  if (!dashboardStats) {
    return (
      <div className="text-center py-4">
        <p className="text-muted">No hay estadísticas disponibles</p>
      </div>
    );
  }

  const { 
    totalElections, 
    activeElections, 
    completedElections, 
    upcomingElections,
    participationMetrics,
    recentActivity
  } = dashboardStats;

  return (
    <>
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex flex-column align-items-center">
              <div className="icon-wrapper bg-primary bg-opacity-10 rounded-circle mb-3">
                <i className="fas fa-vote-yea text-primary fs-4 p-3"></i>
              </div>
              <h2 className="mb-1">{totalElections || 0}</h2>
              <p className="text-muted mb-0">Elecciones Totales</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex flex-column align-items-center">
              <div className="icon-wrapper bg-success bg-opacity-10 rounded-circle mb-3">
                <i className="fas fa-calendar-check text-success fs-4 p-3"></i>
              </div>
              <h2 className="mb-1">{activeElections || 0}</h2>
              <p className="text-muted mb-0">Elecciones Activas</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex flex-column align-items-center">
              <div className="icon-wrapper bg-info bg-opacity-10 rounded-circle mb-3">
                <i className="fas fa-calendar-alt text-info fs-4 p-3"></i>
              </div>
              <h2 className="mb-1">{upcomingElections || 0}</h2>
              <p className="text-muted mb-0">Próximas Elecciones</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="d-flex flex-column align-items-center">
              <div className="icon-wrapper bg-secondary bg-opacity-10 rounded-circle mb-3">
                <i className="fas fa-check-double text-secondary fs-4 p-3"></i>
              </div>
              <h2 className="mb-1">{completedElections || 0}</h2>
              <p className="text-muted mb-0">Elecciones Completadas</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 pt-4 pb-0">
              <h5 className="mb-0">Métricas de Participación</h5>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between mb-3">
                <div>
                  <h3 className="mb-0">{participationMetrics?.averageParticipation?.toFixed(2) || '0.00'}%</h3>
                  <p className="text-muted mb-0">Participación Promedio</p>
                </div>
                <div>
                  <h3 className="mb-0">{participationMetrics?.totalVoters?.toLocaleString() || 0}</h3>
                  <p className="text-muted mb-0">Votantes Registrados</p>
                </div>
                <div>
                  <h3 className="mb-0">{participationMetrics?.totalVotesCast?.toLocaleString() || 0}</h3>
                  <p className="text-muted mb-0">Votos Emitidos</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 pt-4 pb-0">
              <h5 className="mb-0">Actividad Reciente</h5>
            </Card.Header>
            <Card.Body>
              <div className="activity-stream">
                {recentActivity && recentActivity.length > 0 ? (
                  recentActivity.slice(0, 3).map((activity, index) => (
                    <div key={index} className={`activity-item d-flex align-items-start ${index > 0 ? 'mt-3' : ''}`}>
                      <div className="activity-icon me-3">
                        <i className={`fas fa-${activity.icon || 'check-circle'} text-${activity.iconColor || 'primary'}`}></i>
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between">
                          <strong>{activity.title}</strong>
                          <small className="text-muted">{activity.timeAgo}</small>
                        </div>
                        <p className="mb-0">{activity.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted mb-0">No hay actividad reciente</p>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default StatsOverview;
