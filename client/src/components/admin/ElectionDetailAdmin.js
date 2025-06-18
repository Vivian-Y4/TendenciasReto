import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Container, Card, Row, Col, Button, Badge, Alert, Spinner, Tabs, Tab, Table, Modal } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { toast } from 'react-toastify';
import axios from 'axios';
import AdminContext from '../../context/AdminContext';
import { formatTimestamp, isElectionActive, hasElectionEnded } from '../../utils/contractUtils';

// Este es un componente parcial que luego se combinará con otras partes

const ElectionDetailAdmin = () => {
  
  const { electionId } = useParams();
  const navigate = useNavigate();
  const { isAdminAuthenticated, adminPermissions } = useContext(AdminContext);

  // Estados
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Modales
  const [showEndElectionModal, setShowEndElectionModal] = useState(false);
  const [showFinalizeResultsModal, setShowFinalizeResultsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Cargar datos de la elección
  const fetchElectionData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`/api/admin/elections/${electionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setElection(response.data.data);
      } else {
        throw new Error(response.data.message || 'Error al cargar datos de la elección');
      }
    } catch (error) {
      console.error('Error fetching election data:', error);
      setError(error.message || 'Error al cargar datos de la elección');
      toast.error(error.message || 'Error al cargar datos de la elección');
    } finally {
      setLoading(false);
    }
  }, [electionId]);

  // Verificar autenticación y permisos, y cargar datos
  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate('/admin/login');
      return;
    }
    
    if (!adminPermissions.canViewElection) {
      toast.error('No tienes permisos para ver detalles de elecciones');
      navigate('/admin');
      return;
    }
    
    fetchElectionData();
  }, [isAdminAuthenticated, adminPermissions, navigate, fetchElectionData]);

  // Funciones para manejar acciones de la elección
  const handleEndElection = async () => {
    try {
      setActionLoading(true);
      
      const token = localStorage.getItem('adminToken');
      const response = await axios.put(
        `/api/admin/elections/${electionId}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('Elección finalizada correctamente');
        setShowEndElectionModal(false);
        
        // Actualizar datos de la elección
        await fetchElectionData();
      } else {
        throw new Error(response.data.message || 'Error al finalizar la elección');
      }
    } catch (error) {
      console.error('Error ending election:', error);
      toast.error(error.message || 'Error al finalizar la elección');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeResults = async () => {
    try {
      setActionLoading(true);
      
      const token = localStorage.getItem('adminToken');
      const response = await axios.put(
        `/api/admin/elections/${electionId}/finalize`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        toast.success('Resultados finalizados correctamente');
        setShowFinalizeResultsModal(false);
        
        // Actualizar datos de la elección
        await fetchElectionData();
      } else {
        throw new Error(response.data.message || 'Error al finalizar los resultados');
      }
    } catch (error) {
      console.error('Error finalizing results:', error);
      toast.error(error.message || 'Error al finalizar los resultados');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteElection = async () => {
    try {
      setActionLoading(true);
      
      const token = localStorage.getItem('adminToken');
      const response = await axios.delete(`/api/admin/elections/${electionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        toast.success('Elección eliminada correctamente');
        setShowDeleteModal(false);
        navigate('/admin');
      } else {
        throw new Error(response.data.message || 'Error al eliminar la elección');
      }
    } catch (error) {
      console.error('Error deleting election:', error);
      toast.error(error.message || 'Error al eliminar la elección');
    } finally {
      setActionLoading(false);
    }
  };

  // Componente de carga
  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center py-5">
          <Spinner animation="border" role="status" variant="primary">
            <span className="visually-hidden">Cargando...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  // Mensaje de error
  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <Button
            variant="outline-danger"
            onClick={() => navigate('/admin')}
          >
            Volver al Dashboard
          </Button>
        </Alert>
      </Container>
    );
  }

  // Si no se encontró la elección
  if (!election) {
    return (
      <Container className="py-4">
        <Alert variant="warning">
          <Alert.Heading>Elección no encontrada</Alert.Heading>
          <p>La elección solicitada no existe o ha sido eliminada.</p>
          <Button
            variant="outline-primary"
            onClick={() => navigate('/admin')}
          >
            Volver al Dashboard
          </Button>
        </Alert>
      </Container>
    );
  }

  // Estado de la elección
  const getStatusBadge = () => {
    if (election.resultsFinalized) return <Badge bg="success">Finalizada</Badge>;
    if (hasElectionEnded(election)) return <Badge bg="warning">Terminada</Badge>;
    if (isElectionActive(election)) return <Badge bg="primary">Activa</Badge>;
    return <Badge bg="secondary">Pendiente</Badge>;
  };

  return (
    <Container fluid className="py-4">
      {/* Encabezado */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1">{election.title}</h2>
          <div className="d-flex align-items-center">
            <span className="me-3">{getStatusBadge()}</span>
            <span className="text-muted">ID: {election._id}</span>
          </div>
        </div>
        <div className="d-flex gap-2">
          {!hasElectionEnded(election) && adminPermissions.canEndElection && (
            <Button
              variant="warning"
              onClick={() => setShowEndElectionModal(true)}
            >
              <i className="fas fa-stop-circle me-2"></i>
              Finalizar Elección
            </Button>
          )}
          
          {hasElectionEnded(election) && !election.resultsFinalized && adminPermissions.canFinalizeResults && (
            <Button
              variant="success"
              onClick={() => setShowFinalizeResultsModal(true)}
            >
              <i className="fas fa-check-double me-2"></i>
              Finalizar Resultados
            </Button>
          )}
          
          <Button
            variant="outline-danger"
            onClick={() => setShowDeleteModal(true)}
            disabled={isElectionActive(election) || election.resultsFinalized}
          >
            <i className="fas fa-trash-alt me-2"></i>
            Eliminar
          </Button>
          
          <Button
            variant="outline-secondary"
            onClick={() => navigate('/admin')}
          >
            <i className="fas fa-arrow-left me-2"></i>
            Volver
          </Button>
        </div>
      </div>

      {/* Continuación del componente ElectionDetailAdmin */}
      {/* Este fragmento se integrará con la parte 1 y otras partes */}

      {/* Dentro del componente ElectionDetailAdmin, después del encabezado agregaríamos: */}

  {/* Contenido principal - Pestañas */}
  <Tabs
  activeKey={activeTab}
  onSelect={(key) => setActiveTab(key)}
  className="mb-4"
>
  {/* Pestaña de Detalles */}
  <Tab eventKey="details" title="Detalles">
    <Row className="g-4">
      <Col lg={8}>
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-white">
            <div className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Información General</h5>
              {adminPermissions.canEditElection && !hasElectionEnded(election) && (
                <Button
                  as={Link}
                  to={`/admin/elections/${electionId}/edit`}
                  variant="outline-primary"
                  size="sm"
                >
                  <i className="fas fa-edit me-2"></i>
                  Editar
                </Button>
              )}
            </div>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6} className="mb-3">
                <p className="mb-1 text-muted">Título</p>
                <h6>{election.title}</h6>
              </Col>
              <Col md={6} className="mb-3">
                <p className="mb-1 text-muted">Estado</p>
                <h6>{getStatusBadge()}</h6>
              </Col>
              <Col md={6} className="mb-3">
                <p className="mb-1 text-muted">Fecha de Inicio</p>
                <h6>{formatTimestamp(election.startTime)}</h6>
              </Col>
              <Col md={6} className="mb-3">
                <p className="mb-1 text-muted">Fecha de Finalización</p>
                <h6>{formatTimestamp(election.endTime)}</h6>
              </Col>
              <Col md={12} className="mb-3">
                <p className="mb-1 text-muted">Descripción</p>
                <p>{election.description}</p>
              </Col>
              <Col md={6} className="mb-3">
                <p className="mb-1 text-muted">Candidatos</p>
                <h6>{election.candidates?.length || 0}</h6>
              </Col>
              <Col md={6} className="mb-3">
                <p className="mb-1 text-muted">Votos Emitidos</p>
                <h6>{election.totalVotes || 0}</h6>
              </Col>
              <Col md={6} className="mb-3">
                <p className="mb-1 text-muted">Creado por</p>
                <h6>{election.createdBy?.username || 'Admin'}</h6>
              </Col>
              <Col md={6} className="mb-3">
                <p className="mb-1 text-muted">Fecha de Creación</p>
                <h6>{new Date(election.createdAt).toLocaleString()}</h6>
              </Col>
              {election.resultsFinalized && (
                <Col md={12}>
                  <p className="mb-1 text-muted">Resultados Finalizados</p>
                  <h6>{new Date(election.resultsPublishedAt).toLocaleString()}</h6>
                </Col>
              )}
            </Row>
          </Card.Body>
        </Card>
        
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-white">
            <h5 className="mb-0">Candidatos</h5>
          </Card.Header>
          <Card.Body>
            {election.candidates && election.candidates.length > 0 ? (
              <Table responsive hover>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th className="text-end">Votos</th>
                    <th className="text-end">Porcentaje</th>
                  </tr>
                </thead>
                <tbody>
                  {election.candidates.map((candidate, index) => {
                    const votePercentage = election.totalVotes > 0
                      ? ((candidate.voteCount || 0) / election.totalVotes * 100).toFixed(2)
                      : '0.00';
                      
                    return (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{candidate.name}</td>
                        <td className="text-truncate" style={{ maxWidth: '250px' }}>
                          {candidate.description}
                        </td>
                        <td className="text-end">{candidate.voteCount || 0}</td>
                        <td className="text-end">{votePercentage}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            ) : (
              <p className="text-center mb-0 py-3">No hay candidatos registrados</p>
            )}
          </Card.Body>
        </Card>
      </Col>
      
      <Col lg={4}>
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-white">
            <h5 className="mb-0">Estado y Estadísticas</h5>
          </Card.Header>
          <Card.Body>
            <div className="d-flex justify-content-between mb-3">
              <div className="text-center px-3">
                <h3 className="mb-1">{election.totalVotes || 0}</h3>
                <p className="text-muted mb-0">Votos Emitidos</p>
              </div>
              <div className="text-center px-3">
                <h3 className="mb-1">{election.blockchain?.totalVotes || 0}</h3>
                <p className="text-muted mb-0">Votos en Blockchain</p>
              </div>
              <div className="text-center px-3">
                <h3 className="mb-1">{election.allowedVoters?.length || '∞'}</h3>
                <p className="text-muted mb-0">Votantes Elegibles</p>
              </div>
            </div>
            
            <hr />
            
            <div className="mb-3">
              <p className="mb-1 text-muted">Tasa de Participación</p>
              <div className="d-flex justify-content-between align-items-center">
                <div className="progress w-75" style={{ height: '10px' }}>
                  <div 
                    className="progress-bar bg-primary" 
                    role="progressbar" 
                    style={{ 
                      width: `${election.allowedVoters?.length > 0 
                        ? (election.totalVotes / election.allowedVoters.length * 100) 
                        : 0}%` 
                    }}
                    aria-valuenow={election.allowedVoters?.length > 0 
                      ? (election.totalVotes / election.allowedVoters.length * 100) 
                      : 0}
                    aria-valuemin="0" 
                    aria-valuemax="100"
                  ></div>
                </div>
                <span className="fw-bold">
                  {election.allowedVoters?.length > 0 
                    ? ((election.totalVotes / election.allowedVoters.length * 100) || 0).toFixed(2) 
                    : '0.00'}%
                </span>
              </div>
            </div>
            
            <div className="mb-3">
              <p className="mb-1 text-muted">Tiempo Restante</p>
              {isElectionActive(election) ? (
                <p className="mb-0">
                  <span className="fw-bold">
                    {Math.floor((election.endTime * 1000 - Date.now()) / (1000 * 60 * 60 * 24))} días,{' '}
                    {Math.floor((election.endTime * 1000 - Date.now()) % (1000 * 60 * 60 * 24) / (1000 * 60 * 60))} horas
                  </span>
                </p>
              ) : (
                <p className="mb-0 fw-bold">
                  {hasElectionEnded(election) ? 'Elección finalizada' : 'Elección no iniciada'}
                </p>
              )}
            </div>
            
            <hr />
            
            <div className="d-grid gap-2">
              {election.resultsFinalized ? (
                <Button
                  as={Link}
                  to={`/elections/${electionId}/results`}
                  variant="primary"
                >
                  <i className="fas fa-chart-pie me-2"></i>
                  Ver Resultados Públicos
                </Button>
              ) : (
                <Button
                  as={Link}
                  to={`/admin/elections/${electionId}/results`}
                  variant="outline-primary"
                >
                  <i className="fas fa-chart-bar me-2"></i>
                  Ver Resultados Preliminares
                </Button>
              )}
              
              <Button
                as={Link}
                to={`/admin/statistics/elections/${electionId}`}
                variant="outline-secondary"
              >
                <i className="fas fa-analytics me-2"></i>
                Ver Estadísticas Detalladas
              </Button>
            </div>
          </Card.Body>
        </Card>
        
        <Card className="shadow-sm mb-4">
          <Card.Header className="bg-white">
            <h5 className="mb-0">Blockchain</h5>
          </Card.Header>
          <Card.Body>
            {election.blockchain?.contractAddress ? (
              <>
                <div className="mb-3">
                  <p className="mb-1 text-muted">Dirección del Contrato</p>
                  <p className="mb-0 text-break fw-bold">
                    <small>{election.blockchain.contractAddress}</small>
                  </p>
                </div>
                
                <div className="mb-3">
                  <p className="mb-1 text-muted">Red</p>
                  <p className="mb-0 fw-bold">{election.blockchain.networkInfo?.name || 'Ethereum Testnet'}</p>
                </div>
                
                <div className="mb-3">
                  <p className="mb-1 text-muted">Fecha de Despliegue</p>
                  <p className="mb-0 fw-bold">
                    {election.blockchain.deploymentTimestamp 
                      ? new Date(election.blockchain.deploymentTimestamp).toLocaleString() 
                      : 'N/A'}
                  </p>
                </div>
                
                <div className="d-grid gap-2">
                  <Button
                    as={Link}
                    to={`/admin/elections/${electionId}/blockchain`}
                    variant="primary"
                  >
                    <i className="fas fa-cube me-2"></i>
                    Gestionar Blockchain
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-3 text-center">
                  Esta elección aún no ha sido desplegada en la blockchain.
                </p>
                
                <div className="d-grid">
                  <Button
                    as={Link}
                    to={`/admin/elections/${electionId}/blockchain`}
                    variant="primary"
                  >
                    <i className="fas fa-rocket me-2"></i>
                    Desplegar en Blockchain
                  </Button>
                </div>
              </>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  </Tab>
  
  {/* Pestaña de Configuración */}
  <Tab eventKey="configuration" title="Configuración">
    <Card className="shadow-sm mb-4">
      <Card.Header className="bg-white">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Configuración de la Elección</h5>
          <Button
            as={Link}
            to={`/admin/elections/${electionId}/configure`}
            variant="primary"
            size="sm"
            disabled={election.resultsFinalized}
          >
            <i className="fas fa-cog me-2"></i>
            Editar Configuración
          </Button>
        </div>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={4} className="mb-3">
            <p className="mb-1 text-muted">Visibilidad</p>
            <h6>
              {election.settings?.isPublic !== false ? 'Pública' : 'Privada'}
            </h6>
          </Col>
          <Col md={4} className="mb-3">
            <p className="mb-1 text-muted">Verificación de Identidad</p>
            <h6>
              {election.settings?.requiresVerification !== false ? 'Requerida' : 'No requerida'}
            </h6>
          </Col>
          <Col md={4} className="mb-3">
            <p className="mb-1 text-muted">Abstención</p>
            <h6>
              {election.settings?.allowAbstention ? 'Permitida' : 'No permitida'}
            </h6>
          </Col>
          <Col md={4} className="mb-3">
            <p className="mb-1 text-muted">Comentarios</p>
            <h6>
              {election.settings?.allowVoterComments ? 'Permitidos' : 'No permitidos'}
            </h6>
          </Col>
          <Col md={4} className="mb-3">
            <p className="mb-1 text-muted">Participación Mínima</p>
            <h6>
              {(election.settings?.minParticipation || 0) > 0 
                ? `${election.settings.minParticipation}%` 
                : 'No establecida'}
            </h6>
          </Col>
          <Col md={4} className="mb-3">
            <p className="mb-1 text-muted">Elegibilidad</p>
            <h6>
              {election.settings?.voterEligibility === 'all' && 'Todos los votantes'}
              {election.settings?.voterEligibility === 'district' && 'Por distrito'}
              {election.settings?.voterEligibility === 'custom' && 'Lista personalizada'}
              {!election.settings?.voterEligibility && 'Todos los votantes'}
            </h6>
          </Col>
          
          <Col md={12} className="mt-2">
            <p className="mb-1 text-muted">Categorías</p>
            <div>
              {election.categories && election.categories.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {election.categories.map((category, index) => (
                    <Badge bg="secondary" key={index} className="py-2 px-3">
                      {category.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">No hay categorías asignadas</p>
              )}
            </div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
    
    {election.settings?.voterEligibility === 'custom' && election.allowedVoters && election.allowedVoters.length > 0 && (
      <Card className="shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0">Votantes Elegibles ({election.allowedVoters.length})</h5>
        </Card.Header>
        <Card.Body>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <Table hover responsive size="sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ID / Email</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {election.allowedVoters.slice(0, 100).map((voter, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{voter.email || voter._id || voter.id}</td>
                    <td>
                      {voter.hasVoted ? (
                        <Badge bg="success">Votó</Badge>
                      ) : (
                        <Badge bg="secondary">Pendiente</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {election.allowedVoters.length > 100 && (
                  <tr>
                    <td colSpan="3" className="text-center">
                      <em>Y {election.allowedVoters.length - 100} más...</em>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    )}
  </Tab>
  
  {/* Continuación del componente ElectionDetailAdmin
// Este fragmento se integrará con las partes 1, 2 y otras partes

// Dentro del componente Tabs, después de la pestaña de configuración agregaríamos:

    {/* Pestaña de Votantes */}
    <Tab eventKey="voters" title="Votantes">
      <Card className="shadow-sm mb-4">
        <Card.Header className="bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Estadísticas de Votantes</h5>
            <Button
              as={Link}
              to={`/admin/statistics/voters?electionId=${electionId}`}
              variant="outline-primary"
              size="sm"
            >
              <i className="fas fa-chart-bar me-2"></i>
              Estadísticas Detalladas
            </Button>
          </div>
        </Card.Header>
        <Card.Body>
          <Row className="mb-4">
            <Col md={4} className="text-center mb-3">
              <h3 className="mb-1">{election.totalVotes || 0}</h3>
              <p className="text-muted mb-0">Votos Totales</p>
            </Col>
            <Col md={4} className="text-center mb-3">
              <h3 className="mb-1">
                {election.allowedVoters?.length > 0 
                  ? ((election.totalVotes / election.allowedVoters.length * 100) || 0).toFixed(2) 
                  : '0.00'}%
              </h3>
              <p className="text-muted mb-0">Tasa de Participación</p>
            </Col>
            <Col md={4} className="text-center mb-3">
              <h3 className="mb-1">{election.voterMetrics?.uniqueIpAddresses || 0}</h3>
              <p className="text-muted mb-0">Direcciones IP Únicas</p>
            </Col>
          </Row>
          
          <h6 className="mb-3">Participación por Fecha</h6>
          <div className="mb-4" style={{ height: '200px' }}>
            {/* Aquí iría un gráfico de participación, pero usaremos un placeholder */}
            <div className="d-flex flex-column justify-content-center align-items-center h-100 bg-light rounded">
              <i className="fas fa-chart-line fa-3x text-muted mb-2"></i>
              <p className="text-muted">Gráfico de Participación por Fecha</p>
            </div>
          </div>
          
          {election.voterMetrics?.demographics && (
            <>
              <h6 className="mb-3 mt-4">Demografía de Votantes</h6>
              <Row>
                <Col md={6}>
                  <div className="mb-4" style={{ height: '200px' }}>
                    <div className="d-flex flex-column justify-content-center align-items-center h-100 bg-light rounded">
                      <i className="fas fa-users fa-3x text-muted mb-2"></i>
                      <p className="text-muted">Distribución por Edad</p>
                    </div>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-4" style={{ height: '200px' }}>
                    <div className="d-flex flex-column justify-content-center align-items-center h-100 bg-light rounded">
                      <i className="fas fa-globe fa-3x text-muted mb-2"></i>
                      <p className="text-muted">Distribución Geográfica</p>
                    </div>
                  </div>
                </Col>
              </Row>
            </>
          )}
        </Card.Body>
      </Card>
      
      <Card className="shadow-sm">
        <Card.Header className="bg-white">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Historial de Votación</h5>
            <div>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => window.alert('Exportar historial de votación')}
                className="me-2"
              >
                <i className="fas fa-download me-2"></i>
                Exportar
              </Button>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => window.alert('Actualizar historial de votación')}
              >
                <i className="fas fa-sync me-2"></i>
                Actualizar
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          {election.votes && election.votes.length > 0 ? (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table responsive hover size="sm">
                <thead>
                  <tr>
                    <th>ID Votante</th>
                    <th>Fecha/Hora</th>
                    <th>Método</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {election.votes.slice(0, 50).map((vote, index) => (
                    <tr key={index}>
                      <td>
                        <small className="text-truncate d-inline-block" style={{ maxWidth: '150px' }}>
                          {vote.voterId || vote.voterAddress || 'Anónimo'}
                        </small>
                      </td>
                      <td><small>{new Date(vote.timestamp).toLocaleString()}</small></td>
                      <td>
                        {vote.blockchain ? (
                          <Badge bg="info">Blockchain</Badge>
                        ) : (
                          <Badge bg="secondary">Estándar</Badge>
                        )}
                      </td>
                      <td>
                        {vote.verified ? (
                          <Badge bg="success">Verificado</Badge>
                        ) : (
                          <Badge bg="warning">Pendiente</Badge>
                        )}
                      </td>
                      <td>
                        <Button 
                          variant="link" 
                          size="sm" 
                          className="p-0 text-primary"
                          onClick={() => window.alert(`Ver detalles del voto ${vote._id || index}`)}
                        >
                          <i className="fas fa-eye"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {election.votes.length > 50 && (
                    <tr>
                      <td colSpan="5" className="text-center">
                        <em>Y {election.votes.length - 50} más...</em>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-4">
              <i className="fas fa-vote-yea fa-3x text-muted mb-3"></i>
              <p className="mb-0">No hay votos registrados para esta elección</p>
            </div>
          )}
        </Card.Body>
      </Card>
    </Tab>
    
    {/* Pestaña de Resultados */}
    <Tab eventKey="results" title="Resultados">
      <Row className="g-4">
        <Col lg={8}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Resultados de la Elección</h5>
                <div>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => window.alert('Exportar resultados')}
                    className="me-2"
                  >
                    <i className="fas fa-download me-2"></i>
                    Exportar
                  </Button>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => window.alert('Actualizar resultados')}
                  >
                    <i className="fas fa-sync me-2"></i>
                    Actualizar
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body>
              {election.totalVotes > 0 ? (
                <>
                  <div className="mb-4" style={{ height: '300px' }}>
                    <div className="d-flex flex-column justify-content-center align-items-center h-100 bg-light rounded">
                      <i className="fas fa-chart-pie fa-3x text-muted mb-2"></i>
                      <p className="text-muted">Gráfico de Resultados</p>
                    </div>
                  </div>
                  
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>#</th>
                        <th>Candidato</th>
                        <th className="text-end">Votos</th>
                        <th className="text-end">Porcentaje</th>
                        <th className="text-center">Gráfico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {election.candidates && election.candidates.sort((a, b) => 
                        (b.voteCount || 0) - (a.voteCount || 0)
                      ).map((candidate, index) => {
                        const votePercentage = election.totalVotes > 0
                          ? ((candidate.voteCount || 0) / election.totalVotes * 100).toFixed(2)
                          : '0.00';
                          
                        return (
                          <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{candidate.name}</td>
                            <td className="text-end">{candidate.voteCount || 0}</td>
                            <td className="text-end">{votePercentage}%</td>
                            <td>
                              <div className="progress" style={{ height: '10px' }}>
                                <div 
                                  className="progress-bar bg-primary" 
                                  role="progressbar" 
                                  style={{ width: `${votePercentage}%` }}
                                  aria-valuenow={votePercentage}
                                  aria-valuemin="0" 
                                  aria-valuemax="100"
                                ></div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      
                      {election.settings?.allowAbstention && (
                        <tr>
                          <td>{election.candidates.length + 1}</td>
                          <td>Abstención</td>
                          <td className="text-end">{election.abstentionCount || 0}</td>
                          <td className="text-end">
                            {election.totalVotes > 0 
                              ? ((election.abstentionCount || 0) / election.totalVotes * 100).toFixed(2) 
                              : '0.00'}%
                          </td>
                          <td>
                            <div className="progress" style={{ height: '10px' }}>
                              <div 
                                className="progress-bar bg-secondary" 
                                role="progressbar" 
                                style={{ 
                                  width: `${(election.totalVotes > 0 
                                    ? ((election.abstentionCount || 0) / election.totalVotes * 100) 
                                    : 0)}%` 
                                }}
                                aria-valuenow={election.totalVotes > 0 
                                  ? ((election.abstentionCount || 0) / election.totalVotes * 100) 
                                  : 0}
                                aria-valuemin="0" 
                                aria-valuemax="100"
                              ></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </>
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-chart-bar fa-3x text-muted mb-3"></i>
                  <p className="mb-0">No hay votos registrados para esta elección</p>
                </div>
              )}
            </Card.Body>
          </Card>
          
          {election.settings?.allowVoterComments && (
            <Card className="shadow-sm">
              <Card.Header className="bg-white">
                <h5 className="mb-0">Comentarios de Votantes</h5>
              </Card.Header>
              <Card.Body>
                {election.voterComments && election.voterComments.length > 0 ? (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {election.voterComments.map((comment, index) => (
                      <div key={index} className="mb-3 pb-3 border-bottom">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="fw-bold">
                            {comment.anonymous ? 'Votante Anónimo' : comment.voterName || `Votante #${index + 1}`}
                          </span>
                          <small className="text-muted">
                            {new Date(comment.timestamp).toLocaleString()}
                          </small>
                        </div>
                        <p className="mb-0">{comment.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="fas fa-comments fa-3x text-muted mb-3"></i>
                    <p className="mb-0">No hay comentarios de votantes</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
        
        <Col lg={4}>
          <Card className="shadow-sm mb-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Estado de Resultados</h5>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <p className="mb-1 text-muted">Estado</p>
                <h6>
                  {election.resultsFinalized ? (
                    <Badge bg="success">Resultados Finalizados</Badge>
                  ) : hasElectionEnded(election) ? (
                    <Badge bg="warning">Elección Terminada - Resultados Preliminares</Badge>
                  ) : (
                    <Badge bg="info">Elección en Curso - Resultados en Tiempo Real</Badge>
                  )}
                </h6>
              </div>
              
              <div className="mb-3">
                <p className="mb-1 text-muted">Validez</p>
                <h6>
                  {election.settings?.minParticipation && 
                  election.allowedVoters?.length > 0 &&
                  ((election.totalVotes / election.allowedVoters.length * 100) < election.settings.minParticipation) ? (
                    <Badge bg="danger">No Válido - Participación Mínima No Alcanzada</Badge>
                  ) : (
                    <Badge bg="success">Válido</Badge>
                  )}
                </h6>
              </div>
              
              {election.resultsFinalized && (
                <div className="mb-3">
                  <p className="mb-1 text-muted">Publicación de Resultados</p>
                  <h6>{new Date(election.resultsPublishedAt).toLocaleString()}</h6>
                </div>
              )}
              
              <div className="mb-3">
                <p className="mb-1 text-muted">Verificación Blockchain</p>
                <h6>
                  {election.blockchain?.resultsVerified ? (
                    <Badge bg="success">Verificado</Badge>
                  ) : election.blockchain?.contractAddress ? (
                    <Badge bg="warning">Pendiente de Verificación</Badge>
                  ) : (
                    <Badge bg="secondary">No Desplegado en Blockchain</Badge>
                  )}
                </h6>
              </div>
              
              <hr />
              
              <div className="d-grid gap-2">
                {hasElectionEnded(election) && !election.resultsFinalized && adminPermissions.canFinalizeResults && (
                  <Button
                    variant="success"
                    onClick={() => setShowFinalizeResultsModal(true)}
                  >
                    <i className="fas fa-check-double me-2"></i>
                    Finalizar y Publicar Resultados
                  </Button>
                )}
                
                {election.resultsFinalized && (
                  <Button
                    as={Link}
                    to={`/elections/${electionId}/results`}
                    variant="primary"
                  >
                    <i className="fas fa-chart-pie me-2"></i>
                    Ver Resultados Públicos
                  </Button>
                )}
                
                <Button
                  variant="outline-primary"
                  onClick={() => window.alert('Exportar resultados')}
                >
                  <i className="fas fa-file-export me-2"></i>
                  Exportar Resultados
                </Button>
                
                {election.blockchain?.contractAddress && (
                  <Button
                    variant="outline-info"
                    onClick={() => window.alert('Verificar resultados en blockchain')}
                  >
                    <i className="fas fa-cube me-2"></i>
                    Verificar en Blockchain
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
          
          <Card className="shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">Ganador</h5>
            </Card.Header>
            <Card.Body>
              {election.totalVotes > 0 && election.candidates && election.candidates.length > 0 ? (
                (() => {
                  const sortedCandidates = [...election.candidates].sort((a, b) => 
                    (b.voteCount || 0) - (a.voteCount || 0)
                  );
                  
                  const winner = sortedCandidates[0];
                  const runnerUp = sortedCandidates[1];
                  
                  return (
                    <div className="text-center">
                      <div className="mb-3">
                        <div className="d-inline-block bg-light rounded-circle p-3 mb-3">
                          <i className="fas fa-trophy fa-3x text-warning"></i>
                        </div>
                        <h4>{winner.name}</h4>
                        <p className="text-muted mb-1">{winner.description}</p>
                        <h5>
                          {winner.voteCount || 0} votos 
                          <span className="text-muted ms-2">
                            ({((winner.voteCount || 0) / election.totalVotes * 100).toFixed(2)}%)
                          </span>
                        </h5>
                      </div>
                      
                      {runnerUp && (
                        <div className="mt-4 pt-3 border-top">
                          <p className="text-muted mb-1">Segundo Lugar</p>
                          <h5>{runnerUp.name}</h5>
                          <p>
                            {runnerUp.voteCount || 0} votos 
                            <span className="text-muted ms-2">
                              ({((runnerUp.voteCount || 0) / election.totalVotes * 100).toFixed(2)}%)
                            </span>
                          </p>
                          <p className="text-muted mb-0">
                            Diferencia: {((winner.voteCount || 0) - (runnerUp.voteCount || 0))} votos
                            <span className="ms-2">
                              ({(((winner.voteCount || 0) - (runnerUp.voteCount || 0)) / election.totalVotes * 100).toFixed(2)}%)
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-4">
                  <i className="fas fa-vote-yea fa-3x text-muted mb-3"></i>
                  <p className="mb-0">No hay votos suficientes para determinar un ganador</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Tab>
    
    {/* Pestaña de Blockchain */}
    <Tab eventKey="blockchain" title="Blockchain">
      <div className="text-center py-5">
        <h4 className="mb-3">Gestión de Blockchain</h4>
        <p className="mb-4">Esta funcionalidad se ha trasladado a un componente especializado.</p>
        <Button
          as={Link}
          to={`/admin/elections/${electionId}/blockchain`}
          variant="primary"
          size="lg"
        >
          <i className="fas fa-cube me-2"></i>
          Ir al Gestor de Blockchain
        </Button>
      </div>
    </Tab>
</Tabs>

{/* Modal de Finalizar Elección */}
<Modal show={showEndElectionModal} onHide={() => setShowEndElectionModal(false)}>
    <Modal.Header closeButton>
      <Modal.Title>Finalizar Elección</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <p>¿Estás seguro de que deseas finalizar esta elección?</p>
      <Alert variant="warning">
        <i className="fas fa-exclamation-triangle me-2"></i>
        Esta acción cerrará la votación inmediatamente, incluso si la fecha de finalización programada aún no ha llegado.
      </Alert>
      
      <p className="mb-0">
        <strong>Título:</strong> {election?.title}
      </p>
      <p className="mb-0">
        <strong>Votos actuales:</strong> {election?.totalVotes || 0}
      </p>
      {election?.settings?.minParticipation && election?.allowedVoters?.length > 0 && (
        <p className="mt-3">
          <strong>Participación:</strong>{' '}
          {((election.totalVotes / election.allowedVoters.length * 100) || 0).toFixed(2)}%
          {((election.totalVotes / election.allowedVoters.length * 100) < election.settings.minParticipation) && (
            <Alert variant="danger" className="mt-2">
              <i className="fas fa-exclamation-circle me-2"></i>
              La participación está por debajo del mínimo requerido ({election.settings.minParticipation}%).
              Los resultados podrían no ser considerados válidos.
            </Alert>
          )}
        </p>
      )}
    </Modal.Body>
    <Modal.Footer>
      <Button 
        variant="secondary" 
        onClick={() => setShowEndElectionModal(false)}
        disabled={actionLoading}
      >
        Cancelar
      </Button>
      <Button 
        variant="warning" 
        onClick={handleEndElection}
        disabled={actionLoading}
      >
        {actionLoading ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Finalizando...
          </>
        ) : (
          <>
            <i className="fas fa-stop-circle me-2"></i>
            Sí, Finalizar Elección
          </>
        )}
      </Button>
    </Modal.Footer>
  </Modal>
  
  {/* Modal de Finalizar Resultados */}
  <Modal show={showFinalizeResultsModal} onHide={() => setShowFinalizeResultsModal(false)}>
    <Modal.Header closeButton>
      <Modal.Title>Finalizar y Publicar Resultados</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <p>¿Estás seguro de que deseas finalizar y publicar los resultados de esta elección?</p>
      <Alert variant="info">
        <i className="fas fa-info-circle me-2"></i>
        Esta acción marcará los resultados como oficiales y los hará visibles públicamente.
        Esta operación no se puede deshacer.
      </Alert>
      
      <p className="mb-0">
        <strong>Título:</strong> {election?.title}
      </p>
      <p className="mb-0">
        <strong>Votos totales:</strong> {election?.totalVotes || 0}
      </p>
      
      {election?.settings?.minParticipation && election?.allowedVoters?.length > 0 && 
      ((election.totalVotes / election.allowedVoters.length * 100) < election.settings.minParticipation) && (
        <Alert variant="danger" className="mt-3">
          <i className="fas fa-exclamation-circle me-2"></i>
          <strong>Advertencia:</strong> La participación ({((election.totalVotes / election.allowedVoters.length * 100) || 0).toFixed(2)}%)
          está por debajo del mínimo requerido ({election.settings.minParticipation}%).
          <p className="mb-0 mt-2">
            ¿Estás seguro de que deseas finalizar los resultados a pesar de la baja participación?
          </p>
        </Alert>
      )}
      
      {election?.candidates && election.candidates.length > 0 && election.totalVotes > 0 && (
        <div className="mt-3">
          <p className="mb-2"><strong>Resultados actuales:</strong></p>
          <ul className="list-group">
            {[...election.candidates]
              .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
              .slice(0, 3)
              .map((candidate, index) => (
                <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                  {candidate.name}
                  <span>
                    {candidate.voteCount || 0} votos 
                    <span className="text-muted ms-2">
                      ({((candidate.voteCount || 0) / election.totalVotes * 100).toFixed(2)}%)
                    </span>
                  </span>
                </li>
              ))
            }
          </ul>
        </div>
      )}
    </Modal.Body>
    <Modal.Footer>
      <Button 
        variant="secondary" 
        onClick={() => setShowFinalizeResultsModal(false)}
        disabled={actionLoading}
      >
        Cancelar
      </Button>
      <Button 
        variant="success" 
        onClick={handleFinalizeResults}
        disabled={actionLoading}
      >
        {actionLoading ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Finalizando...
          </>
        ) : (
          <>
            <i className="fas fa-check-double me-2"></i>
            Sí, Finalizar y Publicar Resultados
          </>
        )}
      </Button>
    </Modal.Footer>
  </Modal>
  
  {/* Modal de Eliminar Elección */}
  <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
    <Modal.Header closeButton>
      <Modal.Title>Eliminar Elección</Modal.Title>
    </Modal.Header>
    <Modal.Body>
      <p>¿Estás seguro de que deseas eliminar esta elección?</p>
      <Alert variant="danger">
        <i className="fas fa-exclamation-triangle me-2"></i>
        Esta acción eliminará permanentemente la elección y todos sus datos asociados.
        Esta operación no se puede deshacer.
      </Alert>
      
      <p className="mb-0">
        <strong>Título:</strong> {election?.title}
      </p>
      <p className="mb-0">
        <strong>ID:</strong> {election?._id}
      </p>
      
      {isElectionActive(election) && (
        <Alert variant="warning" className="mt-3">
          <i className="fas fa-exclamation-circle me-2"></i>
          <strong>Advertencia:</strong> Esta elección está actualmente activa.
          No se recomienda eliminar elecciones activas.
        </Alert>
      )}
      
      {election?.resultsFinalized && (
        <Alert variant="warning" className="mt-3">
          <i className="fas fa-exclamation-circle me-2"></i>
          <strong>Advertencia:</strong> Esta elección tiene resultados finalizados.
          No se recomienda eliminar elecciones con resultados publicados.
        </Alert>
      )}
      
      {election?.blockchain?.contractAddress && (
        <Alert variant="warning" className="mt-3">
          <i className="fas fa-exclamation-circle me-2"></i>
          <strong>Advertencia:</strong> Esta elección está desplegada en la blockchain.
          El contrato inteligente seguirá existiendo en la blockchain aunque elimines la elección de la base de datos.
        </Alert>
      )}
      
      <div className="mt-3">
        <p className="mb-2 fw-bold">Confirma que entiendes las consecuencias:</p>
        <p className="mb-0">Por favor, escribe "ELIMINAR" en el siguiente campo para confirmar:</p>
        <input 
          type="text" 
          className="form-control mt-2" 
          placeholder="ELIMINAR"
          onChange={(e) => {
            if (e.target.value === "ELIMINAR") {
              // Habilitaría el botón de eliminar
            }
          }}
        />
      </div>
    </Modal.Body>
    <Modal.Footer>
      <Button 
        variant="secondary" 
        onClick={() => setShowDeleteModal(false)}
        disabled={actionLoading}
      >
        Cancelar
      </Button>
      <Button 
        variant="danger" 
        onClick={handleDeleteElection}
        disabled={actionLoading /* o la condición de validación del campo de texto */}
      >
        {actionLoading ? (
          <>
            <Spinner animation="border" size="sm" className="me-2" />
            Eliminando...
          </>
        ) : (
          <>
            <i className="fas fa-trash-alt me-2"></i>
            Eliminar Permanentemente
          </>
        )}
      </Button>
    </Modal.Footer>
  </Modal>
</Container>
);
}

export default ElectionDetailAdmin;